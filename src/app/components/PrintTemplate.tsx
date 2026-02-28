'use client';
import React from 'react';

const UNIDADES = {
  nova: {
    nome: "NOVA TRATORES MÁQUINAS AGRÍCOLAS LTDA",
    cnpj: "CNPJ: 31.463.139/0001-03",
    ie: "Inscrição Estadual: 537.054.605.110",
    endereco: "AVENIDA SÃO SEBASTIÃO, 1065 • JARDIM ANA CRISTINA",
    cidade: "Piraju - SP • CEP: 18800-770",
    contato: "Telefone: (14) 3351-6049 • novatratores.com.br"
  },
  castro: {
    nome: "CASTRO MÁQUINAS E PEÇAS AGRÍCOLAS LTDA",
    cnpj: "CNPJ: 23.268.241/0001-11",
    ie: "Inscrição Estadual: Isento",
    endereco: "RUA DOUTOR FARTURA, 140",
    cidade: "Fartura - SP • CEP: 18870-000",
    contato: "Telefone: (14) 3382-1234 • castromaquinas.com.br"
  }
};

const FORNECEDORES_CADASTRADOS: any = {
  "Nova Tratores": { cnpj: "31.463.139/0001-03", endereco: "Unidade Piraju" },
  "Castro Máquinas": { cnpj: "23.268.241/0001-11", endereco: "Unidade Fartura" },
  "Rodrigo Torneiro (Panda)": { cnpj: "PRÓPRIO", endereco: "Oficina de Manutenção" }
};

export default function PrintTemplate({ req }: { req: any }) {
  if (!req) return null;

  const unidade = (req.tipo === 'Frota-Veículos' || req.setor?.includes('Fartura')) ? UNIDADES.castro : UNIDADES.nova;
  const fornecedor = FORNECEDORES_CADASTRADOS[req.fornecedor] || null;
  const dataFormatada = req.data ? new Date(req.data).toLocaleDateString('pt-BR') : '___/___/_____';
  
  const cleanObs = req.obs ? req.obs.replace(/\[APPSHEET_ID:.*?\]/g, '').trim() : '';

  return (
    <div className="print-template-container">
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4; margin: 0; }
        
        /* Esconde o template na tela normal */
        @media screen {
          .print-template-container { display: none !important; }
        }

        /* CONFIGURAÇÃO DE IMPRESSÃO - IGUAL À HOME */
        @media print {
          /* 1. Esconde elementos da interface do sistema */
          aside, nav, button, .no-print, header, .fixed, .absolute {
            display: none !important;
          }

          /* 2. Reseta o corpo para garantir fundo branco e sem scrolls */
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm;
            height: 297mm;
            overflow: visible !important;
          }

          /* 3. Força o container a ocupar a tela toda no papel */
          .print-template-container {
            display: block !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            background: white !important;
            z-index: 9999999 !important;
          }

          /* 4. Garante que o conteúdo interno seja visível e nítido */
          .pdf-content {
            padding: 1.5cm !important;
            background: white !important;
            color: black !important;
            visibility: visible !important;
          }

          /* Força as cores e bordas */
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />

      <div className="pdf-content flex flex-col font-sans bg-white">
        
        {/* CABEÇALHO INSTITUCIONAL */}
        <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tighter text-black mb-1">{unidade.nome}</h2>
            <div className="text-[10px] text-slate-800 uppercase tracking-tight leading-normal">
              <p>{unidade.cnpj} • {unidade.ie}</p>
              <p>{unidade.endereco}</p>
              <p>{unidade.cidade}</p>
              <p className="text-black font-bold">{unidade.contato}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="border-2 border-black text-black px-6 py-3 rounded-xl inline-block">
              <span className="text-[9px] block uppercase tracking-widest font-bold mb-1">ID Requisição</span>
              <span className="text-4xl font-black leading-none">{req.id || 'NOVA'}</span>
            </div>
          </div>
        </div>

        {/* TÍTULO DO DOCUMENTO */}
        <div className="mb-8 flex justify-between items-end border-b border-slate-200 pb-2">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-black">Requisição de Suprimentos</h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-[0.3em] mt-1">Controle e Auditoria Técnica de Materiais</p>
          </div>
          <div className="text-right text-[10px] font-black uppercase bg-slate-100 px-3 py-1 rounded">
            CATEGORIA: {req.tipo || 'Peça'}
          </div>
        </div>

        {/* GRADE DE INFORMAÇÕES PRINCIPAIS */}
        <div className="grid grid-cols-3 gap-0 border-2 border-black rounded-2xl overflow-hidden mb-6">
          <div className="p-4 border-r-2 border-black">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Solicitante Responsável</label>
            <span className="text-xs text-black font-bold uppercase">{req.solicitante || '---'}</span>
          </div>
          <div className="p-4 border-r-2 border-black">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Unidade / Departamento</label>
            <span className="text-xs text-black font-bold uppercase">{req.setor || '---'}</span>
          </div>
          <div className="p-4">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-1">Data da Solicitação</label>
            <span className="text-xs text-black font-bold uppercase">{dataFormatada}</span>
          </div>
        </div>

        {/* BLOCO TÉCNICO (VEÍCULO OU MÁQUINA) */}
        {(req.veiculo || req.Chassis_Modelo || req.hodometro) && (
          <div className="border-2 border-black rounded-2xl overflow-hidden mb-6">
            <div className="grid grid-cols-4 divide-x-2 divide-black uppercase">
                <div className="p-4 col-span-2">
                  <label className="text-[8px] font-black text-black tracking-widest block mb-1">Identificação do Equipamento / Veículo</label>
                  <span className="text-xs font-bold">{req.veiculo || req.Chassis_Modelo || '---'}</span>
                </div>
                <div className="p-4">
                  <label className="text-[8px] font-black text-black tracking-widest block mb-1">KM / Horas</label>
                  <span className="text-xs font-bold">{req.hodometro || '---'}</span>
                </div>
                <div className="p-4">
                  <label className="text-[8px] font-black text-black tracking-widest block mb-1">Ordem de Serviço</label>
                  <span className="text-xs font-bold">{req.ordem_servico || '---'}</span>
                </div>
            </div>
          </div>
        )}

        {/* DESCRIÇÃO / MEMORIAL */}
        <div className="border-2 border-black rounded-2xl p-6 mb-6 flex-1 bg-white">
          <label className="text-[9px] font-black text-black uppercase tracking-widest block mb-4 border-b border-slate-300 pb-2">Memorial Descritivo dos Itens / Serviços</label>
          <div className="text-[13px] leading-relaxed text-black">
            <h4 className="font-bold text-sm mb-4 uppercase text-slate-900">{req.titulo || 'SOLICITAÇÃO DE SUPRIMENTOS'}</h4>
            <div className="whitespace-pre-wrap min-h-[8cm] font-medium text-slate-800">
              {cleanObs || 'Descrição detalhada não fornecida.'}
              {req.Motivo && (
                <div className="mt-8 pt-4 border-t border-slate-200">
                  <span className="text-[9px] font-black uppercase block mb-1">Justificativa da Requisição:</span>
                  <p className="italic text-slate-700">{req.Motivo}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RODAPÉ FINANCEIRO */}
        <div className="grid grid-cols-12 gap-4 items-stretch mb-10">
          <div className="col-span-8">
            <div className="border-2 border-black rounded-2xl p-5 h-full bg-white">
              <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-2">Dados do Fornecedor / Origem</label>
              <div className="text-xs uppercase">
                <p className="font-bold text-black text-sm">{req.fornecedor || 'NÃO DEFINIDO'}</p>
                {fornecedor && <p className="text-slate-600 font-medium mt-1">{fornecedor.cnpj} • {fornecedor.endereco}</p>}
                <p className="text-black font-black mt-3">Documento Fiscal (NF): {req.numero_nota || 'EM PROCESSAMENTO'}</p>
              </div>
            </div>
          </div>

          <div className="col-span-4">
            <div className="bg-black text-white p-5 rounded-2xl h-full flex flex-col justify-center items-center">
              <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1 tracking-widest">Valor Total</label>
              <div className="text-3xl font-black tracking-tighter">
                <span className="text-sm mr-1 opacity-50 font-normal">R$</span>{req.valor_despeza || '0,00'}
              </div>
            </div>
          </div>
        </div>

        {/* CAMPOS DE ASSINATURA */}
        <div className="grid grid-cols-2 gap-20 px-10 mt-6 bg-white">
          <div className="border-t-2 border-black pt-4 text-center">
            <p className="text-[11px] font-bold uppercase text-black">{req.solicitante || 'Assinatura'}</p>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Solicitante</p>
          </div>
          <div className="border-t-2 border-black pt-4 text-center">
            <p className="text-[11px] font-bold uppercase text-black">{req.impresso_por || 'Responsável'}</p>
            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">Autorizado Por</p>
          </div>
        </div>

        {/* LOGO DO SISTEMA */}
        <div className="mt-10 pt-4 flex justify-between items-center text-[7px] text-slate-400 uppercase font-black tracking-[0.5em] border-t border-slate-100 bg-white">
          <span>Sistema Integrado de Gestão • Nova Tratores</span>
          <span>Sincronizado em: {new Date().toLocaleString('pt-BR')}</span>
        </div>
      </div>
    </div>
  );
}