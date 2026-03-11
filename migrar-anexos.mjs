// Script: Busca anexos via API do Pipefy (URLs frescas) e sobe pro Supabase Storage
// Substitui URLs temporárias do Pipefy por caminhos permanentes
//
// Executar: node migrar-anexos.mjs
// Dry run:  node migrar-anexos.mjs --dry-run

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';

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

function isPipefyUrl(val) {
  if (!val) return false;
  return val.includes('pipefy.com/storage');
}

async function pipefyQuery(query) {
  const res = await fetch('https://api.pipefy.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PIPEFY_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
  });
  return (await res.json()).data;
}

async function buscarAnexosFrescos(cardId) {
  const data = await pipefyQuery(`{ card(id: ${cardId}) { attachments { url path } } }`);
  return data?.card?.attachments || [];
}

async function baixarESubir(url, reqId, fieldName) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
      console.error(`    HTTP ${res.status} para Req #${reqId}`);
      return null;
    }

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) {
      console.error(`    Arquivo muito pequeno Req #${reqId} (${buffer.length}b)`);
      return null;
    }

    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const urlPath = new URL(url).pathname;
    const nomeArquivo = urlPath.split('/').pop() || 'arquivo';
    const ext = nomeArquivo.includes('.') ? nomeArquivo.split('.').pop() : 'bin';
    const fileName = `migrado-${reqId}-${fieldName}.${ext}`;

    const { error } = await supabase.storage
      .from('requisicoes')
      .upload(fileName, buffer, { contentType, upsert: true });

    if (error) {
      console.error(`    Upload erro (${fileName}):`, error.message);
      return null;
    }

    return fileName;
  } catch (err) {
    console.error(`    Erro Req #${reqId}:`, err.message);
    return null;
  }
}

async function main() {
  console.log('\n========================================');
  console.log('  MIGRAÇÃO DE ANEXOS: Pipefy → Supabase Storage');
  console.log('  (busca URLs frescas via API)');
  console.log('========================================\n');
  if (DRY_RUN) console.log('*** MODO DRY-RUN ***\n');

  // 1. Buscar registros migrados com URLs do Pipefy
  console.log('--- Buscando registros com URLs do Pipefy ---');
  let todos = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('Requisicao')
      .select('id, obs, foto_nf, boleto_fornecedor, recibo_fornecedor')
      .like('obs', '%[MIGRADO_ID:%')
      .range(from, from + 999);
    if (error) { console.error('Erro:', error.message); return; }
    todos = todos.concat(data);
    if (data.length < 1000) break;
    from += 1000;
  }

  // Filtrar os que têm URL do Pipefy no foto_nf
  const paraProcessar = [];
  for (const reg of todos) {
    if (isPipefyUrl(reg.foto_nf)) {
      const match = reg.obs.match(/\[MIGRADO_ID:(\d+)\]/);
      if (match) {
        paraProcessar.push({ id: reg.id, pipefyId: match[1], foto_nf: reg.foto_nf });
      }
    }
  }

  console.log(`Total migrados: ${todos.length}`);
  console.log(`Com URLs do Pipefy no foto_nf: ${paraProcessar.length}`);

  if (DRY_RUN) {
    console.log('\n*** DRY-RUN. Rode sem --dry-run para processar. ***');
    return;
  }

  // 2. Processar: buscar URL fresca via API e baixar/subir
  console.log('\n--- Processando ---');
  let sucesso = 0;
  let falha = 0;
  let semAnexo = 0;
  const erros = [];

  for (let i = 0; i < paraProcessar.length; i++) {
    const reg = paraProcessar[i];

    try {
      // Buscar anexos frescos via API do Pipefy
      const anexos = await buscarAnexosFrescos(reg.pipefyId);

      if (anexos.length === 0) {
        semAnexo++;
        continue;
      }

      // Primeiro anexo -> foto_nf
      const storagePath = await baixarESubir(anexos[0].url, reg.id, 'foto_nf');
      if (storagePath) {
        const updates = { foto_nf: storagePath };

        // Segundo anexo -> recibo_fornecedor (se existir)
        if (anexos.length > 1) {
          const storagePath2 = await baixarESubir(anexos[1].url, reg.id, 'recibo');
          if (storagePath2) updates.recibo_fornecedor = storagePath2;
        }

        const { error } = await supabase.from('Requisicao').update(updates).eq('id', reg.id);
        if (error) {
          console.error(`  Update erro Req #${reg.id}:`, error.message);
          falha++;
        } else {
          sucesso++;
        }
      } else {
        falha++;
        erros.push({ id: reg.id, pipefyId: reg.pipefyId });
      }
    } catch (err) {
      console.error(`  Erro Req #${reg.id}:`, err.message);
      falha++;
      erros.push({ id: reg.id, pipefyId: reg.pipefyId, erro: err.message });
    }

    // Progresso
    if ((i + 1) % 10 === 0) {
      console.log(`  ${i + 1}/${paraProcessar.length} | sucesso: ${sucesso} | falha: ${falha} | sem anexo: ${semAnexo}`);
    }

    // Rate limit: pequena pausa a cada 5 requests pra não estourar API
    if ((i + 1) % 5 === 0) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('\n========================================');
  console.log('  RESULTADO');
  console.log('========================================');
  console.log(`Total processados:  ${paraProcessar.length}`);
  console.log(`Sucesso:            ${sucesso}`);
  console.log(`Falha:              ${falha}`);
  console.log(`Sem anexo no Pipefy: ${semAnexo}`);

  if (erros.length > 0) {
    writeFileSync('anexos-erros.json', JSON.stringify(erros, null, 2));
    console.log(`\nErros salvos em anexos-erros.json (${erros.length})`);
  }
}

main().catch(console.error);
