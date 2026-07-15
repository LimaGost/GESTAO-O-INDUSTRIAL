import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

export default function ModalNovaGalpao({ onCriar, onClose, criando }) {
  const [clienteNome, setClienteNome] = useState('');
  const [prioridade, setPrioridade] = useState('normal');
  const [dataPrevista, setDataPrevista] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState([{ produto_nome: '', quantidade: 1 }]);

  const updateItem = (idx, field, val) =>
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));

  const submit = () => {
    const itensValidos = itens.filter(i => (i.produto_nome || '').trim());
    onCriar({
      cliente_nome: clienteNome.trim(),
      prioridade,
      data_prevista: dataPrevista || null,
      observacoes: observacoes.trim(),
      itens: itensValidos.map(i => ({ produto_nome: i.produto_nome.trim(), quantidade: Number(i.quantidade) || 1 })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h3 className="font-bold text-foreground">Nova Separação — Galpão</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="field-label">Cliente / Referência</label>
            <input value={clienteNome} onChange={e => setClienteNome(e.target.value)}
              placeholder="Nome do cliente ou referência do serviço" className="field-input" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="field-label">Prioridade</label>
              <select value={prioridade} onChange={e => setPrioridade(e.target.value)} className="field-input">
                <option value="baixa">Baixa</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <div>
              <label className="field-label">Data prevista</label>
              <input type="date" value={dataPrevista} onChange={e => setDataPrevista(e.target.value)} className="field-input" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="field-label mb-0">Itens</label>
              <button onClick={() => setItens(prev => [...prev, { produto_nome: '', quantidade: 1 }])}
                className="flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-80">
                <Plus size={12} /> Adicionar item
              </button>
            </div>
            <div className="space-y-1.5">
              {itens.map((item, idx) => (
                <div key={idx} className="flex gap-1.5">
                  <input value={item.produto_nome} onChange={e => updateItem(idx, 'produto_nome', e.target.value)}
                    placeholder="Nome do item" className="field-input flex-1" />
                  <input type="number" min="1" value={item.quantidade}
                    onChange={e => updateItem(idx, 'quantidade', e.target.value)}
                    className="field-input w-20" />
                  <button onClick={() => setItens(prev => prev.filter((_, i) => i !== idx))}
                    className="p-2 text-muted-foreground hover:text-destructive rounded-lg flex-shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="field-label">Observações</label>
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2}
              placeholder="Observações (opcional)" className="field-input resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
          <button onClick={submit} disabled={criando || !clienteNome.trim()}
            className="btn-primary text-sm">
            {criando ? 'Criando...' : 'Criar Separação'}
          </button>
        </div>
      </div>
    </div>
  );
}