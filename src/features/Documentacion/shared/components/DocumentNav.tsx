import NewDocumentMulti from './NewDocumentMulti';

/**
 * Botonera de carga de documentos. El flujo "no multirecurso" (`NewDocumentNoMulti`) se retiró:
 * la subida individual se hace desde el botón "Subir documento" de las tablas (`SimpleDocument`).
 */
export default function DocumentNav({
  onlyEmployees,
  onlyNoMultiresource,
  onlyEquipment,
}: {
  onlyEmployees?: boolean;
  onlyEquipment?: boolean;
  onlyNoMultiresource?: boolean;
  onlyMultiresource?: boolean;
  id_user?: string;
}) {
  return (
    <div className="flex gap-2">
      {!onlyNoMultiresource && <NewDocumentMulti onlyEmployees={onlyEmployees} onlyEquipment={onlyEquipment} />}
    </div>
  );
}
