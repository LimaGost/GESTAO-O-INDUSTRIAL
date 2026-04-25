import { X, Printer } from 'lucide-react';

export default function EtiquetaEndereco({ expedicao, onClose }) {
  const imprimirEtiqueta = () => {
    const win = window.open('', '_blank', 'width=400,height=600');
    const data = new Date(expedicao.data_emissao || new Date()).toLocaleDateString('pt-BR');
    const volume = expedicao.itens?.length || 1;
    const totalItens = (expedicao.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0);
    
    win.document.write(`<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <title>Etiqueta de Endereço</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #fff; }
        .etiqueta {
          width: 100mm;
          height: 150mm;
          padding: 8mm;
          background: #fff;
          border: 1px dashed #999;
          page-break-after: always;
          position: relative;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
          border-bottom: 2px solid #333;
          padding-bottom: 6px;
        }
        .logo {
          font-size: 10px;
          font-weight: bold;
          color: #333;
        }
        .logo-text { font-size: 8px; color: #666; margin-top: 2px; }
        .nf-numero {
          text-align: right;
          font-size: 9px;
          color: #666;
        }
        .nf-numero-valor {
          font-size: 12px;
          font-weight: bold;
          color: #333;
        }
        .qrcode {
          width: 40px;
          height: 40px;
          border: 1px solid #ccc;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8px;
          background: #f5f5f5;
          color: #999;
        }
        .titulo {
          font-size: 11px;
          font-weight: bold;
          color: #333;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 4px;
        }
        .campo {
          margin-bottom: 5px;
          font-size: 10px;
          color: #333;
        }
        .campo-label {
          font-size: 8px;
          color: #666;
          text-transform: uppercase;
          font-weight: bold;
          margin-bottom: 1px;
        }
        .campo-valor {
          font-size: 11px;
          font-weight: bold;
          color: #000;
          line-height: 1.3;
        }
        .endereco-box {
          border: 2px solid #333;
          padding: 8px;
          margin: 8px 0;
          min-height: 60px;
          background: #fafafa;
        }
        .endereco-titulo {
          font-size: 9px;
          color: #666;
          text-transform: uppercase;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .endereco-valor {
          font-size: 12px;
          font-weight: bold;
          color: #000;
          line-height: 1.4;
        }
        .info-row {
          display: flex;
          justify-content: space-between;
          margin: 6px 0;
          font-size: 10px;
          color: #333;
        }
        .info-row strong {
          margin-right: 4px;
        }
        .footer {
          position: absolute;
          bottom: 8mm;
          left: 8mm;
          right: 8mm;
          font-size: 8px;
          color: #999;
          text-align: center;
        }
        @media print {
          body { margin: 0; padding: 0; }
          .etiqueta { border: none; }
        }
      </style>
    </head>
    <body>
      <div class="etiqueta">
        <div class="header">
          <div>
            <div class="logo">☀️ RAIO DO SOL</div>
            <div class="logo-text">Velas e Cosméticos</div>
          </div>
          <div class="qrcode">QR</div>
          <div class="nf-numero">
            NF: <div class="nf-numero-valor">${expedicao.numero_nf || '—'}</div>
          </div>
        </div>

        <div class="campo">
          <div class="campo-label">Produto Principal</div>
          <div class="campo-valor">${expedicao.itens?.[0]?.produto_nome || 'Múltiplos produtos'}</div>
        </div>

        <div class="endereco-box">
          <div class="endereco-titulo">Destinatário</div>
          <div class="endereco-valor">${expedicao.cliente_nome || '—'}</div>
        </div>

        <div class="info-row">
          <div><strong>NE/NP:</strong> ${expedicao.pedido_numero || '—'}</div>
        </div>

        <div class="info-row">
          <div><strong>Data:</strong> ${data}</div>
        </div>

        <div class="info-row">
          <div><strong>VOLUME:</strong> ${volume}/${totalItens}</div>
        </div>

        <div class="footer">
          Emitido via Sistema · ${new Date().toLocaleDateString('pt-BR')}
        </div>
      </div>
    </body>
    </html>`);
    win.document.close();
    setTimeout(() => win.print(), 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground">Etiqueta de Endereço</h3>
            <p className="text-xs text-muted-foreground">NF {expedicao.numero_nf}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-4 space-y-3">
          <div className="bg-muted/20 rounded-xl p-4 border border-border space-y-3" style={{ width: '100%', maxWidth: '100mm', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '6px', borderBottom: '2px solid #333' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#333' }}>☀️ RAIO DO SOL</div>
                <div style={{ fontSize: '8px', color: '#666', marginTop: '2px' }}>Velas e Cosméticos</div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '9px', color: '#666' }}>
                NF: <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#333' }}>{expedicao.numero_nf || '—'}</div>
              </div>
            </div>

            {/* Produto */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '8px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Produto</div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#000' }}>
                {expedicao.itens?.[0]?.produto_nome || 'Múltiplos produtos'}
              </div>
            </div>

            {/* Destinatário */}
            <div style={{ border: '2px solid #333', padding: '8px', background: '#fafafa', minHeight: '40px' }}>
              <div style={{ fontSize: '8px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '4px' }}>Destinatário</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#000', lineHeight: '1.4' }}>
                {expedicao.cliente_nome || '—'}
              </div>
            </div>

            {/* Infos */}
            <div style={{ fontSize: '10px', color: '#333', marginTop: '8px' }}>
              <div style={{ marginBottom: '4px' }}>
                <strong>NE/NP:</strong> {expedicao.pedido_numero || '—'}
              </div>
              <div style={{ marginBottom: '4px' }}>
                <strong>Data:</strong> {new Date(expedicao.data_emissao || new Date()).toLocaleDateString('pt-BR')}
              </div>
              <div>
                <strong>VOLUME:</strong> {expedicao.itens?.length || 1}/{(expedicao.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0)}
              </div>
            </div>
          </div>

          {/* Botão */}
          <button
            onClick={imprimirEtiqueta}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Printer size={16} /> Imprimir Etiqueta
          </button>
          <button
            onClick={onClose}
            className="w-full border border-border text-muted-foreground py-2 rounded-xl text-sm hover:bg-muted transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}