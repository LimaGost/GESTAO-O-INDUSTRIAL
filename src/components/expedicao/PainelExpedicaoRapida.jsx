import { useState, useMemo } from 'react';
import { Package, Printer, CheckCircle, Search, X, Tag, Download, RefreshCw } from 'lucide-react';
import { loadConfig } from '@/lib/appConfig';

function gerarQRCodeURL(texto) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=160&data=${encodeURIComponent(texto)}`;
}

const CSS_ETIQUETA = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 100mm 150mm; margin: 0; }
  html, body { font-family: Arial, Helvetica, sans-serif; background: #fff; color: #000; }
  .pagina { width: 100mm; height: 150mm; display: flex; flex-direction: column; page-break-after: always; overflow: hidden; }
  .header { display: flex; align-items: center; border-bottom: 2px solid #000; padding: 2.5mm 3mm; gap: 3mm; flex: 0 0 auto; }
  .header-logo img { width: 18mm; height: 18mm; object-fit: contain; }
  .header-logo-placeholder { width: 18mm; height: 18mm; background: #f0f0f0; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 8pt; font-weight: bold; color: #555; text-align: center; }
  .header-info { flex: 1; }
  .header-info .empresa-nome { font-size: 7pt; font-weight: bold; }
  .header-info .empresa-detalhe { font-size: 5pt; color: #333; line-height: 1.5; margin-top: 0.5mm; }
  .corpo { flex: 1; display: flex; flex-direction: column; }
  .bloco { display: flex; flex-direction: column; justify-content: center; border-bottom: 1.5px solid #000; padding: 2mm 3mm; }
  .bloco:last-child { border-bottom: none; }
  .bloco-label { font-size: 5pt; font-weight: bold; color: #555; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 1mm; }
  .bloco-produto { flex-direction: row !important; align-items: center; justify-content: space-between; gap: 2mm; flex: 1.5; }
  .produto-nome { font-size: 10pt; font-weight: bold; color: #000; line-height: 1.2; }
  .qrcode img { width: 20mm; height: 20mm; display: block; }
  .bloco-cliente { flex: 1.2; }
  .cliente-nome { font-size: 9pt; font-weight: bold; color: #000; }
  .cliente-sub { font-size: 7pt; color: #222; margin-top: 0.5mm; font-weight: 600; }
  .bloco-nf { flex-direction: row !important; align-items: center; gap: 2mm; flex: 1; }
  .nf-label { font-size: 12pt; font-weight: 900; min-width: 18mm; }
  .nf-valor { font-size: 20pt; font-weight: 900; letter-spacing: 1px; }
  .bloco-data { flex: 0.8; }
  .data-valor { font-size: 10pt; font-weight: bold; letter-spacing: 0.5px; }
  .bloco-volume { flex-direction: row !important; align-items: center; gap: 2mm; flex: 1.2; }
  .vol-label { font-size: 12pt; font-weight: 900; min-width: 18mm; }
  .vol-valor { font-size: 22pt; font-weight: 900; letter-spacing: 1px; }
  @media print { .pagina { page-break-after: always; } }
`;

function gerarPaginaEtiqueta({ empresa, pedido, volAtual, volTotal, transportadora }) {
  const { nome: nomeEmpresa = 'Raio do Sol', logo_url: logoUrl = '', endereco = '', telefone = '', cnpj = '' } = empresa;
  const DEFAULT_LOGO = 'https://media.base44.com/images/public/69ece9d5634df8be56451712/43d0f422a_454646495_1576721726386277_6990662151677958976_n.jpg';
  const logo = logoUrl || DEFAULT_LOGO;
  const dataFmt = new Date().toLocaleDateString('pt-BR');
  const qr = gerarQRCodeURL(`PEDIDO:${pedido.numero || pedido.id}`);
  const nomeProd = pedido.white_label_marca ? `WL: ${pedido.white_label_marca}` : 'Caixa de Velas';
  const pedRef = pedido.numero ? `Ped. #${pedido.numero}` : '';

  return `
  <div class="pagina">
    <div class="header">
      <div class="header-logo">
        <img src="${logo}" alt="Logo"/>
      </div>
      <div class="header-info">
        <div class="empresa-nome">${nomeEmpresa}</div>
        <div class="empresa-detalhe">
          ${endereco ? `${endereco}<br/>` : ''}
          ${telefone ? `Tel: ${telefone}<br/>` : ''}
          ${cnpj ? `CNPJ: ${cnpj}` : ''}
        </div>
      </div>
    </div>
    <div class="corpo">
      <div class="bloco bloco-produto" style="display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:2mm;flex:1.5;">
        <div>
          <div class="bloco-label">PRODUTO</div>
          <div class="produto-nome">${nomeProd}</div>
          ${pedRef ? `<div style="font-size:7pt;color:#555;margin-top:1mm;">${pedRef}</div>` : ''}
        </div>
        <div class="qrcode"><img src="${qr}" alt="QR"/></div>
      </div>
      <div class="bloco bloco-cliente">
        <div class="cliente-nome">Destinatário: ${pedido.cliente_nome || '—'}</div>
        <div class="cliente-sub">${transportadora || 'Retirada / Entrega Própria'}</div>
      </div>
      <div class="bloco bloco-nf" style="display:flex;flex-direction:row;align-items:center;gap:2mm;flex:1;">
        <div class="nf-label">PEDIDO:</div>
        <div class="nf-valor">${pedido.numero || '—'}</div>
      </div>
      <div class="bloco bloco-data">
        <div class="data-valor">${dataFmt}</div>
      </div>
      <div class="bloco bloco-volume" style="display:flex;flex-direction:row;align-items:center;gap:2mm;flex:1.2;">
        <div class="vol-label">VOLUME:</div>
        <div class="vol-valor">${volAtual}/${volTotal}</div>
      </div>
    </div>
  </div>`;
}

function PedidoRow({ pedido, selecionado, onToggle, volumesPorPedido, onSetVolumes }) {
  const totalItens = (pedido.itens || []).reduce((s, i) => s + (i.quantidade || 0), 0);
  const volumes = volumesPorPedido[pedido.id] || 1;

  return (
    <div
      onClick={() => onToggle(pedido.id)}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all ${
        selecionado
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border bg-white hover:bg-muted/30'
      }`}
    >
      {/* Checkbox visual */}
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
        selecionado ? 'border-primary bg-primary' : 'border-border'
      }`}>
        {selecionado && <CheckCircle size={12} className="text-white" />}
      </div>

      {/* Info pedido */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-bold text-foreground font-mono">#{pedido.numero}</span>
          {pedido.white_label && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-bold">
              <Tag size={8} /> WL
            </span>
          )}
          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">Separado ✓</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{pedido.cliente_nome}</p>
        {pedido.white_label_marca && (
          <p className="text-[10px] text-purple-600">→ {pedido.white_label_marca}</p>
        )}
        {(pedido.itens || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {(pedido.itens || []).slice(0, 2).map((item, i) => (
              <span key={i} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-md">
                {item.produto_nome} ×{item.quantidade}
              </span>
            ))}
            {(pedido.itens || []).length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{(pedido.itens || []).length - 2}</span>
            )}
          </div>
        )}
      </div>

      {/* Volumes + total */}
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
        <p className="text-xs text-muted-foreground">{totalItens} un</p>
        {selecionado && (
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">vol:</span>
            <input
              type="number" min="1" max="99" value={volumes}
              onChange={e => onSetVolumes(pedido.id, Math.max(1, Number(e.target.value)))}
              className="w-12 text-center text-xs font-bold border border-primary/40 rounded-lg py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function PainelExpedicaoRapida({ pedidos }) {
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState(new Set());
  const [volumesPorPedido, setVolumesPorPedido] = useState({});
  const [transportadora, setTransportadora] = useState('');
  const [imprimindo, setImprimindo] = useState(false);

  // Apenas pedidos com status 'separado'
  const pedidosSeparados = useMemo(() => {
    return pedidos.filter(p => p.status === 'separado');
  }, [pedidos]);

  const pedidosFiltrados = useMemo(() => {
    if (!busca.trim()) return pedidosSeparados;
    const b = busca.toLowerCase();
    return pedidosSeparados.filter(p =>
      (p.numero || '').toLowerCase().includes(b) ||
      (p.cliente_nome || '').toLowerCase().includes(b) ||
      (p.white_label_marca || '').toLowerCase().includes(b)
    );
  }, [pedidosSeparados, busca]);

  const togglePedido = (id) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (selecionados.size === pedidosFiltrados.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(pedidosFiltrados.map(p => p.id)));
    }
  };

  const setVolumes = (id, val) => {
    setVolumesPorPedido(prev => ({ ...prev, [id]: val }));
  };

  const totalEtiquetas = useMemo(() => {
    let total = 0;
    for (const id of selecionados) {
      total += volumesPorPedido[id] || 1;
    }
    return total;
  }, [selecionados, volumesPorPedido]);

  const imprimirLote = async () => {
    if (selecionados.size === 0) return;
    setImprimindo(true);
    const empresa = (await loadConfig('empresa_config')) || {};
    const pedidosSel = pedidosFiltrados.filter(p => selecionados.has(p.id));
    const paginas = [];

    for (const pedido of pedidosSel) {
      const vols = volumesPorPedido[pedido.id] || 1;
      for (let i = 1; i <= vols; i++) {
        paginas.push(gerarPaginaEtiqueta({ empresa, pedido, volAtual: i, volTotal: vols, transportadora }));
      }
    }

    const win = window.open('', '_blank', 'width=540,height=900');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>Etiquetas em Lote</title><style>${CSS_ETIQUETA}</style></head><body>${paginas.join('')}<script>window.onload=()=>setTimeout(()=>window.print(),500);<\/script></body></html>`);
    win.document.close();
    setImprimindo(false);
  };

  const baixarLotePRN = async () => {
    if (selecionados.size === 0) return;
    const empresa = (await loadConfig('empresa_config')) || {};
    const { nome: nomeEmpresa = 'Raio do Sol', cnpj = '' } = empresa;
    const pedidosSel = pedidosFiltrados.filter(p => selecionados.has(p.id));
    const blocos = [];
    const dataFmt = new Date().toLocaleDateString('pt-BR');

    for (const pedido of pedidosSel) {
      const vols = volumesPorPedido[pedido.id] || 1;
      const nomeProd = pedido.white_label_marca ? `WL: ${pedido.white_label_marca}` : 'Caixa de Velas';
      for (let i = 1; i <= vols; i++) {
        blocos.push([
          `SIZE 100 mm, 150 mm`,
          `GAP 2 mm, 0 mm`,
          `CLS`,
          `TEXT 10,10,"4",0,1,1,"${nomeEmpresa}"`,
          cnpj ? `TEXT 10,55,"1",0,1,1,"CNPJ: ${cnpj}"` : null,
          `BAR 0,75,800,2`,
          `TEXT 10,85,"2",0,1,1,"DESTINATARIO:"`,
          `TEXT 10,115,"3",0,1,1,"${pedido.cliente_nome || ''}"`,
          transportadora ? `TEXT 10,155,"1",0,1,1,"Transportadora: ${transportadora}"` : null,
          `BAR 0,175,800,2`,
          `TEXT 10,185,"2",0,1,1,"PEDIDO:"`,
          `TEXT 120,185,"4",0,1,1,"${pedido.numero || ''}"`,
          `TEXT 10,240,"2",0,1,1,"Data: ${dataFmt}"`,
          `TEXT 450,240,"2",0,1,1,"VOL: ${i}/${vols}"`,
          `BAR 0,270,800,2`,
          `TEXT 10,280,"3",0,1,1,"${nomeProd}"`,
          `BAR 0,320,800,2`,
          `TEXT 10,330,"1",0,1,1,"Raio do Sol - Sistema de Gestao Industrial"`,
          `PRINT 1`,
        ].filter(Boolean).join('\n'));
      }
    }

    const blob = new Blob([blocos.join('\n\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etiquetas_lote_${new Date().toISOString().slice(0, 10)}.prn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (pedidosSeparados.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-green-50 border-2 border-dashed border-green-200 flex items-center justify-center mx-auto mb-4">
          <Package size={28} className="text-green-300" />
        </div>
        <p className="text-sm font-bold text-foreground">Nenhum pedido separado</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          Pedidos que foram separados e conferidos aparecerão aqui para emissão de etiquetas.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">

      {/* Lista de pedidos */}
      <div className="flex-1 flex flex-col gap-3 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-0">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar pedido, cliente..."
              className="w-full border border-border rounded-xl pl-8 pr-8 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X size={13} />
              </button>
            )}
          </div>
          <button
            onClick={toggleTodos}
            className="text-xs border border-border px-3 py-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground font-medium flex-shrink-0"
          >
            {selecionados.size === pedidosFiltrados.length ? 'Desmarcar todos' : `Selecionar todos (${pedidosFiltrados.length})`}
          </button>
        </div>

        {/* Lista de pedidos */}
        <div className="space-y-3 overflow-y-auto flex-1">
          {pedidosFiltrados.map(pedido => (
            <PedidoRow
              key={pedido.id}
              pedido={pedido}
              selecionado={selecionados.has(pedido.id)}
              onToggle={togglePedido}
              volumesPorPedido={volumesPorPedido}
              onSetVolumes={setVolumes}
            />
          ))}
        </div>
      </div>

      {/* Painel de ação */}
      <div className="w-full lg:w-72 flex-shrink-0">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4 sticky top-0">
          <div>
            <h3 className="text-sm font-bold text-foreground">Emissão em Lote</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selecionados.size === 0
                ? 'Selecione os pedidos ao lado'
                : `${selecionados.size} pedido(s) · ${totalEtiquetas} etiqueta(s)`
              }
            </p>
          </div>

          {/* Resumo selecionados */}
          {selecionados.size > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-1.5">
              {pedidosFiltrados.filter(p => selecionados.has(p.id)).map(p => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-foreground">#{p.numero}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground truncate max-w-[80px]">{p.cliente_nome}</span>
                    <span className="bg-primary/20 text-primary px-1.5 rounded font-bold">
                      {volumesPorPedido[p.id] || 1} vol
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Transportadora */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Transportadora (opcional)</label>
            <input
              value={transportadora}
              onChange={e => setTransportadora(e.target.value)}
              placeholder="Ex: Correios, Transportadora XYZ"
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Total */}
          {selecionados.size > 0 && (
            <div className="bg-muted/40 rounded-xl px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">Total de etiquetas</span>
              <span className="text-xl font-bold text-foreground">{totalEtiquetas}</span>
            </div>
          )}

          {/* Botões */}
          <div className="space-y-2">
            <button
              onClick={imprimirLote}
              disabled={selecionados.size === 0 || imprimindo}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {imprimindo ? <RefreshCw size={14} className="animate-spin" /> : <Printer size={14} />}
              Imprimir etiquetas (HTML)
            </button>
            <button
              onClick={baixarLotePRN}
              disabled={selecionados.size === 0}
              className="w-full flex items-center justify-center gap-2 border border-primary/40 text-primary py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/10 disabled:opacity-40 transition-colors"
            >
              <Download size={14} />
              Baixar .prn — L42 PRO
            </button>
          </div>

          {selecionados.size === 0 && (
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Clique nos pedidos para selecioná-los. Você pode definir a quantidade de volumes por pedido.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}