import React from 'react';
import { Subject } from '../types';
import { Book, Cpu, Wrench, Sprout, Globe } from 'lucide-react';

interface SubjectSelectorProps {
  currentSubject: Subject;
  onSubjectChange: (subject: Subject) => void;
}

export const SubjectSelector: React.FC<SubjectSelectorProps> = ({ currentSubject, onSubjectChange }) => {
  const subjects: { id: Subject; label: string; icon: React.ReactNode }[] = [
    { id: 'General', label: 'General', icon: <Globe size={16} /> },
    { id: 'SFT', label: 'SFT', icon: <Book size={16} /> },
    { id: 'ICT', label: 'ICT', icon: <Cpu size={16} /> },
    { id: 'ET', label: 'ET', icon: <Wrench size={16} /> },
    { id: 'Agriculture', label: 'Agri', icon: <Sprout size={16} /> },
  ];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">Subject Focus</span>
      <div className="grid grid-cols-2 gap-2">
        {subjects.map((sub) => (
          <button
            key={sub.id}
            onClick={() => onSubjectChange(sub.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              currentSubject === sub.id
                ? 'bg-indigo-100 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
            }`}
          >
            {sub.icon}
            <span>{sub.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};