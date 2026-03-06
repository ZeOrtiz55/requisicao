// Atualiza solicitante e fornecedor dos registros migrados usando dados-pipe.csv
// Cruza pelo ID antigo (tag [MIGRADO_ID:xxx] na obs)
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';

const SUPABASE_URL = 'https://citrhumdkfivdzbmayde.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0dpYhnJLqEdBSNk-2Ec_og_OqlmQI7Z';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Mapeamento de nomes do CSV -> nomes cadastrados em req_usuarios
const MAPA_SOLICITANTES = {
  'ALEXSANDER VICTORINO': null, // não cadastrado
  'ANDRÉ ANIBAL': null,
  'ARTHUR': null,
  'CARIVALDO': null,
  'DANILO SOUZA': 'Danilo de Souza',
  'DEPARTAMENTO COMERCIAL': null,
  'DIRETOR GERAL': null,
  'DOUGRAS BOMFIM': null,
  'FERNANDO DIRETOR': null,
  'FERNANDO LEONEL': 'Fernando Leonel',
  'GABRIEL MORAES': 'Gabriel Moraes',
  'HENRI HIONI': 'Henri Hione',
  'JOSÉ ANTÔNIO DE OLIVEIRA': 'Jose Antonio de Oliveira',
  'JOSÉ ORTIZ(ESCRITÓRIO)': 'Jose Ortiz',
  'LEONARDO VENDEDOR': null,
  'LUCAS ENZ': null,
  'LUIZ FERNANDO': 'Luiz Fernando (Motorista)',
  'LUIZ FERNANDO DE SOUZA': 'Luiz Fernando (Motorista)',
  'MARIANO DUVAL': 'Mariano Duval',
  'NICOLAS DARIO': 'Nicolas Dario',
  'PAULO MOTTA': 'Paulo Motta',
  'PEDRO MOTTA': 'Pedro Motta',
  'Técnico: Fernando Leonel': 'Fernando Leonel',
  'Técnico: Nicolas Dario': 'Nicolas Dario',
  'Técnico: Paulo Motta': 'Paulo Motta',
  'VINICIUS CORREA': null,
  'ZEZO': 'Zezo',
};

// Mapeamento de nomes do CSV -> nomes cadastrados em Fornecedores
const MAPA_FORNECEDORES = {
  'Auto Posto 2001': 'AUTO POSTO 2001',
  'Auto Tintas Piraju LTDA': 'AUTO TINTAS PIRAJU LTDA',
  'Barrado': 'AUTO PEÇAS BARRADÃO',
  'Carlos Pneus': 'CARLINHOS PNEU',
  'Jeferson Climatização': 'JEFFERSON CLIMATIZAÇÃO',
  'Kadu Ferramentas': ' KADU FERRAMENTAS E MATERIAIS',
  'KMS Ferramentas': 'KMS FERRAMENTAS',
  'Koba Parafusos': 'KOBA PARAFUSOS',
  'Landico': 'LANDICO',
  'Mabraco': 'MABRACO MATERIAIS DE CONSTRUÇÃO',
  'Parada Pneus': 'PARADA PNEUS',
  'PitStop Autopeças Martins': 'AUTO PEÇAS MARTINS',
  'Rodrigo Torneiro': 'RODRIGO TORNEIRO (PANDA)',
  'Restaurante e Marmitaria Bom Gosto': 'RESTAURANTE E MARMITARIA BOM GOSTO',
  'Lanchonete Caverna': 'LANCHONETE CAVERNA',
  'Lanchonete caverna': 'LANCHONETE CAVERNA',
};

// Fornecedores que precisam ser criados (não existem no banco)
const FORNECEDORES_NOVOS = new Set();

function resolverSolicitante(nomeCSV) {
  if (!nomeCSV) return null;
  const nome = nomeCSV.trim();
  if (MAPA_SOLICITANTES[nome] !== undefined) return MAPA_SOLICITANTES[nome];
  return nome; // mantém original se não mapeado
}

function resolverFornecedor(nomeCSV) {
  if (!nomeCSV) return null;
  const nome = nomeCSV.trim();
  if (nome === 'Outros...' || nome === 'Alex') return null;
  if (MAPA_FORNECEDORES[nome]) return MAPA_FORNECEDORES[nome];
  // Se não está mapeado, vira uppercase e será criado
  FORNECEDORES_NOVOS.add(nome.toUpperCase());
  return nome.toUpperCase();
}

async function main() {
  // 1. Ler dados-pipe.csv e indexar por ID
  const csv = fs.readFileSync('dados-pipe.csv', 'utf8');
  const rows = parse(csv, { columns: true, skip_empty_lines: true, relax_column_count: true, bom: true });

  const pipeMap = {};
  for (const r of rows) {
    const id = (r['ID'] || '').trim();
    if (id) {
      pipeMap[id] = {
        solicitante: (r['SOLICITANTE'] || r['Solicitante'] || '').trim(),
        fornecedor: (r['FORNECEDOR'] || r['Fornecedor Final'] || r['Forncedor Final'] || '').trim(),
      };
    }
  }
  console.log(`dados-pipe.csv: ${Object.keys(pipeMap).length} registros indexados`);

  // 2. Buscar todos os registros migrados do banco (com paginação)
  let migrados = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('Requisicao')
      .select('id, obs, solicitante, fornecedor')
      .like('obs', '%[MIGRADO_ID:%')
      .range(from, from + PAGE - 1);
    if (error) { console.error('Erro:', error.message); return; }
    migrados = migrados.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`Banco: ${migrados.length} registros migrados encontrados`);

  // 3. Cruzar e preparar updates
  let atualizados = 0;
  let semMatch = 0;

  for (const reg of migrados) {
    const match = reg.obs.match(/\[MIGRADO_ID:(\d+)\]/);
    if (!match) continue;

    const idAntigo = match[1];
    const pipe = pipeMap[idAntigo];
    if (!pipe) { semMatch++; continue; }

    const updates = {};

    // Solicitante
    const sol = resolverSolicitante(pipe.solicitante);
    if (sol && sol !== reg.solicitante) {
      updates.solicitante = sol;
    }

    // Fornecedor
    const forn = resolverFornecedor(pipe.fornecedor);
    if (forn && !reg.fornecedor) {
      updates.fornecedor = forn;
    }

    if (Object.keys(updates).length > 0) {
      const { error: upErr } = await supabase.from('Requisicao').update(updates).eq('id', reg.id);
      if (upErr) {
        console.error(`Erro ao atualizar ID ${reg.id}:`, upErr.message);
      } else {
        atualizados++;
      }
    }
  }

  // 4. Criar fornecedores novos no banco
  if (FORNECEDORES_NOVOS.size > 0) {
    // Buscar existentes para não duplicar
    const { data: existentes } = await supabase.from('Fornecedores').select('nome');
    const nomesExistentes = new Set((existentes || []).map(f => f.nome.trim().toUpperCase()));

    const paraInserir = [...FORNECEDORES_NOVOS]
      .filter(n => !nomesExistentes.has(n))
      .map(n => ({ nome: n }));

    if (paraInserir.length > 0) {
      const { error: insErr } = await supabase.from('Fornecedores').insert(paraInserir);
      if (insErr) {
        console.error('Erro ao criar fornecedores:', insErr.message);
      } else {
        console.log(`\n${paraInserir.length} fornecedores novos criados:`);
        paraInserir.forEach(f => console.log('  +', f.nome));
      }
    }
  }

  console.log(`\n=== RESULTADO ===`);
  console.log(`Registros atualizados: ${atualizados}`);
  console.log(`Sem match no pipe: ${semMatch}`);
}

main().catch(console.error);
