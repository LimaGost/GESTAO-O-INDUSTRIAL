import { useState, useEffect, createContext, useContext } from 'react';
import { base44 } from '@/api/base44Client';

export const MODULO_PATH = {
  Dashboard:    '/Dashboard',
  Pedidos:      '/Pedidos',
  Kanban:       '/Kanban',
  Estoque:      '/Estoque',
  Embalagem:    '/Embalagem',
  Etiquetas:    '/Etiquetas',
  Expedicao:    '/Expedicao',
  Clientes:     '/Clientes',
  Produtos:     '/Produtos',
  Relatorios:   '/Relatorios',
  Perdas:       '/Perdas',
  Auditoria:    '/Auditoria',
  Configuracoes: '/Configuracoes',
  Faturamento:  '/Relatorios',
  Precos:       '/Produtos',
};

// Módulos cujos valores monetários ficam ocultos em modo "view"
export const MODULOS_FINANCEIROS = ['Relatorios', 'Faturamento', 'Precos'];

const DEFAULTS = {
  admin:            null,
  gerente_producao: { Dashboard: 'full', Pedidos: 'full', Kanban: 'full', Estoque: 'full', Embalagem: 'full', Etiquetas: 'full', Expedicao: 'full', Clientes: 'view', Produtos: 'full', Relatorios: 'full', Perdas: 'full', Faturamento: 'view', Precos: 'view', Auditoria: 'view', Configuracoes: 'none' },
  vendedor:         { Dashboard: 'view', Pedidos: 'full', Kanban: 'view', Estoque: 'view', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'view', Clientes: 'full', Produtos: 'view', Relatorios: 'none', Perdas: 'none', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  maquinista:       { Dashboard: 'view', Pedidos: 'none', Kanban: 'full', Estoque: 'view', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'none', Clientes: 'none', Produtos: 'none', Relatorios: 'none', Perdas: 'view', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  embalador:        { Dashboard: 'view', Pedidos: 'none', Kanban: 'view', Estoque: 'view', Embalagem: 'full', Etiquetas: 'full', Expedicao: 'none', Clientes: 'none', Produtos: 'none', Relatorios: 'none', Perdas: 'view', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  estoquista:       { Dashboard: 'view', Pedidos: 'view', Kanban: 'view', Estoque: 'full', Embalagem: 'none', Etiquetas: 'full', Expedicao: 'none', Clientes: 'none', Produtos: 'view', Relatorios: 'none', Perdas: 'view', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  motorista:        { Dashboard: 'view', Pedidos: 'none', Kanban: 'none', Estoque: 'none', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'full', Clientes: 'none', Produtos: 'none', Relatorios: 'none', Perdas: 'none', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
};

const PermissoesContext = createContext(null);

export function PermissoesProvider({ user, children }) {
  const [modulos, setModulos] = useState(undefined);

  useEffect(() => {
    if (!user) { setModulos({}); return; }
    if (user.role === 'admin') { setModulos(null); return; }

    base44.entities.PermissaoRole.filter({ role: user.role }).then(lista => {
      if (lista?.length > 0 && lista[0].modulos_niveis) {
        setModulos(lista[0].modulos_niveis);
      } else {
        setModulos(DEFAULTS[user.role] || {});
      }
    }).catch(() => {
      setModulos(DEFAULTS[user.role] || {});
    });
  }, [user?.id, user?.role]);

  const getNivel = (modulo) => {
    if (!user) return 'none';
    if (user.role === 'admin') return 'full';
    if (modulos === undefined) return 'full';
    return modulos[modulo] || 'none';
  };

  const temAcesso = (modulo) => getNivel(modulo) !== 'none';
  const somenteLeitura = (modulo) => getNivel(modulo) === 'view';
  // Retorna true se o usuário NÃO pode ver valores financeiros (nível 'view' em módulo financeiro)
  const ocultarFinanceiro = (modulo) => MODULOS_FINANCEIROS.includes(modulo) && getNivel(modulo) === 'view';
  const isLoading = modulos === undefined && user?.role !== 'admin';

  return (
    <PermissoesContext.Provider value={{ getNivel, temAcesso, somenteLeitura, ocultarFinanceiro, modulos, isLoading }}>
      {children}
    </PermissoesContext.Provider>
  );
}

export function usePermissoes() {
  return useContext(PermissoesContext) || { getNivel: () => 'full', temAcesso: () => true, somenteLeitura: () => false, ocultarFinanceiro: () => false, isLoading: false };
}