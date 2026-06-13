import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Clock, Package, MapPin, FileText, Truck, RefreshCw } from 'lucide-react';

function isInRange(dateStr, from, to) {
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (from && d < new Date(from)) return false;
  if (to) { const t = new Date(to); t.setHours(23, 59, 59); if (d > t) return false; }
  return true;
}

export default function DashboardAlertas({ rawData, loading, onCriarOP, criandoOP }) {
  const alertas = useMemo(() => {
    if (!rawData) return [];
    const { pedidos, ordens, produtos } = rawData;
    const hoje = new Date().toISOString().split('T')[0];
    const list = [];

    // Pedidos atrasados
    const atrasados = pedidos.filter(p =>
      !['cancelado', 'entregue', 'expedido'].includes(p.status) &&
      p.data_entrega_prevista && p.data_entrega_prevista < hoje
    );
    if (atrasados.length > 0) list.push({
      id: 'pedidos_atrasados', icon: Clock, color: 'text-red-600', bg: 'bg-red-50 border-red-200',
      titulo: `${atrasados.length} pedido(s) atrasados`, desc: atrasados.map(p => `#${p.numero} — ${p.cliente_nome}`).slice(0, 3).join(', ') + (atrasados.length > 3 ? '...' : ''),
      path: '/Pedidos', tipo: 'perigo',
    });

    // OPs atrasadas (em produção há muito tempo)
    const opsAtrasadas = ordens.filter(o =>
      ['a_produzir', 'em_producao'].includes(o.status) &&
      o.created_date && new Date(o.created_date) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    if (opsAtrasadas.length > 0) list.push({
      id: 'ops_atrasadas', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200',
      titulo: `${opsAtrasadas.length} OP(s) paradas há +7 dias`, desc: opsAtrasadas.map(o => o.numero).slice(0, 4).join(', ') + (opsAtrasadas.length > 4 ? '...' : ''),
      path: '/Kanban', tipo: 'aviso',
    });

    // Estoque crítico
    const estoqueCritico = produtos.filter(p => (p.estoque_atual || 0) <= (p.estoque_minimo || 0) && p.ativo !== false);
    if (estoqueCritico.length > 0) list.push({
      id: 'estoque_critico', icon: Package, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200',
      titulo: `${estoqueCritico.length} produto(s) com estoque crítico`,
      desc: estoqueCritico.slice(0, 3).map(p => `${p.nome} (${p.estoque_atual || 0})`).join(', '),
      path: '/Reposicoes', tipo: 'aviso', produtos: estoqueCritico,
    });

    // Pedidos sem destino definido
    const semDestino = pedidos.filter(p =>
      !['cancelado', 'entregue', 'expedido'].includes(p.status) && !p.destino_tipo
    );
    if (semDestino.length > 0) list.push({
      id: 'sem_destino', icon: MapPin, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200',
      titulo: `${semDestino.length} pedido(s) sem destino definido`,
      desc: semDestino.map(p => `#${p.numero}`).slice(0, 5).join(', '),
      path: '/Pedidos', tipo: 'info',
    });

    // Pedidos aguardando faturamento (separados)
    const aguardandoFat = pedidos.filter(p => p.status === 'separado');
    if (aguardandoFat.length > 0) list.push({
      id: 'aguardando_fat', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200',
      titulo: `${aguardandoFat.length} pedido(s) aguardando faturamento`,
      desc: aguardandoFat.map(p => `#${p.numero} — ${p.cliente_nome}`).slice(0, 3).join(', '),
      path: '/Expedicao', tipo: 'info',
    });

    return list;
  }, [rawData]);

  if (loading || alertas.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={15} className="text-amber-500" />
        <h3 className="text-sm font-bold text-foreground">Alertas Operacionais</h3>
        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{alertas.length}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {alertas.map(a => {
          const Icon = a.icon;
          return (
            <Link key={a.id} to={a.path}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all hover:shadow-sm ${a.bg}`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${a.bg}`}>
                <Icon size={13} className={a.color} />
              </div>
              <div className="min-w-0">
                <p className={`text-xs font-bold ${a.color}`}>{a.titulo}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{a.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}