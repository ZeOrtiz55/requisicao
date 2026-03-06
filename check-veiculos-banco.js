const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://citrhumdkfivdzbmayde.supabase.co',
  'sb_publishable_0dpYhnJLqEdBSNk-2Ec_og_OqlmQI7Z'
);

async function main() {
  // 1. Buscar todas as placas cadastradas
  const { data: placas } = await supabase.from('SupaPlacas').select('IdPlaca, NumPlaca').order('NumPlaca');
  console.log('=== PLACAS CADASTRADAS (SupaPlacas) ===');
  placas.forEach(p => console.log(`  IdPlaca: ${p.IdPlaca} | NumPlaca: ${p.NumPlaca}`));

  // 2. Buscar exemplos de requisicoes com veiculo preenchido
  const { data: reqs } = await supabase
    .from('Requisicao')
    .select('id, titulo, veiculo, ReqVeiculo')
    .or('veiculo.neq.,ReqVeiculo.neq.')
    .order('id', { ascending: false })
    .limit(30);

  console.log('\n=== REQUISICOES COM VEICULO (ultimas 30) ===');
  if (reqs) {
    reqs.forEach(r => {
      console.log(`  ID:${r.id} | veiculo:[${r.veiculo || ''}] | ReqVeiculo:[${r.ReqVeiculo || ''}] | ${(r.titulo || '').substring(0, 50)}`);
    });
  }

  // 3. Verificar veiculos que nao batem com nenhuma placa
  const { data: allReqs } = await supabase
    .from('Requisicao')
    .select('id, veiculo, ReqVeiculo');

  const placaSet = new Set(placas.map(p => p.NumPlaca));
  const idSet = new Set(placas.map(p => String(p.IdPlaca)));

  const problemas = [];
  if (allReqs) {
    allReqs.forEach(r => {
      const v = r.veiculo || r.ReqVeiculo || '';
      if (!v) return;
      const vStr = String(v).trim();
      if (!placaSet.has(vStr) && !idSet.has(vStr)) {
        problemas.push({ id: r.id, veiculo: vStr });
      }
    });
  }

  console.log(`\n=== VEICULOS QUE NAO BATEM COM NENHUMA PLACA (${problemas.length} reqs) ===`);
  const valoresProblema = new Set(problemas.map(p => p.veiculo));
  console.log('Valores unicos com problema:', [...valoresProblema].sort());
  problemas.slice(0, 15).forEach(p => console.log(`  ID:${p.id} | veiculo:[${p.veiculo}]`));
}

main().catch(console.error);
