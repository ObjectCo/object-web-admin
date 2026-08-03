import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const useDashboardData = () => {
  // 발주 데이터 가져오기 (5초마다 백그라운드에서 자동 갱신)
  const { data: orders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, profiles(company, manager, name, phone, address, push_token)')
        .order('created_at', { ascending: false });
      return data || [];
    },
    refetchInterval: 5000, 
  });

  // 컨시어지 요청 데이터 가져오기 (5초마다 백그라운드에서 자동 갱신)
  const { data: calls = [], isLoading: isCallsLoading } = useQuery({
    queryKey: ['calls'],
    queryFn: async () => {
      const { data } = await supabase
        .from('concierge_requests')
        .select('*, profiles(company)')
        .order('created_at', { ascending: false });
      return data || [];
    },
    refetchInterval: 5000,
  });

  return { 
    orders, 
    calls, 
    isLoading: isOrdersLoading || isCallsLoading 
  };
};