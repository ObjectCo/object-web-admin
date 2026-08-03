"use client";
import React, { useState, useMemo } from 'react';
import { Search, Loader2, MessageCircle, Image as ImageIcon, Trash2, Edit } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useCommunityPosts } from '@/hooks/useAdminQueries';
import CommunityDetailModal from '@/components/modals/CommunityDetailModal';

export default function CommunityPage() {
  const queryClient = useQueryClient();
  const { data: posts = [], isLoading } = useCommunityPosts();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('전체');
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const refreshPosts = () => {
    queryClient.invalidateQueries({ queryKey: ['community_posts'] });
  };

  const processedPosts = useMemo(() => {
    return posts.filter((post: any) => {
      const matchSearch = (post.content || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (post.author_company || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = categoryFilter === '전체' || post.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [posts, searchQuery, categoryFilter]);

  const handleDeletePost = async (id: string) => { 
    if (window.confirm(`이 게시글을 정말 삭제하시겠습니까?`)) { 
      const toastId = toast.loading('삭제 중...');
      await supabase.from('community_comments').delete().eq('post_id', id);
      const { error } = await supabase.from('community_posts').delete().eq('id', id); 
      
      if (error) {
        toast.error('삭제 실패: ' + error.message, { id: toastId });
      } else {
        toast.success('삭제 완료', { id: toastId });
        refreshPosts(); 
      }
    }
  };

  // ⭐️ 썸네일 URL을 Supabase Public URL로 완벽하게 변환해주는 로직 적용
  const getImageUrl = (imagesData: any) => {
    if (!imagesData) return null;
    let filename = null;
    
    try {
      const parsed = typeof imagesData === 'string' ? JSON.parse(imagesData) : imagesData;
      if (Array.isArray(parsed) && parsed.length > 0) {
        filename = parsed[0];
      }
    } catch {
      filename = typeof imagesData === 'string' ? imagesData : null;
    }

    if (!filename) return null;
    if (filename.startsWith('http')) return filename; // 이미 전체 URL인 경우 그대로 반환

    // 파일명만 있는 경우 Supabase 'images' 버킷의 Public URL을 가져옴
    const { data } = supabase.storage.from('images').getPublicUrl(filename);
    return data.publicUrl;
  };

  return (
    <div className="animate-in fade-in duration-500 h-full flex flex-col space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">앱 커뮤니티 피드 관리</h1>
          <p className="text-slate-500 font-medium mt-1">고객들이 작성한 글과 사진, 댓글을 모니터링하고 관리합니다.</p>
        </div>
      </header>

      {/* 필터 바 */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center gap-4">
        <div className="flex bg-slate-100 p-1 rounded-xl space-x-1">
          {['전체', '자유게시판', '원단수배', '질문답변'].map(tab => (
            <button
              key={tab}
              onClick={() => setCategoryFilter(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${categoryFilter === tab ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {tab}
            </button>
          ))}
        </div>
        
        <div className="relative w-full max-w-sm">
          <Search size={16} className="absolute inset-y-0 left-3.5 top-3 text-slate-400"/>
          <input 
            type="text" 
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 text-xs font-medium outline-none" 
            placeholder="내용 또는 작성자(회사명) 검색..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      {/* 리스트(Table) 뷰 */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 text-xs sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="py-4 px-6 font-bold w-32">카테고리</th>
                <th className="py-4 px-6 font-bold">내용 요약</th>
                <th className="py-4 px-6 font-bold w-48">작성자 (소속)</th>
                <th className="py-4 px-6 font-bold w-32 text-center">작성일</th>
                <th className="py-4 px-6 font-bold w-24 text-center">관리</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-20 text-slate-400 font-bold"><Loader2 className="animate-spin mx-auto mb-2 text-indigo-500" size={32} />게시글 데이터를 불러오는 중입니다...</td></tr>
              ) : processedPosts.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-20 text-slate-400 font-medium">조건에 맞는 게시글이 없습니다.</td></tr>
              ) : processedPosts.map((post: any) => {
                const thumb = getImageUrl(post.images);
                return (
                  <tr key={post.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6">
                      <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-200 text-xs font-bold">{post.category || '자유게시판'}</span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center cursor-pointer group" onClick={() => setSelectedPost(post)}>
                        {thumb ? (
                          <div className="w-10 h-10 rounded-lg bg-slate-200 flex-shrink-0 mr-3 overflow-hidden border border-slate-200">
                            <img src={thumb} alt="thumb" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150?text=Error')} />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex-shrink-0 mr-3 flex items-center justify-center border border-slate-200 text-slate-300">
                            <ImageIcon size={18} />
                          </div>
                        )}
                        <p className="text-slate-700 font-medium line-clamp-1 group-hover:text-indigo-600 transition-colors">{post.content}</p>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-800 text-sm">{post.author_company || '미상'}</p>
                      <p className="text-xs text-slate-500">{post.author_name || '익명'}</p>
                    </td>
                    <td className="py-4 px-6 text-center text-xs text-slate-500 font-medium">
                      {new Date(post.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="py-4 px-6 text-center space-x-1 whitespace-nowrap">
                      <button onClick={() => setSelectedPost(post)} className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors border border-transparent hover:border-indigo-200">
                        <Edit size={16} />
                      </button>
                      <button onClick={() => handleDeletePost(post.id)} className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPost && (
        <CommunityDetailModal 
          post={selectedPost} 
          onClose={() => setSelectedPost(null)} 
          onSuccess={refreshPosts} 
        />
      )}
    </div>
  );
}