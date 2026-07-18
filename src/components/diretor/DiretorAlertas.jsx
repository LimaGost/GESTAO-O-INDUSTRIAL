import { AlertTriangle, Clock, Package, UserX, Layers } from 'lucide-react';

const PARADO_MS = 48 * 60 * 60 * 1000; // 48h sem movimento
const INATIVO_MS = 3 * 24 * 60 * 60 * 1000; // 3 dias sem atividade

export default function DiretorAlertas({ pedidos, ops, separacoes, expedicoes, produtos, usuarios }) {
  const hoje = new Date().toISOString().split('T')[0];
  const agora = Date.now();

  const pedidosAtrasados = pedidos.filter(p =>
    p.status !== 'cancelado' && p.status !== 'entregue' &&
    p.data_entrega_prevista && p.data_entrega_prevista < hoje);

  const parado = (lista) => lista.filter(x => agora - new Date(x.updated_date).getTime() > PARADO_MS);
  const opsParadas = parado(ops.filter(o => !['finalizado', 'producao_finalizada', 'a_produzir'].includes(o.status)));
  const sepsParadas = parado(separacoes.filter(s => !['liberado_expedicao', 'aguardando_separacao'].includes(s.status)));
  const expsParadas = parado(expedicoes.filter(e => e.status !== 'entregue'));

  const estoqueCritico = produtos.filter(p =>
    p.controla_estoque !== false && p.ativo !== false && (p.estoque_atual || 0) <= (p.estoque_minimo || 0));

  const usuariosInativos = usuarios.filter(u =>
    !u.ultima_atividade || agora - new Date(u.ultima_atividade).getTime() > INATIVO_MS);

  const pedidosAcumulados = pedidos.filter(p => ['rascunho', 'aguardando_estoque', 'separacao'].includes(p.status));

  const alertas = [
    { cond: pedidosAtrasados.length > 0, icon: Clock, cor: 'red', titulo: `${pedidosAtrasados.length} pedido(s) atrasado(s)`, desc: pedidosAtrasados.slice(0, 3).map(p => `#${p.numero} (${p.cliente_nome})`).join(', ') + (pedidosAtrasados.length > 3 ? '…' : '') },
    { cond: opsParadas.length > 0, icon: AlertTriangle, cor: 'orange', titulo: `${opsParadas.length} OP(s) sem movimento há mais de 48h`, desc: opsParadas.slice(0, 3).map(o => o.numero || o.produto_nome).join(', ') + (opsParadas.length > 3 ? '…' : '') },
    { cond: sepsParadas.length > 0, icon: AlertTriangle, cor: 'orange', titulo: `${sepsParadas.length} separação(ões) parada(s) há mais de 48h`, desc: sepsParadas.slice(0, 3).map(s => s.numero).join(', ') + (sepsParadas.length > 3 ? '…' : '') },
    { cond: expsParadas.length > 0, icon: AlertTriangle, cor: 'orange', titulo: `${expsParadas.length} expedição(ões) parada(s) há mais de 48h`, desc: expsParadas.slice(0, 3).map(e => `NF ${e.numero_nf}`).join(', ') + (expsParadas.length > 3 ? '…' : '') },
    { cond: estoqueCritico.length > 0, icon: Package, cor: 'red', titulo: `${estoqueCritico.length} produto(s) com estoque crítico`, desc: estoqueCritico.slice(0, 3).map(p => p.nome).join(', ') + (estoqueCritico.length > 3 ? '…' : '') },
    { cond: usuariosInativos.length > 0, icon: UserX, cor: 'slate', titulo: `${usuariosInativos.length} usuário(s) sem atividade há mais de 3 dias`, desc: usuariosInativos.slice(0, 3).map(u => u.full_name || u.email).join(', ') + (usuariosInativos.length > 3 ? '…' : '') },
    { cond: pedidosAcumulados.length >= 15, icon: Layers, cor: 'orange', titulo: `Volume alto: ${pedidosAcumulados.length} pedidos acumulados antes da expedição`, desc: 'Avalie a capacidade de produção e separação' },
  ].filter(a => a.cond);

  const CORES = {
    red: 'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-amber-50 border-amber-200 text-amber-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-600',
  };

  if (alertas.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-2">
        <span className="text-lg">✅</span>
        <p className="text-sm font-semibold text-green-700">Nenhum alerta no momento — operação saudável.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">🚨 Alertas Inteligentes ({alertas.length})</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {alertas.map((a, i) => {
          const Icon = a.icon;
          return (
            <div key={i} className={`border rounded-xl px-3.5 py-2.5 flex items-start gap-2.5 ${CORES[a.cor]}`}>
              <Icon size={15} className="mt-0.5 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold">{a.titulo}</p>
                {a.desc && <p className="text-[11px] opacity-80 truncate">{a.desc}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}