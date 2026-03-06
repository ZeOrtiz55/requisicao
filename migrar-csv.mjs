// Script de migração: lê CSV e insere no Supabase (tabela Requisicao)
//
// PASSO 1: Salve sua tabela como CSV (separador TAB) no arquivo "dados-antigos.csv"
// PASSO 2: Preencha as credenciais abaixo (ou use .env)
// PASSO 3: Execute: node migrar-csv.mjs
//
// Para testar SEM inserir no banco, use: node migrar-csv.mjs --dry-run

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// ---- CREDENCIAIS ----
// Tenta ler do .env.local se existir
let envVars = {};
try {
  const envFile = readFileSync('.env.local', 'utf-8');
  envFile.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) envVars[key.trim()] = rest.join('=').trim();
  });
} catch (e) { /* sem .env.local */ }

const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'COLE_AQUI';
const SUPABASE_KEY = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'COLE_AQUI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const DRY_RUN = process.argv.includes('--dry-run');

// ===================== MAPEAMENTOS =====================

function mapearStatus(fase) {
  if (!fase) return 'aguardando';
  const f = fase.trim();
  if (['Custo-Cobrado Cliente', 'Despesa- Concluida', 'FERRAMENTAS ESTOQUE'].includes(f)) return 'financeiro';
  if (f === 'Negadas') return 'lixeira';
  return 'aguardando';
}

function mapearTipo(tipoReq) {
  if (!tipoReq) return 'Peça';
  const t = tipoReq.trim();
  const mapa = {
    'Veicular': 'Frota-Veiculos',
    'Serviço de Terceiro': 'Serviço de Terceiros',
    'Alimentação': 'Alimentação',
    'Ferramenta': 'Ferramenta',
    'Peça': 'Peça',
    'Peças': 'Peça',
    'Material Escritorio': 'Almoxarifado',
    'Ser': 'Serviço de Terceiros',
  };
  return mapa[t] || 'Peça';
}

function mapearSetor(etiqueta) {
  if (!etiqueta) return 'Oficina';
  const primeira = etiqueta.split(',')[0].trim();
  const mapa = {
    'Comercial': 'Comercial',
    'Consumo Oficina': 'Oficina',
    'Cobrado do Cliente': 'Trator-Cliente',
    'GARANTIA': 'Trator-Cliente',
    'Infraestrutura': 'Comercial',
    'Frota': 'Oficina',
    'Trator Novo': 'Trator-Loja',
    'Almoxarifado/Limpeza': 'Oficina',
    'Evento': 'Comercial',
    'Baixa': 'Comercial',
    'Comercial, Frota': 'Comercial',
    'Evento, Comercial': 'Comercial',
  };
  return mapa[primeira] || 'Oficina';
}

function converterData(dataStr) {
  if (!dataStr) return null;
  const partes = dataStr.trim().split('/');
  if (partes.length === 3) {
    return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
  }
  return null;
}

// ===================== LER CSV =====================

// Parser que respeita campos entre aspas (ex: "texto com, vírgula")
function parseCSVLine(line, sep) {
  const campos = [];
  let atual = '';
  let dentroAspas = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (dentroAspas && line[i + 1] === '"') {
        atual += '"'; // aspas escapadas ""
        i++;
      } else {
        dentroAspas = !dentroAspas;
      }
    } else if (ch === sep && !dentroAspas) {
      campos.push(atual.trim());
      atual = '';
    } else {
      atual += ch;
    }
  }
  campos.push(atual.trim());
  return campos;
}

function lerCSV(caminho) {
  const conteudo = readFileSync(caminho, 'utf-8');
  const linhas = conteudo.split('\n').filter(l => l.trim());

  if (linhas.length < 2) {
    console.error('CSV vazio ou sem dados');
    process.exit(1);
  }

  // Detecta separador: TAB > ; > ,
  const header = linhas[0];
  let separador;
  if (header.includes('\t')) separador = '\t';
  else if (header.split(';').length > 5) separador = ';';
  else separador = ',';

  const colunas = parseCSVLine(header, separador);
  console.log(`Colunas detectadas (${colunas.length}):`, colunas.slice(0, 10).join(' | '), '...');
  console.log(`Separador: ${separador === '\t' ? 'TAB' : separador === ',' ? 'VÍRGULA' : separador}`);

  // Índices das colunas que nos interessam
  const idx = {
    id: colunas.findIndex(c => c === 'ID'),
    titulo: colunas.findIndex(c => c === 'Título' || c === 'Titulo'),
    data: colunas.findIndex(c => c === 'Criado em' || c === 'Criado_em'),
    fase: colunas.findIndex(c => c === 'Fase'),
    etiqueta: colunas.findIndex(c => c === 'Etiquetas'),
    tipo_req: colunas.findIndex(c => c === 'Tipo de requisição' || c === 'Tipo_de_requisicao' || c.includes('Tipo de requis')),
    solicitante: colunas.findIndex(c => c === 'Solicitante'),
    tipo_veic: colunas.findIndex(c => c === 'Tipo Veicular' || c.includes('Tipo Veicular')),
    litros: colunas.findIndex(c => c === 'Litros Usados' || c.includes('Litros')),
    veiculos: colunas.findIndex(c => c === 'Veiculos'),
    hodometro: colunas.findIndex(c => c === 'Hodometro'),
    autorizado: colunas.findIndex(c => c === 'Autorizado Por' || c.includes('Autorizado')),
    valor: colunas.findIndex(c => c === 'Valor (R$)' || c.includes('Valor')),
    num_nota: colunas.findIndex(c => c === 'Nº DA NOTA' || c.includes('NOTA')),
    fornecedor: colunas.findIndex(c => c === 'FORNECEDOR'),
    valor_nota: colunas.findIndex(c => c === 'VALOR DA NOTA' || c.includes('VALOR DA NOTA')),
    aguardando: colunas.findIndex(c => c.includes('aguardado')),
    categoria: colunas.findIndex(c => c === 'Categoria'),
  };

  console.log('\nÍndices encontrados:');
  Object.entries(idx).forEach(([k, v]) => {
    if (v >= 0) console.log(`  ${k}: coluna ${v} ("${colunas[v]}")`);
  });

  const registros = [];
  for (let i = 1; i < linhas.length; i++) {
    const campos = parseCSVLine(linhas[i], separador);

    const get = (index) => index >= 0 && index < campos.length ? campos[index]?.trim() : '';

    const id_antigo = get(idx.id);
    const titulo = get(idx.titulo);

    // Pula linhas sem ID ou título
    if (!id_antigo && !titulo) continue;

    registros.push({
      id_antigo,
      titulo,
      data: get(idx.data),
      fase: get(idx.fase),
      etiqueta: get(idx.etiqueta),
      tipo_req: get(idx.tipo_req),
      solicitante: get(idx.solicitante),
      tipo_veic: get(idx.tipo_veic),
      veiculo: get(idx.veiculos),
      hodometro: get(idx.hodometro),
      valor: get(idx.valor),
      num_nota: get(idx.num_nota),
      fornecedor: get(idx.fornecedor),
      valor_nota: get(idx.valor_nota),
    });
  }

  return registros;
}

// ===================== TRANSFORMAR E INSERIR =====================

async function migrar() {
  console.log('\n========================================');
  console.log('  MIGRAÇÃO DE DADOS PARA O SUPABASE');
  console.log('========================================\n');

  if (DRY_RUN) console.log('*** MODO DRY-RUN: nada será inserido no banco ***\n');

  // Lê o CSV
  let dadosBrutos;
  try {
    dadosBrutos = lerCSV('dados-antigos.csv');
  } catch (e) {
    console.error('\nERRO: Não encontrei o arquivo "dados-antigos.csv"');
    console.error('Salve sua tabela como CSV (separador TAB) nesse nome e tente novamente.');
    console.error('No Excel/Google Sheets: Arquivo > Baixar como > CSV (.csv)');
    process.exit(1);
  }

  console.log(`\nRegistros lidos do CSV: ${dadosBrutos.length}`);

  // Transforma
  const registros = dadosBrutos.map((d) => {
    const status = mapearStatus(d.fase);
    const tipo = mapearTipo(d.tipo_req);
    const setor = mapearSetor(d.etiqueta);
    const data = converterData(d.data);

    // Observações com contexto original
    const obs_partes = [];
    if (d.tipo_veic) obs_partes.push(`Tipo Veicular: ${d.tipo_veic}`);
    if (d.fase && !['Despesa- Concluida', 'Custo-Cobrado Cliente'].includes(d.fase.trim())) {
      obs_partes.push(`Fase original: ${d.fase}`);
    }
    obs_partes.push(`[MIGRADO_ID:${d.id_antigo}]`);

    const registro = {
      titulo: (d.titulo || 'SEM TÍTULO').toUpperCase().trim(),
      data: data,
      status: status,
      tipo: tipo,
      setor: setor,
      veiculo: d.veiculo || null,
      hodometro: d.hodometro || null,
      fornecedor: d.fornecedor || null,
      numero_nota: d.num_nota || null,
      valor_despeza: d.valor || d.valor_nota || '0,00',
      obs: obs_partes.join(' | '),
    };

    // Se status=financeiro, coloca data de envio = data original
    if (status === 'financeiro') {
      registro.enviado_financeiro_data = data;
    }

    return registro;
  });

  // Preview dos primeiros 5
  console.log('\n--- PREVIEW (primeiros 5 registros) ---');
  registros.slice(0, 5).forEach((r, i) => {
    console.log(`\n[${i + 1}] ${r.titulo}`);
    console.log(`    Data: ${r.data} | Status: ${r.status} | Tipo: ${r.tipo} | Setor: ${r.setor}`);
    if (r.veiculo) console.log(`    Veículo: ${r.veiculo} | Hodômetro: ${r.hodometro}`);
    if (r.fornecedor) console.log(`    Fornecedor: ${r.fornecedor}`);
  });

  // Contadores por status
  const porStatus = {};
  registros.forEach(r => { porStatus[r.status] = (porStatus[r.status] || 0) + 1; });
  console.log('\n--- DISTRIBUIÇÃO POR STATUS ---');
  Object.entries(porStatus).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  const porTipo = {};
  registros.forEach(r => { porTipo[r.tipo] = (porTipo[r.tipo] || 0) + 1; });
  console.log('\n--- DISTRIBUIÇÃO POR TIPO ---');
  Object.entries(porTipo).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  if (DRY_RUN) {
    console.log('\n*** DRY-RUN completo. Rode sem --dry-run para inserir. ***');
    return;
  }

  // Inserir em lotes
  console.log('\n--- INSERINDO NO SUPABASE ---');
  const LOTE = 50;
  let sucesso = 0;
  let erros = 0;

  for (let i = 0; i < registros.length; i += LOTE) {
    const lote = registros.slice(i, i + LOTE);
    const { data, error } = await supabase.from('Requisicao').insert(lote).select('id');

    if (error) {
      console.error(`  ERRO lote ${i + 1}-${i + lote.length}: ${error.message}`);
      // Tenta inserir um por um para identificar o problemático
      for (const reg of lote) {
        const { error: errUnit } = await supabase.from('Requisicao').insert([reg]);
        if (errUnit) {
          console.error(`    FALHA: "${reg.titulo}" - ${errUnit.message}`);
          erros++;
        } else {
          sucesso++;
        }
      }
    } else {
      sucesso += lote.length;
      console.log(`  Lote ${i + 1}-${i + lote.length}: OK (${lote.length} registros)`);
    }
  }

  console.log('\n========================================');
  console.log(`  RESULTADO FINAL`);
  console.log(`  Sucesso: ${sucesso}`);
  console.log(`  Erros:   ${erros}`);
  console.log(`  Total:   ${registros.length}`);
  console.log('========================================\n');
}

migrar().catch(console.error);
