# RESUMO COMPLETO DO CÓDIGO — APP-REQUISICOES
**Nova Tratores Máquinas Agrícolas LTDA**
Stack: Next.js 16 + React 19 + Supabase + Tailwind CSS v4 + TypeScript

---

## 1. Estrutura de Arquivos

```
app-requisicoes/
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
├── DOCUMENTACAO.md
├── resumo.md                         ← Este arquivo
├── sync-pipefy.mjs                   ← Script de sincronização Pipefy → Supabase
├── migrar-anexos.mjs                 ← Script de migração de anexos Pipefy → Storage
├── pipefy-dump.json                  ← Dump completo dos 1320 cards do Pipefy
├── sync-report.json                  ← Relatório de 29 registros atualizados
├── src/app/
│   ├── page.tsx                    (Página principal — estado global, menu, realtime)
│   ├── layout.tsx                  (Layout Next.js — fonte Montserrat)
│   ├── globals.css                 (Tailwind + variáveis de tema)
│   ├── lib/
│   │   └── supabase.ts            (Cliente Supabase singleton)
│   └── components/
│       ├── Kanban.tsx              (Quadro Kanban 4 colunas com drag-and-drop)
│       ├── CardCapaReq.tsx         (Card compacto no kanban — lazy load do CardReq)
│       ├── CardReq.tsx             (Ficha técnica completa + cotações + uploads)
│       ├── FormReq.tsx             (Formulário de nova requisição)
│       ├── TemplatePDF.tsx         (Template de impressão A4 — usado atualmente)
│       ├── PrintTemplate.tsx       (Template de impressão antigo — NÃO USADO)
│       ├── FormFornecedor.tsx      (CRUD de fornecedores)
│       ├── FormUsuario.tsx         (CRUD de colaboradores)
│       └── FormVeiculo.tsx         (CRUD de veículos/placas)
```

---

## 2. Dependências (package.json)

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.95.3",
    "lucide-react": "^0.563.0",
    "next": "16.1.6",
    "pg": "^8.18.0",
    "react": "19.2.3",
    "react-dom": "19.2.3"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/pg": "^8.16.0",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "babel-plugin-react-compiler": "1.0.0",
    "csv-parse": "^6.1.0",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## 3. next.config.ts

```ts
import type { NextConfig } from "next";
const nextConfig: NextConfig = { reactCompiler: true };
export default nextConfig;
```

---

## 4. src/app/lib/supabase.ts

```ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: { params: { eventsPerSecond: 10 } },
});
```

---

## 5. src/app/layout.tsx

```tsx
import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Requisições",
  description: "Sistema de Gestão de Requisições",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${montserrat.variable} antialiased`}>{children}</body>
    </html>
  );
}
```

---

## 6. src/app/globals.css

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-montserrat);
  --font-montserrat: var(--font-montserrat);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-montserrat), Montserrat, sans-serif;
}
```

---

## 7. src/app/page.tsx (Página Principal)

Gerencia todo o estado global do sistema:

- **Estados**: requisicoes, usuarios, veiculos, notificacoes, toasts, reqParaImprimir, menuAberto, abaAtiva
- **Abas**: kanban, usuarios, veiculos, fornecedores, lixeira, form, form_usuario, form_veiculo
- **Menu lateral**: expande ao hover (w-20 → w-64)
- **Notificações**: toasts clicáveis (10s timeout) + modal de histórico
- **Alerta sonoro**: Web Audio API (3 bips triangle wave)
- **Impressão**: `dispararImpressao()` seta dados, aguarda 800ms, chama `window.print()`

### Carregamento de dados
- Busca TODAS as requisições com paginação (1000 por vez) via loop
- Busca usuários e veículos em paralelo (`Promise.all`)
- Normaliza campos legados (ReqTipo→tipo, Material_Serv_Solicitado→titulo, etc.)

### Realtime (Supabase Channels)
Canal `main-realtime-stream`:
1. **INSERT em `Supa-Solicitacao_Req`**: alerta sonoro, toast, notificação, recarrega dados (+ reload extra após 2.5s), após busca ID real com retry e dispara impressão automática
2. **INSERT em `Supa-AtualizarReq`**: alerta, toast, salva foto do técnico no campo `recibo_fornecedor`, recarrega dados
3. **Qualquer evento em `Requisicao`**: recarrega dados silenciosamente

### Auto-print AppSheet (CORRIGIDO em 11/03/2026)
- **Antes**: esperava 3.5s fixos, usava AppSheet ID no template, mostrava email ao invés do nome
- **Agora**: retry com tentativas em 3s, 5s, 8s, 12s para buscar o ID real da tabela `Requisicao`
- Busca nome do usuário via `.ilike()` (case-insensitive) na tabela `req_usuarios`
- Se não encontrar ID real após 4 tentativas, usa fallback com os dados do AppSheet

### Lixeira
- Grid de cards excluídos com opção de restaurar (volta para `pedido`) ou excluir permanentemente
- Botão "Esvaziar Lixeira" deleta todos de uma vez

### CRUD
- `salvarUsuario`: insert ou update em `req_usuarios`
- `salvarVeiculo`: insert ou update em `SupaPlacas`

```tsx
// Código completo: ~463 linhas
// Imports: React hooks, supabase, todos os componentes, lucide-react icons
// Estado global centralizado no componente Home()
```

---

## 8. src/app/components/Kanban.tsx

Quadro Kanban com 4 colunas fixas:

| Status | Título | Cor |
|---|---|---|
| `pedido` | Pedido Realizado | bg-blue-500 |
| `completa` | Atualizada por Técnico | bg-cyan-500 |
| `aguardando` | Aguardando Fornecedor | bg-orange-400 |
| `financeiro` | Enviado Financeiro | bg-indigo-600 |

### Funcionalidades
- **Drag-and-drop nativo** (HTML5 API) para mover cards entre colunas
- **Filtros**: por ID (input texto), por Fornecedor (select dinâmico), por Mês/Período (select)
- **Lazy loading**: 20 cards por vez por coluna, botão "Carregar mais"
- **Dados compartilhados**: busca fornecedores, usuários e veículos UMA vez e passa para todos os CardCapaReq

```tsx
// Props: { requisicoes, onUpdate, onPrint }
// 198 linhas
```

---

## 9. src/app/components/CardCapaReq.tsx

Card compacto exibido no Kanban (componente leve):

- Exibe: ID, tipo, título, solicitante (traduzido email→nome), data, setor, valor
- Badge "TÉCNICO (APP)" para requisições vindas do AppSheet
- Ícones de anexo (NF, recibo) quando existem
- Botões hover: Cotação, Imprimir, Lixeira
- **Lazy load**: importa `CardReq` via `next/dynamic` apenas quando abre o modal
- Draggable (HTML5 drag-and-drop)
- **REMOVIDO em 11/03/2026**: auto-status change de `pedido` → `aguardando` ao imprimir

```tsx
// Props: { req, onUpdate, onPrint, dadosCompartilhados }
// ~120 linhas
```

---

## 10. src/app/components/CardReq.tsx (Ficha Técnica)

Modal completo de edição de uma requisição:

### Funcionalidades
- **Edição inline**: todos os campos editáveis com persistência no blur via `persist()`
- **Campos condicionais** por setor/tipo:
  - `Trator-Cliente`: cliente, O.S., chassis/modelo, valor cobrado
  - `Trator-Loja`: chassis/modelo
  - `Ferramenta`: destinação (Uso Pessoal / Geral)
  - `Frota-Veículos`: veículo/placa (select), hodômetro
- **Mapa de Cotações** (modal separado): até 5 fornecedores com empresa, material, valor
  - Adicionar/remover fornecedores com reorganização automática
  - Upsert em `req_cotacao`
- **Upload de arquivos**: NF, Boleto, Recibo → Supabase Storage bucket `requisicoes`
  - Upload de NF muda status para `completa`
- **Visualização de anexos**: Storage (link direto) ou Google Drive (via Apps Script JSONP)
- **Impressão**: gera PDF (NÃO muda mais o status)
- **Data financeiro**: seta automaticamente `enviado_financeiro_data` quando status é `financeiro`

### Correções aplicadas em 11/03/2026
1. **Removido auto-status change** de `pedido` → `aguardando` ao imprimir
2. **Fix AuthApiError "Invalid Refresh Token"**: removido `getSession()`, usa `getUser()` direto
3. **Fix React duplicate key**: fornecedores usam `key={f.nome}-${i}` com index

### Integração Google Drive
- URL Apps Script hardcoded na linha 15
- Callback JSONP para buscar URL pública do arquivo pelo nome
- Arquivos identificados pelo prefixo `SupaAtualizarReq_Images/`

```tsx
// Props: { req, onUpdate, onPrint, dadosCompartilhados, aberto?, onFechar? }
// Constantes: APPS_SCRIPT_URL, DEPARTAMENTOS, TIPOS_REQ
// ~475 linhas
```

---

## 11. src/app/components/FormReq.tsx (Nova Requisição)

Formulário para criar nova requisição:

### Campos
- Título, Data, Tipo, Solicitante (select do banco), Setor Destino
- **Condicionais por tipo**:
  - `Ferramenta`: campo destinação
  - `Frota-Veiculos`: veículo (select do banco), hodômetro
  - `Trator-Loja`: chassis/modelo
  - `Trator-Cliente`: cliente, O.S., chassis/modelo, valor cobrado
- Observações técnicas
- Status padrão: `pedido`

### Empresa automática
- Tipo `Frota-Veiculos` → Castro Máquinas
- Demais → Nova Tratores

### Dados do banco
- Busca `req_usuarios` (nomes) e `SupaPlacas` (veículos) no mount

```tsx
// Props: { onSave }
// 178 linhas
```

---

## 12. src/app/components/TemplatePDF.tsx (Template de Impressão ATUAL)

Template A4 para impressão via `window.print()`:

### Características
- Invisível na tela (`@media screen { display: none }`)
- Visível apenas na impressão (`@media print`)
- Seleciona empresa automaticamente (Nova ou Castro)
- Traduz email→nome e código→placa via Supabase
- Busca cotação vinculada (`req_cotacao`)
- Limpa marcadores `[APPSHEET_ID:...]` do campo obs

### Seções do PDF
1. Cabeçalho institucional (empresa, CNPJ, IE, endereço)
2. ID da requisição (destaque visual)
3. Título "Requisição Materiais e Serviços" + categoria
4. Grade: Solicitante, Setor, Data
5. Bloco técnico condicional (veículo/chassis/O.S./ferramenta/cliente)
6. Mapa de cotações (tabela até 5 fornecedores)
7. Memorial descritivo + justificativa
8. Fornecedor vinculado + Nota Fiscal + Valor Total
9. Datas (criação, financeiro, impressão)
10. Assinatura (somente se status = `financeiro`)
11. Rodapé do sistema

```tsx
// Props: { req, onUpdate?, onPrint? }
// 296 linhas
```

---

## 13. src/app/components/PrintTemplate.tsx (LEGADO — NÃO USADO)

Template de impressão antigo, substituído pelo `TemplatePDF.tsx`. Não é importado em nenhum lugar.

```tsx
// 217 linhas — arquivo legado, pode ser removido
```

---

## 14. src/app/components/FormFornecedor.tsx

CRUD completo de fornecedores:

- **Criar**: formulário com nome, cpf/cnpj, número (contato), descrição
- **Editar**: preenche formulário e faz update via Supabase
- **Excluir**: delete com confirm()
- **Listar**: grid de cards com filtro em tempo real (nome ou cpf/cnpj)
- Todos os campos convertidos para maiúsculas
- **Obs**: Existe fornecedor duplicado no banco ("ALEX PEÇAS, SERVIÇOS E MANGUEIRAS") — tratado com index no key

```tsx
// Props: { onSave }
// Tabela: Fornecedores
// 232 linhas
```

---

## 15. src/app/components/FormUsuario.tsx

Formulário para criar/editar colaboradores:

- Campos: nome, email, telefone
- Estado de loading durante submit
- Recebe `usuarioParaEditar` para modo edição

```tsx
// Props: { usuarioParaEditar, onSave, onCancel }
// Tabela: req_usuarios
// 68 linhas
```

---

## 16. src/app/components/FormVeiculo.tsx

Formulário para criar/editar veículos da frota:

- Campo único: NumPlaca (texto livre, convertido para maiúsculas)
- Estado de loading durante submit
- Recebe `veiculoParaEditar` para modo edição

```tsx
// Props: { veiculoParaEditar, onSave, onCancel }
// Tabela: SupaPlacas
// 58 linhas
```

---

## 17. Banco de Dados (Supabase)

### Tabelas

| Tabela | Uso | Chave |
|---|---|---|
| `Requisicao` | Tabela principal de requisições | `id` (auto) |
| `req_usuarios` | Colaboradores/técnicos | `id` |
| `SupaPlacas` | Frota de veículos | `IdPlaca` |
| `Fornecedores` | Fornecedores homologados | `id` |
| `req_cotacao` | Mapa de cotações (até 5 fornecedores) | `id` (ref Requisicao) |
| `Supa-Solicitacao_Req` | Requisições do AppSheet | trigger realtime |
| `Supa-AtualizarReq` | Atualizações do AppSheet | trigger realtime |

### Campos de `Requisicao`
```
id, titulo, tipo, solicitante, setor, data, empresa, endereco_empr,
veiculo, hodometro, cliente, ordem_servico, fornecedor, obs,
valor_cobrado_cliente, valor_despeza, numero_nota, status,
foto_nf, boleto_fornecedor, recibo_fornecedor,
enviado_financeiro_data, Chassis_Modelo, quem_ferramenta,
codigo_ref, created_at
```

### Campos de `req_cotacao`
```
id (mesmo da Requisicao),
fornecedor1..5, servico_material1..5, valor1..5, obs1..5
```

### Storage
- Bucket: `requisicoes`
- Nomenclatura uploads manuais: `{req.id}-{fieldName}-{timestamp}.{ext}`
- Nomenclatura migrados: `migrado-{reqId}-{fieldName}.{ext}`

---

## 18. Fluxo de Status (Kanban)

```
pedido  →  aguardando  →  financeiro
              ↑
         completa (Técnico APP)
              ↓
         lixeira (soft delete)
```

### Regras automáticas
- Upload de Nota Fiscal (`foto_nf`) → muda para `completa`
- Mover para `financeiro` → registra `enviado_financeiro_data`
- **REMOVIDO**: Imprimir NÃO muda mais o status automaticamente

---

## 19. Tipos de Requisição

| Tipo | Campos especiais |
|---|---|
| Peças | Padrão |
| Alimentação | Padrão |
| Trator-Loja | Chassis/Modelo |
| Trator-Cliente | Cliente, O.S., Chassis, Valor Cobrado |
| Frota-Veiculos | Veículo/Placa, Hodômetro. Empresa = Castro Máquinas |
| Serviço de Terceiros | Padrão |
| Almoxarifado | Padrão |
| Ferramenta | Destinação (Uso Pessoal / Geral) |
| Insumo Infra | Padrão (listado em CardReq TIPOS_REQ) |

---

## 20. Empresas

| Apelido | Razão Social | CNPJ | Cidade |
|---|---|---|---|
| Nova Tratores | Nova Tratores Máquinas Agrícolas LTDA | 31.463.139/0001-03 | Piraju - SP |
| Castro Máquinas | Castro Máquinas e Peças Agrícolas LTDA | 23.268.241/0001-11 | Fartura - SP |

---

## 21. Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

---

## 22. Scripts de Migração e Sincronização

### sync-pipefy.mjs
Script que sincroniza dados do Pipefy com o Supabase. Acessa a API GraphQL do Pipefy, busca todos os cards (1320 total) de todas as fases do pipe, e cruza com registros migrados no Supabase (identificados por `[MIGRADO_ID:xxx]` no campo `obs`).

- **Pipe ID**: 305638515
- **Fases**: Pedidos, Aguardando-NF ou Aprovar, Veiculos-Add no Rota Exata, Custo-Cobrado Cliente, Despesa-Concluida, FERRAMENTAS ESTOQUE, Negadas
- **Campos sincronizados**: fornecedor, numero_nota, valor_despeza, valor_cobrado_cliente, recibo_fornecedor (anexos)
- **Flags**: `--dry-run`, `--use-cache` (usa pipefy-dump.json)
- **Normalização**: MAPA_SOLICITANTES e MAPA_FORNECEDORES para padronizar nomes
- **Resultado**: 29 registros atualizados (12 valores, 16 recibos, 1 valor cobrado)

### migrar-anexos.mjs
Migra anexos (fotos de NF) do Pipefy para o Supabase Storage. As URLs do Pipefy são assinadas e expiram (~6h), então o script busca URLs frescas via API antes de baixar.

- **Processo**: busca registros com URL do Pipefy no `foto_nf` → extrai `[MIGRADO_ID:xxx]` → chama API `card(id) { attachments { url path } }` → baixa arquivo → sobe no Storage
- **Bucket**: `requisicoes`
- **Nomenclatura**: `migrado-{reqId}-{fieldName}.{ext}`
- **Rate limit**: 500ms pausa a cada 5 requests
- **Resultado**: 294/295 sucesso, 1 falha (Req #5134 Bad Request)
- **Erros salvos em**: `anexos-erros.json`

### Arquivos gerados
- `pipefy-dump.json` — Dump completo de 1320 cards com todos os campos e anexos
- `sync-report.json` — Relatório de 29 registros atualizados pelo sync
- `anexos-erros.json` — 1 erro (Req #5134)

---

## 23. Correções Aplicadas (Sessão 11/03/2026)

### Bug: AppSheet auto-print mostrando ID errado e email
- **Problema**: Ao imprimir requisição vinda do AppSheet, o template usava o ID do AppSheet ao invés do ID real da tabela `Requisicao`, e mostrava email ao invés do nome do solicitante
- **Arquivo**: `src/app/page.tsx`
- **Fix**: Implementado retry logic (tentativas em 3s, 5s, 8s, 12s) para buscar ID real. Busca nome do usuário com `.ilike()` (case-insensitive)

### Bug: Auto-status change ao imprimir
- **Problema**: Imprimir uma requisição mudava automaticamente o status de `pedido` para `aguardando`, causando confusão no workflow
- **Arquivos**: `CardReq.tsx` e `CardCapaReq.tsx`
- **Fix**: Removida a lógica `if (req.status === 'pedido') persist('status', 'aguardando')` de ambos os componentes

### Bug: AuthApiError "Invalid Refresh Token"
- **Problema**: Console exibia `AuthApiError: Invalid Refresh Token: Refresh Token Not Found` ao abrir o modal
- **Arquivo**: `CardReq.tsx`
- **Fix**: Removido `getSession()` que lia token expirado do localStorage. Substituído por `getUser()` direto com try/catch

### Bug: React duplicate key em fornecedores
- **Problema**: Fornecedor "ALEX PEÇAS, SERVIÇOS E MANGUEIRAS" duplicado no banco causava erro de key duplicada no React
- **Arquivo**: `CardReq.tsx`
- **Fix**: Key do option usa index: `key={f.nome}-${i}`

---

## 24. Integração Pipefy (Referência)

- **API**: `https://api.pipefy.com/graphql`
- **Pipe ID**: 305638515
- **Acesso a cards**: via `phase(id) { cards }` (não `pipe { cards }`)
- **Anexos**: via `card(id) { attachments { url path } }`
- **URLs de anexo**: são assinadas e expiram (~6h) — sempre buscar fresca via API antes de baixar
- **Registros migrados**: identificados por `[MIGRADO_ID:xxx]` no campo `obs` da tabela `Requisicao`

---

## 25. Pontos de Atenção / Dívida Técnica

| Item | Local | Observação |
|---|---|---|
| Tipagem `any` generalizada | Todos os componentes | Props e estados usam `any` |
| Apps Script URL exposta | CardReq.tsx linha 15 | URL no código, deveria ser env var |
| `alert()` e `confirm()` nativos | CardReq, FormFornecedor | Browser nativo em vez de modais |
| Duplo carregamento realtime | page.tsx | Faz reload + outro após 2.5s |
| PrintTemplate.tsx não usado | components/ | Arquivo legado, pode ser removido |
| `pg` no package.json | Raiz | Dependência não usada no código atual |
| Fornecedor duplicado no banco | Fornecedores | "ALEX PEÇAS..." aparece 2x |
| Req #5134 falhou migração | migrar-anexos.mjs | 1 anexo não migrado (Bad Request) |

---

*Resumo gerado em 11/03/2026. Atualizado com todas as correções e migrações da sessão.*
