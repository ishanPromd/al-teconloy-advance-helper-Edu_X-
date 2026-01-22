import React from 'react';
import { UserCog, User } from 'lucide-react';

interface AdminSelectModalProps {
  isOpen: boolean;
  onSelect: (name: string) => void;
  onCancel: () => void;
}

const ADMIN_NAMES = [
  "~ishan", 
  "~vihanga", 
  "~charuka", 
  "~praveen", 
  "ayesha", 
  "~geeth", 
  "~lavan", 
  "~prageeth"
];

export const AdminSelectModal: React.FC<AdminSelectModalProps> = ({ isOpen, onSelect, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 transform transition-all scale-100">
        <div className="flex items-center gap-3 mb-6 text-emerald-600">
          <div className="p-3 bg-emerald-50 rounded-full">
            <UserCog size={24} />
          </div>
          <div>
             <h3 className="text-lg font-bold text-slate-900">Select Support Agent</h3>
             <p className="text-xs text-slate-500">Choose a human agent to connect with</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {ADMIN_NAMES.map((name) => (
            <button
              key={name}
              onClick={() => onSelect(name)}
              className="flex items-center gap-2 p-3 border border-slate-200 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all text-sm font-medium text-slate-700 group"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600">
                 <User size={16} />
              </div>
              {name.replace('~', '')}
            </button>
          ))}
        </div>

        <button
          onClick={onCancel}
          className="w-full py-3 text-slate-400 hover:text-slate-600 text-sm font-medium"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};