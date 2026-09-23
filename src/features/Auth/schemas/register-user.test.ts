import { describe, expect, it } from 'vitest';
import { buildFullname, registerUserSchema } from './register-user';

/** Mensaje del primer issue, que es lo que la action devuelve al cliente. */
function firstError(input: unknown): string | undefined {
  const parsed = registerUserSchema.safeParse(input);
  return parsed.success ? undefined : parsed.error.issues[0]?.message;
}

describe('registerUserSchema', () => {
  const invite = { email: 'nuevo@empresa.com', role: '3' };

  it('acepta una invitación sin contraseña ni nombres y devuelve el rol como número', () => {
    const parsed = registerUserSchema.parse(invite);
    expect(parsed).toEqual({ email: 'nuevo@empresa.com', role: 3 });
  });

  it('descarta los campos que no forman parte del contrato (confirmPassword, customer)', () => {
    const parsed = registerUserSchema.parse({
      ...invite,
      confirmPassword: 'Abcdef1!',
      customer: '00000000-0000-0000-0000-000000000000',
    });
    expect(parsed).not.toHaveProperty('confirmPassword');
    expect(parsed).not.toHaveProperty('customer');
  });

  it('recorta los espacios del email y de los nombres', () => {
    const parsed = registerUserSchema.parse({ ...invite, email: '  nuevo@empresa.com ', firstname: ' Ana ', lastname: ' Diaz ' });
    expect(parsed.email).toBe('nuevo@empresa.com');
    expect(parsed.firstname).toBe('Ana');
    expect(parsed.lastname).toBe('Diaz');
  });

  it('rechaza un email inválido', () => {
    expect(firstError({ ...invite, email: 'no-es-un-email' })).toBe('Email inválido');
  });

  it.each([
    ['vacío', ''],
    ['no numérico', 'admin'],
    ['cero', '0'],
    ['negativo', '-3'],
    ['decimal', '3.5'],
  ])('rechaza un rol %s', (_caso, role) => {
    expect(firstError({ ...invite, role })).toBe('Debes seleccionar un rol.');
  });

  it('acepta el rol como número además de como string', () => {
    expect(registerUserSchema.parse({ ...invite, role: 7 }).role).toBe(7);
  });

  it('acepta una contraseña que cumple la política', () => {
    const parsed = registerUserSchema.parse({ ...invite, password: 'Abcdef1!' });
    expect(parsed.password).toBe('Abcdef1!');
  });

  it.each([
    ['corta', 'Ab1!'],
    ['sin mayúscula', 'abcdef1!'],
    ['sin minúscula', 'ABCDEF1!'],
    ['sin número', 'Abcdefg!'],
    ['sin carácter especial', 'Abcdefg1'],
  ])('rechaza una contraseña %s', (_caso, password) => {
    expect(firstError({ ...invite, password })).toMatch(/^La contraseña/);
  });

  it('ignora una contraseña vacía: es el caso de la invitación', () => {
    expect(registerUserSchema.safeParse({ ...invite, password: '   ' }).success).toBe(true);
  });
});

describe('buildFullname', () => {
  it('une nombre y apellido', () => {
    expect(buildFullname({ firstname: 'Ana', lastname: 'Diaz' })).toBe('Ana Diaz');
  });

  it.each([
    ['sin apellido', { firstname: 'Ana', lastname: undefined }],
    ['sin nombre', { firstname: undefined, lastname: 'Diaz' }],
    ['sin ninguno', { firstname: undefined, lastname: undefined }],
  ])('devuelve vacío %s', (_caso, values) => {
    expect(buildFullname(values)).toBe('');
  });
});
