/**
 * Utilitários de data/hora para fuso de Brasília (UTC-3, sem horário de verão).
 * America/Sao_Paulo pode variar com horário de verão; usamos o offset fixo -3.
 */

const TZ = 'America/Sao_Paulo';

/**
 * Retorna o timestamp ISO atual ajustado para Brasília.
 * Usar no lugar de new Date().toISOString() em todas as gravações.
 */
export function agoraISO() {
  return new Date().toLocaleString('sv-SE', { timeZone: TZ }).replace(' ', 'T') + '-03:00';
}

/**
 * Retorna somente a data (YYYY-MM-DD) em Brasília.
 */
export function hojeData() {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ }); // en-CA → YYYY-MM-DD
}

/**
 * Formata um ISO string para exibição legível em Brasília.
 * Ex: "03/04/2026 14:32"
 */
export function fmtDateTimeBR(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: TZ,
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Formata somente a data em Brasília: "03/04/2026"
 */
export function fmtDateBR(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: TZ });
}

/**
 * Calcula a diferença em horas entre dois ISO strings.
 * Retorna null se inválido ou negativo.
 */
export function diffHoras(inicio, fim) {
  if (!inicio || !fim) return null;
  const diff = new Date(fim).getTime() - new Date(inicio).getTime();
  if (diff <= 0) return null;
  return diff / 3600000;
}

/**
 * Formata horas para exibição: "2h 30min" ou "45 min"
 */
export function fmtHoras(h) {
  if (h === null || h === undefined) return '—';
  const totalMin = Math.round(h * 60);
  if (totalMin < 60) return `${totalMin} min`;
  const horas = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (min === 0) return `${horas}h`;
  return `${horas}h ${min}min`;
}