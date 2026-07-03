import { useState, useEffect } from 'react';
import { Save, Plus, Trash2, MessageCircle } from 'lucide-react';
import { loadConfig, saveConfig } from '@/lib/appConfig';
import PainelTesteWhatsapp from './PainelTesteWhatsapp';

export default function AbaWhatsapp() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Kanban config
  const [kanban, setKanban] = useState({
    etapas_notificar: ['produzido', 'finalizado'],
    notificar_cliente: true,
    numeros_internos: [],
    msg_interno: '',
    msg_cliente: '',
  });

  // Expedição config
  const [expedicao, setExpedicao] = useState({
    etapas_notificar: ['enviada', 'entregue'],
    notificar_cliente: true,
    msg_interno: '',
    msg_cliente: '',
  });

  const [novoNumero, setNovoNumero] = useState('');

  const ETAPAS_KANBAN = [
    { key: 'produzido',    label: 'Produzido' },
    { key: 'em_embalagem', label: 'Em Embalagem' },
    { key: 'em_separacao', label: 'Em Separação' },
    { key: 'finalizado',   label: 'Finalizado' },
  ];

  const ETAPAS_EXP = [
    { key: 'nf_emitida', label: 'NF Emitida' },
    { key: 'enviada',    label: 'Em Trânsito' },
    { key: 'entregue',   label: 'Entregue' },
  ];

  useEffect(() => {
    Promise.all([
      loadConfig('whatsapp_kanban'),
      loadConfig('whatsapp_expedicao'),
    ]).then(([k, e]) => {
      if (k) setKanban(prev => ({ ...prev, ...k }));
      else {
        const local = localStorage.getItem('whatsapp_kanban_config');
        if (local) try { setKanban(prev => ({ ...prev, ...JSON.parse(local) })); } catch {}
      }
      if (e) setExpedicao(prev => ({ ...prev, ...e }));
      else {
        const local = localStorage.getItem('whatsapp_expedicao_config');
        if (local) try { setExpedicao(prev => ({ ...prev, ...JSON.parse(local) })); } catch {}
      }
      setLoading(false);
    });
  }, []);

  const salvar = async () => {
    setSaving(true);
    await Promise.all([
      saveConfig('whatsapp_kanban', kanban),
      saveConfig('whatsapp_expedicao', expedicao),
    ]);
    localStorage.setItem('whatsapp_kanban_config', JSON.stringify(kanban));
    localStorage.setItem('whatsapp_expedicao_config', JSON.stringify(expedicao));
    window.dispatchEvent(new Event('settings:saved'));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleEtapaKanban = (key) => {
    setKanban(prev => ({
      ...prev,
      etapas_notificar: prev.etapas_notificar.includes(key)
        ? prev.etapas_notificar.filter(k => k !== key)
        : [...prev.etapas_notificar, key],
    }));
  };

  const toggleEtapaExp = (key) => {
    setExpedicao(prev => ({
      ...prev,
      etapas_notificar: prev.etapas_notificar.includes(key)
        ? prev.etapas_notificar.filter(k => k !== key)
        : [...prev.etapas_notificar, key],
    }));
  };

  // Aplica um template pronto ao campo de mensagem correspondente
  const aplicarTemplate = (modulo, etapa, tipo, conteudo) => {
    if (modulo === 'kanban') {
      setKanban(prev => ({ ...prev, [tipo === 'interno' ? 'msg_interno' : 'msg_cliente']: conteudo }));
    } else {
      setExpedicao(prev => ({ ...prev, [tipo === 'interno' ? 'msg_interno' : 'msg_cliente']: conteudo }));
    }
  };

  const adicionarNumero = () => {
    const n = novoNumero.trim();
    if (!n) return;
    setKanban(prev => ({ ...prev, numeros_internos: [...(prev.numeros_internos || []), n] }));
    setNovoNumero('');
  };

  const removerNumero = (idx) => {
    setKanban(prev => ({ ...prev, numeros_internos: prev.numeros_internos.filter((_, i) => i !== idx) }));
  };

  if (loading) return <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>;

  return (
    <div className="space-y-5">
      {/* Painel de Teste */}
      <PainelTesteWhatsapp kanban={kanban} expedicao={expedicao} onAplicarTemplate={aplicarTemplate} />

      {/* Kanban */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
            <MessageCircle size={16} className="text-green-600" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Notificações do Kanban (Produção)</p>
            <p className="text-xs text-muted-foreground">Avisar quando uma OP atingir determinada etapa.</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Etapas que disparam notificação:</p>
          <div className="flex flex-wrap gap-2">
            {ETAPAS_KANBAN.map(e => (
              <button key={e.key} onClick={() => toggleEtapaKanban(e.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${kanban.etapas_notificar.includes(e.key) ? 'bg-green-100 border-green-300 text-green-700' : 'bg-muted border-border text-muted-foreground'}`}>
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="notif_cliente_k" checked={kanban.notificar_cliente}
            onChange={e => setKanban(prev => ({ ...prev, notificar_cliente: e.target.checked }))}
            className="rounded border-border" />
          <label htmlFor="notif_cliente_k" className="text-sm text-foreground">Notificar cliente por WhatsApp</label>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Números internos (equipe)</p>
          <div className="space-y-1.5 mb-2">
            {(kanban.numeros_internos || []).map((n, i) => (
              <div key={i} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                <span className="flex-1 text-sm">{n}</span>
                <button onClick={() => removerNumero(i)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input value={novoNumero} onChange={e => setNovoNumero(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adicionarNumero()}
              placeholder="55119XXXXXXXX"
              className="flex-1 border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            <button onClick={adicionarNumero} className="px-3 border border-border rounded-xl hover:bg-muted">
              <Plus size={15} />
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Mensagem interna (opcional)</label>
          <textarea rows={2} value={kanban.msg_interno || ''} onChange={e => setKanban(prev => ({ ...prev, msg_interno: e.target.value }))}
            placeholder="Ex: OP {numero} avançou para {status}"
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Mensagem para cliente (opcional)</label>
          <textarea rows={2} value={kanban.msg_cliente || ''} onChange={e => setKanban(prev => ({ ...prev, msg_cliente: e.target.value }))}
            placeholder="Ex: Olá {cliente}, seu pedido está {status}"
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
        </div>
      </div>

      {/* Expedição */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
            <MessageCircle size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-sm text-foreground">Notificações de Expedição</p>
            <p className="text-xs text-muted-foreground">Avisar quando uma NF mudar de status.</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Etapas que disparam notificação:</p>
          <div className="flex flex-wrap gap-2">
            {ETAPAS_EXP.map(e => (
              <button key={e.key} onClick={() => toggleEtapaExp(e.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${expedicao.etapas_notificar.includes(e.key) ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-muted border-border text-muted-foreground'}`}>
                {e.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input type="checkbox" id="notif_cliente_e" checked={expedicao.notificar_cliente}
            onChange={e => setExpedicao(prev => ({ ...prev, notificar_cliente: e.target.checked }))}
            className="rounded border-border" />
          <label htmlFor="notif_cliente_e" className="text-sm text-foreground">Notificar cliente por WhatsApp</label>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Mensagem interna (opcional)</label>
          <textarea rows={2} value={expedicao.msg_interno || ''} onChange={e => setExpedicao(prev => ({ ...prev, msg_interno: e.target.value }))}
            placeholder="Ex: NF {numero_nf} atualizada para {status}"
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Mensagem para cliente (opcional)</label>
          <textarea rows={2} value={expedicao.msg_cliente || ''} onChange={e => setExpedicao(prev => ({ ...prev, msg_cliente: e.target.value }))}
            placeholder="Ex: Olá {cliente}, sua entrega está {status}"
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
        </div>
      </div>

      <button onClick={salvar} disabled={saving}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${saved ? 'bg-green-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'} disabled:opacity-50`}>
        <Save size={14} /> {saved ? 'Salvo!' : saving ? 'Salvando...' : 'Salvar Configurações'}
      </button>
    </div>
  );
}