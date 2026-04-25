import { X, Printer } from 'lucide-react';
import { useState, useEffect } from 'react';

function gerarQRCodeDataURL(texto) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=80&data=${encodeURIComponent(texto)}`;
}

export default function EtiquetaEndereco({ expedicao, onClose }) {
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  useEffect(() => {
    const textoQR = `${expedicao.numero_nf}|${expedicao.cliente_nome}|${expedicao.pedido_numero}`;
    setQrCodeUrl(gerarQRCodeDataURL(textoQR));
  }, [expedicao]);

  const data = new Date(expedicao.data_emissao || new Date());
  const dataFormatada = data.toLocaleDateString('pt-BR');
  const volume = expedicao.itens?.length || 1;
  const totalItens = (expedicao.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0);

  const imprimirEtiqueta = () => {
    const win = window.open('', '_blank', 'width=400,height=700');
    
    win.document.write(`<!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8"/>
      <title>Etiqueta de Endereço</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #fff; padding: 0; }
        .container { width: 100%; max-width: 300px; margin: 0 auto; }
        .etiqueta {
          width: 300px;
          padding: 10px;
          background: #fff;
          page-break-after: always;
        }
        
        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1px solid #333;
          padding-bottom: 8px;
          margin-bottom: 10px;
        }
        .logo-section { flex: 1; }
        .logo-empresa { font-size: 12px; font-weight: bold; color: #000; }
        .logo-info { font-size: 7px; color: #666; margin-top: 2px; line-height: 1.2; }
        .qrcode-section { text-align: right; width: 50px; }
        .qrcode-img { width: 50px; height: 50px; border: 1px solid #ccc; }
        
        /* Seção Produto */
        .secao { margin-bottom: 10px; }
        .secao-titulo { 
          font-size: 8px; font-weight: bold; color: #666; 
          text-transform: uppercase; letter-spacing: 0.5px; 
          margin-bottom: 3px; border-bottom: 1px solid #ddd; padding-bottom: 2px;
        }
        .secao-valor { font-size: 11px; font-weight: bold; color: #000; }
        
        /* Cliente */
        .cliente-box {
          border: 1px solid #333;
          padding: 8px;
          margin-bottom: 10px;
          background: #fafafa;
        }
        .cliente-label { font-size: 8px; color: #666; text-transform: uppercase; font-weight: bold; margin-bottom: 3px; }
        .cliente-nome { font-size: 12px; font-weight: bold; color: #000; line-height: 1.3; }
        .cliente-info { font-size: 9px; color: #666; margin-top: 4px; }
        
        /* Informações */
        .info-linha {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 0;
          border-bottom: 1px solid #eee;
          font-size: 10px;
        }
        .info-label { font-weight: bold; color: #666; }
        .info-valor { font-weight: bold; color: #000; font-size: 13px; }
        
        /* Volume destaque */
        .volume-linha {
          border: 1px solid #333;
          padding: 6px;
          text-align: center;
          margin-top: 8px;
        }
        .volume-label { font-size: 9px; color: #666; }
        .volume-valor { font-size: 16px; font-weight: bold; color: #000; }
        
        @media print {
          body { margin: 0; padding: 0; }
          .etiqueta { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="etiqueta">
          
          <!-- HEADER -->
          <div class="header">
            <div class="logo-section">
              <div class="logo-empresa">☀️ RAIO DO SOL</div>
              <div class="logo-info">
                Velas e Cosméticos<br/>
                (11) 9999-9999<br/>
                CNPJ: 00.000.000/0000-00
              </div>
            </div>
            <div class="qrcode-section">
              <img src="${qrCodeUrl}" alt="QR" class="qrcode-img"/>
            </div>
          </div>

          <!-- PRODUTO -->
          <div class="secao">
            <div class="secao-titulo">PRODUTO</div>
            <div class="secao-valor">${expedicao.itens?.[0]?.produto_nome || 'Múltiplos produtos'}</div>
          </div>

          <!-- CLIENTE -->
          <div class="cliente-box">
            <div class="cliente-label">Destinatário</div>
            <div class="cliente-nome">${expedicao.cliente_nome || '—'}</div>
            <div class="cliente-info">Retirada/Entrega</div>
          </div>

          <!-- NF/NP -->
          <div class="info-linha">
            <span class="info-label">NF/NP:</span>
            <span class="info-valor">${expedicao.numero_nf || '—'}</span>
          </div>
          
          <!-- DATA -->
          <div class="info-linha">
            <span class="info-label">DATA:</span>
            <span class="info-valor">${dataFormatada}</span>
          </div>

          <!-- VOLUME -->
          <div class="volume-linha">
            <div class="volume-label">VOLUME</div>
            <div class="volume-valor">${volume}/${totalItens}</div>
          </div>

        </div>
      </div>
      <script>window.onload=()=>setTimeout(()=>window.print(),400);</script>
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
            <h3 className="font-bold text-foreground">Etiqueta de Endereço</h3>
            <p className="text-xs text-muted-foreground">NF {expedicao.numero_nf}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="bg-white rounded-lg border border-gray-300 p-4 space-y-3" style={{ width: '300px', margin: '0 auto', fontFamily: 'Arial, sans-serif', fontSize: '12px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #333', paddingBottom: '8px', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>☀️ RAIO DO SOL</div>
                <div style={{ fontSize: '7px', color: '#666', marginTop: '2px', lineHeight: '1.2' }}>
                  Velas e Cosméticos<br/>
                  (11) 9999-9999<br/>
                  CNPJ: 00.000.000/0000-00
                </div>
              </div>
              {qrCodeUrl && (
                <div style={{ textAlign: 'right', width: '50px' }}>
                  <img src={qrCodeUrl} alt="QR" style={{ width: '50px', height: '50px', border: '1px solid #ccc' }} />
                </div>
              )}
            </div>

            {/* Produto */}
            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '8px', fontWeight: 'bold', color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px', borderBottom: '1px solid #ddd', paddingBottom: '2px' }}>PRODUTO</div>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#000' }}>{expedicao.itens?.[0]?.produto_nome || 'Múltiplos produtos'}</div>
            </div>

            {/* Cliente */}
            <div style={{ border: '1px solid #333', padding: '8px', background: '#fafafa', marginBottom: '10px' }}>
              <div style={{ fontSize: '8px', color: '#666', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '3px' }}>Destinatário</div>
              <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#000', lineHeight: '1.3' }}>{expedicao.cliente_nome || '—'}</div>
              <div style={{ fontSize: '9px', color: '#666', marginTop: '4px' }}>Retirada/Entrega</div>
            </div>

            {/* NF/NP */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #eee', fontSize: '10px' }}>
              <span style={{ fontWeight: 'bold', color: '#666' }}>NF/NP:</span>
              <span style={{ fontWeight: 'bold', color: '#000', fontSize: '13px' }}>{expedicao.numero_nf || '—'}</span>
            </div>

            {/* Data */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #eee', fontSize: '10px' }}>
              <span style={{ fontWeight: 'bold', color: '#666' }}>DATA:</span>
              <span style={{ fontWeight: 'bold', color: '#000', fontSize: '13px' }}>{dataFormatada}</span>
            </div>

            {/* Volume */}
            <div style={{ border: '1px solid #333', padding: '6px', textAlign: 'center', marginTop: '8px' }}>
              <div style={{ fontSize: '9px', color: '#666' }}>VOLUME</div>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#000' }}>{volume}/{totalItens}</div>
            </div>

          </div>

          {/* Botões */}
          <div className="space-y-2">
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
    </div>
  );
}