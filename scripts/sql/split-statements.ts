/**
 * Divide un script SQL en sentencias de nivel superior.
 *
 * Escáner de un solo paso que respeta:
 *  - strings con comillas simples (escape `''`) y strings `E'...'` (escape `\`)
 *  - comentarios de línea `--` y de bloque `/* ... *\/`, anidados como en Postgres
 *  - dollar-quoting con o sin etiqueta (`$$`, `$function$`, `$cron$`, ...)
 *
 * Emite una sentencia al encontrar `;` en estado normal. Las sentencias se
 * devuelven con `trim()`, sin los comentarios que las preceden (los comentarios
 * internos se conservan) y se descartan las vacías.
 */

type ScannerState = 'normal' | 'singleQuote' | 'lineComment' | 'blockComment' | 'dollar';

const DOLLAR_TAG_RE = /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/;

export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let state: ScannerState = 'normal';
  let dollarTag = '';
  /** Profundidad de comentarios de bloque (Postgres los anida). */
  let blockDepth = 0;
  /** Dentro de un string `E'...'`, donde `\` escapa el siguiente carácter. */
  let escapeString = false;
  let start = 0;
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1];

    switch (state) {
      case 'normal': {
        if (ch === ';') {
          pushStatement(statements, sql.slice(start, i));
          start = i + 1;
          i += 1;
          break;
        }
        if (ch === "'") {
          state = 'singleQuote';
          escapeString = i > 0 && (sql[i - 1] === 'E' || sql[i - 1] === 'e');
          i += 1;
          break;
        }
        if (ch === '-' && next === '-') {
          state = 'lineComment';
          i += 2;
          break;
        }
        if (ch === '/' && next === '*') {
          state = 'blockComment';
          blockDepth = 1;
          i += 2;
          break;
        }
        if (ch === '$') {
          const match = DOLLAR_TAG_RE.exec(sql.slice(i));
          if (match) {
            dollarTag = match[0];
            state = 'dollar';
            i += dollarTag.length;
            break;
          }
        }
        i += 1;
        break;
      }
      case 'singleQuote': {
        if (escapeString && ch === '\\') {
          i += 2;
          break;
        }
        if (ch === "'") {
          if (next === "'") {
            i += 2;
            break;
          }
          state = 'normal';
        }
        i += 1;
        break;
      }
      case 'lineComment': {
        if (ch === '\n') {
          state = 'normal';
        }
        i += 1;
        break;
      }
      case 'blockComment': {
        if (ch === '/' && next === '*') {
          blockDepth += 1;
          i += 2;
          break;
        }
        if (ch === '*' && next === '/') {
          blockDepth -= 1;
          if (blockDepth === 0) state = 'normal';
          i += 2;
          break;
        }
        i += 1;
        break;
      }
      case 'dollar': {
        if (ch === '$' && sql.startsWith(dollarTag, i)) {
          i += dollarTag.length;
          dollarTag = '';
          state = 'normal';
          break;
        }
        i += 1;
        break;
      }
    }
  }

  pushStatement(statements, sql.slice(start));
  return statements;
}

/** Quita espacios y comentarios (de línea y de bloque anidados) que preceden a la sentencia. */
function stripLeadingComments(raw: string): string {
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    const next = raw[i + 1];
    if (/\s/.test(ch)) {
      i += 1;
    } else if (ch === '-' && next === '-') {
      const end = raw.indexOf('\n', i);
      i = end < 0 ? raw.length : end + 1;
    } else if (ch === '/' && next === '*') {
      let depth = 1;
      i += 2;
      while (i < raw.length && depth > 0) {
        if (raw[i] === '/' && raw[i + 1] === '*') {
          depth += 1;
          i += 2;
        } else if (raw[i] === '*' && raw[i + 1] === '/') {
          depth -= 1;
          i += 2;
        } else {
          i += 1;
        }
      }
    } else {
      break;
    }
  }
  return raw.slice(i);
}

function pushStatement(target: string[], raw: string): void {
  const trimmed = stripLeadingComments(raw).trim();
  if (trimmed.length > 0) {
    target.push(trimmed);
  }
}
