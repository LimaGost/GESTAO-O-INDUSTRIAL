import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Clock } from 'lucide-react';

export default function Auditoria() {
  const [logs, setLogs] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.LogAuditoria.list('-created_date', 100).then(l => {
      setLogs(l);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtrados = logs.filter(l =>
    !busca || (l.entidade || '').toLowerCase().includes(busca.toLowerCase()) ||
    (l.acao || '').toLowerCase().includes(busca.toLowerCase()) ||
    (l.descricao || '').toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Clock size={19} className="text-slate-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Auditoria</h2>
          <p className="text-xs text-muted-foreground">{logs.length} registro(s)</p>
        </div>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar nos logs..."
          className="w-full border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      <div className="space-y-2">
        {loading ? <div className="text-center py-12 text-muted-foreground">Carregando...</div>
          : filtrados.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-sm">Nenhum log encontrado.</p>
          </div>
        ) : filtrados.map(l => (
          <div key={l.id} className="bg-card border border-border rounded-xl p-3 flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-foreground">{l.entidade}</span>
                <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{l.acao}</span>
                <span className="text-xs text-muted-foreground ml-auto">{l.usuario || 'sistema'}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{l.descricao}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{new Date(l.created_date).toLocaleString('pt-BR')}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}