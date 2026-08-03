"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Package, Database, MessageSquare, ImageIcon, Users, ShieldCheck, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function Sidebar({ userRole, userPerms }: { userRole: string, userPerms: any }) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const navItems = [
    { name: '재무 대시보드', href: '/', icon: Activity, show: true },
    { name: '물류/발주 관리', href: '/logistics', icon: Package, show: userRole === 'ADMIN' || userPerms?.orders },
    { name: '상품 및 재고 관리', href: '/products', icon: Database, show: userRole === 'ADMIN' || userPerms?.products },
    { name: 'CS 라이브 채팅', href: '/chat', icon: MessageSquare, show: true },
    { name: '커뮤니티 관리', href: '/community', icon: ImageIcon, show: userRole === 'ADMIN' || userPerms?.community },
    { name: 'CRM 회원 관리', href: '/buyers', icon: Users, show: userRole === 'ADMIN' },
    { name: '시스템 권한 관리', href: '/staffs', icon: ShieldCheck, show: userRole === 'ADMIN' },
  ];

  return (
    <div className="w-64 bg-slate-900 text-slate-300 p-6 flex flex-col justify-between z-10 shadow-xl min-h-screen fixed left-0 top-0">
      <div>
        <div className="text-2xl font-black tracking-tighter text-white mb-8 pl-2">
          object.erp <span className="text-indigo-400 text-sm align-top">PRO</span>
        </div>
        
        <div className="mb-6 pl-2">
          <span className="px-2 py-1 rounded text-xs font-bold bg-slate-800 text-indigo-300 border border-indigo-900/50">
            {userRole === 'ADMIN' ? '👑 최고 관리자' : '👤 일반 직원'}
          </span>
        </div>

        <nav className="space-y-1.5">
          {navItems.filter(item => item.show).map(item => (
            <Link key={item.href} href={item.href}>
              <div className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl font-bold transition-all ${pathname === item.href ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}>
                <item.icon size={20} />
                <span>{item.name}</span>
              </div>
            </Link>
          ))}
        </nav>
      </div>
      <div className="space-y-4">
        <button onClick={handleLogout} className="flex items-center space-x-3 text-slate-400 hover:text-white hover:bg-slate-800 px-4 py-3 rounded-xl font-semibold transition-colors w-full">
          <LogOut size={20} /><span>시스템 로그아웃</span>
        </button>
      </div>
    </div>
  );
}