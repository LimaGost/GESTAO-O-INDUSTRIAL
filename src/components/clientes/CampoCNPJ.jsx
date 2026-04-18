import { useState } from 'react';
import { Search, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

function formatarCNPJ(valor) {
  const nums = valor.replace(/\D/g, '').slice(0, 14);
  if (nums.length <= 2) return nums;
  if (nums.length <= 5) return `${nums.slice(0,2)}.${nums.slice(2)}`;
  if (nums.length <= 8) return `${nums.slice(0,2)}.${nums.slice(2,5)}.${nums.slice(5)}`;
  if (nums.length <= 12) return `${nums.slice(0,2)}.${nums.slice(2,5)}.${nums.slice(5,8)}/${nums.slice(8)}`;
  return `${nums.slice(0,2)}.${nums.slice(2,5)}.${nums.slice(5,8)}/${nums.slice(8,12)}-${nums.slice(12,14)}`;
}

export default function CampoCNPJ({ value, onChange, onPreenchido }) {
  const [buscando, setBuscando] = useState(false);
  const [status, setStatus] = useState(null); // 'ok' | 'erro'

  const handleChange = (e) => {
    const formatado = formatarCNPJ(e.target.value);
    setStatus(null);
    onChange(formatado);
  };

  const buscarCNPJ = async () => {
    const nums = value.replace(/\D/g, '');
    if (nums.length !== 14) return alert('CNPJ deve ter 14 dígitos.');
    setBuscando(true);
    setStatus(null);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${nums}`);
      if (!res.ok) throw new Error('CNPJ não encontrado');
      const dados = await res.json();
      const partes = [dados.logradouro, dados.numero, dados.complemento].filter(Boolean);
      const endereco = partes.join(', ');
      onPreenchido({
        nome: dados.razao_social || dados.nome_fantasia || '',
        cnpj_cpf: value,
        email: dados.email || '',
        telefone: dados.ddd_telefone_1 ? `(${dados.ddd_telefone_1}) ${dados.telefone_1 || ''}`.trim() : '',
        endereco,
        bairro: dados.bairro || '',
        cep: dados.cep || '',
        cidade: dados.municipio || '',
        estado: dados.uf || '',
      });
      setStatus('ok');
    } catch {
      setStatus('erro');
      alert('CNPJ não encontrado ou inválido. Verifique e tente novamente.');
    }
    setBuscando(false);
  };

  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">CNPJ/CPF</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={value}
            onChange={handleChange}
            placeholder="00.000.000/0000-00"
            className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary pr-8"
          />
          {status === 'ok' && <CheckCircle size={14} className="absolute right-2.5 top-2.5 text-green-500" />}
          {status === 'erro' && <AlertCircle size={14} className="absolute right-2.5 top-2.5 text-destructive" />}
        </div>
        <button
          onClick={buscarCNPJ}
          disabled={buscando}
          className="flex items-center gap-1.5 border border-border rounded-xl px-3 py-2 text-sm bg-background hover:bg-muted transition-colors disabled:opacity-50"
        >
          {buscando ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
          {buscando ? 'Buscando...' : 'Buscar'}
        </button>
      </div>
      {value.replace(/\D/g, '').length === 14 && status === null && (
        <p className="text-xs text-muted-foreground mt-1">Clique em "Buscar" para preencher automaticamente</p>
      )}
    </div>
  );
}