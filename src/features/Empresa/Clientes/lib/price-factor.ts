import { Prisma } from '@/generated/prisma/client';

/**
 * Cálculo del factor por el que se multiplica un precio al aplicar una regla de actualización.
 *
 * Los tres métodos del pedido:
 *
 * - **manual**: no hay factor. El usuario escribe cada precio nuevo a mano.
 * - **index**: un único coeficiente. Si un índice pasó de 100 a 115, el coeficiente es 1.15.
 * - **polynomial**: la redeterminación clásica de contratos. El precio se descompone en
 *   componentes con un peso cada uno (mano de obra 0.6, combustible 0.25, materiales 0.15) y
 *   cada componente varía por su propio coeficiente. El factor es la suma ponderada:
 *   `Σ (peso_i × coeficiente_i)`.
 *
 * Todo en `Decimal`. Un `number` de JS no representa exactamente 0.1 ni 0.6, y acá cada error
 * se multiplica por un precio y se suma a lo largo de una certificación entera.
 */

/** Un componente de la fórmula polinómica: cuánto pesa y cuánto varió. */
export interface PolynomialComponent {
  /** Nombre del componente (mano de obra, combustible...). Sólo para mostrar. */
  name: string;
  /** Peso dentro del precio. Los pesos de todos los componentes deben sumar 1. */
  weight: Prisma.Decimal | string | number;
  /** Cuánto varió ese componente. 1.15 = subió 15%. */
  coefficient: Prisma.Decimal | string | number;
}

export class PriceFactorError extends Error {}

/** Suma de los pesos, para validar que la fórmula esté completa. */
export function sumWeights(components: PolynomialComponent[]): Prisma.Decimal {
  return components.reduce((acc, c) => acc.plus(new Prisma.Decimal(c.weight)), new Prisma.Decimal(0));
}

/**
 * Factor de una fórmula polinómica.
 *
 * @throws {PriceFactorError} si no hay componentes, si algún peso o coeficiente es negativo,
 * o si los pesos no suman exactamente 1: una fórmula incompleta no "aproxima", deja de
 * representar el precio entero y el resultado sería un aumento silenciosamente equivocado.
 */
export function polynomialFactor(components: PolynomialComponent[]): Prisma.Decimal {
  if (components.length === 0) throw new PriceFactorError('La fórmula no tiene componentes');

  let factor = new Prisma.Decimal(0);
  for (const component of components) {
    const weight = new Prisma.Decimal(component.weight);
    const coefficient = new Prisma.Decimal(component.coefficient);
    if (weight.isNegative()) throw new PriceFactorError(`El peso de "${component.name}" es negativo`);
    if (coefficient.isNegative()) {
      throw new PriceFactorError(`El coeficiente de "${component.name}" es negativo`);
    }
    factor = factor.plus(weight.times(coefficient));
  }

  const total = sumWeights(components);
  if (!total.equals(1)) {
    throw new PriceFactorError(`Los pesos de la fórmula suman ${total.toString()} y tienen que sumar 1`);
  }

  return factor;
}

/** Factor de un índice simple. */
export function indexFactor(coefficient: Prisma.Decimal | string | number): Prisma.Decimal {
  const value = new Prisma.Decimal(coefficient);
  if (!value.isFinite() || value.isNegative()) {
    throw new PriceFactorError('El coeficiente del índice tiene que ser un número no negativo');
  }
  return value;
}

/**
 * Aplica un factor a un precio y lo deja con la escala de la columna (4 decimales).
 *
 * El redondeo es `ROUND_HALF_UP`, que es lo que espera cualquiera que rehaga la cuenta a mano.
 */
export function applyFactor(
  price: Prisma.Decimal | string | number,
  factor: Prisma.Decimal | string | number
): Prisma.Decimal {
  return new Prisma.Decimal(price).times(new Prisma.Decimal(factor)).toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP);
}
