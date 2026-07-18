import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Crown, RefreshCw } from 'lucide-react';
import DiretorKpis from '@/components/diretor/DiretorKpis';
import DiretorAlertas from '@/components/diretor/DiretorAlertas';
import DiretorOperacao from '@/components/diretor/DiretorOperacao';
import DiretorDesempenho from '@/components/diretor/DiretorDesempenho';
import DiretorAuditoria from '@/components/diretor/DiretorAuditoria';

const ABAS = [
  { key: 'visao', label: '📊 Visão Executiva' },
  { key: 'operacao', label: '🏭 Operação' },
  { key: 'desempenho', label: '🏆 Desempenho' },
  { key: 'auditoria', label: '🔍 Auditoria' },
];

export default function PainelDiretor() {
  const { user } = useAuth();
  const [aba, setAba] = useState('visao');
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(false);

  const load = async () => {
    setCarregando(true);
    const [pedidos, ops, separacoes, sepsGalpao, expedicoes, produtos, usuarios, logs] = await Promise.all([
      base44.entities.Pedido.list('-created_date'),
      base44.entities.OrdemProducao.list('-created_date'),
      base44.entities.Separacao.list('-created_date'),
      base44.entities.SeparacaoGalpao.list('-created_date').catch(() => []),
      base44.entities.Expedicao.list('-created_date'),
      base44.entities.Produto.list(),
      base44.functions.invoke('chatListarUsuarios', {}).then(r => r.data?.usuarios || []).catch(() => []),
      base44.entities.LogAuditoria.list('-created_date', 2000).catch(() => []),
    ]);
    setDados({ pedidos, ops, separacoes, sepsGalpao, expedicoes, produtos, usuarios, logs });
    setCarregando(false);
  };

  useEffect(() => {
    if (user?.role === 'diretor') load();
  }, [user]);

  if (user && user.role !== 'diretor') {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
        <span className="text-4xl">👑</span>
        <p className="font-bold text-foreground">Painel Diretor</p>
        <p className="text-sm text-muted-foreground">Esta área é exclusiva para usuários com o cargo de <strong>Diretor</strong>.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-teal-dark rounded-2xl px-5 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sun-gold flex items-center justify-center">
            <Crown size={19} className="text-teal-dark" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Painel Diretor</h2>
            <p className="text-xs text-white/60">Central de inteligência e auditoria da operação · tempo real</p>
          </div>
        </div>
        <button onClick={load} disabled={carregando}
          className="flex items-center gap-2 bg-white/10 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/20 transition-colors disabled:opacity-50">
          <RefreshCw size={14} className={carregando ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Abas */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {ABAS.map(a => (
          <button key={a.key} onClick={() => setAba(a.key)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all ${aba === a.key ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}>
            {a.label}
          </button>
        ))}
      </div>

      {!dados ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {aba === 'visao' && (
            <div className="space-y-4">
              <DiretorAlertas pedidos={dados.pedidos} ops={dados.ops} separacoes={dados.separacoes}
                expedicoes={dados.expedicoes} produtos={dados.produtos} usuarios={dados.usuarios} />
              <DiretorKpis pedidos={dados.pedidos} ops={dados.ops} />
            </div>
          )}
          {aba === 'operacao' && (
            <DiretorOperacao pedidos={dados.pedidos} ops={dados.ops} separacoes={dados.separacoes}
              sepsGalpao={dados.sepsGalpao} expedicoes={dados.expedicoes} />
          )}
          {aba === 'desempenho' && (
            <DiretorDesempenho logs={dados.logs} usuarios={dados.usuarios} />
          )}
          {aba === 'auditoria' && (
            <DiretorAuditoria logs={dados.logs} />
          )}
        </>
      )}
    </div>
  );
}