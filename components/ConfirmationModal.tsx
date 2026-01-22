
import React from 'react';
import { AlertCircle, FileText, Download } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  type?: 'danger' | 'info' | 'export';
  onConfirm: () => void;
  onCancel: () => void;
  onOptionSelect?: (option: string) => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  type = 'danger',
  onConfirm,
  onCancel,
  onOptionSelect
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl max-w-sm w-full p-6 transform transition-all animate-in zoom-in-95 duration-300 border border-white/20">
        
        {type !== 'export' ? (
          <>
            <div className="flex flex-col items-center text-center mb-6">
               <div className={`p-4 rounded-2xl mb-4 ${type === 'danger' ? 'bg-red-50 text-red-500' : 'bg-zinc-50 text-zinc-600'}`}>
                 <AlertCircle size={32} />
               </div>
               <h3 className="text-xl font-heading font-bold text-zinc-900 mb-2">{title}</h3>
               <p className="text-zinc-500 leading-relaxed text-sm">
                 {message}
               </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-3 text-zinc-600 font-medium hover:bg-zinc-50 rounded-xl transition-colors border border-zinc-200"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 px-4 py-3 text-white font-medium rounded-xl shadow-lg shadow-zinc-200 transition-all hover:shadow-xl hover:-translate-y-0.5 ${
                  type === 'danger' 
                    ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' 
                    : 'bg-zinc-900 hover:bg-zinc-800'
                }`}
              >
                {confirmLabel}
              </button>
            </div>
          </>
        ) : (
          /* Export Options Layout */
          <>
            <div className="flex items-center gap-3 mb-6 text-zinc-700">
              <div className="p-3 bg-zinc-100 rounded-xl">
                <Download size={24} />
              </div>
              <h3 className="text-xl font-heading font-bold text-zinc-900">{title}</h3>
            </div>
            
            <p className="text-zinc-500 mb-6 text-sm leading-relaxed">{message}</p>
            
            <div className="space-y-3 mb-6">
              <button
                onClick={() => onOptionSelect && onOptionSelect('txt')}
                className="w-full flex items-center gap-4 p-4 border border-zinc-200 rounded-2xl hover:border-zinc-300 hover:bg-zinc-50 transition-all group"
              >
                <div className="p-2.5 bg-zinc-100 text-zinc-500 rounded-xl group-hover:bg-white group-hover:text-zinc-800 group-hover:shadow-sm transition-all">
                   <FileText size={22} />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-zinc-900">Plain Text (.txt)</div>
                  <div className="text-xs text-zinc-500">Simple, unformatted text</div>
                </div>
              </button>
              
              <button
                onClick={() => onOptionSelect && onOptionSelect('md')}
                className="w-full flex items-center gap-4 p-4 border border-zinc-200 rounded-2xl hover:border-zinc-300 hover:bg-zinc-50 transition-all group"
              >
                <div className="p-2.5 bg-zinc-100 text-zinc-500 rounded-xl group-hover:bg-white group-hover:text-zinc-800 group-hover:shadow-sm transition-all">
                   <FileText size={22} />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-zinc-900">Markdown (.md)</div>
                  <div className="text-xs text-zinc-500">Preserves formatting and code</div>
                </div>
              </button>
            </div>
            
            <button
                onClick={onCancel}
                className="w-full py-3 text-zinc-400 hover:text-zinc-600 text-sm font-medium hover:bg-zinc-50 rounded-xl transition-colors"
              >
                Cancel
            </button>
          </>
        )}
      </div>
    </div>
  );
};
