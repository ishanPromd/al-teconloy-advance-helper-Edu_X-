import React from 'react';
import { Language } from '../types';
import { Languages } from 'lucide-react';

interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ currentLanguage, onLanguageChange }) => {
  return (
    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
      <div className="flex items-center gap-1.5 px-2 text-slate-500">
        <Languages size={14} />
      </div>
      <button
        onClick={() => onLanguageChange(Language.ENGLISH)}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
          currentLanguage === Language.ENGLISH
            ? 'bg-white text-indigo-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        English
      </button>
      <button
        onClick={() => onLanguageChange(Language.SINHALA)}
        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
          currentLanguage === Language.SINHALA
            ? 'bg-white text-indigo-600 shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        Sinhala
      </button>
    </div>
  );
};