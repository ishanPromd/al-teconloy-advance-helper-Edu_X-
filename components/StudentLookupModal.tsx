
import React, { useState } from 'react';
import { Search, X, User, School, CreditCard, ShieldCheck, Mail, AlertCircle, BadgeCheck } from 'lucide-react';
import { getStudentDatabase } from '../data/studentDb';
import { Student } from '../types';

interface StudentLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentLookupModal: React.FC<StudentLookupModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [result, setResult] = useState<Student | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    const db = getStudentDatabase();
    const student = db.find(s => s.email.toLowerCase() === email.trim().toLowerCase());
    
    setResult(student || null);
    setHasSearched(true);
  };

  const clearSearch = () => {
    setEmail('');
    setResult(null);
    setHasSearched(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
           <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <Search size={20} />
              </div>
              <div>
                  <h2 className="text-lg font-bold text-zinc-900">Student Lookup</h2>
                  <p className="text-xs text-zinc-500">Query user database by email address.</p>
              </div>
           </div>
           <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full text-zinc-500 transition-colors">
               <X size={20} />
           </button>
        </div>

        <div className="p-6 overflow-y-auto">
           {/* Search Form */}
           <form onSubmit={handleSearch} className="relative mb-6">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                 type="email" 
                 value={email}
                 onChange={(e) => setEmail(e.target.value)}
                 placeholder="Enter student email..."
                 className="w-full pl-10 pr-24 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm font-medium"
                 autoFocus
              />
              {email && (
                 <button 
                    type="button" 
                    onClick={clearSearch} 
                    className="absolute right-20 top-1/2 -translate-y-1/2 p-1 text-zinc-300 hover:text-zinc-500"
                 >
                    <X size={14} />
                 </button>
              )}
              <button 
                 type="submit"
                 className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-zinc-900 text-white text-xs font-bold rounded-lg hover:bg-zinc-800 transition-colors"
              >
                 Search
              </button>
           </form>

           {/* Results */}
           {hasSearched ? (
              result ? (
                 <div className="animate-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <span className="text-2xl font-heading font-bold">{result.full_name.charAt(0)}</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-zinc-900 leading-tight">{result.full_name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded text-xs font-mono border border-zinc-200">
                                   {result.student_id}
                                </span>
                                {result.id_verified === 'TRUE' && (
                                   <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                      <BadgeCheck size={12} /> VERIFIED ID
                                   </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                        
                        {/* School Info */}
                        <div className="col-span-2 bg-zinc-50 rounded-xl p-3 border border-zinc-100 flex items-start gap-3">
                           <div className="p-2 bg-white rounded-lg text-zinc-400 shadow-sm"><School size={16} /></div>
                           <div>
                              <div className="text-[10px] uppercase font-bold text-zinc-400">School & Stream</div>
                              <div className="font-semibold text-zinc-800">{result.school}</div>
                              <div className="text-xs text-zinc-500">{result.stream} Stream • {result.district}</div>
                           </div>
                        </div>

                        {/* Payment Status */}
                        <div className={`col-span-1 rounded-xl p-3 border flex flex-col gap-1 ${
                            result.payment_this_month === 'Paid' ? 'bg-emerald-50 border-emerald-100' :
                            result.payment_this_month === 'Pending' ? 'bg-amber-50 border-amber-100' : 'bg-red-50 border-red-100'
                        }`}>
                           <div className="flex items-center justify-between mb-1">
                               <CreditCard size={16} className={
                                   result.payment_this_month === 'Paid' ? 'text-emerald-500' :
                                   result.payment_this_month === 'Pending' ? 'text-amber-500' : 'text-red-500'
                               } />
                               <span className="text-[10px] uppercase font-bold opacity-60">This Month</span>
                           </div>
                           <div className={`text-lg font-bold ${
                               result.payment_this_month === 'Paid' ? 'text-emerald-700' :
                               result.payment_this_month === 'Pending' ? 'text-amber-700' : 'text-red-700'
                           }`}>
                               {result.payment_this_month}
                           </div>
                        </div>

                        {/* Marks */}
                        <div className="col-span-1 bg-white rounded-xl p-3 border border-zinc-200 flex flex-col gap-1">
                           <div className="flex items-center justify-between mb-1">
                               <ShieldCheck size={16} className="text-zinc-400" />
                               <span className="text-[10px] uppercase font-bold text-zinc-400">Last Marks</span>
                           </div>
                           <div className="text-lg font-bold text-zinc-800">
                               {result.last_paper_marks || 'N/A'}
                           </div>
                        </div>

                        {/* Contact */}
                        <div className="col-span-2 bg-white rounded-xl p-3 border border-zinc-100 flex items-center justify-between">
                             <div className="flex flex-col">
                                <span className="text-[10px] uppercase font-bold text-zinc-400">Email Address</span>
                                <span className="text-zinc-600 font-medium truncate max-w-[250px]">{result.email}</span>
                             </div>
                             <div className={`px-2 py-1 rounded text-[10px] font-bold border ${result.email_verified === 'TRUE' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-zinc-100 text-zinc-500 border-zinc-200'}`}>
                                 {result.email_verified === 'TRUE' ? 'Verified Email' : 'Unverified'}
                             </div>
                        </div>
                        
                        {/* Tracking */}
                        <div className="col-span-2 bg-zinc-900 text-white rounded-xl p-3 flex items-center justify-between shadow-md">
                             <span className="text-xs font-medium text-zinc-400">Tracking Number</span>
                             <span className="font-mono font-bold tracking-wider text-emerald-400">{result.tracking_number}</span>
                        </div>
                    </div>
                 </div>
              ) : (
                 <div className="flex flex-col items-center justify-center py-10 text-center animate-in fade-in zoom-in-95">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-3">
                        <AlertCircle size={32} className="text-red-400" />
                    </div>
                    <h3 className="text-zinc-900 font-bold">Student Not Found</h3>
                    <p className="text-sm text-zinc-500 max-w-xs mt-1">
                        No record matches <b>"{email}"</b>. Please check the email address and try again.
                    </p>
                 </div>
              )
           ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                  <Search size={48} className="text-zinc-300 mb-3" strokeWidth={1} />
                  <p className="text-sm text-zinc-400">Enter an email to view student profile</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
};
