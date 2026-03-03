'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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

export default function TemplatePDF({ req }: { req: any, onUpdate?: any, onPrint?: any }) {
  const [nomeSolicitante, setNomeSolicitante] = useState(req?.solicitante || '---');
  const [placaVeiculo, setPlacaVeiculo] = useState(req?.veiculo || '---');
  const [cotacaoData, setCotacaoData] = useState<any>(null);

  // IDs para dependências estáveis
  const reqId = req?.id;
  const codigoRef = req?.codigo_ref;

  // 1. BUSCA NOME DO SOLICITANTE
  useEffect(() => {
    const buscarNome = async () => {
      if (req?.solicitante && req.solicitante.includes('@')) {
        const { data } = await supabase
          .from('req_usuarios')
          .select('nome')
          .eq('email', req.solicitante.trim())
          .maybeSingle();
        if (data?.nome) setNomeSolicitante(data.nome);
      } else {
        setNomeSolicitante(req?.solicitante || '---');
      }
    };
    buscarNome();
  }, [req?.solicitante]);

  // 2. BUSCA PLACA DO VEÍCULO
  useEffect(() => {
    const buscarPlaca = async () => {
      if (req?.veiculo && !isNaN(req.veiculo) && String(req.veiculo).length < 5) {
        const { data } = await supabase
          .from('SupaPlacas')
          .select('NumPlaca')
          .eq('IdPlaca', req.veiculo)
          .maybeSingle();
        if (data?.NumPlaca) setPlacaVeiculo(data.NumPlaca);
      } else {
        setPlacaVeiculo(req?.veiculo || '---');
      }
    };
    buscarPlaca();
  }, [req?.veiculo]);

  // 3. BUSCA COTAÇÃO (Correção do erro de render e busca por ID)
  useEffect(() => {
    const buscarCotacao = async () => {
      if (reqId && reqId !== 'NOVA') {
        const { data } = await supabase
          .from('req_cotacao')
          .select('*')
          .eq('id', reqId)
          .maybeSingle();
        if (data) setCotacaoData(data);
      }
    };
    buscarCotacao();
  }, [reqId, codigoRef]);

  if (!req) return null;

  const unidade = (req.tipo === 'Frota-Veículos' || req.setor?.includes('Fartura')) ? UNIDADES.castro : UNIDADES.nova;
  const fornecedor = FORNECEDORES_CADASTRADOS[req.fornecedor] || null;
  const dataFormatada = req.data ? new Date(req.data).toLocaleDateString('pt-BR') : '___/___/_____';
  const dataCriacao = req.created_at ? new Date(req.created_at).toLocaleString('pt-BR') : '---';
  const cleanObs = req.obs ? req.obs.replace(/\[APPSHEET_ID:.*?\]/g, '').trim() : '';

  return (
    <div className="print-template-container">
      <style dangerouslySetInnerHTML={{ __html: `
        @page { size: A4; margin: 10mm; }
        @media screen { .print-template-container { display: none !important; } }
        @media print {
          aside, nav, button, .no-print, header, .fixed, .absolute { display: none !important; }
          html, body { background: white !important; margin: 0 !important; width: 210mm; overflow: visible !important; }
          .print-template-container { display: block !important; background: white !important; width: 100%; }
          .pdf-content { padding: 0 !important; background: white !important; color: black !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />

      <div className="pdf-content flex flex-col font-sans bg-white text-black">
        {/* CABEÇALHO */}
        <div className="flex justify-between items-start mb-4 border-b-2 border-black pb-2">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold tracking-tighter leading-none">{unidade.nome}</h2>
            <div className="text-[8px] uppercase tracking-tight leading-tight">
              <p>{unidade.cnpj} • {unidade.ie}</p>
              <p>{unidade.endereco} • {unidade.cidade}</p>
              <p className="font-bold">{unidade.contato}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="border-2 border-black px-3 py-1 rounded-lg inline-block bg-white">
              <span className="text-[7px] block uppercase font-bold">ID REQ.</span>
              <span className="text-2xl font-black leading-none">{req.id || 'NOVA'}</span>
            </div>
          </div>
        </div>

        {/* TÍTULO */}
        <div className="mb-2 flex justify-between items-end border-b border-slate-300 pb-0.5">
          <h1 className="text-lg font-black uppercase tracking-tight">Requisição de Suprimentos</h1>
          <div className="text-[8px] font-black uppercase border border-black px-2 py-0.5 rounded bg-white">
            CATEGORIA: {req.tipo || 'Peça'}
          </div>
        </div>

        {/* GRADE DE INFORMAÇÕES */}
        <div className="grid grid-cols-3 gap-0 border-2 border-black rounded-lg overflow-hidden mb-2">
          <div className="p-1.5 border-r-2 border-black">
            <label className="text-[6px] font-black text-slate-500 uppercase block">Solicitante</label>
            <span className="text-[10px] font-bold uppercase">{nomeSolicitante}</span>
          </div>
          <div className="p-1.5 border-r-2 border-black">
            <label className="text-[6px] font-black text-slate-500 uppercase block">Unidade</label>
            <span className="text-[10px] font-bold uppercase">{req.setor || '---'}</span>
          </div>
          <div className="p-1.5">
            <label className="text-[6px] font-black text-slate-500 uppercase block">Data Solicitação</label>
            <span className="text-[10px] font-bold uppercase">{dataFormatada}</span>
          </div>
        </div>

        {/* BLOCO TÉCNICO CONDICIONAL */}
        {(req.tipo === 'Frota-Veículos' || req.setor === 'Trator-Cliente' || req.tipo === 'Ferramenta') && (
          <div className="border-2 border-black rounded-lg overflow-hidden mb-2">
            <div className="grid grid-cols-4 divide-x-2 divide-black uppercase">
                {req.tipo === 'Frota-Veículos' ? (
                  <>
                    <div className="p-1.5 col-span-2">
                      <label className="text-[6px] font-black block">Equipamento / Veículo</label>
                      <span className="text-[10px] font-bold">{placaVeiculo}</span>
                    </div>
                    <div className="p-1.5">
                      <label className="text-[6px] font-black block">KM / Horas</label>
                      <span className="text-[10px] font-bold">{req.hodometro || '---'}</span>
                    </div>
                  </>
                ) : (
                  <div className="p-1.5 col-span-3">
                    <label className="text-[6px] font-black block">Referência / Justificativa Técnica</label>
                    <span className="text-[10px] font-bold">{req.Chassis_Modelo || '---'}</span>
                  </div>
                )}
                
                <div className="p-1.5">
                  {req.setor === 'Trator-Cliente' && (
                    <>
                      <label className="text-[6px] font-black block">OS</label>
                      <span className="text-[10px] font-bold">{req.ordem_servico || '---'}</span>
                    </>
                  )}
                  {req.tipo === 'Ferramenta' && (
                    <>
                      <label className="text-[6px] font-black block">Destinação</label>
                      <span className="text-[10px] font-bold">{req.quem_ferramenta || req.ferramenta_quem || '---'}</span>
                    </>
                  )}
                </div>
            </div>
          </div>
        )}

        {/* BLOCO DE COTAÇÕES */}
        {cotacaoData && cotacaoData.fornecedor1 && (
          <div className="border-2 border-black rounded-lg overflow-hidden mb-2">
            <div className="bg-slate-100 text-[7px] font-black uppercase px-2 py-0.5 border-b border-black">Mapa de Cotações Vinculado</div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black text-[6px] font-black uppercase bg-slate-50">
                  <th className="p-1 border-r border-black w-1/3">Fornecedor</th>
                  <th className="p-1 border-r border-black w-1/3">Material/Serviço</th>
                  <th className="p-1 text-right">Valor Ofertado</th>
                </tr>
              </thead>
              <tbody className="text-[9px]">
                {[1, 2, 3, 4, 5].map(i => cotacaoData[`fornecedor${i}`] ? (
                  <tr key={i} className="border-b border-slate-200 last:border-0">
                    <td className="p-1 border-r border-black uppercase">{cotacaoData[`fornecedor${i}`]}</td>
                    <td className="p-1 border-r border-black uppercase">{cotacaoData[`servico_material${i}`]}</td>
                    <td className="p-1 text-right font-bold">R$ {cotacaoData[`valor${i}`]}</td>
                  </tr>
                ) : null)}
              </tbody>
            </table>
          </div>
        )}

        {/* MEMORIAL DESCRIÇÃO */}
        <div className="border-2 border-black rounded-lg p-3 mb-2 bg-white flex-1 min-h-[4cm]">
          <label className="text-[7px] font-black text-black uppercase block mb-1 border-b border-slate-300">Memorial Descritivo / Justificativa</label>
          <div className="text-[11px] leading-tight text-black">
            <h4 className="font-bold mb-1 uppercase">{req.titulo}</h4>
            <div className="whitespace-pre-wrap font-medium">
              {cleanObs || '---'}
              {(req.Motivo || req.ReqMotivo) && (
                <div className="mt-4 pt-1 border-t border-dashed border-slate-300">
                  <span className="text-[7px] font-black uppercase block text-slate-500">Justificativa:</span>
                  <p className="italic text-slate-700 text-[10px]">{req.Motivo || req.ReqMotivo}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RODAPÉ FINANCEIRO (BRANCO) */}
        <div className="grid grid-cols-12 gap-2 items-stretch mb-2">
          <div className="col-span-8 border-2 border-black rounded-lg p-2 h-full bg-white">
            <label className="text-[6px] font-black text-slate-500 uppercase block">Fornecedor Vinculado</label>
            <p className="text-[10px] font-bold uppercase">{req.fornecedor || 'NÃO DEFINIDO'}</p>
            <p className="font-bold mt-0.5 text-[8px]">DOC FISCAL: {req.numero_nota || 'PENDENTE'}</p>
          </div>
          <div className="col-span-4 border-2 border-black rounded-lg p-2 h-full flex flex-col justify-center items-center bg-white">
            <label className="text-[7px] font-bold text-slate-400 uppercase block leading-none">Total Geral</label>
            <div className="text-2xl font-normal tracking-tighter">
              <span className="text-[10px] mr-0.5 opacity-50">R$</span>{req.valor_despeza || '0,00'}
            </div>
          </div>
        </div>

        {/* BLOCO DE DATAS FINAL */}
        <div className="grid grid-cols-2 gap-4 mb-1">
          <div className="border border-slate-300 rounded-md p-1 px-2 flex justify-between items-center bg-white">
            <span className="text-[6px] font-black text-slate-400 uppercase">Criação</span>
            <span className="text-[8px] font-bold text-slate-600">{dataCriacao}</span>
          </div>
          <div className="border border-slate-300 rounded-md p-1 px-2 flex justify-between items-center bg-white">
            <span className="text-[6px] font-black text-slate-400 uppercase">Impressão</span>
            <span className="text-[8px] font-bold text-slate-600">{new Date().toLocaleString('pt-BR')}</span>
          </div>
        </div>

        {/* RODAPÉ DO SISTEMA */}
        <div className="pt-1 flex justify-between items-center text-[5px] text-slate-400 uppercase font-black border-t border-slate-100">
          <span>Nova Tratores • Gestão de Requisições</span>
          <span>Cód. Verificação: {req.id?.toString().padStart(8, '0')}</span>
        </div>
      </div>
    </div>
  );
}