export function gerarNumero(prefixo = 'DOC') {
  if (prefixo === 'NF') {
    const chave = 'nf_sequencial';
    const atual = parseInt(localStorage.getItem(chave) || '0', 10);
    const proximo = atual + 1;
    localStorage.setItem(chave, String(proximo));
    return String(proximo);
  }
  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const dia = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefixo}-${ano}${mes}${dia}-${rand}`;
}

export function gerarLote(seed = '') {
  const now = new Date();
  const ano = now.getFullYear();
  const mes = String(now.getMonth() + 1).padStart(2, '0');
  const dia = String(now.getDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 900) + 100);
  return `L${ano}${mes}${dia}${rand}`;
}