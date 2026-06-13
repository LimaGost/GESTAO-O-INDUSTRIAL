import { useState } from 'react';
import { X, Printer, FileText, Package, Scale, Box, ClipboardCheck } from 'lucide-react';
import { gerarNotaGerencialHTML } from '@/lib/notaGerencialGenerator';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d.includes('T') ? d : d + 'T12:00:00').toLocaleDateString('pt-BR');
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-foreground text-right max-w-[60%]">{value || '—'}</span>
    </div>
  );
}

export default function ModalConferencia({ pedido, expedicao, cliente, ordemProducao, onClose }) {
  const [volumes, setVolumes] = useState(1);
  const [caixas, setCaixas] = useState('');
  const [pallets, setPallets] = useState('');
  const [obsTransporte, setObsTransporte] = useState('');
  const [tipoDoc, setTipoDoc] = useState('gerencial');

  const itens = pedido?.itens || expedicao?.itens || [];
  const totalQtd = itens.reduce((s, i) => s + (i.quantidade || 0), 0);
  const totalPeso = itens.reduce((s, i) => s + ((i.peso_kg || 0) * (i.quantidade || 0)), 0);

  const DESTINO_LABELS = {
    retirada_fabrica: 'Retirada na Fábrica',
    retirada_unidade: `Retirada na Unidade${pedido?.destino_unidade ? ` — ${pedido.destino_unidade}` : ''}`,
    transportadora: `Via Transportadora${pedido?.destino_transportadora ? ` — ${pedido.destino_transportadora}` : ''}`,
    entrega_cliente: `Entrega no Endereço`,
  };

  const imprimirNota = () => {
    const html = gerarNotaGerencialHTML({
      pedido,
      expedicao,
      cliente,
      ordemProducao,
      config: { tipo: tipoDoc, volumes, caixas: caixas || undefined, pallets: pallets || undefined, obs_transporte: obsTransporte },
    });
    const win = window.open('', '_blank', 'width=900,height=1200');
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <ClipboardCheck size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-foreground">Conferência e Nota Gerencial</p>
              <p className="text-xs text-muted-foreground">
                Pedido #{pedido?.numero || '—'} · {pedido?.cliente_nome || expedicao?.cliente_nome}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-xl transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Info do pedido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-xl p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Dados do Pedido</p>
              <InfoRow label="Número" value={`#${pedido?.numero || '—'}`} />
              <InfoRow label="Cliente" value={pedido?.cliente_nome || expedicao?.cliente_nome} />
              <InfoRow label="Telefone" value={cliente?.telefone} />
              <InfoRow label="Data do Pedido" value={fmtDate(pedido?.data_pedido)} />
              <InfoRow label="Previsão de Entrega" value={fmtDate(pedido?.data_entrega_prevista)} />
              <InfoRow label="OP Vinculada" value={ordemProducao?.numero} />
              {pedido?.white_label && <InfoRow label="White Label" value={pedido.white_label_marca || 'Sim'} />}
            </div>

            <div className="bg-muted/30 rounded-xl p-4">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">Entrega</p>
              <InfoRow label="Tipo" value={pedido?.destino_tipo ? DESTINO_LABELS[pedido.destino_tipo] : '—'} />
              <InfoRow label="Transportadora" value={expedicao?.transportadora || pedido?.destino_transportadora} />
              <InfoRow label="Unidade" value={pedido?.destino_unidade} />
              <InfoRow label="Endereço" value={pedido?.destino_endereco || cliente?.endereco} />
              {expedicao?.numero_nf && <InfoRow label="NF Gerencial" value={expedicao.numero_nf} />}
            </div>
          </div>

          {/* Produtos para conferência */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
              <Package size={11} /> Produtos para Conferência
            </p>
            {itens.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum item no pedido</p>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Produto</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Qtd</th>
                      <th className="text-center px-3 py-2 font-semibold text-muted-foreground">Lote</th>
                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Peso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itens.map((item, i) => (
                      <tr key={i} className={i % 2 === 0 ? '' : 'bg-muted/20'}>
                        <td className="px-3 py-2 font-medium text-foreground">{item.produto_nome}</td>
                        <td className="px-3 py-2 text-right font-bold text-foreground">{item.quantidade}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{item.lote || '—'}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {item.peso_kg ? `${(item.peso_kg * item.quantidade).toFixed(2)} kg` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-primary/5 border-t border-border">
                    <tr>
                      <td className="px-3 py-2 font-bold text-foreground">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-primary">{totalQtd} un</td>
                      <td />
                      <td className="px-3 py-2 text-right font-bold text-muted-foreground">
                        {totalPeso > 0 ? `${totalPeso.toFixed(2)} kg` : '—'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Configuração do documento */}
          <div className="bg-muted/20 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              <FileText size={11} /> Configurar Documento
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tipo de Documento</label>
                <select value={tipoDoc} onChange={e => setTipoDoc(e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="gerencial">Nota Gerencial de Transporte</option>
                  <option value="romaneio">Romaneio de Expedição</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Volumes</label>
                <input type="number" min="1" value={volumes} onChange={e => setVolumes(Number(e.target.value))}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Caixas</label>
                <input type="number" min="0" value={caixas} onChange={e => setCaixas(e.target.value)}
                  placeholder="Automático"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Pallets</label>
                <input type="number" min="0" value={pallets} onChange={e => setPallets(e.target.value)}
                  placeholder="Se houver"
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Instruções de Transporte</label>
              <textarea value={obsTransporte} onChange={e => setObsTransporte(e.target.value)}
                rows={2} placeholder="Cuidados com a carga, instruções especiais..."
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex gap-3 flex-shrink-0">
          <button onClick={imprimirNota}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
            <Printer size={15} /> Imprimir / Salvar PDF
          </button>
          <button onClick={onClose}
            className="px-5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}