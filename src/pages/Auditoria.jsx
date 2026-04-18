import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Shield, Search, ChevronDown, ChevronUp, RefreshCw, User, Tag, Activity } from 'lucide-react';

const ENTIDADES = [
  'Todas', 'Pedido', 'OrdemProducao', 'Produto', 'Estoque', 'Expedicao', 'Cliente', 'Etiqueta'
];

const ACOES_LABEL = {
  CRIACAO: 'Criação',
  CRIACAO_MANUAL: 'Criação Manual',
  CRIACAO_REPOSICAO: 'Criação Reposição',
  STATUS: 'Mudança de Status',
  AVANCO_STATUS: 'Avanço de Status',
  ENTRADA_ESTOQUE: 'Entrada Estoque',
  SAIDA_ESTOQUE: 'Saída Estoque',
  AJUSTE_ESTOQUE: 'Ajuste de Estoque',
  EMBALAGEM_INICIO: 'Início Embalagem',
  EMBALAGEM_CONCLUIDA: 'Embalagem Concluída',
  EXPEDICAO_CRIADA: 'Expedição Criada',
  EXPEDICAO_STATUS: 'Status Expedição',
  CANCELAMENTO: 'Cancelamento',
};

const ACAO_COR = {
  CRIACAO: 'bg-rainbow-green/10 text-rainbow-green',
  CRIACAO_MANUAL: 'bg-rainbow-green/10 text-rainbow-green',
  CRIACAO_REPOSICAO: 'bg-rainbow-green/10 text-rainbow-green',
  STATUS: 'bg-sky-blue/10 text-sky-blue',
  AVANCO_STATUS: 'bg-sky-blue/10 text-sky-blue',
  ENTRADA_ESTOQUE: 'bg-rainbow-green/10 text-rainbow-green',
  SAIDA_ESTOQUE: 'bg-rainbow-red/10 text-rainbow-red',
  AJUSTE_ESTOQUE: 'bg-rainbow-orange/10 text-rainbow-orange',
  EMBALAGEM_INICIO: 'bg-sun-yellow/10 text-sun-yellow',
  EMBALAGEM_CONCLUIDA: 'bg-sun-yellow/10 text-sun-yellow',
  EXPEDICAO_CRIADA: 'bg-rainbow-purple/10 text-rainbow-purple',
  EXPEDICAO_STATUS: 'bg-rainbow-purple/10 text-rainbow-purple',
  CANCELAMENTO: 'bg-rainbow-red/10 text-rainbow-red',
};

const ENTIDADE_COR = {
  Pedido: 'bg-sky-blue/10 text-sky-blue',
  OrdemProducao: 'bg-sun-yellow/10 text-sun-yellow',
  Produto: 'bg-rainbow-green/10 text-rainbow-green',
  Expedicao: 'bg-rainbow-purple/10 text-rainbow-purple',
  Cliente: 'bg-rainbow-orange/10 text-rainbow-orange',
  Etiqueta: 'bg-muted text-muted-foreground',
};

export default function Auditoria() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroEntidade, setFiltroEntidade] = useState('Todas');
  const [filtroAcao, setFiltroAcao] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [expandido, setExpandido] = useState({});

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.LogAuditoria.list('-created_date', 200);
    setLogs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const usuarios = [...new Set(logs.map(l => l.usuario).filter(Boolean))];
  const acoes    = [...new Set(logs.map(l => l.acao).filter(Boolean))];

  const logsFiltrados = logs.filter(l => {
    const matchEntidade = filtroEntidade === 'Todas' || l.entidade === filtroEntidade;
    const matchAcao     = !filtroAcao    || l.acao === filtroAcao;
    const matchUsuario  = !filtroUsuario || l.usuario === filtroUsuario;
    const matchBusca    = !busca || (l.descricao || '').toLowerCase().includes(busca.toLowerCase()) || (l.entidade_id || '').toLowerCase().includes(busca.toLowerCase());
    return matchEntidade && matchAcao && matchUsuario && matchBusca;
  });

  const toggleExpandido = (id) => setExpandido(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rainbow-purple/10 flex items-center justify-center">
            <Shield size={18} className="text-rainbow-purple" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Auditoria do Sistema</h2>
            <p className="text-xs text-muted-foreground">{logsFiltrados.length} registro(s) encontrado(s)</p>
          </div>
        </div>
        <button onClick={load} className="p-2 border border-border rounded-xl hover:bg-muted transition-colors" title="Atualizar">
          <RefreshCw size={15} className={`text-muted-foreground ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2.5">
          <Search size={14} className="text-muted-foreground flex-shrink-0" />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por descrição ou ID..."
            className="bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground w-full"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1 block"><Tag size={11} /> Entidade</label>
            <select value={filtroEntidade} onChange={e => setFiltroEntidade(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              {ENTIDADES.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1 block"><Activity size={11} /> Ação</label>
            <select value={filtroAcao} onChange={e => setFiltroAcao(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Todas as ações</option>
              {acoes.map(a => <option key={a} value={a}>{ACOES_LABEL[a] || a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1 block"><User size={11} /> Usuário</label>
            <select value={filtroUsuario} onChange={e => setFiltroUsuario(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary">
              <option value="">Todos os usuários</option>
              {usuarios.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de logs */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}
        </div>
      ) : logsFiltrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Shield size={48} className="mx-auto mb-4 opacity-20" />
          <p className="text-sm">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logsFiltrados.map(log => {
            const aberto = expandido[log.id];
            const temDetalhes = log.dados_anteriores || log.dados_novos;
            return (
              <div key={log.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-sm transition-all">
                <div className="px-4 py-3 flex items-start gap-3">
                  <div className="flex-shrink-0 text-center min-w-[56px]">
                    <p className="text-xs font-mono text-muted-foreground leading-tight">
                      {log.created_date ? new Date(log.created_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—'}
                    </p>
                    <p className="text-xs font-mono text-muted-foreground leading-tight">
                      {log.created_date ? new Date(log.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENTIDADE_COR[log.entidade] || 'bg-muted text-muted-foreground'}`}>
                        {log.entidade}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACAO_COR[log.acao] || 'bg-muted text-muted-foreground'}`}>
                        {ACOES_LABEL[log.acao] || log.acao}
                      </span>
                      {log.usuario && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User size={10} /> {log.usuario}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-foreground leading-snug">{log.descricao}</p>
                    {log.entidade_id && <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {log.entidade_id}</p>}
                  </div>
                  {temDetalhes && (
                    <button onClick={() => toggleExpandido(log.id)}
                      className="flex-shrink-0 p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                      {aberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  )}
                </div>
                {aberto && temDetalhes && (
                  <div className="border-t border-border px-4 py-3 bg-muted/30 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {log.dados_anteriores && (
                      <div>
                        <p className="text-xs font-semibold text-rainbow-red mb-1">Antes:</p>
                        <pre className="text-xs text-muted-foreground bg-card rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                          {(() => { try { return JSON.stringify(JSON.parse(log.dados_anteriores), null, 2); } catch { return log.dados_anteriores; } })()}
                        </pre>
                      </div>
                    )}
                    {log.dados_novos && (
                      <div>
                        <p className="text-xs font-semibold text-rainbow-green mb-1">Depois:</p>
                        <pre className="text-xs text-muted-foreground bg-card rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                          {(() => { try { return JSON.stringify(JSON.parse(log.dados_novos), null, 2); } catch { return log.dados_novos; } })()}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}