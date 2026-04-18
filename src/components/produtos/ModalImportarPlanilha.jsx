import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle, Download, Loader2 } from 'lucide-react';

const COLUNAS_ESPERADAS = [
  { key: 'nome', label: 'nome', obrigatorio: true },
  { key: 'codigo', label: 'codigo', obrigatorio: false },
  { key: 'categoria', label: 'categoria', obrigatorio: false },
  { key: 'descricao', label: 'descricao', obrigatorio: false },
  { key: 'unidade', label: 'unidade', obrigatorio: false },
  { key: 'preco_unitario', label: 'preco_unitario', obrigatorio: false },
  { key: 'estoque_atual', label: 'estoque_atual', obrigatorio: false },
  { key: 'estoque_minimo', label: 'estoque_minimo', obrigatorio: false },
  { key: 'estoque_maximo', label: 'estoque_maximo', obrigatorio: false },
  { key: 'itens_por_caixa', label: 'itens_por_caixa', obrigatorio: false },
];

function baixarModelo() {
  const bom = '\uFEFF';
  const header = COLUNAS_ESPERADAS.map(c => c.label).join(';');
  const exemplo = 'Sabonete Lavanda;001;Higiene;Sabonete artesanal;unidade;5.90;100;20;500;1';
  const blob = new Blob([bom + header + '\n' + exemplo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'modelo_produtos.csv'; a.click();
  URL.revokeObjectURL(url);
}

function parsearCSV(texto) {
  const linhas = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (linhas.length < 2) return { erro: 'Arquivo vazio ou sem dados.' };

  const sep = linhas[0].includes(';') ? ';' : ',';
  const cabecalho = linhas[0].split(sep).map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[""]/g, ''));

  const rows = [];
  for (let i = 1; i < linhas.length; i++) {
    const vals = linhas[i].split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    cabecalho.forEach((col, j) => { obj[col] = vals[j] || ''; });
    if (obj.nome) rows.push(obj);
  }
  return { rows, cabecalho };
}

function mapearProduto(row) {
  const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
  return {
    nome: row.nome?.trim() || '',
    codigo: row.codigo?.trim() || '',
    categoria: row.categoria?.trim() || '',
    descricao: row.descricao?.trim() || '',
    unidade: row.unidade?.trim() || 'unidade',
    preco_unitario: num(row.preco_unitario),
    estoque_atual: num(row.estoque_atual),
    estoque_minimo: num(row.estoque_minimo),
    estoque_maximo: num(row.estoque_maximo),
    itens_por_caixa: num(row.itens_por_caixa) || 1,
    ativo: true,
  };
}

export default function ModalImportarPlanilha({ onClose, onImportado }) {
  const [arquivo, setArquivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [erroArquivo, setErroArquivo] = useState('');
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const inputRef = useRef();

  const handleArquivo = (file) => {
    if (!file) return;
    setErroArquivo('');
    setPreview(null);
    setResultado(null);
    setArquivo(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const texto = e.target.result;
      const parsed = parsearCSV(texto);
      if (parsed.erro) { setErroArquivo(parsed.erro); return; }
      const produtos = parsed.rows.map(mapearProduto).filter(p => p.nome);
      if (produtos.length === 0) { setErroArquivo('Nenhum produto válido encontrado. Verifique se a coluna "nome" está preenchida.'); return; }
      setPreview({ produtos, total: produtos.length });
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleArquivo(file);
  };

  const importar = async () => {
    if (!preview?.produtos?.length) return;
    setImportando(true);
    let sucesso = 0, falha = 0;
    for (const prod of preview.produtos) {
      try {
        await base44.entities.Produto.create(prod);
        sucesso++;
      } catch { falha++; }
    }
    setImportando(false);
    setResultado({ sucesso, falha });
    if (sucesso > 0) onImportado();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <FileSpreadsheet size={17} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Importar Produtos via Planilha</h3>
              <p className="text-xs text-muted-foreground">CSV ou Excel exportado como CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Resultado final */}
          {resultado ? (
            <div className="space-y-4">
              <div className={`rounded-2xl p-5 text-center ${resultado.falha === 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                <div className="flex justify-center mb-3">
                  <CheckCircle size={32} className={resultado.falha === 0 ? 'text-green-500' : 'text-amber-500'} />
                </div>
                <p className="font-bold text-foreground text-lg">{resultado.sucesso} produto(s) importados!</p>
                {resultado.falha > 0 && (
                  <p className="text-sm text-amber-700 mt-1">{resultado.falha} produto(s) falharam.</p>
                )}
              </div>
              <button onClick={onClose}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
                Fechar
              </button>
            </div>
          ) : (
            <>
              {/* Modelo */}
              <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">Baixar modelo de planilha</p>
                  <p className="text-xs text-muted-foreground">Formato CSV com todas as colunas</p>
                </div>
                <button onClick={baixarModelo}
                  className="flex items-center gap-1.5 text-xs border border-border bg-card px-3 py-1.5 rounded-lg hover:bg-muted transition-colors font-medium">
                  <Download size={12} /> Baixar
                </button>
              </div>

              {/* Colunas aceitas */}
              <div className="bg-muted/30 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-foreground mb-2">Colunas aceitas na planilha:</p>
                <div className="flex flex-wrap gap-1.5">
                  {COLUNAS_ESPERADAS.map(c => (
                    <span key={c.key} className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${c.obrigatorio ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      {c.label}{c.obrigatorio ? ' *' : ''}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">* obrigatório · separador: ; (ponto e vírgula)</p>
              </div>

              {/* Drop zone */}
              {!preview && (
                <div
                  onDrop={handleDrop}
                  onDragOver={e => e.preventDefault()}
                  onClick={() => inputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-all text-center"
                >
                  <Upload size={28} className="text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">Clique ou arraste o arquivo aqui</p>
                    <p className="text-xs text-muted-foreground mt-1">Formato: CSV (salve o Excel como .csv)</p>
                  </div>
                  <input ref={inputRef} type="file" accept=".csv,.txt" className="hidden"
                    onChange={e => handleArquivo(e.target.files[0])} />
                </div>
              )}

              {erroArquivo && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle size={15} className="text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{erroArquivo}</p>
                </div>
              )}

              {/* Preview */}
              {preview && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">
                      ✅ {preview.total} produto(s) encontrados em{' '}
                      <span className="font-mono text-xs text-muted-foreground">{arquivo?.name}</span>
                    </p>
                    <button onClick={() => { setPreview(null); setArquivo(null); }} className="text-xs text-muted-foreground hover:text-foreground">
                      Trocar arquivo
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-xl border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          {['Nome', 'Código', 'Categoria', 'Estoque', 'Preço'].map(h => (
                            <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.produtos.slice(0, 50).map((p, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-1.5 text-foreground font-medium">{p.nome}</td>
                            <td className="px-3 py-1.5 text-muted-foreground font-mono">{p.codigo || '—'}</td>
                            <td className="px-3 py-1.5 text-muted-foreground">{p.categoria || '—'}</td>
                            <td className="px-3 py-1.5 text-foreground">{p.estoque_atual}</td>
                            <td className="px-3 py-1.5 text-foreground">R$ {p.preco_unitario.toFixed(2)}</td>
                          </tr>
                        ))}
                        {preview.total > 50 && (
                          <tr><td colSpan={5} className="px-3 py-2 text-center text-muted-foreground">+{preview.total - 50} mais...</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={importar} disabled={importando}
                      className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity">
                      {importando ? <><Loader2 size={15} className="animate-spin" /> Importando...</> : `Importar ${preview.total} produto(s)`}
                    </button>
                    <button onClick={onClose} className="border border-border px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:bg-muted transition-colors">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}