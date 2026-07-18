import { useMemo, useState } from 'react';
import { Trophy, Medal } from 'lucide-react';

const PERIODOS = [
  { key: 'dia', label: 'Hoje' },
  { key: 'semana', label: 'Semana' },
  { key: 'mes', label: 'Mês' },
  { key: 'ano', label: 'Ano' },
];

function inicioPeriodo(periodo) {
  const d = new Date();
  if (periodo === 'dia') { d.setHours(0, 0, 0, 0); return d; }
  if (periodo === 'semana') { d.setDate(d.getDate() - 7); return d; }
  if (periodo === 'mes') { return new Date(d.getFullYear(), d.getMonth(), 1); }
  return new Date(d.getFullYear(), 0, 1);
}

export default function DiretorDesempenho({ logs, usuarios }) {
  const [periodo, setPeriodo] = useState('semana');

  const ranking = useMemo(() => {
    const inicio = inicioPeriodo(periodo);
    const logsFiltrados = logs.filter(l => new Date(l.created_date) >= inicio && l.usuario);

    const porUsuario = {};
    for (const l of logsFiltrados) {
      if (!porUsuario[l.usuario]) {
        porUsuario[l.usuario] = { usuario: l.usuario, total: 0, producao: 0, separacao: 0, expedicao: 0, pedidos: 0, estoque: 0 };
      }
      const u = porUsuario[l.usuario];
      u.total++;
      if (l.entidade === 'OrdemProducao') u.producao++;
      else if (['Separacao', 'SeparacaoGalpao'].includes(l.entidade)) u.separacao++;
      else if (l.entidade === 'Expedicao') u.expedicao++;
      else if (l.entidade === 'Pedido') u.pedidos++;
      else if (l.entidade === 'Produto') u.estoque++;
    }
    return Object.values(porUsuario).sort((a, b) => b.total - a.total);
  }, [logs, periodo]);

  const agora = Date.now();
  const inativos = useMemo(() =>
    usuarios
      .map(u => ({ ...u, diasInativo: u.ultima_atividade ? (agora - new Date(u.ultima_atividade).getTime()) / 86400000 : Infinity }))
      .filter(u => u.diasInativo > 1)
      .sort((a, b) => b.diasInativo - a.diasInativo),
  [usuarios, agora]);

  const medalha = (i) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;

  return (
    <div className="space-y-4">
      {/* Seletor de período */}
      <div className="flex gap-2">
        {PERIODOS.map(p => (
          <button key={p.key} onClick={() => setPeriodo(p.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${periodo === p.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-border'}`}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Ranking */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Trophy size={15} className="text-sun-gold" />
          <h3 className="text-sm font-bold text-foreground">Ranking de Produtividade</h3>
          <span className="text-xs text-muted-foreground ml-auto">por ações registradas no sistema</span>
        </div>
        {ranking.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">Nenhuma atividade registrada neste período.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  {['#', 'Colaborador', 'Total de Ações', 'Produção', 'Separação', 'Expedição', 'Pedidos', 'Estoque/Produtos'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ranking.map((u, i) => (
                  <tr key={u.usuario} className={`border-t border-border ${i < 3 ? 'bg-sun-gold/5' : ''}`}>
                    <td className="px-3 py-2.5 font-bold">{medalha(i)}</td>
                    <td className="px-3 py-2.5 font-semibold text-foreground">{u.usuario}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-bold text-foreground">{u.total}</span>
                      <div className="h-1 rounded-full bg-muted mt-1 w-24 overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.round((u.total / ranking[0].total) * 100)}%` }} />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{u.producao}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{u.separacao}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{u.expedicao}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{u.pedidos}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{u.estoque}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Inatividade */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center gap-2">
          <Medal size={15} className="text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground">Maior Tempo de Inatividade</h3>
        </div>
        {inativos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Todos os usuários estiveram ativos nas últimas 24h. 👏</p>
        ) : (
          <div className="divide-y divide-border">
            {inativos.slice(0, 10).map(u => (
              <div key={u.id} className="flex items-center justify-between px-4 py-2.5 gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{u.full_name || u.email}</p>
                  <p className="text-[11px] text-muted-foreground">{u.role}</p>
                </div>
                <span className={`text-xs font-bold flex-shrink-0 ${u.diasInativo > 3 ? 'text-red-600' : 'text-amber-600'}`}>
                  {u.diasInativo === Infinity ? 'Nunca ativo' : `${Math.floor(u.diasInativo)} dia(s) inativo`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}