export function imprimirEtiquetaProduto({ produto_nome, quantidade, lote, data_producao, codigo_barras }) {
  const win = window.open('', '_blank', 'width=400,height=300');
  if (!win) return;

  const barcodeUrl = codigo_barras
    ? `https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(codigo_barras)}&code=Code128&dpi=96&unit=Min&color=%23000000&bgcolor=%23ffffff&quiet=0&width=250&height=40`
    : null;

  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Etiqueta — ${produto_nome}</title>
      <style>
        body { margin: 0; padding: 12px; font-family: Arial, sans-serif; font-size: 12px; }
        .etiqueta { border: 2px solid #000; border-radius: 8px; padding: 12px; max-width: 320px; margin: 0 auto; }
        .marca { display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #ccc; padding-bottom: 8px; margin-bottom: 8px; }
        .marca-icon { font-size: 18px; }
        .marca-nome { font-weight: bold; font-size: 13px; color: #B45309; }
        .marca-sub { font-size: 9px; color: #666; }
        .produto { font-size: 15px; font-weight: bold; margin: 6px 0 4px; }
        .detalhe { display: flex; justify-content: space-between; font-size: 11px; color: #444; margin-bottom: 2px; }
        .barcode { text-align: center; margin-top: 8px; }
        .barcode img { max-width: 100%; height: 40px; }
        .barcode-num { font-size: 10px; color: #888; margin-top: 2px; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="etiqueta">
        <div class="marca">
          <span class="marca-icon">☀️</span>
          <div>
            <div class="marca-nome">RAIO DO SOL</div>
            <div class="marca-sub">Gestão Industrial</div>
          </div>
        </div>
        <div class="produto">${produto_nome}</div>
        <div class="detalhe"><span>Quantidade:</span><strong>${quantidade} un</strong></div>
        ${lote ? `<div class="detalhe"><span>Lote:</span><strong>${lote}</strong></div>` : ''}
        ${data_producao ? `<div class="detalhe"><span>Data:</span><strong>${data_producao}</strong></div>` : ''}
        ${barcodeUrl ? `
          <div class="barcode">
            <img src="${barcodeUrl}" onerror="this.style.display='none'" />
            <div class="barcode-num">${codigo_barras}</div>
          </div>
        ` : ''}
      </div>
      <script>window.onload = () => { setTimeout(() => window.print(), 400); };</script>
    </body>
    </html>
  `);
  win.document.close();
}