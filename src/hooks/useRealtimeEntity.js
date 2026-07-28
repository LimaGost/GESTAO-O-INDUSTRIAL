import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Mantém uma lista de registros sincronizada em tempo real, sem recarregar a página inteira.
 *
 * Otimizações:
 * - Aplica apenas o registro alterado no estado (nada de re-fetch da lista toda).
 * - Agrupa eventos que chegam juntos num único re-render (buffer de 150ms).
 * - Ignora eventos cujo conteúdo já é idêntico ao que está na tela (evita render inútil).
 *
 * @param {string} entityName  Nome da entidade (ex: 'OrdemProducao')
 * @param {Function} setLista  setState da lista de registros
 * @param {boolean} ativo      Liga/desliga a sincronização
 */
export function useRealtimeEntity(entityName, setLista, ativo = true) {
  const bufferRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!ativo) return;

    const flush = () => {
      const eventos = bufferRef.current;
      bufferRef.current = [];
      timerRef.current = null;
      if (eventos.length === 0) return;

      setLista((prev) => {
        let lista = prev;
        let mudou = false;
        for (const ev of eventos) {
          const registro = ev.data;
          if (!registro?.id && ev.type !== 'delete') continue;
          if (ev.type === 'delete') {
            const id = registro?.id || ev.id;
            if (lista.some((r) => r.id === id)) { lista = lista.filter((r) => r.id !== id); mudou = true; }
          } else if (ev.type === 'create') {
            if (!lista.some((r) => r.id === registro.id)) { lista = [registro, ...lista]; mudou = true; }
          } else {
            const atual = lista.find((r) => r.id === registro.id);
            if (!atual) { lista = [registro, ...lista]; mudou = true; }
            else if (atual.updated_date !== registro.updated_date) {
              lista = lista.map((r) => r.id === registro.id ? { ...r, ...registro } : r);
              mudou = true;
            }
          }
        }
        return mudou ? lista : prev;
      });
    };

    const unsubscribe = base44.entities[entityName].subscribe((event) => {
      bufferRef.current.push(event);
      if (!timerRef.current) timerRef.current = setTimeout(flush, 150);
    });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      unsubscribe?.();
    };
  }, [entityName, setLista, ativo]);
}

export default useRealtimeEntity;