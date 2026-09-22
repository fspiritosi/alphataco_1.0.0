import type { FormAnswerRow } from '@/features/Formularios/actions/form-actions';
import { checkListAnswerColumns } from '@/features/Formularios/components/tables/checkListAnswerColumns';
import { CheckListAnswerTable } from '@/features/Formularios/components/tables/data-table-answer';
import moment from 'moment';

async function CheckListAnwersTable({ answers }: { answers: FormAnswerRow[] }) {
  return (
    <CheckListAnswerTable
      columns={checkListAnswerColumns}
      data={answers.map((e) => {
        const answer = (e.answer ?? {}) as Record<string, string | undefined>;
        return {
          chofer: answer.chofer ?? '',
          id: e.id,
          kilometer: answer.kilometraje ?? '',
          engine_hours: answer.horometro || '-',
          created_at: moment(e.created_at).toISOString(),
          domain: answer.dominio ?? '',
        };
      })}
    />
  );
}
export default CheckListAnwersTable;
