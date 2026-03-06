// Preenche solicitante dos registros migrados que estão vazios
// usando o campo "Criador (User)" do dados-pipe.csv como fallback
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';

const supabase = createClient(
  'https://citrhumdkfivdzbmayde.supabase.co',
  'sb_publishable_0dpYhnJLqEdBSNk-2Ec_og_OqlmQI7Z'
);

const MAPA_CRIADOR = {
  'Arthur Langame Leite': 'Arthur',
  'Gabriela': 'Pós Vendas- Escriório',
  'Henri Hioni': 'Henri Hione',
  'Vinicius': 'Vinicius Correa',
  'mariano ramos do val': 'Mariano Duval',
  'santiago.nova': 'Pós Vendas- Escriório',
  'José Ortiz': 'Jose Ortiz',
};

async function main() {
  const csv = fs.readFileSync('dados-pipe.csv', 'utf8');
  const rows = parse(csv, { columns: true, skip_empty_lines: true, relax_column_count: true, bom: true });

  // Indexar criador por ID
  const criadorMap = {};
  for (const r of rows) {
    const id = (r['ID'] || '').trim();
    const criador = (r['Criador (User)'] || '').trim();
    if (id && criador) criadorMap[id] = criador;
  }

  // Buscar registros migrados SEM solicitante
  let migrados = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('Requisicao')
      .select('id, obs, solicitante')
      .like('obs', '%[MIGRADO_ID:%')
      .range(from, from + 999);
    if (error) { console.error('Erro:', error.message); return; }
    migrados = migrados.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }

  const semSolicitante = migrados.filter(r => r.solicitante === '' || r.solicitante === null);
  console.log(`Total migrados: ${migrados.length}`);
  console.log(`Sem solicitante: ${semSolicitante.length}`);

  let atualizados = 0;
  for (const reg of semSolicitante) {
    const match = reg.obs.match(/\[MIGRADO_ID:(\d+)\]/);
    if (!match) continue;

    const idAntigo = match[1];
    const criador = criadorMap[idAntigo];
    if (!criador) continue;

    const nome = MAPA_CRIADOR[criador] || criador;

    const { error } = await supabase.from('Requisicao').update({ solicitante: nome }).eq('id', reg.id);
    if (error) {
      console.error(`Erro ID ${reg.id}:`, error.message);
    } else {
      atualizados++;
    }
  }

  console.log(`\nAtualizados com Criador (User): ${atualizados}`);
}

main().catch(console.error);
