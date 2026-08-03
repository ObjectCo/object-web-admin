"use client";
import React, { useState, useMemo } from 'react';
import { ShoppingCart, Search, ChevronsUpDown, ChevronUp, ChevronDown, Loader2, CheckSquare, Square, Send, Filter, RefreshCw, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useOrders, useBuyers } from '@/hooks/useAdminQueries';
import { calculateOrderTotal } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import ManualOrderModal from '@/components/modals/ManualOrderModal';
import OrderDetailModal from '@/components/modals/OrderDetailModal';

export default function LogisticsPage() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading: isOrdersLoading } = useOrders();
  const { data: buyers = [] } = useBuyers();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('전체');
  const [dateFilter, setDateFilter] = useState('ALL');
  const [orderSort, setOrderSort] = useState({ key: 'created_at', direction: 'desc' });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isManualOrderOpen, setIsManualOrderOpen] = useState(false); 

  const refreshOrders = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    setSelectedIds([]);
  };

  // 대시보드 통계 계산
  const stats = useMemo(() => {
    let totalCount = orders.length;
    let pendingCount = 0;
    let completedCount = 0;
    let totalRevenue = 0;

    orders.forEach((o: any) => {
      const val = calculateOrderTotal(o.items);
      totalRevenue += val;
      if (o.status === '답변대기' || o.status === '접수 완료') pendingCount++;
      if (o.status === '발송 완료') completedCount++;
    });

    return { totalCount, pendingCount, completedCount, totalRevenue };
  }, [orders]);

  // 날짜 및 상태 필터링 적용
  const processedOrders = useMemo(() => {
    let filtered = orders.filter((o: any) => {
      // 1. 상태 탭 필터
      if (activeTab !== '전체' && o.status !== activeTab) return false;

      // 2. 검색어 필터
      const compMatch = (o.profiles?.company || '').toLowerCase().includes(searchQuery.toLowerCase());
      const managerMatch = (o.profiles?.manager || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!compMatch && !managerMatch) return false;

      // 3. 날짜 범위 필터
      if (dateFilter !== 'ALL') {
        const orderDate = new Date(o.created_at);
        const now = new Date();
        if (dateFilter === 'TODAY') {
          if (orderDate.toDateString() !== now.toDateString()) return false;
        } else if (dateFilter === '7DAYS') {
          const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
          if (orderDate < sevenDaysAgo) return false;
        } else if (dateFilter === '30DAYS') {
          const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
          if (orderDate < thirtyDaysAgo) return false;
        }
      }

      return true;
    });

    // 정렬
    return filtered.sort((a: any, b: any) => {
      let valA = a[orderSort.key], valB = b[orderSort.key];
      if (orderSort.key === 'company') { valA = a.profiles?.company || ''; valB = b.profiles?.company || ''; }
      if (orderSort.key === 'total_price') { valA = calculateOrderTotal(a.items); valB = calculateOrderTotal(b.items); }
      if (orderSort.key === 'item_count') { valA = (typeof a.items === 'string' ? JSON.parse(a.items).length : a.items?.length) || 0; valB = (typeof b.items === 'string' ? JSON.parse(b.items).length : b.items?.length) || 0; }
      if (valA < valB) return orderSort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return orderSort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [orders, searchQuery, activeTab, dateFilter, orderSort]);

  // 전체 선택/해제
  const handleSelectAll = () => {
    if (selectedIds.length === processedOrders.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(processedOrders.map((o: any) => o.id));
    }
  };

  // 단일 선택 체크박스
  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // 일괄 발송 처리 및 재고 차감
  const handleBatchComplete = async () => {
    if (selectedIds.length === 0) return toast.error('선택된 항목이 없습니다.');
    if (!window.confirm(`선택한 ${selectedIds.length}건의 발주를 [발송 완료] 처리하고 재고를 차감하시겠습니까?`)) return;

    const toastId = toast.loading('일괄 발송 처리 중...');

    try {
      const selectedOrders = orders.filter((o: any) => selectedIds.includes(o.id));
      
      for (const order of selectedOrders) {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        
        // 재고 차감
        for (const item of items) {
          const qty = Number(item.estYards || item.yardage || 0);
          const { data: pData } = await supabase.from('products').select('id, stock').eq('article', item.article).single();
          if (pData && qty > 0) {
            const newStock = Math.max(0, (pData.stock || 0) - qty);
            await supabase.from('products').update({ stock: newStock }).eq('id', pData.id);
          }
        }

        // 상태 일괄 변경
        await supabase.from('orders').update({ status: '발송 완료', delivery: '일괄 발송 처리 되었습니다.' }).eq('id', order.id);

        // 푸시 알림 전송
        if (order.profiles?.push_token) {
          await fetch('/api/push', { method: 'POST', body: JSON.stringify({ to: order.profiles.push_token, title: '📦 발주 상태 업데이트', body: '발주하신 원단이 발송 처리 되었습니다.' }) });
        }
      }

      toast.success(`${selectedIds.length}건 발송 완료 처리되었습니다!`, { id: toastId });
      refreshOrders();
    } catch (err) {
      toast.error('일괄 처리 중 오류가 발생했습니다.', { id: toastId });
    }
  };

  const handleSort = (key: string) => {
    setOrderSort(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }));
  };

  const SortIcon = ({ sortKey }: { sortKey: string }) => {
    if (orderSort.key !== sortKey) return <ChevronsUpDown size={14} className="inline ml-1 text-slate-300" />;
    return orderSort.direction === 'asc' ? <ChevronUp size={14} className="inline ml-1 text-indigo-600" /> : <ChevronDown size={14} className="inline ml-1 text-indigo-600" />;
  };

  return (
    <div className="animate-in fade-in duration-500 flex flex-col h-full space-y-6">
      {/* 헤더 */}
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">발주 및 물류 데이터 그리드</h1>
          <p className="text-slate-500 font-medium mt-1">실시간 고객 발주를 모니터링하고 일괄 배송 처리 및 PDF 문서 생성을 관리합니다.</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={refreshOrders} className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm">
            <RefreshCw size={18} />
          </button>
          <button onClick={() => setIsManualOrderOpen(true)} className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition-colors">
            <ShoppingCart size={18} /><span>수기 발주 등록</span>
          </button>
        </div>
      </header>

      {/* 대시보드 요약 지표 위젯 4종 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">전체 요청 건수</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalCount}<span className="text-sm font-medium text-slate-400 ml-1">건</span></p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl"><Filter size={20}/></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">발주 접수 대기</p>
            <p className="text-2xl font-black text-amber-600 mt-1">{stats.pendingCount}<span className="text-sm font-medium text-amber-400 ml-1">건</span></p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Clock size={20}/></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">발송 완료</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{stats.completedCount}<span className="text-sm font-medium text-emerald-400 ml-1">건</span></p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 size={20}/></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">누적 총 공급가액</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">₩{(stats.totalRevenue/10000).toLocaleString('ko-KR', {maximumFractionDigits: 0})}<span className="text-sm font-medium text-indigo-400 ml-0.5">만원</span></p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><AlertCircle size={20}/></div>
        </div>
      </div>

      {/* 필터 및 검색 바 */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center gap-4">
        {/* 상태 탭 버튼 */}
        <div className="flex bg-slate-100 p-1 rounded-xl space-x-1">
          {['전체', '접수 완료', '처리 중', '발송 완료'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* 검색 및 기간 필터 */}
        <div className="flex items-center space-x-3 flex-1 max-w-xl">
          <div className="flex-1 relative">
            <Search size={16} className="absolute inset-y-0 left-3.5 top-3 text-slate-400"/>
            <input 
              type="text" 
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs font-medium outline-none" 
              placeholder="고객사명 또는 담당자 이름 검색..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
            />
          </div>

          <select 
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs text-slate-700 outline-none cursor-pointer"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="ALL">전체 기간</option>
            <option value="TODAY">오늘 주문</option>
            <option value="7DAYS">최근 7일</option>
            <option value="30DAYS">최근 30일</option>
          </select>
        </div>
      </div>

      {/* 일괄 액션 바 (체크박스 선택 시 나타남) */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-900 text-white p-4 rounded-2xl shadow-lg flex justify-between items-center animate-in slide-in-from-bottom-2">
          <div className="flex items-center space-x-3">
            <span className="bg-indigo-700 text-indigo-200 text-xs font-bold px-3 py-1 rounded-full">{selectedIds.length}개 선택됨</span>
            <p className="text-sm font-semibold">선택한 항목에 대한 일괄 작업을 수행할 수 있습니다.</p>
          </div>
          <button 
            onClick={handleBatchComplete}
            className="flex items-center space-x-2 bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-emerald-600 shadow-md transition-colors"
          >
            <Send size={16}/><span>일괄 발송 완료 및 재고 차감</span>
          </button>
        </div>
      )}

      {/* 테이블 영역 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-xs sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="py-4 px-4 text-center w-12">
                  <button onClick={handleSelectAll} className="text-slate-400 hover:text-slate-700">
                    {selectedIds.length > 0 && selectedIds.length === processedOrders.length ? <CheckSquare size={18} className="text-indigo-600"/> : <Square size={18}/>}
                  </button>
                </th>
                <th className="py-4 px-6 font-bold cursor-pointer hover:bg-slate-200/50" onClick={() => handleSort('created_at')}>주문 일시 <SortIcon sortKey="created_at" /></th>
                <th className="py-4 px-6 font-bold cursor-pointer hover:bg-slate-200/50" onClick={() => handleSort('company')}>고객사 <SortIcon sortKey="company" /></th>
                <th className="py-4 px-6 font-bold cursor-pointer hover:bg-slate-200/50" onClick={() => handleSort('status')}>진행 상태 <SortIcon sortKey="status" /></th>
                <th className="py-4 px-6 font-bold cursor-pointer hover:bg-slate-200/50 text-right" onClick={() => handleSort('item_count')}>품목 수 <SortIcon sortKey="item_count" /></th>
                <th className="py-4 px-6 font-bold cursor-pointer hover:bg-slate-200/50 text-right" onClick={() => handleSort('total_price')}>예상 공급가액 <SortIcon sortKey="total_price" /></th>
                <th className="py-4 px-6 font-bold text-center">작업</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {isOrdersLoading ? (
                <tr><td colSpan={7} className="text-center py-20 text-slate-400 font-bold"><Loader2 className="animate-spin mx-auto mb-2 text-indigo-500" size={32} />데이터를 불러오는 중입니다...</td></tr>
              ) : processedOrders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-20 text-slate-400 font-medium">조회된 발주 내역이 없습니다.</td></tr>
              ) : processedOrders.map((o:any) => {
                const itemCount = (typeof o.items === 'string' ? JSON.parse(o.items).length : o.items?.length) || 0;
                const isSelected = selectedIds.includes(o.id);

                return (
                  <tr key={o.id} className={`border-b border-slate-100 hover:bg-indigo-50/30 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                    <td className="py-4 px-4 text-center">
                      <button onClick={() => handleSelectOne(o.id)} className="text-slate-400 hover:text-slate-700">
                        {isSelected ? <CheckSquare size={18} className="text-indigo-600"/> : <Square size={18}/>}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-slate-600 font-medium">{new Date(o.created_at).toLocaleString('ko-KR')}</td>
                    <td className="py-4 px-6 font-black text-slate-800 text-sm">{o.profiles?.company || '비회원'} <span className="text-slate-400 font-normal text-xs ml-1">({o.profiles?.manager || '-'})</span></td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold shadow-sm border ${o.status === '답변대기' || o.status === '접수 완료' ? 'bg-amber-50 text-amber-600 border-amber-100' : o.status === '발송 완료' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{o.status}</span>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-700 text-right">{itemCount}건</td>
                    <td className="py-4 px-6 font-black text-indigo-600 text-right text-sm">₩{calculateOrderTotal(o.items).toLocaleString()}</td>
                    <td className="py-4 px-6 text-center">
                      <button onClick={() => setSelectedOrder(o)} className="text-xs text-slate-700 font-bold bg-slate-100 px-3.5 py-1.5 rounded-lg hover:bg-slate-200 transition-colors border border-slate-200">상세/출력</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isManualOrderOpen && <ManualOrderModal buyers={buyers} onClose={() => setIsManualOrderOpen(false)} onSuccess={refreshOrders} />}
      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} onSuccess={refreshOrders} />}
    </div>
  );
}