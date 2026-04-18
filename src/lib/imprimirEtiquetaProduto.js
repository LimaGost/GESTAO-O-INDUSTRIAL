import { getPrinterConfig } from '@/components/configuracoes/AbaEtiquetas';

function getDimensoes(config) {
  if (config.tamanho === 'custom') {
    return { w: config.largura_custom || 100, h: config.altura_custom || 50 };
  }
  const TAMANHOS = {
    '100x50': { w: 100, h: 50 },
    '100x30': { w: 100, h: 30 },
    '80x40':  { w: 80,  h: 40 },
    '60x40':  { w: 60,  h: 40 },
    '58x40':  { w: 58,  h: 40 },
  };
  return TAMANHOS[config.tamanho] || { w: 100, h: 50 };
}

function gerarZPL({ produto_nome, quantidade, lote, data_producao, codigo_barras, w, h, copias }) {
  const cod = codigo_barras || '0000000';
  return `^XA
^PW${Math.round(w * 8)}
^LL${Math.round(h * 8)}
^FO20,15^ADN,18,10^FD${produto_nome}^FS
^FO20,45^ADN,13,7^FDLote: ${lote || '—'}^FS
^FO20,65^ADN,13,7^FDQtd: ${quantidade} un  Data: ${data_producao || '—'}^FS
^FO20,88^BY2^BCN,55,Y,N,N^FD${cod}^FS
^PQ${copias || 1}
^XZ`;
}

function gerarTSPL({ produto_nome, quantidade, lote, data_producao, codigo_barras, w, h, copias }) {
  const cod = codigo_barras || '0000000';
  return `SIZE ${w} mm, ${h} mm
GAP 2 mm, 0 mm
CLS
TEXT 10,10,"3",0,1,1,"${produto_nome}"
TEXT 10,50,"2",0,1,1,"Lote: ${lote || '—'}"
TEXT 10,70,"2",0,1,1,"Qtd: ${quantidade} un  Data: ${data_producao || '—'}"
BARCODE 10,95,"128",60,1,0,2,2,"${cod}"
PRINT ${copias || 1}`;
}

function gerarEPL({ produto_nome, quantidade, lote, data_producao, codigo_barras, w, h, copias }) {
  const cod = codigo_barras || '0000000';
  return `N
q${w * 8}
A10,10,0,3,1,1,N,"${produto_nome}"
A10,40,0,2,1,1,N,"Lote: ${lote || '—'}"
A10,60,0,2,1,1,N,"Qtd: ${quantidade} un  Data: ${data_producao || '—'}"
B10,80,0,1,2,2,60,B,"${cod}"
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

function imprimirHTML({ produto_nome, quantidade, lote, data_producao, codigo_barras, copias }) {
  const win = window.open('', '_blank', 'width=420,height=350');
  if (!win) return;
  const cod = codigo_barras || '0000000';

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
      ${Array.from({ length: copias || 1 }).map((_, i) => `
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
        <div class="barcode-wrap">
          <svg id="barcode${i}"></svg>
          <div class="barcode-num">${cod}</div>
        </div>
      </div>`).join('')}
      <script>
        window.onload = function() {
          ${Array.from({ length: copias || 1 }).map((_, i) => `
          JsBarcode("#barcode${i}", "${cod}", {
            format: "CODE128", width: 2.2, height: 55,
            displayValue: false, margin: 4,
            background: "#ffffff", lineColor: "#000000"
          });`).join('')}
          setTimeout(() => window.print(), 500);
        };
      <\/script>
    </body>
    </html>
  `);
  win.document.close();
}

export function imprimirEtiquetaProduto({ produto_nome, quantidade, lote, data_producao, codigo_barras }) {
  const config = getPrinterConfig();
  const { w, h } = getDimensoes(config);
  const copias = config.copias || 1;
  const params = { produto_nome, quantidade, lote, data_producao, codigo_barras, w, h, copias };

  if (config.linguagem === 'zpl') {
    downloadPRN(gerarZPL(params), `etiqueta_${produto_nome.replace(/\s+/g, '_')}.prn`);
  } else if (config.linguagem === 'tspl') {
    downloadPRN(gerarTSPL(params), `etiqueta_${produto_nome.replace(/\s+/g, '_')}.prn`);
  } else if (config.linguagem === 'epl') {
    downloadPRN(gerarEPL(params), `etiqueta_${produto_nome.replace(/\s+/g, '_')}.prn`);
  } else {
    // html (padrão)
    imprimirHTML(params);
  }
}