import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, X, FileSpreadsheet, CheckCircle, AlertCircle, Download, Loader2, Layers } from 'lucide-react';

/**
 * Colunas aceitas na planilha:
 * nome_base* | variacao | codigo | categoria | descricao | unidade | preco_unitario | estoque_atual | estoque_minimo | estoque_maximo | itens_por_caixa
 *
 * Lógica de grade:
 * - Linhas com mesmo nome_base + categoria → agrupadas como família
 * - Cada linha vira um SKU: nome = "nome_base variacao" (ou só nome_base se não tiver variacao)
 * - Produtos SEM variacao = produto simples (sem agrupamento)
 */

const COLUNAS = [
  { key: 'codigo', label: 'codigo', obrigatorio: false, desc: 'Código SKU (se preenchido, atualiza produto existente)' },
  { key: 'nome', label: 'nome', obrigatorio: false, desc: 'Nome do produto' },
  { key: 'categoria', label: 'categoria', obrigatorio: false, desc: 'Categoria' },
  { key: 'descricao', label: 'descricao', obrigatorio: false, desc: 'Descrição' },
  { key: 'unidade', label: 'unidade', obrigatorio: false, desc: 'unidade, kg, caixa...' },
  { key: 'preco_unitario', label: 'preco_unitario', obrigatorio: false, desc: 'Preço unitário (ex: 5.90)' },
  { key: 'preco_custo', label: 'preco_custo', obrigatorio: false, desc: 'Preço de custo (ex: 2.50)' },
  { key: 'estoque_atual', label: 'estoque_atual', obrigatorio: false, desc: 'Estoque atual' },
  { key: 'estoque_minimo', label: 'estoque_minimo', obrigatorio: false, desc: 'Estoque mínimo' },
  { key: 'estoque_maximo', label: 'estoque_maximo', obrigatorio: false, desc: 'Estoque máximo' },
  { key: 'itens_por_caixa', label: 'itens_por_caixa', obrigatorio: false, desc: 'Itens por caixa' },
  { key: 'peso_liquido_kg', label: 'peso_liquido_kg', obrigatorio: false, desc: 'Peso líquido (kg)' },
  { key: 'peso_bruto_kg', label: 'peso_bruto_kg', obrigatorio: false, desc: 'Peso bruto (kg)' },
  { key: 'largura_cm', label: 'largura_cm', obrigatorio: false, desc: 'Largura (cm)' },
  { key: 'altura_cm', label: 'altura_cm', obrigatorio: false, desc: 'Altura (cm)' },
  { key: 'profundidade_cm', label: 'profundidade_cm', obrigatorio: false, desc: 'Profundidade (cm)' },
];

function baixarModelo() {
  const bom = '\uFEFF';
  const header = COLUNAS.map(c => c.label).join(';');
  const exemplos = [
    '001;Sabonete Lavanda;Higiene;Sabonete premium;unidade;5.90;2.50;100;20;500;1;0.15;0.18;8;12;6',
    '002;Sabonete Rosa;Higiene;Sabonete premium;unidade;5.90;2.50;80;20;500;1;0.15;0.18;8;12;6',
    '003;Creme Hidratante;Cosméticos;Creme corporal;unidade;12.90;5.00;50;10;200;1;0.30;0.35;10;15;8',
  ].join('\n');
  const blob = new Blob([bom + header + '\n' + exemplos], { type: 'text/csv;charset=utf-8;' });
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
    if (obj.nome || obj.codigo) rows.push(obj);
  }
  return { rows };
}

function num(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function processarLinhas(rows) {
  const skus = [];
  for (const row of rows) {
    const codigo = row.codigo?.trim() || '';
    skus.push({
      codigo,
      nome: row.nome?.trim() || '',
      categoria: row.categoria?.trim() || '',
      descricao: row.descricao?.trim() || '',
      unidade: row.unidade?.trim() || 'unidade',
      preco_unitario: num(row.preco_unitario),
      preco_custo: num(row.preco_custo),
      estoque_atual: num(row.estoque_atual),
      estoque_minimo: num(row.estoque_minimo),
      estoque_maximo: num(row.estoque_maximo),
      itens_por_caixa: num(row.itens_por_caixa) || 1,
      peso_liquido_kg: num(row.peso_liquido_kg),
      peso_bruto_kg: num(row.peso_bruto_kg),
      largura_cm: num(row.largura_cm),
      altura_cm: num(row.altura_cm),
      profundidade_cm: num(row.profundidade_cm),
      ativo: true,
      _codigo: codigo,
    });
  }
  return { skus };
}

export default function ModalImportarPlanilha({ onClose, onImportado }) {
  const [arquivo, setArquivo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [erroArquivo, setErroArquivo] = useState('');
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const inputRef = useRef();
  const [produtosExistentes, setProdutosExistentes] = useState({});

  const handleArquivo = async (file) => {
    if (!file) return;
    setErroArquivo(''); setPreview(null); setResultado(null); setArquivo(file);
    
    // Carrega todos os produtos existentes
    const todos = await base44.entities.Produto.list();
    const mapCodigo = {};
    todos.forEach(p => { if (p.codigo) mapCodigo[p.codigo] = p; });
    setProdutosExistentes(mapCodigo);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parsearCSV(e.target.result);
      if (parsed.erro) { setErroArquivo(parsed.erro); return; }
      const { skus } = processarLinhas(parsed.rows);
      if (skus.length === 0) { setErroArquivo('Nenhum produto válido encontrado.'); return; }
      setPreview({ skus, total: skus.length });
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleArquivo(file);
  };

  const importar = async () => {
    if (!preview?.skus?.length) return;
    setImportando(true);
    let sucesso = 0, falha = 0;
    for (const prod of preview.skus) {
      const { _codigo, ...dados } = prod;
      try {
        const existente = produtosExistentes[_codigo];
        if (existente && _codigo) {
          // Atualiza produto existente
          await base44.entities.Produto.update(existente.id, dados);
        } else {
          // Cria novo produto
          await base44.entities.Produto.create(dados);
        }
        sucesso++;
      } catch { falha++; }
    }
    setImportando(false);
    setResultado({ sucesso, falha });
    if (sucesso > 0) onImportado();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <FileSpreadsheet size={17} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Importar Produtos via Planilha</h3>
              <p className="text-xs text-muted-foreground">Com suporte a grade e variações</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
            <X size={16} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {resultado ? (
            <div className="space-y-4">
              <div className={`rounded-2xl p-5 text-center ${resultado.falha === 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                <div className="flex justify-center mb-3">
                  <CheckCircle size={32} className={resultado.falha === 0 ? 'text-green-500' : 'text-amber-500'} />
                </div>
                <p className="font-bold text-foreground text-lg">{resultado.sucesso} SKU(s) importados!</p>
                {resultado.falha > 0 && <p className="text-sm text-amber-700 mt-1">{resultado.falha} falharam.</p>}
              </div>
              <button onClick={onClose} className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity">
                Fechar
              </button>
            </div>
          ) : (
            <>
              {/* Modelo + instruções */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Baixar modelo com grade</p>
                    <p className="text-xs text-muted-foreground">Exemplo com variações incluído</p>
                  </div>
                  <button onClick={baixarModelo}
                    className="flex items-center gap-1.5 text-xs border border-border bg-card px-3 py-1.5 rounded-lg hover:bg-muted transition-colors font-medium">
                    <Download size={12} /> Baixar
                  </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Layers size={12} className="text-blue-600" />
                    <p className="text-xs font-semibold text-blue-800">Como funciona a atualização?</p>
                  </div>
                  <p className="text-xs text-blue-700">
                    Se um produto com o <strong>código informado já existe</strong>, ele será <strong>atualizado</strong>. Caso contrário, um novo produto será criado.
                  </p>
                </div>
              </div>

              {/* Colunas */}
              <div className="bg-muted/30 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-foreground mb-2">Colunas da planilha:</p>
                <div className="flex flex-wrap gap-1.5">
                  {COLUNAS.map(c => (
                    <span key={c.key} title={c.desc}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium cursor-help ${c.obrigatorio ? 'bg-primary/10 text-primary' : c.key === 'variacao' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'}`}>
                      {c.label}{c.obrigatorio ? ' *' : ''}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">separador: ; (ponto e vírgula) · use <code className="bg-muted px-1 rounded font-mono">codigo</code> para atualizar produtos existentes</p>
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
                    <p className="text-xs text-muted-foreground mt-1">Formato: CSV (salve o Excel como "CSV separado por ponto e vírgula")</p>
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
                      ✅ {preview.total} SKU(s) · {preview.familiasList.length} famílias/grades encontradas
                    </p>
                    <button onClick={() => { setPreview(null); setArquivo(null); }} className="text-xs text-muted-foreground hover:text-foreground">
                      Trocar arquivo
                    </button>
                  </div>



                  {/* Tabela de SKUs */}
                  <div className="max-h-52 overflow-y-auto rounded-xl border border-border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          {['Código', 'Nome', 'Categoria', 'Estoque', 'Preço', 'Status'].map(h => (
                            <th key={h} className="text-left px-3 py-2 font-semibold text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {preview.skus.slice(0, 60).map((p, i) => {
                          const existe = produtosExistentes[p.codigo];
                          return (
                            <tr key={i} className={`border-t border-border ${existe ? 'bg-blue-50/30' : ''}`}>
                              <td className="px-3 py-1.5 font-mono text-muted-foreground">{p.codigo || '—'}</td>
                              <td className="px-3 py-1.5 text-foreground font-medium">{p.nome}</td>
                              <td className="px-3 py-1.5 text-muted-foreground">{p.categoria || '—'}</td>
                              <td className="px-3 py-1.5 text-foreground">{p.estoque_atual}</td>
                              <td className="px-3 py-1.5 text-foreground">R$ {p.preco_unitario.toFixed(2)}</td>
                              <td className="px-3 py-1.5">
                                {existe
                                  ? <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Atualizar</span>
                                  : <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Novo</span>}
                              </td>
                            </tr>
                          );
                        })}
                        {preview.total > 60 && (
                          <tr><td colSpan={6} className="px-3 py-2 text-center text-muted-foreground">+{preview.total - 60} mais...</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={importar} disabled={importando}
                      className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity">
                      {importando
                        ? <><Loader2 size={15} className="animate-spin" /> Importando...</>
                        : `Importar ${preview.total} SKU(s)`}
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