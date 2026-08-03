import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

// 📦 물류/발주 데이터
export const useOrders = () => useQuery({
  queryKey: ['orders'],
  queryFn: async () => {
    const { data } = await supabase.from('orders').select('*, profiles(company, manager, name, phone, address, push_token)').order('created_at', { ascending: false });
    return data || [];
  },
});

// 🏷️ 상품 마스터 데이터
export const useProducts = () => useQuery({
  queryKey: ['products'],
  queryFn: async () => {
    const { data } = await supabase.from('products').select('*');
    return data || [];
  },
});

// 👥 CRM 바이어(고객) 데이터
export const useBuyers = () => useQuery({
  queryKey: ['buyers'],
  queryFn: async () => {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    return data || [];
  },
});

// 🛡️ 스태프 및 관리자 데이터
export const useStaffs = () => useQuery({
  queryKey: ['staffs'],
  queryFn: async () => {
    const { data } = await supabase.from('profiles').select('*').in('role', ['ADMIN', 'STAFF']).order('created_at', { ascending: false });
    return data || [];
  },
});

// 💬 커뮤니티 게시글 데이터
export const useCommunityPosts = () => useQuery({
  queryKey: ['community_posts'],
  queryFn: async () => {
    const { data } = await supabase.from('community_posts').select('*').order('created_at', { ascending: false });
    return data || [];
  },
});