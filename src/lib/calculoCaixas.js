/**
 * Lógica centralizada de conversão de unidades em caixas.
 * Produtos "meia caixa" permitem fracionar uma caixa em duas metades.
 */

// Códigos de produtos que aceitam meia caixa
export const CODIGOS_MEIA_CAIXA = ['457', '442', '268', '417', '423'];

export function isMeiaCaixa(codigo) {
  return CODIGOS_MEIA_CAIXA.includes(String(codigo || '').trim());
}

/**
 * Converte uma quantidade em unidades para caixas fechadas, meias caixas e unidades avulsas.
 * @param {object} produto - produto com `codigo` e `itens_por_caixa`
 * @param {number} quantidadeUn - quantidade total em unidades
 */
export function calcularCaixas(produto, quantidadeUn) {
  const ipc = Math.max(1, produto?.itens_por_caixa || 1);
  const qtd = Math.max(0, quantidadeUn || 0);
  const caixas_fechadas = Math.floor(qtd / ipc);
  let resto = qtd % ipc;
  let meias_caixas = 0;
  if (isMeiaCaixa(produto?.codigo) && ipc >= 2 && ipc % 2 === 0) {
    const meia = ipc / 2;
    meias_caixas = Math.floor(resto / meia);
    resto -= meias_caixas * meia;
  }
  return { itens_por_caixa: ipc, caixas_fechadas, meias_caixas, unidades_avulsas: resto };
}

/**
 * Formata o resultado de calcularCaixas para exibição. Ex: "2 cx + 1 meia + 3 un"
 */
export function formatarCaixas(calculo) {
  if (!calculo) return '';
  const partes = [];
  if (calculo.caixas_fechadas > 0) partes.push(`${calculo.caixas_fechadas} cx`);
  if (calculo.meias_caixas > 0) partes.push(`${calculo.meias_caixas} meia${calculo.meias_caixas > 1 ? 's' : ''}`);
  if (calculo.unidades_avulsas > 0) partes.push(`${calculo.unidades_avulsas} un`);
  return partes.join(' + ');
}