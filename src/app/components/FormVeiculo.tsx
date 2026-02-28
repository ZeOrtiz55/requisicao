'use client';
import { useState, useEffect } from 'react';
import { Car, Save, X, Loader2, Hash } from 'lucide-react';

export default function FormVeiculo({ veiculoParaEditar, onSave, onCancel }: any) {
  const [numPlaca, setNumPlaca] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (veiculoParaEditar) {
      setNumPlaca(veiculoParaEditar.NumPlaca || '');
    }
  }, [veiculoParaEditar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSave({ NumPlaca: numPlaca });
    setLoading(false);
  };

  const inputStyle = "w-full bg-slate-800 border border-white/10 rounded-2xl px-5 py-4 text-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-500";
  const labelStyle = "text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 flex items-center gap-2";

  return (
    <div className="p-10">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-white">
            {veiculoParaEditar ? 'Editar Veículo' : 'Novo Veículo'}
          </h2>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Gestão de Placas da Frota</p>
        </div>
        <button type="button" onClick={onCancel} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-500 hover:text-white transition-all">
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5">
          <label className={labelStyle}><Hash size={12}/> Identificação / Placa</label>
          <input 
            required 
            value={numPlaca} 
            onChange={e => setNumPlaca(e.target.value.toUpperCase())} 
            placeholder="Ex: SAVEIRO - DLZ1967" 
            className={inputStyle} 
          />
        </div>

        <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-blue-900/20 transition-all mt-6">
          {loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
          {veiculoParaEditar ? 'Atualizar Placa' : 'Cadastrar Veículo'}
        </button>
      </form>
    </div>
  );
}