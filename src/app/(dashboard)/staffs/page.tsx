"use client";
import React, { useState } from 'react';
import { Key, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useStaffs, useBuyers } from '@/hooks/useAdminQueries';
import StaffRoleModal from '@/components/modals/StaffRoleModal';

export default function StaffsPage() {
  const queryClient = useQueryClient();
  const { data: staffs = [], isLoading: isStaffsLoading } = useStaffs();
  const { data: buyers = [] } = useBuyers(); // 권한 부여 모달에서 회원 검색용으로 사용
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  const handleRevokeStaff = async (id: string) => {
    if (window.confirm('이 직원의 권한을 해제하고 일반 회원으로 강등하시겠습니까?')) {
      await supabase.from('profiles').update({ role: 'USER', permissions: null }).eq('id', id); 
      queryClient.invalidateQueries({ queryKey: ['staffs'] });
    }
  };

  const refreshStaffs = () => {
    queryClient.invalidateQueries({ queryKey: ['staffs'] });
  };

  return (
    <div className="animate-in fade-in duration-500 relative flex flex-col h-full">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900">시스템 권한 관리</h1>
          <p className="text-slate-500 mt-2 font-medium">관리자 및 직원(스태프) 계정의 세부 접근 권한을 제어합니다.</p>
        </div>
        <button onClick={() => setIsStaffModalOpen(true)} className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-3 rounded-xl font-bold shadow-sm hover:bg-indigo-700 transition-colors">
          <Key size={18} /><span>직원 권한 신규 부여</span>
        </button>
      </header>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-sm sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="py-4 px-6 font-bold">소속 및 이름</th><th className="py-4 px-6 font-bold text-center">직급 (Role)</th>
                <th className="py-4 px-6 font-bold text-center">물류 접근</th><th className="py-4 px-6 font-bold text-center">상품 접근</th>
                <th className="py-4 px-6 font-bold text-center">게시판 관리</th><th className="py-4 px-6 font-bold text-center">앱 푸시 발송</th>
                <th className="py-4 px-6 font-bold text-center">관리</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isStaffsLoading ? (
                <tr><td colSpan={7} className="text-center py-20 text-slate-400 font-bold"><Loader2 className="animate-spin mx-auto mb-2 text-indigo-500" size={32} />권한 데이터를 불러오는 중입니다...</td></tr>
              ) : staffs.map((s:any) => (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6"><div className="font-black text-slate-800 text-base">{s.name || s.company}</div><div className="text-xs text-slate-500 mt-0.5">{s.email || '-'}</div></td>
                  <td className="py-4 px-6 text-center">
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm border ${s.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>{s.role}</span>
                  </td>
                  <td className="py-4 px-6 text-center text-lg">{s.role === 'ADMIN' || s.permissions?.orders ? '⭕' : '❌'}</td>
                  <td className="py-4 px-6 text-center text-lg">{s.role === 'ADMIN' || s.permissions?.products ? '⭕' : '❌'}</td>
                  <td className="py-4 px-6 text-center text-lg">{s.role === 'ADMIN' || s.permissions?.community ? '⭕' : '❌'}</td>
                  <td className="py-4 px-6 text-center text-lg">{s.role === 'ADMIN' || s.permissions?.push ? '⭕' : '❌'}</td>
                  <td className="py-4 px-6 text-center">
                    {s.role !== 'ADMIN' && <button onClick={() => handleRevokeStaff(s.id)} className="text-xs bg-red-50 text-red-600 font-bold px-4 py-2 rounded-lg hover:bg-red-100 border border-transparent hover:border-red-200 transition-colors">권한 회수</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isStaffModalOpen && (
        <StaffRoleModal 
          buyers={buyers} 
          onClose={() => setIsStaffModalOpen(false)} 
          onSuccess={refreshStaffs} 
        />
      )}
    </div>
  );
}