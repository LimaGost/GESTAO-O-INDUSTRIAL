import { useState } from 'react';
import { X, Trash2, AlertTriangle, Package } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { registrarLog } from '@/lib/audit';

const MOTIVOS = [
  { key: 'defeito_fabricacao', label: 'Defeito de Fabricação' },
  { key: 'contaminacao',       label: 'Contaminação' },
  { key: 'quebra',             label: 'Quebra / Dano Físico' },
  { key: 'vencimento',         label: 'Vencimento / Validade' },
  { key: 'erro_processo',      label: 'Erro de Processo' },
  { key: 'outros',             label: 'Outros' },
];

const ETAPAS_LABEL = {
  a_produzir:   'A Produzir',
  em_producao:  'Em Produção',
  produzido:    'Produzido',
  em_embalagem: 'Em Embalagem',
};

function fmtR(v) {
  return `R$ ${(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

export default function ModalDescarte({ ordem, produtos, onClose, onSalvo }) {
  const produtosOP = ordem.itens?.length > 0
    ? ordem.itens.map(i => ({ id: i.produto_id, nome: i.produto_nome, qtdOP: i.quantidade }))
    : ordem.produto_id
      ? [{ id: ordem.produto_id, nome: ordem.produto_nome, qtdOP: ordem.quantidade || 0 }]
      : [];

  const produtosComPreco = produtosOP.map(p => {
    const cat = produtos.find(x => x.id === p.id);
    return { ...p, preco: cat?.preco_unitario || 0 };
  });

  const [itens, setItens] = useState(
    produtosComPreco.map(p => ({
      produto_id:     p.id,
      produto_nome:   p.nome,
      qtdOP:          p.qtdOP,
      custo_unitario: p.preco,
      quantidade:     0,
      motivo:         '',
      descricao:      '',
      ativo:          produtosComPreco.length === 1,
    }))
  );

  const [salvando, setSalvando] = useState(false);

  const updateItem = (idx, field, value) => {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  };

  const itensPendentes = itens.filter(it => it.ativo && it.quantidade > 0 && it.motivo);
  const custoTotalGeral = itensPendentes.reduce((s, it) => s + (it.quantidade * it.custo_unitario), 0);

  const salvar = async () => {
    if (itensPendentes.length === 0) return alert('Ative pelo menos um item com quantidade e motivo preenchidos.');
    setSalvando(true);

    const user = await base44.auth.me().catch(() => null);
    const hoje = new Date().toISOString().split('T')[0];

    for (const it of itensPendentes) {
      const custoTotal = it.quantidade * it.custo_unitario;
      await base44.entities.Descarte.create({
        ordem_producao_id:     ordem.id,
        ordem_producao_numero: ordem.numero,
        produto_id:            it.produto_id,
        produto_nome:          it.produto_nome,
        quantidade:            it.quantidade,
        custo_unitario:        it.custo_unitario,
        custo_total:           custoTotal,
        motivo:                it.motivo,
        descricao:             it.descricao,
        etapa_producao:        ordem.status,
        registrado_por:        user?.email || '',
        data_descarte:         hoje,
      });
      await registrarLog(
        'OrdemProducao', ordem.id, 'DESCARTE',
        `Descarte de ${it.quantidade} un de "${it.produto_nome}" — ${MOTIVOS.find(m => m.key === it.motivo)?.label}. Custo: R$ ${custoTotal.toFixed(2)}`
      );
    }

    setSalvando(false);
    onSalvo?.(itensPendentes);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={e => e.stopPropagation()}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <Trash2 size={16} className="text-destructive" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Registrar Descarte</h3>
              <p className="text-xs text-muted-foreground">OP {ordem.numero} · {ETAPAS_LABEL[ordem.status] || ordem.status}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Aviso */}
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <p>O descarte é registrado mas <strong>não</strong> altera o estoque automaticamente — somente a finalização da OP faz isso.</p>
          </div>

          {/* Itens */}
          {itens.map((it, idx) => (
            <div key={it.produto_id || idx}
              className={`border rounded-2xl overflow-hidden transition-all ${it.ativo ? 'border-destructive/30' : 'border-border'}`}>
              {/* Cabeçalho do item */}
              <button
                onClick={() => updateItem(idx, 'ativo', !it.ativo)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${it.ativo ? 'bg-destructive/5' : 'bg-muted/30 hover:bg-muted/50'}`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${it.ativo ? 'bg-destructive/15' : 'bg-muted'}`}>
                  <Package size={13} className={it.ativo ? 'text-destructive' : 'text-muted-foreground'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold truncate ${it.ativo ? 'text-foreground' : 'text-muted-foreground'}`}>{it.produto_nome}</p>
                  <p className="text-[11px] text-muted-foreground">OP: {it.qtdOP} un</p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${it.ativo ? 'bg-destructive border-destructive' : 'border-border'}`}>
                  {it.ativo && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </button>

              {/* Campos do item */}
              {it.ativo && (
                <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border/60">
                  {/* Quantidade + Custo */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Quantidade *</label>
                      <input type="number" min="0" max={it.qtdOP} value={it.quantidade}
                        onChange={e => updateItem(idx, 'quantidade', Number(e.target.value))}
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Custo Unit. (R$)</label>
                      <input type="number" min="0" step="0.01" value={it.custo_unitario}
                        onChange={e => updateItem(idx, 'custo_unitario', Number(e.target.value))}
                        className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                  </div>

                  {/* Custo calculado */}
                  {it.quantidade > 0 && it.custo_unitario > 0 && (
                    <div className="bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Custo desta perda</span>
                      <span className="font-bold text-destructive">{fmtR(it.quantidade * it.custo_unitario)}</span>
                    </div>
                  )}

                  {/* Motivo */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Motivo *</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {MOTIVOS.map(m => (
                        <button key={m.key} onClick={() => updateItem(idx, 'motivo', m.key)}
                          className={`text-left px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                            it.motivo === m.key
                              ? 'bg-destructive/10 border-destructive/30 text-destructive'
                              : 'bg-muted border-transparent text-muted-foreground hover:text-foreground'
                          }`}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Descrição */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Observações {it.motivo === 'outros' ? '*' : ''}</label>
                    <textarea rows={2} value={it.descricao}
                      onChange={e => updateItem(idx, 'descricao', e.target.value)}
                      placeholder="Descreva o ocorrido..."
                      className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 border-t border-border flex-shrink-0 space-y-3">
          {custoTotalGeral > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Custo total ({itensPendentes.length} produto{itensPendentes.length !== 1 ? 's' : ''})</span>
              <span className="text-sm font-bold text-destructive">{fmtR(custoTotalGeral)}</span>
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={salvar} disabled={salvando || itensPendentes.length === 0}
              className="flex-1 bg-destructive text-white py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              <Trash2 size={14} /> {salvando ? 'Registrando...' : `Registrar ${itensPendentes.length > 0 ? `(${itensPendentes.length})` : ''}`}
            </button>
            <button onClick={onClose}
              className="px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}