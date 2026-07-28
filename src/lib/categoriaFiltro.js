// Utilitários de filtro por categoria compartilhados pelos Kanbans

// Mapa de busca de categoria: por id do produto e por nome normalizado
export function buildMapaCategorias(produtos = []) {
  const porId = {};
  const porNome = {};
  for (const p of produtos) {
    if (p.categoria) {
      if (p.id) porId[p.id] = p.categoria;
      if (p.nome) porNome[p.nome.trim().toLowerCase()] = p.categoria;
    }
  }
  return { porId, porNome };
}

// Lista de todas as categorias existentes no cadastro de produtos
export function listarCategorias(produtos = []) {
  return [...new Set(produtos.map(p => p.categoria).filter(Boolean))].sort();
}

function categoriaDe(mapa, produtoId, produtoNome) {
  if (produtoId && mapa.porId[produtoId]) return mapa.porId[produtoId];
  if (produtoNome) {
    const nome = produtoNome.trim().toLowerCase();
    if (mapa.porNome[nome]) return mapa.porNome[nome];
    // fallback: nome do item pode ter sufixo de variação (ex: "VELA 7 DIAS Branca")
    const chave = Object.keys(mapa.porNome).find(n => nome.startsWith(n));
    if (chave) return mapa.porNome[chave];
  }
  return null;
}

// Categorias presentes num registro (OP ou Separação), considerando produto principal e itens
export function categoriasDoRegistro(reg, mapa) {
  const cats = new Set();
  const principal = categoriaDe(mapa, reg.produto_id, reg.produto_nome);
  if (principal) cats.add(principal);
  for (const item of reg.itens || []) {
    const c = categoriaDe(mapa, item.produto_id, item.produto_nome);
    if (c) cats.add(c);
  }
  return cats;
}

export function registroTemCategoria(reg, mapa, categoria) {
  if (!categoria || categoria === 'todas') return true;
  return categoriasDoRegistro(reg, mapa).has(categoria);
}