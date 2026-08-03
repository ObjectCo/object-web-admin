"use client";
import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Users, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useBuyers } from '@/hooks/useAdminQueries';

export default function ChatPage() {
  // ✅ 커스텀 훅 적용 (useEffect 대체)
  const { data: buyers = [], isLoading: isBuyersLoading } = useBuyers();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedChatUser, setSelectedChatUser] = useState<any>(null);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // 선택된 유저와의 메시지 내역은 실시간성이 중요하므로 로컬 상태 + 웹소켓 유지
  useEffect(() => {
    if (!selectedChatUser) return;
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').or(`sender_id.eq.${selectedChatUser.id},receiver_id.eq.${selectedChatUser.id}`).order('created_at', { ascending: true });
      if (data) setMessages(data);
    };
    fetchMessages();

    const subscription = supabase.channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
        if (payload.new.sender_id === selectedChatUser.id || payload.new.receiver_id === selectedChatUser.id) {
          setMessages(prev => [...prev, payload.new]);
        }
      }).subscribe();
      
    return () => { supabase.removeChannel(subscription); };
  }, [selectedChatUser]);

  useEffect(() => { 
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight; 
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (!chatInput.trim() || !selectedChatUser) return;
    const { error } = await supabase.from('messages').insert([{ sender_id: 'ADMIN', receiver_id: selectedChatUser.id, content: chatInput }]);
    if (error) alert('메시지 전송 실패'); 
    else setChatInput('');
  };

  return (
    <div className="animate-in fade-in duration-500 h-full flex flex-col">
      <header className="mb-6"><h1 className="text-3xl font-black text-slate-900">라이브 CS 채널</h1></header>
      <div className="flex flex-1 min-h-[600px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="w-1/3 border-r border-slate-100 flex flex-col bg-white">
           <div className="p-4 border-b border-slate-100 bg-slate-50/80 sticky top-0 z-10 backdrop-blur-sm">
             <h2 className="font-bold text-slate-800 flex items-center"><Users size={18} className="mr-2"/>문의 고객 목록</h2>
           </div>
           <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {isBuyersLoading ? (
                <div className="py-10 text-center text-slate-400 font-bold flex flex-col items-center">
                  <Loader2 className="animate-spin mb-2 text-indigo-500" size={24} />고객 목록 로딩중...
                </div>
              ) : buyers.map((b: any) => (
                <div key={b.id} onClick={() => setSelectedChatUser(b)} className={`p-4 cursor-pointer rounded-xl border mb-1 transition-all ${selectedChatUser?.id === b.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'hover:bg-slate-50 border-transparent hover:border-slate-200'}`}>
                  <p className={`font-bold ${selectedChatUser?.id === b.id ? 'text-indigo-900' : 'text-slate-800'}`}>{b.company}</p>
                  <p className="text-sm text-slate-500 mt-1">{b.manager || '담당자 미상'}</p>
                </div>
              ))}
           </div>
         </div>
         <div className="flex-1 flex flex-col bg-slate-50/30">
           {!selectedChatUser ? (
              <div className="flex-1 flex flex-col justify-center items-center text-slate-400 p-8 text-center">
                <MessageSquare size={64} className="text-slate-200 mb-4" />
                <h3 className="text-xl font-bold text-slate-500">대화할 고객을 선택해주세요</h3>
              </div>
           ) : (
             <>
               <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm z-10">
                 <h3 className="font-bold text-slate-800 text-lg">{selectedChatUser.company} <span className="text-sm font-normal text-slate-500 ml-2">({selectedChatUser.manager})</span></h3>
               </div>
               <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50" ref={chatScrollRef}>
                 {messages.length === 0 ? <p className="text-center text-slate-400 mt-10 font-medium">대화 내역이 없습니다. 인사를 건네보세요!</p> : messages.map((msg, idx) => (
                   <div key={idx} className={`flex ${msg.sender_id === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[70%] p-3.5 rounded-2xl text-sm leading-relaxed ${msg.sender_id === 'ADMIN' ? 'bg-indigo-600 text-white rounded-tr-sm shadow-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-sm shadow-sm'}`}>
                       {msg.content}
                     </div>
                   </div>
                 ))}
               </div>
               <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-3 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-10">
                 <input type="text" className="flex-1 px-5 py-3.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 transition-all" placeholder="메시지 입력..." value={chatInput} onChange={e => setChatInput(e.target.value)} />
                 <button type="submit" className="bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-indigo-700 flex items-center space-x-2 shadow-sm transition-colors"><Send size={18} /><span>전송</span></button>
               </form>
             </>
           )}
         </div>
      </div>
    </div>
  );
}