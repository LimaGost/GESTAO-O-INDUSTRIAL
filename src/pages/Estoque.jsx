import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Archive, Plus, Search, AlertTriangle, Package } from 'lucide-react';
import { usePermissoes } from '@/lib/usePermissoes.jsx';

export default function Estoque() {
  const { somenteLeitura } = usePermissoes();
  const readonly = somenteLeitura('Estoque');
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Produto.list().then(p => { setProdutos(p); setLoading(false); });
  }, []);

  const filtrados = produtos.filter(p =>
    !busca || (p.nome || '').toLowerCase().includes(busca.toLowerCase())
  );

  const alertas = produtos.filter(p => (p.estoque_atual || 0) <= (p.estoque_minimo || 0));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center">
            <Archive size={19} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Estoque</h2>
            <p className="text-xs text-muted-foreground">{produtos.length} produto(s) · {alertas.length} alerta(s)</p>
          </div>
        </div>
      </div>

      {alertas.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-700 font-medium">{alertas.length} produto(s) abaixo do estoque mínimo</p>
        </div>
      )}

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar produto..."
          className="w-full border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      <div className="grid gap-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : filtrados.map(p => {
          const alerta = (p.estoque_atual || 0) <= (p.estoque_minimo || 0);
          return (
            <div key={p.id} className={`bg-card border rounded-2xl p-4 flex items-center justify-between ${alerta ? 'border-amber-300' : 'border-border'}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
                  <Package size={16} className="text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">{p.nome}</p>
                  <p className="text-xs text-muted-foreground">{p.categoria || 'Sem categoria'} · Mín: {p.estoque_minimo || 0}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${alerta ? 'text-amber-600' : 'text-foreground'}`}>{p.estoque_atual || 0}</p>
                <p className="text-xs text-muted-foreground">unidades</p>
              </div>
            </div>
          );
        })}
        {!loading && filtrados.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-sm">Nenhum produto encontrado.</p>
          </div>
        )}
      </div>
    </div>
  );
}