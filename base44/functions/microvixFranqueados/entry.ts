import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const API_URL = 'https://webapi.microvix.com.br/1.0/api/integracao';
const CHAVE = '4B6C381D-9402-4EE1-BD45-55E711ABD99E';
const CNPJ = '29630157000182';
const ID_PORTAL = '23920';
const AUTH_USER = 'linx_export';
const AUTH_PASS = 'linx_export';

const FRANQUEADOS = {
  '7': 'Raio do Sol Artigos Religiosos',
  '8': 'Lobo e Souza',
  '9': 'Nascimento e Choas',
  '10': 'Raio do Sol Choas',
  '11': 'LS Varejo Religioso',
};

function esc(v) {
  return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildXml(cmd, params) {
  const ps = Object.entries(params)
    .map(([k, v]) => `<Parameter id="${k}">${esc(v)}</Parameter>`)
    .join('');
  return `<?xml version="1.0" encoding="utf-8"?>` +
    `<LinxMicrovix>` +
    `<Authentication user="${AUTH_USER}" password="${AUTH_PASS}" />` +
    `<ResponseFormat>json</ResponseFormat>` +
    `<IdPortal>${ID_PORTAL}</IdPortal>` +
    `<Command><Name>${cmd}</Name><Parameters>${ps}</Parameters></Command>` +
    `</LinxMicrovix>`;
}

async function callMicrovix(cmd, params) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body: buildXml(cmd, { chave: CHAVE, cnpjEmp: CNPJ, ...params }),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch {
    throw new Error(`Resposta não-JSON da Microvix (${cmd}): ${text.slice(0, 800)}`);
  }
  if (json.IsValid === false || json.isValid === false) {
    throw new Error(`Microvix ${cmd} inválido: ${JSON.stringify(json).slice(0, 800)}`);
  }
  const rd = json.ResponseData ?? json.responseData ?? [];
  // Formato Microvix JSON: primeira linha = nomes das colunas, demais = valores
  if (Array.isArray(rd) && rd.length > 0 && Array.isArray(rd[0])) {
    const header = rd[0];
    return rd.slice(1).map((row) =>
      Object.fromEntries(header.map((h, i) => [String(h).toLowerCase(), row[i]]))
    );
  }
  if (Array.isArray(rd)) {
    return rd.map((r) => {
      const o = {};
      for (const k of Object.keys(r)) o[k.toLowerCase()] = r[k];
      return o;
    });
  }
  return [];
}

const norm = (v) => String(v ?? '').trim().toUpperCase();
const num = (v) => {
  const n = parseFloat(String(v ?? '0').replace(',', '.'));
  return isNaN(n) ? 0 : n;
};

function statusPedido(row) {
  const cancelado = norm(row.cancelado);
  const aprovado = norm(row.aprovado);
  const status = norm(row.status);
  if (cancelado === 'S') return 'cancelado';
  if (aprovado === 'N') return 'pendente';
  if (aprovado === 'S' && status === 'N') return 'aprovado';
  if (aprovado === 'S' && status === 'P') return 'em_expedicao';
  if (aprovado === 'S' && status === 'F') return 'faturado';
  return 'pendente';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, dataInicial, dataFinal, debug } = await req.json();

    if (action === 'produtos') {
      const rows = await callMicrovix('LinxProdutos', {
        dt_update_inicio: '2025-06-01',
        dt_update_fim: new Date().toISOString().split('T')[0],
      });
      if (debug) {
        return Response.json({ total: rows.length, amostra: rows.slice(0, 1), colunas: rows[0] ? Object.keys(rows[0]) : [] });
      }
      const ativos = rows.filter((r) => norm(r.desativado) !== 'S');
      const nomes = {};
      for (const r of ativos) {
        const cod = String(r.cod_produto ?? '');
        const nome = r.nome ?? '';
        if (cod && nome) nomes[cod] = nome;
      }
      return Response.json({ nomes, total: Object.keys(nomes).length });
    }

    // ── action: pedidos ──
    const params = {};
    if (dataInicial) params.data_inicial = dataInicial;
    if (dataFinal) params.data_fim = dataFinal;
    const rows = await callMicrovix('LinxPedidosVenda', params);

    if (debug) {
      return Response.json({ total: rows.length, amostra: rows.slice(0, 2), colunas: rows[0] ? Object.keys(rows[0]) : [] });
    }

    // Exclui registros excluídos e deduplica linhas pela chave composta (caixa, documento, serie / transação)
    const vistas = new Set();
    const validos = rows.filter((r) => {
      if (norm(r.excluido) === 'S') return false;
      const chave = `${r.caixa ?? ''}|${r.documento ?? r.transacao ?? ''}|${r.serie ?? ''}|${r.posicao_item ?? ''}`;
      if (vistas.has(chave)) return false;
      vistas.add(chave);
      return true;
    });

    // Agrupa por pedido (cod_pedido) — cada linha é um item
    const gruposPedido = {};
    for (const r of validos) {
      const idPedido = String(r.cod_pedido ?? '');
      if (!idPedido) continue;
      (gruposPedido[idPedido] = gruposPedido[idPedido] || []).push(r);
    }

    const pedidos = Object.entries(gruposPedido).map(([idPedido, linhas]) => {
      const naoCanceladas = linhas.filter((r) => norm(r.cancelado) !== 'S');
      const todasCanceladas = naoCanceladas.length === 0;
      const ref = naoCanceladas[0] || linhas[0];
      const status = todasCanceladas ? 'cancelado' : statusPedido(ref);

      // Data no formato dd/mm/yyyy hh:mm:ss → ISO
      let data = null;
      const m = String(ref.data_lancamento ?? '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (m) data = `${m[3]}-${m[2]}-${m[1]}`;

      const nf = linhas.map((r) => String(r.nf_gerada ?? '').trim()).find((v) => v && v !== '0') || null;
      const alterado = linhas.some((r) => String(r.transacao_origem ?? '').trim() !== '');

      // Soma apenas linhas não canceladas; se pedido todo cancelado, mostra o valor original
      const linhasSoma = todasCanceladas ? linhas : naoCanceladas;
      const itens = linhasSoma.map((r) => {
        const qtd = num(r.quantidade);
        const vlrUnit = num(r.valor_unitario);
        const vlrTotal = num(r.valor_total) || vlrUnit * qtd;
        return {
          cod_produto: String(r.cod_produto ?? ''),
          quantidade: qtd,
          valor_unitario: vlrUnit,
          valor_total: vlrTotal,
        };
      });

      const codCliente = String(ref.codigo_cliente ?? '');
      return {
        id: idPedido,
        numero: idPedido,
        codigo_cliente: codCliente,
        franqueado: FRANQUEADOS[codCliente] || `Cliente ${codCliente}`,
        data,
        status,
        alterado,
        nf,
        valor_total: itens.reduce((s, i) => s + i.valor_total, 0),
        quantidade_itens: itens.length,
        itens,
      };
    });

    return Response.json({ pedidos, total: pedidos.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});