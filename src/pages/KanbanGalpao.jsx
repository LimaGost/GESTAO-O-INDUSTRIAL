import KanbanFranqueados from '@/components/galpao/KanbanFranqueados';
import KanbanOperacionalGalpao from '@/components/galpao/KanbanOperacionalGalpao';

export default function KanbanGalpao() {
  return (
    <div className="flex flex-col space-y-6">
      <KanbanFranqueados />
      <KanbanOperacionalGalpao />
    </div>
  );
}