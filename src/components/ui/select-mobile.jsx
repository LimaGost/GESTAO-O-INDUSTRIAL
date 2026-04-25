import React, { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Mobile-friendly Select component
 * On mobile: opens a centered modal with options
 * On desktop: uses native select or dropdown
 */
export default function SelectMobile({ value, onValueChange, children, placeholder = 'Selecione...', disabled = false, isMobile = false }) {
  const [isOpen, setIsOpen] = useState(false);

  // Extract options from children
  const options = React.Children.toArray(children).filter(child => child?.type?.name === 'SelectOption');
  const selectedOption = options.find(opt => opt.props.value === value);
  const displayLabel = selectedOption?.props.children || placeholder;

  if (!isMobile) {
    // Desktop: render as native select
    return (
      <select
        value={value}
        onChange={e => onValueChange(e.target.value)}
        disabled={disabled}
        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">{placeholder}</option>
        {options.map(opt => (
          <option key={opt.props.value} value={opt.props.value}>
            {opt.props.children}
          </option>
        ))}
      </select>
    );
  }

  // Mobile: render as button that opens modal
  return (
    <>
      <button
        onClick={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-between"
      >
        <span>{displayLabel}</span>
        <ChevronDown size={16} className="text-muted-foreground" />
      </button>

      {/* Modal backdrop + dialog */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />

            {/* Bottom Sheet / Centered Modal */}
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-3xl max-h-[80vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-4 border-b border-border sticky top-0 bg-card rounded-t-3xl">
                <h3 className="text-base font-bold text-foreground">Selecione uma opção</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-muted rounded-lg"
                >
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              {/* Options List */}
              <div className="overflow-y-auto flex-1">
                {options.map(opt => (
                  <button
                    key={opt.props.value}
                    onClick={() => {
                      onValueChange(opt.props.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3.5 border-b border-border last:border-b-0 transition-colors text-base font-medium ${
                      value === opt.props.value
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    {opt.props.children}
                  </button>
                ))}
              </div>

              {/* Footer spacer for safe area */}
              <div className="h-4" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export function SelectOption({ value, children }) {
  return null; // Only used for rendering in parent
}