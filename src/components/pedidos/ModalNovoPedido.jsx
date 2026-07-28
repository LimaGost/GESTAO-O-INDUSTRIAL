import { useState, useMemo } from 'react';
import { X, CheckCircle, ChevronRight, ChevronLeft, User, Package, FileText, Search, Tag, UserPlus, CreditCard } from 'lucide-react';
import SeletorProdutos from './SeletorProdutos';
import PagamentoPedido, { getPagamentoLabel, getStatusPagamentoLabel } from './PagamentoPedido';
import NovoClienteRapido from './NovoClienteRapido';
import SelecaoItensSemRotulo from './SelecaoItensSemRotulo';
import { DestinoForm, getDestinoLabel } from './DestinoPedido';

const STEPS = [
  { id: 1, label: 'Cliente', icon: User },
  { id: 2, label: 'Produtos', icon: Package },
  { id: 3, label: 'Detalhes', icon: FileText },
  { id: 4, label: 'Pagamento', icon: CreditCard },
];

export default function ModalNovoPedido({ clientes, produtos, loading, onConfirmar, onClose }) {
  const [step, setStep] = useState(1);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [novosClientes, setNovosClientes] = useState([]);
  const [showNovoCliente, setShowNovoCliente] = useState(false);
  const [form, setForm] = useState({
    cliente_id: '',
    cliente_nome: '',
    data_pedido: new Date().toISOString().split('T')[0],
    data_entrega_prevista: '',
    observacoes: '',
    itens: [],
    white_label: false,
    white_label_marca: '',
    sem_rotulo: false,
    forma_pagamento: '',
    status_pagamento: 'pendente',
    observacoes_pagamento: '',
    destino_tipo: '',
    destino_unidade: '',
    destino_transportadora: '',
    destino_endereco: '',
  });

  const totalPedido = form.itens.reduce((s, i) => s + (i.total || 0), 0);

  const clientesFiltrados = useMemo(() => {
    const todos = [...novosClientes, ...clientes];
    if (!buscaCliente.trim()) return todos;
    const b = buscaCliente.toLowerCase();
    return todos.filter(c =>
      (c.nome || '').toLowerCase().includes(b) ||
      (c.email || '').toLowerCase().includes(b) ||
      (c.cnpj_cpf || '').toLowerCase().includes(b)
    );
  }, [clientes, novosClientes, buscaCliente]);

  const canNext = () => {
    if (step === 1) return !!form.cliente_nome;
    if (step === 2) return form.itens.length > 0;
    return true;
  };

  const handleConfirmar = () => {
    if (!form.cliente_nome || form.itens.length === 0 || !form.forma_pagamento) return;
    onConfirmar(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">Novo Pedido</h2>
            {form.cliente_nome && <p className="text-xs text-muted-foreground mt-0.5">{form.cliente_nome}</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="px-6 pt-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            {STEPS.map((s, i) => {
              const done = step > s.id;
              const active = step === s.id;
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-center gap-2 flex-1">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    active ? 'bg-primary text-primary-foreground shadow-sm' :
                    done ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                  }`}>
                    <Icon size={12} />
                    {s.label}
                    {done && <CheckCircle size={10} />}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 rounded-full transition-colors ${done ? 'bg-green-300' : 'bg-border'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* Step 1: Cliente */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">Selecione o cliente *</label>
                {/* Busca */}
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={buscaCliente}
                    onChange={e => setBuscaCliente(e.target.value)}
                    placeholder="Buscar por nome, e-mail ou CNPJ/CPF..."
                    className="w-full border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                  />
                </div>
                {showNovoCliente ? (
                  <NovoClienteRapido
                    nomeInicial={buscaCliente}
                    onCancelar={() => setShowNovoCliente(false)}
                    onCriado={(novo) => {
                      setNovosClientes(prev => [novo, ...prev]);
                      setForm(f => ({ ...f, cliente_id: novo.id, cliente_nome: novo.nome }));
                      setShowNovoCliente(false);
                      setBuscaCliente('');
                    }}
                  />
                ) : (
                <>
                <button onClick={() => setShowNovoCliente(true)}
                  className="w-full mb-2 flex items-center justify-center gap-1.5 border border-dashed border-primary/40 text-primary py-2 rounded-xl text-xs font-semibold hover:bg-primary/5 transition-colors">
                  <UserPlus size={13} /> Cadastrar novo cliente
                </button>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {clientesFiltrados.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <User size={28} className="mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Nenhum cliente encontrado</p>
                    </div>
                  ) : clientesFiltrados.map(c => (
                    <div key={c.id}
                      onClick={() => { setForm(f => ({ ...f, cliente_id: c.id, cliente_nome: c.nome })); setBuscaCliente(''); }}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        form.cliente_id === c.id
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border hover:bg-muted/30'
                      }`}>
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary flex-shrink-0">
                        {(c.nome || 'C').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.nome}</p>
                        {c.email && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                        {c.cnpj_cpf && <p className="text-xs text-muted-foreground truncate">{c.cnpj_cpf}</p>}
                      </div>
                      {form.cliente_id === c.id && (
                        <CheckCircle size={16} className="text-primary flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
                </>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Data do Pedido *</label>
                <input type="date" value={form.data_pedido}
                  onChange={e => setForm(f => ({ ...f, data_pedido: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
          )}

          {/* Step 2: Produtos */}
          {step === 2 && (
            <SeletorProdutos
              produtos={produtos}
              itens={form.itens}
              onChange={itens => setForm(f => ({ ...f, itens }))}
            />
          )}

          {/* Step 3: Detalhes */}
          {step === 3 && (
            <div className="space-y-4">
              {/* Destino do Pedido */}
              <DestinoForm
                value={form}
                onChange={dest => setForm(f => ({ ...f, ...dest }))}
              />

              {/* White Label */}
              <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                <div onClick={() => setForm(f => ({ ...f, white_label: !f.white_label, white_label_marca: !f.white_label ? f.white_label_marca : '' }))}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0 ${form.white_label ? 'bg-purple-500' : 'bg-border'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.white_label ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Tag size={12} className="text-purple-600" /> Pedido White Label
                  </p>
                  <p className="text-xs text-muted-foreground">Produto fabricado para outra marca</p>
                </div>
                {form.white_label && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">WL</span>}
              </label>
              {form.white_label && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Marca / Cliente para quem está fabricando</label>
                  <input value={form.white_label_marca}
                    onChange={e => setForm(f => ({ ...f, white_label_marca: e.target.value }))}
                    placeholder="Ex: Marca XYZ"
                    className="w-full border border-purple-300 rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-400" />
                </div>
              )}
              {/* Sem Rótulo */}
              <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
                <div onClick={() => setForm(f => ({
                    ...f,
                    sem_rotulo: !f.sem_rotulo,
                    itens: f.itens.map(i => ({ ...i, sem_rotulo: !f.sem_rotulo })),
                  }))}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0 ${form.sem_rotulo ? 'bg-teal-500' : 'bg-border'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.sem_rotulo ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Tag size={12} className="text-teal-600" /> Pedido Sem Rótulo
                  </p>
                  <p className="text-xs text-muted-foreground">Produtos entregues sem rotulagem</p>
                </div>
                {form.sem_rotulo && <span className="text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold">SR</span>}
              </label>
              {form.sem_rotulo && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Quais itens vão sem rótulo?</p>
                  <SelecaoItensSemRotulo
                    itens={form.itens}
                    onChange={itens => setForm(f => ({ ...f, itens }))}
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Entrega Prevista</label>
                <input type="date" value={form.data_entrega_prevista}
                  onChange={e => setForm(f => ({ ...f, data_entrega_prevista: e.target.value }))}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Observações</label>
                <textarea value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={3} placeholder="Observações adicionais..."
                  className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>

            </div>
          )}

          {/* Step 4: Pagamento */}
          {step === 4 && (
            <div className="space-y-5">
              <PagamentoPedido value={form} onChange={pag => setForm(f => ({ ...f, ...pag }))} />

              {/* Resumo final */}
              <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-2">
                <p className="text-sm font-bold text-foreground mb-3">Resumo do Pedido</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium text-foreground">{form.cliente_nome}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Itens</span>
                  <span className="font-medium text-foreground">{form.itens.length} produto(s)</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Pagamento</span>
                  <span className="font-medium text-foreground">
                    {form.forma_pagamento ? getPagamentoLabel(form.forma_pagamento) : 'Não informado'} · {getStatusPagamentoLabel(form.status_pagamento)}
                  </span>
                </div>
                <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-primary text-base">R$ {totalPedido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3 flex-shrink-0">
          <button onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
            className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
            {step > 1 ? <><ChevronLeft size={15} /> Voltar</> : 'Cancelar'}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Etapa {step} de {STEPS.length}</span>
            {step < STEPS.length ? (
              <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity">
                Próximo <ChevronRight size={15} />
              </button>
            ) : (
              <button onClick={handleConfirmar} disabled={loading || !form.cliente_nome || form.itens.length === 0 || !form.forma_pagamento}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity">
                <CheckCircle size={15} />
                {loading ? 'Processando...' : 'Confirmar Pedido'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}