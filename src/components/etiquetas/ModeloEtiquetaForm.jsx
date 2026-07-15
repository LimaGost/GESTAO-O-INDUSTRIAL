import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import EstudioPreview from '@/components/etiquetas/EstudioPreview';
import { ArrowLeft, Info, Save } from 'lucide-react';

const LINGUAGENS = [
  { v: 'pplb', l: '1 - PPLB (Elgin L42 Pro / Argox)' },
  { v: 'zpl', l: '2 - ZPL (Zebra)' },
  { v: 'tspl', l: '3 - TSPL (TSC)' },
  { v: 'epl', l: '4 - EPL (Zebra legado)' },
  { v: 'html', l: '5 - Impressão HTML (driver do sistema)' },
];

const TIPOS_PAPEL = [
  { v: 'com_espacamento', l: 'Com Espaçamento' },
  { v: 'continuo', l: 'Contínuo' },
  { v: 'linha_tracejada', l: 'Com Linha Tracejada' },
];

export function calcLarguraEtiqueta(m) {
  const colunas = Math.max(1, Number(m.colunas) || 1);
  const papel = Number(m.largura_papel_mm) || 0;
  const gap = m.tipo_papel === 'com_espacamento' ? (Number(m.espaco_mm) || 0) : 0;
  return Math.max(0, (papel - gap * (colunas - 1)) / colunas);
}

function Tooltip({ texto }) {
  return (
    <span className="group relative inline-flex ml-1 align-middle">
      <Info size={12} className="text-teal-dark/70 cursor-help" />
      <span className="hidden group-hover:block absolute z-30 left-4 top-0 w-64 bg-gray-900 text-white text-[10px] rounded-lg px-3 py-2 shadow-xl">
        {texto}
      </span>
    </span>
  );
}

export default function ModeloEtiquetaForm({ modelo, onVoltar, onSalvo }) {
  const [form, setForm] = useState({
    descricao: modelo?.descricao || '',
    linguagem: modelo?.linguagem || 'pplb',
    temperatura: modelo?.temperatura ?? 10,
    tipo_papel: modelo?.tipo_papel || 'com_espacamento',
    colunas: modelo?.colunas ?? 3,
    largura_papel_mm: modelo?.largura_papel_mm ?? 112,
    altura_etiqueta_mm: modelo?.altura_etiqueta_mm ?? 21,
    espaco_mm: modelo?.espaco_mm ?? 3,
    copias: modelo?.copias ?? 1,
    ativa: modelo?.ativa ?? true,
  });
  const [aba, setAba] = useState('papel');
  const [salvando, setSalvando] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const larguraEtiqueta = calcLarguraEtiqueta(form);
  const colunas = Math.max(1, Number(form.colunas) || 1);
  const gap = form.tipo_papel === 'com_espacamento' ? (Number(form.espaco_mm) || 0) : 0;

  const salvar = async () => {
    if (!form.descricao.trim()) return alert('Informe a descrição do modelo.');
    setSalvando(true);
    try {
      const dados = {
        ...form,
        colunas: Number(form.colunas) || 1,
        largura_papel_mm: Number(form.largura_papel_mm) || 0,
        altura_etiqueta_mm: Number(form.altura_etiqueta_mm) || 0,
        espaco_mm: Number(form.espaco_mm) || 0,
        temperatura: Number(form.temperatura) || 10,
        copias: Number(form.copias) || 1,
      };
      if (modelo?.id) await base44.entities.ModeloEtiqueta.update(modelo.id, dados);
      else await base44.entities.ModeloEtiqueta.create(dados);
      onSalvo();
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    } finally {
      setSalvando(false);
    }
  };

  const inputCls = "w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-card border border-border rounded-2xl px-5 py-4 flex items-center gap-3">
        <button onClick={onVoltar} className="p-2 hover:bg-muted rounded-xl transition-colors flex-shrink-0">
          <ArrowLeft size={18} className="text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-foreground">{modelo?.id ? 'Editar Etiqueta' : 'Cadastro de Etiqueta'}</h3>
          <p className="text-xs text-muted-foreground">Crie um modelo de etiqueta configurando das opções de impressão até o papel. Após salvar, o modelo estará disponível como opção de impressão.</p>
        </div>
        <button onClick={salvar} disabled={salvando}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-opacity flex-shrink-0">
          <Save size={14} /> {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>

      {/* Configurações Gerais */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <p className="text-sm font-bold text-foreground">Configurações Gerais</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Descrição *</label>
            <input value={form.descricao} onChange={e => set('descricao', e.target.value)}
              placeholder="Digite a descrição da etiqueta" className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
              Modelo da impressora *
              <Tooltip texto="Linguagem de comando enviada à impressora. Para a Elgin L42 Pro use PPLB." />
            </label>
            <select value={form.linguagem} onChange={e => set('linguagem', e.target.value)} className={inputCls}>
              {LINGUAGENS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Temperatura de impressão *</label>
            <input type="number" min="1" max="15" value={form.temperatura}
              onChange={e => set('temperatura', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Cópias por impressão</label>
            <input type="number" min="1" value={form.copias}
              onChange={e => set('copias', e.target.value)} className={inputCls} />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer w-fit">
          <button type="button" onClick={() => set('ativa', !form.ativa)}
            className={`relative w-10 h-5.5 h-6 rounded-full transition-colors ${form.ativa ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.ativa ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
          <span className="text-sm font-semibold text-foreground">Ativa</span>
        </label>
      </div>

      {/* Configurações de etiqueta */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="text-sm font-bold text-foreground mb-3">Configurações de etiqueta</p>
        <div className="flex gap-1 border-b border-border mb-4">
          {[{ k: 'papel', l: 'Papel' }, { k: 'layout', l: 'Layout' }].map(t => (
            <button key={t.k} onClick={() => setAba(t.k)}
              className={`text-sm font-semibold px-4 py-2 border-b-2 transition-colors ${aba === t.k ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {t.l}
            </button>
          ))}
        </div>

        {aba === 'papel' ? (
          <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 items-start">
            {/* Painel de campos */}
            <div className="border border-border rounded-2xl p-4 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-[11px] text-amber-800">
                <strong>Atenção:</strong> ao alterar qualquer valor, a área de impressão será recalculada automaticamente.
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Tipo de papel *</label>
                <select value={form.tipo_papel} onChange={e => set('tipo_papel', e.target.value)} className={inputCls}>
                  {TIPOS_PAPEL.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Quantidade de colunas *</label>
                <input type="number" min="1" max="6" value={form.colunas}
                  onChange={e => set('colunas', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                  Largura do papel (mm) *
                  <Tooltip texto={`A largura da etiqueta é calculada automaticamente com base na largura do papel, quantidade de colunas e espaçamento. Largura da etiqueta: ${larguraEtiqueta.toFixed(2)} mm`} />
                </label>
                <input type="number" min="10" value={form.largura_papel_mm}
                  onChange={e => set('largura_papel_mm', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Altura da etiqueta (mm) *</label>
                <input type="number" min="5" value={form.altura_etiqueta_mm}
                  onChange={e => set('altura_etiqueta_mm', e.target.value)} className={inputCls} />
              </div>
              {form.tipo_papel === 'com_espacamento' && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">
                    Espaço entre etiquetas (mm) *
                    <Tooltip texto="Se não for informado, nenhum espaçamento será aplicado entre as etiquetas." />
                  </label>
                  <input type="number" min="0" step="0.5" value={form.espaco_mm}
                    onChange={e => set('espaco_mm', e.target.value)} className={inputCls} />
                </div>
              )}
              <div className="bg-teal-dark/5 border border-teal-dark/15 rounded-xl px-3 py-2 text-[11px] text-teal-dark font-semibold">
                Largura da etiqueta: {larguraEtiqueta.toFixed(2)} mm
              </div>
            </div>

            {/* Grade de pré-visualização do papel */}
            <div className="border border-border rounded-2xl p-6 bg-slate-50 overflow-auto min-h-[300px]">
              <div className="mx-auto w-fit">
                <p className="text-[10px] text-muted-foreground font-mono text-center mb-1">← {Number(form.largura_papel_mm) || 0} mm →</p>
                <div className="bg-white border-x-2 border-slate-300 px-1 py-2 space-y-0" style={{ width: (Number(form.largura_papel_mm) || 0) * 2.6 + 8 }}>
                  {Array.from({ length: 8 }).map((_, linha) => (
                    <div key={linha} className="flex justify-start" style={{ gap: gap * 2.6, marginBottom: gap * 2.6 }}>
                      {Array.from({ length: colunas }).map((_, col) => (
                        <div key={col}
                          className={`bg-white ${form.tipo_papel === 'linha_tracejada' ? 'border-2 border-dashed border-gray-400' : 'border border-gray-400 rounded-sm'}`}
                          style={{ width: larguraEtiqueta * 2.6, height: (Number(form.altura_etiqueta_mm) || 0) * 2.6 }} />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <p className="text-xs text-muted-foreground mb-3 text-center">Pré-visualização do conteúdo impresso em cada etiqueta deste modelo:</p>
            <EstudioPreview
              config={{ w: larguraEtiqueta, h: Number(form.altura_etiqueta_mm) || 15, colunas, gap }}
              dados={{ produto_nome: 'Produto Exemplo', lote: 'L2024001', data_producao: new Date().toLocaleDateString('pt-BR'), codigo_barras: '7891234567890' }} />
          </div>
        )}
      </div>
    </div>
  );
}