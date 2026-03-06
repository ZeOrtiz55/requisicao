import { parse } from 'csv-parse/sync';
import fs from 'fs';

const csv = fs.readFileSync('dados-pipe.csv', 'utf8');
const rows = parse(csv, { columns: true, skip_empty_lines: true, relax_column_count: true, bom: true });

let semSol = 0, semForn = 0;
for (const r of rows) {
  const s = (r['SOLICITANTE'] || r['Solicitante'] || '').trim();
  const f = (r['FORNECEDOR'] || r['Fornecedor Final'] || r['Forncedor Final'] || '').trim();
  if (s === '') semSol++;
  if (f === '') semForn++;
}
console.log('Total registros:', rows.length);
console.log('Sem solicitante no CSV:', semSol);
console.log('Sem fornecedor no CSV:', semForn);

// Criador (User) como fallback para solicitante
const criadores = new Set();
let comCriador = 0;
for (const r of rows) {
  const s = (r['SOLICITANTE'] || r['Solicitante'] || '').trim();
  const c = (r['Criador (User)'] || '').trim();
  if (s === '' && c.length > 0) {
    criadores.add(c);
    comCriador++;
  }
}
console.log('\nSem solicitante MAS com "Criador (User)":', comCriador);
console.log('Criadores unicos (possivel fallback):');
[...criadores].sort().forEach(s => console.log(' ', s));
