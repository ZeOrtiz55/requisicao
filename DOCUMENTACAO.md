# APP-REQUISICOES — Documentacao Tecnica
**Nova Tratores Maquinas Agricolas LTDA**
Versao do sistema: v3.6 | Stack: Next.js 16 + Supabase + Tailwind CSS v4

---

## 1. Visao Geral

Sistema web de gestao de requisicoes de materiais e servicos para as unidades Nova Tratores (Piraju-SP) e Castro Maquinas (Fartura-SP). Permite criar, acompanhar e aprovar pedidos de compra atraves de um quadro Kanban, com integracao em tempo real com o aplicativo de campo (AppSheet) usado pelos tecnicos.

---

## 2. Stack Tecnologica

| Tecnologia | Versao | Uso |
|---|---|---|
| Next.js | 16.1.6 | Framework React (App Router) |
| React | 19.2.3 | UI |
| TypeScript | ^5 | Tipagem |
| Tailwind CSS | ^4 | Estilizacao |
| Supabase JS | ^2.95.3 | Banco de dados + Auth + Storage + Realtime |
| Lucide React | ^0.563.0 | Icones |
| Web Audio API | nativa | Alertas sonoros |

---

## 3. Estrutura de Arquivos

```
src/app/
  page.tsx                  -- Root: estado global, menu, notificacoes
  layout.tsx                -- Layout base Next.js
  globals.css               -- Estilos globais
  lib/
    supabase.ts             -- Cliente Supabase (singleton)
  components/
    Kanban.tsx              -- Quadro Kanban com 4 colunas e filtros
    CardReq.tsx             -- Card individual + ficha tecnica + cotacoes
    FormReq.tsx             -- Formulario de nova requisicao
    TemplatePDF.tsx         -- Template de impressao (print-only CSS)
    FormFornecedor.tsx      -- CRUD de fornecedores
    FormUsuario.tsx         -- CRUD de colaboradores/tecnicos
    FormVeiculo.tsx         -- CRUD de veiculos da frota
```

---

## 4. Banco de Dados (Supabase)

### Tabelas

| Tabela | Descricao | Chave |
|---|---|---|
| `Requisicao` | Tabela principal de requisicoes | `id` (auto) |
| `req_usuarios` | Colaboradores e tecnicos cadastrados | `id` |
| `SupaPlacas` | Frota de veiculos (placas) | `IdPlaca` |
| `Fornecedores` | Fornecedores homologados | `id` |
| `req_cotacao` | Mapa de cotacoes (ate 5 fornecedores) | `id` (ref. Requisicao) |
| `Supa-Solicitacao_Req` | Requisicoes enviadas pelo APP (AppSheet) | trigger |
| `Supa-AtualizarReq` | Atualizacoes de cards enviadas pelo APP | trigger |

### Campos da tabela `Requisicao`

```
id, titulo, tipo, solicitante, setor, data, empresa, endereco_empr,
veiculo, hodometro, cliente, ordem_servico, fornecedor, obs,
valor_cobrado_cliente, valor_despeza, numero_nota, status,
foto_nf, boleto_fornecedor, recibo_fornecedor,
enviado_financeiro_data, Chassis_Modelo, quem_ferramenta,
codigo_ref, created_at
```

### Campos da tabela `req_cotacao`

```
id (mesmo da Requisicao),
fornecedor1..5, servico_material1..5, valor1..5, obs1..5
```

### Storage

- Bucket: `requisicoes`
- Arquivos: nota fiscal, boleto, recibo de cada requisicao
- Nomenclatura: `{req.id}-{fieldName}-{timestamp}.{ext}`

---

## 5. Fluxo Kanban (Status)

```
pedido  -->  aguardando  -->  financeiro
               ^
               |
          completa (Tecnico APP)
               |
          lixeira (soft delete via Trash)
```

| Status | Coluna | Descricao |
|---|---|---|
| `pedido` | Pedido Realizado | Requisicao criada, aguardando acao |
| `completa` | Atualizada por Tecnico | Tecnico no campo atualizou o card |
| `aguardando` | Aguardando Fornecedor | Em processo de compra |
| `financeiro` | Enviado Financeiro | Aprovado e encaminhado ao financeiro |
| `lixeira` | (oculto) | Card removido (nao aparece nas colunas) |

**Regra automatica:** ao clicar em "Imprimir" em um card com status `pedido`, o status muda automaticamente para `aguardando`.

**Regra automatica:** ao fazer upload da Nota Fiscal (`foto_nf`), o status muda para `completa`.

**Regra automatica:** ao mover para `financeiro`, registra a data atual em `enviado_financeiro_data`.

---

## 6. Tipos de Requisicao

| Tipo | Comportamento especial |
|---|---|
| `Pecas` | Padrao |
| `Alimentacao` | Padrao |
| `Trator-Loja` | Exibe campo Chassis/Modelo |
| `Trator-Cliente` | Exibe campos: Cliente, O.S., Trator, Valor Cobrado |
| `Frota-Veiculos` | Exibe campo Veiculo/Placa e Hodometro. Usa empresa Castro Maquinas no PDF |
| `Servico de Terceiros` | Padrao |
| `Almoxarifado` | Padrao |
| `Ferramenta` | Exibe campo "Destinacao da Ferramenta" (Uso Pessoal / Geral) |

---

## 7. Integracao Realtime (Supabase Channels)

### Canal principal (`main-realtime-stream`)

**INSERT em `Supa-Solicitacao_Req`** (tecnico envia requisicao pelo APP):
- Toca alerta sonoro (Web Audio API - 3 bips)
- Cria notificacao no historico + toast clicavel
- Incrementa contador de alertas no menu
- Dispara impressao automatica (aguarda 800ms e chama `window.print()`)
- Recarrega dados (+ recarregamento extra apos 2.5s para garantir sincronismo)

**INSERT em `Supa-AtualizarReq`** (tecnico atualiza card pelo APP):
- Toca alerta sonoro
- Cria notificacao "Card Sincronizado"
- Recarrega dados

**Qualquer evento em `Requisicao`**:
- Recarrega dados silenciosamente

### Canal por card (`cotacao_{req.id}`)

- Escuta mudancas em `req_cotacao` filtrado por `id = req.id`
- Atualiza dados de cotacao em tempo real no card aberto

---

## 8. Integracao Google Drive (Apps Script)

Arquivos enviados pelo AppSheet ficam no Google Drive. Para abrir esses arquivos:

- URL do Apps Script configurada diretamente no `CardReq.tsx` (linha 15)
- Usa JSONP callback para buscar URL publica do arquivo pelo nome
- Identificados pelo prefixo `SupaAtualizarReq_Images/` no campo do banco

---

## 9. Componentes — Resumo

### `page.tsx`
- Gerencia todo o estado global (requisicoes, usuarios, veiculos, notificacoes)
- Menu lateral expansivel (hover para abrir)
- Sistema de toasts clicaveis com historico de alertas
- Botao flutuante "+" para nova requisicao (vira "X" quando form aberto)
- Impressao: `dispararImpressao()` seta `reqParaImprimir`, aguarda 800ms, chama `window.print()`, limpa

### `Kanban.tsx`
- 4 colunas fixas com drag-and-drop nativo (HTML5)
- Filtros: por ID, por Fornecedor (select dinamico), por Mes/Periodo
- Contagem de itens por coluna
- Estado visual ao arrastar sobre coluna (`colunaArrastando`)

### `CardReq.tsx`
- Card compacto no kanban (clicavel para abrir ficha)
- Modal "Ficha Tecnica": edicao inline de todos os campos (persiste no blur via `persist()`)
- Modal "Mapa de Cotacoes": ate 5 fornecedores com empresa, material e valor
- Traducao de email -> nome (busca em `req_usuarios`)
- Traducao de IdPlaca -> NumPlaca (busca em `SupaPlacas`)
- Indicador visual "TECNICO (APP)" para requisicoes vindas do AppSheet
- Indicador "Cotacao OK" quando ha cotacao preenchida
- Upload de arquivos: NF, Boleto, Recibo -> Supabase Storage
- Visualizacao de anexos: Storage (link direto) ou Google Drive (Apps Script)

### `FormReq.tsx`
- Formulario de nova requisicao
- Lista de usuarios hardcoded (independente do banco) -- ver nota abaixo
- Campos condicionais por tipo (`Ferramenta`, `Trator-Cliente`)
- Empresa setada automaticamente pelo tipo

### `TemplatePDF.tsx`
- Invisivel na tela (`display: none` em `@media screen`)
- Visivel somente na impressao (`@media print`)
- Inclui dados da empresa correta (Nova ou Castro conforme tipo/setor)
- Inclui mapa de cotacoes se existir
- Inclui linha de assinatura se status for `financeiro`
- Limpa marcadores `[APPSHEET_ID:...]` do campo obs

### `FormFornecedor.tsx`
- CRUD completo: criar, editar, excluir
- Lista com filtro de busca em tempo real
- Campos: nome, cpf/cnpj, numero (contato), descricao

### `FormUsuario.tsx`
- Criar e editar colaboradores
- Campos: nome, email, telefone

### `FormVeiculo.tsx`
- Criar e editar placas da frota
- Campo unico: NumPlaca (texto livre, maiusculo)

---

## 10. Variaveis de Ambiente

Criar arquivo `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

O cliente Supabase e configurado em `src/app/lib/supabase.ts` com `eventsPerSecond: 10` para realtime.

---

## 11. Executar o Projeto

```bash
# Instalar dependencias
npm install

# Rodar em desenvolvimento
npm run dev

# Build de producao
npm run build
npm start
```

Acesso local: `http://localhost:3000`

---

## 12. Pontos de Atencao / Divida Tecnica

| Item | Local | Observacao |
|---|---|---|
| Lista de usuarios hardcoded | `FormReq.tsx` linha 4 | O formulario de nova requisicao usa uma lista fixa. O CardReq.tsx ja usa o banco (`req_usuarios`). Considerar unificar. |
| Tipagem `any` generalizada | Todos os componentes | Props e estados usam `any` em vez de tipos definidos. |
| Apps Script URL exposta | `CardReq.tsx` linha 15 | URL do Google Apps Script esta no codigo. Considerar mover para variavel de ambiente. |
| `alert()` nativo | `CardReq.tsx`, `FormFornecedor.tsx` | Usa `alert()` e `confirm()` do browser em vez de modais customizados. |
| Duplo carregamento realtime | `page.tsx` linha 137 | Faz `carregarDados` e um segundo apos 2.5s para garantir sincronismo. Funciona mas e redundante. |
| `PrintTemplate.tsx` | `src/app/components/` | Arquivo existe mas nao esta sendo importado (substituido por `TemplatePDF.tsx`). |

---

## 13. Empresas Cadastradas no Sistema

| Apelido | Razao Social | CNPJ | Cidade |
|---|---|---|---|
| Nova Tratores | Nova Tratores Maquinas Agricolas LTDA | 31.463.139/0001-03 | Piraju - SP |
| Castro Maquinas | Castro Maquinas e Pecas Agricolas LTDA | 23.268.241/0001-11 | Fartura - SP |

A selecao de empresa no PDF e automatica:
- Tipo `Frota-Veiculos` ou setor contendo "Fartura" -> Castro Maquinas
- Demais casos -> Nova Tratores

---

*Documentacao gerada em 05/03/2026 com base na analise do codigo-fonte.*
