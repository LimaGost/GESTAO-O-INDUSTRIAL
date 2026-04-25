import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, X, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export default function GerenciadorVariaveisCategoria({ nomeCategoria, variavelExistentes = [], onSalvar, onFechar }) {
  const [variaveis, setVariaveis] = useState(variavelExistentes);
  const [novaVariavel, setNovaVariavel] = useState({ id: '', nome: '', tipo: 'texto', obrigatoria: false, opcoes: [], valor_padrao: '' });
  const [expandidas, setExpandidas] = useState({});
  const [editando, setEditando] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const adicionarVariavel = () => {
    if (!novaVariavel.nome.trim()) return alert('Nome da variável obrigatório');
    const variavel = {
      id: `var_${Date.now()}`,
      nome: novaVariavel.nome.trim(),
      tipo: novaVariavel.tipo,
      obrigatoria: novaVariavel.obrigatoria,
      opcoes: novaVariavel.tipo === 'select' ? novaVariavel.opcoes.filter(o => o.trim()) : [],
      valor_padrao: novaVariavel.valor_padrao.trim()
    };
    if (editando !== null) {
      setVariaveis(prev => prev.map((v, i) => i === editando ? variavel : v));
      setEditando(null);
    } else {
      setVariaveis(prev => [...prev, variavel]);
    }
    setNovaVariavel({ id: '', nome: '', tipo: 'texto', obrigatoria: false, opcoes: [], valor_padrao: '' });
  };

  const editarVariavel = (index) => {
    setNovaVariavel(variaveis[index]);
    setEditando(index);
    setExpandidas(prev => ({ ...prev, [index]: true }));
  };

  const deletarVariavel = (index) => {
    if (confirm('Excluir esta variável?')) {
      setVariaveis(prev => prev.filter((_, i) => i !== index));
    }
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      await onSalvar(variaveis);
      alert('Variáveis salvas com sucesso!');
      onFechar();
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    }
    setSalvando(false);
  };

  const adicionarOpcao = (opcao) => {
    if (!opcao.trim()) return;
    setNovaVariavel(prev => ({
      ...prev,
      opcoes: [...prev.opcoes, opcao.trim()]
    }));
  };

  const removerOpcao = (index) => {
    setNovaVariavel(prev => ({
      ...prev,
      opcoes: prev.opcoes.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-96 overflow-y-auto p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Variáveis da Categoria: {nomeCategoria}</h3>
          <button onClick={onFechar} className="p-1.5 hover:bg-muted rounded-lg">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Lista de variáveis existentes */}
        <div className="space-y-2">
          {variaveis.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma variável configurada ainda.</p>
          ) : (
            variaveis.map((v, i) => (
              <div key={v.id} className="bg-muted/30 border border-border rounded-xl p-3">
                <button
                  onClick={() => setExpandidas(prev => ({ ...prev, [i]: !prev[i] }))}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{v.nome}</p>
                    <p className="text-xs text-muted-foreground">{v.tipo} {v.obrigatoria ? '(obrigatório)' : ''}</p>
                  </div>
                  {expandidas[i] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {expandidas[i] && (
                  <div className="mt-2 pt-2 border-t border-border space-y-2 text-sm">
                    {v.tipo === 'select' && v.opcoes.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Opções:</p>
                        <div className="flex flex-wrap gap-1">
                          {v.opcoes.map((op, oi) => (
                            <span key={oi} className="bg-primary/10 text-primary text-xs px-2 py-1 rounded">
                              {op}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {v.valor_padrao && (
                      <p className="text-xs text-muted-foreground">Padrão: {v.valor_padrao}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => editarVariavel(i)}
                        className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20"
                      >
                        <Edit2 size={12} /> Editar
                      </button>
                      <button
                        onClick={() => deletarVariavel(i)}
                        className="flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-1 rounded hover:bg-destructive/20"
                      >
                        <Trash2 size={12} /> Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Formulário nova variável */}
        <div className="bg-muted/20 border border-border rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-foreground">{editando !== null ? 'Editar' : 'Nova'} Variável</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Nome *</label>
              <input
                value={novaVariavel.nome}
                onChange={e => setNovaVariavel(prev => ({ ...prev, nome: e.target.value }))}
                placeholder="Ex: Cor, Tamanho, Sabor"
                className="w-full border border-border rounded-lg px-3 py-2 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tipo *</label>
              <select
                value={novaVariavel.tipo}
                onChange={e => setNovaVariavel(prev => ({ ...prev, tipo: e.target.value }))}
                className="w-full border border-border rounded-lg px-3 py-2 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="texto">Texto</option>
                <option value="numero">Número</option>
                <option value="select">Seleção</option>
                <option value="booleano">Sim/Não</option>
              </select>
            </div>
          </div>

          {novaVariavel.tipo === 'select' && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Opções</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Digite e pressione Enter"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      adicionarOpcao(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="flex-1 border border-border rounded-lg px-3 py-2 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {novaVariavel.opcoes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {novaVariavel.opcoes.map((op, i) => (
                    <span key={i} className="flex items-center gap-1 bg-primary/10 text-primary text-xs px-2 py-1 rounded">
                      {op}
                      <button onClick={() => removerOpcao(i)} className="hover:opacity-70">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={novaVariavel.obrigatoria}
                onChange={e => setNovaVariavel(prev => ({ ...prev, obrigatoria: e.target.checked }))}
                className="rounded"
              />
              <span className="text-foreground">Obrigatória</span>
            </label>

            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Valor Padrão</label>
              <input
                value={novaVariavel.valor_padrao}
                onChange={e => setNovaVariavel(prev => ({ ...prev, valor_padrao: e.target.value }))}
                placeholder="Opcional"
                className="w-full border border-border rounded-lg px-3 py-2 text-xs bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <button
            onClick={adicionarVariavel}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 rounded-lg text-sm font-semibold hover:opacity-90"
          >
            <Plus size={14} />
            {editando !== null ? 'Atualizar Variável' : 'Adicionar Variável'}
          </button>
        </div>

        {/* Botões finais */}
        <div className="flex gap-3">
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar Variáveis'}
          </button>
          <button
            onClick={onFechar}
            className="px-4 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}