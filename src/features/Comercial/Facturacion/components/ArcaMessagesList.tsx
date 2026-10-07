/** Mensajes de ARCA (errores u observaciones) tal cual vienen: código + texto, sin reescribirlos. */
export function ArcaMessagesList({ messages }: { messages: { code: number; message: string }[] }) {
  return (
    <ul className="flex flex-col gap-1">
      {messages.map((m, index) => (
        <li key={`${m.code}-${index}`} className="text-pretty break-words">
          <span className="font-medium tabular-nums">{m.code}</span> · {m.message}
        </li>
      ))}
    </ul>
  );
}
