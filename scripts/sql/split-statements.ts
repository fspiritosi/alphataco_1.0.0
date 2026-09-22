/**
 * Divide un script SQL en sentencias de nivel superior.
 *
 * Escáner de un solo paso que respeta:
 *  - strings con comillas simples (escape `''`)
 *  - comentarios de línea `--` y de bloque `/* ... *\/`
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
        if (ch === '*' && next === '/') {
          state = 'normal';
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

const LEADING_COMMENT_RE = /^(?:\s*(?:--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/))*\s*/;

function pushStatement(target: string[], raw: string): void {
  const trimmed = raw.replace(LEADING_COMMENT_RE, '').trim();
  if (trimmed.length > 0) {
    target.push(trimmed);
  }
}
