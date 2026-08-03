"use client";
import React, { useRef, useMemo, useState } from 'react';
import { Upload, Download, Plus, ChevronsUpDown, ChevronUp, ChevronDown, AlertTriangle, QrCode, Trash2, Loader2, Search, RefreshCw, Layers, Box, Check, Edit2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useProducts } from '@/hooks/useAdminQueries';
import { supabase } from '@/lib/supabase';
import ProductAddModal from '@/components/modals/ProductAddModal';
import PrintQRModal from '@/components/modals/PrintQRModal';

export default function ProductsPage() {
  const queryClient = useQueryClient();
  const { data: products = [], isLoading } = useProducts();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'NORMAL'>('ALL');
  const [productSort, setProductSort] = useState({ key: 'created_at', direction: 'desc' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ price: 0, stock: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [qrProduct, setQrProduct] = useState<any>(null); 

  const refreshProducts = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
  };

  // 통계 위젯 데이터
  const stats = useMemo(() => {
    const totalCount = products.length;
    let totalStock = 0;
    let lowStockCount = 0;
    let totalPriceSum = 0;

    products.forEach((p: any) => {
      const stock = Number(p.stock || 0);
      const price = Number(p.price || 0);
      totalStock += stock;
      if (stock < 100) lowStockCount++;
      totalPriceSum += price;
    });

    const avgPrice = totalCount > 0 ? Math.round(totalPriceSum / totalCount) : 0;
    return { totalCount, totalStock, lowStockCount, avgPrice };
  }, [products]);

  // 필터 및 정렬 데이터 처리
  const processedProducts = useMemo(() => {
    let filtered = products.filter((p: any) => {
      // 검색어 필터 (품번, 혼용률, 공급처)
      const articleMatch = (p.article || '').toLowerCase().includes(searchQuery.toLowerCase());
      const compMatch = (p.comp || '').toLowerCase().includes(searchQuery.toLowerCase());
      const supplierMatch = (p.supplier || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!articleMatch && !compMatch && !supplierMatch) return false;

      // 재고 상태 필터
      const stock = Number(p.stock || 0);
      if (stockFilter === 'LOW' && stock >= 100) return false;
      if (stockFilter === 'NORMAL' && stock < 100) return false;

      return true;
    });

    return filtered.sort((a: any, b: any) => {
      let valA = a[productSort.key] || 0; 
      let valB = b[productSort.key] || 0;
      if (valA < valB) return productSort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return productSort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [products, searchQuery, stockFilter, productSort]);

  const handleSort = (key: string) => {
    setProductSort(prev => ({ key, direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc' }));
  };

  // 인라인 수정 시작
  const startInlineEdit = (product: any) => {
    setEditingId(product.id);
    setEditForm({ price: product.price || 0, stock: product.stock || 0 });
  };

  // 인라인 수정 저장
  const saveInlineEdit = async (id: string) => {
    const toastId = toast.loading('수정 사항 저장 중...');
    const { error } = await supabase
      .from('products')
      .update({ price: Number(editForm.price), stock: Number(editForm.stock) })
      .eq('id', id);

    if (error) {
      toast.error('수정에 실패했습니다.', { id: toastId });
    } else {
      toast.success('단가 및 재고가 업데이트되었습니다.', { id: toastId });
      setEditingId(null);
      refreshProducts();
    }
  };

  const handleDeleteProduct = async (id: string, article: string) => { 
    if (window.confirm(`[${article}] 상품을 정말 삭제하시겠습니까?`)) { 
      await supabase.from('products').delete().eq('id', id); 
      toast.success('삭제되었습니다.');
      refreshProducts(); 
    }
  };

  const handleExportExcel = () => {
    const excelData = products.length ? products.map((p: any) => ({
      'A(공급처)': p.supplier || '', 'B(위치)': p.rack_location || '', 'C(품번)': p.article, 
      'D(혼용률)': p.comp, 'E(폭)': p.width, 'F(중량)': p.weight, 'G(단가)': p.price, 
      'H(통화)': p.currency || 'KRW', 'I(단위)': p.unit || 'YD', 'J(재고량)': p.stock || 0
    })) : [{}];
    const wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(excelData), "상품목록"); 
    XLSX.writeFile(wb, `object_products_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('엑셀 파일이 다운로드 되었습니다.');
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }); 
        const formattedData = data.slice(1).filter((r: any) => r.length > 0 && r[2]).map((r: any) => ({
          supplier: r[0] ? String(r[0]).trim() : null, rack_location: r[1] ? String(r[1]).trim() : null, 
          article: String(r[2]).trim(), comp: r[3] ? String(r[3]) : null, width: r[4] ? String(r[4]) : null, 
          weight: r[5] ? String(r[5]) : null, price: r[6] ? Number(r[6]) : null, 
          currency: r[7] ? String(r[7]).toUpperCase() : 'KRW', unit: r[8] ? String(r[8]).toUpperCase() : 'YD', 
          stock: r[9] ? Number(r[9]) : 0
        }));
        if(formattedData.length === 0) return toast.error('유효한 데이터가 없습니다.');
        
        await supabase.from('products').insert(formattedData); 
        toast.success(`총 ${formattedData.length}건 엑셀 등록 완료!`); 
        refreshProducts();
      } catch (err) { toast.error('엑셀 업로드 실패'); }
    };
    reader.readAsBinaryString(file); 
    if(fileInputRef.current) fileInputRef.current.value = ''; 
  };

  const SortIcon = ({ sortKey }: { sortKey: string }) => {
    if (productSort.key !== sortKey) return <ChevronsUpDown size={14} className="inline ml-1 text-slate-300" />;
    return productSort.direction === 'asc' ? <ChevronUp size={14} className="inline ml-1 text-indigo-600" /> : <ChevronDown size={14} className="inline ml-1 text-indigo-600" />;
  };

  return (
    <div className="animate-in fade-in duration-500 relative flex flex-col h-full space-y-6">
      {/* 헤더 */}
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">상품 및 재고 마스터 DB</h1>
          <p className="text-slate-500 font-medium mt-1">원단 데이터베이스 및 라벨 출력, 재고 수준을 실시간으로 관리합니다.</p>
        </div>
        <div className="flex space-x-2">
          <button onClick={refreshProducts} className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors shadow-sm mr-1">
            <RefreshCw size={18} />
          </button>
          <input type="file" accept=".xlsx" className="hidden" ref={fileInputRef} onChange={handleImportExcel} />
          <button onClick={() => fileInputRef.current?.click()} className="flex items-center bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-50 transition-colors"><Upload size={15} className="mr-1.5"/>엑셀 일괄등록</button>
          <button onClick={handleExportExcel} className="flex items-center bg-white border border-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm hover:bg-slate-50 transition-colors"><Download size={15} className="mr-1.5"/>엑셀 다운로드</button>
          <button onClick={() => setIsProductModalOpen(true)} className="flex items-center bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-md hover:bg-indigo-700 transition-colors"><Plus size={15} className="mr-1.5"/>단건 신규등록</button>
        </div>
      </header>

      {/* 대시보드 통계 카드 4종 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">총 등록 품목</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.totalCount}<span className="text-sm font-medium text-slate-400 ml-1">종</span></p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl"><Layers size={20}/></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">전체 보유 재고</p>
            <p className="text-2xl font-black text-indigo-600 mt-1">{stats.totalStock.toLocaleString()}<span className="text-sm font-medium text-indigo-400 ml-1">Yds</span></p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Box size={20}/></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-red-500 uppercase tracking-wider">재고 부족 (100 Yds 미만)</p>
            <p className="text-2xl font-black text-red-600 mt-1">{stats.lowStockCount}<span className="text-sm font-medium text-red-400 ml-1">종</span></p>
          </div>
          <div className="p-3 bg-red-50 text-red-600 rounded-xl"><AlertTriangle size={20}/></div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">평균 단가</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">₩{stats.avgPrice.toLocaleString()}<span className="text-sm font-medium text-emerald-400 ml-1">/YD</span></p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Check size={20}/></div>
        </div>
      </div>

      {/* 검색 및 필터 컨트롤 바 */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center gap-4">
        {/* 재고 상태 필터 버튼 */}
        <div className="flex bg-slate-100 p-1 rounded-xl space-x-1">
          <button 
            onClick={() => setStockFilter('ALL')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${stockFilter === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            전체 보기
          </button>
          <button 
            onClick={() => setStockFilter('LOW')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center ${stockFilter === 'LOW' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500 hover:text-red-600'}`}
          >
            <AlertTriangle size={13} className="mr-1"/> 재고 부족 (위험)
          </button>
          <button 
            onClick={() => setStockFilter('NORMAL')} 
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${stockFilter === 'NORMAL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            정상 재고
          </button>
        </div>

        {/* 검색어 입력 */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute inset-y-0 left-3.5 top-3 text-slate-400"/>
          <input 
            type="text" 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs font-medium outline-none" 
            placeholder="품번, 혼용률 또는 공급처 검색..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      {/* 데이터 테이블 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse relative">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-xs sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="py-4 px-6 font-bold cursor-pointer hover:bg-slate-200/50" onClick={() => handleSort('article')}>품번 (Article) <SortIcon sortKey="article" /></th>
                <th className="py-4 px-6 font-bold cursor-pointer hover:bg-slate-200/50" onClick={() => handleSort('comp')}>혼용률 (Comp) <SortIcon sortKey="comp" /></th>
                <th className="py-4 px-6 font-bold cursor-pointer hover:bg-slate-200/50" onClick={() => handleSort('supplier')}>공급처 <SortIcon sortKey="supplier" /></th>
                <th className="py-4 px-6 font-bold text-right cursor-pointer hover:bg-slate-200/50" onClick={() => handleSort('price')}>단가 (Price) <SortIcon sortKey="price" /></th>
                <th className="py-4 px-6 font-bold text-right cursor-pointer hover:bg-slate-200/50" onClick={() => handleSort('stock')}>현재고 (Stock) <SortIcon sortKey="stock" /></th>
                <th className="py-4 px-6 font-bold text-center">관리 (인라인 수정/QR/삭제)</th> 
              </tr>
            </thead>
            <tbody className="text-xs">
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-20 text-slate-400 font-bold"><Loader2 className="animate-spin mx-auto mb-2 text-indigo-500" size={32} />원단 DB를 불러오는 중입니다...</td></tr>
              ) : processedProducts.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-20 text-slate-400 font-medium">조회된 원단 상품이 없습니다.</td></tr>
              ) : processedProducts.map((p:any) => {
                const isEditing = editingId === p.id;
                const isLowStock = (p.stock || 0) < 100;

                return (
                  <tr key={p.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isEditing ? 'bg-indigo-50/40' : ''}`}>
                    <td className="py-4 px-6 font-black text-slate-900 text-sm">{p.article}</td>
                    <td className="py-4 px-6 text-slate-600 font-medium">{p.comp || '-'}</td>
                    <td className="py-4 px-6 text-slate-500 font-semibold">{p.supplier || 'OBJECT'}</td>
                    
                    {/* 단가 영역 (인라인 편집) */}
                    <td className="py-4 px-6 text-right font-bold text-indigo-600 text-sm">
                      {isEditing ? (
                        <input 
                          type="number" 
                          className="w-24 px-2 py-1 border border-indigo-300 rounded text-right outline-none bg-white focus:ring-2 focus:ring-indigo-500" 
                          value={editForm.price} 
                          onChange={(e) => setEditForm({ ...editForm, price: Number(e.target.value) })}
                        />
                      ) : (
                        p.price ? `${p.currency || 'KRW'} ${p.price.toLocaleString()}/${p.unit || 'YD'}` : '-'
                      )}
                    </td>

                    {/* 재고량 영역 (인라인 편집) */}
                    <td className="py-4 px-6 text-right font-bold">
                      {isEditing ? (
                        <input 
                          type="number" 
                          className="w-20 px-2 py-1 border border-indigo-300 rounded text-right outline-none bg-white focus:ring-2 focus:ring-indigo-500" 
                          value={editForm.stock} 
                          onChange={(e) => setEditForm({ ...editForm, stock: Number(e.target.value) })}
                        />
                      ) : (
                        isLowStock ? (
                          <span className="text-red-500 inline-flex items-center justify-end bg-red-50 px-2.5 py-1 rounded-lg border border-red-100">
                            <AlertTriangle size={13} className="mr-1"/>{p.stock || 0} Yds
                          </span>
                        ) : (
                          <span className="text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                            {p.stock || 0} Yds
                          </span>
                        )
                      )}
                    </td>

                    {/* 관리 액션 버튼 */}
                    <td className="py-4 px-6 text-center space-x-1">
                      {isEditing ? (
                        <button onClick={() => saveInlineEdit(p.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-100 bg-emerald-50 rounded-lg transition-colors border border-emerald-200">
                          <Check size={16} />
                        </button>
                      ) : (
                        <button onClick={() => startInlineEdit(p)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                          <Edit2 size={16} />
                        </button>
                      )}
                      <button onClick={() => setQrProduct(p)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <QrCode size={16} />
                      </button>
                      <button onClick={() => handleDeleteProduct(p.id, p.article)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isProductModalOpen && <ProductAddModal onClose={() => setIsProductModalOpen(false)} onSuccess={refreshProducts} />}
      {qrProduct && <PrintQRModal product={qrProduct} onClose={() => setQrProduct(null)} />}
    </div>
  );
}