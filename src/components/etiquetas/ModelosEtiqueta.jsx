import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { calcLarguraEtiqueta } from '@/components/etiquetas/ModeloEtiquetaForm';
import { Layers, Plus, Pencil, Trash2, CheckCircle2, Printer } from 'lucide-react';
import { imprimirEtiquetaProduto } from '@/lib/imprimirEtiquetaProduto';

const LINGUAGEM_LABEL = { pplb: 'PPLB', zpl: 'ZPL', tspl: 'TSPL', epl: 'EPL', html: 'HTML' };

function modeloAtivoId() {
  try { return JSON.parse(localStorage.getItem('etiqueta_impressora_config') || '{}').modelo_id || null; } catch { return null; }
}

export default function ModelosEtiqueta({ onEditar, onNovo, refreshKey }) {
  const [modelos, setModelos] = useState([]);
  const [ativoId, setAtivoId] = useState(modeloAtivoId);

  useEffect(() => {
    base44.entities.ModeloEtiqueta.list('-created_date').then(setModelos).catch(() => {});
  }, [refreshKey]);

  const usar = (m) => {
    const larguraEtiqueta = calcLarguraEtiqueta(m);
    const gap = m.tipo_papel === 'com_espacamento' ? (m.espaco_mm || 0) : 0;
    let cfg = {};
    try { cfg = JSON.parse(localStorage.getItem('etiqueta_impressora_config') || '{}'); } catch {}
    const nova = {
      ...cfg,
      tamanho: 'custom',
      largura_custom: Number(larguraEtiqueta.toFixed(2)),
      altura_custom: m.altura_etiqueta_mm,
      colunas_custom: m.colunas || 1,
      gap_custom: gap,
      linguagem: m.linguagem,
      copias: m.copias || 1,
      temperatura: m.temperatura,
      modelo_id: m.id,
      modelo_descricao: m.descricao,
    };
    localStorage.setItem('etiqueta_impressora_config', JSON.stringify(nova));
    setAtivoId(m.id);
    window.dispatchEvent(new Event('settings:saved'));
  };

  const imprimirTeste = (m) => {
    const gap = m.tipo_papel === 'com_espacamento' ? (m.espaco_mm || 0) : 0;
    imprimirEtiquetaProduto({
      produto_nome: 'TESTE DE IMPRESSAO',
      quantidade: 1,
      lote: 'TESTE001',
      data_producao: new Date().toLocaleDateString('pt-BR'),
      codigo_barras: '7891234567890',
      num_volumes: m.colunas || 1,
    }, { w: calcLarguraEtiqueta(m), h: m.altura_etiqueta_mm, colunas: m.colunas || 1, gap, linguagem: m.linguagem, copias: 1 });
  };

  const excluir = async (m) => {
    if (!confirm(`Excluir o modelo "${m.descricao}"?`)) return;
    await base44.entities.ModeloEtiqueta.delete(m.id);
    setModelos(prev => prev.filter(x => x.id !== m.id));
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Layers size={12} /> Modelos de Etiqueta
        </p>
        <button onClick={onNovo}
          className="flex items-center gap-1 text-xs font-semibold text-primary border border-primary/25 px-2.5 py-1.5 rounded-lg hover:bg-primary/10 transition-colors">
          <Plus size={12} /> Novo modelo
        </button>
      </div>

      {modelos.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">Nenhum modelo cadastrado. Crie o primeiro para controlar a área de impressão.</p>
      ) : (
        <div className="space-y-1.5">
          {modelos.map(m => {
            const ativo = ativoId === m.id;
            return (
              <div key={m.id}
                className={`flex items-center gap-2 border rounded-xl px-3 py-2.5 transition-colors ${ativo ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-bold text-foreground truncate">{m.descricao}</p>
                    {ativo && (
                      <span className="inline-flex items-center gap-0.5 text-[9px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full font-bold">
                        <CheckCircle2 size={9} /> EM USO
                      </span>
                    )}
                    {!m.ativa && <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-bold">INATIVA</span>}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {LINGUAGEM_LABEL[m.linguagem] || m.linguagem} · Papel {m.largura_papel_mm}mm · {m.colunas || 1} col · {calcLarguraEtiqueta(m).toFixed(1)}×{m.altura_etiqueta_mm}mm
                    {m.tipo_papel === 'com_espacamento' ? ` · gap ${m.espaco_mm}mm` : ''}
                  </p>
                </div>
                {!ativo && m.ativa && (
                  <button onClick={() => usar(m)}
                    className="text-[10px] font-bold text-white bg-teal-dark px-2.5 py-1.5 rounded-lg hover:opacity-90 transition-opacity flex-shrink-0">
                    Usar
                  </button>
                )}
                <button onClick={() => imprimirTeste(m)} title="Imprimir teste"
                  className="p-1.5 text-muted-foreground hover:text-teal-dark hover:bg-muted rounded-lg transition-colors flex-shrink-0">
                  <Printer size={13} />
                </button>
                <button onClick={() => onEditar(m)} title="Editar"
                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-muted rounded-lg transition-colors flex-shrink-0">
                  <Pencil size={13} />
                </button>
                <button onClick={() => excluir(m)} title="Excluir"
                  className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-muted rounded-lg transition-colors flex-shrink-0">
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}