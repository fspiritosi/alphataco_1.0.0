import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CLIENT_UPLOAD_BUCKETS,
  COMPANY_PREFIXED_BUCKETS,
  STORAGE_BUCKETS,
  companyIdFromKey,
  isClientUploadBucket,
  isCompanyPrefixedBucket,
  isStorageBucket,
} from './storage-buckets';

const COMPANY = '11111111-2222-3333-4444-555555555555';

describe('STORAGE_BUCKETS', () => {
  it('coincide exactamente con los buckets que crea `minio-init` en el compose', () => {
    const compose = readFileSync('docker-compose.yml', 'utf8');
    const match = compose.match(/for b in ([^;]+); do mc mb/);
    expect(match).not.toBeNull();
    const fromCompose = (match as RegExpMatchArray)[1].trim().split(/\s+/);
    expect([...fromCompose].sort()).toEqual([...STORAGE_BUCKETS].sort());
  });

  it('el compose los crea privados', () => {
    expect(readFileSync('docker-compose.yml', 'utf8')).toContain('mc anonymous set none');
  });
});

describe('isStorageBucket', () => {
  it('sólo acepta los buckets conocidos', () => {
    expect(isStorageBucket('document-files')).toBe(true);
    expect(isStorageBucket('preparte-img')).toBe(true);
    // Sobraba en el compose y no lo usa nadie desde que se borró `/api/upload`.
    expect(isStorageBucket('employee-documents')).toBe(false);
    expect(isStorageBucket('../etc')).toBe(false);
    expect(isStorageBucket(undefined)).toBe(false);
  });
});

describe('COMPANY_PREFIXED_BUCKETS', () => {
  it('son todos buckets conocidos', () => {
    for (const bucket of COMPANY_PREFIXED_BUCKETS) expect(isStorageBucket(bucket)).toBe(true);
  });

  it('los buckets de documentos NO son de prefijo: su dueño se resuelve en la base', () => {
    expect(isCompanyPrefixedBucket('document-files')).toBe(false);
    expect(isCompanyPrefixedBucket('daily-reports')).toBe(false);
    expect(isCompanyPrefixedBucket('contract-documents')).toBe(false);
  });
});

describe('CLIENT_UPLOAD_BUCKETS', () => {
  it('sólo avatar y preparte-img se suben desde el navegador', () => {
    expect([...CLIENT_UPLOAD_BUCKETS].sort()).toEqual(['avatar', 'preparte-img']);
  });

  it('los buckets de documentos no aceptan subidas del cliente', () => {
    expect(isClientUploadBucket('document-files')).toBe(false);
    expect(isClientUploadBucket('logo')).toBe(false);
    expect(isClientUploadBucket('contract-documents')).toBe(false);
  });

  it('preparte-img lleva prefijo de empresa; avatar cuelga del perfil', () => {
    expect(isCompanyPrefixedBucket('preparte-img')).toBe(true);
    // El avatar es de la persona: colgarlo de la empresa le daba un avatar por empresa a
    // quien pertenece a varias, y 404 a los compañeros de la otra.
    expect(isCompanyPrefixedBucket('avatar')).toBe(false);
  });
});

describe('companyIdFromKey', () => {
  it('devuelve el uuid del primer segmento', () => {
    expect(companyIdFromKey(`${COMPANY}/logo/logo.png`)).toBe(COMPANY);
    expect(companyIdFromKey(`${COMPANY}`)).toBe(COMPANY);
  });

  it('null si el primer segmento no es un uuid', () => {
    expect(companyIdFromKey('other-equipment-pictures/1/a.jpg')).toBeNull();
    expect(companyIdFromKey('a.jpg')).toBeNull();
    expect(companyIdFromKey('')).toBeNull();
  });
});
