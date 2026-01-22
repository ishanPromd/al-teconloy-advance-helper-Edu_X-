
import React from 'react';
import { Language } from '../types';
import { BookOpen, Code, Compass, Sprout } from 'lucide-react';

interface QuickPromptsProps {
  language: Language;
  onSelect: (prompt: string) => void;
}

export const QuickPrompts: React.FC<QuickPromptsProps> = ({ language, onSelect }) => {
  const isSinhala = language === Language.SINHALA;

  const prompts = [
    {
      icon: <BookOpen size={22} className="text-zinc-600" />,
      title: isSinhala ? "SFT සංකල්පයක් පැහැදිලි කරන්න" : "Explain an SFT concept",
      prompt: isSinhala ? "Science for Technology (SFT) හි මෙම සංකල්පය පැහැදිලි කරන්න: " : "Explain this Science for Technology (SFT) concept: ",
      gradient: "from-zinc-100 to-zinc-200/50"
    },
    {
      icon: <Code size={22} className="text-zinc-600" />,
      title: isSinhala ? "ICT ගැටලුවක් විසඳන්න" : "Solve an ICT problem",
      prompt: isSinhala ? "මෙම ICT ක්‍රමලේඛන ගැටලුව විසඳීමට උදව් කරන්න: " : "Help me solve this ICT programming problem: ",
      gradient: "from-zinc-100 to-zinc-200/50"
    },
    {
      icon: <Compass size={22} className="text-zinc-600" />,
      title: isSinhala ? "ET මූලධර්මයක්" : "Engineering Tech principle",
      prompt: isSinhala ? "Engineering Technology (ET) හි මෙම යාන්ත්‍රික මූලධර්මය විස්තර කරන්න: " : "Explain this Engineering Technology (ET) principle: ",
      gradient: "from-zinc-100 to-zinc-200/50"
    },
    {
      icon: <Sprout size={22} className="text-zinc-600" />,
      title: isSinhala ? "කෘෂිකර්මය ගැන" : "Agriculture topic",
      prompt: isSinhala ? "කෘෂිකර්මය (Agriculture) සම්බන්ධ මෙම කරුණ පැහැදිලි කරන්න: " : "Explain this Agriculture subject topic: ",
      gradient: "from-zinc-100 to-zinc-200/50"
    },
  ];

  return (
    <div className="flex flex-nowrap md:flex-wrap gap-4 overflow-x-auto pb-4 md:pb-0 w-full max-w-[850px] px-4 scrollbar-hide">
      {prompts.map((p, index) => (
        <button
          key={index}
          onClick={() => onSelect(p.prompt)}
          className={`flex-shrink-0 w-[200px] md:w-[190px] h-[170px] p-5 rounded-3xl transition-all duration-300 text-left flex flex-col justify-between group border border-white/60 bg-gradient-to-br ${p.gradient} hover:shadow-lg hover:-translate-y-1 relative overflow-hidden backdrop-blur-sm`}
        >
          {/* Decorative Circle */}
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/40 rounded-full blur-2xl group-hover:bg-white/60 transition-colors"></div>
          
          <span className="font-heading font-semibold text-lg text-zinc-800 leading-tight relative z-10">
            {p.title}
          </span>
          
          <div className="bg-white/90 p-3 w-fit rounded-2xl shadow-sm group-hover:scale-110 transition-transform relative z-10">
            {p.icon}
          </div>
        </button>
      ))}
    </div>
  );
};
