// Gera a chave de acesso (44 dígitos simulada)
function gerarChaveAcesso(nf) {
  const chave = nf.replace(/\D/g, '').padStart(44, '0');
  return chave.replace(/(.{4})/g, '$1 ').trim();
}

// Gera código de barras em formato CODE128 (usando API ou biblioteca)
function gerarCodigoBarras(chave) {
  const codigoLimpo = chave.replace(/\s/g, '');
  return `https://barcodeapi.azurewebsites.net/api/barcodegenerator?code=${codigoLimpo}&codeType=code128`;
}

// Gera QR Code
function gerarQRCode(chave) {
  const codigoLimpo = chave.replace(/\s/g, '');
  return `https://api.qrserver.com/v1/create-qr-code/?size=150&data=${encodeURIComponent(codigoLimpo)}`;
}

// Formata valores monetários
function formatarMoeda(valor) {
  return (valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Formata CNPJ
function formatarCNPJ(cnpj) {
  if (!cnpj) return '—';
  const c = cnpj.replace(/\D/g, '');
  return c.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

// Formata CEP
function formatarCEP(cep) {
  if (!cep) return '—';
  const c = cep.replace(/\D/g, '');
  return c.replace(/(\d{5})(\d{3})/, '$1-$2');
}

// Função principal que gera o HTML da DANFE
export function gerarDANFEHTML(expedicao, emitente = {}) {
  const hoje = new Date().toLocaleDateString('pt-BR');
  const chaveAcesso = gerarChaveAcesso(expedicao.numero_nf || '');
  const codigoBarras = gerarCodigoBarras(chaveAcesso);
  const qrCode = gerarQRCode(chaveAcesso);
  
  const totalItens = (expedicao.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0);
  const valorTotal = expedicao.valor_total || 0;
  
  const itensHTML = (expedicao.itens || []).map((item, idx) => `
    <tr>
      <td style="border:1px solid #000;padding:3px;font-size:9px;text-align:center;width:25px;">${idx + 1}</td>
      <td style="border:1px solid #000;padding:3px;font-size:9px;flex:1;">${item.produto_nome || '—'}</td>
      <td style="border:1px solid #000;padding:3px;font-size:9px;text-align:center;width:50px;">—</td>
      <td style="border:1px solid #000;padding:3px;font-size:9px;text-align:center;width:50px;">UN</td>
      <td style="border:1px solid #000;padding:3px;font-size:9px;text-align:center;width:50px;">${item.quantidade || 0}</td>
      <td style="border:1px solid #000;padding:3px;font-size:9px;text-align:right;width:60px;">R$ ${formatarMoeda(item.preco_unitario || 0)}</td>
      <td style="border:1px solid #000;padding:3px;font-size:9px;text-align:center;width:50px;">—</td>
      <td style="border:1px solid #000;padding:3px;font-size:9px;text-align:right;width:60px;">R$ ${formatarMoeda(item.total || 0)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>DANFE NF-e ${expedicao.numero_nf}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', Arial, sans-serif; font-size: 10px; color: #000; background: #fff; }
    .danfe { width: 21cm; margin: 0 auto; background: #fff; page-break-after: always; }
    
    /* ────── BLOCO DE RECEBIMENTO (SUPERIOR) ────── */
    .bloco-recebimento { 
      border: 2px solid #000; 
      margin: 10px; 
      padding: 8px; 
      min-height: 60px;
      display: flex;
      gap: 20px;
    }
    .bloco-rec-texto { flex: 1; font-size: 9px; line-height: 1.4; }
    .bloco-rec-nf { text-align: center; flex: 0 0 150px; }
    .bloco-rec-nf-valor { font-size: 20px; font-weight: bold; color: #B45309; }
    .bloco-rec-nf-label { font-size: 8px; color: #666; margin-top: 4px; }
    .bloco-rec-assinatura { flex: 0 0 120px; border-top: 1px solid #000; margin-top: 20px; text-align: center; font-size: 8px; }
    
    /* ────── CABEÇALHO DANFE ────── */
    .cabecalho { display: flex; border-bottom: 3px solid #000; min-height: 70px; }
    .emitente { flex: 1; border-right: 2px solid #000; padding: 8px; display: flex; flex-direction: column; justify-content: center; }
    .emitente-nome { font-weight: bold; font-size: 13px; }
    .emitente-info { font-size: 8px; margin-top: 3px; line-height: 1.3; }
    
    .danfe-box { flex: 0 0 140px; border-right: 2px solid #000; padding: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .danfe-titulo { font-size: 13px; font-weight: bold; letter-spacing: 2px; border: 2px solid #000; padding: 3px 6px; margin-bottom: 4px; }
    .danfe-desc { font-size: 7px; text-align: center; line-height: 1.2; }
    
    .nf-box { flex: 0 0 140px; padding: 8px; display: flex; flex-direction: column; justify-content: space-around; }
    .nf-campo { text-align: center; }
    .nf-label { font-size: 8px; font-weight: bold; color: #666; }
    .nf-valor { font-size: 14px; font-weight: bold; color: #B45309; margin-top: 2px; }
    
    /* ────── CÓDIGO DE BARRAS E CHAVE ────── */
    .barcode-area { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      border-bottom: 2px solid #000; 
      padding: 8px; 
      gap: 10px;
    }
    .barcode-img { height: 50px; }
    .chave-area { text-align: right; }
    .chave-label { font-size: 8px; font-weight: bold; color: #666; }
    .chave-valor { font-family: monospace; font-size: 10px; font-weight: bold; letter-spacing: 2px; margin-top: 2px; }
    .consulta-link { font-size: 8px; color: #0066cc; margin-top: 4px; }
    
    /* ────── SEÇÕES COM CAMPOS ────── */
    .secao { border-bottom: 2px solid #000; }
    .secao-titulo { background: #e8e8e8; padding: 3px 6px; font-size: 8px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #000; }
    .secao-campos { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); }
    .campo { border-right: 1px solid #000; border-bottom: 1px solid #000; padding: 6px; min-height: 40px; display: flex; flex-direction: column; justify-content: space-between; }
    .campo:last-child { border-right: none; }
    .campo-label { font-size: 7px; font-weight: bold; color: #666; margin-bottom: 2px; }
    .campo-valor { font-size: 9px; font-weight: bold; }
    
    /* ────── TABELA DE PRODUTOS ────── */
    .produtos-header { 
      background: #333; 
      color: #fff; 
      display: flex; 
      border-bottom: 1px solid #000;
      font-size: 8px;
      font-weight: bold;
    }
    .produtos-row { display: flex; border-bottom: 1px solid #000; }
    .prod-col { border-right: 1px solid #000; padding: 3px; font-size: 9px; }
    .prod-col:last-child { border-right: none; }
    
    /* ────── TOTALIZAÇÕES ────── */
    .totais { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border-bottom: 2px solid #000; }
    .total-box { border-right: 1px solid #000; padding: 8px; text-align: right; }
    .total-box:last-child { border-right: none; }
    .total-label { font-size: 7px; font-weight: bold; color: #666; }
    .total-valor { font-size: 12px; font-weight: bold; margin-top: 3px; }
    .total-destaque { background: #FEF3C7; border: 1px solid #B45309; }
    
    /* ────── RODAPÉ ────── */
    .rodape { padding: 6px; font-size: 8px; text-align: center; color: #666; border-bottom: 2px solid #000; }
    
    @media print {
      body { margin: 0; padding: 0; }
      .danfe { margin: 0; page-break-inside: avoid; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>

<div class="danfe">

  <!-- BLOCO DE RECEBIMENTO -->
  <div class="bloco-recebimento">
    <div class="bloco-rec-texto">
      <strong>Recebemos de</strong> <strong>${emitente.nome || 'RAIO DO SOL'}</strong> <strong>os produtos/serviços constantes da nota fiscal indicada ao lado.</strong>
      <div style="margin-top: 8px; border-top: 1px solid #000; padding-top: 4px; font-size: 8px;">
        Data de Recebimento: ________________&nbsp;&nbsp;&nbsp;&nbsp;
        Identificação e Assinatura do Recebedor: ________________________________
      </div>
    </div>
    <div class="bloco-rec-nf">
      <div class="bloco-rec-nf-valor">${expedicao.numero_nf || '—'}</div>
      <div class="bloco-rec-nf-label">NF-e nº</div>
      <div class="bloco-rec-nf-label" style="margin-top: 6px;">Série: 1</div>
    </div>
  </div>

  <!-- CABEÇALHO DANFE -->
  <div class="cabecalho">
    <div class="emitente">
      <div class="emitente-nome">${emitente.nome || '☀️ RAIO DO SOL'}</div>
      <div class="emitente-info">
        ${emitente.cnpj ? 'CNPJ: ' + formatarCNPJ(emitente.cnpj) + '<br/>' : ''}
        ${emitente.endereco || 'Endereço não informado'}
      </div>
    </div>
    <div class="danfe-box">
      <div class="danfe-titulo">DANFE</div>
      <div class="danfe-desc">Documento Auxiliar da<br/>Nota Fiscal Eletrônica</div>
    </div>
    <div class="nf-box">
      <div class="nf-campo">
        <div class="nf-label">Tipo de Operação</div>
        <div class="nf-valor">1 - Saída</div>
      </div>
      <div class="nf-campo">
        <div class="nf-label">NF-e nº</div>
        <div class="nf-valor">${expedicao.numero_nf || '—'}</div>
      </div>
      <div class="nf-campo">
        <div class="nf-label">Série: 1</div>
      </div>
    </div>
  </div>

  <!-- CÓDIGO DE BARRAS E CHAVE DE ACESSO -->
  <div class="barcode-area">
    <img src="${codigoBarras}" alt="Código de Barras" class="barcode-img" style="height: 40px; width: auto;"/>
    <div class="chave-area">
      <div class="chave-label">Chave de Acesso:</div>
      <div class="chave-valor">${chaveAcesso}</div>
      <div class="consulta-link">Consulte a autenticidade em<br/>www.nfe.fazenda.gov.br</div>
    </div>
    <img src="${qrCode}" alt="QR Code" style="height: 60px; width: 60px; border: 1px solid #ccc;"/>
  </div>

  <!-- INFORMAÇÕES GERAIS -->
  <div class="secao">
    <div class="secao-titulo">Natureza da Operação</div>
    <div class="secao-campos">
      <div class="campo">
        <div class="campo-label">Natureza</div>
        <div class="campo-valor">Venda</div>
      </div>
      <div class="campo">
        <div class="campo-label">Protocolo de Autorização</div>
        <div class="campo-valor">—</div>
      </div>
      <div class="campo">
        <div class="campo-label">ICMS</div>
        <div class="campo-valor">—</div>
      </div>
    </div>
  </div>

  <!-- DESTINATÁRIO -->
  <div class="secao">
    <div class="secao-titulo">Destinatário / Tomador</div>
    <div class="secao-campos">
      <div class="campo" style="grid-column: span 3;">
        <div class="campo-label">Nome / Razão Social</div>
        <div class="campo-valor">${expedicao.cliente_nome || '—'}</div>
      </div>
      <div class="campo">
        <div class="campo-label">CNPJ / CPF</div>
        <div class="campo-valor">—</div>
      </div>
      <div class="campo">
        <div class="campo-label">Data Emissão</div>
        <div class="campo-valor">${expedicao.data_emissao || hoje}</div>
      </div>
      <div class="campo">
        <div class="campo-label">UF</div>
        <div class="campo-valor">SP</div>
      </div>
    </div>
  </div>

  <!-- DADOS DOS PRODUTOS -->
  <div class="secao">
    <div class="secao-titulo">Dados dos Produtos / Serviços</div>
    <div class="produtos-header">
      <div class="prod-col" style="width: 25px;">Nº</div>
      <div class="prod-col" style="flex: 1;">Descrição</div>
      <div class="prod-col" style="width: 50px;">NCM/SH</div>
      <div class="prod-col" style="width: 45px;">UN</div>
      <div class="prod-col" style="width: 50px;">Qtd</div>
      <div class="prod-col" style="width: 60px;">Vlr. Unit.</div>
      <div class="prod-col" style="width: 50px;">CST</div>
      <div class="prod-col" style="width: 60px;">Vlr. Total</div>
    </div>
    ${(expedicao.itens || []).map((item, idx) => `
      <div class="produtos-row">
        <div class="prod-col" style="width: 25px; text-align: center;">${idx + 1}</div>
        <div class="prod-col" style="flex: 1;">${item.produto_nome || '—'}</div>
        <div class="prod-col" style="width: 50px; text-align: center;">—</div>
        <div class="prod-col" style="width: 45px; text-align: center;">UN</div>
        <div class="prod-col" style="width: 50px; text-align: center;">${item.quantidade || 0}</div>
        <div class="prod-col" style="width: 60px; text-align: right;">R$ ${formatarMoeda(item.preco_unitario || 0)}</div>
        <div class="prod-col" style="width: 50px; text-align: center;">—</div>
        <div class="prod-col" style="width: 60px; text-align: right;">R$ ${formatarMoeda(item.total || 0)}</div>
      </div>
    `).join('')}
  </div>

  <!-- TOTALIZAÇÕES -->
  <div class="totais">
    <div class="total-box">
      <div class="total-label">Quantidade Total</div>
      <div class="total-valor">${totalItens}</div>
    </div>
    <div class="total-box">
      <div class="total-label">Valor Total Produtos</div>
      <div class="total-valor">R$ ${formatarMoeda(valorTotal)}</div>
    </div>
    <div class="total-box total-destaque">
      <div class="total-label">Valor Total NF-e</div>
      <div class="total-valor">R$ ${formatarMoeda(valorTotal)}</div>
    </div>
  </div>

  <!-- RODAPÉ -->
  <div class="rodape">
    <div>Documento emitido por sistema informatizado. Emissão: ${hoje}</div>
    <div style="margin-top: 4px; color: #B45309; font-weight: bold;">NF-e nº ${expedicao.numero_nf} | Série 1 | Modelo 55</div>
    <div style="margin-top: 4px; font-size: 7px; color: #999;">Este é um documento de teste. Não representa uma NFe válida para fins fiscais.</div>
  </div>

</div>

<script>window.onload=()=>setTimeout(()=>window.print(),400);</script>
</body>
</html>`;
}