import { useState } from 'react';
import { Save, Plus, Trash2, Check, GripVertical, ArrowRight } from 'lucide-react';

const ICONES_OPCOES = [
  { key: 'Clock', label: '🕐 Aguardando' },
  { key: 'Factory', label: '🏭 Produção' },
  { key: 'CheckCircle', label: '✅ Concluído' },
  { key: 'Package', label: '📦 Embalagem' },
  { key: 'Flag', label: '🏁 Final' },
  { key: 'Truck', label: '🚚 Entrega' },
  { key: 'Archive', label: '🗄️ Arquivo' },
  { key: 'Layers', label: '📚 Camadas' },
];

const CORES_OPCOES = [
  { accent: '#64748B', bg: '#F8FAFC', border: '#CBD5E1', dot: '#94A3B8', label: 'Cinza' },
  { accent: '#0EA5E9', bg: '#F0F9FF', border: '#7DD3FC', dot: '#0EA5E9', label: 'Azul' },
  { accent: '#22C55E', bg: '#F0FDF4', border: '#86EFAC', dot: '#22C55E', label: 'Verde' },
  { accent: '#F59E0B', bg: '#FFFBEB', border: '#FCD34D', dot: '#F59E0B', label: 'Âmbar' },
  { accent: '#A855F7', bg: '#FAF5FF', border: '#D8B4FE', dot: '#A855F7', label: 'Roxo' },
  { accent: '#EF4444', bg: '#FFF5F5', border: '#FCA5A5', dot: '#EF4444', label: 'Vermelho' },
  { accent: '#F97316', bg: '#FFF7ED', border: '#FDBA74', dot: '#F97316', label: 'Laranja' },
  { accent: '#14B8A6', bg: '#F0FDFA', border: '#99F6E4', dot: '#14B8A6', label: 'Teal' },
];

const ACOES_DISPONIVEIS = [
  { key: 'nenhuma',                    label: 'Nenhuma ação automática' },
  { key: 'registrar_data_inicio',      label: 'Registrar data de início' },
  { key: 'registrar_data_fim_producao',label: 'Registrar data fim de produção + entrada no estoque' },
  { key: 'registrar_data_embalagem',   label: 'Registrar data de embalagem' },
  { key: 'saida_estoque',              label: 'Gerar etiqueta + saída do estoque (separação)' },
  { key: 'finalizar_expedicao',        label: 'Finalizar — cai no Kanban de Expedição' },
];

const COLUNAS_DEFAULT = [
  { key: 'a_produzir',    label: 'A Produzir',    icone: 'Clock',       cor: 0, acao: 'nenhuma',                     fixo: true },
  { key: 'em_producao',   label: 'Em Produção',   icone: 'Factory',     cor: 1, acao: 'registrar_data_inicio',       fixo: true },
  { key: 'produzido',     label: 'Produzido',     icone: 'CheckCircle', cor: 2, acao: 'registrar_data_fim_producao', fixo: true },
  { key: 'em_embalagem',  label: 'Em Embalagem',  icone: 'Package',     cor: 3, acao: 'registrar_data_embalagem',   fixo: true },
  { key: 'em_separacao',  label: 'Em Separação',  icone: 'Layers',      cor: 7, acao: 'saida_estoque',              fixo: true },
  { key: 'finalizado',    label: 'Finalizado',    icone: 'Flag',        cor: 4, acao: 'finalizar_expedicao',        fixo: true },
];

function gerarKey(label) {
  return label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function loadColunas() {
  try {
    const saved = JSON.parse(localStorage.getItem('kanban_colunas_config') || 'null');
    if (saved && Array.isArray(saved) && saved.length > 0) {
      // Migração: se ainda usa 'entrada_estoque' no finalizado (fluxo antigo), resetar para o padrão novo
      const temFluxoAntigo = saved.some(c => c.key === 'finalizado' && c.acao === 'entrada_estoque');
      if (temFluxoAntigo) {
        localStorage.setItem('kanban_colunas_config', JSON.stringify(COLUNAS_DEFAULT));
        localStorage.removeItem('kanban_colunas');
        return COLUNAS_DEFAULT;
      }
      return saved;
    }
  } catch {}
  return COLUNAS_DEFAULT;
}

export function getKanbanColunasConfig() {
  return loadColunas();
}

export default function AbaKanban() {
  const [colunas, setColunas] = useState(loadColunas);
  const [saved, setSaved] = useState(false);
  const [editando, setEditando] = useState(null); // index da coluna sendo editada
  const [novaLabel, setNovaLabel] = useState('');

  const salvar = () => {
    localStorage.setItem('kanban_colunas_config', JSON.stringify(colunas));
    localStorage.removeItem('kanban_colunas'); // força re-cálculo das visíveis
    const labels = {};
    colunas.forEach(c => { labels[c.key] = c.label; });
    localStorage.setItem('kanban_labels', JSON.stringify(labels));
    window.dispatchEvent(new Event('settings:saved'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const restaurarPadrao = () => {
    if (!window.confirm('Restaurar o fluxo padrão? Isso sobrescreverá as colunas atuais.')) return;
    setColunas(COLUNAS_DEFAULT);
    localStorage.setItem('kanban_colunas_config', JSON.stringify(COLUNAS_DEFAULT));
    localStorage.removeItem('kanban_colunas');
    const labels = {};
    COLUNAS_DEFAULT.forEach(c => { labels[c.key] = c.label; });
    localStorage.setItem('kanban_labels', JSON.stringify(labels));
    window.dispatchEvent(new Event('settings:saved'));
  };

  const adicionarColuna = () => {
    if (!novaLabel.trim()) return;
    const key = gerarKey(novaLabel) || `coluna_${Date.now()}`;
    const nova = {
      key: `custom_${key}_${Date.now()}`,
      label: novaLabel.trim(),
      icone: 'Layers',
      cor: 0,
      acao: 'nenhuma',
      fixo: false,
    };
    setColunas(prev => [...prev, nova]);
    setNovaLabel('');
  };

  const removerColuna = (idx) => {
    if (colunas[idx].fixo) return alert('Esta coluna é obrigatória e não pode ser removida.');
    setColunas(prev => prev.filter((_, i) => i !== idx));
  };

  const atualizarColuna = (idx, campo, valor) => {
    setColunas(prev => prev.map((c, i) => i === idx ? { ...c, [campo]: valor } : c));
  };

  const moverColuna = (idx, direcao) => {
    const nova = [...colunas];
    const alvo = idx + direcao;
    if (alvo < 0 || alvo >= nova.length) return;
    [nova[idx], nova[alvo]] = [nova[alvo], nova[idx]];
    setColunas(nova);
  };

  return (
    <div className="space-y-5">
      {/* Sequência visual */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="font-semibold text-foreground mb-1">Fluxo do Kanban</p>
        <p className="text-xs text-muted-foreground mb-4">As ordens avançam da esquerda para direita conforme o botão "Avançar" é clicado.</p>
        <div className="flex items-center gap-1 flex-wrap">
          {colunas.map((col, idx) => {
            const cor = CORES_OPCOES[col.cor] || CORES_OPCOES[0];
            return (
              <div key={col.key} className="flex items-center gap-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                  style={{ background: cor.accent }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/50" />
                  {col.label}
                </div>
                {idx < colunas.length - 1 && <ArrowRight size={12} className="text-muted-foreground flex-shrink-0" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista de colunas */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="font-semibold text-foreground">Colunas do Kanban</p>
          <p className="text-xs text-muted-foreground">Clique em uma coluna para editar seus detalhes</p>
        </div>

        <div className="divide-y divide-border">
          {colunas.map((col, idx) => {
            const cor = CORES_OPCOES[col.cor] || CORES_OPCOES[0];
            const isEditando = editando === idx;
            const acao = ACOES_DISPONIVEIS.find(a => a.key === col.acao) || ACOES_DISPONIVEIS[0];

            return (
              <div key={col.key}>
                {/* Linha resumo */}
                <div
                  className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors ${isEditando ? 'bg-muted/20' : ''}`}
                  onClick={() => setEditando(isEditando ? null : idx)}
                >
                  {/* Drag handle / ordem */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); moverColuna(idx, -1); }}
                      disabled={idx === 0}
                      className="p-0.5 hover:text-foreground text-muted-foreground/40 disabled:opacity-20 transition-colors text-xs leading-none">▲</button>
                    <button onClick={e => { e.stopPropagation(); moverColuna(idx, 1); }}
                      disabled={idx === colunas.length - 1}
                      className="p-0.5 hover:text-foreground text-muted-foreground/40 disabled:opacity-20 transition-colors text-xs leading-none">▼</button>
                  </div>

                  {/* Cor indicator */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: cor.bg, border: `1.5px solid ${cor.border}` }}>
                    <div className="w-3 h-3 rounded-full" style={{ background: cor.accent }} />
                  </div>

                  {/* Label */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{col.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{acao.label}</p>
                  </div>

                  {col.fixo ? (
                    <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Obrigatória</span>
                  ) : (
                    <button onClick={e => { e.stopPropagation(); removerColuna(idx); }}
                      className="p-1.5 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>

                {/* Painel de edição */}
                {isEditando && (
                  <div className="px-5 pb-5 pt-3 bg-muted/10 border-t border-border space-y-4">
                    {/* Label */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Nome da coluna</label>
                      <input
                        value={col.label}
                        onChange={e => atualizarColuna(idx, 'label', e.target.value)}
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    {/* Cor */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Cor</label>
                      <div className="flex flex-wrap gap-2">
                        {CORES_OPCOES.map((c, ci) => (
                          <button key={ci} onClick={() => atualizarColuna(idx, 'cor', ci)}
                            title={c.label}
                            className={`w-8 h-8 rounded-lg border-2 transition-all ${col.cor === ci ? 'scale-110 border-foreground' : 'border-transparent'}`}
                            style={{ background: c.accent }} />
                        ))}
                      </div>
                    </div>

                    {/* Ação automática */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Ação ao entrar nesta coluna</label>
                      <select
                        value={col.acao}
                        onChange={e => atualizarColuna(idx, 'acao', e.target.value)}
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {ACOES_DISPONIVEIS.map(a => (
                          <option key={a.key} value={a.key}>{a.label}</option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        Esta ação será executada automaticamente quando uma OP avançar para esta etapa.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Adicionar nova coluna */}
        <div className="px-5 py-4 border-t border-border bg-muted/20">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Adicionar nova etapa</p>
          <div className="flex gap-2">
            <input
              value={novaLabel}
              onChange={e => setNovaLabel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionarColuna()}
              placeholder="Nome da nova etapa..."
              className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button onClick={adicionarColuna}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
              <Plus size={15} /> Adicionar
            </button>
          </div>
        </div>
      </div>

      {/* Salvar + Restaurar */}
      <div className="flex items-center gap-3">
        <button onClick={salvar}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'}`}>
          {saved ? <><Check size={14} /> Configuração salva!</> : <><Save size={14} /> Salvar configuração</>}
        </button>
        <button onClick={restaurarPadrao}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
          Restaurar padrão
        </button>
      </div>
    </div>
  );
}