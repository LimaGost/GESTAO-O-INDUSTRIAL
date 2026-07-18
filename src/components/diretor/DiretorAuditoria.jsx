import { useMemo, useState } from 'react';
import { Search, Download, X } from 'lucide-react';

const ENTIDADE_LABEL = {
  Pedido: '🛒 Pedido', OrdemProducao: '🏭 Ordem de Produção', Separacao: '📋 Separação',
  SeparacaoGalpao: '🏪 Separação Galpão', Expedicao: '🚛 Expedição', Produto: '📦 Produto/Estoque',
  Cliente: '👤 Cliente', Descarte: '🗑 Descarte', GrupoPedidos: '🧩 Grupo de Pedidos',
};

function exportarCSV(logs) {
  const bom = '\uFEFF';
  const header = 'Data;Hora;Usuário;Área;Ação;Descrição';
  const linhas = logs.map(l => {
    const d = new Date(l.created_date);
    return [
      d.toLocaleDateString('pt-BR'), d.toLocaleTimeString('pt-BR'),
      l.usuario || '—', l.entidade || '—', l.acao || '—',
      (l.descricao || '').replace(/;/g, ','),
    ].join(';');
  }).join('\n');
  const blob = new Blob([bom + header + '\n' + linhas], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function DiretorAuditoria({ logs }) {
  const [busca, setBusca] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('todos');
  const [filtroEntidade, setFiltroEntidade] = useState('todas');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [limite, setLimite] = useState(100);

  const usuarios = useMemo(() => [...new Set(logs.map(l => l.usuario).filter(Boolean))].sort(), [logs]);
  const entidades = useMemo(() => [...new Set(logs.map(l => l.entidade).filter(Boolean))].sort(), [logs]);

  const filtrados = useMemo(() => {
    return logs.filter(l => {
      if (filtroUsuario !== 'todos' && l.usuario !== filtroUsuario) return false;
      if (filtroEntidade !== 'todas' && l.entidade !== filtroEntidade) return false;
      const dt = l.created_date?.split('T')[0];
      if (dataInicio && dt < dataInicio) return false;
      if (dataFim && dt > dataFim) return false;
      if (busca) {
        const b = busca.toLowerCase();
        return (l.descricao || '').toLowerCase().includes(b) || (l.acao || '').toLowerCase().includes(b) || (l.usuario || '').toLowerCase().includes(b);
      }
      return true;
    });
  }, [logs, busca, filtroUsuario, filtroEntidade, dataInicio, dataFim]);

  return (
    <div className="space-y-3">
      {/* Filtros */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-44">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar na descrição, ação ou usuário..."
              className="field-input pl-8 pr-8" />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                <X size={13} />
              </button>
            )}
          </div>
          <select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)} className="field-input w-auto">
            <option value="todos">Todos os usuários</option>
            {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={filtroEntidade} onChange={e => setFiltroEntidade(e.target.value)} className="field-input w-auto">
            <option value="todas">Todas as áreas</option>
            {entidades.map(e => <option key={e} value={e}>{ENTIDADE_LABEL[e] || e}</option>)}
          </select>
          <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="field-input w-auto" title="De" />
          <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="field-input w-auto" title="Até" />
          <button onClick={() => exportarCSV(filtrados)}
            className="flex items-center gap-1.5 border border-border bg-card px-3.5 py-2 rounded-lg text-xs font-semibold text-foreground hover:bg-muted transition-colors">
            <Download size={13} className="text-green-600" /> Exportar CSV
          </button>
        </div>
        <p className="text-xs text-muted-foreground">{filtrados.length} registro(s) encontrado(s)</p>
      </div>

      {/* Tabela */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {['Data/Hora', 'Usuário', 'Área', 'Ação', 'Descrição'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.slice(0, limite).map(l => (
                <tr key={l.id} className="border-t border-border hover:bg-muted/20">
                  <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(l.created_date).toLocaleDateString('pt-BR')} {new Date(l.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-3 py-2 text-xs font-semibold text-foreground whitespace-nowrap">{l.usuario || '—'}</td>
                  <td className="px-3 py-2 text-xs whitespace-nowrap">{ENTIDADE_LABEL[l.entidade] || l.entidade}</td>
                  <td className="px-3 py-2">
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full font-bold text-foreground whitespace-nowrap">{l.acao}</span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{l.descricao}</td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">Nenhum registro encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {filtrados.length > limite && (
          <button onClick={() => setLimite(l => l + 100)}
            className="w-full py-3 text-xs font-semibold text-primary hover:bg-muted/40 transition-colors border-t border-border">
            Carregar mais ({filtrados.length - limite} restantes)
          </button>
        )}
      </div>
    </div>
  );
}