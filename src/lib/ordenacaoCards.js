// Ordenação reutilizável dos cards de Kanban (Separação, Expedição)
export const SORT_OPTIONS = [
  { key: 'urgencia', label: 'Urgência' },
  { key: 'created_date_asc', label: 'Mais antigas' },
  { key: 'created_date_desc', label: 'Mais recentes' },
  { key: 'qtd_desc', label: 'Maior qtd' },
  { key: 'qtd_asc', label: 'Menor qtd' },
];

const t = (v) => (v ? new Date(v).getTime() : null);

/**
 * @param {Array} lista
 * @param {string} sortKey
 * @param {{ getQtd?: Function, getPrazo?: Function }} opts
 */
export function ordenarCards(lista, sortKey, { getQtd = () => 0, getPrazo = () => null } = {}) {
  return [...lista].sort((a, b) => {
    switch (sortKey) {
      case 'created_date_asc': return t(a.created_date) - t(b.created_date);
      case 'created_date_desc': return t(b.created_date) - t(a.created_date);
      case 'qtd_desc': return getQtd(b) - getQtd(a);
      case 'qtd_asc': return getQtd(a) - getQtd(b);
      case 'urgencia':
      default: {
        // Prazo mais próximo primeiro; sem prazo vai para o fim; empate → mais antigo primeiro
        const pa = t(getPrazo(a));
        const pb = t(getPrazo(b));
        if (pa && pb && pa !== pb) return pa - pb;
        if (pa && !pb) return -1;
        if (!pa && pb) return 1;
        return t(a.created_date) - t(b.created_date);
      }
    }
  });
}