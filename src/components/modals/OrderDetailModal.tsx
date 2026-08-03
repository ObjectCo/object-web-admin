"use client";
import React, { useState } from 'react';
import { X, FileText, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { calculateOrderTotal, printDocumentPDF, exportToExcel } from '@/lib/utils';

interface OrderDetailModalProps {
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function OrderDetailModal({ order, onClose, onSuccess }: OrderDetailModalProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(order);

  const updateOrder = async (status: string, deliveryMsg: string) => {
    // 로딩 토스트 띄우기
    const toastId = toast.loading('요청을 처리하고 있습니다...');

    if (status === '발송 완료') {
      const items = typeof currentOrder.items === 'string' ? JSON.parse(currentOrder.items) : currentOrder.items;
      for (const item of items) {
        const qty = Number(item.estYards || item.yardage || 0);
        const { data: pData } = await supabase.from('products').select('id, stock').eq('article', item.article).single();
        if (pData && qty > 0) {
          const newStock = Math.max(0, (pData.stock || 0) - qty);
          await supabase.from('products').update({ stock: newStock }).eq('id', pData.id);
        }
      }
    }
    
    await supabase.from('orders').update({ status, delivery: deliveryMsg, items: currentOrder.items }).eq('id', currentOrder.id);
    
    if (currentOrder.profiles?.push_token) {
      await fetch('/api/push', { method: 'POST', body: JSON.stringify({ to: currentOrder.profiles.push_token, title: '📦 발주 상태 업데이트', body: `상태가 [${status}](으)로 변경되었습니다.\n${deliveryMsg}` }) });
    }
    
    // 완료 토스트로 변경
    toast.success('상태 및 내역이 성공적으로 업데이트 되었습니다!', { id: toastId });
    onSuccess();
    onClose();
  };

  const handleDownloadExcel = () => {
    const items = typeof currentOrder.items === 'string' ? JSON.parse(currentOrder.items) : currentOrder.items;
    const excelData = items.map((item: any, i: number) => ({ 
      'No': i+1, '구분': item.orderType || '스와치', '공급처': item.supplier || 'OBJECT', 
      '품번': item.article, '혼용률': item.comp, '요청 수량': item.estYards || item.yardage || 0, 
      '단위': item.unit || 'YD', '단가': item.priceNum || item.basePrice || 0, 
      '공급가액': (item.estYards || item.yardage || 0)*(item.priceNum || item.basePrice || 0), 
      '폴더명': item.project || '기본 보관함' 
    }));
    
    exportToExcel(excelData, `${currentOrder.profiles?.company}_견적서`);
    toast.success('엑셀 파일이 다운로드 되었습니다.');
  };

  const currentItems = typeof currentOrder.items === 'string' ? JSON.parse(currentOrder.items) : currentOrder.items;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl p-8 flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-slate-800">{isEditMode ? '주문서 수정 모드' : '주문서 상세 내역'}</h2>
          <button onClick={onClose} className="hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={24}/></button>
        </div>
        
        <div className="bg-indigo-50 text-indigo-700 p-4 rounded-xl font-bold text-xl mb-6 flex justify-between items-center">
          <span>총 예상 청구금액</span>
          <span>₩{calculateOrderTotal(currentItems).toLocaleString()}</span>
        </div>

        <div className="space-y-3 mb-6 overflow-y-auto pr-2 flex-1 min-h-[200px]">
          {currentItems.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center p-4 border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow">
              <div className="w-16 h-20 bg-slate-100 rounded-lg mr-4 overflow-hidden flex items-center justify-center border border-slate-200">
                {item.thumb && item.thumb.startsWith('http') ? (
                  <img src={item.thumb} alt="thumb" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-bold text-slate-400">{item.supplier ? item.supplier.substring(0,2).toUpperCase() : 'O.T'}</span>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded font-bold border border-slate-200">{item.project || '기본'}</span>
                  <span className="bg-indigo-50 text-indigo-700 text-xs px-2 py-1 rounded font-bold border border-indigo-100">{item.orderType || '스와치'}</span>
                  <span className="font-black text-slate-800 text-lg">{item.article}</span>
                </div>
                <span className="text-sm text-slate-500 font-medium">{item.comp}</span>
              </div>
              
              {isEditMode ? (
                <div className="flex space-x-2">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">수량 ({item.unit || 'Yds'})</label>
                    <input type="number" className="w-20 px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={item.estYards || item.yardage || 0} onChange={(e) => {
                        const newItems = [...currentItems];
                        newItems[idx].estYards = Number(e.target.value);
                        setCurrentOrder({...currentOrder, items: newItems});
                    }} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">단가 (₩)</label>
                    <input type="number" className="w-28 px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={item.priceNum || item.basePrice || 0} onChange={(e) => {
                        const newItems = [...currentItems];
                        newItems[idx].priceNum = Number(e.target.value);
                        setCurrentOrder({...currentOrder, items: newItems});
                    }} />
                  </div>
                </div>
              ) : (
                <div className="font-black text-indigo-600 text-xl">{item.estYards || item.yardage || 0} <span className="text-sm text-slate-400 ml-1">{item.unit || 'Yds'}</span></div>
              )}
            </div>
          ))}
        </div>
        
        {isEditMode ? (
          <button onClick={() => updateOrder(currentOrder.status, '관리자에 의해 주문 수량/단가가 수정되었습니다.')} className="py-4 bg-indigo-600 hover:bg-indigo-700 transition-colors text-white rounded-xl font-bold w-full shadow-md">수정 내역 저장 및 반영</button>
        ) : (
          <div className="grid grid-cols-5 gap-3 mt-auto">
            <button onClick={() => printDocumentPDF(currentOrder, '견적서')} className="py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center text-sm shadow-md transition-colors"><FileText size={16} className="mr-1"/>견적서 인쇄</button>
            <button onClick={() => printDocumentPDF(currentOrder, '거래명세서')} className="py-4 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center text-sm shadow-md transition-colors"><FileText size={16} className="mr-1"/>명세서 인쇄</button>
            <button onClick={() => setIsEditMode(true)} className="py-4 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold flex items-center justify-center text-sm transition-colors border border-slate-200"><Edit size={16} className="mr-1"/>수량/단가 수정</button>
            <button onClick={handleDownloadExcel} className="py-4 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl font-bold border border-emerald-200 text-sm transition-colors">엑셀 출력</button>
            <button onClick={() => updateOrder('발송 완료', '택배가 발송되었으며, 재고가 차감되었습니다.')} className="py-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-bold text-sm shadow-md transition-colors">발송 및 재고 삭감</button>
          </div>
        )}
      </div>
    </div>
  );
}