import { useState } from 'react';
import { X, Trash2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { registrarLog } from '@/lib/audit';

const MOTIVOS = [
  { key: 'defeito_fabricacao', label: 'Defeito de Fabricação' },
  { key: 'contaminacao', label: 'Contaminação' },
  { key: 'quebra', label: 'Quebra / Dano Físico' },
  { key: 'vencimento', label: 'Vencimento / Validade' },
  { key: 'erro_processo', label: 'Erro de Processo' },
  { key: 'outros', label: 'Outros' },
];

const ETAPAS_LABEL = {
  a_produzir: 'A Produzir', em_producao: 'Em Produção',
  produzido: 'Produzido', em_embalagem: 'Em Embalagem',
};

export default function ModalDescarte({ ordem, produtos, onClose, onSalvo }) {
  const produtosOP = ordem.itens?.length > 0
    ? ordem.itens.map(i => ({ id: i.produto_id, nome: i.produto_nome, qtdOP: i.quantidade }))
    : ordem.produto_id
    ? [{ id: ordem.produto_id, nome: ordem.produto_nome, qtdOP: ordem.quantidade || 0 }]
    : [];

  const produtosComPreco = produtosOP.map(p => {
    const cat = produtos?.find(x => x.id === p.id);
    return { ...p, preco: cat?.preco_unitario || 0 };
  });

  const [itens, setItens] = useState(produtosComPreco.map(p => ({
    produto_id: p.id, produto_nome: p.nome, qtdOP: p.qtdOP,
    custo_unitario: p.preco, quantidade: 0, motivo: '', descricao: '',
    ativo: produtosComPreco.length === 1,
  })));
  const [salvando, setSalvando] = useState(false);

  const updateItem = (idx, field, value) => setItens(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));

  const itensPendentes = itens.filter(it => it.ativo && it.quantidade > 0 && it.motivo);
  const custoTotal = itensPendentes.reduce((s, it) => s + (it.quantidade * it.custo_unitario), 0);

  const salvar = async () => {
    if (itensPendentes.length === 0) return alert('Ative pelo menos um item com quantidade e motivo.');
    setSalvando(true);
    const user = await base44.auth.me().catch(() => null);
    const hoje = new Date().toISOString().split('T')[0];
    for (const it of itensPendentes) {
      const custoItem = it.quantidade * it.custo_unitario;
      await base44.entities.Perda.create({
        produto_id: it.produto_id, produto_nome: it.produto_nome,
        quantidade: it.quantidade, motivo: MOTIVOS.find(m => m.key === it.motivo)?.label || it.motivo,
        data: hoje, ordem_producao_id: ordem.id,
      });
      await registrarLog('OrdemProducao', ordem.id, 'DESCARTE', `Descarte de ${it.quantidade} un de "${it.produto_nome}" — ${it.motivo}`);
    }
    setSalvando(false);
    onSalvo?.(itensPendentes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
          <div>
            <h3 className="font-bold text-foreground">Registrar Descarte</h3>
            <p className="text-xs text-muted-foreground">OP {ordem.numero} · {ETAPAS_LABEL[ordem.status] || ordem.status}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg"><X size={16} className="text-muted-foreground" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-700">
            <AlertTriangle size={13} className="flex-shrink-0 mt-0.5" />
            <span>O descarte é registrado mas <strong>não</strong> altera o estoque — somente a finalização da OP faz isso.</span>
          </div>

          {itens.map((it, idx) => (
            <div key={idx} className="border border-border rounded-xl overflow-hidden">
              <button onClick={() => updateItem(idx, 'ativo', !it.ativo)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${it.ativo ? 'bg-red-50' : 'bg-muted/30 hover:bg-muted/50'}`}>
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${it.ativo ? 'bg-red-500 border-red-500' : 'border-border'}`}>
                  {it.ativo && <span className="text-white text-[10px] font-bold">✓</span>}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{it.produto_nome}</p>
                  <p className="text-xs text-muted-foreground">OP: {it.qtdOP} un</p>
                </div>
                {it.ativo && <Trash2 size={14} className="text-red-500" />}
              </button>

              {it.ativo && (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Quantidade *</label>
                      <input type="number" min="0" max={it.qtdOP} value={it.quantidade}
                        onChange={e => updateItem(idx, 'quantidade', Number(e.target.value))}
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Custo Unit. (R$)</label>
                      <input type="number" step="0.01" value={it.custo_unitario}
                        onChange={e => updateItem(idx, 'custo_unitario', Number(e.target.value))}
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                  </div>

                  {it.quantidade > 0 && it.custo_unitario > 0 && (
                    <div className="flex justify-between text-xs bg-red-50 rounded-lg px-3 py-1.5">
                      <span className="text-muted-foreground">Custo desta perda</span>
                      <span className="font-bold text-red-600">R$ {(it.quantidade * it.custo_unitario).toFixed(2)}</span>
                    </div>
                  )}

                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Motivo *</label>
                    <div className="flex flex-wrap gap-1.5">
                      {MOTIVOS.map(m => (
                        <button key={m.key} onClick={() => updateItem(idx, 'motivo', m.key)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${it.motivo === m.key ? 'bg-red-100 border-red-300 text-red-700' : 'bg-muted border-transparent text-muted-foreground hover:text-foreground'}`}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Observações {it.motivo === 'outros' ? '*' : ''}</label>
                    <input value={it.descricao} onChange={e => updateItem(idx, 'descricao', e.target.value)}
                      placeholder="Detalhes..."
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {custoTotal > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex justify-between items-center">
              <span className="text-sm font-medium text-red-700">Custo total do descarte</span>
              <span className="font-bold text-red-700">R$ {custoTotal.toFixed(2)}</span>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={salvar} disabled={salvando || itensPendentes.length === 0}
              className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
              {salvando ? 'Salvando...' : 'Registrar Descarte'}
            </button>
            <button onClick={onClose} className="px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}