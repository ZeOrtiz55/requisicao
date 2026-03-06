import { createClient } from '@supabase/supabase-js';
import dns from 'dns';

// Forçar DNS do Google (o roteador local está falhando)
dns.setServers(['8.8.8.8', '8.8.4.4']);

const supabase = createClient(
  'https://citrhumdkfivdzbmayde.supabase.co',
  'sb_publishable_0dpYhnJLqEdBSNk-2Ec_og_OqlmQI7Z'
);

async function main() {
  // Buscar todos que estão como financeiro + migrados
  let migrados = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('Requisicao')
      .select('id, obs')
      .eq('status', 'financeiro')
      .like('obs', '%[MIGRADO_ID:%')
      .range(from, from + 999);
    if (error) { console.error('Erro busca:', error.message); return; }
    migrados = migrados.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log('Financeiro + migrados:', migrados.length);

  // Filtrar os que NÃO deviam estar no financeiro
  const fasesFinanceiro = ['Custo-Cobrado Cliente', 'Despesa- Concluida'];
  const paraCorrigir = migrados.filter(r => {
    const match = r.obs.match(/Fase original: ([^|]+)/);
    if (!match) return false;
    const fase = match[1].trim();
    return !fasesFinanceiro.includes(fase);
  });

  console.log('Para corrigir para aguardando:', paraCorrigir.length);
  if (paraCorrigir.length > 0) {
    paraCorrigir.forEach(r => {
      const match = r.obs.match(/Fase original: ([^|]+)/);
      console.log('  ID', r.id, '- Fase:', match?.[1]?.trim());
    });
  }

  // Atualizar em lotes de 50
  let total = 0;
  for (let i = 0; i < paraCorrigir.length; i += 50) {
    const ids = paraCorrigir.slice(i, i + 50).map(r => r.id);
    const { error: upErr } = await supabase
      .from('Requisicao')
      .update({ status: 'aguardando' })
      .in('id', ids);
    if (upErr) {
      console.error('Erro update:', upErr.message);
    } else {
      total += ids.length;
    }
  }

  console.log('\nTotal corrigidos:', total);
}

main().catch(console.error);
