import { X, Printer, Plus, Minus, Package } from 'lucide-react';
import { useState, useEffect } from 'react';

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
  .header { display: flex; align-items: center; border-bottom: 2px solid #000; padding: 3mm 3mm; gap: 3mm; flex: 0 0 auto; }
  .header-logo img { width: 18mm; height: 18mm; object-fit: contain; }
  .header-logo-placeholder { width: 18mm; height: 18mm; background: #f0f0f0; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 10pt; font-weight: bold; color: #555; text-align: center; }
  .header-info { flex: 1; display: flex; flex-direction: column; justify-content: center; }
  .header-info .empresa-nome { font-size: 7pt; font-weight: bold; }
  .header-info .empresa-detalhe { font-size: 5.5pt; color: #333; line-height: 1.5; margin-top: 0.5mm; }
  .corpo { flex: 1; display: flex; flex-direction: column; }
  .bloco { flex: 1; display: flex; flex-direction: column; justify-content: center; border-bottom: 1.5px solid #000; padding: 0 3mm; }
  .bloco:last-child { border-bottom: none; }
  .bloco-label { font-size: 5pt; font-weight: bold; color: #555; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1mm; }
  .bloco-produto { flex-direction: row !important; align-items: center; justify-content: space-between; gap: 2mm; }
  .bloco-produto .produto-texto { flex: 1; }
  .bloco-produto .produto-nome { font-size: 9pt; font-weight: bold; color: #000; line-height: 1.2; }
  .bloco-produto .qrcode img { width: 20mm; height: 20mm; display: block; }
  .bloco-cliente .cliente-nome { font-size: 8pt; font-weight: bold; color: #000; line-height: 1.3; }
  .bloco-cliente .cliente-sub { font-size: 6pt; color: #444; margin-top: 0.5mm; }
  .bloco-nf { flex-direction: row !important; align-items: center; gap: 2mm; }
  .bloco-nf .nf-label { font-size: 9pt; font-weight: bold; min-width: 16mm; }
  .bloco-nf .nf-valor { font-size: 16pt; font-weight: bold; letter-spacing: 1px; }
  .bloco-data { flex-direction: row !important; align-items: center; }
  .bloco-data .data-valor { font-size: 13pt; font-weight: bold; letter-spacing: 1px; }
  .bloco-volume { flex-direction: row !important; align-items: center; gap: 2mm; }
  .bloco-volume .vol-label { font-size: 9pt; font-weight: bold; min-width: 16mm; }
  .bloco-volume .vol-valor { font-size: 16pt; font-weight: bold; letter-spacing: 1px; }
  @media print { .pagina { page-break-after: always; } }
`;

function gerarPaginaEtiqueta({ nomeEmpresa, logoUrl, enderecoEmpresa, telefoneEmpresa, cnpjEmpresa, nomeProduto, qrCodeUrl, clienteNome, transportadora, numero_nf, dataFormatada, volAtual, volTotal }) {
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
      <div class="bloco bloco-produto">
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
      <div class="bloco bloco-nf">
        <div class="nf-label">NF/NP:</div>
        <div class="nf-valor">${numero_nf || '—'}</div>
      </div>
      <div class="bloco bloco-data">
        <div class="data-valor">${dataFormatada}</div>
      </div>
      <div class="bloco bloco-volume">
        <div class="vol-label">VOLUME:</div>
        <div class="vol-valor">${volAtual}/${volTotal}</div>
      </div>
    </div>
  </div>`;
}

export default function EtiquetaEndereco({ expedicao, onClose }) {
  const empresa = getEmpresa();
  const nomeEmpresa = empresa.nome || 'RAIO DO SOL';
  const logoUrl = empresa.logo_url || '';
  const enderecoEmpresa = empresa.endereco || '';
  const telefoneEmpresa = empresa.telefone || '';
  const cnpjEmpresa = empresa.cnpj || '';

  const dataFormatada = (() => {
    const d = expedicao.data_emissao || new Date().toISOString().split('T')[0];
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  })();

  const qrCodeUrl = gerarQRCodeDataURL(`${expedicao.numero_nf}|${expedicao.cliente_nome}|${expedicao.pedido_numero || ''}`);

  // Monta lista de itens com quantidade de etiquetas controlável
  const itensBase = expedicao.itens?.length > 0
    ? expedicao.itens
    : [{ produto_nome: expedicao.cliente_nome || 'Produto', quantidade: 1 }];

  const [selecao, setSelecao] = useState(() =>
    itensBase.map(item => ({ ...item, etiquetas: item.quantidade || 1 }))
  );

  const totalEtiquetas = selecao.reduce((s, i) => s + (i.etiquetas || 0), 0);

  const setEtiquetas = (idx, val) => {
    setSelecao(prev => prev.map((item, i) => i === idx ? { ...item, etiquetas: Math.max(0, val) } : item));
  };

  const imprimirEtiqueta = () => {
    // Gera uma etiqueta por unidade selecionada, agrupando por produto
    const paginas = [];
    let volGlobal = 0;
    const totalVols = totalEtiquetas;

    for (const item of selecao) {
      for (let i = 0; i < item.etiquetas; i++) {
        volGlobal++;
        paginas.push(gerarPaginaEtiqueta({
          nomeEmpresa, logoUrl, enderecoEmpresa, telefoneEmpresa, cnpjEmpresa,
          nomeProduto: item.produto_nome || 'Produto',
          qrCodeUrl,
          clienteNome: expedicao.cliente_nome,
          transportadora: expedicao.transportadora,
          numero_nf: expedicao.numero_nf,
          dataFormatada,
          volAtual: volGlobal,
          volTotal: totalVols,
        }));
      }
    }

    const win = window.open('', '_blank', 'width=500,height=800');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Etiqueta ${expedicao.numero_nf}</title><style>${CSS_ETIQUETA}</style></head><body>${paginas.join('')}<script>window.onload=()=>setTimeout(()=>window.print(),400);<\/script></body></html>`);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="font-bold text-foreground">Etiquetas de Expedição</h3>
            <p className="text-xs text-muted-foreground">NF {expedicao.numero_nf} · {expedicao.cliente_nome}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Lista de produtos */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <p className="text-xs text-muted-foreground">Defina quantas etiquetas imprimir por produto:</p>

          <div className="space-y-2">
            {selecao.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-muted/30 border border-border rounded-xl px-4 py-3">
                <Package size={15} className="text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight truncate">{item.produto_nome}</p>
                  <p className="text-xs text-muted-foreground">Qtd no pedido: {item.quantidade || 1}</p>
                </div>
                {/* Contador */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setEtiquetas(idx, item.etiquetas - 1)}
                    className="w-7 h-7 rounded-lg bg-muted hover:bg-border flex items-center justify-center transition-colors">
                    <Minus size={12} />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={item.etiquetas}
                    onChange={e => setEtiquetas(idx, Number(e.target.value))}
                    className="w-10 text-center text-sm font-bold border border-border rounded-lg py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={() => setEtiquetas(idx, item.etiquetas + 1)}
                    className="w-7 h-7 rounded-lg bg-muted hover:bg-border flex items-center justify-center transition-colors">
                    <Plus size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Ações rápidas */}
          <div className="flex gap-2">
            <button onClick={() => setSelecao(s => s.map(i => ({ ...i, etiquetas: i.quantidade || 1 })))}
              className="text-xs text-primary hover:underline">
              Restaurar quantidades
            </button>
            <span className="text-muted-foreground text-xs">·</span>
            <button onClick={() => setSelecao(s => s.map(i => ({ ...i, etiquetas: 0 })))}
              className="text-xs text-muted-foreground hover:text-destructive hover:underline">
              Zerar tudo
            </button>
          </div>

          {/* Resumo */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-foreground font-medium">Total de etiquetas</span>
            <span className="text-xl font-bold text-primary">{totalEtiquetas}</span>
          </div>

          {/* Botões */}
          <div className="space-y-2 pt-1">
            <button
              onClick={imprimirEtiqueta}
              disabled={totalEtiquetas === 0}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40">
              <Printer size={16} />
              Imprimir {totalEtiquetas} etiqueta{totalEtiquetas !== 1 ? 's' : ''}
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