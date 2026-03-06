const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://citrhumdkfivdzbmayde.supabase.co',
  'sb_publishable_0dpYhnJLqEdBSNk-2Ec_og_OqlmQI7Z'
);

async function main() {
  // Pegar uma amostra de requisições para ver as colunas e valores
  const { data: sample } = await supabase
    .from('Requisicao')
    .select('*')
    .order('id', { ascending: false })
    .limit(3);

  if (sample && sample.length > 0) {
    console.log('=== COLUNAS DA TABELA Requisicao ===');
    console.log(Object.keys(sample[0]));
    console.log('\n=== AMOSTRA (3 registros recentes) ===');
    sample.forEach(r => console.log(JSON.stringify(r, null, 2)));
  }

  // Buscar req que tem alguma placa no titulo (para ver se veiculo foi importado)
  const { data: comPlaca } = await supabase
    .from('Requisicao')
    .select('id, titulo, veiculo, hodometro, status')
    .ilike('titulo', '%EPX%')
    .limit(10);

  console.log('\n=== REQS COM "EPX" NO TITULO ===');
  if (comPlaca) comPlaca.forEach(r => console.log(`  ID:${r.id} | veiculo:[${r.veiculo || ''}] | hodo:[${r.hodometro || ''}] | ${r.titulo}`));

  // Contar quantas tem veiculo preenchido
  const { data: comVeiculo, count } = await supabase
    .from('Requisicao')
    .select('id, veiculo', { count: 'exact' })
    .neq('veiculo', '')
    .not('veiculo', 'is', null)
    .limit(10);

  console.log(`\n=== REQS COM VEICULO PREENCHIDO: ${count} ===`);
  if (comVeiculo) comVeiculo.forEach(r => console.log(`  ID:${r.id} | veiculo:[${r.veiculo}]`));
}

main().catch(console.error);
