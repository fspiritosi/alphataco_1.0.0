/**
 * Datos personales argentinos de la demo: CUIL con digito verificador valido (el mismo calculo
 * que `validarCUIL` de la app), calles de Neuquen y telefonos del area 299.
 */
import type { Faker } from '@faker-js/faker';
import { pick } from './random.ts';

const STREETS = [
  'Av. Argentina', 'Av. Olascoaga', 'Belgrano', 'Sarmiento', 'Leloir', 'Brown', 'Perito Moreno', 'San Martín',
  'Av. Mosconi', 'Juan B. Justo', 'Tucumán', 'Santa Fe', 'Rivadavia', 'Alderete', 'Anaya', 'Linares',
  'Planas', 'Obrero Argentino', 'Godoy', 'Lanín', 'Chocón', 'Río Negro', 'Salta', 'Misiones',
];

export function cuilFor(prefix: '20' | '27' | '23', dni: string): string {
  const base = `${prefix}${dni.padStart(8, '0')}`;
  const coef = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = coef.reduce((acc, c, i) => acc + c * Number(base[i]), 0);
  let check = 11 - (sum % 11);
  if (check === 11) check = 0;
  if (check === 10) return cuilFor('23', dni);
  return `${base}${check}`;
}

export interface Person {
  firstname: string;
  lastname: string;
  gender: 'Masculino' | 'Femenino';
  dni: string;
  cuil: string;
  bornDate: string;
  street: string;
  streetNumber: string;
  phone: string;
}

/** `usedDni` evita repetir documento (unico global en `employees` y `pre_employees`). */
export function makePerson(faker: Faker, usedDni: Set<string>, opts: { female?: boolean; age?: [number, number]; today: string }): Person {
  const female = opts.female ?? faker.datatype.boolean({ probability: 0.18 });
  const sex = female ? 'female' : 'male';
  const firstname = faker.person.firstName(sex);
  const lastname = faker.person.lastName();
  const [minAge, maxAge] = opts.age ?? [21, 62];
  const age = faker.number.int({ min: minAge, max: maxAge });
  const year = Number(opts.today.slice(0, 4)) - age;
  const born = `${year}-${String(faker.number.int({ min: 1, max: 12 })).padStart(2, '0')}-${String(faker.number.int({ min: 1, max: 28 })).padStart(2, '0')}`;
  // El DNI crece con los años: ~45 millones para los nacidos en 2004, ~14 millones en 1960.
  let dni = '';
  do {
    const approx = 14_000_000 + (year - 1960) * 700_000;
    dni = String(approx + faker.number.int({ min: -350_000, max: 350_000 }));
  } while (usedDni.has(dni));
  usedDni.add(dni);
  return {
    firstname,
    lastname,
    gender: female ? 'Femenino' : 'Masculino',
    dni,
    cuil: cuilFor(female ? '27' : '20', dni),
    bornDate: born,
    street: pick(faker, STREETS),
    streetNumber: String(faker.number.int({ min: 50, max: 4800 })),
    phone: `299${faker.number.int({ min: 4000000, max: 6999999 })}`,
  };
}

/** Email corporativo a partir del nombre, sin tildes. */
export function corporateEmail(firstname: string, lastname: string, domain = 'patagonia-demo.com.ar'): string {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z]/g, '');
  return `${clean(firstname).charAt(0)}${clean(lastname)}@${domain}`;
}
