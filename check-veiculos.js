const fs = require('fs');

function parseCSV(text) {
  const lines = text.split('\n');
  const header = [];
  let field = '', inQuotes = false;
  for (const ch of lines[0]) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { header.push(field.trim()); field = ''; }
    else { field += ch; }
  }
  header.push(field.trim());

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const fields = [];
    let f = '', q = false;
    for (const ch of lines[i]) {
      if (ch === '"') { q = !q; }
      else if (ch === ',' && !q) { fields.push(f.trim()); f = ''; }
      else { f += ch; }
    }
    fields.push(f.trim());
    const obj = {};
    header.forEach((h, idx) => { obj[h] = fields[idx] || ''; });
    rows.push(obj);
  }
  return rows;
}

// Pipe CSV
const pipe = parseCSV(fs.readFileSync('dados-pipe.csv', 'utf-8'));
const antigos = parseCSV(fs.readFileSync('dados-antigos.csv', 'utf-8'));

console.log('=== DADOS-PIPE.CSV ===');
console.log('Total linhas:', pipe.length);
const veicPipe = new Set();
const placaPipe = new Set();
pipe.forEach(r => {
  if (r['Veiculos']) veicPipe.add(r['Veiculos']);
  if (r['Placa do Carro-Template']) placaPipe.add(r['Placa do Carro-Template']);
});
console.log('Veiculos unicos:', [...veicPipe].sort());
console.log('Placas Template unicas:', [...placaPipe].sort());

console.log('\n=== DADOS-ANTIGOS.CSV ===');
console.log('Total linhas:', antigos.length);
const veicAntigos = new Set();
antigos.forEach(r => {
  if (r['Veículo']) veicAntigos.add(r['Veículo']);
  if (r['Veiculos']) veicAntigos.add(r['Veiculos']);
});
console.log('Veiculos unicos:', [...veicAntigos].sort());

// Mostra exemplos com veiculo preenchido
console.log('\n=== EXEMPLOS COM VEICULO (pipe) ===');
pipe.filter(r => r['Veiculos']).slice(0, 10).forEach(r => {
  console.log(`ID:${r.ID} | Veiculo:[${r['Veiculos']}] | Placa:[${r['Placa do Carro-Template']}] | Titulo:${r['Título'].substring(0,50)}`);
});

console.log('\n=== EXEMPLOS COM VEICULO (antigos) ===');
antigos.filter(r => r['Veiculos'] || r['Veículo']).slice(0, 10).forEach(r => {
  console.log(`ID:${r.ID} | Veiculo:[${r['Veículo'] || r['Veiculos']}] | Titulo:${r['Título'].substring(0,50)}`);
});
