import React from 'react';
import { AlertTriangle, MessageSquarePlus, History } from 'lucide-react';
import { Language } from '../types';

interface LanguageSwitchModalProps {
  isOpen: boolean;
  targetLanguage: Language;
  onConfirm: (clearHistory: boolean) => void;
  onCancel: () => void;
}

export const LanguageSwitchModal: React.FC<LanguageSwitchModalProps> = ({
  isOpen,
  targetLanguage,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 transform transition-all scale-100">
        <div className="flex items-center gap-3 mb-4 text-amber-600">
          <div className="p-2 bg-amber-50 rounded-lg">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">Switch Language?</h3>
        </div>
        
        <p className="text-slate-600 mb-6 leading-relaxed">
          You are about to switch the conversation language to <span className="font-semibold text-slate-800">{targetLanguage}</span>. 
          How would you like to proceed?
        </p>

        <div className="space-y-3">
          <button
            onClick={() => onConfirm(true)}
            className="w-full flex items-center justify-between p-4 border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-200 rounded-xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg text-indigo-600 shadow-sm group-hover:scale-105 transition-transform">
                 <MessageSquarePlus size={20} />
              </div>
              <div className="text-left">
                <div className="font-semibold text-indigo-900">Start New Chat</div>
                <div className="text-xs text-indigo-600/80">Clear history and start fresh</div>
              </div>
            </div>
            <div className="w-4 h-4 rounded-full border-2 border-indigo-200 group-hover:border-indigo-400"></div>
          </button>

          <button
            onClick={() => onConfirm(false)}
            className="w-full flex items-center justify-between p-4 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-all group"
          >
             <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-600 group-hover:scale-105 transition-transform">
                 <History size={20} />
              </div>
              <div className="text-left">
                <div className="font-semibold text-slate-700">Keep Conversation</div>
                <div className="text-xs text-slate-500">History preserved, future replies in {targetLanguage}</div>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-6 flex justify-center">
            <button 
                onClick={onCancel}
                className="text-sm text-slate-400 hover:text-slate-600 font-medium px-4 py-2"
            >
                Cancel
            </button>
        </div>
      </div>
    </div>
  );
};