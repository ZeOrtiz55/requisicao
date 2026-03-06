// Alinha tipo e fornecedores dos registros migrados com os valores corretos do sistema
import { createClient } from '@supabase/supabase-js';
import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

const supabase = createClient(
  'https://citrhumdkfivdzbmayde.supabase.co',
  'sb_publishable_0dpYhnJLqEdBSNk-2Ec_og_OqlmQI7Z'
);

// Mapa de fornecedores: nome no banco (Requisicao) → nome correto (tabela Fornecedores)
const MAPA_FORNECEDORES = {
  'auto posto 2001': 'AUTO POSTO 2001',
  'landico': 'LANDICO',
  'rodrigo torneiro': 'RODRIGO TORNEIRO (PANDA)',
  'kms ferramentas': ' KADU FERRAMENTAS E MATERIAIS', // KMS não existe, mapear para Kadu?
  'tio toko': 'TIO TOKO',
  'koba parafusos': 'KOBA PARAFUSOS',
  'magic tintas': 'MAGIC TINTAS',
  'barrado': 'AUTO PEÇAS BARRADÃO',
  'favaro pneus': 'FAVARO PNEUS',
  'jeferson climatização': 'JEFFERSON CLIMATIZAÇÃO',
  'rafael pitoco': 'RAFAEL PITOCO',
  'walter auto elétrica': 'WALTER AUTO ELÉTRICA',
  'kadu ferramentas': ' KADU FERRAMENTAS E MATERIAIS',
  'restaurante e marmitaria bom gosto': 'RESTAURANTE SILVANA',
  'borracharia móvel': 'BORRACHARIA MÓVEL',
  'lanchonete caverna': 'LANCHONETE CAVERNA',
  'auto tintas piraju ltda': 'AUTO TINTAS PIRAJU LTDA',
  'arcofel': 'ARCOFEL',
  'flavio wolf': 'FLAVIO WOLF',
  'gerson auto peças': 'GERSON AUTO PEÇAS',
  'parada pneus': 'PARADA PNEUS',
  'carlos pneus': 'CARLINHOS PNEU',
  'alê soluções auto': 'ALÊ SOLUÇÕES AUTO',
  'união de tintas': 'UNIÃO DE TINTAS',
  'eletro service': 'ELETRO SERVICE',
  'papelaria cgc': 'PAPELARIA CGC',
  'pitstop autopeças martins': 'AUTO PEÇAS MARTINS ',
  'auto center eliseu': 'AUTO CENTER ELISEU',
  'moto sport': 'MOTO SPORT',
  'radiadores amantini': 'RADIADORES AMANTINI',
  'flavio garrote wolf': 'FLAVIO GARROTE WOLF',
  'jefferson jose firmino': 'JEFFERSON JOSE FIRMINO',
  'ctm autronica': 'CTM AUTRONICA',
  'borracharia miguel': 'BORRACHARIA MIGUEL',
  'pet shop animal feliz': 'PET SHOP ANIMAL FELIZ',
  'cobra rolamentos e autopeças': 'COBRA ROLAMENTOS E AUTOPEÇAS',
  'cobra rolamentos e auto peças': 'COBRA ROLAMENTOS E AUTO PEÇAS',
  'agrofertil': 'AGROFERTIL',
  'odapel auto peças': 'ODAPEL AUTO PEÇAS',
  'mabraco': 'MABRACO MATERIAIS DE CONSTRUÇÃO',
  'prisma': 'PRISMA',
  'cambará': 'CAMBARÁ',
  'paraiba brinquedos': 'PARAIBA BRINQUEDOS',
  'proeste': 'PROESTE',
  'gs papelaria': 'GS PAPELARIA',
  'leandro costa corcovia': 'LEANDRO COSTA CORCOVIA',
  'adriana ines': 'ADRIANA INES',
  'mecanica martinelli': 'MECANICA MARTINELLI',
  'paulo josé de lima': 'PAULO JOSÉ DE LIMA',
  'nr ferramentas': 'NR FERRAMENTAS',
  'lagarto som': 'LAGARTO SOM',
  'uniparts': 'UNIPARTS',
  'resillience print editora e grafica ltda': 'RESILLIENCE PRINT EDITORA E GRAFICA LTDA',
  'volkswagen': 'VOLKSWAGEN',
  'alex': null, // ignorar
  'outros...': null, // ignorar
};

async function fetchAll(query) {
  let all = [];
  let from = 0;
  while (true) {
    const { data, error } = await query.range(from, from + 999);
    if (error) throw new Error(error.message);
    all = all.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function main() {
  // Buscar todos migrados
  const migrados = await fetchAll(
    supabase.from('Requisicao').select('id, tipo, fornecedor').like('obs', '%[MIGRADO_ID:%')
  );
  console.log('Total migrados:', migrados.length);

  let tipoCorrigido = 0;
  let fornCorrigido = 0;

  for (const reg of migrados) {
    const updates = {};

    // 1. Corrigir tipo: Frota-Veiculos → Frota-Veículos
    if (reg.tipo === 'Frota-Veiculos') {
      updates.tipo = 'Frota-Veículos';
    }

    // 2. Corrigir fornecedor: alinhar com tabela Fornecedores
    if (reg.fornecedor) {
      const key = reg.fornecedor.trim().toLowerCase();
      if (MAPA_FORNECEDORES[key] !== undefined) {
        const novo = MAPA_FORNECEDORES[key];
        if (novo && novo !== reg.fornecedor) {
          updates.fornecedor = novo;
        } else if (novo === null) {
          updates.fornecedor = null; // limpar "Outros..." e "Alex"
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('Requisicao').update(updates).eq('id', reg.id);
      if (error) {
        console.error(`Erro ID ${reg.id}:`, error.message);
      } else {
        if (updates.tipo) tipoCorrigido++;
        if (updates.fornecedor !== undefined) fornCorrigido++;
      }
    }
  }

  console.log('\n=== RESULTADO ===');
  console.log('Tipo corrigido (Frota-Veiculos → Frota-Veículos):', tipoCorrigido);
  console.log('Fornecedor alinhado com tabela:', fornCorrigido);
}

main().catch(console.error);
