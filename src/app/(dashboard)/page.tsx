"use client";
import React, { useMemo } from 'react';
import { Activity, Package, Database, DollarSign, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useDashboardData } from '@/hooks/useDashboardData';

export default function DashboardPage() {
  const { orders, calls, isLoading } = useDashboardData();

  const calculateOrderTotal = (itemsStr: string | any[]) => {
    try {
      const items = typeof itemsStr === 'string' ? JSON.parse(itemsStr) : itemsStr;
      return items.reduce((sum: number, item: any) => sum + (Number(item.estYards || item.yardage || 0) * Number(item.priceNum || item.basePrice || 0)), 0);
    } catch { return 0; }
  };

  const financialData = useMemo(() => {
    let totalRevenue = 0; 
    const dailyRevenue: Record<string, number> = {};
    
    orders.forEach((o: any) => {
      const orderValue = calculateOrderTotal(o.items); 
      totalRevenue += orderValue;
      const date = new Date(o.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      dailyRevenue[date] = (dailyRevenue[date] || 0) + orderValue;
    });
    
    const chart = Object.keys(dailyRevenue)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .slice(-7)
      .map(date => ({ name: date, '예상 매출액': dailyRevenue[date] }));
      
    return { totalRevenue, chart };
  }, [orders]);

  if (isLoading) {
    return (
      <div className="h-full min-h-[500px] flex justify-center items-center text-slate-400 font-bold">
        <Activity className="animate-spin mr-2"/>데이터를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <header className="mb-8"><h1 className="text-3xl font-black text-slate-900">경영 현황 대시보드</h1></header>
      
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-slate-500 font-bold">누적 예상 총매출액</h3>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign size={20}/></div>
          </div>
          <p className="text-3xl font-black text-slate-900">₩{financialData.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-slate-500 font-bold">총 누적 요청 건수</h3>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Database size={20}/></div>
          </div>
          <p className="text-3xl font-black text-slate-900">{orders.length}<span className="text-lg font-bold text-slate-400 ml-1">건</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-slate-500 font-bold">신규 발주 대기</h3>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Package size={20}/></div>
          </div>
          <p className="text-3xl font-black text-slate-900">{orders.filter((o: any) => o.status === '답변대기' || o.status === '접수 완료').length}<span className="text-lg font-bold text-slate-400 ml-1">건</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-slate-500 font-bold">대기중인 컨시어지</h3>
            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Activity size={20}/></div>
          </div>
          <p className="text-3xl font-black text-slate-900">{calls.length}<span className="text-lg font-bold text-slate-400 ml-1">명</span></p>
        </div>
      </div>

      <div className="w-full h-[350px] bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp size={20} className="text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800">최근 7일 예상 매출 추이</h2>
        </div>
        <div className="flex-1 min-h-0">
          {financialData.chart.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={financialData.chart} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis tickFormatter={(val) => `₩${(val/10000).toLocaleString()}만`} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10}/>
                <Tooltip formatter={(value: number) => [`₩${value.toLocaleString()}`, '매출액']} contentStyle={{borderRadius: '12px', border: 'none'}} />
                <Area type="monotone" dataKey="예상 매출액" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 font-medium">데이터가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}