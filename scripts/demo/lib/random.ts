/**
 * Azar determinista de la demo. Todo sale de Faker con semilla fija, asi la "identidad" de
 * la demo (nombres, legajos, patentes, clientes) es la misma todos los dias: lo unico que
 * cambia de un reset a otro son las fechas, que son relativas a hoy.
 */
import { Faker, es, base } from '@faker-js/faker';

export const DEMO_SEED = 20260101;

export function createFaker(): Faker {
  const faker = new Faker({ locale: [es, base] });
  faker.seed(DEMO_SEED);
  return faker;
}

/** Elige segun pesos: `weighted(f, [['a', 80], ['b', 20]])`. */
export function weighted<T>(faker: Faker, options: Array<[T, number]>): T {
  const total = options.reduce((acc, [, w]) => acc + w, 0);
  let roll = faker.number.float({ min: 0, max: total });
  for (const [value, w] of options) {
    roll -= w;
    if (roll <= 0) return value;
  }
  return options[options.length - 1][0];
}

/** `n` elementos distintos al azar. */
export function sample<T>(faker: Faker, items: readonly T[], n: number): T[] {
  return faker.helpers.shuffle([...items]).slice(0, Math.min(n, items.length));
}

export function pick<T>(faker: Faker, items: readonly T[]): T {
  return faker.helpers.arrayElement(items as T[]);
}
