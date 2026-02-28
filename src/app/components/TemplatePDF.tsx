'use client';
import React from 'react';

// Definições Institucionais das Unidades
const EMPRESAS = {
  nova: {
    nome: "NOVA TRATORES MÁQUINAS AGRÍCOLAS LTDA",
    doc: "CNPJ: 31.463.139/0001-03 • IE: 537.054.605.110",
    endereco: "Av. São Sebastião, 1065 • Piraju - SP",
    contato: "(14) 3351-6049 • novatratores.com.br"
  },
  castro: {
    nome: "CASTRO MÁQUINAS E PEÇAS AGRÍCOLAS LTDA",
    doc: "CNPJ: 23.268.241/0001-11 • IE: Isento",
    endereco: "RUA DOUTOR FARTURA, 140 • Fartura - SP",
    contato: "(14) 3382-1234 • castromaquinas.com.br"
  }
};

// Tabelas de De-Para (Mapeamento baseado nos CSVs enviados)
const LISTA_USUARIOS = [
  { id: 1, nome: "Danilo de Souza", email: "danilooreia19@gmail.com" },
  { id: 2, nome: "Fernando Leonel", email: "fernandoleonel00461@gmail.com" },
  { id: 3, nome: "Gabriel Moraes", email: "gabrielgmjr@gmail.com" },
  { id: 4, nome: "Henri Hione", email: "henri.fhioni@gmail.com" },
  { id: 5, nome: "Jose Ortiz", email: "joseortiz250623@gmail.com" },
  { id: 6, nome: "Luiz Fernando (Motorista)", email: "luizfernandosouzadt200@gmail.com" },
  { id: 7, nome: "Nicolas Dario", email: "nicolasposvenda@gmail.com" },
  { id: 8, nome: "Paulo Motta", email: "paulo.motta.novatratores@gmail.com" },
  { id: 9, nome: "Jose Antonio de Oliveira", email: "piraju.zeca@gmail.com" },
  { id: 10, nome: "Pós Vendas- Escritório", email: "posvendas.novatratores@gmail.com" }
];

const LISTA_PLACAS = [
  { id: "1", num: "SAVEIRO - DLZ1967" },
  { id: "2", num: "SAVEIRO - TKC5D99" },
  { id: "3", num: "CAMINHAO - EVG1E67" },
  { id: "5", num: "STRADA - FXM4G90" },
  { id: "6", num: "MONTANA - FHY8D25" },
  { id: "7", num: "CAMINHAO - AQJ3H59" },
  { id: "8", num: "SAVEIRO - TKY6E68" },
  { id: "9", num: "STRADA - ATJ6211" },
  { id: "10", num: "TRAILBLAZER-FXH1F73" },
  { id: "11", num: "HILLUX-DVR5445" },
  { id: "12", num: "POLO-TKBB8I49" },
  { id: "13", num: "GOL-AYB4230" },
  { id: "14", num: "VOYAGE-SEC2J19" },
  { id: "15", num: "FOX-EPX5402" },
  { id: "16", num: "FOX-EPX5406" },
  { id: "17", num: "MONTANA-EPX5475" },
  { id: "18", num: "VOYAGE-SEV9I75" },
  { id: "19", num: "VOYAGE-SEB9J47" },
  { id: "20", num: "VOYAGE-SEC1F03" },
  { id: "21", num: "CAPTIVA-EPX5253" },
  { id: "22", num: "TRACKER-GDW0J96" },
  { id: "23", num: "S10-GIH0I50" }
];

export default function TemplatePDF({ req }: { req: any }) {
  if (!req) return null;

  // LÓGICA DE TRADUÇÃO DO SOLICITANTE (Email para Nome)
  const solicitanteExibicao = LISTA_USUARIOS.find(u => 
    u.email.trim() === req.solicitante?.trim() || String(u.id) === String(req.solicitante)
  )?.nome || req.solicitante;

  // LÓGICA DE TRADUÇÃO DO VEÍCULO (ID para NumPlaca)
  const veiculoExibicao = LISTA_PLACAS.find(p => 
    String(p.id) === String(req.veiculo)
  )?.num || req.veiculo;

  // Lógica para definir o cabeçalho (Castro se for Fartura ou Frota, Nova para o restante)
  const empresa = (req.tipo === 'Frota-Veículos' || req.setor?.includes('Fartura')) 
    ? EMPRESAS.castro 
    : EMPRESAS.nova;

  const dataEmissao = req.data ? new Date(req.data).toLocaleDateString('pt-BR') : '___/___/_____';
  const dataCriacao = req.created_at ? new Date(req.created_at).toLocaleDateString('pt-BR') : '---';
  const dataImpressao = new Date().toLocaleDateString('pt-BR');
  const dataFinanceiro = req.enviado_financeiro_data ? new Date(req.enviado_financeiro_data).toLocaleDateString('pt-BR') : 'PENDENTE';
  
  // Limpa tags técnicas do AppSheet da descrição
  const cleanObs = req.obs ? req.obs.replace(/\[APPSHEET_ID:.*?\]/g, '').trim() : '';

  return (
    <div className="pdf-container">
      <style dangerouslySetInnerHTML={{ __html: `
        @page { 
          size: A4; 
          margin: 10mm; 
        }
        
        @media screen {
          .pdf-container { display: none !important; }
        }

        @media print {
          body * { visibility: hidden !important; }
          .pdf-container, .pdf-container * { visibility: visible !important; }
          .pdf-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: white !important;
            color: black !important;
          }
        }

        .pdf-wrapper {
          font-family: 'Inter', Arial, sans-serif;
          line-height: 1.3;
          color: black;
          background: white;
          padding: 5mm;
        }

        .section-label {
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: black;
          margin-bottom: 2px;
          display: block;
        }

        .data-value {
          font-size: 10px;
          font-weight: 700;
          color: black;
          text-transform: uppercase;
        }

        .border-grid {
          border: 1.2pt solid black;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .grid-cell {
          padding: 6px 10px;
          border-right: 1pt solid black;
          border-bottom: 1pt solid black;
        }

        .grid-cell:last-child { border-right: none; }
        .no-border-bottom { border-bottom: none; }

        .value-box {
          background: black;
          color: white;
          padding: 12px;
          border: 1.5pt solid black;
          border-radius: 8px;
          text-align: center;
          flex: 1;
        }

        .cascata-box {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* QUADRADO INFERIOR ESQUERDO COM DATAS NA FRENTE */
        .footer-dates-block {
          border: 1pt solid black;
          border-radius: 4px;
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 15px;
          width: 165px;
          text-align: left;
        }

        .footer-dates-block div {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .footer-dates-block .section-label {
          display: inline;
          margin-bottom: 0;
          white-space: nowrap;
        }

        .footer-dates-block .data-value {
          display: inline;
        }
      `}} />

      <div className="pdf-wrapper">
        {/* CABEÇALHO */}
        <div className="flex justify-between items-center border-b-2 border-black pb-4 mb-4">
          <div>
            <h1 className="text-lg font-black tracking-tighter leading-none">{empresa.nome}</h1>
            <p className="text-[8px] mt-1 font-bold">{empresa.doc}</p>
            <p className="text-[8px]">{empresa.endereco} • {empresa.contato}</p>
          </div>
          <div className="text-right border-l border-black pl-6">
            <span className="text-[8px] font-bold uppercase block">ID Registro</span>
            <span className="text-2xl font-black tracking-tighter">{req.id || '---'}</span>
          </div>
        </div>

        {/* TÍTULO PRINCIPAL */}
        <div className="text-center mb-4">
          <h2 className="text-xl font-black uppercase tracking-widest border-y-2 border-black py-1 inline-block px-10">
            Requisição de Suprimentos
          </h2>
        </div>

        <div className="cascata-box">
          {/* BLOCO CASCATA 1: INFO GERAIS */}
          <div className="border-grid grid grid-cols-2">
            <div className="grid-cell">
              <span className="section-label">Solicitante</span>
              <span className="data-value">{solicitanteExibicao || '---'}</span>
            </div>
            <div className="grid-cell">
              <span className="section-label">Unidade / Setor</span>
              <span className="data-value">{req.setor || '---'}</span>
            </div>
            <div className="grid-cell no-border-bottom">
              <span className="section-label">Data Emissão</span>
              <span className="data-value">{dataEmissao}</span>
            </div>
            <div className="grid-cell no-border-bottom">
              <span className="section-label">Tipo Requisição</span>
              <span className="data-value">{req.tipo || '---'}</span>
            </div>
          </div>

          {/* BLOCO: DESTINAÇÃO FERRAMENTA */}
          {(req.tipo === 'Ferramenta' || req.ReqTipo === 'Ferramenta' || req.quem_ferramenta) && (
            <div className="border-grid">
              <div className="grid-cell no-border-bottom">
                <span className="section-label">Destinação da Ferramenta</span>
                <span className="data-value">{req.quem_ferramenta || req.ferramenta_quem || '---'}</span>
              </div>
            </div>
          )}

          {/* BLOCO CASCATA 2: INFO TÉCNICA CLIENTE/LOJA */}
          {(req.Chassis_Modelo || req.cliente || req.ordem_servico) && (
            <div className="border-grid">
              <div className="grid grid-cols-1 border-b border-black">
                <div className="grid-cell no-border-bottom">
                  <span className="section-label">Chassis / Modelo</span>
                  <span className="data-value">{req.Chassis_Modelo || '---'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2">
                <div className="grid-cell no-border-bottom">
                  <span className="section-label">Ordem de Serviço</span>
                  <span className="data-value">{req.ordem_servico || '---'}</span>
                </div>
                <div className="grid-cell no-border-bottom">
                  <span className="section-label">Cliente Final</span>
                  <span className="data-value">{req.cliente || '---'}</span>
                </div>
              </div>
            </div>
          )}

          {/* BLOCO CASCATA 3: INFO FROTA (APENAS SE FOR FROTA-VEÍCULOS) */}
          {(req.tipo === 'Frota-Veículos' || req.ReqTipo === 'Frota-Veículos') && (
            <div className="border-grid grid grid-cols-2">
              <div className="grid-cell no-border-bottom">
                <span className="section-label">Equipamento / Placa (FROTA)</span>
                <span className="data-value">{veiculoExibicao || '---'}</span>
              </div>
              <div className="grid-cell no-border-bottom">
                <span className="section-label">KM / Hodômetro (FROTA)</span>
                <span className="data-value">{req.hodometro || '---'}</span>
              </div>
            </div>
          )}

          {/* BLOCO CASCATA 4: TÍTULO E DESCRIÇÃO */}
          <div className="border-grid flex-1 min-h-[6cm] p-6 bg-white">
            <span className="section-label border-b border-slate-200 pb-2 mb-4">Título Requisição</span>
            <h3 className="font-bold text-sm mb-4 uppercase">{req.titulo || 'PEDIDO DE SUPRIMENTOS'}</h3>
            <div className="text-[10px] whitespace-pre-wrap leading-relaxed text-black font-medium">
              {cleanObs}
            </div>
            
            {/* JUSTIFICATIVA TÉCNICA */}
            {req.Motivo && (
              <div className="mt-6 pt-3 border-t border-dashed border-black h-auto">
                <span className="section-label">Justificativa técnica:</span>
                <p className="italic text-[10px] text-black leading-tight">{req.Motivo}</p>
              </div>
            )}
          </div>
        </div>

        {/* FINANCEIRO */}
        <div className="flex gap-4 my-4">
          <div className="value-box">
            <span className="text-[8px] font-bold uppercase">Total da Requisição</span>
            <div className="text-2xl font-black">
              <span className="text-xs mr-1 font-normal">R$</span>{req.valor_despeza || '0,00'}
            </div>
          </div>

          <div className="value-box !bg-white !text-black">
            <span className="text-[8px] font-bold uppercase">Valor Cobrado Cliente</span>
            <div className="text-2xl font-black">
              <span className="text-xs mr-1 font-normal">R$</span>{req.valor_cobrado_cliente || '0,00'}
            </div>
          </div>
        </div>

        {/* FORNECEDOR */}
        <div className="border-grid p-4">
          <span className="section-label">Fornecedor / Origem Vinculada</span>
          <p className="font-bold text-[11px] uppercase">{req.fornecedor || '---'}</p>
          <p className="text-[9px] mt-1 font-bold">Documento Fiscal / NF: {req.numero_nota || 'PENDENTE'}</p>
        </div>

        {/* ASSINATURAS E CARIMBO */}
        <div className="grid grid-cols-2 gap-6 mt-8 items-end">
          <div className="border-2 border-dashed border-black h-24 rounded-lg flex items-center justify-center relative bg-slate-50">
            <span className="text-[9px] font-black uppercase text-slate-400 rotate-[-15deg]">Carimbo da Unidade</span>
          </div>

          <div className="text-center h-24 flex flex-col justify-end">
            {req.status === 'financeiro' && (
              <div className="border-t-2 border-black pt-1">
                <p className="text-[10px] font-bold uppercase">Autorizado Por</p>
                <p className="text-[7px] font-bold text-black uppercase tracking-widest">Assinatura Responsável</p>
              </div>
            )}
          </div>
        </div>

        {/* BLOCO DE DATAS (INFERIOR ESQUERDO) */}
        <div className="footer-dates-block">
          <div>
            <span className="section-label">Criação:</span>
            <span className="data-value" style={{ fontSize: '8px' }}>{dataCriacao}</span>
          </div>
          <div>
            <span className="section-label">Financeiro:</span>
            <span className="data-value" style={{ fontSize: '8px' }}>{dataFinanceiro}</span>
          </div>
          <div>
            <span className="section-label">Impressão:</span>
            <span className="data-value" style={{ fontSize: '8px' }}>{dataImpressao}</span>
          </div>
        </div>

        {/* RODAPÉ DE RASTREIO FINAL */}
        <div className="mt-4 pt-4 flex justify-center items-center border-t border-black">
          <div className="text-[7px] text-black uppercase font-bold tracking-widest">
            Documento de Controle Interno • Nova Tratores & Castro Máquinas
          </div>
        </div>
      </div>
    </div>
  );
}