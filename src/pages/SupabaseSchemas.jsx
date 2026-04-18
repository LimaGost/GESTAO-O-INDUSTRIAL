import { Database } from 'lucide-react';

export default function SupabaseSchemas() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Database size={19} className="text-slate-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Schemas</h2>
          <p className="text-xs text-muted-foreground">Estrutura do banco de dados</p>
        </div>
      </div>
      <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
        <Database size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">Visualização de schemas do sistema</p>
      </div>
    </div>
  );
}