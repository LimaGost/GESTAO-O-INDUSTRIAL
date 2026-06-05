import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Save, Link2, ArrowRight, AlertCircle } from 'lucide-react';
import { loadConfig, saveConfig } from '@/lib/appConfig';

const PRODUCAO_ETAPAS = [
  { key: 'a_produzir', label: 'A Produzir' },
  { key: 'em_producao', label: 'Em Produção' },
  { key: 'produzido', label: 'Produzido' },
  { key: 'em_embalagem', label: 'Em Embalagem' },
  { key: 'em_separacao', label: 'Em Separação' },
  { key: 'finalizado', label: 'Finalizado' },
];

const PEDIDOS_ETAPAS = [
  { key: 'rascunho', label: 'Rascunho' },
  { key: 'aguardando_estoque', label: 'Ag. Estoque' },
  { key: 'separacao', label: 'Em Separação' },
  { key: 'separado', label: 'Separado' },
  { key: 'expedido', label: 'Expedido' },
  { key: 'entregue', label: 'Entregue' },
  { key: 'cancelado', label: 'Cancelado' },
];

export default function AbaVinculoKanbans() {
  const [vinculos, setVinculos] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const config = await loadConfig('kanban_producao_pedidos_vinculos');
      if (config && typeof config === 'object') {
        setVinculos(config);
      } else {
        // Valores padrão sugeridos
        setVinculos({
          'a_produzir': 'aguardando_estoque',
          'em_producao': 'separacao',
          'produzido': 'separacao',
          'em_embalagem': 'separacao',
          'em_separacao': 'separacao',
          'finalizado': 'separado',
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleVinculoChange = (producaoKey, pedidoKey) => {
    setVinculos(prev => ({
      ...prev,
      [producaoKey]: pedidoKey,
    }));
  };

  const salvar = async () => {
    setSaving(true);
    await saveConfig('kanban_producao_pedidos_vinculos', vinculos);
    window.dispatchEvent(new Event('settings:saved'));
    setSaving(false);
    alert('Vínculos salvos com sucesso!');
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Carregando configurações...</div>;
  }

  return (
    <div className="space-y-5">
      {/* Info */}
      <div className="bg-sky-blue/10 border border-sky-blue/30 rounded-2xl p-4 flex gap-3">
        <AlertCircle size={18} className="text-sky-blue flex-shrink-0 mt-0.5" />
        <div className="text-sm text-sky-blue">
          <p className="font-semibold mb-1">Como funciona o vínculo</p>
          <p>Quando uma ordem de produção avança para uma etapa, o pedido vinculado será automaticamente movido para a etapa do Kanban de Pedidos que você configurar abaixo.</p>
        </div>
      </div>

      {/* Tabela de vínculos */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/50">
          <h3 className="font-bold text-sm text-foreground">Mapeamento de Etapas</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Defina para qual etapa do Kanban de Pedidos cada etapa da Produção deve direcioná-lo</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {PRODUCAO_ETAPAS.map((producao, idx) => (
                <tr key={producao.key} className={idx % 2 === 0 ? 'bg-card' : 'bg-muted/30'}>
                  <td className="px-6 py-4 font-medium text-foreground w-32">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-sun-gold" />
                      {producao.label}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <ArrowRight size={16} className="text-muted-foreground mx-auto" />
                  </td>
                  <td className="px-6 py-4 flex-1 min-w-[200px]">
                    <select
                      value={vinculos[producao.key] || ''}
                      onChange={(e) => handleVinculoChange(producao.key, e.target.value)}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">— Selecione uma etapa —</option>
                      {PEDIDOS_ETAPAS.map(pedido => (
                        <option key={pedido.key} value={pedido.key}>
                          {pedido.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resumo visual */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-bold text-muted-foreground mb-3">KANBAN DE PRODUÇÃO</p>
          <div className="space-y-2">
            {PRODUCAO_ETAPAS.map(etapa => (
              <div key={etapa.key} className="text-sm text-foreground bg-muted/50 rounded-lg px-3 py-2">
                {etapa.label}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs font-bold text-muted-foreground mb-3">KANBAN DE PEDIDOS</p>
          <div className="space-y-2">
            {PEDIDOS_ETAPAS.map(etapa => (
              <div
                key={etapa.key}
                className={`text-sm rounded-lg px-3 py-2 ${
                  Object.values(vinculos).includes(etapa.key)
                    ? 'bg-primary/20 text-primary font-medium'
                    : 'bg-muted/30 text-muted-foreground'
                }`}
              >
                {etapa.label}
                {Object.values(vinculos).includes(etapa.key) && (
                  <span className="text-xs ml-1">✓</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Botão salvar */}
      <div className="flex gap-3">
        <button
          onClick={salvar}
          disabled={saving}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Save size={16} />
          {saving ? 'Salvando...' : 'Salvar Vínculos'}
        </button>
      </div>
    </div>
  );
}