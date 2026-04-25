import AbaWhatsapp from '@/components/configuracoes/AbaWhatsapp';
import { MessageCircle } from 'lucide-react';

export default function WhatsApp() {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0">
          <MessageCircle size={22} className="text-green-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">WhatsApp</h2>
          <p className="text-sm text-muted-foreground">Configure notificações automáticas para produção e expedição</p>
        </div>
      </div>

      <AbaWhatsapp />
    </div>
  );
}