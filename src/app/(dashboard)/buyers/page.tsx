"use client";
import React, { useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useBuyers } from '@/hooks/useAdminQueries';
import GlobalPushModal from '@/components/modals/GlobalPushModal';

export default function BuyersPage() {
  const queryClient = useQueryClient();
  const { data: buyers = [], isLoading } = useBuyers();
  const [isPushModalOpen, setIsPushModalOpen] = useState(false);

  const handleUpdateGrade = async (id: string, newGrade: string) => {
    const { error } = await supabase.from('profiles').update({ grade: newGrade }).eq('id', id);
    if (error) alert('등급 변경 실패'); 
    else { 
      queryClient.invalidateQueries({ queryKey: ['buyers'] });
      alert(`등급이 [${newGrade}](으)로 변경되었습니다.`); 
    }
  };

  return (
    <div className="animate-in fade-in duration-500 relative flex flex-col h-full">
      <header className="mb-6 flex justify-between items-end">
        <div><h1 className="text-3xl font-black text-slate-900">CRM 회원 관리</h1></div>
        <button onClick={() => setIsPushModalOpen(true)} className="flex items-center space-x-2 bg-slate-900 text-white px-5 py-3 rounded-xl font-bold shadow-sm hover:bg-slate-800 transition-colors">
          <Bell size={18} /><span>전체 앱 푸시 발송</span>
        </button>
      </header>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-sm sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="py-4 px-6 font-bold">가입일</th>
                <th className="py-4 px-6 font-bold">고객사명</th>
                <th className="py-4 px-6 font-bold">담당자</th>
                <th className="py-4 px-6 font-bold text-center">앱 설치 여부</th>
                <th className="py-4 px-6 font-bold text-center">회원 등급</th> 
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-20 text-slate-400 font-bold"><Loader2 className="animate-spin mx-auto mb-2 text-indigo-500" size={32} />회원 데이터를 불러오는 중입니다...</td></tr>
              ) : buyers.map((b:any) => (
                <tr key={b.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 text-slate-500 font-medium">{new Date(b.created_at).toLocaleDateString('ko-KR')}</td>
                  <td className="py-4 px-6 font-black text-slate-800 text-base">{b.company}</td>
                  <td className="py-4 px-6 text-slate-700 font-semibold">{b.name || '-'}</td>
                  <td className="py-4 px-6 text-center">
                    {b.push_token ? <span className="text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm">설치완료</span> : <span className="text-slate-400 font-medium bg-slate-100 px-3 py-1.5 rounded-full">미설치</span>}
                  </td>
                  <td className="py-4 px-6 text-center">
                    <select 
                      className={`px-4 py-2 rounded-xl font-bold text-xs border cursor-pointer outline-none shadow-sm transition-colors ${b.grade === 'VVIP' ? 'bg-purple-50 text-purple-700 border-purple-200' : b.grade === 'VIP' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      value={b.grade || 'NORMAL'}
                      onChange={(e) => handleUpdateGrade(b.id, e.target.value)}
                    >
                      <option value="NORMAL">NORMAL (일반)</option>
                      <option value="VIP">VIP (우수)</option>
                      <option value="VVIP">VVIP (최우수)</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isPushModalOpen && <GlobalPushModal buyers={buyers} onClose={() => setIsPushModalOpen(false)} />}
    </div>
  );
}