"use client";
import React, { useState, useEffect } from 'react';
import { X, MessageCircle, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

interface CommunityDetailModalProps {
  post: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CommunityDetailModal({ post, onClose, onSuccess }: CommunityDetailModalProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 이미지 URL 파싱 (JSON 배열 형태일 경우 대비)
  const images = React.useMemo(() => {
    if (!post.images) return [];
    if (typeof post.images === 'string') {
      try { return JSON.parse(post.images); } catch { return [post.images]; }
    }
    return Array.isArray(post.images) ? post.images : [];
  }, [post.images]);

  useEffect(() => {
    fetchComments();
  }, [post.id]);

  const fetchComments = async () => {
    setIsLoading(true);
    // 댓글 테이블 이름은 실제 구성에 맞게 수정될 수 있습니다 (예: comments 또는 community_comments)
    const { data, error } = await supabase
      .from('community_comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
      
    if (!error && data) setComments(data);
    setIsLoading(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('이 댓글을 강제 삭제하시겠습니까?')) return;
    const toastId = toast.loading('댓글 삭제 중...');
    const { error } = await supabase.from('community_comments').delete().eq('id', commentId);
    
    if (error) {
      toast.error('댓글 삭제 실패', { id: toastId });
    } else {
      toast.success('댓글이 삭제되었습니다.', { id: toastId });
      fetchComments();
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm('이 게시글을 삭제하시겠습니까? (댓글도 함께 삭제될 수 있습니다)')) return;
    const toastId = toast.loading('게시글 삭제 중...');
    
    // 1. 먼저 게시글에 달린 댓글들을 삭제 (Foreign Key 제약조건 우회)
    await supabase.from('community_comments').delete().eq('post_id', post.id);
    
    // 2. 게시글 삭제
    const { error } = await supabase.from('community_posts').delete().eq('id', post.id);
    
    if (error) {
      toast.error('게시글 삭제에 실패했습니다.', { id: toastId });
    } else {
      toast.success('게시글이 성공적으로 삭제되었습니다.', { id: toastId });
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center space-x-3">
            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md text-xs font-bold">{post.category || '자유게시판'}</span>
            <h2 className="text-lg font-black text-slate-800">게시글 상세 관리</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {/* 작성자 정보 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-900">{post.author_company || '소속 미상'}</p>
              <p className="text-sm text-slate-500">{post.author_name || '익명'} · {new Date(post.created_at).toLocaleString('ko-KR')}</p>
            </div>
          </div>

          {/* 본문 내용 */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 min-h-[150px] whitespace-pre-wrap text-slate-700 text-sm leading-relaxed">
            {post.content}
          </div>

          {/* 첨부 이미지 영역 */}
          {images.length > 0 && (
            <div>
              <p className="text-sm font-bold text-slate-800 mb-3 flex items-center"><ImageIcon size={16} className="mr-1.5"/>첨부 이미지 ({images.length})</p>
              <div className="grid grid-cols-3 gap-3">
                {images.map((img: string, idx: number) => (
                  <div key={idx} className="aspect-square rounded-xl bg-slate-100 border border-slate-200 overflow-hidden relative group">
                    <img src={img} alt={`첨부 ${idx}`} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150?text=Image+Error')} />
                  </div>
                ))}
              </div>
            </div>
          )}

          <hr className="border-slate-100" />

          {/* 댓글 영역 */}
          <div>
            <p className="text-sm font-bold text-slate-800 mb-4 flex items-center"><MessageCircle size={16} className="mr-1.5"/>댓글 관리 ({comments.length})</p>
            {isLoading ? (
              <div className="py-10 flex flex-col items-center justify-center text-slate-400"><Loader2 className="animate-spin mb-2" size={24}/>댓글 불러오는 중...</div>
            ) : comments.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-100 text-slate-500 text-sm font-medium">등록된 댓글이 없습니다.</div>
            ) : (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-4 bg-white border border-slate-200 rounded-xl flex justify-between items-start hover:border-slate-300 transition-colors">
                    <div>
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-bold text-slate-800 text-sm">{comment.author_name || '익명'}</span>
                        <span className="text-xs text-slate-400">{new Date(comment.created_at).toLocaleString('ko-KR')}</span>
                      </div>
                      <p className="text-slate-600 text-sm">{comment.content}</p>
                    </div>
                    <button onClick={() => handleDeleteComment(comment.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 하단 관리 버튼 */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition-colors">닫기</button>
          <button onClick={handleDeletePost} className="px-5 py-2.5 bg-red-50 border border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-100 hover:text-red-700 transition-colors flex items-center">
            <Trash2 size={16} className="mr-1.5" />이 게시글 강제 삭제
          </button>
        </div>
        
      </div>
    </div>
  );
}