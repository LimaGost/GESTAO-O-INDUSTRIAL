// Pré-visualização em escala real da etiqueta, refletindo a configuração da impressora
const ESCALA = 3.2; // px por mm (zoom da visualização)

export default function EstudioPreview({ config, dados }) {
  const { w, h, colunas, gap } = config;
  const { produto_nome, lote, data_producao, codigo_barras } = dados;
  const pequena = h <= 20;

  const Etiqueta = () => (
    <div
      className="bg-white border border-gray-300 shadow-sm overflow-hidden flex flex-col"
      style={{ width: w * ESCALA, height: h * ESCALA, padding: pequena ? '2px 4px' : '8px 10px', flexShrink: 0 }}>
      {pequena ? (
        <>
          <p className="font-bold text-gray-900 truncate leading-tight" style={{ fontSize: 9 }}>
            {produto_nome || 'Nome do produto'}
          </p>
          <p className="text-gray-600 truncate leading-tight" style={{ fontSize: 7.5 }}>
            L:{lote || '—'} {data_producao || ''}
          </p>
          {codigo_barras && (
            <img
              src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(codigo_barras)}&code=Code128&dpi=72&showtext=false&quiet=0&height=8`}
              alt="barcode" className="mt-0.5 object-fill" style={{ height: 16, width: '100%' }}
              onError={e => e.target.style.display = 'none'} />
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-dashed border-gray-300 pb-1 mb-1">
            <span className="font-bold text-amber-700" style={{ fontSize: 10 }}>☀️ RAIO DO SOL</span>
            <span className="text-gray-500" style={{ fontSize: 8 }}>{data_producao || ''}</span>
          </div>
          <p className="font-bold text-gray-900 leading-tight" style={{ fontSize: 13 }}>
            {produto_nome || 'Nome do produto'}
          </p>
          <p className="text-gray-600" style={{ fontSize: 9 }}>Lote: {lote || '—'}</p>
          {codigo_barras && (
            <div className="mt-auto text-center">
              <img
                src={`https://barcode.tec-it.com/barcode.ashx?data=${encodeURIComponent(codigo_barras)}&code=Code128&dpi=72&showtext=false&quiet=0&height=12`}
                alt="barcode" className="mx-auto object-contain" style={{ height: 26, maxWidth: '95%' }}
                onError={e => e.target.style.display = 'none'} />
              <p className="text-gray-500 font-mono" style={{ fontSize: 7 }}>{codigo_barras}</p>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      {/* Régua da bobina */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
        <span>← {((w + gap) * colunas - gap).toFixed(1)} mm →</span>
        <span>{w}×{h} mm{colunas > 1 ? ` · ${colunas} colunas` : ''}</span>
      </div>
      {/* Bobina */}
      <div className="bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl p-3 overflow-x-auto">
        <div className="flex" style={{ gap: gap * ESCALA }}>
          {Array.from({ length: colunas }).map((_, i) => <Etiqueta key={i} />)}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">Visualização em escala aproximada da bobina</p>
    </div>
  );
}