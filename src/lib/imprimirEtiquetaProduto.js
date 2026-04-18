export function imprimirEtiquetaProduto({ produto_nome, quantidade, lote, data_producao, codigo_barras }) {
  const win = window.open('', '_blank', 'width=420,height=350');
  if (!win) return;

  // Gera o código de barras via JsBarcode (SVG inline, sem dependência de URL externa)
  const codigoBarras = codigo_barras || '0000000';

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
          margin: 0 auto;
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
          <svg id="barcode"></svg>
          <div class="barcode-num">${codigoBarras}</div>
        </div>
      </div>

      <script>
        window.onload = function() {
          JsBarcode("#barcode", "${codigoBarras}", {
            format: "CODE128",
            width: 2.2,
            height: 55,
            displayValue: false,
            margin: 4,
            background: "#ffffff",
            lineColor: "#000000"
          });
          setTimeout(() => window.print(), 500);
        };
      <\/script>
    </body>
    </html>
  `);
  win.document.close();
}