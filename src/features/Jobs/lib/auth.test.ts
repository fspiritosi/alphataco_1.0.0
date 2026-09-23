import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { authorizeJobRequest } from './auth';

/**
 * El token de los jobs es la única barrera de `/api/jobs/*`: no hay sesión detrás. Estos
 * tests fijan el contrato que el resto del sistema asume (sin token → nadie entra) y sirven
 * de red para cualquier reescritura de la comparación en tiempo constante.
 */
function request(header?: string): Request {
  return new Request('http://localhost:3000/api/jobs/daily-indicators', {
    headers: header ? { authorization: header } : {},
  });
}

const ORIGINAL_TOKEN = process.env.JOBS_TOKEN;

describe('authorizeJobRequest', () => {
  beforeEach(() => {
    process.env.JOBS_TOKEN = 'un-token-de-prueba-largo';
  });

  afterEach(() => {
    if (ORIGINAL_TOKEN === undefined) delete process.env.JOBS_TOKEN;
    else process.env.JOBS_TOKEN = ORIGINAL_TOKEN;
  });

  it('acepta el token exacto', () => {
    expect(authorizeJobRequest(request('Bearer un-token-de-prueba-largo'))).toBe('ok');
  });

  it('tolera espacios alrededor del token (los mete el crontab al expandir la variable)', () => {
    expect(authorizeJobRequest(request('Bearer   un-token-de-prueba-largo  '))).toBe('ok');
  });

  it('rechaza un token distinto del mismo largo', () => {
    expect(authorizeJobRequest(request('Bearer un-token-de-prueba-largX'))).toBe('invalid-token');
  });

  it('rechaza un prefijo del token válido', () => {
    expect(authorizeJobRequest(request('Bearer un-token-de-prueba'))).toBe('invalid-token');
  });

  it('rechaza el token válido con algo agregado', () => {
    expect(authorizeJobRequest(request('Bearer un-token-de-prueba-largo-y-mas'))).toBe('invalid-token');
  });

  it('rechaza si no hay header Authorization', () => {
    expect(authorizeJobRequest(request())).toBe('invalid-token');
  });

  it('rechaza si el header no es Bearer', () => {
    expect(authorizeJobRequest(request('Basic dW46cHc='))).toBe('invalid-token');
  });

  it('rechaza "Bearer" sin token', () => {
    expect(authorizeJobRequest(request('Bearer '))).toBe('invalid-token');
  });

  it('es sensible a mayúsculas', () => {
    expect(authorizeJobRequest(request('Bearer UN-TOKEN-DE-PRUEBA-LARGO'))).toBe('invalid-token');
  });

  describe('sin JOBS_TOKEN configurado', () => {
    beforeEach(() => {
      delete process.env.JOBS_TOKEN;
    });

    it('no deja entrar a nadie, ni siquiera con un header vacío', () => {
      // La alternativa —"sin token configurado, pasa cualquiera"— convertiría un despliegue
      // con la variable vacía en tres endpoints abiertos que mandan correos.
      expect(authorizeJobRequest(request())).toBe('token-not-configured');
      expect(authorizeJobRequest(request('Bearer '))).toBe('token-not-configured');
      expect(authorizeJobRequest(request('Bearer lo-que-sea'))).toBe('token-not-configured');
    });

    it('tampoco con el token vacío explícito', () => {
      process.env.JOBS_TOKEN = '   ';
      expect(authorizeJobRequest(request('Bearer    '))).toBe('token-not-configured');
    });
  });
});
