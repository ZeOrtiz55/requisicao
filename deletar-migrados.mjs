import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://citrhumdkfivdzbmayde.supabase.co';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_0dpYhnJLqEdBSNk-2Ec_og_OqlmQI7Z';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function deletarMigrados() {
  // Primeiro conta quantos registros serão deletados
  const { count, error: countError } = await supabase
    .from('Requisicao')
    .select('*', { count: 'exact', head: true })
    .like('obs', '%[MIGRADO_ID:%');

  if (countError) {
    console.error('Erro ao contar registros:', countError.message);
    return;
  }

  console.log(`Encontrados ${count} registros migrados para deletar.`);

  if (count === 0) {
    console.log('Nenhum registro para deletar.');
    return;
  }

  // Deleta todos os registros que contêm [MIGRADO_ID: nas observações
  const { data, error } = await supabase
    .from('Requisicao')
    .delete()
    .like('obs', '%[MIGRADO_ID:%')
    .select('id');

  if (error) {
    console.error('Erro ao deletar:', error.message);
  } else {
    console.log(`${data.length} registros deletados com sucesso!`);
  }
}

deletarMigrados().catch(console.error);
