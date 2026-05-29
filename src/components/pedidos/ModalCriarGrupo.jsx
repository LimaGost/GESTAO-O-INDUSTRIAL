import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Search, Check, Users, Package } from 'lucide-react';

const STATUS_LABELS = {
  rascunho: 'Rascunho', aguardando_estoque: 'Ag. Estoque',
  separacao: 'Separação', separado: 'Separado',
  expedido: 'Expedido', entregue: 'Entregue', cancelado: 'Cancelado',
};

export default function ModalCriarGrupo({ onClose, onCriado }) {
  const [step, setStep] = useState(1); // 1=cliente, 2=pedidos, 3=confirmar
  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [pedidosSelecionados, setPedidosSelecionados] = useState([]);
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    Promise.all([
      base44.entities.Pedido.list('-created_date', 200),
      base44.auth.me(),
    ]).then(([p, u]) => {
      setPedidos(p);
      setUser(u);
      // Extrai clientes únicos dos pedidos
      const mapa = {};
      p.forEach(ped => {
        if (ped.cliente_id && !mapa[ped.cliente_id]) {
          mapa[ped.cliente_id] = { id: ped.cliente_id, nome: ped.cliente_nome };
        }
      });
      setClientes(Object.values(mapa));
    });
  }, []);

  const clientesFiltrados = clientes.filter(c =>
    c.nome?.toLowerCase().includes(buscaCliente.toLowerCase())
  );

  const pedidosCliente = pedidos.filter(p =>
    p.cliente_id === clienteSelecionado?.id && p.status !== 'cancelado'
  );

  const togglePedido = (pedido) => {
    setPedidosSelecionados(prev =>
      prev.find(p => p.id === pedido.id)
        ? prev.filter(p => p.id !== pedido.id)
        : [...prev, pedido]
    );
  };

  const totalConsolidado = pedidosSelecionados.reduce((acc, p) => acc + (p.valor_total || 0), 0);

  const consolidarItens = () => {
    const mapa = {};
    pedidosSelecionados.forEach(ped => {
      (ped.itens || []).forEach(item => {
        const key = item.produto_id || item.produto_nome;
        if (!mapa[key]) mapa[key] = { ...item, quantidade: 0 };
        mapa[key].quantidade += (item.quantidade || 0);
      });
    });
    return Object.values(mapa);
  };

  const handleCriar = async () => {
    if (pedidosSelecionados.length < 2) return;
    setSalvando(true);
    const nome = `Grupo ${clienteSelecionado.nome} – ${pedidosSelecionados.map(p => p.numero || p.id.slice(-4)).join(', ')}`;
    const grupo = await base44.entities.GrupoPedido.create({
      nome,
      cliente_id: clienteSelecionado.id,
      cliente_nome: clienteSelecionado.nome,
      pedidos_ids: pedidosSelecionados.map(p => p.id),
      pedidos_numeros: pedidosSelecionados.map(p => p.numero || p.id.slice(-4)),
      total_consolidado: totalConsolidado,
      status: 'ativo',
      observacoes,
      criado_por: user?.full_name || user?.email || 'Sistema',
    });
    await base44.entities.LogAuditoria.create({
      entidade: 'GrupoPedido',
      entidade_id: grupo.id,
      acao: 'criacao',
      descricao: `Grupo criado: ${nome}`,
      usuario: user?.full_name || user?.email || 'Sistema',
    });
    setSalvando(false);
    onCriado(grupo);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <p className="font-bold text-foreground">Criar Agrupamento de Pedidos</p>
            <div className="flex items-center gap-2 mt-1">
              {[1,2,3].map(s => (
                <div key={s} className={`flex items-center gap-1.5 text-xs font-semibold ${step >= s ? 'text-primary' : 'text-muted-foreground'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{s}</span>
                  {s === 1 ? 'Cliente' : s === 2 ? 'Pedidos' : 'Confirmar'}
                  {s < 3 && <span className="text-muted-foreground/40 mx-0.5">›</span>}
                </div>
              ))}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-lg">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {/* Step 1: Selecionar cliente */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Selecione o cliente para agrupar pedidos:</p>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={buscaCliente}
                  onChange={e => setBuscaCliente(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="w-full border border-border rounded-xl pl-9 pr-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {clientesFiltrados.map(c => {
                  const qtdPedidos = pedidos.filter(p => p.cliente_id === c.id && p.status !== 'cancelado').length;
                  return (
                    <button key={c.id} onClick={() => setClienteSelecionado(c)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
                        clienteSelecionado?.id === c.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:bg-muted'
                      }`}>
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-muted-foreground" />
                        <span className="text-sm font-semibold text-foreground">{c.nome}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{qtdPedidos} pedido(s)</span>
                    </button>
                  );
                })}
                {clientesFiltrados.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">Nenhum cliente encontrado.</p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Selecionar pedidos */}
          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Selecione <strong>2 ou mais</strong> pedidos de <strong>{clienteSelecionado?.nome}</strong>:
              </p>
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {pedidosCliente.map(ped => {
                  const selecionado = !!pedidosSelecionados.find(p => p.id === ped.id);
                  return (
                    <button key={ped.id} onClick={() => togglePedido(ped)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                        selecionado ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted'
                      }`}>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${selecionado ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                        {selecionado && <Check size={11} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">#{ped.numero || ped.id.slice(-6)}</span>
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{STATUS_LABELS[ped.status] || ped.status}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{(ped.itens || []).length} iten(s) · {(ped.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      </div>
                    </button>
                  );
                })}
                {pedidosCliente.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-6">Nenhum pedido ativo encontrado para este cliente.</p>
                )}
              </div>
              {pedidosSelecionados.length > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 text-sm">
                  <span className="font-semibold text-primary">{pedidosSelecionados.length} pedido(s) selecionado(s)</span>
                  <span className="text-muted-foreground"> · Total: {totalConsolidado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Confirmar */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</p>
                <p className="font-bold text-foreground">{clienteSelecionado?.nome}</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pedidos Agrupados</p>
                {pedidosSelecionados.map(p => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="font-semibold">#{p.numero || p.id.slice(-6)}</span>
                    <span className="text-muted-foreground">{(p.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between text-sm font-bold text-foreground">
                  <span>Total Consolidado</span>
                  <span className="text-primary">{totalConsolidado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Itens Consolidados</p>
                {consolidarItens().map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-foreground truncate flex-1">{item.produto_nome}</span>
                    <span className="text-muted-foreground ml-2 flex-shrink-0">{item.quantidade} un</span>
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Observações (opcional)</label>
                <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)}
                  rows={2} placeholder="Ex: Entregar junto, mesmo veículo..."
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
              <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                ⚠️ Os pedidos originais <strong>não serão alterados</strong>. Este agrupamento é apenas operacional.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border flex gap-3 flex-shrink-0">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
              Voltar
            </button>
          )}
          <button onClick={onClose}
            className="px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
            Cancelar
          </button>
          <div className="flex-1" />
          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 ? !clienteSelecionado : pedidosSelecionados.length < 2}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
              {step === 1 ? 'Selecionar Pedidos →' : 'Revisar →'}
            </button>
          ) : (
            <button onClick={handleCriar} disabled={salvando}
              className="flex-1 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
              {salvando ? 'Criando...' : '✓ Criar Agrupamento'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}