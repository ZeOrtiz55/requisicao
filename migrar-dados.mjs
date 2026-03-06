// Script de migração dos dados antigos para o Supabase (tabela Requisicao)
// Executar: node migrar-dados.mjs

import { createClient } from '@supabase/supabase-js';

// PREENCHA COM SUAS CREDENCIAIS DO .env.local
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'COLE_AQUI_SUA_URL';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'COLE_AQUI_SUA_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===================== MAPEAMENTOS =====================

function mapearStatus(fase) {
  if (!fase) return 'aguardando';
  const f = fase.trim();
  const paraFinanceiro = [
    'Custo-Cobrado Cliente',
    'Despesa- Concluida',
    'FERRAMENTAS ESTOQUE',
  ];
  if (paraFinanceiro.includes(f)) return 'financeiro';
  if (f === 'Negadas') return 'lixeira';
  // "Aguardando- NF ou Aprovar", "Veiculos- Add no Rota Exata", etc
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
  const e = etiqueta.trim();
  // Pode ter múltiplas etiquetas separadas por vírgula
  const primeira = e.split(',')[0].trim();
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
  // DD/MM/YYYY -> YYYY-MM-DD
  const partes = dataStr.trim().split('/');
  if (partes.length === 3) {
    return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
  }
  return null;
}

function limparValor(val) {
  if (!val || val === '0') return '0,00';
  // Remove pontos de milhar e converte para formato brasileiro
  let v = String(val).trim();
  if (!v) return '0,00';
  // Se já tem vírgula, retorna como está
  if (v.includes(',')) return v;
  // Se tem ponto, pode ser decimal ou milhar
  // Valores como 179.628 -> provavelmente hodômetro/km, não valor monetário
  return v;
}

// ===================== DADOS =====================
// Cada linha da tabela colada pelo usuário

const dadosBrutos = [
  { id_antigo: "1309681584", titulo: "MANUTENÇÃO DOUGRAS EPX5402 - PNEUS, ALINHAMENTO E BALANCEAMENTO", data: "05/03/2026", fase: "Aguardando- NF ou Aprovar", etiqueta: "Comercial", tipo_req: "Veicular", tipo_veic: "Manutenção", veiculo: "EPX5402", hodometro: "179.628" },
  { id_antigo: "1309245964", titulo: "TROCA DE PNEU DIANTEIRO TT75F", data: "04/03/2026", fase: "Custo-Cobrado Cliente", etiqueta: "Cobrado do Cliente", tipo_req: "Serviço de Terceiro" },
  { id_antigo: "1309223905", titulo: "PRENSA DE MANGUEIRA E PARAFUSOS", data: "04/03/2026", fase: "Custo-Cobrado Cliente", etiqueta: "Cobrado do Cliente", tipo_req: "Serviço de Terceiro" },
  { id_antigo: "1309211638", titulo: "ABASTECIMENTO DOUGRAS EPX5402", data: "04/03/2026", fase: "Despesa- Concluida", etiqueta: "Comercial", tipo_req: "Veicular", tipo_veic: "Abastecimento", veiculo: "EPX5402", hodometro: "179.000" },
  { id_antigo: "1309208871", titulo: "ABASTECIMENTO DOUGLAS EPX5402", data: "04/03/2026", fase: "Despesa- Concluida", etiqueta: "Comercial", tipo_req: "Veicular", tipo_veic: "Abastecimento", veiculo: "EPX5402", hodometro: "178.600" },
  { id_antigo: "1308515239", titulo: "ABASTECIMENTO PEDRO PESSOAL", data: "03/03/2026", fase: "Aguardando- NF ou Aprovar", etiqueta: "Consumo Oficina", tipo_req: "Veicular", tipo_veic: "Abastecimento", hodometro: "0" },
  { id_antigo: "1308471394", titulo: "5 Litros de Gasolina (Pessoal Fernandinho)", data: "03/03/2026", fase: "Despesa- Concluida", etiqueta: "Consumo Oficina", tipo_req: "Serviço de Terceiro" },
  { id_antigo: "1308356807", titulo: "ALMOÇO SILVANA", data: "03/03/2026", fase: "Despesa- Concluida", etiqueta: "Consumo Oficina", tipo_req: "Alimentação" },
  { id_antigo: "1308353414", titulo: "ALMOÇO SILVANA PEDRO", data: "03/03/2026", fase: "Despesa- Concluida", etiqueta: "Consumo Oficina", tipo_req: "Alimentação" },
  { id_antigo: "1308348842", titulo: "ALMOÇO SILVANA", data: "03/03/2026", fase: "Despesa- Concluida", etiqueta: "Consumo Oficina", tipo_req: "Alimentação" },
  { id_antigo: "1308337919", titulo: "MANUTENÇÃO DLZ1967 COXIM", data: "03/03/2026", fase: "Despesa- Concluida", etiqueta: "Consumo Oficina", tipo_req: "Veicular", tipo_veic: "Manutenção", veiculo: "DLZ1967", hodometro: "190.452" },
  { id_antigo: "1308301188", titulo: "PARAFUSO SAVEIRO CÂMBIO", data: "03/03/2026", fase: "Despesa- Concluida", etiqueta: "Consumo Oficina", tipo_req: "Veicular", tipo_veic: "Manutenção", veiculo: "DLZ1967", hodometro: "191.100" },
  { id_antigo: "1308123547", titulo: "Almoço Silvana", data: "03/03/2026", fase: "Aguardando- NF ou Aprovar", etiqueta: "Consumo Oficina", tipo_req: "Alimentação" },
  { id_antigo: "1307931486", titulo: "Folha de Serra- Para uso geral da Oficina", data: "03/03/2026", fase: "Aguardando- NF ou Aprovar", etiqueta: "Consumo Oficina", tipo_req: "Ferramenta" },
  { id_antigo: "1307389368", titulo: "4 PNEUS PARA VOYAGE", data: "02/03/2026", fase: "Aguardando- NF ou Aprovar", etiqueta: "Comercial", tipo_req: "Veicular", tipo_veic: "Manutenção", veiculo: "SEB9J47", hodometro: "0" },
  { id_antigo: "1307325700", titulo: "GASOLINA QUADRICICLO", data: "02/03/2026", fase: "Despesa- Concluida", etiqueta: "Comercial", tipo_req: "Serviço de Terceiro" },
  { id_antigo: "1307305965", titulo: "MANUTENÇÃO CAMINHÃO EVG", data: "02/03/2026", fase: "Despesa- Concluida", etiqueta: "Comercial", tipo_req: "Veicular", tipo_veic: "Manutenção", veiculo: "EVG1E67", hodometro: "0" },
  { id_antigo: "1307227580", titulo: "MATERIAL PARA PINTURA FACHADA LOJA", data: "02/03/2026", fase: "Despesa- Concluida", etiqueta: "Comercial", tipo_req: "Ferramenta" },
  { id_antigo: "1307193275", titulo: "MANUTENÇÃO CAMBIO DLZ1967", data: "02/03/2026", fase: "Despesa- Concluida", etiqueta: "Consumo Oficina", tipo_req: "Veicular", tipo_veic: "Manutenção", veiculo: "DLZ1967", hodometro: "190.452" },
  { id_antigo: "1306929555", titulo: "ABASTECIMENTO POLO", data: "02/03/2026", fase: "Despesa- Concluida", etiqueta: "Comercial", tipo_req: "Veicular", tipo_veic: "Abastecimento", hodometro: "0" },
  { id_antigo: "1306076208", titulo: "Gasolina Nicolas", data: "28/02/2026", fase: "Aguardando- NF ou Aprovar", etiqueta: "Consumo Oficina", tipo_req: "Veicular", tipo_veic: "Abastecimento", hodometro: "0" },
  { id_antigo: "1306038230", titulo: "1L DE PRETO CADILAC PU, FUNDO PU E CAIXA DE SPRAY SEMI BRILHO", data: "28/02/2026", fase: "Aguardando- NF ou Aprovar", etiqueta: "Consumo Oficina", tipo_req: "Ferramenta" },
  { id_antigo: "1305558876", titulo: "MANUTENÇÃO S10 DIRETOR", data: "27/02/2026", fase: "Despesa- Concluida", etiqueta: "Comercial", tipo_req: "Veicular", tipo_veic: "Manutenção", veiculo: "GIH0I50", hodometro: "167.416" },
  { id_antigo: "1305420070", titulo: "REPARO PNEU EPX-5475", data: "27/02/2026", fase: "Aguardando- NF ou Aprovar", etiqueta: "Consumo Oficina", tipo_req: "Veicular", tipo_veic: "Manutenção", veiculo: "EPX5475", hodometro: "0" },
  { id_antigo: "1305191728", titulo: "ÓLEO 80W90 CARRO ZECA", data: "27/02/2026", fase: "Veiculos- Add no Rota Exata", etiqueta: "Consumo Oficina", tipo_req: "Veicular", tipo_veic: "Manutenção", veiculo: "DLZ1967", hodometro: "190.356" },
  { id_antigo: "1304830543", titulo: "CONSERTO PNEU AQJ3H59", data: "26/02/2026", fase: "Despesa- Concluida", etiqueta: "Comercial", tipo_req: "Serviço de Terceiro" },
  { id_antigo: "1304788559", titulo: "Abastecimento para o Dougras", data: "26/02/2026", fase: "Despesa- Concluida", etiqueta: "Comercial", tipo_req: "Veicular", tipo_veic: "Abastecimento", hodometro: "0" },
  { id_antigo: "1304785443", titulo: "2 Parafuso guia para o cambio-DLZ1967", data: "26/02/2026", fase: "Aguardando- NF ou Aprovar", etiqueta: "Consumo Oficina", tipo_req: "Veicular", tipo_veic: "Manutenção", veiculo: "DLZ1967", hodometro: "0" },
  { id_antigo: "1304731467", titulo: "KIT EMBREAGEM DLZ1967", data: "26/02/2026", fase: "Despesa- Concluida", etiqueta: "Consumo Oficina", tipo_req: "Veicular", tipo_veic: "Manutenção", veiculo: "DLZ1967", hodometro: "190.356" },
  { id_antigo: "1304700547", titulo: "ABRAÇADEIRA E MANGUEIRA ANA SILLA", data: "26/02/2026", fase: "Custo-Cobrado Cliente", etiqueta: "Cobrado do Cliente", tipo_req: "Peça" },
  { id_antigo: "1303997635", titulo: "4 METROS DE MAGUEIRA E 10 ABRAÇADEIRAS PARA ANA SILLA (RETROESCAVADEIRA)", data: "25/02/2026", fase: "Aguardando- NF ou Aprovar", etiqueta: "Cobrado do Cliente", tipo_req: "Peça" },
  { id_antigo: "1303990953", titulo: "Abastimento para saveiro do Douglas Vendedor", data: "25/02/2026", fase: "Despesa- Concluida", etiqueta: "Comercial", tipo_req: "Veicular", tipo_veic: "Abastecimento", hodometro: "0" },
  { id_antigo: "1303336572", titulo: "OLHAL PARA SERVIÇO TRATOR CORCOVIA", data: "24/02/2026", fase: "Custo-Cobrado Cliente", etiqueta: "Consumo Oficina", tipo_req: "Peça" },
  { id_antigo: "1303273158", titulo: "CHUMBINHO SNIPER", data: "24/02/2026", fase: "Despesa- Concluida", etiqueta: "Consumo Oficina", tipo_req: "Peça" },
  { id_antigo: "1303022992", titulo: "MATERIAL PINTURA PARA BARRACÃO", data: "24/02/2026", fase: "Despesa- Concluida", etiqueta: "Infraestrutura", tipo_req: "Ferramenta" },
  { id_antigo: "1302669059", titulo: "ALMOÇO SILVANA PEDRO", data: "24/02/2026", fase: "Aguardando- NF ou Aprovar", etiqueta: "Consumo Oficina", tipo_req: "Alimentação" },
  { id_antigo: "1302408518", titulo: "Óleo para o Câmbio do Nicolas", data: "24/02/2026", fase: "Aguardando- NF ou Aprovar", etiqueta: "Consumo Oficina", tipo_req: "Veicular", tipo_veic: "Manutenção", veiculo: "FXM4G90", hodometro: "0" },
  { id_antigo: "1301948059", titulo: "MATERIAL PINTURA FACHADA LOJA", data: "23/02/2026", fase: "Despesa- Concluida", etiqueta: "Infraestrutura", tipo_req: "Ferramenta" },
  { id_antigo: "1301922584", titulo: "ABASTECIMENTO MOTO PEDRO (IRMÃO DO PAULO)", data: "23/02/2026", fase: "Aguardando- NF ou Aprovar", etiqueta: "Consumo Oficina", tipo_req: "Veicular", tipo_veic: "Abastecimento", hodometro: "0" },
  { id_antigo: "1301724155", titulo: "RAÇÃO PANDORA SPECIAL DOG", data: "23/02/2026", fase: "Despesa- Concluida", etiqueta: "Comercial", tipo_req: "Alimentação" },
  { id_antigo: "1301691841", titulo: "Aroela do bujão do carter- para trocar o oleo de caminhao", data: "23/02/2026", fase: "Despesa- Concluida", etiqueta: "Comercial", tipo_req: "Veicular", tipo_veic: "Manutenção", veiculo: "EVG1E67", hodometro: "246.275" },
  { id_antigo: "1301564132", titulo: "PARAFUSO PARA FIXAÇÃO DO RABICHO SW4", data: "23/02/2026", fase: "Despesa- Concluida", etiqueta: "Comercial", tipo_req: "Peça" },
  { id_antigo: "1301297078", titulo: "2L Oleo Motor para a Strada Nicolas", data: "23/02/2026", fase: "Aguardando- NF ou Aprovar", etiqueta: "Consumo Oficina", tipo_req: "Veicular", tipo_veic: "Manutenção", veiculo: "FXM4G90", hodometro: "0" },
  { id_antigo: "1301292371", titulo: "Abastecimento Saveiro Paulo- (Cartão deu erro)", data: "23/02/2026", fase: "Aguardando- NF ou Aprovar", etiqueta: "Consumo Oficina", tipo_req: "Veicular", tipo_veic: "Abastecimento", veiculo: "TKY6E68", hodometro: "34.969" },
  { id_antigo: "1301262185", titulo: "Parafuso oco 14 MM (Teste Bomba Injetora)", data: "23/02/2026", fase: "Aguardando- NF ou Aprovar", etiqueta: "Consumo Oficina", tipo_req: "Peça" },
  { id_antigo: "1300780681", titulo: "CERA PARA CARROS", data: "21/02/2026", fase: "Aguardando- NF ou Aprovar", etiqueta: "Consumo Oficina", tipo_req: "Veicular", tipo_veic: "Manutenção", hodometro: "0" },
  { id_antigo: "1300759860", titulo: "MANUTENÇÃO S10", data: "21/02/2026", fase: "Despesa- Concluida", etiqueta: "Comercial", tipo_req: "Veicular", tipo_veic: "Manutenção", veiculo: "GIH0I50", hodometro: "0" },
  { id_antigo: "1300756344", titulo: "MANUTENÇÃO TRATOR ESTOQUE", data: "21/02/2026", fase: "Despesa- Concluida", etiqueta: "Comercial", tipo_req: "Peça" },
  { id_antigo: "1300752748", titulo: "PARAFUSO PARA TRATOR ADNEI", data: "21/02/2026", fase: "Custo-Cobrado Cliente", etiqueta: "Cobrado do Cliente", tipo_req: "Peça" },
  { id_antigo: "1300751301", titulo: "ABASTECIMENTO CARRO", data: "21/02/2026", fase: "Aguardando- NF ou Aprovar", etiqueta: "Comercial", tipo_req: "Veicular", tipo_veic: "Abastecimento", hodometro: "0" },
  { id_antigo: "1300071199", titulo: "Lima Rotativa e Limite para Engraxar (Serviço Edmar Bernardes)", data: "20/02/2026", fase: "Custo-Cobrado Cliente", etiqueta: "GARANTIA", tipo_req: "Ferramenta" },
];

// ===================== TRANSFORMAÇÃO E INSERT =====================

async function migrar() {
  console.log(`\n=== MIGRAÇÃO DE DADOS ===`);
  console.log(`Total de registros para migrar: ${dadosBrutos.length}`);
  console.log(`\nIniciando...\n`);

  const registros = dadosBrutos.map((d) => {
    const status = mapearStatus(d.fase);
    const tipo = mapearTipo(d.tipo_req);
    const setor = mapearSetor(d.etiqueta);
    const data = converterData(d.data);

    // Monta observação com contexto original
    const partes_obs = [];
    if (d.tipo_veic) partes_obs.push(`Tipo Veicular: ${d.tipo_veic}`);
    if (d.fase) partes_obs.push(`Fase original: ${d.fase}`);
    if (d.etiqueta) partes_obs.push(`Etiqueta: ${d.etiqueta}`);
    partes_obs.push(`[MIGRADO_ID:${d.id_antigo}]`);

    return {
      titulo: (d.titulo || '').toUpperCase().trim(),
      data: data,
      status: status,
      tipo: tipo,
      setor: setor,
      veiculo: d.veiculo || null,
      hodometro: d.hodometro || null,
      valor_despeza: '0,00',
      obs: partes_obs.join(' | '),
    };
  });

  // Insere em lotes de 50
  const LOTE = 50;
  let sucesso = 0;
  let erros = 0;

  for (let i = 0; i < registros.length; i += LOTE) {
    const lote = registros.slice(i, i + LOTE);
    const { data, error } = await supabase.from('Requisicao').insert(lote).select('id');

    if (error) {
      console.error(`ERRO no lote ${i}-${i + lote.length}:`, error.message);
      erros += lote.length;
    } else {
      sucesso += lote.length;
      console.log(`Lote ${i + 1}-${i + lote.length}: ${lote.length} registros inseridos`);
    }
  }

  console.log(`\n=== RESULTADO ===`);
  console.log(`Sucesso: ${sucesso}`);
  console.log(`Erros: ${erros}`);
  console.log(`Total: ${registros.length}`);
}

migrar().catch(console.error);
