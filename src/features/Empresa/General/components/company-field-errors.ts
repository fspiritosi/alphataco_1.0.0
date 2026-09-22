/**
 * Los formularios de alta/edición de empresa son páginas server con inputs nativos: cada campo
 * tiene un `<CardDescription id="<campo>_error">` debajo. Este helper pinta ahí el error por campo
 * (o lo limpia) a partir del resultado de `parseCompanyForm` o de `fieldErrors` del servidor.
 */
export function showCompanyFieldErrors(formData: FormData, errors: Record<string, string>): void {
  const keys = new Set<string>([...Array.from(formData.keys()), ...Object.keys(errors)]);
  for (const key of keys) {
    const element = document.getElementById(`${key}_error`);
    if (!element) continue;
    const message = errors[key];
    element.innerText = message ?? '';
    element.style.color = message ? 'red' : '';
  }
}
