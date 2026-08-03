"use client"
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      alert('로그인 실패: 이메일과 비밀번호를 확인해주세요.');
    } else {
      router.push('/');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-100 p-8">
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-100 p-4 rounded-full text-indigo-600"><Lock size={32} /></div>
        </div>
        <h1 className="text-2xl font-black text-center text-slate-900 mb-2">object.erp pro</h1>
        <p className="text-center text-slate-500 font-medium mb-8">관리자 및 스태프 로그인</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">이메일</label>
            <input type="email" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">비밀번호</label>
            <input type="password" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 mt-4">
            {loading ? '인증 중...' : '시스템 접속'}
          </button>
        </form>
      </div>
    </div>
  );
}