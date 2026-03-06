'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import CardReq from './CardReq';
import { supabase } from '../lib/supabase';
import { Search, Calendar, Building2, X, Layout } from 'lucide-react';

const LISTA_FORNECEDORES_CADASTRADOS = ["Rodrigo Torneiro (Panda)"];

export default function Kanban({ requisicoes, onUpdate, onPrint }: any) {
  // Dados compartilhados - buscados UMA vez, passados para todos os cards
  const [dadosCompartilhados, setDadosCompartilhados] = useState<{ fornecedores: any[], usuarios: any[], veiculos: any[] }>({ fornecedores: [], usuarios: [], veiculos: [] });

  useEffect(() => {
    const fetchDados = async () => {
      const [{ data: f }, { data: u }, { data: v }] = await Promise.all([
        supabase.from('Fornecedores').select('nome').order('nome'),
        supabase.from('req_usuarios').select('nome, email').order('nome'),
        supabase.from('SupaPlacas').select('IdPlaca, NumPlaca').order('NumPlaca'),
      ]);
      setDadosCompartilhados({ fornecedores: f || [], usuarios: u || [], veiculos: v || [] });
    };
    fetchDados();
  }, []);
  const [filtroID, setFiltroID] = useState('');
  const [filtroFornecedor, setFiltroFornecedor] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [colunaArrastando, setColunaArrastando] = useState<string | null>(null);

  const colunas = [
    { id: 'pedido', titulo: 'Pedido Realizado', cor: 'bg-blue-500' },
    { id: 'completa', titulo: 'Atualizada por Técnico', cor: 'bg-cyan-500' },
    { id: 'aguardando', titulo: 'Aguardando Fornecedor', cor: 'bg-orange-400' },
    { id: 'financeiro', titulo: 'Enviado Financeiro', cor: 'bg-indigo-600' },
  ];

  const handleDragOver = (e: React.DragEvent, idColuna: string) => {
    e.preventDefault();
    setColunaArrastando(idColuna);
  };

  const handleDrop = (e: React.DragEvent, novoStatus: string) => {
    e.preventDefault();
    const idRequisicao = e.dataTransfer.getData("idRequisicao");
    if (idRequisicao) {
      onUpdate(Number(idRequisicao), { status: novoStatus });
    }
    setColunaArrastando(null);
  };

  const fornecedoresParaFiltro = useMemo(() => {
    const doBanco = requisicoes.map((r: any) => r.fornecedor).filter(Boolean);
    return Array.from(new Set([...LISTA_FORNECEDORES_CADASTRADOS, ...doBanco])).sort();
  }, [requisicoes]);

  const mesesDisponiveis = useMemo(() => {
    const lista = requisicoes.map((r: any) => {
      if (!r.data) return null;
      const date = new Date(r.data);
      return {
        valor: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      };
    }).filter(Boolean);
    return Array.from(new Map(lista.map((m: any) => [m.valor, m])).values());
  }, [requisicoes]);

  const filtradas = useMemo(() => {
    return requisicoes.filter((r: any) => {
      const matchID = filtroID ? r.id.toString().includes(filtroID) : true;
      const matchForn = filtroFornecedor ? r.fornecedor === filtroFornecedor : true;
      const matchMes = filtroMes ? r.data?.startsWith(filtroMes) : true;
      return matchID && matchForn && matchMes;
    });
  }, [requisicoes, filtroID, filtroFornecedor, filtroMes]);

  const filterInputStyle = "bg-transparent text-slate-200 text-[11px] font-light tracking-widest border-b border-white/10 outline-none focus:border-blue-500 pb-1 transition-all placeholder:text-slate-500 appearance-none cursor-pointer";

  return (
    <div className="w-full bg-slate-800 min-h-screen transition-all duration-700 pb-20">
      
      {/* BARRA DE FILTROS - GLASSMORPHISM SUTIL */}
      <div className="w-full px-8 pt-8 pb-4">
        <div className="max-w-fit mx-auto bg-white/[0.03] backdrop-blur-md border border-white/5 p-4 md:px-10 rounded-full flex flex-wrap gap-8 items-center justify-center shadow-2xl">
          
          <div className="flex items-center gap-3">
            <Search size={14} className="text-blue-400"/>
            <input 
              type="text"
              placeholder="ID..."
              value={filtroID}
              onChange={e => setFiltroID(e.target.value)}
              className={`${filterInputStyle} w-16 text-center`}
            />
          </div>

          <div className="flex items-center gap-3">
            <Building2 size={14} className="text-slate-400"/>
            <select 
              value={filtroFornecedor} 
              onChange={e => setFiltroFornecedor(e.target.value)}
              className={`${filterInputStyle} min-w-[150px]`}
            >
              <option value="" className="bg-slate-800">FORNECEDORES</option>
              {fornecedoresParaFiltro.map((f: any) => <option key={f} value={f} className="bg-slate-800 uppercase">{f}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <Calendar size={14} className="text-slate-400"/>
            <select 
              value={filtroMes} 
              onChange={e => setFiltroMes(e.target.value)}
              className={`${filterInputStyle} min-w-[150px]`}
            >
              <option value="" className="bg-slate-800">PERÍODO</option>
              {mesesDisponiveis.map((m: any) => <option key={m.valor} value={m.valor} className="bg-slate-800">{m.label.toUpperCase()}</option>)}
            </select>
          </div>

          {(filtroID || filtroFornecedor || filtroMes) && (
            <button onClick={() => {setFiltroID(''); setFiltroFornecedor(''); setFiltroMes('')}} className="text-[9px] font-bold text-slate-400 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-2">
              <X size={12} /> LIMPAR
            </button>
          )}
        </div>
      </div>

      {/* GRADE KANBAN - COLUNAS COM DESIGNER SLIM */}
      <div className="px-6 mt-2">
        <div className="flex gap-4 overflow-x-auto pb-8 scrollbar-hide justify-center">
          {colunas.map((col) => {
            const items = filtradas.filter((r: any) => r.status === col.id);
            const isOver = colunaArrastando === col.id;

            return (
              <div 
                key={col.id} 
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={() => setColunaArrastando(null)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex-1 min-w-[320px] max-w-[380px] flex flex-col rounded-[2rem] transition-all duration-500 border border-white/[0.02] ${
                  isOver ? 'bg-white/[0.04] scale-[1.01]' : 'bg-transparent'
                }`}
              >
                {/* TÍTULOS DAS FASES */}
                <div className="py-4 px-6 bg-slate-50/95 backdrop-blur-sm rounded-t-[1.9rem] border-b border-slate-200 shadow-sm">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[11px] font-normal text-slate-900 uppercase tracking-[0.3em]">
                      {col.titulo}
                    </h3>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] font-medium text-slate-400">{items.length}</span>
                      <div className={`w-2 h-2 rounded-full ${col.cor} shadow-sm`}></div>
                    </div>
                  </div>
                </div>

                {/* ÁREA DOS CARDS */}
                <div className="p-4 space-y-4 flex-1 max-h-[72vh] overflow-y-auto scrollbar-hide">
                  {items.length > 0 ? (
                    items.map((req: any) => (
                      <CardReq
                        key={req.id}
                        req={req}
                        onUpdate={onUpdate}
                        onPrint={onPrint}
                        dadosCompartilhados={dadosCompartilhados}
                      />
                    ))
                  ) : (
                    <div className="py-12 border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center gap-2 opacity-10">
                      <Layout size={18} className="text-white" />
                      <span className="text-[8px] font-bold uppercase tracking-[0.4em] text-white">Livre</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}