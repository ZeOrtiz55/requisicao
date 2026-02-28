'use client';
import React, { useState } from 'react';
import { Store, Phone, Hash, FileText, CheckCircle2, ArrowRight } from 'lucide-react';

export default function FormFornecedor({ onSave }: { onSave: any }) {
  const [formData, setFormData] = useState({
    nome: '',
    numero: '',
    'cpf/cnpj': '',
    descricao: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value.toUpperCase() });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    setFormData({ nome: '', numero: '', 'cpf/cnpj': '', descricao: '' });
  };

  // Design Tokens (Architectural Clean)
  const labelStyle = "text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 block";
  const inputStyle = "w-full text-lg font-light text-black outline-none bg-transparent placeholder:text-slate-200 transition-all";
  const cellStyle = "p-8 border-slate-100 transition-all focus-within:bg-slate-50/50";

  return (
    <div className="bg-white border border-slate-200 rounded-[3.5rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* CABEÇALHO */}
      <div className="p-12 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
        <div>
          <h2 className="text-3xl font-normal text-black tracking-tighter uppercase">Novo Fornecedor</h2>
          <p className="text-[10px] text-slate-400 uppercase tracking-[0.4em] mt-2">Homologação de Parceiros Industriais</p>
        </div>
        <div className="w-16 h-16 rounded-3xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 shadow-sm">
          <Store size={32} strokeWidth={1.5} />
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-4">
        {/* GRADE TÉCNICA */}
        <div className="grid grid-cols-1 md:grid-cols-2 border border-slate-100 rounded-[2.5rem] overflow-hidden">
          
          <div className={`${cellStyle} border-b md:border-r`}>
            <label className={labelStyle}>Razão Social / Nome</label>
            <input 
              name="nome" 
              required 
              value={formData.nome}
              onChange={handleChange}
              className={inputStyle}
              placeholder="DIGITE O NOME..." 
            />
          </div>

          <div className={`${cellStyle} border-b`}>
            <label className={labelStyle}>Documento (CNPJ/CPF)</label>
            <input 
              name="cpf/cnpj" 
              value={formData['cpf/cnpj']}
              onChange={handleChange}
              className={inputStyle}
              placeholder="00.000.000/0001-00" 
            />
          </div>

          <div className={`${cellStyle} md:border-r`}>
            <label className={labelStyle}>Contato / WhatsApp</label>
            <input 
              name="numero" 
              value={formData.numero}
              onChange={handleChange}
              className={inputStyle}
              placeholder="(14) 00000-0000" 
            />
          </div>

          <div className={cellStyle}>
            <label className={labelStyle}>Descrição de Serviço</label>
            <input 
              name="descricao" 
              value={formData.descricao}
              onChange={handleChange}
              className={inputStyle}
              placeholder="EX: PEÇAS AGRÍCOLAS" 
            />
          </div>
        </div>

        {/* BOTÃO PILL MODERN */}
        <div className="p-8 mt-4 flex justify-center">
          <button 
            type="submit"
            className="group flex items-center gap-6 bg-slate-950 text-white px-16 py-6 rounded-full font-light uppercase text-[11px] tracking-[0.5em] hover:bg-blue-600 hover:shadow-2xl transition-all duration-500 transform active:scale-95"
          >
            <CheckCircle2 size={18} className="text-blue-400 group-hover:text-white" /> 
            Finalizar Cadastro
            <ArrowRight size={14} className="opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500" />
          </button>
        </div>
      </form>

      <div className="bg-slate-50 p-6 text-center">
        <p className="text-[8px] text-slate-300 font-bold uppercase tracking-[0.5em]">Sincronização imediata com banco de dados</p>
      </div>
    </div>
  );
}