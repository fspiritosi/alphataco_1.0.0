import { describe, expect, it } from 'vitest';
import { splitSqlStatements } from './split-statements';

describe('splitSqlStatements', () => {
  it('separa por punto y coma a nivel superior', () => {
    expect(splitSqlStatements('select 1; select 2;')).toEqual(['select 1', 'select 2']);
  });
  it('no corta dentro de dollar-quotes con o sin etiqueta', () => {
    const sql = "create function f() returns void language plpgsql as $function$ begin perform 1; end; $function$; create function g() returns int language sql as $$ select 1; $$;";
    const out = splitSqlStatements(sql);
    expect(out).toHaveLength(2);
    expect(out[0]).toContain('perform 1; end;');
  });
  it('no corta dentro de strings ni comentarios', () => {
    const sql = "insert into t values ('a;b'); -- comentario; con punto y coma\nselect /* x; y */ 3;";
    expect(splitSqlStatements(sql)).toEqual(["insert into t values ('a;b')", 'select /* x; y */ 3']);
  });
  it('ignora sentencias vacías', () => {
    expect(splitSqlStatements(';;\n  ;')).toEqual([]);
  });
  it('anida comentarios de bloque como Postgres', () => {
    expect(splitSqlStatements('/* outer /* inner */ still outer */ select 1;')).toEqual(['select 1']);
    expect(splitSqlStatements('/* outer /* inner */ still outer */')).toEqual([]);
  });
  it('respeta el escape por backslash en strings E\'...\'', () => {
    expect(splitSqlStatements("select E'a\\';b'; select 2;")).toEqual(["select E'a\\';b'", 'select 2']);
  });
});
