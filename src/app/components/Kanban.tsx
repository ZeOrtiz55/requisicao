'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import CardCapaReq from './CardCapaReq';
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
  const [filtroTitulo, setFiltroTitulo] = useState('');
  const [filtroFornecedor, setFiltroFornecedor] = useState('');
  const [filtroMes, setFiltroMes] = useState('');
  const [colunaArrastando, setColunaArrastando] = useState<string | null>(null);
  const [limitesPorColuna, setLimitesPorColuna] = useState<Record<string, number>>({});
  const CARDS_POR_VEZ = 20;

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
      const matchTitulo = filtroTitulo ? r.titulo?.toLowerCase().includes(filtroTitulo.toLowerCase()) : true;
      const matchForn = filtroFornecedor ? r.fornecedor === filtroFornecedor : true;
      const matchMes = filtroMes ? r.data?.startsWith(filtroMes) : true;
      return matchID && matchTitulo && matchForn && matchMes;
    });
  }, [requisicoes, filtroID, filtroTitulo, filtroFornecedor, filtroMes]);

  const filterInputStyle = "w-full bg-slate-700/50 text-slate-200 text-sm rounded-lg px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-500 appearance-none cursor-pointer border border-white/5";

  return (
    <div className="w-full bg-slate-800 min-h-screen transition-all duration-700 pb-20">

      {/* BARRA DE FILTROS */}
      <div className="w-full px-6 pt-6 pb-4">
        <div className="max-w-4xl mx-auto bg-slate-900/80 border border-white/10 p-4 rounded-xl">
          <div className="grid grid-cols-[80px_1fr_1fr_1fr_auto] gap-3 items-center">

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 pointer-events-none"/>
              <input
                type="text"
                placeholder="ID"
                value={filtroID}
                onChange={e => setFiltroID(e.target.value)}
                className={`${filterInputStyle} pl-9 text-center`}
              />
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
              <input
                type="text"
                placeholder="Buscar por título..."
                value={filtroTitulo}
                onChange={e => setFiltroTitulo(e.target.value)}
                className={`${filterInputStyle} pl-9`}
              />
            </div>

            <div className="relative">
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
              <select
                value={filtroFornecedor}
                onChange={e => setFiltroFornecedor(e.target.value)}
                className={`${filterInputStyle} pl-9`}
              >
                <option value="" className="bg-slate-800">Fornecedor</option>
                {fornecedoresParaFiltro.map((f: any) => <option key={f} value={f} className="bg-slate-800 uppercase">{f}</option>)}
              </select>
            </div>

            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
              <select
                value={filtroMes}
                onChange={e => setFiltroMes(e.target.value)}
                className={`${filterInputStyle} pl-9`}
              >
                <option value="" className="bg-slate-800">Período</option>
                {mesesDisponiveis.map((m: any) => <option key={m.valor} value={m.valor} className="bg-slate-800">{m.label.toUpperCase()}</option>)}
              </select>
            </div>

            {(filtroID || filtroTitulo || filtroFornecedor || filtroMes) ? (
              <button onClick={() => {setFiltroID(''); setFiltroTitulo(''); setFiltroFornecedor(''); setFiltroMes('')}} className="h-full px-4 py-2.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold uppercase tracking-wide transition-colors flex items-center gap-2">
                <X size={14} /> Limpar
              </button>
            ) : <div />}
          </div>
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
                className={`flex-1 min-w-[280px] max-w-[380px] flex flex-col rounded-2xl transition-all duration-300 border border-white/[0.02] ${
                  isOver ? 'bg-white/[0.04]' : 'bg-transparent'
                }`}
              >
                {/* TÍTULOS DAS FASES */}
                <div className="py-4 px-6 bg-slate-900/90 backdrop-blur-sm rounded-t-2xl border-b border-white/10">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-medium text-slate-300 uppercase tracking-[0.2em]">
                      {col.titulo}
                    </h3>
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-medium text-slate-500">{items.length}</span>
                      <div className={`w-2 h-2 rounded-full ${col.cor}`}></div>
                    </div>
                  </div>
                </div>

                {/* ÁREA DOS CARDS */}
                <div className="p-4 space-y-4 flex-1 max-h-[72vh] overflow-y-auto scrollbar-hide">
                  {items.length > 0 ? (
                    <>
                      {items.slice(0, limitesPorColuna[col.id] || CARDS_POR_VEZ).map((req: any) => (
                        <CardCapaReq
                          key={req.id}
                          req={req}
                          onUpdate={onUpdate}
                          onPrint={onPrint}
                          dadosCompartilhados={dadosCompartilhados}
                        />
                      ))}
                      {items.length > (limitesPorColuna[col.id] || CARDS_POR_VEZ) && (
                        <button
                          onClick={() => setLimitesPorColuna(prev => ({ ...prev, [col.id]: (prev[col.id] || CARDS_POR_VEZ) + CARDS_POR_VEZ }))}
                          className="w-full py-4 rounded-xl border border-dashed border-white/10 text-xs font-bold text-slate-400 uppercase tracking-widest hover:bg-white/5 hover:text-white transition-all"
                        >
                          Carregar mais ({items.length - (limitesPorColuna[col.id] || CARDS_POR_VEZ)} restantes)
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="py-12 border border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 opacity-10">
                      <Layout size={18} className="text-white" />
                      <span className="text-xs font-bold uppercase tracking-[0.4em] text-white">Livre</span>
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