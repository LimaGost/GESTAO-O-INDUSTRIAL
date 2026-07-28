import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { registrarLog } from '@/lib/audit';
import { agoraISO } from '@/lib/brasilia';
import { ClipboardCheck } from 'lucide-react';
import GalpaoCard from '@/components/galpao/GalpaoCard';
import { useRealtimeEntity } from '@/hooks/useRealtimeEntity';
import { readStagesLocal, buildColunas, loadKanbanFluxo } from '@/lib/kanbanFluxo';

const DATA_POR_STATUS = {
  em_separacao: 'data_inicio_separacao',
  separado: 'data_separado',
  em_conferencia: 'data_conferencia',
  liberado_expedicao: 'data_liberacao',
};

export default function KanbanOperacionalGalpao() {
  const [separacoes, setSeparacoes] = useState([]);
  const [loadingId, setLoadingId] = useState(null);
  const [colunas, setColunas] = useState(() => buildColunas(readStagesLocal('separacao_galpao')));

  const load = () => base44.entities.SeparacaoGalpao.list('-created_date').then(setSeparacoes).catch(() => {});

  useEffect(() => { load(); }, []);

  // Etapas configuráveis (Configurações > Gestão de Fluxos > Fluxo Microvix)
  useEffect(() => {
    loadKanbanFluxo('separacao_galpao').then(cfg => setColunas(buildColunas(cfg.stages)));
    const onSaved = () => setColunas(buildColunas(readStagesLocal('separacao_galpao')));
    window.addEventListener('galpao:settings:saved', onSaved);
    return () => window.removeEventListener('galpao:settings:saved', onSaved);
  }, []);

  // Tempo real: aplica só o card alterado, sem recarregar a lista inteira
  useRealtimeEntity('SeparacaoGalpao', setSeparacoes);

  const avancar = async (sep) => {
    const idx = colunas.findIndex(c => c.key === sep.status);
    const proximo = colunas[idx + 1]?.key;
    if (!proximo) return;
    setLoadingId(sep.id);
    setSeparacoes(prev => prev.map(s => s.id === sep.id ? { ...s, status: proximo } : s));
    const updates = { status: proximo };
    if (DATA_POR_STATUS[proximo]) updates[DATA_POR_STATUS[proximo]] = agoraISO();
    try {
      await base44.entities.SeparacaoGalpao.update(sep.id, updates);
      const label = colunas[idx + 1]?.label || proximo;
      registrarLog('SeparacaoGalpao', sep.id, 'AVANCO_STATUS', `Separação Galpão ${sep.numero} avançou para "${label}"`).catch(() => {});
    } catch (e) {
      setSeparacoes(prev => prev.map(s => s.id === sep.id ? { ...s, status: sep.status } : s));
      console.error('[KanbanOperacionalGalpao] erro ao avançar:', e);
    } finally {
      setLoadingId(null);
    }
  };

  const excluir = async (sep) => {
    if (!confirm(`Excluir a separação ${sep.numero}?`)) return;
    setSeparacoes(prev => prev.filter(s => s.id !== sep.id));
    await base44.entities.SeparacaoGalpao.delete(sep.id).catch(() => load());
    registrarLog('SeparacaoGalpao', sep.id, 'EXCLUSAO', `Separação Galpão ${sep.numero} excluída`).catch(() => {});
  };

  return (
    <div className="flex flex-col space-y-4">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl px-4 md:px-5 py-4 flex-shrink-0">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="w-9 md:w-10 h-9 md:h-10 rounded-2xl bg-teal-100 flex items-center justify-center flex-shrink-0">
            <ClipboardCheck size={18} className="text-teal-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base md:text-lg font-bold text-foreground truncate">Separação Galpão</h2>
            <p className="text-xs text-muted-foreground">Pedidos de Franqueados → Separação → Expedição</p>
          </div>
        </div>

        {/* Progress bars */}
        <div className="mt-4 grid gap-2 grid-cols-3 md:grid-cols-6">
          {colunas.map((col) => {
            const count = separacoes.filter(s => s.status === col.key).length;
            const pct = separacoes.length > 0 ? Math.round(count / separacoes.length * 100) : 0;
            return (
              <div key={col.key} className="text-center">
                <div className="h-1.5 rounded-full mb-1.5 overflow-hidden bg-muted">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: col.accent }} />
                </div>
                <p className="text-base md:text-lg font-bold text-foreground">{count}</p>
                <p className="text-[9px] md:text-[10px] text-muted-foreground leading-tight hidden sm:block">{col.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Colunas */}
      <div className="flex gap-3 overflow-x-auto pb-4 items-start snap-x">
        {colunas.map(({ key, label, icon: Icon, accent, bg, border, dot }, idx) => {
          const colSeps = separacoes.filter(s => s.status === key);
          const labelBotao = colunas[idx + 1] ? `→ ${colunas[idx + 1].label}` : null;
          return (
            <div key={key} className="flex-shrink-0 w-80 sm:w-96 md:w-72 rounded-2xl flex flex-col overflow-hidden snap-center"
              style={{ maxHeight: 'calc(100vh - 260px)', minHeight: '280px', background: bg, border: `1.5px solid ${border}` }}>
              <div className="px-4 py-3 flex items-center justify-between sticky top-0 z-10"
                style={{ background: bg, borderBottom: `1px solid ${border}` }}>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: dot }} />
                  <Icon size={13} style={{ color: accent }} />
                  <span className="text-xs font-bold tracking-wide" style={{ color: accent }}>{label.toUpperCase()}</span>
                </div>
                <span className="text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full text-white"
                  style={{ background: accent, opacity: colSeps.length === 0 ? 0.4 : 1 }}>{colSeps.length}</span>
              </div>

              <div className="flex-1 p-2 md:p-3 overflow-y-auto space-y-1.5 md:space-y-2.5">
                {colSeps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 md:py-12 opacity-30">
                    <div className="w-8 md:w-10 h-8 md:h-10 rounded-full border-2 border-dashed flex items-center justify-center mb-2" style={{ borderColor: accent }}>
                      <Icon size={14} style={{ color: accent }} />
                    </div>
                    <p className="text-xs text-muted-foreground">Sem itens</p>
                  </div>
                ) : (
                  colSeps.map(sep => (
                    <GalpaoCard key={sep.id} sep={sep}
                      onAvancar={avancar} onExcluir={excluir}
                      loading={loadingId === sep.id} labelBotao={labelBotao} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}