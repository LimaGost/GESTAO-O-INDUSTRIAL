/**
 * Gerador de Nota Gerencial de Transporte / Romaneio de Expedição
 * Documento operacional sem finalidade fiscal.
 */

function getEmpresa() {
  try { return JSON.parse(localStorage.getItem('empresa_config') || '{}'); } catch { return {}; }
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d.includes('T') ? d : d + 'T12:00:00').toLocaleDateString('pt-BR');
}

function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtR(v) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

const DEFAULT_LOGO = 'https://media.base44.com/images/public/69ece9d5634df8be56451712/43d0f422a_454646495_1576721726386277_6990662151677958976_n.jpg';

const CSS = `
* { margin: 0; padding: 0; box-sizing: border-box; }
@page { size: A4; margin: 10mm 12mm; }
html, body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #111; background: #fff; }
.page { width: 100%; }

/* ── Header ── */
.header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #1a1a2e; padding-bottom: 6mm; margin-bottom: 5mm; gap: 6mm; }
.header-left { display: flex; align-items: flex-start; gap: 5mm; }
.header-logo img { width: 22mm; height: 22mm; object-fit: contain; }
.empresa-nome { font-size: 15pt; font-weight: 900; color: #1a1a2e; letter-spacing: 0.5px; }
.empresa-sub { font-size: 8pt; color: #555; line-height: 1.7; margin-top: 1.5mm; }
.header-right { text-align: right; min-width: 55mm; }
.doc-tipo { font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: 1px; }
.doc-titulo { font-size: 13pt; font-weight: 900; color: #C9A227; margin: 1mm 0; line-height: 1.2; }
.doc-numero { font-size: 18pt; font-weight: 900; color: #1a1a2e; }
.doc-emissao { font-size: 8pt; color: #555; margin-top: 1mm; }
.status-badge { display: inline-block; padding: 1.5mm 4mm; border-radius: 3mm; font-size: 8pt; font-weight: bold; margin-top: 2mm; }

/* ── Alerta documento não fiscal ── */
.aviso-nao-fiscal { background: #FFF9E6; border: 1.5px solid #C9A227; border-radius: 2mm; padding: 2.5mm 4mm; font-size: 7.5pt; color: #7A5A00; text-align: center; margin-bottom: 4mm; font-weight: bold; letter-spacing: 0.3px; }

/* ── Seções ── */
.section { margin-bottom: 4mm; }
.section-title { background: #1a1a2e; color: #fff; font-size: 8pt; font-weight: bold; letter-spacing: 1px; text-transform: uppercase; padding: 1.5mm 4mm; border-radius: 1.5mm 1.5mm 0 0; }
.section-body { border: 1px solid #ccc; border-top: none; border-radius: 0 0 1.5mm 1.5mm; padding: 3mm 4mm; }

/* ── Grid info ── */
.info-grid { display: grid; gap: 2.5mm; }
.grid-2 { grid-template-columns: 1fr 1fr; }
.grid-3 { grid-template-columns: 1fr 1fr 1fr; }
.grid-4 { grid-template-columns: 1fr 1fr 1fr 1fr; }
.info-item { min-width: 0; }
.info-label { font-size: 7pt; color: #888; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.5mm; }
.info-value { font-size: 9pt; color: #111; font-weight: 600; word-break: break-word; }

/* ── Tabela de produtos ── */
table { width: 100%; border-collapse: collapse; }
thead tr { background: #2d3748; }
thead th { color: #fff; font-size: 8pt; font-weight: bold; padding: 2mm 2.5mm; text-align: left; letter-spacing: 0.3px; }
thead th.right { text-align: right; }
tbody tr:nth-child(even) { background: #f8f9fa; }
tbody tr:hover { background: #eef2ff; }
tbody td { font-size: 8.5pt; padding: 2mm 2.5mm; color: #111; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
tbody td.right { text-align: right; }
tbody td.center { text-align: center; }

/* ── Resumo da carga ── */
.resumo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; }
.resumo-item { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 2mm; padding: 2.5mm 3mm; text-align: center; }
.resumo-value { font-size: 14pt; font-weight: 900; color: #1a1a2e; }
.resumo-label { font-size: 7pt; color: #64748b; text-transform: uppercase; margin-top: 0.5mm; letter-spacing: 0.3px; }

/* ── Observações ── */
.obs-box { border: 1px dashed #ccc; border-radius: 1.5mm; padding: 3mm 4mm; min-height: 14mm; font-size: 9pt; color: #333; line-height: 1.6; }

/* ── Assinaturas ── */
.assinaturas-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 3mm; margin-top: 2mm; }
.assinatura-box { border-top: 1.5px solid #333; padding-top: 2mm; }
.assinatura-label { font-size: 7.5pt; font-weight: bold; color: #333; }
.assinatura-nome { font-size: 8pt; color: #555; margin-top: 1mm; min-height: 6mm; font-style: italic; }
.assinatura-data { font-size: 7pt; color: #888; margin-top: 1mm; }

/* ── Rodapé ── */
.rodape { border-top: 1px solid #ddd; padding-top: 3mm; margin-top: 5mm; display: flex; justify-content: space-between; align-items: center; }
.rodape-text { font-size: 7.5pt; color: #888; }

@media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`;

export function gerarNotaGerencialHTML({ pedido, expedicao, cliente, ordemProducao, config = {} }) {
  const empresa = getEmpresa();
  const logo = empresa.logo_url || DEFAULT_LOGO;
  const nomeEmpresa = empresa.nome || 'RAIO DO SOL';
  const cnpjEmpresa = empresa.cnpj || '00.000.000/0000-00';
  const endEmpresa = empresa.endereco || '';
  const telEmpresa = empresa.telefone || '';
  const emailEmpresa = empresa.email || '';

  const tipoDoc = config.tipo === 'romaneio' ? 'Romaneio de Expedição' : 'Nota Gerencial de Transporte';
  const numDoc = expedicao?.numero_nf || pedido?.numero || '—';
  const dataEmissao = new Date().toLocaleDateString('pt-BR');
  const horaEmissao = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // Cliente
  const nomeCliente = pedido?.cliente_nome || expedicao?.cliente_nome || cliente?.nome || '—';
  const telCliente = cliente?.telefone || '—';
  const emailCliente = cliente?.email || '—';
  const endCliente = cliente?.endereco || pedido?.destino_endereco || '—';
  const cnpjCliente = cliente?.cnpj_cpf || '—';

  // Entrega
  const DESTINO_LABELS = {
    retirada_fabrica: '🏭 Retirada na Fábrica',
    retirada_unidade: '🏢 Retirada na Unidade',
    transportadora: '🚛 Entrega via Transportadora',
    entrega_cliente: '🏠 Entrega no Endereço',
  };
  const tipoEntrega = DESTINO_LABELS[pedido?.destino_tipo] || expedicao?.transportadora || '—';
  const transportadora = expedicao?.transportadora || pedido?.destino_transportadora || '—';
  const unidadeRetirada = pedido?.destino_unidade || '—';

  // Pedido
  const numPedido = pedido?.numero || expedicao?.pedido_numero || '—';
  const numOP = ordemProducao?.numero || pedido?.ordens_producao_ids?.[0] || '—';
  const dataPedido = fmtDate(pedido?.data_pedido);
  const dataExpedicao = fmtDate(expedicao?.data_emissao);
  const dataEntrega = fmtDate(pedido?.data_entrega_prevista);

  // Itens
  const itens = pedido?.itens || expedicao?.itens || [];
  let totalQtd = 0;
  let pesoTotal = 0;
  const itensHTML = itens.map((item, i) => {
    const qtd = item.quantidade || 0;
    const pesoUnit = item.peso_kg || 0;
    const pesoItem = pesoUnit * qtd;
    totalQtd += qtd;
    pesoTotal += pesoItem;
    return `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${item.codigo || '—'}</td>
        <td><strong>${item.produto_nome || '—'}</strong></td>
        <td class="right">${qtd}</td>
        <td class="center">${item.unidade || 'UN'}</td>
        <td class="center">${item.lote || '—'}</td>
        <td class="right">${pesoUnit > 0 ? pesoUnit.toFixed(3) + ' kg' : '—'}</td>
        <td class="right">${pesoItem > 0 ? pesoItem.toFixed(3) + ' kg' : '—'}</td>
        <td>${item.observacoes || ''}</td>
      </tr>`;
  }).join('');

  const totalItens = itens.length;
  const totalVolumes = config.volumes || 1;
  const totalCaixas = config.caixas || Math.ceil(totalQtd / 12) || '—';

  // Observações concat
  const obsGerais = [
    pedido?.observacoes,
    expedicao?.observacoes,
    config.obs_transporte,
  ].filter(Boolean).join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>${tipoDoc} — ${numDoc}</title>
  <style>${CSS}</style>
</head>
<body>
<div class="page">

  <!-- AVISO NÃO FISCAL -->
  <div class="aviso-nao-fiscal">
    ⚠️ DOCUMENTO SEM VALOR FISCAL — ${tipoDoc.toUpperCase()} — USO INTERNO OPERACIONAL
  </div>

  <!-- CABEÇALHO -->
  <div class="header">
    <div class="header-left">
      <div class="header-logo"><img src="${logo}" alt="Logo"/></div>
      <div>
        <div class="empresa-nome">${nomeEmpresa}</div>
        <div class="empresa-sub">
          ${cnpjEmpresa ? `CNPJ: ${cnpjEmpresa}<br/>` : ''}
          ${endEmpresa ? `${endEmpresa}<br/>` : ''}
          ${telEmpresa ? `Tel: ${telEmpresa}` : ''}
          ${emailEmpresa ? ` · ${emailEmpresa}` : ''}
        </div>
      </div>
    </div>
    <div class="header-right">
      <div class="doc-tipo">${tipoDoc}</div>
      <div class="doc-titulo">${config.tipo === 'romaneio' ? 'ROMANEIO' : 'NOTA GERENCIAL'}</div>
      <div class="doc-numero"># ${numDoc}</div>
      <div class="doc-emissao">Emitido em: ${dataEmissao} às ${horaEmissao}</div>
    </div>
  </div>

  <!-- DADOS DO CLIENTE -->
  <div class="section">
    <div class="section-title">Destinatário / Cliente</div>
    <div class="section-body">
      <div class="info-grid grid-3">
        <div class="info-item" style="grid-column: span 2;">
          <div class="info-label">Nome / Razão Social</div>
          <div class="info-value" style="font-size:11pt;">${nomeCliente}</div>
        </div>
        <div class="info-item">
          <div class="info-label">CPF / CNPJ</div>
          <div class="info-value">${cnpjCliente}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Telefone</div>
          <div class="info-value">${telCliente}</div>
        </div>
        <div class="info-item">
          <div class="info-label">E-mail</div>
          <div class="info-value">${emailCliente}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Endereço</div>
          <div class="info-value">${endCliente}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- DADOS DA ENTREGA -->
  <div class="section">
    <div class="section-title">Dados da Entrega</div>
    <div class="section-body">
      <div class="info-grid grid-4">
        <div class="info-item">
          <div class="info-label">Forma de Entrega</div>
          <div class="info-value">${tipoEntrega}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Transportadora</div>
          <div class="info-value">${transportadora}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Unidade de Retirada</div>
          <div class="info-value">${unidadeRetirada}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Previsão de Entrega</div>
          <div class="info-value">${dataEntrega}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- DADOS DO PEDIDO -->
  <div class="section">
    <div class="section-title">Dados do Pedido</div>
    <div class="section-body">
      <div class="info-grid grid-4">
        <div class="info-item">
          <div class="info-label">Nº do Pedido</div>
          <div class="info-value" style="font-size:12pt;color:#C9A227;">${numPedido}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Nº da OP</div>
          <div class="info-value">${numOP}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Data do Pedido</div>
          <div class="info-value">${dataPedido}</div>
        </div>
        <div class="info-item">
          <div class="info-label">Data da Expedição</div>
          <div class="info-value">${dataExpedicao}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- PRODUTOS -->
  <div class="section">
    <div class="section-title">Relação de Produtos</div>
    <div class="section-body" style="padding: 0;">
      <table>
        <thead>
          <tr>
            <th style="width:8mm;">Nº</th>
            <th style="width:18mm;">Código</th>
            <th>Produto / Descrição</th>
            <th class="right" style="width:14mm;">Qtd</th>
            <th class="center" style="width:12mm;">UN</th>
            <th class="center" style="width:18mm;">Lote</th>
            <th class="right" style="width:18mm;">Peso Unit.</th>
            <th class="right" style="width:18mm;">Peso Total</th>
            <th style="width:30mm;">Obs.</th>
          </tr>
        </thead>
        <tbody>
          ${itensHTML || `<tr><td colspan="9" style="text-align:center;color:#888;padding:5mm;">Nenhum item registrado</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>

  <!-- RESUMO DA CARGA -->
  <div class="section">
    <div class="section-title">Resumo da Carga</div>
    <div class="section-body">
      <div class="resumo-grid">
        <div class="resumo-item">
          <div class="resumo-value">${totalItens}</div>
          <div class="resumo-label">Produtos</div>
        </div>
        <div class="resumo-item">
          <div class="resumo-value">${totalQtd}</div>
          <div class="resumo-label">Unidades</div>
        </div>
        <div class="resumo-item">
          <div class="resumo-value">${pesoTotal > 0 ? pesoTotal.toFixed(2) + ' kg' : '—'}</div>
          <div class="resumo-label">Peso Total</div>
        </div>
        <div class="resumo-item">
          <div class="resumo-value">${totalVolumes}</div>
          <div class="resumo-label">Volumes</div>
        </div>
        <div class="resumo-item">
          <div class="resumo-value">${totalCaixas}</div>
          <div class="resumo-label">Caixas</div>
        </div>
        <div class="resumo-item">
          <div class="resumo-value">${config.pallets || '—'}</div>
          <div class="resumo-label">Pallets</div>
        </div>
        <div class="resumo-item">
          <div class="resumo-value">${fmtR(pedido?.valor_total || expedicao?.valor_total)}</div>
          <div class="resumo-label">Valor Total</div>
        </div>
        <div class="resumo-item">
          <div class="resumo-value">${pedido?.white_label ? 'Sim' : 'Não'}</div>
          <div class="resumo-label">White Label</div>
        </div>
      </div>
    </div>
  </div>

  <!-- OBSERVAÇÕES -->
  <div class="section">
    <div class="section-title">Observações e Instruções de Transporte</div>
    <div class="section-body">
      <div class="obs-box">${obsGerais ? obsGerais.replace(/\n/g, '<br/>') : 'Sem observações.'}</div>
    </div>
  </div>

  <!-- ASSINATURAS -->
  <div class="section">
    <div class="section-title">Controle de Assinaturas</div>
    <div class="section-body">
      <div class="assinaturas-grid">
        ${['Separado por', 'Conferido por', 'Expedido por', 'Motorista / Transportadora', 'Recebedor'].map(label => `
          <div class="assinatura-box">
            <div class="assinatura-label">${label}</div>
            <div class="assinatura-nome">________________________</div>
            <div class="assinatura-data">Data: ___/___/____  Hora: __:__</div>
          </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- RODAPÉ -->
  <div class="rodape">
    <div class="rodape-text">
      Documento gerado por sistema informatizado · ${nomeEmpresa} · ${dataEmissao} ${horaEmissao}
    </div>
    <div class="rodape-text" style="font-weight:bold; color:#C9A227;">
      DOCUMENTO SEM VALOR FISCAL
    </div>
    <div class="rodape-text">
      Ref. Pedido #${numPedido} · NF Gerencial ${numDoc}
    </div>
  </div>

</div>
</body>
</html>`;
}