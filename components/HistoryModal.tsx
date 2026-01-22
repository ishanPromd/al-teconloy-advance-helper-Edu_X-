
import React, { useState } from 'react';
import { X, Trash2, Download, Plus, Search, User, Sparkles, MessageSquare, LogIn, LogOut, UserCog, ShieldCheck } from 'lucide-react';
import { Message, Student } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onClearChat: () => void;
  onExportChat: () => void;
  messages: Message[];
  isLoggedIn?: boolean;
  currentUser?: Student | null;
  onLogin?: (email: string) => void;
  onLogout?: () => void;
  isSuperAdmin?: boolean;
  onAddAgent?: (name: string) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  onNewChat,
  onClearChat,
  onExportChat,
  messages,
  isLoggedIn,
  currentUser,
  onLogin,
  onLogout,
  isSuperAdmin,
  onAddAgent
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [loginEmail, setLoginEmail] = useState('');

  if (!isOpen) return null;

  const filteredMessages = messages.filter(
    (m) =>
      !m.isSystem &&
      !m.isError &&
      m.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginEmail.trim() && onLogin) {
      onLogin(loginEmail.trim());
      setLoginEmail('');
    }
  };

  return (
    <div className={`absolute bottom-full mb-3 left-0 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 w-[320px] z-50 origin-bottom-left transition-all flex flex-col max-h-[500px] overflow-hidden ${isOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
        
        {/* Header Actions */}
        <div className="p-3 border-b border-zinc-100 grid gap-2">
           {/* Login Section */}
           <div className="bg-zinc-50 rounded-xl p-2 border border-zinc-100">
             {!isLoggedIn ? (
               <form onSubmit={handleLoginSubmit} className="flex gap-2">
                   <input
                      type="email"
                      placeholder="Student Email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      className="flex-1 px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-zinc-300 text-black placeholder:text-zinc-400 font-medium"
                   />
                   <button 
                     type="submit"
                     className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-900 text-white text-xs font-medium rounded-lg transition-colors"
                   >
                     Login
                   </button>
               </form>
             ) : (
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 overflow-hidden">
                       <div className="p-1 bg-emerald-100 text-emerald-600 rounded-md shrink-0">
                          {isSuperAdmin ? <ShieldCheck size={14} /> : <UserCog size={14} />}
                       </div>
                       <div className="flex flex-col min-w-0">
                          <span className="text-[10px] font-bold text-emerald-600 uppercase">{isSuperAdmin ? 'Super Admin' : 'Logged In'}</span>
                          <span className="text-xs text-zinc-600 truncate max-w-[150px] font-medium">{currentUser?.full_name}</span>
                       </div>
                    </div>
                    <button 
                      onClick={() => onLogout && onLogout()}
                      className="p-1.5 hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-lg transition-colors"
                      title="Logout"
                    >
                       <LogOut size={14} />
                    </button>
                </div>
             )}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => { onNewChat(); onClose(); }}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition-all text-xs font-medium"
            >
              <Plus size={14} />
              <span>New Chat</span>
            </button>
            <button
              onClick={() => { onExportChat(); onClose(); }}
              disabled={messages.length === 0}
              className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-xl transition-colors disabled:opacity-50"
              title="Export"
            >
              <Download size={16} />
            </button>
            <button
              onClick={() => { onClearChat(); onClose(); }}
              disabled={messages.length === 0}
              className="p-2 text-zinc-500 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors disabled:opacity-50"
              title="Clear"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-zinc-100">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-1 focus:ring-zinc-300 text-zinc-900"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar min-h-[150px]">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-zinc-300 gap-2">
              <MessageSquare size={24} strokeWidth={1.5} />
              <span className="text-xs">No messages yet</span>
            </div>
          ) : filteredMessages.length > 0 ? (
            <div className="space-y-1">
              {filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-2.5 rounded-lg hover:bg-zinc-50 transition-colors cursor-default group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      {msg.role === 'user' ? (
                        <User size={10} className="text-zinc-400" />
                      ) : (
                         <Sparkles size={10} className="text-indigo-400" />
                      )}
                      <span className="text-[10px] font-semibold text-zinc-400">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600 line-clamp-1 font-medium">
                    {msg.content || (msg.attachments?.length ? 'Attachment' : '...')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-4 text-zinc-400 text-xs">
                No matching messages
             </div>
          )}
        </div>
    </div>
  );
};
