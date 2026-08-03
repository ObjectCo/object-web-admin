"use client";
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface StaffRoleModalProps {
  buyers: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function StaffRoleModal({ buyers, onClose, onSuccess }: StaffRoleModalProps) {
  const [searchStaffEmail, setSearchStaffEmail] = useState('');
  const [searchedUser, setSearchedUser] = useState<any>(null);
  const [tempPerms, setTempPerms] = useState({ orders: false, products: false, community: false, push: false });

  const handleSearchStaff = () => {
    const user = buyers.find(b => b.email === searchStaffEmail || b.name === searchStaffEmail);
    if (user) { 
      setSearchedUser(user); 
      setTempPerms(user.permissions || { orders: false, products: false, community: false, push: false }); 
    } else { 
      alert('가입된 회원을 찾을 수 없습니다. 직원이 먼저 앱/웹을 통해 일반 회원가입을 진행해야 합니다.'); 
      setSearchedUser(null); 
    }
  };

  const handleGrantStaff = async () => {
    if (!searchedUser) return;
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'STAFF', permissions: tempPerms })
      .eq('id', searchedUser.id);
      
    if (error) {
      alert('직원 권한 부여 실패');
    } else { 
      alert('직원 승급 및 권한이 부여되었습니다!'); 
      onSuccess();
      onClose(); 
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black text-slate-800">직원 권한 신규 부여</h2>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-sm text-slate-600 leading-relaxed">
          <strong>안내:</strong> 직원이 앱/웹에서 <span className="font-bold text-indigo-600">일반 회원가입</span>을 마친 상태여야 합니다. 해당 직원의 이메일이나 이름을 검색하여 권한을 부여하세요.
        </div>
        
        <div className="flex gap-2 mb-6">
          <input type="text" className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500" placeholder="이메일 또는 이름 검색" value={searchStaffEmail} onChange={e=>setSearchStaffEmail(e.target.value)} />
          <button onClick={handleSearchStaff} className="bg-slate-900 text-white px-5 rounded-xl font-bold">검색</button>
        </div>

        {searchedUser && (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-xl mb-4 border border-indigo-100">
              <div>
                <p className="font-bold text-indigo-900">{searchedUser.name}</p>
                <p className="text-xs text-indigo-700">{searchedUser.email}</p>
              </div>
              <span className="px-2 py-1 bg-white text-xs font-bold text-indigo-600 rounded">현재: {searchedUser.role}</span>
            </div>

            <p className="font-bold text-slate-800 mb-3 text-sm">부여할 세부 권한 설정</p>
            <div className="space-y-3 mb-6">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={tempPerms.orders} onChange={e=>setTempPerms({...tempPerms, orders: e.target.checked})} />
                <span className="text-sm font-medium">📦 물류/발주 관리 접근 가능</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={tempPerms.products} onChange={e=>setTempPerms({...tempPerms, products: e.target.checked})} />
                <span className="text-sm font-medium">🏷️ 상품 및 재고 마스터 수정 가능</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={tempPerms.community} onChange={e=>setTempPerms({...tempPerms, community: e.target.checked})} />
                <span className="text-sm font-medium">💬 커뮤니티 피드 관리 가능</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" checked={tempPerms.push} onChange={e=>setTempPerms({...tempPerms, push: e.target.checked})} />
                <span className="text-sm font-medium">🔔 전체 앱 푸시 발송 가능</span>
              </label>
            </div>
            <button onClick={handleGrantStaff} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700">스태프 승급 및 저장</button>
          </div>
        )}
      </div>
    </div>
  );
}