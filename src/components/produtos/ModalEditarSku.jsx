import { useState, useEffect } from 'react';
import { X, Check, Loader2, Tag } from 'lucide-react';
import FotoProduto from './FotoProduto';
import { base44 } from '@/api/base44Client';

const campos = [
  { key: 'nome', label: 'Nome *', type: 'text', col: 2 },
  { key: 'codigo', label: 'Código / SKU', type: 'text', col: 1 },
  { key: 'categoria', label: 'Categoria', type: 'text', col: 1 },
  { key: 'unidade', label: 'Unidade', type: 'text', col: 1 },
  { key: 'itens_por_caixa', label: 'Itens por Caixa', type: 'number', col: 1 },
  { key: 'preco_unitario', label: 'Preço Unitário (R$)', type: 'number', col: 1 },
  { key: 'preco_custo', label: 'Preço de Custo (R$)', type: 'number', col: 1 },
  { key: 'estoque_atual', label: 'Estoque Atual', type: 'number', col: 1 },
  { key: 'estoque_minimo', label: 'Estoque Mínimo', type: 'number', col: 1 },
  { key: 'estoque_maximo', label: 'Estoque Máximo', type: 'number', col: 1 },
  { key: 'peso_liquido_kg', label: 'Peso Líquido (kg)', type: 'number', col: 1 },
  { key: 'peso_bruto_kg', label: 'Peso Bruto (kg)', type: 'number', col: 1 },
  { key: 'largura_cm', label: 'Largura (cm)', type: 'number', col: 1 },
  { key: 'altura_cm', label: 'Altura (cm)', type: 'number', col: 1 },
  { key: 'profundidade_cm', label: 'Profundidade (cm)', type: 'number', col: 1 },
];

export default function ModalEditarSku({ produto, onClose, onSaved }) {
  const [form, setForm] = useState({
    nome: produto.nome || '',
    codigo: produto.codigo || '',
    categoria: produto.categoria || '',
    descricao: produto.descricao || '',
    unidade: produto.unidade || 'unidade',
    itens_por_caixa: produto.itens_por_caixa || 1,
    estoque_atual: produto.estoque_atual || 0,
    estoque_minimo: produto.estoque_minimo || 0,
    estoque_maximo: produto.estoque_maximo || 0,
    preco_unitario: produto.preco_unitario || 0,
    preco_custo: produto.preco_custo || 0,
    peso_liquido_kg: produto.peso_liquido_kg || 0,
    peso_bruto_kg: produto.peso_bruto_kg || 0,
    largura_cm: produto.largura_cm || 0,
    altura_cm: produto.altura_cm || 0,
    profundidade_cm: produto.profundidade_cm || 0,
    foto_url: produto.foto_url || '',
    tipo_produto: produto.tipo_produto || 'marca_propria',
    wl_cliente_id: produto.wl_cliente_id || '',
    wl_cliente_nome: produto.wl_cliente_nome || '',
    wl_logotipo_url: produto.wl_logotipo_url || '',
    wl_nome_comercial: produto.wl_nome_comercial || '',
    wl_codigo_cliente: produto.wl_codigo_cliente || '',
    wl_obs_embalagem: produto.wl_obs_embalagem || '',
    wl_obs_rotulagem: produto.wl_obs_rotulagem || '',
  });
  const [loading, setLoading] = useState(false);
  const [clientesWL, setClientesWL] = useState([]);

  useEffect(() => {
    base44.entities.ClienteWhiteLabel.list().then(list => setClientesWL(list.filter(c => c.ativo !== false)));
  }, []);

  const handleSave = async () => {
    if (!form.nome.trim()) { alert('Nome é obrigatório.'); return; }
    setLoading(true);
    await base44.entities.Produto.update(produto.id, form);
    setLoading(false);
    onSaved?.({ ...produto, ...form });
    onClose();
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h3 className="font-bold text-foreground">Editar Produto</h3>
            <p className="text-xs text-muted-foreground">{produto.nome}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Foto */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">Foto do Produto</p>
            <FotoProduto
              fotoUrl={form.foto_url}
              onUpload={url => set('foto_url', url || '')}
              size="lg"
            />
          </div>

          {/* Campos em grid */}
          <div className="grid grid-cols-2 gap-3">
            {campos.map(({ key, label, type, col }) => (
              <div key={key} className={col === 2 ? 'col-span-2' : 'col-span-1'}>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={e => set(key, type === 'number' ? Number(e.target.value) : e.target.value)}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            ))}

            {/* Descrição */}
            <div className="col-span-2">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Descrição</label>
              <textarea
                rows={2}
                value={form.descricao}
                onChange={e => set('descricao', e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />
            </div>
          </div>

          {/* Tipo de produto */}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-3">Tipo de Produto</p>
            <div className="flex gap-3">
              {[
                { key: 'marca_propria', label: 'Marca Própria', desc: 'Produto da sua marca', color: 'border-primary bg-primary/5 text-primary' },
                { key: 'white_label', label: 'White Label', desc: 'Produto para outra marca', color: 'border-purple-400 bg-purple-50 text-purple-700' },
              ].map(opt => (
                <button key={opt.key} type="button"
                  onClick={() => set('tipo_produto', opt.key)}
                  className={`flex-1 border-2 rounded-xl p-3 text-left transition-all ${form.tipo_produto === opt.key ? opt.color : 'border-border text-muted-foreground hover:bg-muted/50'}`}>
                  <p className="text-sm font-bold">{opt.label}</p>
                  <p className="text-[10px] mt-0.5 opacity-70">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Campos White Label */}
          {form.tipo_produto === 'white_label' && (
            <div className="border border-purple-200 bg-purple-50/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Tag size={13} className="text-purple-600" />
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">Configuração White Label</p>
              </div>

              {/* Cliente WL */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Cliente White Label</label>
                <select value={form.wl_cliente_id}
                  onChange={e => {
                    const cli = clientesWL.find(c => c.id === e.target.value);
                    set('wl_cliente_id', e.target.value);
                    set('wl_cliente_nome', cli?.nome_fantasia || cli?.razao_social || '');
                    set('wl_logotipo_url', cli?.logotipo_url || form.wl_logotipo_url);
                  }}
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
                  <option value="">Selecione o cliente...</option>
                  {clientesWL.map(c => (
                    <option key={c.id} value={c.id}>{c.nome_fantasia || c.razao_social}</option>
                  ))}
                </select>
              </div>

              {/* Logotipo WL (auto-preenchido ou manual) */}
              {form.wl_logotipo_url && (
                <div className="flex items-center gap-3 bg-white rounded-xl border border-purple-200 p-3">
                  <img src={form.wl_logotipo_url} alt="logo wl" className="w-10 h-10 object-contain rounded" />
                  <p className="text-xs text-muted-foreground">Logotipo vinculado automaticamente do cliente.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nome Comercial do Cliente</label>
                  <input value={form.wl_nome_comercial} onChange={e => set('wl_nome_comercial', e.target.value)}
                    placeholder="Ex: Vela Zen Lavanda"
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Código Interno do Cliente</label>
                  <input value={form.wl_codigo_cliente} onChange={e => set('wl_codigo_cliente', e.target.value)}
                    placeholder="Ex: CLI-001"
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Observações de Embalagem</label>
                  <textarea rows={2} value={form.wl_obs_embalagem} onChange={e => set('wl_obs_embalagem', e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Observações de Rotulagem</label>
                  <textarea rows={2} value={form.wl_obs_rotulagem} onChange={e => set('wl_obs_rotulagem', e.target.value)}
                    className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none" />
                </div>
              </div>
            </div>
          )}

          {/* Preview barra de estoque */}
          <div className="bg-muted/30 rounded-xl p-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progresso de estoque</span>
              <span className="font-semibold text-foreground">{form.estoque_atual} / {form.estoque_minimo} (mín)</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  form.estoque_atual === 0 ? 'bg-rainbow-red' :
                  form.estoque_atual <= form.estoque_minimo ? 'bg-sun-yellow' : 'bg-rainbow-green'
                }`}
                style={{ width: `${form.estoque_minimo > 0 ? Math.min(100, Math.round((form.estoque_atual / (form.estoque_minimo * 2)) * 100)) : 100}%` }}
              />
            </div>
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
            <button onClick={onClose} className="px-5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}