'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import Kanban from './components/Kanban';
import FormReq from './components/FormReq';
import FormFornecedor from './components/FormFornecedor';
import FormUsuario from './components/FormUsuario'; 
import FormVeiculo from './components/FormVeiculo'; 
import TemplatePDF from './components/TemplatePDF'; 
import { 
  LayoutDashboard, Users2, Box, Activity, Trash2, Plus, X, UserPlus, Car, Bell, Info, CheckCheck, UserCircle, Edit3, Phone
} from 'lucide-react';

export default function Home() {
  const [abaAtiva, setAbaAtiva] = useState('kanban');
  const [requisicoes, setRequisicoes] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]); 
  const [veiculos, setVeiculos] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState<any>(null); 
  const [veiculoEditando, setVeiculoEditando] = useState<any>(null); 
  const [reqParaImprimir, setReqParaImprimir] = useState<any>(null);
  const [notificacoes, setNotificacoes] = useState<any[]>([]); 
  const [toasts, setToasts] = useState<any[]>([]);             
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [contadorNotif, setContadorNotif] = useState(0);

  // ESTADO PARA COMUNICAR ABERTURA DE CARD AO KANBAN
  const [idDestaque, setIdDestaque] = useState<any>(null);

  const dispararImpressao = (dados: any) => {
    setReqParaImprimir(dados);
    setTimeout(() => {
      window.print();
      setReqParaImprimir(null);
    }, 800);
  };

  const abrirNotificacao = (idReq: any) => {
    setAbaAtiva('kanban');
    setIdDestaque(idReq);
    setShowNotifModal(false);
    // Limpa o destaque logo após para permitir re-clique se necessário
    setTimeout(() => setIdDestaque(null), 500);
  };

  const tocarAlerta = () => {
    try {
      if (typeof window !== 'undefined') {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const bip = (delay: number, freq: number) => {
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.type = 'triangle'; 
          oscillator.frequency.setValueAtTime(freq, audioCtx.currentTime + delay); 
          gainNode.gain.setValueAtTime(0.7, audioCtx.currentTime + delay); 
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + 0.4);
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.start(audioCtx.currentTime + delay);
          oscillator.stop(audioCtx.currentTime + delay + 0.4);
        };
        bip(0, 1600); bip(0.2, 2000); bip(0.4, 1600);
      }
    } catch (e) { console.error("Erro áudio:", e); }
  };

  const carregarDados = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      // Busca todas as requisições (sem limite de 1000)
      const buscarTodasReqs = async () => {
        let todas: any[] = [];
        let from = 0;
        const PAGE = 1000;
        while (true) {
          const { data, error } = await supabase
            .from('Requisicao')
            .select('*')
            .order('id', { ascending: false })
            .range(from, from + PAGE - 1);
          if (error || !data) break;
          todas = todas.concat(data);
          if (data.length < PAGE) break;
          from += PAGE;
        }
        return todas;
      };

      const [allReqs, resUser, resVei] = await Promise.all([
        buscarTodasReqs(),
        supabase.from('req_usuarios').select('*').order('nome', { ascending: true }),
        supabase.from('SupaPlacas').select('*').order('NumPlaca', { ascending: true })
      ]);

      const resReq = { data: allReqs };

      if (resReq.data) {
        setRequisicoes(resReq.data.map(r => ({
          ...r, 
          status: r.status || 'pedido', 
          tipo: r.tipo || r.ReqTipo || 'Peça',
          titulo: r.titulo || r.Material_Serv_Solicitado || "", 
          solicitante: r.solicitante || r.ReqSolicitante || "", 
          setor: r.setor || r.ReqQuem || "",
          veiculo: r.veiculo || r.ReqVeiculo || "", 
          hodometro: r.hodometro || r.ReqHodometro || "", 
          valor_despeza: r.valor_despeza || "0,00", 
          obs: r.obs || r.Motivo || r.ReqMotivo || "",
          quem_ferramenta: r.quem_ferramenta || r.ferramenta_quem || "" 
        })));
      }
      if (resUser.data) setUsuarios(resUser.data);
      if (resVei.data) setVeiculos(resVei.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  }, []);

  useEffect(() => { 
    carregarDados(); 
    
    const channel = supabase.channel('main-realtime-stream')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Supa-Solicitacao_Req' }, (payload) => {
          tocarAlerta();
          const nova = payload.new;
          
          const info = { 
            id: Date.now(),
            idOriginal: nova.IdReq, 
            titulo: nova.Material_Serv_Solicitado || "Nova Solicitação", 
            solicitante: nova.ReqEmail || "Técnico (APP)", 
            tipoNotif: "Nova Solicitação!", 
            hora: new Date().toLocaleTimeString() 
          };
          setToasts(prev => [info, ...prev]);
          setNotificacoes(prev => [info, ...prev]);
          setContadorNotif(prev => prev + 1);

          carregarDados(true);
          setTimeout(() => carregarDados(true), 2500);
          setTimeout(() => setToasts(prev => prev.filter(t => t.id !== info.id)), 10000);

          // Aguarda o banco processar e busca o ID real da tabela Requisicao + nome do solicitante
          setTimeout(async () => {
            const { data: reqData } = await supabase
              .from('Requisicao')
              .select('*')
              .ilike('obs', `%[APPSHEET_ID:${nova.IdReq}]%`)
              .maybeSingle();

            let nomeExibicao = nova.ReqEmail || "Técnico";
            if (nova.ReqEmail?.includes('@')) {
              const { data: userData } = await supabase
                .from('req_usuarios')
                .select('nome')
                .eq('email', nova.ReqEmail.trim())
                .maybeSingle();
              if (userData?.nome) nomeExibicao = userData.nome;
            }

            dispararImpressao({
              id: reqData?.id || nova.IdReq || "NOVA",
              titulo: nova.Material_Serv_Solicitado || "SOLICITAÇÃO APP",
              tipo: nova.ReqTipo || "Peça",
              solicitante: nomeExibicao,
              setor: nova.ReqQuem || "Oficina",
              data: nova.ReqData || new Date().toISOString(),
              veiculo: nova.ReqVeiculo || "",
              hodometro: nova.ReqHodometro || "",
              Motivo: nova.ReqMotivo || "",
              obs: nova.ReqMotivo || "",
              valor_despeza: "0,00",
              impresso_por: "AUTO-GERADO PELO APP",
              quem_ferramenta: nova.ferramenta_quem || "",
              created_at: reqData?.created_at,
            });
          }, 3500);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Supa-AtualizarReq' }, (payload) => {
          tocarAlerta();
          const info = { 
            id: Date.now(), 
            idOriginal: payload.new.ReqREF,
            titulo: "Card Sincronizado", 
            solicitante: "Técnico (APP)", 
            tipoNotif: "Card Atualizado!", 
            hora: new Date().toLocaleTimeString() 
          };
          setToasts(prev => [info, ...prev]);
          setNotificacoes(prev => [info, ...prev]);
          setContadorNotif(prev => prev + 1);
          carregarDados(true);
          setTimeout(() => carregarDados(true), 2500);
          setTimeout(() => setToasts(prev => prev.filter(t => t.id !== info.id)), 10000);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Requisicao' }, () => {
        carregarDados(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [carregarDados]);

  const salvarUsuario = async (dados: any) => {
    if (usuarioEditando) await supabase.from('req_usuarios').update(dados).eq('id', usuarioEditando.id);
    else await supabase.from('req_usuarios').insert([dados]);
    setUsuarioEditando(null); setAbaAtiva('usuarios'); carregarDados(true);
  };

  const salvarVeiculo = async (dados: any) => {
    if (veiculoEditando) await supabase.from('SupaPlacas').update(dados).eq('IdPlaca', veiculoEditando.IdPlaca);
    else await supabase.from('SupaPlacas').insert([dados]);
    setVeiculoEditando(null); setAbaAtiva('veiculos'); carregarDados(true);
  };

  const menuItemStyle = (id: string) => `
    flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 relative group
    ${abaAtiva === id 
      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
      : 'text-slate-400 hover:bg-white/5 border border-transparent'}
  `;

  return (
    <main className="min-h-screen bg-slate-800 font-montserrat text-slate-100 flex overflow-hidden">
      
      {reqParaImprimir && <TemplatePDF req={reqParaImprimir} onUpdate={() => {}} onPrint={() => {}} />}

      {/* Histórico e Toasts - CLICÁVEIS */}
      <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t: any) => (
          <div 
            key={t.id} 
            onClick={() => abrirNotificacao(t.idOriginal)}
            className="pointer-events-auto cursor-pointer hover:scale-[1.02] transition-transform animate-in slide-in-from-right bg-slate-900/90 backdrop-blur-xl border-l-4 border-blue-500 p-5 rounded-2xl shadow-2xl flex gap-4 items-center ring-1 ring-white/10"
          >
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-900/40"><Bell size={20} /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t.tipoNotif}</p>
              <p className="text-xs font-bold text-white truncate">{t.titulo}</p>
            </div>
          </div>
        ))}
      </div>

      {showNotifModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[300] flex items-center justify-end p-4" onClick={() => setShowNotifModal(false)}>
          <div className="bg-slate-900 w-full max-w-md h-[85vh] rounded-[3rem] shadow-2xl border border-white/10 flex flex-col animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-white/5 flex justify-between items-center"><h2 className="text-xl font-black uppercase tracking-tighter text-white">Histórico</h2><button onClick={() => { setShowNotifModal(false); setContadorNotif(0); }} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center hover:bg-red-500 transition-all text-white"><X size={18} /></button></div>
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {notificacoes.length === 0 ? <p className="text-center text-slate-600 text-xs mt-20 uppercase font-bold tracking-widest">Sem novas notificações</p> : notificacoes.map((n: any) => (
                  <div 
                    key={n.id} 
                    onClick={() => abrirNotificacao(n.idOriginal)}
                    className="bg-white/5 p-4 rounded-2xl border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex justify-between text-[9px] font-bold text-blue-500 mb-1"><span>{n.hora}</span> <CheckCheck size={12}/></div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter mb-1">{n.tipoNotif}</p>
                    <p className="text-sm font-bold text-slate-200 group-hover:text-blue-400 transition-colors">{n.titulo}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{n.solicitante}</p>
                  </div>
                ))}
            </div>
            <div className="p-6"><button onClick={() => setNotificacoes([])} className="w-full py-4 bg-white/5 rounded-2xl text-[10px] font-bold uppercase hover:bg-white/10 transition-all text-white">Limpar Tudo</button></div>
          </div>
        </div>
      )}

      {/* Menu Lateral - REDESENHADO */}
      <aside onMouseEnter={() => setMenuAberto(true)} onMouseLeave={() => setMenuAberto(false)} className={`fixed left-0 top-0 h-full bg-slate-950/80 backdrop-blur-3xl border-r border-white/5 z-50 transition-all duration-500 flex flex-col ${menuAberto ? 'w-64 px-4' : 'w-20 px-3'}`}>
        <div className="py-10 flex items-center gap-4 overflow-hidden px-2">
          <div className="min-w-[44px] h-[44px] bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-900/30"><Box size={22} /></div>
          <div className={`transition-opacity duration-300 whitespace-nowrap ${menuAberto ? 'opacity-100' : 'opacity-0'}`}><h1 className="text-sm font-black uppercase tracking-tighter text-white">Nova Tratores</h1></div>
        </div>
        
        <nav className="flex-1 space-y-2 mt-4">
          <button onClick={() => setAbaAtiva('kanban')} className={menuItemStyle('kanban')}>
            {abaAtiva === 'kanban' && <div className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
            <LayoutDashboard size={20} />
            <span className={`text-[11px] font-bold uppercase tracking-widest ${menuAberto ? 'opacity-100' : 'opacity-0'}`}>Kanban</span>
          </button>

          <button onClick={() => { setShowNotifModal(true); setContadorNotif(0); }} className={`${menuItemStyle('notif')} relative`}>
            <Bell size={20} />
            <span className={`text-[11px] font-bold uppercase tracking-widest ${menuAberto ? 'opacity-100' : 'opacity-0'}`}>Alertas</span>
            {contadorNotif > 0 && <span className="absolute top-2.5 left-7 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce border-2 border-slate-950">{contadorNotif}</span>}
          </button>

          <button onClick={() => setAbaAtiva('usuarios')} className={menuItemStyle('usuarios')}>
            {abaAtiva === 'usuarios' && <div className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
            <UserCircle size={20} />
            <span className={`text-[11px] font-bold uppercase tracking-widest ${menuAberto ? 'opacity-100' : 'opacity-0'}`}>Usuários</span>
          </button>

          <button onClick={() => setAbaAtiva('veiculos')} className={menuItemStyle('veiculos')}>
            {abaAtiva === 'veiculos' && <div className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
            <Car size={20} />
            <span className={`text-[11px] font-bold uppercase tracking-widest ${menuAberto ? 'opacity-100' : 'opacity-0'}`}>Veículos</span>
          </button>

          <button onClick={() => setAbaAtiva('fornecedores')} className={menuItemStyle('fornecedores')}>
            {abaAtiva === 'fornecedores' && <div className="absolute left-0 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
            <Users2 size={20} />
            <span className={`text-[11px] font-bold uppercase tracking-widest ${menuAberto ? 'opacity-100' : 'opacity-0'}`}>Forn.</span>
          </button>

          <button onClick={() => setAbaAtiva('lixeira')} className={menuItemStyle('lixeira')}>
            {abaAtiva === 'lixeira' && <div className="absolute left-0 w-1 h-6 bg-red-500 rounded-r-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />}
            <div className="relative">
              <Trash2 size={20} />
              {requisicoes.filter(r => r.status === 'lixeira').length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                  {requisicoes.filter(r => r.status === 'lixeira').length}
                </span>
              )}
            </div>
            <span className={`text-[11px] font-bold uppercase tracking-widest ${menuAberto ? 'opacity-100' : 'opacity-0'}`}>Lixeira</span>
          </button>
        </nav>

        <div className={`p-4 mb-6 transition-opacity duration-300 ${menuAberto ? 'opacity-100' : 'opacity-0'}`}>
           <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Status</p>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-300 uppercase">Online</span>
              </div>
           </div>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <section className={`flex-1 transition-all duration-500 ${menuAberto ? 'ml-64' : 'ml-20'} print:hidden`}>
        {loading ? <div className="flex items-center justify-center h-screen"><Activity className="animate-spin text-blue-500" /></div> : (
          <div className="h-screen overflow-y-auto scrollbar-hide">
            {abaAtiva === 'kanban' && (
              <Kanban
                requisicoes={requisicoes}
                onUpdate={async (id: number, dados: Record<string, unknown>) => {
                  setRequisicoes(prev => prev.map(r => r.id === id ? { ...r, ...dados } : r));
                  await supabase.from('Requisicao').update(dados).eq('id', id);
                }}
                onPrint={dispararImpressao}
                idDestaque={idDestaque}
              />
            )}
            {abaAtiva === 'usuarios' && (
              <div className="max-w-6xl mx-auto py-20 px-10">
                <div className="flex justify-between items-end mb-12"><div><h2 className="text-4xl font-black uppercase tracking-tighter text-white">Colaboradores</h2><p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Gestão de acesso técnica</p></div><button onClick={() => { setUsuarioEditando(null); setAbaAtiva('form_usuario'); }} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl transition-all shadow-blue-900/20"><UserPlus size={20} /> Cadastrar Novo</button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{usuarios.map(u => (<div key={u.id} className="bg-slate-900/50 border border-white/5 p-8 rounded-[2.5rem] hover:border-blue-500/50 transition-all group"><div className="flex justify-between items-start mb-6"><div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-400 transition-colors"><UserCircle size={24} /></div><button onClick={() => { setUsuarioEditando(u); setAbaAtiva('form_usuario'); }} className="p-2 text-slate-600 hover:text-white transition-colors"><Edit3 size={18} /></button></div><h3 className="text-lg font-bold text-white mb-1">{u.nome}</h3><p className="text-xs text-slate-500 mb-4">{u.email}</p><div className="flex items-center gap-2 text-blue-400 text-[10px] font-bold uppercase tracking-widest"><Phone size={12} /> {u.telefone || 'Sem Telefone'}</div></div>))}</div>
              </div>
            )}
            {abaAtiva === 'veiculos' && (
              <div className="max-w-6xl mx-auto py-20 px-10">
                <div className="flex justify-between items-end mb-12"><div><h2 className="text-4xl font-black uppercase tracking-tighter text-white">Frota</h2><p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Gestão de veículos cadastrados</p></div><button onClick={() => { setVeiculoEditando(null); setAbaAtiva('form_veiculo'); }} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl transition-all shadow-blue-900/20"><Plus size={20} /> Cadastrar Veículo</button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">{veiculos.map(v => (<div key={v.IdPlaca} className="bg-slate-900/50 border border-white/5 p-6 rounded-[2rem] hover:border-blue-500/50 transition-all group flex justify-between items-center"><div><p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">PLACA</p><h3 className="text-base font-bold text-white uppercase">{v.NumPlaca}</h3></div><button onClick={() => { setVeiculoEditando(v); setAbaAtiva('form_veiculo'); }} className="p-2 text-slate-600 hover:text-white transition-colors"><Edit3 size={16} /></button></div>))}</div>
              </div>
            )}
            {abaAtiva === 'form_usuario' && <div className="max-w-3xl mx-auto py-20 px-4"><div className="bg-slate-900 rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden text-white"><FormUsuario usuarioParaEditar={usuarioEditando} onSave={salvarUsuario} onCancel={() => setAbaAtiva('usuarios')} /></div></div>}
            {abaAtiva === 'form_veiculo' && <div className="max-w-3xl mx-auto py-20 px-4"><div className="bg-slate-900 rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden text-white"><FormVeiculo veiculoParaEditar={veiculoEditando} onSave={salvarVeiculo} onCancel={() => setAbaAtiva('veiculos')} /></div></div>}
            {abaAtiva === 'fornecedores' && <div className="p-20"><FormFornecedor onSave={async (n: Record<string, unknown>) => { await supabase.from('Fornecedores').insert([n]); setAbaAtiva('kanban'); }} /></div>}
            {abaAtiva === 'lixeira' && (
              <div className="max-w-6xl mx-auto py-20 px-10">
                <div className="flex justify-between items-end mb-12">
                  <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-white flex items-center gap-4"><Trash2 size={36} className="text-red-500" /> Lixeira</h2>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-1">Requisições excluídas — restaure ou apague definitivamente</p>
                  </div>
                  {requisicoes.filter(r => r.status === 'lixeira').length > 0 && (
                    <button
                      onClick={async () => {
                        if (!confirm('Apagar TODAS as requisições da lixeira permanentemente?')) return;
                        const ids = requisicoes.filter(r => r.status === 'lixeira').map(r => r.id);
                        await supabase.from('Requisicao').delete().in('id', ids);
                        carregarDados(true);
                      }}
                      className="bg-red-600/20 hover:bg-red-600 border border-red-500/30 text-red-400 hover:text-white px-6 py-3 rounded-2xl font-bold text-[11px] uppercase tracking-widest flex items-center gap-2 transition-all"
                    >
                      <Trash2 size={16} /> Esvaziar Lixeira
                    </button>
                  )}
                </div>

                {requisicoes.filter(r => r.status === 'lixeira').length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-40 text-slate-600">
                    <Trash2 size={64} className="mb-6 opacity-20" />
                    <p className="text-[11px] font-black uppercase tracking-[0.4em]">Lixeira vazia</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {requisicoes.filter(r => r.status === 'lixeira').map(r => (
                      <div key={r.id} className="bg-slate-900/50 border border-white/5 rounded-[2rem] p-7 flex flex-col gap-5 hover:border-red-500/30 transition-all group">
                        <div className="flex items-start gap-4">
                          <div className="min-w-[44px] h-[44px] rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 font-light text-lg shadow-inner">
                            {r.id}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{r.tipo || r.ReqTipo}</span>
                            <h3 className="text-sm font-semibold text-slate-200 leading-tight mt-0.5 line-clamp-2">{r.titulo || r.Material_Serv_Solicitado || '—'}</h3>
                          </div>
                        </div>

                        <div className="space-y-2 text-[11px] text-slate-500 border-t border-white/5 pt-4">
                          <div className="flex justify-between"><span className="uppercase tracking-widest">Solicitante</span><span className="text-slate-300 font-medium truncate max-w-[150px]">{r.solicitante || '—'}</span></div>
                          <div className="flex justify-between"><span className="uppercase tracking-widest">Setor</span><span className="text-slate-300 font-medium">{r.setor || '—'}</span></div>
                          <div className="flex justify-between"><span className="uppercase tracking-widest">Valor</span><span className="text-slate-300 font-medium">R$ {r.valor_despeza || '0,00'}</span></div>
                        </div>

                        <div className="flex gap-3 mt-auto">
                          <button
                            onClick={async () => {
                              await supabase.from('Requisicao').update({ status: 'pedido' }).eq('id', r.id);
                              setRequisicoes(prev => prev.map(x => x.id === r.id ? { ...x, status: 'pedido' } : x));
                            }}
                            className="flex-1 bg-white/5 hover:bg-blue-600 border border-white/10 hover:border-blue-500 text-slate-400 hover:text-white py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                          >
                            <Activity size={14} /> Restaurar
                          </button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Excluir a requisição #${r.id} permanentemente?`)) return;
                              await supabase.from('Requisicao').delete().eq('id', r.id);
                              setRequisicoes(prev => prev.filter(x => x.id !== r.id));
                            }}
                            className="w-12 h-10 flex items-center justify-center rounded-2xl bg-red-500/10 hover:bg-red-600 border border-red-500/20 text-red-400 hover:text-white transition-all"
                            title="Excluir permanentemente"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      <button onClick={() => setAbaAtiva(abaAtiva === 'form' ? 'kanban' : 'form')} className={`fixed bottom-10 right-10 w-20 h-20 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-2xl z-[110] transition-all shadow-blue-900/40 print:hidden ${abaAtiva === 'form' ? 'rotate-45 bg-red-500 shadow-red-900/40' : ''}`}><Plus size={32} /></button>
      
      {abaAtiva === 'form' && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 print:hidden">
          <div className="w-full max-w-5xl bg-slate-900 rounded-[3rem] p-1 border border-white/10 overflow-y-auto max-h-[90vh] text-white shadow-2xl">
            <FormReq onSave={async (nova: Record<string, unknown>) => { await supabase.from('Requisicao').insert([nova]); setAbaAtiva('kanban'); carregarDados(true); }} />
          </div>
        </div>
      )}
    </main>
  );
}