"use client";
import React from 'react';
import { X, Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface PrintQRModalProps {
  product: any;
  onClose: () => void;
}

export default function PrintQRModal({ product, onClose }: PrintQRModalProps) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-sm rounded-3xl p-8 flex flex-col relative overflow-hidden">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-black text-slate-800">쇼룸용 QR 생성</h2>
          <button onClick={onClose}><X size={24}/></button>
        </div>
        <div id="printable-qr" className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm mb-4">
            <QRCodeSVG value={`object-fabric:${product.article}`} size={200} level="H" includeMargin={true} />
          </div>
          <h3 className="text-2xl font-black text-slate-900">{product.article}</h3>
          <p className="text-slate-500 font-medium mt-1">{product.comp || '혼용률 미기재'}</p>
        </div>
        <button onClick={() => window.print()} className="w-full flex justify-center items-center py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md">
          <Printer size={20} className="mr-2"/>라벨 프린터로 인쇄
        </button>
      </div>
    </div>
  );
}