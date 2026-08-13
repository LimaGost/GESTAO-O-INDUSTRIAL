// Documento de Transporte — Layout visual NF-e Modelo 55
// Contém todas as informações logísticas sem referências a "Documento Gerencial" ou "Interno"

function fmtCNPJ(cnpj) {
  if (!cnpj) return '—';
  const c = cnpj.replace(/\D/g, '');
  if (c.length === 14) return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (c.length === 11) return c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return cnpj;
}

function fmtMoeda(v) {
  return (v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtData(d) {
  if (!d) return '—';
  if (d.includes('T')) return new Date(d).toLocaleDateString('pt-BR');
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR');
}

function fmtHora() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
}

function gerarNumDocumento(numero_nf, pedido_numero) {
  const ref = numero_nf || pedido_numero || Math.floor(Math.random() * 99999);
  return String(ref).replace(/\D/g, '').padStart(6, '0');
}

function gerarQR(texto) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=120&data=${encodeURIComponent(texto)}`;
}

function gerarChave(numero) {
  const n = String(numero).replace(/\D/g, '').padEnd(44, '0').slice(0, 44);
  return n.replace(/(.{4})/g, '$1 ').trim();
}

function getDestinoLabel(pedido) {
  if (!pedido) return '—';
  const tipos = {
    retirada_fabrica: '🏭 Retirada na Fábrica',
    retirada_unidade: '🏢 Retirada na Unidade',
    transportadora:   '🚛 Entrega via Transportadora',
    entrega_cliente:  '🏠 Entrega no Endereço do Cliente',
  };
  let label = tipos[pedido.destino_tipo] || '—';
  if (pedido.destino_tipo === 'retirada_unidade' && pedido.destino_unidade) label += ` — ${pedido.destino_unidade}`;
  if (pedido.destino_tipo === 'transportadora' && pedido.destino_transportadora) label += ` — ${pedido.destino_transportadora}`;
  if (pedido.destino_tipo === 'entrega_cliente' && pedido.destino_endereco) label += `: ${pedido.destino_endereco}`;
  return label;
}

/**
 * Gera o HTML do Documento de Transporte no estilo NF-e Modelo 55.
 *
 * @param {object} expedicao — registro Expedicao
 * @param {object} emitente  — { nome, cnpj, endereco, telefone, logo_url }
 * @param {object} pedido    — registro Pedido (opcional, enriquece o documento)
 * @param {object} op        — registro OrdemProducao (opcional)
 * @param {object} cliente   — registro Cliente (opcional)
 */
export function gerarDocumentoTransporteHTML(expedicao, emitente = {}, pedido = null, op = null, cliente = null) {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const horaAgora = fmtHora();
  const numDoc = gerarNumDocumento(expedicao.numero_nf, expedicao.pedido_numero);
  const chave = gerarChave(numDoc);
  const qrData = `PEDIDO:${expedicao.pedido_numero || expedicao.id}|NF:${expedicao.numero_nf || ''}|DOC:${numDoc}`;
  const qrUrl = gerarQR(qrData);
  const DEFAULT_LOGO = 'https://media.base44.com/images/public/69ece9d5634df8be56451712/43d0f422a_454646495_1576721726386277_6990662151677958976_n.jpg';
  const logoUrl = emitente.logo_url || DEFAULT_LOGO;

  const totalItens = (expedicao.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0);
  const valorTotal = expedicao.valor_total || pedido?.valor_total || 0;
  const pesoTotal = (expedicao.itens || []).reduce((s, i) => {
    const qtd = i.quantidade || 0;
    const peso = i.peso_unitario || i.peso_kg || 0;
    return s + qtd * peso;
  }, 0);

  const isWL = pedido?.white_label || expedicao?.white_label;
  const wlMarca = pedido?.white_label_marca || expedicao?.white_label_marca || '';

  const statusLabel = {
    emitida: 'NF Emitida', enviada: 'Em Trânsito', entregue: 'Entregue',
  }[expedicao.status] || 'Emitida';

  const itensRows = (expedicao.itens || []).map((item, idx) => {
    const vlrUnit = item.preco_unitario || item.valor_unitario || 0;
    const vlrTotal = item.total || vlrUnit * (item.quantidade || 0);
    const pesoUnit = item.peso_unitario || item.peso_kg || 0;
    const pesoTot = pesoUnit * (item.quantidade || 0);
    return `
      <tr>
        <td class="tc" style="width:28px;">${idx + 1}</td>
        <td style="padding:3px 6px;">${item.produto_nome || '—'}${item.variacao ? ` <em style="color:#666;font-size:8px;">(${item.variacao})</em>` : ''}</td>
        <td class="tc" style="width:40px;">${item.codigo || '—'}</td>
        <td class="tc" style="width:35px;">UN</td>
        <td class="tc" style="width:40px;">${item.quantidade || 0}</td>
        <td class="tc" style="width:55px;">${item.lote || '—'}</td>
        <td class="tr" style="width:55px;">${pesoUnit > 0 ? pesoUnit.toFixed(3) + ' kg' : '—'}</td>
        <td class="tr" style="width:55px;">${pesoTot > 0 ? pesoTot.toFixed(3) + ' kg' : '—'}</td>
        <td class="tr" style="width:65px;">R$ ${fmtMoeda(vlrUnit)}</td>
        <td class="tr" style="width:70px;">R$ ${fmtMoeda(vlrTotal)}</td>
      </tr>`;
  }).join('');

  const assinaturaBox = (label) => `
    <div style="flex:1;border:1px solid #ccc;padding:6px 8px;min-width:100px;">
      <div style="border-bottom:1px solid #999;min-height:30px;margin-bottom:4px;"></div>
      <div style="font-size:7px;color:#555;font-weight:bold;">${label}</div>
      <div style="font-size:7px;color:#888;margin-top:1px;">Data/Hora: ______ / ______</div>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Documento de Transporte — ${expedicao.numero_nf || numDoc}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
@page { size: A4; margin: 10mm; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 9px; color: #000; background: #fff; }
.doc { width: 100%; max-width: 190mm; margin: 0 auto; }
.brd { border: 1px solid #000; }
.brd-b { border-bottom: 1px solid #000; }
.brd-t { border-top: 1px solid #000; }
.brd-r { border-right: 1px solid #000; }
.brd-l { border-left: 1px solid #000; }
.sec-title {
  background: #1e3a4a; color: #fff;
  font-size: 8px; font-weight: bold; text-transform: uppercase;
  padding: 3px 7px; letter-spacing: 0.5px;
}
.field { display: flex; flex-direction: column; padding: 4px 7px; min-height: 36px; justify-content: space-between; }
.lbl { font-size: 7px; color: #555; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; margin-bottom: 2px; }
.val { font-size: 9px; font-weight: bold; color: #111; }
.val-lg { font-size: 14px; font-weight: bold; color: #B45309; }
.row { display: flex; border-bottom: 1px solid #000; }
.row:last-child { border-bottom: none; }
.col { border-right: 1px solid #000; }
.col:last-child { border-right: none; }
.tc { text-align: center; padding: 3px 4px; }
.tr { text-align: right; padding: 3px 6px; }
table { width: 100%; border-collapse: collapse; }
th { background: #1e3a4a; color: #fff; font-size: 8px; padding: 4px 6px; text-align: center; font-weight: bold; border-right: 1px solid #2d4f63; }
th:last-child { border-right: none; }
td { font-size: 8.5px; border-bottom: 1px solid #e0e0e0; border-right: 1px solid #e0e0e0; vertical-align: middle; }
td:last-child { border-right: none; }
tr:last-child td { border-bottom: none; }
tr:nth-child(even) { background: #fafafa; }
.total-row td { background: #f5f5f5; font-weight: bold; border-top: 2px solid #000; }
.destaque { background: #FEF3C7 !important; color: #B45309; }
.wl-badge { display:inline-block; background:#7c3aed; color:#fff; font-size:7px; font-weight:bold; padding:2px 6px; border-radius:3px; margin-left:6px; }
.status-badge { display:inline-block; background:#16a34a; color:#fff; font-size:7px; font-weight:bold; padding:2px 6px; border-radius:3px; }
@media print { .no-print { display:none; } body { margin:0; } }
</style>
</head>
<body>
<div class="doc">

<!-- ══ CANHOTO DE RECEBIMENTO ══ -->
<div style="border:2px solid #000;padding:8px 10px;margin-bottom:6px;display:flex;gap:15px;align-items:flex-start;">
  <div style="flex:1;">
    <p style="font-size:8.5px;line-height:1.5;">
      <strong>Recebemos de ${emitente.nome || 'RAIO DO SOL'}</strong> os produtos constantes neste documento de transporte.
    </p>
    <div style="margin-top:10px;border-top:1px solid #000;padding-top:5px;display:flex;gap:20px;font-size:8px;">
      <span>Data de Recebimento: _______________</span>
      <span style="flex:1;">Identificação e Assinatura do Recebedor: _______________________________</span>
    </div>
  </div>
  <div style="text-align:center;min-width:110px;border-left:1px solid #999;padding-left:10px;">
    <div style="font-size:20px;font-weight:bold;color:#B45309;">${expedicao.numero_nf || numDoc}</div>
    <div style="font-size:7px;color:#666;margin-top:2px;">Nº do Documento</div>
    <div style="font-size:7px;color:#666;margin-top:4px;">Série: 1</div>
    <div style="margin-top:4px;"><span class="status-badge">${statusLabel}</span></div>
  </div>
</div>

<!-- ══ CABEÇALHO PRINCIPAL ══ -->
<div style="display:flex;border:2px solid #000;margin-bottom:1px;">
  <!-- Emitente -->
  <div style="flex:1;padding:10px;border-right:2px solid #000;">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
      <img src="${logoUrl}" style="height:40px;width:40px;object-fit:contain;border-radius:4px;" onerror="this.style.display='none'"/>
      <div>
        <div style="font-size:13px;font-weight:bold;color:#1e3a4a;">${emitente.nome || 'RAIO DO SOL'}</div>
        ${emitente.nome_fantasia ? `<div style="font-size:8px;color:#555;">Nome Fantasia: ${emitente.nome_fantasia}</div>` : ''}
      </div>
      ${isWL ? `<span class="wl-badge">WHITE LABEL${wlMarca ? ': ' + wlMarca : ''}</span>` : ''}
    </div>
    <div style="font-size:8px;color:#333;line-height:1.6;">
      ${emitente.cnpj ? `<strong>CNPJ:</strong> ${fmtCNPJ(emitente.cnpj)}<br/>` : ''}
      ${emitente.endereco ? `<strong>End.:</strong> ${emitente.endereco}<br/>` : ''}
      ${emitente.telefone ? `<strong>Tel.:</strong> ${emitente.telefone}` : ''}
    </div>
  </div>
  <!-- Bloco DANFE-style -->
  <div style="width:130px;border-right:2px solid #000;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;text-align:center;">
    <div style="font-size:14px;font-weight:bold;letter-spacing:2px;border:2px solid #000;padding:3px 8px;margin-bottom:4px;">DT</div>
    <div style="font-size:7px;line-height:1.3;color:#333;">Documento de<br/>Transporte / Expedição</div>
    <div style="margin-top:6px;font-size:7px;color:#555;">Modelo 55</div>
  </div>
  <!-- Nº e QR -->
  <div style="width:130px;padding:8px;display:flex;flex-direction:column;align-items:center;justify-content:space-around;text-align:center;">
    <div>
      <div style="font-size:7px;font-weight:bold;color:#666;text-transform:uppercase;">Tipo de Operação</div>
      <div style="font-size:11px;font-weight:bold;color:#B45309;margin-top:2px;">1 — Saída</div>
    </div>
    <div>
      <div style="font-size:7px;font-weight:bold;color:#666;text-transform:uppercase;">Nº do Documento</div>
      <div style="font-size:14px;font-weight:bold;color:#B45309;margin-top:2px;">${expedicao.numero_nf || numDoc}</div>
    </div>
    <img src="${qrUrl}" style="width:52px;height:52px;" alt="QR"/>
  </div>
</div>

<!-- ══ CHAVE DE ACESSO ══ -->
<div style="border:1px solid #000;padding:5px 8px;margin-bottom:1px;display:flex;align-items:center;justify-content:space-between;background:#fafafa;">
  <div>
    <div style="font-size:7px;font-weight:bold;color:#555;text-transform:uppercase;margin-bottom:2px;">Chave de Referência:</div>
    <div style="font-family:monospace;font-size:10px;font-weight:bold;letter-spacing:1.5px;color:#1e3a4a;">${chave}</div>
  </div>
  <div style="font-size:7px;color:#555;text-align:right;">
    Emissão: ${hoje} às ${horaAgora}<br/>
    <span style="color:#0066cc;">Consulte em: sistema.raidosol.com.br</span>
  </div>
</div>

<!-- ══ DESTINATÁRIO ══ -->
<div style="border:1px solid #000;margin-bottom:1px;">
  <div class="sec-title">Destinatário / Tomador</div>
  <div class="row">
    <div class="field col" style="flex:2;">
      <div class="lbl">Nome / Razão Social</div>
      <div class="val">${expedicao.cliente_nome || pedido?.cliente_nome || '—'}</div>
    </div>
    <div class="field col" style="flex:1;">
      <div class="lbl">CNPJ / CPF</div>
      <div class="val">${fmtCNPJ(cliente?.cnpj_cpf || '')}</div>
    </div>
    <div class="field col" style="width:90px;">
      <div class="lbl">Data Emissão</div>
      <div class="val">${fmtData(expedicao.data_emissao) || hoje}</div>
    </div>
    <div class="field col" style="width:50px;">
      <div class="lbl">UF</div>
      <div class="val">${cliente?.uf || '—'}</div>
    </div>
  </div>
  <div class="row">
    <div class="field col" style="flex:2;">
      <div class="lbl">Endereço</div>
      <div class="val">${cliente?.endereco || pedido?.destino_endereco || '—'}</div>
    </div>
    <div class="field col" style="flex:1;">
      <div class="lbl">Telefone</div>
      <div class="val">${cliente?.telefone || '—'}</div>
    </div>
    <div class="field col" style="flex:1;">
      <div class="lbl">E-mail</div>
      <div class="val">${cliente?.email || '—'}</div>
    </div>
  </div>
</div>

<!-- ══ DADOS DO PEDIDO ══ -->
<div style="border:1px solid #000;margin-bottom:1px;">
  <div class="sec-title">Dados do Pedido e Produção</div>
  <div class="row">
    <div class="field col" style="width:100px;">
      <div class="lbl">Nº do Pedido</div>
      <div class="val">${pedido?.numero || expedicao.pedido_numero || '—'}</div>
    </div>
    <div class="field col" style="width:120px;">
      <div class="lbl">Ordem de Produção</div>
      <div class="val">${op?.numero || '—'}</div>
    </div>
    <div class="field col" style="width:95px;">
      <div class="lbl">Data do Pedido</div>
      <div class="val">${fmtData(pedido?.data_pedido)}</div>
    </div>
    <div class="field col" style="width:100px;">
      <div class="lbl">Entrega Prevista</div>
      <div class="val">${fmtData(pedido?.data_entrega_prevista)}</div>
    </div>
    <div class="field col" style="flex:1;">
      <div class="lbl">Tipo de Entrega</div>
      <div class="val">${getDestinoLabel(pedido)}</div>
    </div>
  </div>
  <div class="row">
    <div class="field col" style="flex:1;">
      <div class="lbl">Transportadora</div>
      <div class="val">${expedicao.transportadora || pedido?.destino_transportadora || 'Própria / Retirada'}</div>
    </div>
    <div class="field col" style="flex:1;">
      <div class="lbl">Responsável Comercial</div>
      <div class="val">${expedicao.responsavel_comercial || '—'}</div>
    </div>
    <div class="field col" style="flex:1;">
      <div class="lbl">Status do Pedido</div>
      <div class="val">${pedido?.status ? pedido.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : statusLabel}</div>
    </div>
    ${isWL ? `
    <div class="field col" style="flex:1;background:#f5f0ff;">
      <div class="lbl">White Label — Marca</div>
      <div class="val" style="color:#7c3aed;">${wlMarca || 'Sim'}</div>
    </div>` : '<div class="field col" style="flex:1;"></div>'}
  </div>
</div>

<!-- ══ PRODUTOS ══ -->
<div style="border:1px solid #000;margin-bottom:1px;">
  <div class="sec-title">Dados dos Produtos</div>
  <table>
    <thead>
      <tr>
        <th style="width:28px;">Nº</th>
        <th style="text-align:left;padding-left:8px;">Descrição do Produto</th>
        <th style="width:40px;">Código</th>
        <th style="width:35px;">UN</th>
        <th style="width:40px;">Qtd</th>
        <th style="width:55px;">Lote</th>
        <th style="width:55px;">Peso Un.</th>
        <th style="width:55px;">Peso Tot.</th>
        <th style="width:65px;">Vlr. Unit.</th>
        <th style="width:70px;">Vlr. Total</th>
      </tr>
    </thead>
    <tbody>
      ${itensRows || '<tr><td colspan="10" style="text-align:center;padding:8px;color:#888;">Nenhum item registrado</td></tr>'}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="4" style="padding:4px 8px;font-size:8px;"></td>
        <td class="tc"><strong>${totalItens}</strong></td>
        <td></td>
        <td></td>
        <td class="tr"><strong>${pesoTotal > 0 ? pesoTotal.toFixed(3) + ' kg' : '—'}</strong></td>
        <td class="tr" style="font-size:8px;color:#333;">Total Produtos</td>
        <td class="tr destaque"><strong>R$ ${fmtMoeda(valorTotal)}</strong></td>
      </tr>
    </tfoot>
  </table>
</div>

<!-- ══ TRANSPORTE ══ -->
<div style="border:1px solid #000;margin-bottom:1px;">
  <div class="sec-title">Dados do Transporte</div>
  <div class="row">
    <div class="field col" style="flex:2;">
      <div class="lbl">Transportadora / Responsável</div>
      <div class="val">${expedicao.transportadora || 'A definir'}</div>
    </div>
    <div class="field col" style="flex:1;">
      <div class="lbl">Qtd de Volumes</div>
      <div class="val">${expedicao.volumes || 1}</div>
    </div>
    <div class="field col" style="flex:1;">
      <div class="lbl">Qtd de Caixas</div>
      <div class="val">${expedicao.caixas || '—'}</div>
    </div>
    <div class="field col" style="flex:1;">
      <div class="lbl">Peso Bruto</div>
      <div class="val">${expedicao.peso_bruto ? expedicao.peso_bruto + ' kg' : (pesoTotal > 0 ? pesoTotal.toFixed(3) + ' kg' : '—')}</div>
    </div>
    <div class="field col" style="flex:1;">
      <div class="lbl">Peso Líquido</div>
      <div class="val">${expedicao.peso_liquido ? expedicao.peso_liquido + ' kg' : '—'}</div>
    </div>
  </div>
  ${expedicao.data_envio || expedicao.data_entrega ? `
  <div class="row">
    <div class="field col" style="flex:1;">
      <div class="lbl">Data de Envio</div>
      <div class="val">${fmtData(expedicao.data_envio)}</div>
    </div>
    <div class="field col" style="flex:1;">
      <div class="lbl">Data de Entrega</div>
      <div class="val">${fmtData(expedicao.data_entrega)}</div>
    </div>
    <div class="field col" style="flex:2;"></div>
  </div>` : ''}
</div>

<!-- ══ OBSERVAÇÕES ══ -->
${(pedido?.observacoes || expedicao?.observacoes || isWL) ? `
<div style="border:1px solid #000;margin-bottom:1px;">
  <div class="sec-title">Observações</div>
  <div style="padding:7px 10px;min-height:40px;font-size:8.5px;line-height:1.6;">
    ${pedido?.observacoes ? `<strong>Pedido:</strong> ${pedido.observacoes}<br/>` : ''}
    ${expedicao?.observacoes ? `<strong>Expedição:</strong> ${expedicao.observacoes}<br/>` : ''}
    ${isWL ? `<strong style="color:#7c3aed;">⚠ PEDIDO WHITE LABEL${wlMarca ? ' — Marca: ' + wlMarca : ''}.</strong> Embalagem e etiquetagem conforme especificação da marca.` : ''}
  </div>
</div>` : ''}

<!-- ══ ASSINATURAS ══ -->
<div style="border:1px solid #000;margin-bottom:1px;">
  <div class="sec-title">Registro de Responsabilidades</div>
  <div style="display:flex;gap:6px;padding:8px;flex-wrap:wrap;">
    ${assinaturaBox('Separado por')}
    ${assinaturaBox('Conferido por')}
    ${assinaturaBox('Expedido por')}
    ${assinaturaBox('Motorista / Entregador')}
    ${assinaturaBox('Recebedor')}
  </div>
</div>

<!-- ══ RODAPÉ ══ -->
<div style="border-top:2px solid #000;padding:5px 8px;text-align:center;font-size:7.5px;color:#555;">
  <div>Documento emitido por sistema informatizado em ${hoje} às ${horaAgora}</div>
  <div style="margin-top:2px;font-weight:bold;color:#B45309;">
    Nº ${expedicao.numero_nf || numDoc} | Série 1 | Modelo 55 | ${emitente.nome || 'RAIO DO SOL'}
  </div>
  <div style="margin-top:2px;font-size:7px;color:#999;">
    Este documento não substitui a Nota Fiscal Eletrônica para fins fiscais. Uso exclusivo para controle logístico.
  </div>
</div>

</div>
<script>window.onload=()=>setTimeout(()=>window.print(),400);</script>
</body>
</html>`;
}