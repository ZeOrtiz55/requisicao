// Script de migração: dados-novos.csv -> Supabase (tabela Requisicao)
// Executar: node migrar-novos.mjs

import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';
import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://citrhumdkfivdzbmayde.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_0dpYhnJLqEdBSNk-2Ec_og_OqlmQI7Z';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===================== MAPEAMENTOS =====================

function mapearStatus(fase) {
  if (!fase) return 'aguardando';
  const f = fase.trim();
  const paraFinanceiro = ['Custo-Cobrado Cliente', 'Despesa- Concluida'];
  if (paraFinanceiro.includes(f)) return 'financeiro';
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
  const primeira = etiqueta.trim().split(',')[0].trim();
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

function limparValor(val) {
  if (!val || val === '0') return '0,00';
  let v = String(val).trim();
  if (!v) return '0,00';
  return v;
}

// ===================== MIGRAÇÃO =====================

async function migrar() {
  const csv = fs.readFileSync('dados-novos.csv', 'utf8');
  const registros = parse(csv, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
  });

  console.log(`\n=== MIGRAÇÃO DE DADOS (dados-novos.csv) ===`);
  console.log(`Total de registros no CSV: ${registros.length}\n`);

  const mapeados = registros.map((r) => {
    const status = mapearStatus(r['Fase Atual']);
    const tipo = mapearTipo(r['Tipo de requisição']);
    const setor = mapearSetor(r['Etiquetas']);
    const data = converterData(r['Criado em']);

    // Consolidar fornecedor (3 colunas possíveis)
    const fornecedor = (r['Fornecedor Final'] || r['Forncedor Final'] || r['FORNECEDOR'] || '').trim();

    // Consolidar valor (3 colunas possíveis)
    const valorNota = limparValor(r['Valor da Nota Fiscal'] || r['Valor da Requisição'] || r['VALOR DA NOTA'] || '');

    // Consolidar número da nota (3 colunas possíveis)
    const numeroNota = (r['Número Nota'] || r['Número Nota Fiscal'] || r['Nº DA NOTA'] || '').trim();

    // Consolidar recibo/nota fiscal URL (2 colunas)
    const reciboUrl = (r['Recibo/Nota fiscal Fornecedor'] || r['Recibo/Nota Fiscal do Fornecedor'] || '').trim();

    // Veículo - pode vir de 2 colunas
    const veiculo = (r['Veiculos'] || r['Placa do Carro-Template'] || '').trim();

    // Hodômetro
    const hodometro = (r['Hodometro'] || '').trim();

    // Destinação da ferramenta: se "SIM" em uso oficina = Geral, senão = Uso Pessoal
    const usoOficina = (r['UTILIZADO PARA MANUTENÇÃO DE ALGO DA OFICINA'] || '').trim().toUpperCase();
    const quemFerramenta = tipo === 'Ferramenta'
      ? (usoOficina === 'SIM' ? 'Geral' : usoOficina === 'NÃO' || usoOficina === 'NAO' ? 'Uso Pessoal' : '')
      : '';

    // Observações - junta info extra
    const partes_obs = [];
    if (r['Tipo Veicular']) partes_obs.push(`Tipo Veicular: ${r['Tipo Veicular'].trim()}`);
    if (r['Fase Atual']) partes_obs.push(`Fase original: ${r['Fase Atual'].trim()}`);
    if (r['Etiquetas']) partes_obs.push(`Etiqueta: ${r['Etiquetas'].trim()}`);
    if (r['Observação (Opcional)']) partes_obs.push(`Obs: ${r['Observação (Opcional)'].trim()}`);
    if (r['AUTORIZADO POR']) partes_obs.push(`Autorizado por: ${r['AUTORIZADO POR'].trim()}`);
    if (r['RESPONSÁVEL PELO CARRO']) partes_obs.push(`Resp. carro: ${r['RESPONSÁVEL PELO CARRO'].trim()}`);
    if (r['Litros Usados']) partes_obs.push(`Litros: ${r['Litros Usados'].trim()}`);
    if (r['Tipo Combustivel']) partes_obs.push(`Combustível: ${r['Tipo Combustivel'].trim()}`);
    if (r['Categoria']) partes_obs.push(`Categoria: ${r['Categoria'].trim()}`);
    partes_obs.push(`[MIGRADO_ID:${r['ID']}]`);

    return {
      titulo: (r['Título'] || '').toUpperCase().trim(),
      data: data,
      status: status,
      tipo: tipo,
      setor: setor,
      solicitante: (r['SOLICITANTE'] || '').trim().replace(/^Técnico:\s*/i, ''),
      veiculo: veiculo || null,
      hodometro: hodometro || null,
      valor_despeza: valorNota,
      fornecedor: fornecedor || null,
      numero_nota: numeroNota || null,
      cliente: (r['Cliente'] || '').trim() || null,
      ordem_servico: (r['Ordem de Serviço'] || '').trim() || null,
      valor_cobrado_cliente: limparValor(r['Valor cobrado do cliente'] || ''),
      foto_nf: reciboUrl || null,
      quem_ferramenta: quemFerramenta || null,
      obs: partes_obs.join(' | '),
    };
  });

  // Insere em lotes de 50
  const LOTE = 50;
  let sucesso = 0;
  let erros = 0;

  for (let i = 0; i < mapeados.length; i += LOTE) {
    const lote = mapeados.slice(i, i + LOTE);
    const { data, error } = await supabase.from('Requisicao').insert(lote).select('id');

    if (error) {
      console.error(`ERRO no lote ${i + 1}-${i + lote.length}:`, error.message);
      erros += lote.length;
    } else {
      sucesso += data.length;
      console.log(`Lote ${i + 1}-${i + lote.length}: ${data.length} registros inseridos`);
    }
  }

  console.log(`\n=== RESULTADO ===`);
  console.log(`Sucesso: ${sucesso}`);
  console.log(`Erros: ${erros}`);
  console.log(`Total: ${mapeados.length}`);
}

migrar().catch(console.error);
