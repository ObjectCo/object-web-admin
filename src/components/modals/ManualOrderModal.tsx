"use client";
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ManualOrderModalProps {
  buyers: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ManualOrderModal({ buyers, onClose, onSuccess }: ManualOrderModalProps) {
  const [manualOrder, setManualOrder] = useState({ buyer_id: '', article: '', yardage: '', price: '', orderType: '메인' });

  const handleManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualOrder.buyer_id || !manualOrder.article || !manualOrder.yardage) return alert('필수 항목을 입력해주세요.');
    
    const newItem = { 
      article: manualOrder.article, 
      comp: '수기 입력', 
      estYards: Number(manualOrder.yardage), 
      priceNum: Number(manualOrder.price || 0), 
      orderType: manualOrder.orderType, 
      project: '전화/수기발주' 
    };
    
    const { error } = await supabase.from('orders').insert([
      { profile_id: manualOrder.buyer_id, items: JSON.stringify([newItem]), status: '접수 완료' }
    ]);
    
    if (error) {
      alert('수기 발주 등록 실패');
    } else { 
      alert('등록 완료!'); 
      onSuccess();
      onClose(); 
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black text-slate-800">수기 발주 등록</h2>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <form onSubmit={handleManualOrder} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">고객사 선택 <span className="text-red-500">*</span></label>
            <select className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 bg-white" value={manualOrder.buyer_id} onChange={e=>setManualOrder({...manualOrder, buyer_id: e.target.value})} required>
              <option value="">고객사를 선택하세요</option>
              {buyers.map(b => <option key={b.id} value={b.id}>{b.company} ({b.manager})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">품번 (Article) <span className="text-red-500">*</span></label>
            <input type="text" className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500" value={manualOrder.article} onChange={e=>setManualOrder({...manualOrder, article: e.target.value})} required />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">구분</label>
              <select className="w-full px-2 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500 bg-white" value={manualOrder.orderType} onChange={e=>setManualOrder({...manualOrder, orderType: e.target.value})}>
                <option value="스와치">스와치</option><option value="샘플">샘플</option><option value="메인">메인</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">수량 <span className="text-red-500">*</span></label>
              <input type="number" className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500" value={manualOrder.yardage} onChange={e=>setManualOrder({...manualOrder, yardage: e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">단가(₩)</label>
              <input type="number" className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-indigo-500" value={manualOrder.price} onChange={e=>setManualOrder({...manualOrder, price: e.target.value})} />
            </div>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 mt-2">수기 발주 등록</button>
        </form>
      </div>
    </div>
  );
}