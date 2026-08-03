"use client";
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ProductAddModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function ProductAddModal({ onClose, onSuccess }: ProductAddModalProps) {
  const [newProduct, setNewProduct] = useState({ article: '', comp: '', width: '', weight: '', price: '', currency: 'KRW', unit: 'YD', stock: '', supplier: '', rack_location: '' });

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault(); 
    await supabase.from('products').insert([{ ...newProduct, price: Number(newProduct.price), stock: Number(newProduct.stock) }]);
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black text-slate-800">단건 원단 등록</h2>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <form onSubmit={handleAddProduct} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">품번 <span className="text-red-500">*</span></label>
            <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500" value={newProduct.article} onChange={e=>setNewProduct({...newProduct, article: e.target.value})} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">단가(₩)</label>
              <input type="number" className="w-full px-4 py-3 rounded-xl border" value={newProduct.price} onChange={e=>setNewProduct({...newProduct, price: e.target.value})} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">초기 재고(Yds)</label>
              <input type="number" className="w-full px-4 py-3 rounded-xl border" value={newProduct.stock} onChange={e=>setNewProduct({...newProduct, stock: e.target.value})} />
            </div>
          </div>
          <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 mt-2">DB에 등록하기</button>
        </form>
      </div>
    </div>
  );
}