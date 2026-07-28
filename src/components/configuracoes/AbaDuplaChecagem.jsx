import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Lock, Save, ShieldCheck, ShieldOff } from 'lucide-react';
import SeletorUsuariosChecagem from './SeletorUsuariosChecagem';

const ROLES_DISPONIVEIS = [
  ['diretor', 'Diretor (CEO)'],
  ['gerente_producao', 'Gerente de Produção'],
  ['vendedor', 'Vendedor'],
  ['vendedor_industria', 'Vendedor Indústria'],
  ['vendedor_loja', 'Vendedor Loja'],
  ['maquinista', 'Maquinista'],
  ['embalador', 'Embalador'],
  ['estoquista', 'Estoquista'],
  ['estoquista_industria', 'Estoquista Indústria'],
  ['estoquista_galpao', 'Estoquista Galpão'],
  ['conferente_industria', 'Conferente Indústria'],
  ['conferente_galpao', 'Conferente Galpão'],
  ['motorista', 'Motorista'],
  ['user', 'Usuário Padrão'],
];

export default function AbaDuplaChecagem() {
  const [carregando, setCarregando] = useState(true);
  const [podeGerir, setPodeGerir] = useState(false);
  const [configurada, setConfigurada] = useState(false);
  const [rolesSel, setRolesSel] = useState([]);
  const [usuariosSel, setUsuariosSel] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [pin, setPin] = useState('');
  const [pinConfirma, setPinConfirma] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    base44.functions.invoke('duplaChecagem', { acao: 'status' })
      .then(res => {
        setPodeGerir(!!res.data?.podeGerir);
        setConfigurada(!!res.data?.configurada);
        setRolesSel(res.data?.roles || []);
        setUsuariosSel(res.data?.user_ids || []);
        if (res.data?.podeGerir) {
          base44.functions.invoke('duplaChecagem', { acao: 'usuarios' })
            .then(r => setUsuarios(r.data?.usuarios || []))
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setCarregando(false));
  }, []);

  const toggleRole = (r) =>
    setRolesSel(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);

  const toggleUsuario = (id) =>
    setUsuariosSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const salvar = async () => {
    setMsg(null);
    if (!configurada && !pin) { setMsg({ tipo: 'erro', texto: 'Defina uma senha para ativar.' }); return; }
    if (pin && pin.length < 4) { setMsg({ tipo: 'erro', texto: 'A senha deve ter pelo menos 4 caracteres.' }); return; }
    if (pin && pin !== pinConfirma) { setMsg({ tipo: 'erro', texto: 'As senhas não conferem.' }); return; }
    setSalvando(true);
    try {
      const res = await base44.functions.invoke('duplaChecagem', {
        acao: 'configurar',
        pin: pin || undefined,
        roles: rolesSel,
        user_ids: usuariosSel,
      });
      if (res.data?.ok) {
        setConfigurada(true);
        setPin(''); setPinConfirma('');
        setMsg({ tipo: 'ok', texto: '✓ Dupla checagem salva com sucesso!' });
      } else {
        setMsg({ tipo: 'erro', texto: res.data?.error || 'Erro ao salvar.' });
      }
    } catch (e) {
      setMsg({ tipo: 'erro', texto: e?.response?.data?.error || 'Erro ao salvar.' });
    }
    setSalvando(false);
  };

  const desativar = async () => {
    if (!confirm('Desativar a dupla checagem? Nenhum cargo será mais bloqueado na entrada.')) return;
    setSalvando(true);
    await base44.functions.invoke('duplaChecagem', { acao: 'desativar' }).catch(() => {});
    setConfigurada(false);
    setRolesSel([]);
    setUsuariosSel([]);
    setMsg({ tipo: 'ok', texto: 'Dupla checagem desativada.' });
    setSalvando(false);
  };

  if (carregando) {
    return <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>;
  }

  if (!podeGerir) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <span className="text-4xl">🔒</span>
        <p className="font-bold text-foreground">Acesso Restrito</p>
        <p className="text-sm text-muted-foreground">Apenas o gestor autorizado (moises.choas@gmail.com) pode configurar a dupla checagem.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lock size={18} className="text-primary" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Senha de Dupla Checagem</p>
              <p className="text-xs text-muted-foreground">Exigida na entrada do sistema para os cargos selecionados abaixo</p>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full ${configurada ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
            {configurada ? <><ShieldCheck size={13} /> Ativa</> : <><ShieldOff size={13} /> Inativa</>}
          </span>
        </div>

        {/* Senha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-semibold">
              {configurada ? 'Nova senha (deixe em branco para manter)' : 'Senha *'}
            </label>
            <input type="password" value={pin} onChange={e => setPin(e.target.value)}
              placeholder="Mínimo 4 caracteres"
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-semibold">Confirmar senha</label>
            <input type="password" value={pinConfirma} onChange={e => setPinConfirma(e.target.value)}
              placeholder="Repita a senha"
              className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        </div>

        {/* Cargos */}
        <div>
          <label className="text-xs text-muted-foreground mb-2 block font-semibold">
            Cargos que precisam informar a senha ao entrar ({rolesSel.length} selecionado{rolesSel.length !== 1 ? 's' : ''})
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ROLES_DISPONIVEIS.map(([valor, label]) => {
              const sel = rolesSel.includes(valor);
              return (
                <button key={valor} onClick={() => toggleRole(valor)}
                  className={`text-left px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                    sel ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:bg-muted'
                  }`}>
                  {sel ? '✓ ' : ''}{label}
                </button>
              );
            })}
          </div>
        </div>

        <SeletorUsuariosChecagem usuarios={usuarios} selecionados={usuariosSel} onToggle={toggleUsuario} />

        {msg && (
          <p className={`text-xs rounded-lg px-3 py-2 ${msg.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {msg.texto}
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={salvar} disabled={salvando}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
            <Save size={14} /> {salvando ? 'Salvando...' : 'Salvar Dupla Checagem'}
          </button>
          {configurada && (
            <button onClick={desativar} disabled={salvando}
              className="px-4 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-50 transition-colors">
              Desativar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}