import { X, Printer, Plus, Minus } from 'lucide-react';
import { useState } from 'react';

function gerarQRCodeDataURL(texto) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=160&data=${encodeURIComponent(texto)}`;
}

function getEmpresa() {
  try { return JSON.parse(localStorage.getItem('empresa_config') || '{}'); } catch { return {}; }
}

const CSS_ETIQUETA = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 100mm 150mm; margin: 0; }
  html, body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #000; }
  .pagina { width: 100mm; height: 150mm; display: flex; flex-direction: column; page-break-after: always; overflow: hidden; }

  /* HEADER */
  .header { display: flex; align-items: center; border-bottom: 2px solid #000; padding: 2.5mm 3mm; gap: 3mm; flex: 0 0 auto; }
  .header-logo img { width: 18mm; height: 18mm; object-fit: contain; }
  .header-logo-placeholder { width: 18mm; height: 18mm; background: #f0f0f0; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 8pt; font-weight: bold; color: #555; text-align: center; }
  .header-info { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .header-info .empresa-nome { font-size: 7pt; font-weight: bold; }
  .header-info .empresa-detalhe { font-size: 5pt; color: #333; line-height: 1.5; margin-top: 0.5mm; }

  /* CORPO */
  .corpo { flex: 1; display: flex; flex-direction: column; }
  .bloco { display: flex; flex-direction: column; justify-content: center; border-bottom: 1.5px solid #000; padding: 2mm 3mm; }
  .bloco:last-child { border-bottom: none; }
  .bloco-label { font-size: 5pt; font-weight: bold; color: #555; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1mm; }

  /* PRODUTO + QR */
  .bloco-produto { flex-direction: row; align-items: center; justify-content: space-between; gap: 2mm; flex: 1.5; }
  .bloco-produto .produto-texto { flex: 1; }
  .bloco-produto .produto-nome { font-size: 11pt; font-weight: bold; color: #000; line-height: 1.2; }
  .bloco-produto .qrcode img { width: 20mm; height: 20mm; display: block; }

  /* CLIENTE — destaque */
  .bloco-cliente { flex: 1.2; }
  .bloco-cliente .cliente-nome { font-size: 9pt; font-weight: bold; color: #000; line-height: 1.3; }
  .bloco-cliente .cliente-sub { font-size: 7pt; color: #222; margin-top: 0.5mm; font-weight: 600; }

  /* NF — bem destacado */
  .bloco-nf { flex-direction: row; align-items: center; gap: 2mm; flex: 1; }
  .bloco-nf .nf-label { font-size: 12pt; font-weight: 900; color: #000; min-width: 18mm; }
  .bloco-nf .nf-valor { font-size: 20pt; font-weight: 900; color: #000; letter-spacing: 1px; }

  /* DATA */
  .bloco-data { flex: 0.8; }
  .bloco-data .data-valor { font-size: 10pt; font-weight: bold; color: #000; letter-spacing: 0.5px; }

  /* VOLUME — bem destacado */
  .bloco-volume { flex-direction: row; align-items: center; gap: 2mm; flex: 1.2; }
  .bloco-volume .vol-label { font-size: 12pt; font-weight: 900; color: #000; min-width: 18mm; }
  .bloco-volume .vol-valor { font-size: 22pt; font-weight: 900; color: #000; letter-spacing: 1px; }

  @media print { .pagina { page-break-after: always; } }
`;

function gerarPagina({ nomeEmpresa, logoUrl, enderecoEmpresa, telefoneEmpresa, cnpjEmpresa, nomeProduto, qrCodeUrl, clienteNome, transportadora, numero_nf, dataFormatada, volAtual, volTotal }) {
  return `
  <div class="pagina">
    <div class="header">
      <div class="header-logo">
        ${logoUrl ? `<img src="${logoUrl}" alt="Logo"/>` : `<div class="header-logo-placeholder">☀️</div>`}
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
      <div class="bloco bloco-produto" style="display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:2mm;flex:1.5;">
        <div class="produto-texto">
          <div class="bloco-label">PRODUTO</div>
          <div class="produto-nome">${nomeProduto}</div>
        </div>
        <div class="qrcode"><img src="${qrCodeUrl}" alt="QR"/></div>
      </div>
      <div class="bloco bloco-cliente">
        <div class="cliente-nome">Cliente: ${clienteNome || '—'}</div>
        <div class="cliente-sub">${transportadora || 'Retirada / Entrega'}</div>
      </div>
      <div class="bloco bloco-nf" style="display:flex;flex-direction:row;align-items:center;gap:2mm;flex:1;">
        <div class="nf-label">NF/NP:</div>
        <div class="nf-valor">${numero_nf || '—'}</div>
      </div>
      <div class="bloco bloco-data">
        <div class="data-valor">${dataFormatada}</div>
      </div>
      <div class="bloco bloco-volume" style="display:flex;flex-direction:row;align-items:center;gap:2mm;flex:1.2;">
        <div class="vol-label">VOLUME:</div>
        <div class="vol-valor">${volAtual}/${volTotal}</div>
      </div>
    </div>
  </div>`;
}

export default function EtiquetaEndereco({ expedicao, onClose }) {
  const empresa = getEmpresa();
  const DEFAULT_LOGO = 'https://media.base44.com/images/public/69ece9d5634df8be56451712/43d0f422a_454646495_1576721726386277_6990662151677958976_n.jpg';
  const nomeEmpresa = empresa.nome || 'Raio do Sol';
  const logoUrl = empresa.logo_url || DEFAULT_LOGO;
  const enderecoEmpresa = empresa.endereco || '';
  const telefoneEmpresa = empresa.telefone || '';
  const cnpjEmpresa = empresa.cnpj || '';

  const dataFormatada = (() => {
    const d = expedicao.data_emissao || new Date().toISOString().split('T')[0];
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  })();

  const qrCodeUrl = gerarQRCodeDataURL(`${expedicao.numero_nf}|${expedicao.cliente_nome}|${expedicao.pedido_numero || ''}`);

  // Um único produto fixo: "Caixa de Velas" — quantidade ajustável
  const [quantidade, setQuantidade] = useState(
    (expedicao.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0) || 1
  );
  const NOME_PRODUTO = 'Caixa de Velas';

  const imprimirEtiqueta = () => {
    const paginas = [];
    for (let i = 1; i <= quantidade; i++) {
      paginas.push(gerarPagina({
        nomeEmpresa, logoUrl, enderecoEmpresa, telefoneEmpresa, cnpjEmpresa,
        nomeProduto: NOME_PRODUTO,
        qrCodeUrl,
        clienteNome: expedicao.cliente_nome,
        transportadora: expedicao.transportadora,
        numero_nf: expedicao.numero_nf,
        dataFormatada,
        volAtual: i,
        volTotal: quantidade,
      }));
    }
    const win = window.open('', '_blank', 'width=500,height=800');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Etiqueta ${expedicao.numero_nf}</title><style>${CSS_ETIQUETA}</style></head><body>${paginas.join('')}<script>window.onload=()=>setTimeout(()=>window.print(),400);<\/script></body></html>`);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground">Etiqueta de Expedição</h3>
            <p className="text-xs text-muted-foreground">NF {expedicao.numero_nf} · {expedicao.cliente_nome}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Produto fixo */}
          <div className="bg-muted/30 border border-border rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground mb-0.5">Produto</p>
            <p className="text-base font-bold text-foreground">Caixa de Velas</p>
          </div>

          {/* Quantidade / volumes */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">Quantidade de volumes (etiquetas)</label>
            <div className="flex items-center gap-3">
              <button onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-xl bg-muted hover:bg-border flex items-center justify-center transition-colors">
                <Minus size={16} />
              </button>
              <input
                type="number" min="1" value={quantidade}
                onChange={e => setQuantidade(Math.max(1, Number(e.target.value)))}
                className="w-20 text-center text-2xl font-bold border border-border rounded-xl py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button onClick={() => setQuantidade(q => q + 1)}
                className="w-10 h-10 rounded-xl bg-muted hover:bg-border flex items-center justify-center transition-colors">
                <Plus size={16} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              Serão impressas {quantidade} etiqueta{quantidade !== 1 ? 's' : ''}, numeradas 1/{quantidade} até {quantidade}/{quantidade}
            </p>
          </div>

          {/* Botões */}
          <div className="space-y-2 pt-1">
            <button onClick={imprimirEtiqueta}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
              <Printer size={16} />
              Imprimir {quantidade} etiqueta{quantidade !== 1 ? 's' : ''}
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