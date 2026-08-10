import { useState, useEffect, createContext, useContext } from 'react';
import { base44 } from '@/api/base44Client';

export const MODULO_PATH = {
  Dashboard:    '/Dashboard',
  Pedidos:      '/Pedidos',
  Kanban:       '/Kanban',
  Separacao:    '/KanbanSeparacao',
  SeparacaoGalpao: '/KanbanGalpao',
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
  PostoTrabalho: '/PostoTrabalho',
};

// Módulos cujos valores monetários ficam ocultos em modo "view"
export const MODULOS_FINANCEIROS = ['Relatorios', 'Faturamento', 'Precos', 'Dashboard', 'Pedidos'];

const DEFAULTS = {
  admin:            null,
  gerente_producao: { Dashboard: 'full', Pedidos: 'full', Kanban: 'full', Separacao: 'full', SeparacaoGalpao: 'full', Estoque: 'full', Embalagem: 'full', Etiquetas: 'full', Expedicao: 'full', Clientes: 'view', Produtos: 'full', Relatorios: 'full', Perdas: 'full', Faturamento: 'view', Precos: 'view', Auditoria: 'view', Configuracoes: 'none', PostoTrabalho: 'view' },
  vendedor:         { Dashboard: 'view', Pedidos: 'full', Kanban: 'view', Separacao: 'view', SeparacaoGalpao: 'view', Estoque: 'view', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'view', Clientes: 'full', Produtos: 'view', Relatorios: 'none', Perdas: 'none', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  maquinista:       { Dashboard: 'view', Pedidos: 'none', Kanban: 'full', Separacao: 'none', SeparacaoGalpao: 'none', Estoque: 'view', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'none', Clientes: 'none', Produtos: 'none', Relatorios: 'none', Perdas: 'view', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none', PostoTrabalho: 'full' },
  embalador:        { Dashboard: 'view', Pedidos: 'none', Kanban: 'view', Separacao: 'view', SeparacaoGalpao: 'view', Estoque: 'view', Embalagem: 'full', Etiquetas: 'full', Expedicao: 'none', Clientes: 'none', Produtos: 'none', Relatorios: 'none', Perdas: 'view', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none', PostoTrabalho: 'full' },
  estoquista:       { Dashboard: 'view', Pedidos: 'view', Kanban: 'view', Separacao: 'full', SeparacaoGalpao: 'full', Estoque: 'full', Embalagem: 'none', Etiquetas: 'full', Expedicao: 'none', Clientes: 'none', Produtos: 'view', Relatorios: 'none', Perdas: 'view', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none', PostoTrabalho: 'full' },
  motorista:        { Dashboard: 'view', Pedidos: 'none', Kanban: 'none', Separacao: 'none', SeparacaoGalpao: 'none', Estoque: 'none', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'full', Clientes: 'none', Produtos: 'none', Relatorios: 'none', Perdas: 'none', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  estoquista_industria: { Dashboard: 'view', Pedidos: 'view', Kanban: 'view', Separacao: 'full', SeparacaoGalpao: 'none', Estoque: 'full', Embalagem: 'none', Etiquetas: 'full', Expedicao: 'none', Clientes: 'none', Produtos: 'view', Relatorios: 'none', Perdas: 'view', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  estoquista_galpao:    { Dashboard: 'view', Pedidos: 'none', Kanban: 'none', Separacao: 'none', SeparacaoGalpao: 'full', Estoque: 'view', Embalagem: 'none', Etiquetas: 'full', Expedicao: 'view', Clientes: 'none', Produtos: 'view', Relatorios: 'none', Perdas: 'view', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  vendedor_industria:   { Dashboard: 'view', Pedidos: 'full', Kanban: 'view', Separacao: 'view', SeparacaoGalpao: 'none', Estoque: 'view', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'full', Clientes: 'full', Produtos: 'view', Relatorios: 'none', Perdas: 'none', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  vendedor_loja:        { Dashboard: 'view', Pedidos: 'full', Kanban: 'none', Separacao: 'none', SeparacaoGalpao: 'none', Estoque: 'view', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'view', Clientes: 'full', Produtos: 'view', Relatorios: 'none', Perdas: 'none', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  conferente_industria: { Dashboard: 'view', Pedidos: 'view', Kanban: 'view', Separacao: 'full', SeparacaoGalpao: 'none', Estoque: 'view', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'view', Clientes: 'none', Produtos: 'view', Relatorios: 'none', Perdas: 'none', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
  conferente_galpao:    { Dashboard: 'view', Pedidos: 'none', Kanban: 'none', Separacao: 'none', SeparacaoGalpao: 'full', Estoque: 'none', Embalagem: 'none', Etiquetas: 'none', Expedicao: 'view', Clientes: 'none', Produtos: 'view', Relatorios: 'none', Perdas: 'none', Faturamento: 'none', Precos: 'none', Auditoria: 'none', Configuracoes: 'none' },
};

const PermissoesContext = createContext(null);

export function PermissoesProvider({ user, children }) {
  const [modulos, setModulos] = useState(undefined);

  useEffect(() => {
    if (!user) { setModulos({}); return; }
    if (user.role === 'admin' || user.role === 'diretor') { setModulos(null); return; }

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
    if (user.role === 'admin' || user.role === 'diretor') return 'full';
    if (modulos === undefined) return 'full';
    // Compatibilidade: perfis salvos antes da separação Industria/Galpão herdam o nível de 'Separacao'
    return modulos[modulo] ?? (modulo === 'SeparacaoGalpao' ? modulos['Separacao'] : undefined) ?? 'none';
  };

  const temAcesso = (modulo) => getNivel(modulo) !== 'none';
  const somenteLeitura = (modulo) => getNivel(modulo) === 'view';
  // Retorna true se o usuário NÃO pode ver valores financeiros (nível 'view' em módulo financeiro)
  const ocultarFinanceiro = (modulo) => MODULOS_FINANCEIROS.includes(modulo) && getNivel(modulo) === 'view';
  const isLoading = modulos === undefined && user?.role !== 'admin' && user?.role !== 'diretor';

  return (
    <PermissoesContext.Provider value={{ getNivel, temAcesso, somenteLeitura, ocultarFinanceiro, modulos, isLoading }}>
      {children}
    </PermissoesContext.Provider>
  );
}

export function usePermissoes() {
  return useContext(PermissoesContext) || { getNivel: () => 'full', temAcesso: () => true, somenteLeitura: () => false, ocultarFinanceiro: () => false, isLoading: false };
}