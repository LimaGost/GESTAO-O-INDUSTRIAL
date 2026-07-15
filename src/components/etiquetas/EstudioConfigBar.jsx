import { Link } from 'react-router-dom';
import { Printer, Settings2 } from 'lucide-react';

const LINGUAGEM_LABEL = {
  html: 'Impressão HTML (driver)',
  pplb: 'PPLB — Elgin L42 Pro',
  zpl: 'ZPL — Zebra',
  tspl: 'TSPL — TSC',
  epl: 'EPL — Zebra legado',
};

export default function EstudioConfigBar({ config }) {
  const { w, h, colunas, linguagem } = config;
  return (
    <div className="bg-teal-dark/5 border border-teal-dark/15 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-teal-dark/10 flex items-center justify-center flex-shrink-0">
          <Printer size={16} className="text-teal-dark" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground">
            {w}×{h} mm{colunas > 1 ? ` · ${colunas} colunas` : ''} — {LINGUAGEM_LABEL[linguagem] || 'Impressão HTML'}
          </p>
          <p className="text-[10px] text-muted-foreground">Configuração ativa da impressora de etiquetas</p>
        </div>
      </div>
      <Link to="/Configuracoes"
        className="flex items-center gap-1.5 text-xs font-semibold text-teal-dark border border-teal-dark/25 px-3 py-1.5 rounded-xl hover:bg-teal-dark/10 transition-colors flex-shrink-0">
        <Settings2 size={12} /> Alterar
      </Link>
    </div>
  );
}