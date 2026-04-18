import { useState } from 'react';
import { Save, Check, Copy, Download } from 'lucide-react';

const LINGUAGENS = [
  {
    key: 'html',
    label: 'HTML / Driver Windows',
    desc: 'Impressão via navegador (padrão). Funciona com qualquer impressora instalada como driver no Windows.',
    marcas: 'Qualquer marca com driver instalado',
    nivel: 'Fácil',
  },
  {
    key: 'zpl',
    label: 'ZPL — Zebra',
    desc: 'Linguagem da Zebra. Padrão do mercado. Gera arquivo .prn para envio direto à impressora.',
    marcas: 'Zebra ZD220, ZD420, ZT230, ZT411 e compatíveis',
    nivel: 'Avançado',
  },
  {
    key: 'tspl',
    label: 'TSPL — TSC / Elgin',
    desc: 'Linguagem da TSC. Muito usada no Brasil. Gera arquivo .prn para envio direto.',
    marcas: 'TSC TE200, TTP-244, Elgin L42DT, Tanca TLP-300+',
    nivel: 'Médio',
  },
  {
    key: 'epl',
    label: 'EPL — Zebra (legado)',
    desc: 'Linguagem antiga da Zebra. Use para impressoras mais antigas ou sistemas legados.',
    marcas: 'Zebra LP2844, Zebra 2844-Z, modelos antigos',
    nivel: 'Básico',
  },
];

const TAMANHOS = [
  { key: '100x50', label: '100 × 50 mm', w: 100, h: 50 },
  { key: '100x30', label: '100 × 30 mm', w: 100, h: 30 },
  { key: '80x40', label: '80 × 40 mm', w: 80, h: 40 },
  { key: '60x40', label: '60 × 40 mm', w: 60, h: 40 },
  { key: '58x40', label: '58 × 40 mm', w: 58, h: 40 },
  { key: 'custom', label: 'Personalizado', w: null, h: null },
];

function getNivelColor(nivel) {
  if (nivel === 'Fácil') return 'bg-green-100 text-green-700';
  if (nivel === 'Médio') return 'bg-amber-100 text-amber-700';
  if (nivel === 'Avançado') return 'bg-orange-100 text-orange-700';
  return 'bg-muted text-muted-foreground';
}

export function getPrinterConfig() {
  try { return JSON.parse(localStorage.getItem('printer_config') || '{}'); } catch { return {}; }
}

export default function AbaEtiquetas() {
  const [config, setConfig] = useState(() => {
    const saved = getPrinterConfig();
    return {
      linguagem: saved.linguagem || 'html',
      tamanho: saved.tamanho || '100x50',
      largura_custom: saved.largura_custom || 100,
      altura_custom: saved.altura_custom || 50,
      copias: saved.copias || 1,
    };
  });
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const salvar = () => {
    localStorage.setItem('printer_config', JSON.stringify(config));
    window.dispatchEvent(new Event('settings:saved'));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tamanhoAtual = TAMANHOS.find(t => t.key === config.tamanho) || TAMANHOS[0];
  const largura = config.tamanho === 'custom' ? config.largura_custom : tamanhoAtual.w;
  const altura = config.tamanho === 'custom' ? config.altura_custom : tamanhoAtual.h;

  const exemploZPL = `^XA\n^FO20,20^ADN,18,10^FDNome do Produto^FS\n^FO20,50^ADN,14,8^FDLote: L2024001^FS\n^FO20,70^ADN,14,8^FDQtd: 12 un Data: 12/04/2024^FS\n^FO20,95^BY2^BCN,60,Y,N,N^FDCOD-PRODUTO^FS\n^XZ`;
  const exemploTSPL = `SIZE ${largura} mm, ${altura} mm\nGAP 2 mm, 0 mm\nCLS\nTEXT 10,10,"3",0,1,1,"Nome do Produto"\nTEXT 10,50,"2",0,1,1,"Lote: L2024001"\nTEXT 10,70,"2",0,1,1,"Qtd: 12 un Data: 12/04/2024"\nBARCODE 10,95,"128",60,1,0,2,2,"COD-PRODUTO"\nPRINT 1`;
  const exemploEPL = `N\nq${largura * 8}\nA10,10,0,3,1,1,N,"Nome do Produto"\nA10,40,0,2,1,1,N,"Lote: L2024001"\nA10,60,0,2,1,1,N,"Qtd: 12 un Data: 12/04/2024"\nB10,80,0,1,2,2,60,B,"COD-PRODUTO"\nP1`;

  const exemploAtual = config.linguagem === 'zpl' ? exemploZPL : config.linguagem === 'tspl' ? exemploTSPL : config.linguagem === 'epl' ? exemploEPL : null;

  const handleCopy = () => {
    if (!exemploAtual) return;
    navigator.clipboard.writeText(exemploAtual);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!exemploAtual) return;
    const blob = new Blob([exemploAtual], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `etiqueta_exemplo.prn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Linguagem */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div>
          <p className="font-semibold text-foreground">Linguagem da Impressora</p>
          <p className="text-xs text-muted-foreground">Selecione o protocolo compatível com sua impressora de etiquetas</p>
        </div>
        <div className="space-y-2">
          {LINGUAGENS.map(lang => {
            const active = config.linguagem === lang.key;
            return (
              <button key={lang.key} onClick={() => setConfig(c => ({ ...c, linguagem: lang.key }))}
                className={`w-full text-left flex items-start gap-3 px-4 py-3.5 rounded-xl border transition-all ${active ? 'border-primary/50 bg-primary/5' : 'border-border bg-background hover:bg-muted/40'}`}>
                <div className={`w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 ${active ? 'border-primary bg-primary' : 'border-muted-foreground'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-foreground">{lang.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${getNivelColor(lang.nivel)}`}>{lang.nivel}</span>
                    {active && <Check size={14} className="text-primary ml-auto" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{lang.desc}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Marcas: {lang.marcas}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tamanho */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <p className="font-semibold text-foreground">Tamanho da Etiqueta</p>
        <div className="flex flex-wrap gap-2">
          {TAMANHOS.map(t => (
            <button key={t.key} onClick={() => setConfig(c => ({ ...c, tamanho: t.key }))}
              className={`px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${config.tamanho === t.key ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>
        {config.tamanho === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Largura (mm)</label>
              <input type="number" value={config.largura_custom} onChange={e => setConfig(c => ({ ...c, largura_custom: Number(e.target.value) }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Altura (mm)</label>
              <input type="number" value={config.altura_custom} onChange={e => setConfig(c => ({ ...c, altura_custom: Number(e.target.value) }))}
                className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
        )}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Cópias padrão por etiqueta</label>
          <input type="number" min="1" max="99" value={config.copias} onChange={e => setConfig(c => ({ ...c, copias: Number(e.target.value) }))}
            className="w-32 border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      {/* Preview do comando */}
      {exemploAtual && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-foreground">Exemplo de Comando ({config.linguagem.toUpperCase()})</p>
            <div className="flex gap-2">
              <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs border border-border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
                <Copy size={12} />{copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button onClick={handleDownload} className="flex items-center gap-1.5 text-xs border border-border px-3 py-1.5 rounded-lg hover:bg-muted transition-colors">
                <Download size={12} />Baixar .prn
              </button>
            </div>
          </div>
          <pre className="bg-muted/50 rounded-xl p-3 text-xs text-foreground overflow-x-auto font-mono">{exemploAtual}</pre>
          <p className="text-xs text-muted-foreground">Para enviar o arquivo .prn diretamente à impressora, use o comando no Windows: <code className="bg-muted px-1 rounded">copy /b etiqueta.prn \\servidor\impressora</code></p>
        </div>
      )}

      {/* Salvar */}
      <button onClick={salvar}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'}`}>
        {saved ? <><Check size={14} /> Configuração salva!</> : <><Save size={14} /> Salvar configuração</>}
      </button>
    </div>
  );
}