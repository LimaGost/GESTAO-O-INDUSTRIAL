/**
 * Estoque Fracionado (caixas desmontadas / sobras de produção).
 * Um registro por produto com o saldo de unidades avulsas.
 */
import { base44 } from '@/api/base44Client';
import { registrarLog } from '@/lib/audit';

export async function listarFracionado() {
  return base44.entities.EstoqueFracionado.list();
}

/** Retorna um mapa { produto_id: quantidade } com os saldos fracionados. */
export async function mapaSaldosFracionados() {
  const all = await listarFracionado();
  const map = {};
  for (const r of all) map[r.produto_id] = (map[r.produto_id] || 0) + (r.quantidade || 0);
  return map;
}

/** Entrada de unidades avulsas no estoque fracionado (upsert por produto). */
export async function adicionarFracionado({ produto_id, produto_nome, produto_codigo, quantidade, origem }) {
  const existentes = await base44.entities.EstoqueFracionado.filter({ produto_id });
  let rec;
  if (existentes.length > 0) {
    rec = existentes[0];
    await base44.entities.EstoqueFracionado.update(rec.id, {
      quantidade: (rec.quantidade || 0) + quantidade,
      produto_nome,
    });
  } else {
    rec = await base44.entities.EstoqueFracionado.create({ produto_id, produto_nome, produto_codigo: produto_codigo || '', quantidade });
  }
  registrarLog('EstoqueFracionado', rec.id, 'ENTRADA_FRACIONADO',
    `Entrada de ${quantidade} un avulsas de ${produto_nome}${origem ? ` — ${origem}` : ''}`).catch(() => {});
  return rec;
}

/** Baixa de unidades avulsas do estoque fracionado. */
export async function retirarFracionado({ produto_id, produto_nome, quantidade, motivo }) {
  const existentes = await base44.entities.EstoqueFracionado.filter({ produto_id });
  if (existentes.length === 0) throw new Error('Sem saldo fracionado para este produto.');
  const rec = existentes[0];
  const saldo = rec.quantidade || 0;
  if (quantidade > saldo) throw new Error(`Saldo fracionado insuficiente (disponível: ${saldo} un).`);
  const novo = saldo - quantidade;
  await base44.entities.EstoqueFracionado.update(rec.id, { quantidade: novo });
  registrarLog('EstoqueFracionado', rec.id, 'SAIDA_FRACIONADO',
    `Baixa de ${quantidade} un avulsas de ${produto_nome}${motivo ? ` — ${motivo}` : ''} (saldo restante: ${novo})`).catch(() => {});
  return novo;
}