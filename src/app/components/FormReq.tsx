'use client';
import React, { useState, useEffect } from 'react';

const usuarios = ["Danilo de Souza", "Fernando Leonel", "Gabriel Moraes", "Henri Hione", "Jose Ortiz", "Luiz Fernando (Motorista)", "Nicolas Dario", "Paulo Motta", "Jose Antonio de Oliveira", "Pós Vendas- Escritório"];

const EMPRESAS = {
  NOVA: { nome: "NOVA TRATORES MÁQUINAS AGRÍCOLAS LTDA", endereco: "AVENIDA SÃO SEBASTIÃO, 1065 | Piraju - SP" },
  CASTRO: { nome: "CASTRO MÁQUINAS E PEÇAS AGRÍCOLAS LTDA", endereco: "RUA DOUTOR FARTURA, 140 | FARTURA - SP" }
};

export default function FormReq({ onSave }: { onSave: (data: any) => void }) {
  const [formData, setFormData] = useState({
    titulo: '', tipo: '', solicitante: '', setor: '',
    data: new Date().toISOString().split('T')[0],
    empresa: '', endereco_empr: '', veiculo: '', hodometro: '', 
    cliente: '', ordem_servico: '', fornecedor: '', obs: '',
    valor_cobrado_cliente: '', quem_ferramenta: '', status: 'pedido'
  });

  useEffect(() => {
    const config = formData.tipo === 'Frota-Veiculos' ? EMPRESAS.CASTRO : EMPRESAS.NOVA;
    setFormData(p => ({ ...p, empresa: config.nome, endereco_empr: config.endereco }));
  }, [formData.tipo]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  // Estilos atualizados: letras maiores e brancas
  const inputStyle = "w-full px-5 py-4 rounded-xl border border-slate-700 bg-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all text-lg font-medium text-white placeholder:text-slate-500";
  const labelStyle = "text-xs font-bold text-white uppercase tracking-[0.2em] mb-2 block ml-1";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Fundo alterado para escuro para suportar as letras brancas pedidas */}
      <div className="bg-slate-900 rounded-[3rem] border border-white/10 shadow-2xl p-8 md:p-12 text-white">
        <div className="mb-10">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white">Nova Requisição</h2>
          <p className="text-base text-slate-400 mt-2">Preencha os dados técnicos abaixo para iniciar o processo.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label className={labelStyle}>Título do Pedido</label>
              <input required placeholder="EX: COMPRA DE PEÇAS PARA TRATOR" onChange={e => setFormData({...formData, titulo: e.target.value.toUpperCase()})} className={inputStyle} />
            </div>
            <div>
              <label className={labelStyle}>Data</label>
              <input type="date" value={formData.data} onChange={e => setFormData({...formData, data: e.target.value})} className={inputStyle} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className={labelStyle}>Tipo</label>
              <select required onChange={e => setFormData({...formData, tipo: e.target.value})} className={inputStyle}>
                <option value="" className="bg-slate-900">Selecione...</option>
                {["Peças", "Trator-Loja", "Trator-Cliente", "Frota-Veiculos", "Serviço de Terceiros", "Almoxarifado", "Ferramenta"].map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelStyle}>Solicitante</label>
              <select required onChange={e => setFormData({...formData, solicitante: e.target.value})} className={inputStyle}>
                <option value="" className="bg-slate-900">Quem pede?</option>
                {usuarios.map(u => <option key={u} value={u} className="bg-slate-900">{u}</option>)}
              </select>
            </div>
            <div>
              <label className={labelStyle}>Setor Destino</label>
              <select required onChange={e => setFormData({...formData, setor: e.target.value})} className={inputStyle}>
                <option value="" className="bg-slate-900">Selecione...</option>
                {["Trator-Loja", "Trator-Cliente", "Oficina", "Comercial"].map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
              </select>
            </div>
          </div>

          {/* NOVO CAMPO: QUEM FERRAMENTA (Aparece apenas se tipo for Ferramenta) */}
          {formData.tipo === 'Ferramenta' && (
            <div className="p-8 bg-blue-600/10 rounded-3xl border border-blue-500/30 animate-in fade-in slide-in-from-top-4 duration-500">
              <label className={labelStyle}>Destinação da Ferramenta</label>
              <select 
                required 
                value={formData.quem_ferramenta}
                onChange={e => setFormData({...formData, quem_ferramenta: e.target.value})} 
                className={`${inputStyle} !border-blue-500/50`}
              >
                <option value="" className="bg-slate-900">Selecione o uso...</option>
                <option value="Uso Pessoal" className="bg-slate-900">Uso Pessoal (Individual)</option>
                <option value="Geral" className="bg-slate-900">Uso Geral (Oficina/Setor)</option>
              </select>
            </div>
          )}

          {formData.tipo === 'Trator-Cliente' && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 bg-orange-500/10 rounded-2xl border border-orange-500/20 animate-in fade-in zoom-in-95">
              <div className="md:col-span-1">
                <label className="text-[10px] font-bold text-orange-400 uppercase">Cliente</label>
                <input onChange={e => setFormData({...formData, cliente: e.target.value.toUpperCase()})} className={`${inputStyle} !text-base border-orange-500/20`} />
              </div>
              <div className="md:col-span-1">
                <label className="text-[10px] font-bold text-orange-400 uppercase">O.S.</label>
                <input onChange={e => setFormData({...formData, ordem_servico: e.target.value})} className={`${inputStyle} !text-base border-orange-500/20`} />
              </div>
              <div className="md:col-span-1">
                <label className="text-[10px] font-bold text-orange-400 uppercase">Trator</label>
                <input onChange={e => setFormData({...formData, veiculo: e.target.value.toUpperCase()})} className={`${inputStyle} !text-base border-orange-500/20`} />
              </div>
              <div className="md:col-span-1">
                <label className="text-[10px] font-bold text-orange-400 uppercase">Valor</label>
                <input placeholder="0,00" onChange={e => setFormData({...formData, valor_cobrado_cliente: e.target.value})} className={`${inputStyle} !text-base border-orange-500/40 font-bold text-orange-400`} />
              </div>
            </div>
          )}

          <div>
            <label className={labelStyle}>Observações Técnicas</label>
            <textarea rows={4} onChange={e => setFormData({...formData, obs: e.target.value})} className={`${inputStyle} resize-none italic`} placeholder="Descreva os itens ou serviços necessários..." />
          </div>

          <button type="submit" className="w-full bg-white text-slate-900 font-black py-6 rounded-[2rem] shadow-2xl hover:bg-blue-500 hover:text-white transition-all active:scale-[0.98] uppercase text-sm tracking-[0.4em]">
            Confirmar e Enviar Pedido
          </button>
        </form>
      </div>
    </div>
  );
}