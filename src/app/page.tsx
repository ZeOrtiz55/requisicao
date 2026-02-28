'use client';
import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import Kanban from './components/Kanban';
import FormReq from './components/FormReq';
import FormFornecedor from './components/FormFornecedor';
import FormUsuario from './components/FormUsuario'; 
import FormVeiculo from './components/FormVeiculo'; 
// ATUALIZADO PARA O NOVO TEMPLATE
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
  
  // ESTADO PARA IMPRESSÃO (AUTO E MANUAL)
  const [reqParaImprimir, setReqParaImprimir] = useState<any>(null);

  const [notificacoes, setNotificacoes] = useState<any[]>([]); 
  const [toasts, setToasts] = useState<any[]>([]);             
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [contadorNotif, setContadorNotif] = useState(0);

  // FUNÇÃO MESTRE DE IMPRESSÃO (CHAMADA PELO CARD OU PELO AUTO-PRINT)
  const dispararImpressao = (dados: any) => {
    setReqParaImprimir(dados);
    setTimeout(() => {
      window.print();
      setReqParaImprimir(null);
    }, 800);
  };

  const tocarAlerta = () => {
    try {
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
    } catch (e) { console.error("Erro áudio:", e); }
  };

  const carregarDados = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const [resReq, resUser, resVei] = await Promise.all([
        supabase.from('Requisicao').select('*').order('id', { ascending: false }),
        supabase.from('req_usuarios').select('*').order('nome', { ascending: true }),
        supabase.from('SupaPlacas').select('*').order('NumPlaca', { ascending: true })
      ]);

      if (resReq.data) {
        setRequisicoes(resReq.data.map(r => ({
          ...r, 
          status: r.status || 'pedido', 
          tipo: r.tipo || r.ReqTipo || 'Peça',
          titulo: r.titulo || "", 
          solicitante: r.solicitante || "", 
          setor: r.setor || "",
          veiculo: r.veiculo || "", 
          hodometro: r.hodometro || "", 
          valor_despeza: r.valor_despeza || "0,00", 
          obs: r.obs || "",
          quem_ferramenta: r.quem_ferramenta || "" // MAPEAMENTO DA NOVA COLUNA NO ESTADO
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
            titulo: nova.Material_Serv_Solicitado || "Nova Solicitação", 
            solicitante: "Técnico (APP)", 
            tipoNotif: "Nova Solicitação!", 
            hora: new Date().toLocaleTimeString() 
          };
          setToasts(prev => [info, ...prev]);
          setNotificacoes(prev => [info, ...prev]);
          setContadorNotif(prev => prev + 1);

          // MAPEAMENTO REALTIME: ferramenta_quem -> quem_ferramenta
          const printData = {
            id: "NOVA",
            titulo: nova.Material_Serv_Solicitado || "SOLICITAÇÃO APP",
            tipo: nova.ReqTipo || "Peça",
            solicitante: nova.ReqEmail || "Técnico",
            setor: nova.ReqQuem || "Oficina",
            data: nova.ReqData || new Date().toISOString(),
            veiculo: nova.ReqVeiculo || "",
            hodometro: nova.ReqHodometro || "",
            Motivo: nova.ReqMotivo || "",
            obs: nova.ReqObs || "",
            valor_despeza: "0,00",
            impresso_por: "AUTO-GERADO PELO APP",
            quem_ferramenta: nova.ferramenta_quem || "" // NOVA LINHA DE INTEGRAÇÃO
          };

          dispararImpressao(printData); // Chama a função mestre
          carregarDados(true);
          setTimeout(() => carregarDados(true), 2500); 
          setTimeout(() => setToasts(prev => prev.filter(t => t.id !== info.id)), 10000);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Supa-AtualizarReq' }, (payload) => {
          tocarAlerta();
          const info = { id: Date.now(), titulo: "Card Sincronizado", solicitante: "Técnico (APP)", tipoNotif: "Card Atualizado!", hora: new Date().toLocaleTimeString() };
          setToasts(prev => [info, ...prev]);
          setNotificacoes(prev => [info, ...prev]);
          setContadorNotif(prev => prev + 1);
          carregarDados(true);
          setTimeout(() => carregarDados(true), 2500);
          setTimeout(() => setToasts(prev => prev.filter(t => t.id !== info.id)), 10000);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Requisicao' }, () => carregarDados(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'req_usuarios' }, () => carregarDados(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'SupaPlacas' }, () => carregarDados(true))
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

  const menuItemStyle = (id: string) => `flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 group ${abaAtiva === id ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-slate-400 hover:bg-white/5'}`;

  return (
    <main className="min-h-screen bg-slate-800 font-montserrat text-slate-100 flex overflow-hidden">
      
      {/* O TEMPLATE DE PDF FICA AQUI NA RAIZ DA HOME (FUNCIONALIDADE PDF) */}
      {reqParaImprimir && <TemplatePDF req={reqParaImprimir} />}

      <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t: any) => (
          <div key={t.id} className="pointer-events-auto animate-in slide-in-from-right bg-slate-900 border-l-4 border-blue-500 p-5 rounded-2xl shadow-2xl flex gap-4 items-center ring-1 ring-white/10">
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
                  <div key={n.id} className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <div className="flex justify-between text-[9px] font-bold text-blue-500 mb-1"><span>{n.hora}</span> <CheckCheck size={12}/></div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter mb-1">{n.tipoNotif}</p>
                    <p className="text-sm font-bold text-slate-200">{n.titulo}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{n.solicitante}</p>
                  </div>
                ))}
            </div>
            <div className="p-6"><button onClick={() => setNotificacoes([])} className="w-full py-4 bg-white/5 rounded-2xl text-[10px] font-bold uppercase hover:bg-white/10 transition-all text-white">Limpar Tudo</button></div>
          </div>
        </div>
      )}

      <aside onMouseEnter={() => setMenuAberto(true)} onMouseLeave={() => setMenuAberto(false)} className={`fixed left-0 top-0 h-full bg-slate-950/60 backdrop-blur-2xl border-r border-white/5 z-50 transition-all duration-500 flex flex-col ${menuAberto ? 'w-72 px-6' : 'w-20 px-4'}`}>
        <div className="py-10 flex items-center gap-4 overflow-hidden px-2">
          <div className="min-w-[48px] h-[48px] bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-900/20"><Box size={24} /></div>
          <div className={`transition-opacity duration-300 whitespace-nowrap ${menuAberto ? 'opacity-100' : 'opacity-0'}`}><h1 className="text-sm font-black uppercase tracking-tighter text-white">Nova Tratores</h1></div>
        </div>
        <nav className="flex-1 space-y-3 mt-4">
          <button onClick={() => setAbaAtiva('kanban')} className={menuItemStyle('kanban')}><LayoutDashboard size={20} /><span className={`text-xs font-bold uppercase tracking-widest ${menuAberto ? 'opacity-100' : 'opacity-0'}`}>Kanban</span></button>
          <button onClick={() => setShowNotifModal(true)} className={`${menuItemStyle('notif')} relative`}><Bell size={20} /><span className={`text-xs font-bold uppercase tracking-widest ${menuAberto ? 'opacity-100' : 'opacity-0'}`}>Notificações</span>
            {contadorNotif > 0 && <span className="absolute top-3 left-8 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce border-2 border-slate-950">{contadorNotif}</span>}
          </button>
          <button onClick={() => setAbaAtiva('usuarios')} className={menuItemStyle('usuarios')}><UserCircle size={20} /><span className={`text-xs font-bold uppercase tracking-widest ${menuAberto ? 'opacity-100' : 'opacity-0'}`}>Usuários</span></button>
          <button onClick={() => setAbaAtiva('veiculos')} className={menuItemStyle('veiculos')}><Car size={20} /><span className={`text-xs font-bold uppercase tracking-widest ${menuAberto ? 'opacity-100' : 'opacity-0'}`}>Veículos</span></button>
          <button onClick={() => setAbaAtiva('fornecedores')} className={menuItemStyle('fornecedores')}><Users2 size={20} /><span className={`text-xs font-bold uppercase tracking-widest ${menuAberto ? 'opacity-100' : 'opacity-0'}`}>Fornecedores</span></button>
        </nav>
      </aside>

      <section className={`flex-1 transition-all duration-500 ${menuAberto ? 'ml-72' : 'ml-20'} print:hidden`}>
        {loading ? <div className="flex items-center justify-center h-screen"><Activity className="animate-spin text-blue-500" /></div> : (
          <div className="h-screen overflow-y-auto scrollbar-hide">
            {abaAtiva === 'kanban' && (
              <Kanban 
                requisicoes={requisicoes} 
                onUpdate={async (id: number, dados: Record<string, unknown>) => { await supabase.from('Requisicao').update(dados).eq('id', id); carregarDados(true); }}
                onPrint={dispararImpressao} // PASSA A FUNÇÃO PARA O KANBAN
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