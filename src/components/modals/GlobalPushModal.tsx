"use client";
import React, { useState } from 'react';
import { X } from 'lucide-react';

interface GlobalPushModalProps {
  buyers: any[];
  onClose: () => void;
}

export default function GlobalPushModal({ buyers, onClose }: GlobalPushModalProps) {
  const [pushData, setPushData] = useState({ title: '', body: '' });
  const [isPushing, setIsPushing] = useState(false);

  const handleSendGlobalPush = async (e: React.FormEvent) => {
    e.preventDefault(); 
    const tokens = buyers.filter(b => b.push_token).map(b => b.push_token);
    
    if (!pushData.title || tokens.length === 0) return alert('입력값 또는 수신 가능한 바이어가 없습니다.');
    if (!window.confirm(`총 ${tokens.length}명에게 발송하시겠습니까?`)) return;
    
    setIsPushing(true);
    for (const token of tokens) {
      await fetch('/api/push', { method: 'POST', body: JSON.stringify({ to: token, title: pushData.title, body: pushData.body }) });
    }
    setIsPushing(false); 
    alert('전송 완료!');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black text-slate-800">전체 앱 푸시 발송</h2>
          <button onClick={onClose}><X size={20}/></button>
        </div>
        <form onSubmit={handleSendGlobalPush} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">제목 <span className="text-red-500">*</span></label>
            <input type="text" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500" value={pushData.title} onChange={e=>setPushData({...pushData, title: e.target.value})} required />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">내용 <span className="text-red-500">*</span></label>
            <textarea className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 h-32 resize-none" value={pushData.body} onChange={e=>setPushData({...pushData, body: e.target.value})} required></textarea>
          </div>
          <button type="submit" disabled={isPushing} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 flex justify-center mt-2">
            {isPushing ? '발송 중...' : '발송하기'}
          </button>
        </form>
      </div>
    </div>
  );
}