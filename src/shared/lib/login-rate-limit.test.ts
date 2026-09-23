import { beforeEach, describe, expect, it } from 'vitest';
import { clearAttempts, consumeAttempt, resetRateLimitStore, type RateLimitRule } from './login-rate-limit';

const RULE: RateLimitRule = { max: 3, windowSeconds: 60 };

describe('login-rate-limit', () => {
  beforeEach(() => resetRateLimitStore());

  it('deja pasar hasta el tope y corta después', () => {
    expect(consumeAttempt('k', RULE).allowed).toBe(true);
    expect(consumeAttempt('k', RULE).allowed).toBe(true);
    expect(consumeAttempt('k', RULE).allowed).toBe(true);
    expect(consumeAttempt('k', RULE).allowed).toBe(false);
  });

  it('cuando corta informa cuánto falta para que se libere', () => {
    for (let i = 0; i < RULE.max; i++) consumeAttempt('k', RULE);
    const blocked = consumeAttempt('k', RULE);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(RULE.windowSeconds);
  });

  it('las claves son independientes: un email bloqueado no bloquea a otro', () => {
    for (let i = 0; i < RULE.max + 1; i++) consumeAttempt('a@b.c', RULE);
    expect(consumeAttempt('a@b.c', RULE).allowed).toBe(false);
    expect(consumeAttempt('otro@b.c', RULE).allowed).toBe(true);
  });

  it('un login exitoso limpia el contador (sólo cuentan los fallidos)', () => {
    consumeAttempt('k', RULE);
    consumeAttempt('k', RULE);
    clearAttempts('k');

    // Vuelve a tener el presupuesto entero.
    expect(consumeAttempt('k', RULE).allowed).toBe(true);
    expect(consumeAttempt('k', RULE).allowed).toBe(true);
    expect(consumeAttempt('k', RULE).allowed).toBe(true);
    expect(consumeAttempt('k', RULE).allowed).toBe(false);
  });

  it('la ventana vence y el contador arranca de cero', () => {
    const corta: RateLimitRule = { max: 1, windowSeconds: 0 };
    expect(consumeAttempt('k', corta).allowed).toBe(true);
    // `windowSeconds: 0` deja `resetAt` en el pasado inmediato: el siguiente intento abre
    // ventana nueva en vez de sumar al contador viejo.
    expect(consumeAttempt('k', corta).allowed).toBe(true);
  });
});
