
import React, { useState, useEffect } from 'react';
import { UserCog, Plus, Trash2, Edit2, X, Save, ShieldAlert } from 'lucide-react';
import { AdminAgent } from '../types';

interface AdminAgentManagerProps {
  isOpen: boolean;
  onClose: () => void;
  agents: AdminAgent[];
  onAddAgent: (agent: AdminAgent) => void;
  onEditAgent: (agent: AdminAgent) => void;
  onRemoveAgent: (id: string) => void;
}

export const AdminAgentManager: React.FC<AdminAgentManagerProps> = ({ 
    isOpen, onClose, agents, onAddAgent, onEditAgent, onRemoveAgent 
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', intro: '' });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!isOpen) {
        setEditingId(null);
        setIsAdding(false);
        setFormData({ name: '', intro: '' });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartEdit = (agent: AdminAgent) => {
      setEditingId(agent.id);
      setIsAdding(false);
      setFormData({ name: agent.name.replace('~', ''), intro: agent.intro });
  };

  const handleStartAdd = () => {
      setIsAdding(true);
      setEditingId(null);
      setFormData({ name: '', intro: '' });
  };

  const handleSave = () => {
      if (!formData.name.trim()) return;

      const formattedName = formData.name.startsWith('~') ? formData.name : `~${formData.name}`;

      if (isAdding) {
          onAddAgent({
              id: Date.now().toString(),
              name: formattedName,
              intro: formData.intro
          });
      } else if (editingId) {
          const agent = agents.find(a => a.id === editingId);
          if (agent) {
              onEditAgent({
                  ...agent,
                  name: formattedName,
                  intro: formData.intro
              });
          }
      }
      
      setEditingId(null);
      setIsAdding(false);
      setFormData({ name: '', intro: '' });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-200">
       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
          
          {/* Header */}
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50">
             <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                    <UserCog size={20} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-zinc-900">Manage Support Agents</h2>
                    <p className="text-xs text-zinc-500">Add or edit AI personas for human support simulation.</p>
                </div>
             </div>
             <button onClick={onClose} className="p-2 hover:bg-zinc-200 rounded-full text-zinc-500 transition-colors">
                 <X size={20} />
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-zinc-50/50">
             
             {/* List */}
             <div className="grid gap-3">
                 {agents.map(agent => (
                     <div key={agent.id} className={`bg-white border rounded-xl p-4 transition-all ${editingId === agent.id ? 'border-emerald-500 ring-1 ring-emerald-500 shadow-md' : 'border-zinc-200 hover:border-zinc-300'}`}>
                         
                         {editingId === agent.id ? (
                             <div className="space-y-3">
                                 <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Agent Name</label>
                                    <input 
                                        type="text" 
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-400 mt-1"
                                        placeholder="e.g. Supun"
                                    />
                                 </div>
                                 <div>
                                    <label className="text-[10px] font-bold text-zinc-400 uppercase">Introduction / Persona</label>
                                    <textarea 
                                        value={formData.intro}
                                        onChange={e => setFormData({...formData, intro: e.target.value})}
                                        className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400 mt-1 min-h-[80px]"
                                        placeholder="Specific instructions for this agent (e.g. 'You are a senior technical support lead...')"
                                    />
                                 </div>
                                 <div className="flex gap-2 justify-end pt-2">
                                     <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700">Cancel</button>
                                     <button onClick={handleSave} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 flex items-center gap-1">
                                         <Save size={14} /> Save Changes
                                     </button>
                                 </div>
                             </div>
                         ) : (
                             <div className="flex items-start justify-between">
                                 <div>
                                     <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-bold text-zinc-800">{agent.name.replace('~', '')}</h3>
                                        <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-mono">{agent.id}</span>
                                     </div>
                                     <p className="text-sm text-zinc-600 line-clamp-2">{agent.intro || <span className="italic text-zinc-400">No custom introduction set. Using default generic persona.</span>}</p>
                                 </div>
                                 <div className="flex items-center gap-1">
                                     <button onClick={() => handleStartEdit(agent)} className="p-2 text-zinc-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                         <Edit2 size={16} />
                                     </button>
                                     <button onClick={() => onRemoveAgent(agent.id)} className="p-2 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remove">
                                         <Trash2 size={16} />
                                     </button>
                                 </div>
                             </div>
                         )}
                     </div>
                 ))}
             </div>

             {/* Add New Block */}
             {isAdding && (
                 <div className="bg-white border border-emerald-500 ring-1 ring-emerald-500 rounded-xl p-4 shadow-md mt-4 animate-in slide-in-from-bottom-2">
                     <div className="space-y-3">
                        <div className="flex items-center justify-between">
                             <h3 className="font-bold text-emerald-700 text-sm">New Agent</h3>
                             <button onClick={() => setIsAdding(false)} className="text-zinc-400 hover:text-zinc-600"><X size={16}/></button>
                        </div>
                        <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">Agent Name</label>
                        <input 
                            type="text" 
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm font-medium focus:outline-none focus:border-emerald-400 mt-1"
                            placeholder="e.g. Supun"
                            autoFocus
                        />
                        </div>
                        <div>
                        <label className="text-[10px] font-bold text-zinc-400 uppercase">Introduction / Persona</label>
                        <textarea 
                            value={formData.intro}
                            onChange={e => setFormData({...formData, intro: e.target.value})}
                            className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400 mt-1 min-h-[80px]"
                            placeholder="Describe this agent's specific role, tone, or background..."
                        />
                        </div>
                        <div className="flex gap-2 justify-end pt-2">
                            <button onClick={handleSave} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 flex items-center gap-1">
                                <Plus size={14} /> Create Agent
                            </button>
                        </div>
                    </div>
                 </div>
             )}

             {!isAdding && (
                 <button 
                    onClick={handleStartAdd}
                    className="w-full mt-4 py-3 border-2 border-dashed border-zinc-300 rounded-xl text-zinc-500 font-medium hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all flex items-center justify-center gap-2"
                 >
                     <Plus size={18} /> Add New Agent
                 </button>
             )}

          </div>
       </div>
    </div>
  );
};
