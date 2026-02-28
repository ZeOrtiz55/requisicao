'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; 
import TemplatePDF from './TemplatePDF'; // Certifique-se de que este arquivo existe
import { 
  FileText, Calendar, Layers, UserCircle, Briefcase, 
  Truck, HardHat, DollarSign, Tag, ClipboardList, 
  FileCheck, Paperclip, X, Printer, Camera, Info, 
  ShieldCheck, ChevronRight, Store, ArrowRight, Gauge,
  Receipt, Download, User, Trash2, Layout, Building2, MapPin,
  Cpu, Hash, Smartphone, Eye, ExternalLink, Car,
  Plus, CheckCheck // Ícones necessários importados para evitar erros de referência
} from 'lucide-react';

const DEPARTAMENTOS = ["Trator-Loja", "Trator-Cliente", "Oficina", "Comercial"];
const TIPOS_REQ = ["Peça", "Alimentação", "Ferramenta", "Serviço de Terceiros", "Almoxarifado", "Frota-Veículos"];
const FORNECEDORES = ["Rodrigo Torneiro (Panda)"]; 
const USUARIOS = ["Danilo de Souza", "Fernando Leonel", "Gabriel Moraes", "Henri Hione", "Jose Ortiz", "Luiz Fernando (Motorista)", "Nicolas Dario", "Paulo Motta", "Jose Antonio de Oliveira", "Pós Vendas- Escritório"];

export default function CardReq({ req, onUpdate, onPrint }: { req: any, onUpdate: any, onPrint: any }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [modalCotacaoAberto, setModalCotacaoAberto] = useState(false); // NOVO: Modal de Cotação
  const [localData, setLocalData] = useState(req);
  const [cotacaoData, setCotacaoData] = useState<any>({}); // NOVO: Dados da Cotação
  const [fornecedoresVisiveis, setFornecedoresVisiveis] = useState(1); // NOVO: Controle de quantos aparecem
  const [userEmail, setUserEmail] = useState('Buscando...');

  const veioDoApp = req.obs?.includes('[APPSHEET_ID:');

  // CAPTURA AUTOMÁTICA DO EMAIL DO USUÁRIO LOGADO
  useEffect(() => {
    let isMounted = true;
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isMounted) {
          const { data: { user }, error } = await supabase.auth.getUser();
          if (error) throw error;
          if (user?.email) {
            setUserEmail(user.email);
            setLocalData((prev: any) => ({ ...prev, impresso_por: user.email }));
          }
        } else if (isMounted) {
          setUserEmail('Usuário não logado');
        }
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.warn("Informação de Auth:", err.message);
        }
      }
    };
    getUser();
    return () => { isMounted = false; };
  }, []);

  // REALTIME BRIDGE E CARREGAMENTO DE COTAÇÃO
  useEffect(() => { 
    setLocalData({
      ...req,
      quem_ferramenta: req.quem_ferramenta || req.ferramenta_quem || ""
    }); 
    
    // Busca cotação vinculada ao ID da requisição
    const buscarCotacao = async () => {
      const { data } = await supabase.from('req_cotacao').select('*').eq('id', req.id).single();
      if (data) {
        setCotacaoData(data);
        // Calcula quantos fornecedores têm dados para exibir corretamente
        let count = 1;
        for (let i = 2; i <= 5; i++) {
          if (data[`fornecedor${i}`]) count = i;
        }
        setFornecedoresVisiveis(count);
      }
    };
    buscarCotacao();
  }, [req]);

  // DATA AUTOMÁTICA PARA O FINANCEIRO
  useEffect(() => {
    if (req.status === 'financeiro' && !req.enviado_financeiro_data) {
      const hoje = new Date().toISOString().split('T')[0];
      onUpdate(req.id, { enviado_financeiro_data: hoje });
    }
  }, [req.status, req.enviado_financeiro_data, req.id, onUpdate]);

  const persist = (name: string, value: any) => {
    if (req[name] === value) return;
    onUpdate(req.id, { [name]: value });
  };

  // FUNÇÃO PARA LIMPAR COTAÇÃO ESPECÍFICA
  const removerCotacao = (idx: number) => {
    if (confirm(`Deseja limpar todos os dados do Fornecedor ${idx}?`)) {
        setCotacaoData({
            ...cotacaoData,
            [`fornecedor${idx}`]: '',
            [`servico_material${idx}`]: '',
            [`valor${idx}`]: '',
            [`obs${idx}`]: ''
        });
    }
  };

  const salvarCotacao = async () => {
    const { error } = await supabase.from('req_cotacao').upsert({ id: req.id, ...cotacaoData });
    if (!error) alert("Cotação salva com sucesso!");
    else console.error(error);
  };

  const getUrlAnexo = (caminho: string) => {
    if (!caminho) return null;
    if (caminho.startsWith('http')) return caminho;
    const { data } = supabase.storage.from('requisicoes').getPublicUrl(caminho);
    return data.publicUrl;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    if (e.target.files?.[0]) {
      const fileName = e.target.files[0].name;
      persist(fieldName, fileName);
      if (fieldName === 'foto_nf') persist('status', 'completa');
    }
  };

  const handlePrint = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); 
    const dadosComEmail = { ...localData, impresso_por: userEmail };
    onPrint(dadosComEmail);
    if (req.status === 'pedido') persist('status', 'aguardando');
  };

  const handleTrash = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Mover esta requisição para a lixeira?")) {
      persist('status', 'lixeira');
    }
  };

  const labelStyle = "text-[11px] font-bold text-black uppercase tracking-[0.2em] mb-2 flex items-center gap-2";
  const bentoStyle = "bg-white/90 backdrop-blur-sm border border-slate-300 rounded-[2.5rem] p-10 shadow-sm transition-all duration-300 w-full";
  const inputStyle = "w-full text-base font-light text-slate-900 outline-none border-b border-slate-100 focus:border-blue-500 pb-2 bg-transparent transition-all cursor-pointer";

  return (
    <div className="font-montserrat" draggable onDragStart={(e) => e.dataTransfer.setData("idRequisicao", req.id.toString())}>
      
      {/* CAPA DO CARD NO KANBAN */}
      <div 
        onClick={() => setModalAberto(true)} 
        className={`bg-slate-300 border rounded-[2.5rem] p-6 hover:border-blue-500 hover:shadow-2xl transition-all cursor-grab group mb-5 active:cursor-grabbing border-l-[6px] relative overflow-hidden ${veioDoApp ? 'border-blue-500 border-l-blue-600 shadow-md shadow-blue-900/10' : 'border-slate-400 border-l-slate-500'}`}
      >
        {veioDoApp && (
          <div className="absolute top-0 left-0 bg-blue-600 text-white text-[8px] font-black px-3 py-1 rounded-br-xl flex items-center gap-1 uppercase tracking-tighter z-10 animate-in fade-in">
            <HardHat size={10} /> TÉCNICO (APP)
          </div>
        )}

        <div className="absolute top-6 right-6 flex gap-2">
           <button onClick={(e) => { e.stopPropagation(); setModalCotacaoAberto(true); }} className="p-3 rounded-2xl bg-white/80 text-blue-600 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-sm" title="Cotações"><ClipboardList size={16} /></button>
           <button onClick={handlePrint} className="p-3 rounded-2xl bg-white/80 text-slate-500 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-sm"><Printer size={16} /></button>
        </div>
        
        <button onClick={handleTrash} className="absolute bottom-6 right-6 p-3 rounded-2xl bg-white/50 text-slate-400 hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-sm"><Trash2 size={16} /></button>

        <div className="flex items-start gap-4 mb-5 mt-2">
          <div className={`min-w-[50px] h-[50px] rounded-2xl flex items-center justify-center text-white shadow-lg ${veioDoApp ? 'bg-blue-600 shadow-blue-500/20' : 'bg-slate-900 shadow-slate-400'}`}>
            <span className="text-lg font-light tracking-tighter">{req.id}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[9px] font-medium text-blue-700 uppercase tracking-[0.2em] bg-blue-100/50 px-2 py-0.5 rounded-md self-start">{req.tipo || req.ReqTipo}</span>
            <h4 className="text-[15px] font-normal text-slate-900 leading-tight group-hover:text-blue-700 transition-colors pr-8 line-clamp-2">{req.titulo}</h4>
          </div>
        </div>
        
        <div className="space-y-3 border-t border-slate-400/30 pt-5 text-slate-600">
          <div className="flex items-center justify-between"><span className="text-[10px] font-normal uppercase tracking-widest flex items-center gap-2"><UserCircle size={12} className="text-slate-500"/> Solicitante:</span><span className="text-[11px] font-medium truncate max-w-[180px]">{req.solicitante}</span></div>
          <div className="flex items-center justify-between"><span className="text-[10px] font-normal uppercase tracking-widest flex items-center gap-2"><Building2 size={12} className="text-slate-500"/> Unidade:</span><span className="text-[11px] font-medium truncate max-w-[180px]">{req.setor || '---'}</span></div>
          
          {(req.tipo === 'Ferramenta' || req.ReqTipo === 'Ferramenta') && (
            <div className="flex items-center justify-between animate-in fade-in">
              <span className="text-[10px] font-normal uppercase tracking-widest flex items-center gap-2"><Briefcase size={12} className="text-blue-500"/> Destinação:</span>
              <span className="text-[11px] font-black text-blue-700 uppercase italic">
                {req.quem_ferramenta || req.ferramenta_quem || 'Não definido'}
              </span>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-start items-center gap-3">
          <div className="text-[18px] font-bold text-slate-900 tracking-tighter"><span className="text-[10px] text-slate-500 mr-1 italic font-normal">R$</span>{req.valor_despeza || '0,00'}</div>
          {(req.foto_nf || req.recibo_fornecedor) && <div className="flex gap-1 ml-auto">{req.foto_nf && <Receipt size={14} className="text-blue-600" />}{req.recibo_fornecedor && <Paperclip size={14} className="text-slate-500" />}</div>}
        </div>
      </div>

      {/* MODAL COTAÇÃO */}
      {modalCotacaoAberto && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-xl z-[60] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-300 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[3rem] shadow-2xl border border-white flex flex-col">
            <div className="sticky top-0 bg-slate-300/90 backdrop-blur-md px-10 py-8 border-b border-slate-400/30 flex justify-between items-center z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg"><ClipboardList size={24}/></div>
                <div>
                  <h2 className="text-2xl font-light text-slate-900 uppercase tracking-tight">Mapa de Cotações</h2>
                  <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">ID: {req.id} • Seleção de Fornecedores</p>
                </div>
              </div>
              <button onClick={() => setModalCotacaoAberto(false)} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/50 text-slate-600 hover:bg-slate-900 hover:text-white transition-all transform hover:rotate-90 shadow-md"><X size={20}/></button>
            </div>

            <div className="p-10 space-y-6">
              {[...Array(fornecedoresVisiveis)].map((_, i) => {
                const idx = i + 1;
                return (
                  <div key={idx} className={`${bentoStyle} border-l-[8px] border-l-blue-500 animate-in slide-in-from-right-4 duration-300 relative`}>
                    <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">{idx}</div>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800">Fornecedor {idx}</h3>
                      
                      {/* BOTÃO X PARA REMOVER/LIMPAR COTAÇÃO */}
                      <button 
                        onClick={() => removerCotacao(idx)} 
                        className="ml-auto p-2 rounded-full bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600 transition-all shadow-sm"
                        title="Limpar este fornecedor"
                      >
                        <X size={16}/>
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div>
                        <label className={labelStyle}><Store size={14}/> Nome da Empresa</label>
                        <input value={cotacaoData[`fornecedor${idx}`] || ''} onChange={e => setCotacaoData({...cotacaoData, [`fornecedor${idx}`]: e.target.value.toUpperCase()})} className={inputStyle} />
                      </div>
                      <div>
                        <label className={labelStyle}><Layers size={14}/> Material/Serviço</label>
                        <input value={cotacaoData[`servico_material${idx}`] || ''} onChange={e => setCotacaoData({...cotacaoData, [`servico_material${idx}`]: e.target.value.toUpperCase()})} className={inputStyle} />
                      </div>
                      <div>
                        <label className={labelStyle}><DollarSign size={14}/> Valor Ofertado (R$)</label>
                        <input value={cotacaoData[`valor${idx}`] || ''} onChange={e => setCotacaoData({...cotacaoData, [`valor${idx}`]: e.target.value})} className={inputStyle} placeholder="0,00" />
                      </div>
                    </div>
                    <div className="mt-6">
                      <label className={labelStyle}><FileText size={14}/> Observações do Item</label>
                      <input value={cotacaoData[`obs${idx}`] || ''} onChange={e => setCotacaoData({...cotacaoData, [`obs${idx}`]: e.target.value})} className={inputStyle} placeholder="Condição de pagamento, prazo, etc..." />
                    </div>
                  </div>
                );
              })}

              <div className="flex flex-col md:flex-row gap-4 pt-6">
                {fornecedoresVisiveis < 5 && (
                  <button 
                    onClick={() => setFornecedoresVisiveis(prev => prev + 1)}
                    className="flex-1 bg-white border-2 border-dashed border-blue-400 text-blue-600 py-6 rounded-3xl font-bold uppercase text-[10px] tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-3"
                  >
                    <Plus size={18}/> Adicionar Fornecedor ({fornecedoresVisiveis + 1}/5)
                  </button>
                )}
                <button 
                  onClick={salvarCotacao}
                  className="flex-1 bg-slate-900 text-white py-6 rounded-3xl font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-blue-600 shadow-xl transition-all flex items-center justify-center gap-3"
                >
                  <CheckCheck size={18}/> Salvar Mapa de Preços
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHADO (FICHA TÉCNICA) */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-50 flex items-center justify-center p-4 md:p-6 print:hidden">
          <div className="bg-slate-300 w-full max-w-3xl max-h-[95vh] overflow-y-auto rounded-[4rem] shadow-2xl border border-white flex flex-col animate-in fade-in zoom-in-95 duration-200">
            
            <div className="sticky top-0 bg-slate-300/80 backdrop-blur-md px-12 py-10 border-b border-slate-400/30 flex justify-between items-center z-10">
              <div className="flex items-center gap-8">
                <div className={`w-16 h-16 rounded-3xl text-white flex items-center justify-center font-light text-2xl shadow-xl ${veioDoApp ? 'bg-blue-600 shadow-blue-500/20' : 'bg-slate-900 shadow-slate-400'}`}>{req.id}</div>
                <div><div className="flex items-center gap-3"><h2 className="text-3xl font-light text-slate-900 tracking-tight leading-none uppercase">Ficha Técnica</h2>{veioDoApp && <span className="bg-blue-600 text-white text-[9px] px-3 py-1 rounded-full font-black">ORIGEM: TÉCNICO (APP)</span>}</div><p className="text-[11px] font-normal text-slate-500 uppercase tracking-[0.4em] mt-1">Gestão de Suprimentos • v3.6</p></div>
              </div>
              <button onClick={() => setModalAberto(false)} className="w-14 h-14 flex items-center justify-center rounded-full bg-white/50 text-slate-600 hover:bg-slate-900 hover:text-white transition-all transform hover:rotate-90 shadow-md"><X size={24}/></button>
            </div>

            <div className="p-12 space-y-8">
              <div className="grid grid-cols-1 gap-8">
                
                <div className={bentoStyle}>
                  <label className={labelStyle}><Tag size={14}/> Assunto do Pedido</label>
                  <input value={localData.titulo || ""} onChange={(e) => setLocalData({...localData, titulo: e.target.value})} onBlur={(e) => persist('titulo', e.target.value.toUpperCase())} className={inputStyle} />
                </div>

                <div className={bentoStyle}>
                  <label className={labelStyle}><Calendar size={14}/> Data Original</label>
                  <input type="date" value={localData.data || ""} onChange={(e) => setLocalData({...localData, data: e.target.value})} onBlur={(e) => persist('data', e.target.value)} className={inputStyle} />
                </div>

                {req.status === 'financeiro' && (
                  <div className={`${bentoStyle} border-indigo-200 bg-indigo-50/30`}>
                    <label className={labelStyle}><Calendar size={16} className="text-indigo-600"/> Data de Envio ao Financeiro</label>
                    <input 
                      type="date" 
                      value={localData.enviado_financeiro_data || ""} 
                      onChange={(e) => setLocalData({...localData, enviado_financeiro_data: e.target.value})} 
                      onBlur={(e) => persist('enviado_financeiro_data', e.target.value)} 
                      className={inputStyle} 
                    />
                  </div>
                )}

                <div className={bentoStyle}>
                  <div className="space-y-8">
                    <div>
                      <label className={labelStyle}><Layers size={14}/> Tipo de Requisição</label>
                      <select value={req.tipo || req.ReqTipo || ""} onChange={e => persist('tipo', e.target.value)} className={inputStyle}>
                        <option value="">Definir tipo...</option>
                        {TIPOS_REQ.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelStyle}><UserCircle size={14}/> Colaborador Solicitante</label>
                      <select value={req.solicitante || ""} onChange={e => persist('solicitante', e.target.value)} className={inputStyle}>
                        <option value="">Selecionar Usuário...</option>
                        {USUARIOS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {(req.tipo === 'Ferramenta' || req.ReqTipo === 'Ferramenta') && (
                  <div className={`${bentoStyle} border-blue-200 bg-blue-50/30 animate-in slide-in-from-top-4`}>
                    <label className={labelStyle}><Briefcase size={16} className="text-blue-600"/> Destinação da Ferramenta</label>
                    <select 
                      value={localData.quem_ferramenta || localData.ferramenta_quem || ""} 
                      onChange={e => {
                        setLocalData({
                          ...localData, 
                          quem_ferramenta: e.target.value,
                          ferramenta_quem: e.target.value 
                        });
                        persist('quem_ferramenta', e.target.value);
                      }} 
                      className={inputStyle}
                    >
                      <option value="">Definir finalidade...</option>
                      <option value="Uso Pessoal">Uso Pessoal (Individual)</option>
                      <option value="Uso Geral">Uso Geral (Oficina/Setor)</option>
                    </select>
                  </div>
                )}

                <div className={`${bentoStyle} bg-white border-slate-200`}>
                  <div className="space-y-8">
                    <div>
                      <label className={labelStyle}><MapPin size={14}/> Unidade de Destino</label>
                      <select value={req.setor || ""} onChange={(e) => persist('setor', e.target.value)} className={`${inputStyle} !border-b-slate-300 font-bold uppercase text-xs h-12`}>
                        <option value="">SELECIONAR UNIDADE...</option>
                        {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelStyle}><Info size={14}/> Motivo / Justificativa</label>
                      <textarea 
                        value={localData.Motivo || ''} 
                        onChange={e => setLocalData({...localData, Motivo: e.target.value})} 
                        onBlur={e => persist('Motivo', e.target.value.toUpperCase())} 
                        placeholder="Descreva o motivo..." 
                        className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-medium text-slate-600 outline-none border border-slate-100 min-h-[80px]" 
                      />
                    </div>
                  </div>
                </div>

                {(req.setor === 'Trator-Cliente' || req.setor === 'Trator-Loja') && (
                  <div className={`${bentoStyle} bg-orange-50/30 border-orange-200 animate-in slide-in-from-top-4`}>
                    <div className="space-y-8 uppercase">
                      <div>
                        <label className={labelStyle}><Cpu size={16} className="text-orange-600"/> Chassis / Modelo Máquina</label>
                        <input value={localData.Chassis_Modelo || ''} onChange={e => setLocalData({...localData, Chassis_Modelo: e.target.value})} onBlur={e => persist('Chassis_Modelo', e.target.value.toUpperCase())} className={inputStyle} />
                      </div>
                      
                      {req.setor === 'Trator-Cliente' && (
                        <>
                          <div>
                            <label className={labelStyle}><User size={16} className="text-orange-600"/> Nome do Cliente</label>
                            <input value={localData.cliente || ''} onChange={e => setLocalData({...localData, cliente: e.target.value})} onBlur={e => persist('cliente', e.target.value.toUpperCase())} className={inputStyle} />
                          </div>
                          <div>
                            <label className={labelStyle}><ClipboardList size={16} className="text-orange-600"/> Nº Ordem de Serviço</label>
                            <input value={localData.ordem_servico || ''} onChange={e => setLocalData({...localData, ordem_servico: e.target.value})} onBlur={e => persist('ordem_servico', e.target.value)} className={inputStyle} />
                          </div>
                          <div className="bg-orange-100/50 border border-orange-200 p-8 rounded-[2.5rem] shadow-sm">
                            <label className="text-[10px] font-bold text-orange-600 uppercase tracking-[0.3em] block mb-4">Valor Cobrado Cliente</label>
                            <div className="flex items-baseline gap-2">
                              <span className="text-orange-600 text-xl font-bold uppercase">R$</span>
                              <input value={localData.valor_cobrado_cliente || ''} onChange={e => setLocalData({...localData, valor_cobrado_cliente: e.target.value})} onBlur={e => persist('valor_cobrado_cliente', e.target.value)} className="w-full text-5xl font-black text-orange-700 bg-transparent outline-none tracking-tighter" placeholder="0,00" />
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {(req.tipo === 'Frota-Veículos' || req.ReqTipo === 'Frota-Veículos') && (
                  <div className={`${bentoStyle} bg-blue-50/50 border-blue-200 animate-in slide-in-from-top-4`}>
                    <div className="space-y-8 uppercase">
                      <div><label className={labelStyle}><Car size={14}/> Veículo / Placa</label><input value={localData.veiculo || ''} onChange={e => setLocalData({...localData, veiculo: e.target.value})} onBlur={e => persist('veiculo', e.target.value.toUpperCase())} className={inputStyle} /></div>
                      <div><label className={labelStyle}><Gauge size={14}/> Hodômetro / Horímetro</label><input value={localData.hodometro || ''} onChange={e => setLocalData({...localData, hodometro: e.target.value})} onBlur={e => persist('hodometro', e.target.value)} className={inputStyle} /></div>
                    </div>
                  </div>
                )}

                <div className={bentoStyle}>
                  <div className="space-y-8">
                    <div>
                      <label className={labelStyle}><Store size={14}/> Fornecedor Vinculado</label>
                      <select value={req.fornecedor || ''} onChange={e => persist('fornecedor', e.target.value)} className={inputStyle}>
                        <option value="">Selecionar da lista...</option>
                        {FORNECEDORES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelStyle}><Receipt size={14}/> Nota Fiscal</label>
                      <input value={localData.numero_nota || ''} onChange={(e) => setLocalData({...localData, numero_nota: e.target.value})} onBlur={(e) => persist('numero_nota', e.target.value)} className={inputStyle} placeholder="Nº Documento" />
                    </div>
                    <div className="bg-red-50 border border-red-100 p-8 rounded-[2.5rem] shadow-sm">
                      <label className="text-[10px] font-bold text-red-500 uppercase tracking-[0.3em] block mb-4">Custo Real Despesa</label>
                      <div className="flex items-baseline gap-2">
                        <span className="text-red-500 text-xl font-bold uppercase">R$</span>
                        <input value={localData.valor_despeza || ''} onChange={e => setLocalData({...localData, valor_despeza: e.target.value})} onBlur={e => persist('valor_despeza', e.target.value)} className="w-full text-5xl font-black text-red-600 bg-transparent outline-none tracking-tighter" placeholder="0,00" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className={bentoStyle}>
                  <label className={labelStyle}><FileText size={14}/> Descrição Detalhada</label>
                  <textarea value={localData.obs || ""} onChange={e => setLocalData({...localData, obs: e.target.value})} onBlur={e => persist('obs', e.target.value)} className="w-full text-base font-light outline-none h-40 resize-none italic text-slate-500 bg-transparent pt-2 border-b border-slate-100 mb-8" />

                  <label className={labelStyle}><Paperclip size={14}/> Documentação anexada</label>
                  <div className="space-y-4 mt-6">
                    {[
                      { label: 'Nota Fiscal', field: 'foto_nf', icon: <Camera size={16}/> },
                      { label: 'Boleto', field: 'boleto_fornecedor', icon: <Receipt size={16}/> },
                      { label: 'Recibo / Outros', field: 'recibo_fornecedor', icon: <Paperclip size={16}/> }
                    ].map((item) => {
                      const fileUrl = getUrlAnexo(req[item.field]);
                      return (
                        <div key={item.field} className="flex items-center gap-2">
                          <label className="flex-1 flex items-center justify-between p-6 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200 cursor-pointer transition-all group shadow-sm">
                            <div className="flex items-center gap-4">
                              <div className="text-slate-400 group-hover:text-blue-500">{item.icon}</div>
                              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tighter">{item.label}</span>
                            </div>
                            <input type="file" className="hidden" onChange={e => handleFileUpload(e, item.field)} />
                            {req[item.field] ? <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div> : <ArrowRight size={14} className="text-slate-200"/>}
                          </label>
                          {req[item.field] && (<a href={fileUrl || '#'} target="_blank" rel="noopener noreferrer" className="w-14 h-16 flex items-center justify-center rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/20" title="Visualizar Arquivo"><Eye size={18} /></a>)}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-8 pt-12 border-t border-slate-400/20">
                <div className="text-center">
                  <label className={labelStyle}><ShieldCheck size={18} className="text-blue-500 mx-auto"/> Impresso Por:</label>
                  <div className="bg-slate-100 px-8 py-3 rounded-full text-sm font-bold text-slate-500 border border-slate-200">
                    {userEmail || 'Buscando usuário...'}
                  </div>
                </div>
                <div className="flex flex-col md:flex-row gap-4 w-full max-2-2xl">
                    <button 
                    onClick={() => setModalCotacaoAberto(true)} 
                    className="flex-1 bg-blue-600 text-white px-8 py-6 rounded-full font-bold uppercase text-[12px] tracking-[0.2em] hover:bg-blue-700 hover:shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-4 shadow-xl"
                    >
                    <ClipboardList size={20} /> Mapa de Cotação
                    </button>
                    <button 
                    onClick={handlePrint} 
                    className="flex-1 bg-slate-900 text-white px-8 py-6 rounded-full font-bold uppercase text-[12px] tracking-[0.2em] hover:bg-blue-600 hover:shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-4 shadow-xl"
                    >
                    <Printer size={20} /> Gerar PDF Requisição
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <TemplatePDF req={localData} />
    </div>
  );
}