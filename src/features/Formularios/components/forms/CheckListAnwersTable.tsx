import { checkListAnswerColumns } from '@/features/Formularios/components/tables/checkListAnswerColumns';
import { CheckListAnswerTable } from '@/features/Formularios/components/tables/data-table-answer';

async function CheckListAnwersTable({ answers }: { answers: CheckListAnswerWithForm[] }) {
  return (
    <CheckListAnswerTable
      columns={checkListAnswerColumns}
      data={answers.map((e) => {
        return {
          chofer: (e.answer as { chofer: string })?.chofer,
          id: e.id,
          name: (e.answer as { dominio: string })?.dominio,
          kilometer: (e.answer as { kilometraje: string })?.kilometraje,
          engine_hours: (e.answer as { horometro: string })?.horometro || '-',
          created_at: e.created_at,
          domain: (e.answer as { dominio: string })?.dominio,
        };
      })}
    />
  );
}
export default CheckListAnwersTable;
