import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { UserPlus, X } from 'lucide-react';

/** Cadastro rápido de cliente dentro do fluxo de Novo Pedido. */
export default function NovoClienteRapido({ nomeInicial = '', onCriado, onCancelar }) {
  const [dados, setDados] = useState({ nome: nomeInicial, telefone: '', email: '', cnpj_cpf: '', endereco: '' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async () => {
    if (!dados.nome.trim()) return setErro('Informe o nome do cliente.');
    setSalvando(true); setErro('');
    try {
      const novo = await base44.entities.Cliente.create({ ...dados, nome: dados.nome.trim(), ativo: true });
      onCriado(novo);
    } catch (e) {
      setErro('Não foi possível cadastrar: ' + (e.message || 'erro desconhecido'));
      setSalvando(false);
    }
  };

  const campos = [
    ['nome', 'Nome *'], ['telefone', 'Telefone'], ['email', 'E-mail'],
    ['cnpj_cpf', 'CNPJ / CPF'], ['endereco', 'Endereço'],
  ];

  return (
    <div className="border border-primary/30 bg-primary/5 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
          <UserPlus size={14} className="text-primary" /> Novo Cliente
        </p>
        <button onClick={onCancelar} className="p-1 hover:bg-muted rounded-lg"><X size={14} className="text-muted-foreground" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {campos.map(([key, label]) => (
          <div key={key} className={key === 'endereco' ? 'sm:col-span-2' : ''}>
            <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
            <input value={dados[key]} onChange={e => setDados(d => ({ ...d, [key]: e.target.value }))}
              className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
        ))}
      </div>
      {erro && <p className="text-xs text-destructive">{erro}</p>}
      <button onClick={salvar} disabled={salvando}
        className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity">
        {salvando ? 'Cadastrando...' : 'Cadastrar e selecionar'}
      </button>
    </div>
  );
}