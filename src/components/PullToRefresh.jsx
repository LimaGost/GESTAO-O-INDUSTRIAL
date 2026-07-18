import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

const THRESHOLD = 70;

// Envolve o conteúdo de uma página e dispara onRefresh quando o usuário puxa para baixo no topo (mobile)
export default function PullToRefresh({ onRefresh, children }) {
  const containerRef = useRef(null);
  const startYRef = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const getScrollParent = () => containerRef.current?.closest('main') || document.documentElement;

  const onTouchStart = (e) => {
    if (refreshing) return;
    const sp = getScrollParent();
    if (sp.scrollTop <= 0) startYRef.current = e.touches[0].clientY;
    else startYRef.current = null;
  };

  const onTouchMove = (e) => {
    if (startYRef.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startYRef.current;
    if (delta > 0 && getScrollParent().scrollTop <= 0) {
      setPull(Math.min(delta * 0.4, THRESHOLD + 30));
    } else {
      setPull(0);
    }
  };

  const onTouchEnd = async () => {
    if (startYRef.current === null) return;
    startYRef.current = null;
    if (pull >= THRESHOLD && onRefresh) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try { await onRefresh(); } catch {}
      setRefreshing(false);
    }
    setPull(0);
  };

  return (
    <div ref={containerRef} onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <AnimatePresence>
        {(pull > 0 || refreshing) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: refreshing ? 48 : pull, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'tween', duration: refreshing ? 0.2 : 0 }}
            className="flex items-center justify-center overflow-hidden"
          >
            <RefreshCw
              size={20}
              className={`text-primary ${refreshing ? 'animate-spin' : ''}`}
              style={!refreshing ? { transform: `rotate(${(pull / THRESHOLD) * 360}deg)`, opacity: Math.min(1, pull / THRESHOLD) } : {}}
            />
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  );
}