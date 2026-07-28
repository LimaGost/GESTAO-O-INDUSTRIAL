import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Plus, Edit2, Trash2, Check, Settings, Package } from 'lucide-react';

/**
 * Gestão de Categorias — criar, renomear, excluir e configurar variáveis de cada categoria.
 * produtos: lista completa de produtos | categoriasComVariaveis: mapa { [nome]: registro }
 */
export default function GestaoCategorias({ produtos = [], categoriasComVariaveis = {}, onAbrirVariaveis, onFechar, onAtualizado }) {
  const [nova, setNova] = useState('');
  const [editando, setEditando] = useState(null);
  const [novoNome, setNovoNome] = useState('');
  const [processando, setProcessando] = useState(false);

  const nomes = [...new Set([
    ...produtos.map(p => p.categoria).filter(Boolean),
    ...Object.keys(categoriasComVariaveis),
  ])].sort();

  const contar = (cat) => produtos.filter(p => p.categoria === cat).length;

  const criar = async () => {
    const nome = nova.trim();
    if (!nome) return;
    if (nomes.includes(nome)) return alert('Essa categoria já existe.');
    setProcessando(true);
    await base44.entities.CategoriaVariaveisProduto.create({ nome_categoria: nome, variaveis: [] });
    setNova('');
    await onAtualizado();
    setProcessando(false);
  };

  const renomear = async (antigo) => {
    const nome = novoNome.trim();
    if (!nome || nome === antigo) return setEditando(null);
    if (nomes.includes(nome)) return alert('Já existe uma categoria com esse nome.');
    setProcessando(true);
    const afetados = produtos.filter(p => p.categoria === antigo);
    await Promise.all(afetados.map(p => base44.entities.Produto.update(p.id, { categoria: nome })));
    const reg = categoriasComVariaveis[antigo];
    if (reg) await base44.entities.CategoriaVariaveisProduto.update(reg.id, { nome_categoria: nome });
    setEditando(null);
    await onAtualizado();
    setProcessando(false);
  };

  const excluir = async (cat) => {
    const qtd = contar(cat);
    const msg = qtd > 0
      ? `Excluir a categoria "${cat}"? ${qtd} produto(s) ficarão sem categoria.`
      : `Excluir a categoria "${cat}"?`;
    if (!confirm(msg)) return;
    setProcessando(true);
    const afetados = produtos.filter(p => p.categoria === cat);
    await Promise.all(afetados.map(p => base44.entities.Produto.update(p.id, { categoria: '' })));
    const reg = categoriasComVariaveis[cat];
    if (reg) await base44.entities.CategoriaVariaveisProduto.delete(reg.id);
    await onAtualizado();
    setProcessando(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-bold text-foreground">Gestão de Categorias</h3>
          <button onClick={onFechar} className="p-1.5 hover:bg-muted rounded-lg">
            <X size={17} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Nova categoria */}
          <div className="flex gap-2">
            <input value={nova} onChange={e => setNova(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && criar()}
              placeholder="Nome da nova categoria"
              className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            <button onClick={criar} disabled={processando}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50">
              <Plus size={15} /> Criar
            </button>
          </div>

          {/* Lista */}
          <div className="space-y-1.5">
            {nomes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma categoria cadastrada.</p>
            )}
            {nomes.map(cat => (
              <div key={cat} className="flex items-center gap-2 bg-muted/30 border border-border rounded-xl px-3 py-2.5">
                {editando === cat ? (
                  <>
                    <input autoFocus value={novoNome} onChange={e => setNovoNome(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && renomear(cat)}
                      className="flex-1 border border-border rounded-lg px-2.5 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                    <button onClick={() => renomear(cat)} disabled={processando}
                      className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditando(null)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground truncate">{cat}</p>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Package size={10} /> {contar(cat)} produto(s)
                        {categoriasComVariaveis[cat]?.variaveis?.length > 0 &&
                          <span>· {categoriasComVariaveis[cat].variaveis.length} variável(is)</span>}
                      </p>
                    </div>
                    <button onClick={() => onAbrirVariaveis(cat)} title="Variáveis"
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                      <Settings size={14} />
                    </button>
                    <button onClick={() => { setEditando(cat); setNovoNome(cat); }} title="Renomear"
                      className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => excluir(cat)} disabled={processando} title="Excluir"
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-50">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}