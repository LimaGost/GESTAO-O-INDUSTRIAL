import { CheckCircle, User, PenLine, Camera } from 'lucide-react';

export default function ComprovanteRecebimento({ expedicao }) {
  if (!expedicao?.confirmado_pelo_cliente) return null;
  const data = expedicao.data_confirmacao_cliente || expedicao.data_confirmacao;
  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
      <p className="text-xs font-bold text-green-700 flex items-center gap-1.5">
        <CheckCircle size={12} /> Comprovante de Recebimento
      </p>
      <div className="space-y-1 text-xs text-green-800">
        {!expedicao.nome_recebedor && !expedicao.assinatura_url && !expedicao.foto_recebedor_url && (
          <p className="text-amber-700">⚠️ Entrega confirmada sem registro dos dados do recebedor.</p>
        )}
        {expedicao.nome_recebedor && (
          <p className="flex items-center gap-1.5"><User size={11} /> Recebido por: <strong>{expedicao.nome_recebedor}</strong></p>
        )}
        {expedicao.cpf_recebedor && <p>CPF: <strong>{expedicao.cpf_recebedor}</strong></p>}
        {data && (
          <p>📅 {new Date(data).toLocaleDateString('pt-BR')} às {new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
        )}
        {expedicao.observacoes_cliente && <p>📝 {expedicao.observacoes_cliente}</p>}
      </div>
      {expedicao.assinatura_url && (
        <div>
          <p className="text-[10px] font-semibold text-green-700 flex items-center gap-1 mb-1"><PenLine size={10} /> Assinatura</p>
          <img src={expedicao.assinatura_url} alt="Assinatura do recebedor"
            className="w-full max-h-24 object-contain bg-white rounded-lg border border-green-200" />
        </div>
      )}
      {expedicao.foto_recebedor_url && (
        <div>
          <p className="text-[10px] font-semibold text-green-700 flex items-center gap-1 mb-1"><Camera size={10} /> Foto</p>
          <img src={expedicao.foto_recebedor_url} alt="Foto do recebimento"
            className="w-full max-h-40 object-cover rounded-lg border border-green-200" />
        </div>
      )}
    </div>
  );
}