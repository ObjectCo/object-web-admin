"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import { supabase } from '@/lib/supabase';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('USER');
  const [userPerms, setUserPerms] = useState({ orders: false, products: false, community: false, push: false });
  const router = useRouter();

  useEffect(() => {
    const checkSessionAndFetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      const { data } = await supabase.from('profiles').select('role, permissions').eq('id', session.user.id).single();
      if (data) {
        setUserRole(data.role || 'USER');
        setUserPerms(data.permissions || { orders: false, products: false, community: false, push: false });
      }
      setLoading(false);
    };

    checkSessionAndFetchProfile();
  }, [router]);

  if (loading) return <div className="flex min-h-screen items-center justify-center text-indigo-600 font-bold bg-slate-50"><Activity className="animate-spin mr-2"/>시스템 부팅 중...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800 relative">
      <Sidebar userRole={userRole} userPerms={userPerms} />
      <div className="flex-1 p-10 overflow-y-auto bg-slate-50/50 ml-64">
        {children}
      </div>
    </div>
  );
}