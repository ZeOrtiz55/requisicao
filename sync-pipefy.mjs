// Script: Busca TODOS os cards do Pipefy e atualiza registros migrados no Supabase
// Cruza pelo ID do Pipefy (tag [MIGRADO_ID:xxx] na obs da Requisicao)
// Preenche campos faltantes + baixa anexos do Pipefy e faz upload pro Supabase Storage
//
// Executar: node sync-pipefy.mjs
// Dry run:  node sync-pipefy.mjs --dry-run
// Usar dump já baixado: node sync-pipefy.mjs --use-cache

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';

// ---- Credenciais ----
let envVars = {};
try {
  const envFile = readFileSync('.env.local', 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) envVars[key.trim()] = rest.join('=').trim();
  });
} catch (e) {}

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const PIPEFY_TOKEN = 'eyJhbGciOiJIUzUxMiJ9.eyJpc3MiOiJQaXBlZnkiLCJpYXQiOjE3NTc0MTgzOTgsImp0aSI6IjU2NWEyYjgxLWI2YzYtNDllOS1hNzBlLWEzZjg0MzE0YWI2MCIsInN1YiI6MzA2ODYxMDY3LCJ1c2VyIjp7ImlkIjozMDY4NjEwNjcsImVtYWlsIjoiYW50b25pby5ub3ZhdHJhdG9yZXNAZ21haWwuY29tIn0sInVzZXJfdHlwZSI6ImF1dGhlbnRpY2F0ZWQifQ.JpmGrdq_LXMu_nZztH2xcT_PgYNWGeSGi01X3GGXTDP1p-GHDjKtok-DpxgQTMJwGcXZit9wZpeF-6cMbyPDFA';

const DRY_RUN = process.argv.includes('--dry-run');
const USE_CACHE = process.argv.includes('--use-cache');

const PHASES = [
  { id: '333647651', name: 'Pedidos' },
  { id: '333954828', name: 'Aguardando- NF ou Aprovar' },
  { id: '339832465', name: 'Veiculos- Add no Rota Exata' },
  { id: '339797694', name: 'Custo-Cobrado Cliente' },
  { id: '333647653', name: 'Despesa- Concluida' },
  { id: '333647654', name: 'FERRAMENTAS ESTOQUE' },
  { id: '339666009', name: 'Negadas' },
];

const MAPA_SOLICITANTES = {
  'DANILO SOUZA': 'Danilo de Souza',
  'FERNANDO LEONEL': 'Fernando Leonel',
  'GABRIEL MORAES': 'Gabriel Moraes',
  'HENRI HIONI': 'Henri Hione',
  'JOSÉ ANTÔNIO DE OLIVEIRA': 'Jose Antonio de Oliveira',
  'JOSÉ ORTIZ(ESCRITÓRIO)': 'Jose Ortiz',
  'JOSÉ ORTIZ (ESCRITÓRIO)': 'Jose Ortiz',
  'JOSÉ ANTÔNIO(ESCRITÓRIO)': 'Jose Antonio de Oliveira',
  'LUIZ FERNANDO': 'Luiz Fernando (Motorista)',
  'LUIZ FERNANDO DE SOUZA': 'Luiz Fernando (Motorista)',
  'MARIANO DUVAL': 'Mariano Duval',
  'NICOLAS DARIO': 'Nicolas Dario',
  'PAULO MOTTA': 'Paulo Motta',
  'PEDRO MOTTA': 'Pedro Motta',
  'VINICIUS CORREA': 'Vinicius Correa',
  'VINICIUS': 'Vinicius Correa',
  'ZEZO': 'Zezo',
  'GABRIELA': 'Gabriela',
  'GABRIELA ': 'Gabriela',
  'Técnico: Fernando Leonel': 'Fernando Leonel',
  'Técnico: Nicolas Dario': 'Nicolas Dario',
  'Técnico: Paulo Motta': 'Paulo Motta',
};

const MAPA_FORNECEDORES = {
  'Auto Posto 2001': 'AUTO POSTO 2001',
  'Auto Tintas Piraju LTDA': 'AUTO TINTAS PIRAJU LTDA',
  'Barrado': 'AUTO PEÇAS BARRADÃO',
  'Carlos Pneus': 'CARLINHOS PNEU',
  'Jeferson Climatização': 'JEFFERSON CLIMATIZAÇÃO',
  'Kadu Ferramentas': 'KADU FERRAMENTAS E MATERIAIS',
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
  'Borracharia Móvel': 'BORRACHARIA MÓVEL',
  'Favaro Pneus': 'FAVARO PNEUS',
  'Rafael Pitoco': 'RAFAEL PITOCO',
  'Walter Auto Elétrica': 'WALTER AUTO ELÉTRICA',
  'Magic Tintas': 'MAGIC TINTAS',
  'Tio Toko': 'TIO TOKO',
  'Arcofel': 'ARCOFEL',
  'Flavio Wolf': 'FLAVIO WOLF',
  'Gerson Auto Peças': 'GERSON AUTO PEÇAS',
  'Alê Soluções Auto': 'ALÊ SOLUÇÕES AUTO',
  'União de Tintas': 'UNIÃO DE TINTAS',
  'Eletro Service': 'ELETRO SERVICE',
  'Papelaria CGC': 'PAPELARIA CGC',
  'Auto Center Eliseu': 'AUTO CENTER ELISEU',
  'Moto Sport': 'MOTO SPORT',
  'Radiadores Amantini': 'RADIADORES AMANTINI',
  'CTM Autronica': 'CTM AUTRONICA',
  'Borracharia Miguel': 'BORRACHARIA MIGUEL',
  'Pet Shop Animal Feliz': 'PET SHOP ANIMAL FELIZ',
  'Cobra Rolamentos e Autopeças': 'COBRA ROLAMENTOS E AUTOPEÇAS',
  'Cobra Rolamentos e Auto Peças': 'COBRA ROLAMENTOS E AUTO PEÇAS',
  'Agrofertil': 'AGROFERTIL',
  'Odapel Auto Peças': 'ODAPEL AUTO PEÇAS',
  'Proeste': 'PROESTE',
  'Uniparts': 'UNIPARTS',
  'NR Ferramentas': 'NR FERRAMENTAS',
  'Outros...': null,
  'Alex': null,
};

// ===================== PIPEFY API =====================

async function pipefyQuery(query) {
  const res = await fetch('https://api.pipefy.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PIPEFY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors) console.error('GraphQL errors:', JSON.stringify(json.errors));
  return json.data;
}

async function fetchAllCardsFromPhase(phaseId, phaseName) {
  let allCards = [];
  let cursor = null;
  let page = 0;

  while (true) {
    page++;
    const afterClause = cursor ? `, after: "${cursor}"` : '';
    const query = `{
      phase(id: ${phaseId}) {
        cards(first: 50${afterClause}) {
          edges {
            node {
              id
              title
              createdAt
              fields {
                name
                field { id }
                value
              }
              attachments { url path }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    }`;

    const data = await pipefyQuery(query);
    const edges = data?.phase?.cards?.edges || [];
    const pageInfo = data?.phase?.cards?.pageInfo;

    for (const edge of edges) {
      const card = edge.node;
      const fieldsMap = {};
      for (const f of card.fields) {
        fieldsMap[f.field.id] = f.value;
      }
      allCards.push({
        pipefy_id: card.id,
        title: card.title,
        phase: phaseName,
        createdAt: card.createdAt,
        attachments: card.attachments || [],
        ...fieldsMap,
      });
    }

    console.log(`  ${phaseName} - página ${page}: ${edges.length} cards`);
    if (!pageInfo?.hasNextPage) break;
    cursor = pageInfo.endCursor;
  }

  return allCards;
}

// ===================== DOWNLOAD + UPLOAD DE ANEXOS =====================

function extrairUrls(valor) {
  if (!valor) return [];
  try {
    const parsed = JSON.parse(valor);
    if (Array.isArray(parsed)) return parsed.filter(u => u.startsWith('http'));
  } catch (e) {}
  if (valor.startsWith('http')) return [valor];
  return [];
}

async function baixarESubir(url, reqId, fieldName) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'application/octet-stream';

    // Extrair extensão do nome do arquivo na URL
    const urlPath = new URL(url).pathname;
    const nomeArquivo = urlPath.split('/').pop() || 'arquivo';
    const ext = nomeArquivo.includes('.') ? nomeArquivo.split('.').pop() : 'bin';
    const fileName = `${reqId}-${fieldName}-pipefy.${ext}`;

    const { error } = await supabase.storage
      .from('requisicoes')
      .upload(fileName, buffer, { contentType, upsert: true });

    if (error) {
      console.error(`    Upload erro (${fileName}):`, error.message);
      return null;
    }

    return fileName;
  } catch (err) {
    console.error(`    Download/Upload erro:`, err.message);
    return null;
  }
}

// ===================== MAIN =====================

async function main() {
  console.log('\n========================================');
  console.log('  SYNC PIPEFY → SUPABASE');
  console.log('========================================\n');
  if (DRY_RUN) console.log('*** MODO DRY-RUN: nada será alterado ***\n');

  // 1. Buscar cards do Pipefy (ou usar cache)
  let allCards;
  if (USE_CACHE && existsSync('pipefy-dump.json')) {
    allCards = JSON.parse(readFileSync('pipefy-dump.json', 'utf8'));
    console.log(`Usando cache: ${allCards.length} cards de pipefy-dump.json`);
  } else {
    console.log('--- Buscando cards do Pipefy ---');
    allCards = [];
    for (const phase of PHASES) {
      const cards = await fetchAllCardsFromPhase(phase.id, phase.name);
      allCards = allCards.concat(cards);
    }
    writeFileSync('pipefy-dump.json', JSON.stringify(allCards, null, 2));
    console.log(`\nTotal: ${allCards.length} cards. Dump salvo em pipefy-dump.json`);
  }

  const pipefyMap = {};
  for (const card of allCards) pipefyMap[card.pipefy_id] = card;

  // 2. Buscar registros migrados no Supabase
  console.log('\n--- Buscando registros migrados no Supabase ---');
  let migrados = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('Requisicao')
      .select('id, obs, solicitante, fornecedor, numero_nota, valor_despeza, veiculo, hodometro, cliente, ordem_servico, valor_cobrado_cliente, foto_nf, recibo_fornecedor, tipo, setor')
      .like('obs', '%[MIGRADO_ID:%')
      .range(from, from + 999);
    if (error) { console.error('Erro Supabase:', error.message); return; }
    migrados = migrados.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  console.log(`Registros migrados no banco: ${migrados.length}`);

  // 3. Cruzar e atualizar
  console.log('\n--- Cruzando dados ---');
  let atualizados = 0;
  let semMatch = 0;
  let semAlteracao = 0;
  let anexosBaixados = 0;
  const detalhes = [];

  for (const reg of migrados) {
    const match = reg.obs.match(/\[MIGRADO_ID:(\d+)\]/);
    if (!match) continue;

    const idPipefy = match[1];
    const card = pipefyMap[idPipefy];
    if (!card) { semMatch++; continue; }

    const updates = {};

    // --- Fornecedor ---
    const fornPipefy = (card.fornecedor_final_1 || card.forncedor_final || '').trim();
    if (fornPipefy && !reg.fornecedor) {
      if (MAPA_FORNECEDORES[fornPipefy] === null) {
        // "Outros..." / "Alex" -> ignorar
      } else {
        updates.fornecedor = MAPA_FORNECEDORES[fornPipefy] || fornPipefy.toUpperCase();
      }
    }

    // --- Número da nota ---
    const notaPipefy = (card.n_mero_nota || card.n_mero_nota_fiscal || '').trim();
    if (notaPipefy && !reg.numero_nota) {
      updates.numero_nota = notaPipefy;
    }

    // --- Valor ---
    const valorPipefy = (card.valor_da_nota_1 || card.valor_da_requisi_o || card.valor_do_item || '').trim();
    if (valorPipefy && (!reg.valor_despeza || reg.valor_despeza === '0,00' || reg.valor_despeza === '0' || reg.valor_despeza === null)) {
      updates.valor_despeza = valorPipefy;
    }

    // --- Solicitante ---
    const solPipefy = (card.solicitante_1 || '').trim();
    if (solPipefy && !reg.solicitante) {
      updates.solicitante = MAPA_SOLICITANTES[solPipefy] || solPipefy;
    }

    // --- Veículo (ignorar arrays vazios []) ---
    const veiPipefy = (card.veiculos || card.placa_do_carro || '').trim();
    if (veiPipefy && veiPipefy !== '[]' && !reg.veiculo) {
      updates.veiculo = veiPipefy;
    }

    // --- Hodômetro (ignorar zeros) ---
    const hodPipefy = (card.hodometro || '').trim();
    const hodNumerico = parseInt(hodPipefy);
    if (hodPipefy && hodNumerico > 0 && (!reg.hodometro || reg.hodometro === '' || reg.hodometro === '0' || reg.hodometro === null)) {
      updates.hodometro = hodPipefy;
    }

    // --- Cliente ---
    const cliPipefy = (card.cliente || '').trim();
    if (cliPipefy && !reg.cliente) {
      updates.cliente = cliPipefy;
    }

    // --- Ordem de Serviço ---
    const osPipefy = (card.n_mero_da_os_1 || '').trim();
    if (osPipefy && osPipefy !== '0' && !reg.ordem_servico) {
      updates.ordem_servico = osPipefy;
    }

    // --- Valor cobrado cliente (ignorar 0,00) ---
    const vcPipefy = (card.valor_cobrado || '').trim();
    const vcNum = parseFloat(vcPipefy.replace(',', '.'));
    if (vcPipefy && vcNum > 0 && (!reg.valor_cobrado_cliente || reg.valor_cobrado_cliente === '0,00' || reg.valor_cobrado_cliente === null)) {
      updates.valor_cobrado_cliente = vcPipefy;
    }

    // --- Anexos: Nota Fiscal / Recibo ---
    const nfRaw = (card.recibo_nota_fiscal_fornecedor || card.recibo_nota_fiscal_do_fornecedor || '').trim();
    const nfUrls = extrairUrls(nfRaw);

    if (nfUrls.length > 0 && !reg.foto_nf && !DRY_RUN) {
      const storagePath = await baixarESubir(nfUrls[0], reg.id, 'foto_nf');
      if (storagePath) {
        updates.foto_nf = storagePath;
        anexosBaixados++;
        console.log(`  Anexo baixado: Req #${reg.id} -> ${storagePath}`);
      }
    } else if (nfUrls.length > 0 && !reg.foto_nf && DRY_RUN) {
      updates.foto_nf = '[PENDENTE_DOWNLOAD]';
    }

    // Segundo anexo vai pro recibo_fornecedor se disponível
    if (nfUrls.length > 1 && !reg.recibo_fornecedor && !DRY_RUN) {
      const storagePath2 = await baixarESubir(nfUrls[1], reg.id, 'recibo_fornecedor');
      if (storagePath2) {
        updates.recibo_fornecedor = storagePath2;
        anexosBaixados++;
      }
    }

    if (Object.keys(updates).length === 0) {
      semAlteracao++;
      continue;
    }

    detalhes.push({ id: reg.id, pipefy_id: idPipefy, title: card.title, updates });

    if (!DRY_RUN) {
      const { error } = await supabase.from('Requisicao').update(updates).eq('id', reg.id);
      if (error) {
        console.error(`  ERRO ID ${reg.id}:`, error.message);
      } else {
        atualizados++;
      }
    } else {
      atualizados++;
    }
  }

  // 4. Relatório
  console.log('\n========================================');
  console.log('  RESULTADO');
  console.log('========================================');
  console.log(`Total migrados no banco:       ${migrados.length}`);
  console.log(`Match com Pipefy:              ${migrados.length - semMatch}`);
  console.log(`Sem match (ID não encontrado): ${semMatch}`);
  console.log(`Já completo (sem alteração):   ${semAlteracao}`);
  console.log(`Registros atualizados:         ${atualizados}`);
  console.log(`Anexos baixados/enviados:      ${anexosBaixados}`);

  // Breakdown por campo
  const campos = {};
  for (const d of detalhes) {
    for (const k of Object.keys(d.updates)) {
      campos[k] = (campos[k] || 0) + 1;
    }
  }
  console.log('\n--- Campos atualizados ---');
  Object.entries(campos).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k}: ${v}`);
  });

  if (detalhes.length > 0) {
    console.log('\n--- AMOSTRA (primeiros 10) ---');
    detalhes.slice(0, 10).forEach(d => {
      console.log(`\n  Req #${d.id} (Pipefy: ${d.pipefy_id}) "${d.title}"`);
      Object.entries(d.updates).forEach(([k, v]) => {
        const display = String(v).length > 80 ? String(v).substring(0, 80) + '...' : v;
        console.log(`    ${k}: ${display}`);
      });
    });

    writeFileSync('sync-report.json', JSON.stringify(detalhes, null, 2));
    console.log(`\nRelatório completo: sync-report.json (${detalhes.length} registros)`);
  }

  if (DRY_RUN) {
    console.log('\n*** DRY-RUN. Rode sem --dry-run para aplicar. ***');
  }
}

main().catch(console.error);
