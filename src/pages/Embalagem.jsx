import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { registrarLog } from '@/lib/audit';
import { gerarLote } from '@/lib/numeracao';
import { agoraISO, hojeData } from '@/lib/brasilia';
import { Package, CheckCircle, Eye } from 'lucide-react';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

export default function Embalagem() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Embalagem');
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const all = await base44.entities.OrdemProducao.list('-created_date');
    setOrdens(all.filter(o => o.status === 'em_embalagem' || o.status === 'produzido'));
  };

  useEffect(() => { load(); }, []);

  const enviarParaEmbalagem = async (ordem) => {
    if (ordem.status !== 'produzido') return;
    setLoading(true);
    await base44.entities.OrdemProducao.update(ordem.id, { status: 'em_embalagem', data_embalagem: agoraISO() });
    await registrarLog('OrdemProducao', ordem.id, 'EMBALAGEM_INICIO', `OP ${ordem.numero} entrou em embalagem`);
    await load(); setLoading(false);
  };

  const confirmarEmbalagem = async (ordem) => {
    if (ordem.status !== 'em_embalagem') return;
    setLoading(true);
    const agora = agoraISO();
    const lote = ordem.lote || gerarLote(ordem.produto_id);

    await base44.entities.OrdemProducao.update(ordem.id, { status: 'finalizado', data_finalizacao: agora, lote });

    const todosProdutos = await base44.entities.Produto.list();
    const itensOP = (ordem.itens && ordem.itens.length > 0)
      ? ordem.itens
      : (ordem.produto_id ? [{ produto_id: ordem.produto_id, produto_nome: ordem.produto_nome, quantidade: ordem.quantidade }] : []);

    const dataProducao = hojeData();
    for (const item of itensOP) {
      const prod = todosProdutos.find(p => p.id === item.produto_id);
      await base44.entities.Etiqueta.create({
        ordem_producao_id: ordem.id, produto_id: item.produto_id,
        produto_nome: item.produto_nome, quantidade: item.quantidade,
        lote, data_producao: dataProducao,
        codigo_barras: prod?.codigo || item.produto_id, impresso: false,
      });
      if (prod) {
        const novoEstoque = (prod.estoque_atual || 0) + item.quantidade;
        await base44.entities.Produto.update(prod.id, { estoque_atual: novoEstoque });
      }
    }

    if (ordem.pedido_id) {
      const todos = await base44.entities.OrdemProducao.list();
      const ordens_pedido = todos.filter(o => o.pedido_id === ordem.pedido_id);
      const todasFin = ordens_pedido.every(o => o.id === ordem.id ? true : o.status === 'finalizado');
      if (todasFin) {
        const pedidos = await base44.entities.Pedido.list();
        const ped = pedidos.find(p => p.id === ordem.pedido_id);
        if (ped && ped.status === 'aguardando_estoque') {
          await base44.entities.Pedido.update(ped.id, { status: 'separacao' });
        }
      }
    }

    await registrarLog('OrdemProducao', ordem.id, 'EMBALAGEM_CONCLUIDA', `Embalagem concluída — OP ${ordem.numero}`);
    await load(); setLoading(false);
  };

  const emEmbalagem = ordens.filter(o => o.status === 'em_embalagem').length;
  const produzidos = ordens.filter(o => o.status === 'produzido').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
            <Package size={19} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Embalagem</h2>
            <p className="text-xs text-muted-foreground">{emEmbalagem} em embalagem · {produzidos} aguardando</p>
          </div>
        </div>
        {readonly && <span className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-2 rounded-xl"><Eye size={13} /> Somente visualização</span>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{emEmbalagem}</p>
          <p className="text-sm text-amber-700 font-medium mt-1">Em embalagem</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{produzidos}</p>
          <p className="text-sm text-blue-700 font-medium mt-1">Produzidos</p>
        </div>
      </div>

      {ordens.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-sm font-medium">Nenhum item aguardando embalagem.</p>
          <p className="text-xs mt-1">Os itens aparecem aqui quando chegam ao estágio de embalagem no Kanban.</p>
        </div>
      )}

      <div className="space-y-4">
        {ordens.map(ordem => (
          <div key={ordem.id} className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-all">
            <div className={`h-1 ${ordem.status === 'em_embalagem' ? 'bg-amber-400' : 'bg-blue-400'}`} />
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-foreground">
                    {ordem.pedido_numero ? `Pedido ${ordem.pedido_numero}` : ordem.produto_nome}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{ordem.numero}</p>
                  <span className={`inline-block mt-1.5 text-xs px-2.5 py-0.5 rounded-full font-semibold ${ordem.status === 'em_embalagem' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {ordem.status === 'em_embalagem' ? 'Em Embalagem' : 'Produzido'}
                  </span>
                </div>
              </div>

              {ordem.itens && ordem.itens.length > 0 ? (
                <div className="space-y-1.5 mb-4">
                  <p className="text-xs font-semibold text-muted-foreground">Itens:</p>
                  {ordem.itens.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-muted/30 rounded-lg px-3 py-1.5 text-sm">
                      <span className="text-foreground">{item.produto_nome}</span>
                      <span className="font-semibold text-foreground">{item.quantidade} un</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-between text-sm bg-muted/30 rounded-lg px-3 py-1.5 mb-4">
                  <span className="text-muted-foreground">Quantidade</span>
                  <span className="font-semibold text-foreground">{ordem.quantidade} un</span>
                </div>
              )}
              {ordem.lote && <p className="text-xs text-muted-foreground mb-3">Lote: <strong>{ordem.lote}</strong></p>}

              {!readonly && ordem.status === 'produzido' && (
                <button onClick={() => enviarParaEmbalagem(ordem)} disabled={loading}
                  className="w-full bg-blue-100 text-blue-700 border border-blue-300 hover:bg-blue-200 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
                  Iniciar Embalagem
                </button>
              )}
              {!readonly && ordem.status === 'em_embalagem' && (
                <button onClick={() => confirmarEmbalagem(ordem)} disabled={loading}
                  className="w-full bg-amber-100 text-amber-700 border border-amber-300 hover:bg-amber-200 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  <CheckCircle size={15} /> Confirmar Embalagem
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}