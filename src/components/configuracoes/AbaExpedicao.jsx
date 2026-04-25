import { useState } from 'react';
import { Save, Plus, Trash2, Check, ArrowRight } from 'lucide-react';

const CORES_OPCOES = [
  { accent: '#64748B', bg: '#F8FAFC', border: '#CBD5E1', label: 'Cinza' },
  { accent: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', label: 'Azul' },
  { accent: '#22C55E', bg: '#F0FDF4', border: '#86EFAC', label: 'Verde' },
  { accent: '#F59E0B', bg: '#FFFBEB', border: '#FCD34D', label: 'Âmbar' },
  { accent: '#A855F7', bg: '#FAF5FF', border: '#D8B4FE', label: 'Roxo' },
  { accent: '#EF4444', bg: '#FFF5F5', border: '#FCA5A5', label: 'Vermelho' },
  { accent: '#F97316', bg: '#FFF7ED', border: '#FDBA74', label: 'Laranja' },
  { accent: '#14B8A6', bg: '#F0FDFA', border: '#99F6E4', label: 'Teal' },
];

// Colunas padrão de expedição (a_expedir é sempre a primeira e fixa)
const COLUNAS_DEFAULT = [
  { key: 'a_expedir', label: 'A Expedir',    cor: 4, desc: 'OPs prontas para NF',     fixo: true },
  { key: 'emitida',   label: 'NF Emitida',   cor: 1, desc: 'Aguardando envio',         fixo: true },
  { key: 'enviada',   label: 'Em Trânsito',  cor: 3, desc: 'Em rota de entrega',       fixo: true },
  { key: 'entregue',  label: 'Entregue',     cor: 2, desc: 'Entrega confirmada',       fixo: true },
];

const STORAGE_KEY = 'expedicao_colunas_config';

function gerarKey(label) {
  return 'exp_' + label.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    + '_' + Date.now();
}

export function getExpedicaoColunasConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && Array.isArray(saved) && saved.length > 0) return saved;
  } catch {}
  return COLUNAS_DEFAULT;
}

function loadColunas() {
  return getExpedicaoColunasConfig();
}

export default function AbaExpedicao() {
  const [colunas, setColunas] = useState(loadColunas);
  const [saved, setSaved] = useState(false);
  const [editando, setEditando] = useState(null);
  const [novaLabel, setNovaLabel] = useState('');
  const [novaDesc, setNovaDesc] = useState('');

  const salvar = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(colunas));
    window.dispatchEvent(new Event('expedicao:settings:saved'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const restaurarPadrao = () => {
    if (!window.confirm('Restaurar o fluxo padrão de expedição? Isso sobrescreverá as colunas atuais.')) return;
    setColunas(COLUNAS_DEFAULT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(COLUNAS_DEFAULT));
    window.dispatchEvent(new Event('expedicao:settings:saved'));
  };

  const adicionarColuna = () => {
    if (!novaLabel.trim()) return;
    const nova = {
      key: gerarKey(novaLabel),
      label: novaLabel.trim(),
      cor: 0,
      desc: novaDesc.trim() || '',
      fixo: false,
    };
    setColunas(prev => [...prev, nova]);
    setNovaLabel('');
    setNovaDesc('');
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
        <p className="font-semibold text-foreground mb-1">Fluxo de Expedição</p>
        <p className="text-xs text-muted-foreground mb-4">As expedições avançam da esquerda para direita.</p>
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
          <p className="font-semibold text-foreground">Colunas da Expedição</p>
          <p className="text-xs text-muted-foreground">Clique em uma coluna para editar seus detalhes</p>
        </div>

        <div className="divide-y divide-border">
          {colunas.map((col, idx) => {
            const cor = CORES_OPCOES[col.cor] || CORES_OPCOES[0];
            const isEditando = editando === idx;

            return (
              <div key={col.key}>
                {/* Linha resumo */}
                <div
                  className={`flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-muted/30 transition-colors ${isEditando ? 'bg-muted/20' : ''}`}
                  onClick={() => setEditando(isEditando ? null : idx)}
                >
                  {/* Ordem */}
                  <div className="flex flex-col gap-0.5 flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); moverColuna(idx, -1); }}
                      disabled={idx === 0}
                      className="p-0.5 hover:text-foreground text-muted-foreground/40 disabled:opacity-20 transition-colors text-xs leading-none">▲</button>
                    <button onClick={e => { e.stopPropagation(); moverColuna(idx, 1); }}
                      disabled={idx === colunas.length - 1}
                      className="p-0.5 hover:text-foreground text-muted-foreground/40 disabled:opacity-20 transition-colors text-xs leading-none">▼</button>
                  </div>

                  {/* Cor */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: cor.bg, border: `1.5px solid ${cor.border}` }}>
                    <div className="w-3 h-3 rounded-full" style={{ background: cor.accent }} />
                  </div>

                  {/* Label + desc */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{col.label}</p>
                    {col.desc && <p className="text-xs text-muted-foreground truncate">{col.desc}</p>}
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
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Nome da coluna</label>
                      <input
                        value={col.label}
                        onChange={e => atualizarColuna(idx, 'label', e.target.value)}
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Descrição (opcional)</label>
                      <input
                        value={col.desc || ''}
                        onChange={e => atualizarColuna(idx, 'desc', e.target.value)}
                        placeholder="Ex: Aguardando retirada..."
                        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
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
              placeholder="Nome da etapa (ex: Aguardando retirada)..."
              className="flex-1 border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <input
              value={novaDesc}
              onChange={e => setNovaDesc(e.target.value)}
              placeholder="Descrição (opcional)"
              className="w-48 border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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