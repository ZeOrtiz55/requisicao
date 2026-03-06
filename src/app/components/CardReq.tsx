'use client';
import React, { useState, useEffect, useMemo } from 'react';
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

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxyIatVqhjdeBeo4PYNWr992vCsPpvEEjOxabWB7mz5JRJ7BroxnvR8CRIcXIgTfLSm/exec';

const DEPARTAMENTOS = ["Trator-Loja", "Trator-Cliente", "Oficina", "Comercial"];
const TIPOS_REQ = ["Peça", "Alimentação", "Ferramenta", "Serviço de Terceiros", "Almoxarifado", "Frota-Veículos", "Insumo Infra"];

export default function CardReq({ req, onUpdate, onPrint, dadosCompartilhados, aberto = false, onFechar }: { req: any, onUpdate: any, onPrint: any, dadosCompartilhados?: any, aberto?: boolean, onFechar?: () => void }) {
  const [modalAberto, setModalAberto] = useState(aberto);
  const [modalCotacaoAberto, setModalCotacaoAberto] = useState(false);
  const [localData, setLocalData] = useState(req);
  const [cotacaoData, setCotacaoData] = useState<any>({});
  const [cotacaoCarregada, setCotacaoCarregada] = useState(false);
  const [fornecedoresVisiveis, setFornecedoresVisiveis] = useState(1);
  const [userEmail, setUserEmail] = useState('');

  // Usa dados compartilhados do Kanban (sem buscar do banco para cada card)
  const fornecedoresBanco = dadosCompartilhados?.fornecedores || [];
  const usuariosBanco = dadosCompartilhados?.usuarios || [];
  const veiculosBanco = dadosCompartilhados?.veiculos || [];

  // Traduz email->nome e código->placa usando dados locais (sem chamada ao banco)
  const nomeExibicao = useMemo(() => {
    if (req.solicitante && req.solicitante.includes('@')) {
      const usuario = usuariosBanco.find((u: any) => u.email === req.solicitante.trim());
      return usuario?.nome || req.solicitante;
    }
    return req.solicitante;
  }, [req.solicitante, usuariosBanco]);

  const veiculoExibicao = useMemo(() => {
    if (req.veiculo && !isNaN(req.veiculo) && String(req.veiculo).length < 5) {
      const vei = veiculosBanco.find((v: any) => String(v.IdPlaca) === String(req.veiculo));
      return vei?.NumPlaca || req.veiculo;
    }
    return req.veiculo;
  }, [req.veiculo, veiculosBanco]);

  const veioDoApp = req.obs?.includes('[APPSHEET_ID:');

  // Busca email do usuário logado só quando abre o modal
  useEffect(() => {
    if (!modalAberto || userEmail) return;
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: { user }, error } = await supabase.auth.getUser();
          if (!error && user?.email) setUserEmail(user.email);
        }
      } catch (err) { /* silencioso */ }
    };
    getUser();
  }, [modalAberto, userEmail]);

  // Sincroniza localData quando req ou traduções mudam
  useEffect(() => {
    setLocalData({
      ...req,
      solicitante: nomeExibicao || req.solicitante,
      veiculo: veiculoExibicao || req.veiculo,
      quem_ferramenta: req.quem_ferramenta || req.ferramenta_quem || ""
    });
  }, [req, nomeExibicao, veiculoExibicao]);

  // Busca cotação SOMENTE quando abre o modal de cotação ou o modal principal
  useEffect(() => {
    if ((!modalAberto && !modalCotacaoAberto) || cotacaoCarregada) return;
    const buscarCotacao = async () => {
      const { data } = await supabase.from('req_cotacao').select('*').eq('id', req.id).single();
      if (data) {
        setCotacaoData(data);
        let count = 1;
        for (let i = 2; i <= 5; i++) {
          if (data[`fornecedor${i}`]) count = i;
        }
        setFornecedoresVisiveis(count);
      }
      setCotacaoCarregada(true);
    };
    buscarCotacao();
  }, [modalAberto, modalCotacaoAberto, cotacaoCarregada, req.id]);

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

  const abrirArquivoDrive = (caminho: string) => {
    const nomeArquivo = caminho.replace('SupaAtualizarReq_Images/', '');
    const novaAba = window.open('about:blank', '_blank');
    const callbackName = `_driveCb${Date.now()}`;

    (window as any)[callbackName] = (data: any) => {
      if (data.url && novaAba) {
        novaAba.location.href = data.url;
      } else {
        novaAba?.close();
        alert('Arquivo não encontrado no Google Drive');
      }
      delete (window as any)[callbackName];
      script.remove();
    };

    const script = document.createElement('script');
    script.src = `${APPS_SCRIPT_URL}?name=${encodeURIComponent(nomeArquivo)}&callback=${callbackName}`;
    script.onerror = () => {
      novaAba?.close();
      alert('Erro ao buscar arquivo no Google Drive');
      delete (window as any)[callbackName];
      script.remove();
    };
    document.body.appendChild(script);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Gera um nome único para evitar sobrescrever arquivos com o mesmo nome
      const fileExt = file.name.split('.').pop();
      const fileName = `${req.id}-${fieldName}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload real para o Bucket 'requisicoes'
      const { error: uploadError } = await supabase.storage
        .from('requisicoes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Persiste o caminho no banco de dados
      persist(fieldName, filePath);
      
      if (fieldName === 'foto_nf') persist('status', 'completa');
      
      alert('Arquivo enviado com sucesso!');
    } catch (error: any) {
      alert('Erro ao realizar upload: ' + error.message);
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

  const labelStyle = "text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2";
  const bentoStyle = "bg-white/[0.03] border border-white/8 rounded-xl p-8 transition-all duration-200 w-full";
  const inputStyle = "w-full text-base font-light text-white outline-none border-b border-white/10 focus:border-blue-500 pb-2 bg-transparent transition-all cursor-pointer placeholder:text-slate-600";
  const selectStyle = `${inputStyle} [&>option]:text-black [&>option]:bg-white`;

  const fecharModal = () => {
    setModalAberto(false);
    if (onFechar) onFechar();
  };

  return (
    <div className="font-montserrat">

      {/* MODAL COTAÇÃO */}
      {modalCotacaoAberto && (
        <div className="fixed inset-0 bg-blue-900/40 backdrop-blur-xl z-[60] flex items-center justify-center p-4 md:p-6">
          <div className="bg-slate-950 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-white/10 flex flex-col">
            <div className="sticky top-0 bg-slate-800/95 backdrop-blur-md px-10 py-8 border-b border-white/5 flex justify-between items-center z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center"><ClipboardList size={24}/></div>
                <div>
                  <h2 className="text-2xl font-light text-white uppercase tracking-tight">Mapa de Cotações</h2>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">ID: {req.id} • Seleção de Fornecedores</p>
                </div>
              </div>
              <button onClick={() => setModalCotacaoAberto(false)} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-red-500 hover:text-white transition-all transform hover:rotate-90"><X size={20}/></button>
            </div>

            <div className="p-10 space-y-6">
              {[...Array(fornecedoresVisiveis)].map((_, i) => {
                const idx = i + 1;
                return (
                  <div key={idx} className={`${bentoStyle} border-l-[8px] border-l-blue-500 relative`}>
                    <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">{idx}</div>
                      <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Fornecedor {idx}</h3>
                      <button onClick={() => removerCotacao(idx)} className="ml-auto p-2 rounded-full bg-white/10 text-slate-400 hover:bg-red-500/20 hover:text-red-400 transition-all" title="Remover Fornecedor"><X size={16}/></button>
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
                  <button onClick={() => setFornecedoresVisiveis(prev => prev + 1)} className="flex-1 bg-white/5 border-2 border-dashed border-blue-400/30 text-blue-400 py-6 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-blue-500/10 transition-all flex items-center justify-center gap-3"><Plus size={18}/> Adicionar Fornecedor</button>
                )}
                <button onClick={salvarCotacao} className="flex-1 bg-blue-600 text-white py-6 rounded-xl font-bold uppercase text-xs tracking-[0.3em] hover:bg-blue-500 shadow-xl transition-all flex items-center justify-center gap-3"><CheckCheck size={18}/> Salvar Mapa</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHADO (FICHA TÉCNICA) */}
      {modalAberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xl z-50 flex items-center justify-center p-4 md:p-6 print:hidden">
          <div className="bg-slate-800 w-full max-w-3xl max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl border border-white/10 flex flex-col">

            <div className="sticky top-0 bg-slate-800/95 backdrop-blur-md px-10 py-8 border-b border-white/5 flex justify-between items-center z-10">
              <div className="flex items-center gap-8">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center font-light text-2xl ${veioDoApp ? 'bg-blue-500/15 text-blue-400' : 'bg-white/5 text-slate-400'}`}>{req.id}</div>
                <div><div className="flex items-center gap-3"><h2 className="text-2xl font-light text-white tracking-tight leading-none uppercase">Ficha Técnica</h2>{veioDoApp && <span className="bg-blue-600 text-white text-xs px-3 py-1 rounded-lg font-black">TÉCNICO (APP)</span>}</div><p className="text-xs font-normal text-slate-500 uppercase tracking-[0.3em] mt-1">Gestão de Suprimentos</p></div>
              </div>
              <button onClick={fecharModal} className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-red-500 hover:text-white transition-all transform hover:rotate-90"><X size={22}/></button>
            </div>

            <div className="p-8 space-y-4">
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
                      <select value={req.tipo || req.ReqTipo || ""} onChange={e => persist('tipo', e.target.value)} className={selectStyle}>
                        <option value="">Definir tipo...</option>
                        {TIPOS_REQ.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelStyle}><UserCircle size={14}/> Colaborador Solicitante</label>
                      <select value={req.solicitante || ""} onChange={e => persist('solicitante', e.target.value)} className={selectStyle}>
                        <option value="">Selecionar Usuário...</option>
                        {usuariosBanco.map((u: any) => <option key={u.nome} value={u.nome}>{u.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={labelStyle}><Building2 size={14}/> Setor Destino</label>
                      <select value={req.setor || req.ReqQuem || ""} onChange={e => persist('setor', e.target.value)} className={selectStyle}>
                        <option value="">Selecionar Setor...</option>
                        {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* REGRAS CONDICIONAIS DE SETOR: TRATOR-CLIENTE / TRATOR-LOJA */}
                {localData.setor === "Trator-Cliente" && (
                  <div className={`${bentoStyle} !bg-amber-500/10 !border-amber-500/20`}>
                    <div className="space-y-8 uppercase">
                      <h4 className="text-xs font-black text-amber-400 tracking-[0.3em] mb-4">Informações do Cliente</h4>
                      <div>
                        <label className={labelStyle}><User size={14}/> Nome do Cliente</label>
                        <input value={localData.cliente || ''} onChange={e => setLocalData({...localData, cliente: e.target.value})} onBlur={e => persist('cliente', e.target.value.toUpperCase())} className={inputStyle} />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <label className={labelStyle}><ClipboardList size={14}/> Ordem de Serviço</label>
                          <input value={localData.ordem_servico || ''} onChange={e => setLocalData({...localData, ordem_servico: e.target.value})} onBlur={e => persist('ordem_servico', e.target.value.toUpperCase())} className={inputStyle} />
                        </div>
                        <div>
                          <label className={labelStyle}><Cpu size={14}/> Modelo / Chassis</label>
                          <input value={localData.Chassis_Modelo || ''} onChange={e => setLocalData({...localData, Chassis_Modelo: e.target.value})} onBlur={e => persist('Chassis_Modelo', e.target.value.toUpperCase())} className={inputStyle} />
                        </div>
                      </div>
                      <div className="bg-amber-500/10 p-6 rounded-xl border border-amber-500/20">
                        <label className="text-xs font-bold text-amber-400 uppercase tracking-[0.3em] block mb-3">Valor Cobrado do Cliente</label>
                        <div className="flex items-baseline gap-2">
                          <span className="text-amber-400 text-xl font-bold">R$</span>
                          <input value={localData.valor_cobrado_cliente || ''} onChange={e => setLocalData({...localData, valor_cobrado_cliente: e.target.value})} onBlur={e => persist('valor_cobrado_cliente', e.target.value)} className="w-full text-4xl font-black text-amber-300 bg-transparent outline-none tracking-tighter placeholder:text-amber-900" placeholder="0,00" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {localData.setor === "Trator-Loja" && (
                  <div className={`${bentoStyle} !bg-slate-800/50 !border-white/10`}>
                    <div className="space-y-8 uppercase">
                      <h4 className="text-xs font-black text-slate-400 tracking-[0.3em] mb-4">Informações do Trator (Loja)</h4>
                      <div>
                        <label className={labelStyle}><Cpu size={14}/> Modelo / Chassis do Trator</label>
                        <input value={localData.Chassis_Modelo || ''} onChange={e => setLocalData({...localData, Chassis_Modelo: e.target.value})} onBlur={e => persist('Chassis_Modelo', e.target.value.toUpperCase())} className={inputStyle} />
                      </div>
                    </div>
                  </div>
                )}

                {(localData.tipo === 'Ferramenta' || req.tipo === 'Ferramenta' || req.ReqTipo === 'Ferramenta') && (
                  <div className={`${bentoStyle} !bg-blue-500/10 !border-blue-500/20`}>
                    <div className="space-y-8 uppercase">
                      <h4 className="text-xs font-black text-blue-400 tracking-[0.3em] mb-4">Destinação da Ferramenta</h4>
                      <div>
                        <label className={labelStyle}><Tag size={14}/> Uso Pessoal ou Geral</label>
                        <select value={localData.quem_ferramenta || ''} onChange={e => { setLocalData({...localData, quem_ferramenta: e.target.value}); persist('quem_ferramenta', e.target.value); }} className={selectStyle}>
                          <option value="">Selecione o uso...</option>
                          <option value="Uso Pessoal">Uso Pessoal (Individual)</option>
                          <option value="Geral">Uso Geral (Oficina/Setor)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {(req.tipo === 'Frota-Veículos' || req.ReqTipo === 'Frota-Veículos') && (
                  <div className={`${bentoStyle} !bg-blue-500/10 !border-blue-500/20`}>
                    <div className="space-y-8 uppercase">
                      <div>
                        <label className={labelStyle}><Car size={14}/> Veículo / Placa</label>
                        <select
                          value={localData.veiculo || ''}
                          onChange={e => persist('veiculo', e.target.value)}
                          className={selectStyle}
                        >
                          <option value="">Selecione o veículo...</option>
                          {veiculosBanco.map((v: any) => (
                            <option key={v.IdPlaca} value={v.IdPlaca}>{v.NumPlaca}</option>
                          ))}
                        </select>
                      </div>
                      <div><label className={labelStyle}><Gauge size={14}/> Hodômetro / Horímetro</label><input value={localData.hodometro || ''} onChange={e => setLocalData({...localData, hodometro: e.target.value})} onBlur={e => persist('hodometro', e.target.value)} className={inputStyle} /></div>
                    </div>
                  </div>
                )}

                <div className={bentoStyle}>
                  <div className="space-y-8">
                    <div>
                      <label className={labelStyle}><Store size={14}/> Fornecedor Vinculado</label>
                      <select value={req.fornecedor || ''} onChange={e => persist('fornecedor', e.target.value)} className={selectStyle}>
                        <option value="">Selecionar da lista...</option>
                        {fornecedoresBanco.map((f: any) => <option key={f.nome} value={f.nome}>{f.nome}</option>)}
                      </select>
                    </div>
                    <div><label className={labelStyle}><Receipt size={14}/> Nota Fiscal</label><input value={localData.numero_nota || ''} onChange={(e) => setLocalData({...localData, numero_nota: e.target.value})} onBlur={(e) => persist('numero_nota', e.target.value)} className={inputStyle} placeholder="Nº Documento" /></div>
                    <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl"><label className="text-xs font-bold text-red-400 uppercase tracking-[0.3em] block mb-3">Custo Real Despesa</label><div className="flex items-baseline gap-2"><span className="text-red-400 text-xl font-bold uppercase">R$</span><input value={localData.valor_despeza || ''} onChange={e => setLocalData({...localData, valor_despeza: e.target.value})} onBlur={e => persist('valor_despeza', e.target.value)} className="w-full text-5xl font-black text-red-300 bg-transparent outline-none tracking-tighter placeholder:text-red-900" placeholder="0,00" /></div></div>
                  </div>
                </div>

                <div className={bentoStyle}>
                  <label className={labelStyle}><FileText size={14}/> Descrição Detalhada</label>
                  <textarea value={localData.obs || ""} onChange={e => setLocalData({...localData, obs: e.target.value})} onBlur={e => persist('obs', e.target.value)} className="w-full text-base font-light outline-none h-40 resize-none italic text-slate-400 bg-transparent pt-2 border-b border-white/10 mb-8 placeholder:text-slate-700" />
                  
                  {/* Bloco de Documentação Anexada */}
                  <label className={labelStyle}><Paperclip size={14}/> Documentação anexada</label>
                  <div className="space-y-4 mt-6">
                    {[{ label: 'Nota Fiscal', field: 'foto_nf', icon: <Camera size={16}/> }, { label: 'Boleto', field: 'boleto_fornecedor', icon: <Receipt size={16}/> }, { label: 'Recibo / Outros', field: 'recibo_fornecedor', icon: <Paperclip size={16}/> }].map((item) => {
                      const fileUrl = getUrlAnexo(req[item.field]);
                      const isDriveFile = req[item.field]?.startsWith('SupaAtualizarReq_Images/');
                      return (
                        <div key={item.field} className="flex items-center gap-2">
                          <label className="flex-1 flex items-center justify-between p-5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer transition-all group">
                            <div className="flex items-center gap-4"><div className="text-slate-500 group-hover:text-blue-400">{item.icon}</div><span className="text-xs font-bold text-slate-300 uppercase tracking-tighter">{item.label}</span></div>
                            <input type="file" className="hidden" onChange={e => handleFileUpload(e, item.field)} />
                            {req[item.field] ? <div className="w-2 h-2 rounded-full bg-green-500 "></div> : <ArrowRight size={14} className="text-slate-200"/>}
                          </label>
                          {req[item.field] && (
                            isDriveFile ? (
                              <button
                                onClick={() => abrirArquivoDrive(req[item.field])}
                                className="w-14 h-16 flex items-center justify-center rounded-2xl text-white transition-all shadow-lg bg-green-600 hover:bg-green-700  cursor-pointer"
                                title="Abrir no Google Drive"
                              >
                                <ExternalLink size={18} />
                              </button>
                            ) : (
                              <a
                                href={fileUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-14 h-16 flex items-center justify-center rounded-2xl text-white transition-all shadow-lg bg-blue-600 hover:bg-blue-700 "
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

              <div className="flex flex-col md:flex-row gap-3 pt-6 border-t border-white/5">
                <button onClick={() => setModalCotacaoAberto(true)} className="flex-1 bg-blue-600 text-white px-6 py-5 rounded-xl font-bold uppercase text-xs tracking-[0.2em] hover:bg-blue-500 transition-all flex items-center justify-center gap-3"><ClipboardList size={18} /> Mapa de Cotação</button>
                <button onClick={handlePrint} className="flex-1 bg-white/10 text-white px-6 py-5 rounded-xl font-bold uppercase text-xs tracking-[0.2em] hover:bg-blue-600 transition-all flex items-center justify-center gap-3"><Printer size={18} /> Gerar PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}