import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Pedidos from './pages/Pedidos.jsx';
import Kanban from './pages/Kanban.jsx';
import Estoque from './pages/Estoque';
import Embalagem from './pages/Embalagem';
import Etiquetas from './pages/Etiquetas';
import Expedicao from './pages/Expedicao';
import Clientes from './pages/Clientes';
import Produtos from './pages/Produtos';
import Configuracoes from './pages/Configuracoes';
import Relatorios from './pages/Relatorios.jsx';
import Auditoria from './pages/Auditoria';
import SupabaseSchemas from './pages/SupabaseSchemas';
import ConfirmarRecebimento from './pages/ConfirmarRecebimento';
import Perdas from './pages/Perdas';
import RastreamentoCliente from './pages/RastreamentoCliente';
import WhatsApp from './pages/WhatsApp';
import AguardandoAprovacao from './components/AguardandoAprovacao';
import { PermissoesProvider, usePermissoes } from '@/lib/usePermissoes.jsx';

function RotaProtegida({ modulo, children }) {
  const { temAcesso, isLoading } = usePermissoes();
  if (isLoading) return null;
  if (!temAcesso(modulo)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-6">
        <span className="text-4xl">🔒</span>
        <p className="font-bold text-foreground">Acesso Restrito</p>
        <p className="text-sm text-muted-foreground">Você não tem permissão para acessar este módulo.<br/>Solicite ao administrador.</p>
      </div>
    );
  }
  return children;
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <span className="text-4xl animate-pulse">☀️</span>
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') return <UserNotRegisteredError />;
    if (authError.type === 'auth_required') { navigateToLogin(); return null; }
  }

  const ROLES_SISTEMA = ['admin', 'gerente_producao', 'vendedor', 'maquinista', 'embalador', 'estoquista', 'motorista'];
  if (user && !ROLES_SISTEMA.includes(user.role)) {
    return <AguardandoAprovacao user={user} />;
  }

  return (
    <PermissoesProvider user={user}>
      <Routes>
        <Route path="/" element={<Navigate to="/Dashboard" replace />} />
        <Route element={<Layout />}>
          <Route path="/Dashboard"      element={<RotaProtegida modulo="Dashboard">     <Dashboard />     </RotaProtegida>} />
          <Route path="/Pedidos"        element={<RotaProtegida modulo="Pedidos">        <Pedidos />        </RotaProtegida>} />
          <Route path="/Kanban"         element={<RotaProtegida modulo="Kanban">         <Kanban />         </RotaProtegida>} />
          <Route path="/Estoque"        element={<RotaProtegida modulo="Estoque">        <Estoque />        </RotaProtegida>} />
          <Route path="/Embalagem"      element={<RotaProtegida modulo="Embalagem">      <Embalagem />      </RotaProtegida>} />
          <Route path="/Etiquetas"      element={<RotaProtegida modulo="Etiquetas">      <Etiquetas />      </RotaProtegida>} />
          <Route path="/Expedicao"      element={<RotaProtegida modulo="Expedicao">      <Expedicao />      </RotaProtegida>} />
          <Route path="/Clientes"       element={<RotaProtegida modulo="Clientes">       <Clientes />       </RotaProtegida>} />
          <Route path="/Produtos"       element={<RotaProtegida modulo="Produtos">       <Produtos />       </RotaProtegida>} />
          <Route path="/Relatorios"     element={<RotaProtegida modulo="Relatorios">     <Relatorios />     </RotaProtegida>} />
          <Route path="/Perdas"         element={<RotaProtegida modulo="Perdas">         <Perdas />         </RotaProtegida>} />
          <Route path="/Auditoria"      element={<RotaProtegida modulo="Auditoria">      <Auditoria />      </RotaProtegida>} />
          <Route path="/RastreamentoCliente" element={<RotaProtegida modulo="Expedicao"><RastreamentoCliente /></RotaProtegida>} />
          <Route path="/WhatsApp"           element={<RotaProtegida modulo="Configuracoes"><WhatsApp /></RotaProtegida>} />
          <Route path="/SupabaseSchemas" element={<SupabaseSchemas />} />
          <Route path="/Configuracoes"  element={<RotaProtegida modulo="Configuracoes">  <Configuracoes />  </RotaProtegida>} />
        </Route>
        <Route path="/confirmar-recebimento" element={<ConfirmarRecebimento />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </PermissoesProvider>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;