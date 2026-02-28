'use client';
import { useState, useEffect } from 'react';
import { User, Mail, Phone, Save, X, Loader2 } from 'lucide-react';

export default function FormUsuario({ usuarioParaEditar, onSave, onCancel }: any) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (usuarioParaEditar) {
      setNome(usuarioParaEditar.nome || '');
      setEmail(usuarioParaEditar.email || '');
      setTelefone(usuarioParaEditar.telefone || '');
    }
  }, [usuarioParaEditar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave({ nome, email, telefone });
    setLoading(false);
  };

  const inputStyle = "w-full bg-slate-800 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-500";
  const labelStyle = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 flex items-center gap-2";

  return (
    <div className="p-10">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
            {usuarioParaEditar ? 'Editar Colaborador' : 'Novo Colaborador'}
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Cadastro de Técnicos e Solicitantes</p>
        </div>
        <button type="button" onClick={onCancel} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-500 hover:text-white transition-all">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className={labelStyle}><User size={12}/> Nome Completo</label>
            <input required value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Danilo de Souza" className={inputStyle} />
          </div>
          
          <div>
            <label className={labelStyle}><Mail size={12}/> E-mail</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tecnico@empresa.com" className={inputStyle} />
          </div>

          <div>
            <label className={labelStyle}><Phone size={12}/> Telefone</label>
            <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" className={inputStyle} />
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 transition-all mt-6">
          {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
          {usuarioParaEditar ? 'Salvar Alterações' : 'Cadastrar Usuário'}
        </button>
      </form>
    </div>
  );
}