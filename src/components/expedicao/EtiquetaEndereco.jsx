import { X, Printer } from 'lucide-react';
import { useState, useEffect } from 'react';

function gerarQRCodeDataURL(texto) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=160&data=${encodeURIComponent(texto)}`;
}

function getEmpresa() {
  try { return JSON.parse(localStorage.getItem('empresa_config') || '{}'); } catch { return {}; }
}

export default function EtiquetaEndereco({ expedicao, onClose }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const empresa = getEmpresa();

  useEffect(() => {
    const textoQR = `${expedicao.numero_nf}|${expedicao.cliente_nome}|${expedicao.pedido_numero || ''}`;
    setQrCodeUrl(gerarQRCodeDataURL(textoQR));
  }, [expedicao]);

  const dataFormatada = (() => {
    const d = expedicao.data_emissao || new Date().toISOString().split('T')[0];
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  })();

  // Volume: número de itens distintos / total de unidades
  const totalVolumes = expedicao.itens?.length || 1;
  const totalUnidades = (expedicao.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0) || 1;

  // Nome do produto principal
  const nomeProduto = expedicao.itens?.length > 1
    ? `${expedicao.itens[0].produto_nome} (+${expedicao.itens.length - 1} itens)`
    : (expedicao.itens?.[0]?.produto_nome || 'Múltiplos produtos');

  const nomeEmpresa = empresa.nome || 'RAIO DO SOL';
  const logoUrl = empresa.logo_url || '';
  const enderecoEmpresa = empresa.endereco || '';
  const telefoneEmpresa = empresa.telefone || '';
  const cnpjEmpresa = empresa.cnpj || '';

  const gerarHtmlEtiqueta = (volumeAtual, volumeTotal) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Etiqueta ${expedicao.numero_nf}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4; margin: 0; }
    html, body {
      width: 210mm;
      height: 297mm;
      font-family: Arial, Helvetica, sans-serif;
      background: #fff;
      color: #000;
    }
    .pagina {
      width: 210mm;
      height: 297mm;
      display: flex;
      flex-direction: column;
      page-break-after: always;
    }

    /* ── HEADER: Logo + Endereço empresa ── */
    .header {
      display: flex;
      align-items: stretch;
      border-bottom: 3px solid #000;
      padding: 14mm 12mm;
      gap: 10mm;
      flex: 0 0 auto;
    }
    .header-logo {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .header-logo img {
      width: 44mm;
      height: 44mm;
      object-fit: contain;
    }
    .header-logo-placeholder {
      width: 44mm;
      height: 44mm;
      background: #f5f5f5;
      border: 2px solid #ccc;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22pt;
      font-weight: bold;
      color: #666;
      text-align: center;
      letter-spacing: 1px;
    }
    .header-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2mm;
    }
    .header-info .empresa-nome {
      font-size: 16pt;
      font-weight: bold;
      color: #000;
      letter-spacing: 0.5px;
    }
    .header-info .empresa-detalhe {
      font-size: 9pt;
      color: #333;
      line-height: 1.6;
    }

    /* ── CORPO: ocupa o restante da folha ── */
    .corpo {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    /* Cada bloco de info */
    .bloco {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      border-bottom: 3px solid #000;
      padding: 0 12mm;
    }
    .bloco:last-child { border-bottom: none; }

    .bloco-label {
      font-size: 9pt;
      font-weight: bold;
      color: #555;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 3mm;
    }

    /* Produto — inline com QR */
    .bloco-produto {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 8mm;
    }
    .bloco-produto .produto-texto { flex: 1; }
    .bloco-produto .produto-nome {
      font-size: 22pt;
      font-weight: bold;
      color: #000;
      line-height: 1.2;
    }
    .bloco-produto .qrcode img {
      width: 36mm;
      height: 36mm;
      display: block;
    }

    /* Cliente */
    .bloco-cliente .cliente-nome {
      font-size: 18pt;
      font-weight: bold;
      color: #000;
      line-height: 1.3;
    }
    .bloco-cliente .cliente-sub {
      font-size: 12pt;
      color: #444;
      margin-top: 2mm;
    }

    /* NF/NP */
    .bloco-nf { flex-direction: row; align-items: center; gap: 0; }
    .bloco-nf .nf-label {
      font-size: 20pt;
      font-weight: bold;
      color: #000;
      min-width: 50mm;
    }
    .bloco-nf .nf-valor {
      font-size: 40pt;
      font-weight: bold;
      color: #000;
      letter-spacing: 2px;
    }

    /* Data */
    .bloco-data { flex-direction: row; align-items: center; gap: 0; }
    .bloco-data .data-valor {
      font-size: 32pt;
      font-weight: bold;
      color: #000;
      letter-spacing: 2px;
    }

    /* Volume */
    .bloco-volume { flex-direction: row; align-items: center; gap: 0; }
    .bloco-volume .vol-label {
      font-size: 20pt;
      font-weight: bold;
      color: #000;
      min-width: 50mm;
    }
    .bloco-volume .vol-valor {
      font-size: 40pt;
      font-weight: bold;
      color: #000;
      letter-spacing: 2px;
    }

    @media print {
      html, body { width: 210mm; height: 297mm; }
      .pagina { page-break-after: always; }
    }
  </style>
</head>
<body>
  <div class="pagina">

    <!-- HEADER -->
    <div class="header">
      <div class="header-logo">
        ${logoUrl
          ? `<img src="${logoUrl}" alt="Logo"/>`
          : `<div class="header-logo-placeholder">☀️<br/>${nomeEmpresa}</div>`
        }
      </div>
      <div class="header-info">
        <div class="empresa-nome">${nomeEmpresa}</div>
        <div class="empresa-detalhe">
          ${enderecoEmpresa ? `${enderecoEmpresa}<br/>` : ''}
          ${telefoneEmpresa ? `Telefone: ${telefoneEmpresa}<br/>` : ''}
          ${cnpjEmpresa ? `CNPJ: ${cnpjEmpresa}` : ''}
        </div>
      </div>
    </div>

    <!-- CORPO -->
    <div class="corpo">

      <!-- PRODUTO + QR -->
      <div class="bloco bloco-produto">
        <div class="produto-texto">
          <div class="bloco-label">PRODUTO</div>
          <div class="produto-nome">${nomeProduto}</div>
        </div>
        <div class="qrcode">
          <img src="${gerarQRCodeDataURL(`${expedicao.numero_nf}|${expedicao.cliente_nome}|${expedicao.pedido_numero || ''}`)}" alt="QR"/>
        </div>
      </div>

      <!-- CLIENTE -->
      <div class="bloco bloco-cliente">
        <div class="cliente-nome">Cliente: ${expedicao.cliente_nome || '—'}</div>
        <div class="cliente-sub">${expedicao.transportadora || 'Retirada / Entrega'}</div>
      </div>

      <!-- NF/NP -->
      <div class="bloco bloco-nf">
        <div class="nf-label">NF/NP:</div>
        <div class="nf-valor">${expedicao.numero_nf || '—'}</div>
      </div>

      <!-- DATA -->
      <div class="bloco bloco-data">
        <div class="data-valor">${dataFormatada}</div>
      </div>

      <!-- VOLUME -->
      <div class="bloco bloco-volume">
        <div class="vol-label">VOLUME:</div>
        <div class="vol-valor">${volumeAtual}/${volumeTotal}</div>
      </div>

    </div>
  </div>
  <script>window.onload = () => setTimeout(() => window.print(), 400);<\/script>
</body>
</html>`;

  const imprimirEtiqueta = () => {
    // Gera uma página por volume (item)
    const volumes = totalVolumes;
    const win = window.open('', '_blank', 'width=900,height=1200');

    // Gera todas as páginas concatenadas
    let pagesHtml = '';
    for (let i = 1; i <= volumes; i++) {
      pagesHtml += gerarHtmlEtiqueta(i, volumes);
    }

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Etiqueta ${expedicao.numero_nf}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: A4; margin: 0; }
    html, body { font-family: Arial, Helvetica, sans-serif; background: #fff; }
    .pagina {
      width: 210mm; height: 297mm;
      display: flex; flex-direction: column;
      page-break-after: always;
      overflow: hidden;
    }
    .header {
      display: flex; align-items: center;
      border-bottom: 3px solid #000;
      padding: 14mm 12mm; gap: 10mm;
      flex: 0 0 auto;
    }
    .header-logo img { width: 44mm; height: 44mm; object-fit: contain; }
    .header-logo-placeholder {
      width: 44mm; height: 44mm; background: #f5f5f5;
      border: 2px solid #ccc; display: flex; align-items: center;
      justify-content: center; font-size: 18pt; font-weight: bold;
      color: #555; text-align: center;
    }
    .header-info { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 2mm; }
    .header-info .empresa-nome { font-size: 16pt; font-weight: bold; }
    .header-info .empresa-detalhe { font-size: 9pt; color: #333; line-height: 1.6; }

    .corpo { flex: 1; display: flex; flex-direction: column; }
    .bloco {
      flex: 1; display: flex; flex-direction: column;
      justify-content: center; border-bottom: 3px solid #000;
      padding: 0 12mm;
    }
    .bloco:last-child { border-bottom: none; }
    .bloco-label { font-size: 9pt; font-weight: bold; color: #555; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3mm; }
    .bloco-produto { flex-direction: row !important; align-items: center; justify-content: space-between; gap: 8mm; }
    .bloco-produto .produto-texto { flex: 1; }
    .bloco-produto .produto-nome { font-size: 22pt; font-weight: bold; color: #000; line-height: 1.2; }
    .bloco-produto .qrcode img { width: 36mm; height: 36mm; display: block; }
    .bloco-cliente .cliente-nome { font-size: 18pt; font-weight: bold; color: #000; line-height: 1.3; }
    .bloco-cliente .cliente-sub { font-size: 12pt; color: #444; margin-top: 2mm; }
    .bloco-nf { flex-direction: row !important; align-items: center; }
    .bloco-nf .nf-label { font-size: 20pt; font-weight: bold; min-width: 50mm; }
    .bloco-nf .nf-valor { font-size: 40pt; font-weight: bold; letter-spacing: 2px; }
    .bloco-data { flex-direction: row !important; align-items: center; }
    .bloco-data .data-valor { font-size: 32pt; font-weight: bold; letter-spacing: 2px; }
    .bloco-volume { flex-direction: row !important; align-items: center; }
    .bloco-volume .vol-label { font-size: 20pt; font-weight: bold; min-width: 50mm; }
    .bloco-volume .vol-valor { font-size: 40pt; font-weight: bold; letter-spacing: 2px; }
    @media print { .pagina { page-break-after: always; } }
  </style>
</head>
<body>
  ${Array.from({ length: volumes }, (_, idx) => {
    const vol = idx + 1;
    return `
  <div class="pagina">
    <div class="header">
      <div class="header-logo">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo"/>` : `<div class="header-logo-placeholder">☀️<br/>${nomeEmpresa}</div>`}
      </div>
      <div class="header-info">
        <div class="empresa-nome">${nomeEmpresa}</div>
        <div class="empresa-detalhe">
          ${enderecoEmpresa ? `${enderecoEmpresa}<br/>` : ''}
          ${telefoneEmpresa ? `Telefone: ${telefoneEmpresa}<br/>` : ''}
          ${cnpjEmpresa ? `CNPJ: ${cnpjEmpresa}` : ''}
        </div>
      </div>
    </div>
    <div class="corpo">
      <div class="bloco bloco-produto">
        <div class="produto-texto">
          <div class="bloco-label">PRODUTO</div>
          <div class="produto-nome">${nomeProduto}</div>
        </div>
        <div class="qrcode"><img src="${qrCodeUrl}" alt="QR"/></div>
      </div>
      <div class="bloco bloco-cliente">
        <div class="cliente-nome">Cliente: ${expedicao.cliente_nome || '—'}</div>
        <div class="cliente-sub">${expedicao.transportadora || 'Retirada / Entrega'}</div>
      </div>
      <div class="bloco bloco-nf">
        <div class="nf-label">NF/NP:</div>
        <div class="nf-valor">${expedicao.numero_nf || '—'}</div>
      </div>
      <div class="bloco bloco-data">
        <div class="data-valor">${dataFormatada}</div>
      </div>
      <div class="bloco bloco-volume">
        <div class="vol-label">VOLUME:</div>
        <div class="vol-valor">${vol}/${volumes}</div>
      </div>
    </div>
  </div>`;
  }).join('')}
  <script>window.onload = () => setTimeout(() => window.print(), 400);<\/script>
</body>
</html>`);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground">Etiqueta de Expedição</h3>
            <p className="text-xs text-muted-foreground">NF {expedicao.numero_nf} · {totalVolumes} volume(s)</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-5 space-y-4">
          {/* Preview simplificado */}
          <div className="border border-border rounded-xl overflow-hidden text-xs bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Header preview */}
            <div className="flex items-center gap-3 p-3 border-b-2 border-gray-800">
              {logoUrl
                ? <img src={logoUrl} alt="logo" className="w-12 h-12 object-contain rounded" />
                : <div className="w-12 h-12 bg-amber-100 rounded flex items-center justify-center text-lg">☀️</div>
              }
              <div>
                <p className="font-bold text-sm">{nomeEmpresa}</p>
                {enderecoEmpresa && <p className="text-[10px] text-gray-500 leading-tight">{enderecoEmpresa}</p>}
                {telefoneEmpresa && <p className="text-[10px] text-gray-500">Tel: {telefoneEmpresa}</p>}
                {cnpjEmpresa && <p className="text-[10px] text-gray-500">CNPJ: {cnpjEmpresa}</p>}
              </div>
            </div>
            {/* Produto + QR */}
            <div className="flex items-center justify-between p-3 border-b-2 border-gray-800">
              <div>
                <p className="text-[9px] text-gray-500 uppercase font-bold mb-1">PRODUTO</p>
                <p className="font-bold text-sm leading-tight">{nomeProduto}</p>
              </div>
              {qrCodeUrl && <img src={qrCodeUrl} alt="QR" className="w-14 h-14" />}
            </div>
            {/* Cliente */}
            <div className="p-3 border-b-2 border-gray-800">
              <p className="font-bold text-sm">Cliente: {expedicao.cliente_nome || '—'}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{expedicao.transportadora || 'Retirada / Entrega'}</p>
            </div>
            {/* NF/NP */}
            <div className="flex items-center gap-3 p-3 border-b-2 border-gray-800">
              <span className="font-bold text-base">NF/NP:</span>
              <span className="font-bold text-2xl">{expedicao.numero_nf || '—'}</span>
            </div>
            {/* Data */}
            <div className="p-3 border-b-2 border-gray-800">
              <span className="font-bold text-xl">{dataFormatada}</span>
            </div>
            {/* Volume */}
            <div className="flex items-center gap-3 p-3">
              <span className="font-bold text-base">VOLUME:</span>
              <span className="font-bold text-2xl">1/{totalVolumes}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {totalVolumes > 1 ? `Serão impressas ${totalVolumes} páginas (1 por volume)` : 'Preenche toda a folha A4'}
          </p>

          <div className="space-y-2">
            <button onClick={imprimirEtiqueta}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
              <Printer size={16} /> Imprimir Etiqueta{totalVolumes > 1 ? ` (${totalVolumes} vias)` : ''}
            </button>
            <button onClick={onClose}
              className="w-full border border-border text-muted-foreground py-2 rounded-xl text-sm hover:bg-muted transition-colors">
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}