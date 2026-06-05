// getPrinterConfig: lê do localStorage (sincronizado pelo banco via AbaEtiquetas)
function getPrinterConfig() {
  try { return JSON.parse(localStorage.getItem('printer_config') || '{}'); } catch { return {}; }
}

function getDimensoes(config) {
  if (config.tamanho === 'custom') {
    return { w: config.largura_custom || 100, h: config.altura_custom || 50 };
  }
  const TAMANHOS = {
    '100x150': { w: 100, h: 150 },
    '100x50':  { w: 100, h: 50 },
    '100x30':  { w: 100, h: 30 },
    '80x40':   { w: 80,  h: 40 },
    '60x40':   { w: 60,  h: 40 },
    '58x40':   { w: 58,  h: 40 },
  };
  return TAMANHOS[config.tamanho] || { w: 100, h: 50 };
}

function gerarZPL({ produto_nome, quantidade, lote, data_producao, codigo_barras, w, h, copias, volume, total_volumes }) {
  const cod = codigo_barras || '0000000';
  const volLine = total_volumes > 1 ? `^FO20,82^ADN,13,7^FDCaixa ${volume}/${total_volumes}^FS\n` : '';
  const bcY = total_volumes > 1 ? 100 : 88;
  return `^XA
^PW${Math.round(w * 8)}
^LL${Math.round(h * 8)}
^FO20,15^ADN,18,10^FD${produto_nome}^FS
^FO20,45^ADN,13,7^FDLote: ${lote || '—'}^FS
^FO20,65^ADN,13,7^FDQtd: ${quantidade} un  Data: ${data_producao || '—'}^FS
${volLine}^FO20,${bcY}^BY2^BCN,55,Y,N,N^FD${cod}^FS
^PQ${copias || 1}
^XZ`;
}

function gerarTSPL({ produto_nome, quantidade, lote, data_producao, codigo_barras, w, h, copias, volume, total_volumes }) {
  const cod = codigo_barras || '0000000';
  const volLine = total_volumes > 1 ? `TEXT 10,150,"2",0,1,1,"Caixa ${volume}/${total_volumes}"\n` : '';
  if (h >= 150) {
    const barY = total_volumes > 1 ? 185 : 165;
    const sepY = total_volumes > 1 ? 175 : 155;
    return `SIZE ${w} mm, ${h} mm
GAP 2 mm, 0 mm
CLS
TEXT 10,10,"4",0,1,1,"${produto_nome}"
TEXT 10,60,"2",0,1,1,"Lote: ${lote || '—'}"
TEXT 10,90,"2",0,1,1,"Quantidade: ${quantidade} un"
TEXT 10,120,"2",0,1,1,"Fabricado: ${data_producao || '—'}"
${volLine}BAR 0,${sepY},800,2
BARCODE 10,${barY},"128",120,1,0,3,3,"${cod}"
BAR 0,310,800,2
TEXT 10,320,"1",0,1,1,"Raio do Sol — Gestao Industrial"
PRINT ${copias || 1}`;
  }
  const barY = total_volumes > 1 ? 110 : 95;
  const volLine2 = total_volumes > 1 ? `TEXT 10,90,"2",0,1,1,"Caixa ${volume}/${total_volumes}"\n` : '';
  return `SIZE ${w} mm, ${h} mm
GAP 2 mm, 0 mm
CLS
TEXT 10,10,"3",0,1,1,"${produto_nome}"
TEXT 10,50,"2",0,1,1,"Lote: ${lote || '—'}"
TEXT 10,70,"2",0,1,1,"Qtd: ${quantidade} un  Data: ${data_producao || '—'}"
${volLine2}BARCODE 10,${barY},"128",60,1,0,2,2,"${cod}"
PRINT ${copias || 1}`;
}

function gerarEPL({ produto_nome, quantidade, lote, data_producao, codigo_barras, w, h, copias, volume, total_volumes }) {
  const cod = codigo_barras || '0000000';
  const volLine = total_volumes > 1 ? `A10,80,0,2,1,1,N,"Caixa ${volume}/${total_volumes}"\n` : '';
  const bcY = total_volumes > 1 ? 100 : 80;
  return `N
q${w * 8}
A10,10,0,3,1,1,N,"${produto_nome}"
A10,40,0,2,1,1,N,"Lote: ${lote || '—'}"
A10,60,0,2,1,1,N,"Qtd: ${quantidade} un  Data: ${data_producao || '—'}"
${volLine}B10,${bcY},0,1,2,2,60,B,"${cod}"
P${copias || 1}`;
}

function downloadPRN(conteudo, nome) {
  const blob = new Blob([conteudo], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

function imprimirHTML({ produto_nome, quantidade, lote, data_producao, codigo_barras, copias, num_volumes }) {
  const win = window.open('', '_blank', 'width=420,height=600');
  if (!win) return;
  const cod = codigo_barras || '0000000';
  const totalLabels = num_volumes > 1 ? num_volumes : (copias || 1);

  const labels = Array.from({ length: totalLabels }).map((_, i) => {
    const volumeBadge = num_volumes > 1
      ? `<div class="volume-badge">Caixa ${i + 1}/${totalLabels}</div>`
      : '';
    return `
      <div class="etiqueta">
        <div class="header">
          <div>
            <div class="marca-nome">☀️ RAIO DO SOL</div>
            <div class="marca-sub">Gestão Industrial</div>
          </div>
          <div style="font-size:10px;color:#666;text-align:right;">
            ${data_producao ? `Fab: <strong>${data_producao}</strong>` : ''}
          </div>
        </div>
        <div class="produto">${produto_nome}</div>
        <div class="info-row"><span>Quantidade:</span><strong>${quantidade} un</strong></div>
        ${lote ? `<div class="info-row"><span>Lote:</span><strong>${lote}</strong></div>` : ''}
        ${volumeBadge}
        <div class="barcode-wrap">
          <svg id="barcode${i}"></svg>
          <div class="barcode-num">${cod}</div>
        </div>
      </div>`;
  }).join('');

  const barcodeInit = Array.from({ length: totalLabels }).map((_, i) => `
    JsBarcode("#barcode${i}", "${cod}", {
      format: "CODE128", width: 2.2, height: 55,
      displayValue: false, margin: 4,
      background: "#ffffff", lineColor: "#000000"
    });`).join('');

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Etiqueta — ${produto_nome}</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; padding: 10px; font-family: Arial, sans-serif; background: #fff; }
        .etiqueta {
          border: 2px solid #000;
          border-radius: 6px;
          padding: 10px 12px;
          max-width: 340px;
          margin: 0 auto 12px;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1.5px solid #333;
          padding-bottom: 6px;
          margin-bottom: 8px;
        }
        .marca-nome { font-weight: bold; font-size: 14px; color: #B45309; letter-spacing: 1px; }
        .marca-sub { font-size: 9px; color: #666; }
        .produto { font-size: 16px; font-weight: bold; color: #111; margin: 6px 0 4px; }
        .info-row { display: flex; justify-content: space-between; font-size: 11px; color: #333; margin: 2px 0; }
        .info-row strong { color: #000; }
        .volume-badge {
          display: inline-block;
          background: #1e3a5f;
          color: #fff;
          font-size: 13px;
          font-weight: bold;
          padding: 3px 12px;
          border-radius: 4px;
          margin: 6px 0 4px;
          letter-spacing: 1px;
        }
        .barcode-wrap { text-align: center; margin-top: 10px; background: #fff; padding: 4px 0; }
        .barcode-wrap svg { max-width: 100%; }
        .barcode-num { font-size: 10px; color: #555; font-family: monospace; margin-top: 2px; letter-spacing: 2px; }
        @media print {
          body { padding: 0; }
          .etiqueta { border-color: #000; }
        }
      </style>
    </head>
    <body>
      ${labels}
      <script>
        window.onload = function() {
          ${barcodeInit}
          setTimeout(() => window.print(), 500);
        };
      <\/script>
    </body>
    </html>
  `);
  win.document.close();
}

export function imprimirEtiquetaProduto({ produto_nome, quantidade, lote, data_producao, codigo_barras, num_volumes = 1 }) {
  const config = getPrinterConfig();
  const { w, h } = getDimensoes(config);
  const copias = config.copias || 1;
  const nome_arquivo = `etiqueta_${produto_nome.replace(/\s+/g, '_')}`;

  if (config.linguagem === 'zpl') {
    const labels = Array.from({ length: num_volumes }, (_, i) =>
      gerarZPL({ produto_nome, quantidade, lote, data_producao, codigo_barras, w, h, copias, volume: i + 1, total_volumes: num_volumes })
    );
    downloadPRN(labels.join('\n'), `${nome_arquivo}.prn`);
  } else if (config.linguagem === 'tspl') {
    const labels = Array.from({ length: num_volumes }, (_, i) =>
      gerarTSPL({ produto_nome, quantidade, lote, data_producao, codigo_barras, w, h, copias, volume: i + 1, total_volumes: num_volumes })
    );
    downloadPRN(labels.join('\n'), `${nome_arquivo}.prn`);
  } else if (config.linguagem === 'epl') {
    const labels = Array.from({ length: num_volumes }, (_, i) =>
      gerarEPL({ produto_nome, quantidade, lote, data_producao, codigo_barras, w, h, copias, volume: i + 1, total_volumes: num_volumes })
    );
    downloadPRN(labels.join('\n'), `${nome_arquivo}.prn`);
  } else {
    imprimirHTML({ produto_nome, quantidade, lote, data_producao, codigo_barras, copias, num_volumes });
  }
}