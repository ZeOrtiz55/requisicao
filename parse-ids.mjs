import fs from 'fs';
const data = JSON.parse(fs.readFileSync('financeiro2.json', 'utf8'));
console.log('Total financeiro+migrados:', data.length);
const fasesOk = ['Custo-Cobrado Cliente', 'Despesa- Concluida'];
const errados = data.filter(r => {
  const m = r.obs.match(/Fase original: ([^|]+)/);
  if (!m) return false;
  return !fasesOk.includes(m[1].trim());
});
console.log('Para corrigir:', errados.length);
errados.forEach(r => {
  const m = r.obs.match(/Fase original: ([^|]+)/);
  console.log('  ID', r.id, '- Fase:', m[1].trim());
});
fs.writeFileSync('ids_corrigir.json', JSON.stringify(errados.map(r => r.id)));
