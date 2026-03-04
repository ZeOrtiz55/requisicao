'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase'; 
import TemplatePDF from './TemplatePDF';
import { 
  FileText, Calendar, Layers, UserCircle, Briefcase, 
  Truck, HardHat, DollarSign, Tag, ClipboardList, 
  FileCheck, Paperclip, X, Printer, Camera, Info, 
  ShieldCheck, ChevronRight, Store, ArrowRight, Gauge,
  Receipt, Download, User, Trash2, Layout, Building2, MapPin,
  Cpu, Hash, Smartphone, Eye, ExternalLink, Car,
  Plus, CheckCheck, BadgeCheck 
} from 'lucide-react';

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwxaRTVU7_S7JsvSi3v9uY1o4Bx5nTdO0VOfEejARuaOOFrtwlg1Cmb9AFDL0QCphzk/exec';

const DEPARTAMENTOS = ["Trator-Loja", "Trator-Cliente", "Oficina", "Comercial"];
const TIPOS_REQ = ["Peça", "Alimentação", "Ferramenta", "Serviço de Terceiros", "Almoxarifado", "Frota-Veículos", "Insumo Infra"];
const USUARIOS = ["Danilo de Souza", "Fernando Leonel", "Gabriel Moraes", "Henri Hione", "Jose Ortiz", "Luiz Fernando (Motorista)", "Nicolas Dario", "Paulo Motta", "Jose Antonio de Oliveira", "Pós Vendas- Escritório"];

export default function CardReq({ req, onUpdate, onPrint }: { req: any, onUpdate: any, onPrint: any }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [modalCotacaoAberto, setModalCotacaoAberto] = useState(false);
  const [localData, setLocalData] = useState(req);
  const [cotacaoData, setCotacaoData] = useState<any>({});
  const [fornecedoresVisiveis, setFornecedoresVisiveis] = useState(1);
  const [userEmail, setUserEmail] = useState('Buscando...');
  
  const [fornecedoresBanco, setFornecedoresBanco] = useState<any[]>([]);

  const [nomeExibicao, setNomeExibicao] = useState(req.solicitante);
  const [veiculoExibicao, setVeiculoExibicao] = useState(req.veiculo);

  const veioDoApp = req.obs?.includes('[APPSHEET_ID:');

  // 1. BUSCA FORNECEDORES NA TABELA DO SUPABASE PARA O DROPDOWN
  useEffect(() => {
    const fetchFornecedores = async () => {
      const { data } = await supabase.from('Fornecedores').select('nome').order('nome');
      if (data) setFornecedoresBanco(data);
    };
    fetchFornecedores();
  }, []);

  // 2. LÓGICA PARA CONVERTER EMAIL EM NOME BUSCANDO NA TABELA DE USUÁRIOS
  useEffect(() => {
    const traduzirEmailParaNome = async () => {
      if (req.solicitante && req.solicitante.includes('@')) {
        const { data } = await supabase
          .from('req_usuarios')
          .select('nome')
          .eq('email', req.solicitante.trim())
          .maybeSingle();

        if (data?.nome) {
          setNomeExibicao(data.nome);
        }
      } else {
        setNomeExibicao(req.solicitante);
      }
    };
    traduzirEmailParaNome();
  }, [req.solicitante]);

  // 3. LÓGICA PARA CONVERTER CÓDIGO DO VEÍCULO EM PLACA (TABELA SupaPlacas)
  useEffect(() => {
    const traduzirCodigoVeiculo = async () => {
      if (req.veiculo && !isNaN(req.veiculo) && String(req.veiculo).length < 5) {
        const { data } = await supabase
          .from('SupaPlacas')
          .select('NumPlaca')
          .eq('IdPlaca', req.veiculo)
          .maybeSingle();

        if (data?.NumPlaca) {
          setVeiculoExibicao(data.NumPlaca);
        }
      } else {
        setVeiculoExibicao(req.veiculo);
      }
    };
    traduzirCodigoVeiculo();
  }, [req.veiculo]);

  // 4. CAPTURA AUTOMÁTICA DO EMAIL DO USUÁRIO LOGADO
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

  // 5. Sincroniza localData quando req ou traduções mudam
  useEffect(() => {
    setLocalData({
      ...req,
      solicitante: nomeExibicao || req.solicitante,
      veiculo: veiculoExibicao || req.veiculo,
      quem_ferramenta: req.quem_ferramenta || req.ferramenta_quem || ""
    });
  }, [req, nomeExibicao, veiculoExibicao]);

  // 6. Canal realtime para cotação
  useEffect(() => {
    const buscarEAssinarCotacao = async () => {
      const { data } = await supabase.from('req_cotacao').select('*').eq('id', req.id).single();
      if (data) {
        setCotacaoData(data);
        let count = 1;
        for (let i = 2; i <= 5; i++) {
          if (data[`fornecedor${i}`]) count = i;
        }
        setFornecedoresVisiveis(count);
      }
    };
    buscarEAssinarCotacao();

    const channel = supabase
      .channel(`cotacao_${req.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'req_cotacao', filter: `id=eq.${req.id}` },
      (payload) => {
        if (payload.new) setCotacaoData(payload.new);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [req.id]);

  // 7. DATA AUTOMÁTICA PARA O FINANCEIRO
  useEffect(() => {
    if (req.status === 'financeiro' && !req.enviado_financeiro_data) {
      const hoje = new Date().toISOString().split('T')[0];
      setLocalData((prev: any) => ({ ...prev, enviado_financeiro_data: hoje }));
      onUpdate(req.id, { enviado_financeiro_data: hoje });
    }
  }, [req.status, req.enviado_financeiro_data, req.id, onUpdate]);

  const persist = (name: string, value: any) => {
    if (req[name] === value) return;
    setLocalData((prev: any) => ({ ...prev, [name]: value }));
    onUpdate(req.id, { [name]: value });
  };

  const removerCotacao = (idx: number) => {
    if (confirm(`Remover o Fornecedor ${idx} e reorganizar a lista?`)) {
        let newData = { ...cotacaoData };
        for (let j = idx; j < 5; j++) {
            newData[`fornecedor${j}`] = newData[`fornecedor${j + 1}`] || '';
            newData[`servico_material${j}`] = newData[`servico_material${j + 1}`] || '';
            newData[`valor${j}`] = newData[`valor${j + 1}`] || '';
            newData[`obs${j}`] = newData[`obs${j + 1}`] || '';
        }
        newData[`fornecedor5`] = '';
        newData[`servico_material5`] = '';
        newData[`valor5`] = '';
        newData[`obs5`] = '';

        setCotacaoData(newData);
        setFornecedoresVisiveis(prev => Math.max(1, prev - 1));
        supabase.from('req_cotacao').upsert({ id: req.id, ...newData });
    }
  };

  const salvarCotacao = async () => {
    const { error } = await supabase.from('req_cotacao').upsert({ id: req.id, ...cotacaoData });
    if (!error) alert("Mapa de Cotação atualizado!");
  };

  const getUrlAnexo = (caminho: string) => {
    if (!caminho) return null;
    if (caminho.startsWith('http')) return caminho;
    if (caminho.startsWith('SupaAtualizarReq_Images/')) return null;

    const { data } = supabase.storage.from('requisicoes').getPublicUrl(caminho);
    return data.publicUrl;
  };

  const abrirArquivoDrive = async (caminho: string) => {
    const nomeArquivo = caminho.replace('SupaAtualizarReq_Images/', '');
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?name=${encodeURIComponent(nomeArquivo)}`);
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        alert('Arquivo não encontrado no Google Drive');
      }
    } catch {
      alert('Erro ao buscar arquivo no Google Drive');
    }
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
    const dadosParaImpressao = { 
        ...localData, 
        solicitante: nomeExibicao, 
        veiculo: veiculoExibicao, 
        impresso_por: userEmail 
    };
    onPrint(dadosParaImpressao);
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
    <div className="font-montserrat" draggable={!modalAberto && !modalCotacaoAberto} onDragStart={(e) => e.dataTransfer.setData("idRequisicao", req.id.toString())}>
      
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

        {/* AVISO DE COTAÇÃO INCLUÍDA */}
        {cotacaoData && cotacaoData.fornecedor1 && (
          <div className="absolute top-0 left-[110px] bg-green-600 text-white text-[8px] font-black px-3 py-1 rounded-b-xl flex items-center gap-1 uppercase tracking-tighter z-10 animate-pulse">
            <BadgeCheck size={10} /> Cotação OK
          </div>
        )}

        <div className="absolute top-6 right-6 flex gap-2">
           <button onClick={(e) => { e.stopPropagation(); setModalCotacaoAberto(true); }} className="p-3 rounded-2xl bg-white/80 text-blue-600 hover:bg-blue-600 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-sm" title="Mapa de Cotações"><ClipboardList size={16} /></button>
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
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-normal uppercase tracking-widest flex items-center gap-2">
              <UserCircle size={12} className="text-slate-500"/> Solicitante:
            </span>
            <span className="text-[11px] font-medium truncate max-w-[180px]">{nomeExibicao}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-normal uppercase tracking-widest flex items-center gap-2">
              <Car size={12} className="text-slate-500"/> Veículo:
            </span>
            <span className="text-[11px] font-medium truncate max-w-[180px]">{veiculoExibicao || '---'}</span>
          </div>
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
                      <button onClick={() => removerCotacao(idx)} className="ml-auto p-2 rounded-full bg-slate-100 text-slate-400 hover:bg-red-100 hover:text-red-600 transition-all shadow-sm" title="Remover Fornecedor"><X size={16}/></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div><label className={labelStyle}><Store size={14}/> Empresa</label><input value={cotacaoData[`fornecedor${idx}`] || ''} onChange={e => setCotacaoData({...cotacaoData, [`fornecedor${idx}`]: e.target.value.toUpperCase()})} className={inputStyle} /></div>
                      <div><label className={labelStyle}><Layers size={14}/> Material</label><input value={cotacaoData[`servico_material${idx}`] || ''} onChange={e => setCotacaoData({...cotacaoData, [`servico_material${idx}`]: e.target.value.toUpperCase()})} className={inputStyle} /></div>
                      <div><label className={labelStyle}><DollarSign size={14}/> Valor (R$)</label><input value={cotacaoData[`valor${idx}`] || ''} onChange={e => setCotacaoData({...cotacaoData, [`valor${idx}`]: e.target.value})} className={inputStyle} placeholder="0,00" /></div>
                    </div>
                  </div>
                );
              })}
              <div className="flex flex-col md:flex-row gap-4 pt-6">
                {fornecedoresVisiveis < 5 && (
                  <button onClick={() => setFornecedoresVisiveis(prev => prev + 1)} className="flex-1 bg-white border-2 border-dashed border-blue-400 text-blue-600 py-6 rounded-3xl font-bold uppercase text-[10px] tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-3"><Plus size={18}/> Adicionar Fornecedor</button>
                )}
                <button onClick={salvarCotacao} className="flex-1 bg-slate-900 text-white py-6 rounded-3xl font-bold uppercase text-[10px] tracking-[0.3em] hover:bg-blue-600 shadow-xl transition-all flex items-center justify-center gap-3"><CheckCheck size={18}/> Salvar Mapa</button>
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

                {(req.tipo === 'Frota-Veículos' || req.ReqTipo === 'Frota-Veículos') && (
                  <div className={`${bentoStyle} bg-blue-50/50 border-blue-200 animate-in slide-in-from-top-4`}>
                    <div className="space-y-8 uppercase">
                      <div>
                        <label className={labelStyle}><Car size={14}/> Veículo / Placa</label>
                        <input value={veiculoExibicao || ''} onChange={e => setVeiculoExibicao(e.target.value)} onBlur={e => persist('veiculo', e.target.value.toUpperCase())} className={inputStyle} />
                      </div>
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
                        {fornecedoresBanco.map(f => <option key={f.nome} value={f.nome}>{f.nome}</option>)}
                      </select>
                    </div>
                    <div><label className={labelStyle}><Receipt size={14}/> Nota Fiscal</label><input value={localData.numero_nota || ''} onChange={(e) => setLocalData({...localData, numero_nota: e.target.value})} onBlur={(e) => persist('numero_nota', e.target.value)} className={inputStyle} placeholder="Nº Documento" /></div>
                    <div className="bg-red-50 border border-red-100 p-8 rounded-[2.5rem] shadow-sm"><label className="text-[10px] font-bold text-red-500 uppercase tracking-[0.3em] block mb-4">Custo Real Despesa</label><div className="flex items-baseline gap-2"><span className="text-red-500 text-xl font-bold uppercase">R$</span><input value={localData.valor_despeza || ''} onChange={e => setLocalData({...localData, valor_despeza: e.target.value})} onBlur={e => persist('valor_despeza', e.target.value)} className="w-full text-5xl font-black text-red-600 bg-transparent outline-none tracking-tighter" placeholder="0,00" /></div></div>
                  </div>
                </div>

                <div className={bentoStyle}>
                  <label className={labelStyle}><FileText size={14}/> Descrição Detalhada</label>
                  <textarea value={localData.obs || ""} onChange={e => setLocalData({...localData, obs: e.target.value})} onBlur={e => persist('obs', e.target.value)} className="w-full text-base font-light outline-none h-40 resize-none italic text-slate-500 bg-transparent pt-2 border-b border-slate-100 mb-8" />
                  
                  {/* Bloco de Documentação Anexada */}
                  <label className={labelStyle}><Paperclip size={14}/> Documentação anexada</label>
                  <div className="space-y-4 mt-6">
                    {[{ label: 'Nota Fiscal', field: 'foto_nf', icon: <Camera size={16}/> }, { label: 'Boleto', field: 'boleto_fornecedor', icon: <Receipt size={16}/> }, { label: 'Recibo / Outros', field: 'recibo_fornecedor', icon: <Paperclip size={16}/> }].map((item) => {
                      const fileUrl = getUrlAnexo(req[item.field]);
                      const isDriveFile = req[item.field]?.startsWith('SupaAtualizarReq_Images/');
                      return (
                        <div key={item.field} className="flex items-center gap-2">
                          <label className="flex-1 flex items-center justify-between p-6 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200 cursor-pointer transition-all group shadow-sm">
                            <div className="flex items-center gap-4"><div className="text-slate-400 group-hover:text-blue-500">{item.icon}</div><span className="text-[11px] font-bold text-slate-600 uppercase tracking-tighter">{item.label}</span></div>
                            <input type="file" className="hidden" onChange={e => handleFileUpload(e, item.field)} />
                            {req[item.field] ? <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div> : <ArrowRight size={14} className="text-slate-200"/>}
                          </label>
                          {req[item.field] && (
                            isDriveFile ? (
                              <button
                                onClick={() => abrirArquivoDrive(req[item.field])}
                                className="w-14 h-16 flex items-center justify-center rounded-2xl text-white transition-all shadow-lg bg-green-600 hover:bg-green-700 shadow-green-900/20 cursor-pointer"
                                title="Abrir no Google Drive"
                              >
                                <ExternalLink size={18} />
                              </button>
                            ) : (
                              <a
                                href={fileUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-14 h-16 flex items-center justify-center rounded-2xl text-white transition-all shadow-lg bg-blue-600 hover:bg-blue-700 shadow-blue-900/20"
                                title="Visualizar Arquivo"
                              >
                                <Eye size={18} />
                              </a>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center gap-8 pt-12 border-t border-slate-400/20">
                <div className="flex flex-col md:flex-row gap-4 w-full max-w-2xl">
                    <button onClick={() => setModalCotacaoAberto(true)} className="flex-1 bg-blue-600 text-white px-8 py-6 rounded-full font-bold uppercase text-[12px] tracking-[0.2em] hover:bg-blue-700 hover:shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-4 shadow-xl"><ClipboardList size={20} /> Mapa de Cotação</button>
                    <button onClick={handlePrint} className="flex-1 bg-slate-900 text-white px-8 py-6 rounded-full font-bold uppercase text-[12px] tracking-[0.2em] hover:bg-blue-600 hover:shadow-2xl transition-all transform active:scale-95 flex items-center justify-center gap-4 shadow-xl"><Printer size={20} /> Gerar PDF Requisição</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      <TemplatePDF req={localData} onUpdate={onUpdate} onPrint={onPrint} />
    </div>
  );
}