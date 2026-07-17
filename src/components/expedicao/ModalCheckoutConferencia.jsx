import { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, ScanBarcode, CheckCircle, AlertTriangle, Plus, Minus, PackageCheck } from 'lucide-react';

// Sons de feedback (WebAudio — sem arquivos externos)
function beep(ok) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = ok ? 880 : 220;
    osc.type = ok ? 'sine' : 'square';
    gain.gain.value = 0.15;
    osc.start();
    osc.stop(ctx.currentTime + (ok ? 0.12 : 0.3));
    osc.onended = () => ctx.close();
  } catch {}
}

export default function ModalCheckoutConferencia({ expedicao, titulo = 'Checkout de Pedido', onConcluir, onClose }) {
  const itens = expedicao.itens || [];
  const [produtos, setProdutos] = useState([]);
  const [conferido, setConferido] = useState({}); // idx -> qtd conferida
  const [codigo, setCodigo] = useState('');
  const [feedback, setFeedback] = useState(null); // { ok, msg }
  const [salvando, setSalvando] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    base44.entities.Produto.list().then(setProdutos).catch(() => {});
  }, []);

  // Mantém o campo de bipagem sempre focado
  useEffect(() => {
    const t = setInterval(() => {
      if (document.activeElement?.tagName !== 'INPUT') inputRef.current?.focus();
    }, 800);
    inputRef.current?.focus();
    return () => clearInterval(t);
  }, []);

  const codigoMap = useMemo(() => {
    const m = {};
    for (const p of produtos) {
      if (p.codigo) m[String(p.codigo).trim().toLowerCase()] = p.id;
    }
    return m;
  }, [produtos]);

  const totalPedido = itens.reduce((s, i) => s + (i.quantidade || 0), 0);
  const totalConferido = Object.values(conferido).reduce((s, v) => s + v, 0);
  const completo = itens.length > 0 && itens.every((item, i) => (conferido[i] || 0) >= (item.quantidade || 0));

  const mostrarFeedback = (ok, msg) => {
    setFeedback({ ok, msg });
    beep(ok);
    if (navigator.vibrate && !ok) navigator.vibrate(200);
    setTimeout(() => setFeedback(null), 2200);
  };

  const incrementar = (idx, viaBipagem = false) => {
    const item = itens[idx];
    const atual = conferido[idx] || 0;
    if (atual >= (item.quantidade || 0)) {
      mostrarFeedback(false, `⚠️ ${item.produto_nome}: quantidade já completa (${item.quantidade})`);
      return;
    }
    setConferido(prev => ({ ...prev, [idx]: atual + 1 }));
    mostrarFeedback(true, `✓ ${item.produto_nome} — ${atual + 1}/${item.quantidade}`);
  };

  const decrementar = (idx) => {
    setConferido(prev => ({ ...prev, [idx]: Math.max(0, (prev[idx] || 0) - 1) }));
  };

  const biparCodigo = (valor) => {
    const cod = valor.trim().toLowerCase();
    if (!cod) return;
    // 1. Busca por código do produto (SKU / código de barras)
    const produtoId = codigoMap[cod];
    let idx = -1;
    if (produtoId) {
      idx = itens.findIndex((item, i) => item.produto_id === produtoId && (conferido[i] || 0) < (item.quantidade || 0));
      if (idx === -1) idx = itens.findIndex(item => item.produto_id === produtoId);
    }
    // 2. Fallback: busca por nome exato ou parcial
    if (idx === -1) {
      idx = itens.findIndex((item, i) =>
        (item.produto_nome || '').toLowerCase().includes(cod) && (conferido[i] || 0) < (item.quantidade || 0)
      );
    }
    if (idx === -1) {
      mostrarFeedback(false, `✕ Código "${valor.trim()}" não pertence a este pedido!`);
    } else {
      incrementar(idx, true);
    }
    setCodigo('');
  };

  const concluir = async () => {
    setSalvando(true);
    await onConcluir();
    setSalvando(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <ScanBarcode size={17} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">{titulo}</h3>
              <p className="text-xs text-muted-foreground">
                NF {expedicao.numero_nf} · {expedicao.cliente_nome}
                {expedicao.pedido_numero ? ` · Pedido #${expedicao.pedido_numero}` : ''}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Campo de bipagem */}
        <div className="px-5 pt-4 flex-shrink-0">
          <div className={`flex items-center gap-3 border-2 rounded-2xl px-4 py-3 transition-colors ${
            feedback ? (feedback.ok ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50') : 'border-primary/40 bg-background'
          }`}>
            <ScanBarcode size={22} className={feedback ? (feedback.ok ? 'text-green-600' : 'text-red-500') : 'text-primary'} />
            <input
              ref={inputRef}
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') biparCodigo(codigo); }}
              placeholder="Bipe o código de barras ou digite e aperte Enter..."
              className="flex-1 bg-transparent text-base font-medium text-foreground outline-none placeholder:text-muted-foreground placeholder:text-sm"
              autoFocus
            />
          </div>

          {/* Feedback visual grande */}
          <div className="h-10 flex items-center mt-2">
            {feedback ? (
              <div className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold ${
                feedback.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800 animate-pulse'
              }`}>
                {feedback.ok ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                <span className="truncate">{feedback.msg}</span>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground px-1">
                💡 Use um leitor de código de barras ou clique em <strong>+</strong> em cada item
              </p>
            )}
          </div>
        </div>

        {/* Barra de progresso geral */}
        <div className="px-5 pb-3 flex-shrink-0">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-semibold text-foreground">Progresso da conferência</span>
            <span className={`font-bold ${completo ? 'text-green-600' : 'text-muted-foreground'}`}>
              {totalConferido}/{totalPedido} unidades
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-300 ${completo ? 'bg-green-500' : 'bg-primary'}`}
              style={{ width: totalPedido ? `${Math.min(100, Math.round((totalConferido / totalPedido) * 100))}%` : '0%' }} />
          </div>
        </div>

        {/* Lista de itens */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
          {itens.map((item, i) => {
            const qtd = item.quantidade || 0;
            const conf = conferido[i] || 0;
            const ok = conf >= qtd;
            const produto = produtos.find(p => p.id === item.produto_id);
            return (
              <div key={i} className={`rounded-xl border-2 p-3 transition-all ${
                ok ? 'border-green-300 bg-green-50' : conf > 0 ? 'border-amber-300 bg-amber-50/50' : 'border-border bg-muted/20'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                    ok ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {ok ? <CheckCircle size={16} /> : i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.produto_nome}</p>
                    {produto?.codigo && <p className="text-[10px] text-muted-foreground font-mono">Cód: {produto.codigo}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => decrementar(i)} disabled={conf === 0}
                      className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors">
                      <Minus size={12} className="text-muted-foreground" />
                    </button>
                    <span className={`text-sm font-bold w-14 text-center ${ok ? 'text-green-600' : 'text-foreground'}`}>
                      {conf}/{qtd}
                    </span>
                    <button onClick={() => incrementar(i)} disabled={ok}
                      className="w-7 h-7 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 disabled:opacity-30 transition-opacity">
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
                {/* Barra individual */}
                <div className="h-1 rounded-full bg-muted overflow-hidden mt-2">
                  <div className={`h-full rounded-full transition-all ${ok ? 'bg-green-500' : 'bg-amber-400'}`}
                    style={{ width: qtd ? `${Math.min(100, Math.round((conf / qtd) * 100))}%` : '0%' }} />
                </div>
              </div>
            );
          })}
          {itens.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">Esta expedição não possui itens para conferir.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex-shrink-0 flex gap-3">
          <button onClick={onClose}
            className="border border-border px-4 py-3 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button
            onClick={concluir}
            disabled={!completo && itens.length > 0 || salvando}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              completo || itens.length === 0
                ? 'bg-green-500 text-white hover:bg-green-600 shadow-md'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <PackageCheck size={16} />
            {salvando ? 'Concluindo...' : completo || itens.length === 0 ? 'Conferência OK — Avançar' : `Faltam ${totalPedido - totalConferido} unidade(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}