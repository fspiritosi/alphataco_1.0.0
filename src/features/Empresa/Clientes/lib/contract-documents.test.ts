import { describe, expect, it } from 'vitest';
import { buildContractDocumentPath, classifyDocumentType, safeFolderName } from './contract-documents';

describe('safeFolderName', () => {
  it('normaliza a minúsculas, guiones bajos y sin símbolos', () => {
    expect(safeFolderName('  Vista Oil & Gas S.A. ')).toBe('vista_oil_gas_sa');
  });

  it('vacío → default', () => {
    expect(safeFolderName('')).toBe('default');
  });
});

describe('classifyDocumentType', () => {
  it('por mime', () => {
    expect(classifyDocumentType('application/pdf', 'a.pdf')).toBe('pdf');
    expect(classifyDocumentType('image/png', 'a.png')).toBe('image');
    expect(classifyDocumentType('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'a.xlsx')).toBe(
      'spreadsheet'
    );
    expect(classifyDocumentType('application/msword', 'a.doc')).toBe('document');
  });

  it('por extensión cuando el mime no ayuda', () => {
    expect(classifyDocumentType('application/octet-stream', 'plan.XLS')).toBe('spreadsheet');
    expect(classifyDocumentType('', 'nota.docx')).toBe('document');
    expect(classifyDocumentType('', 'raro.bin')).toBe('otro');
  });
});

describe('buildContractDocumentPath', () => {
  it('cuelga del id de empresa y sanea el nombre del archivo', () => {
    const path = buildContractDocumentPath({
      companyId: 'c1',
      customerId: 'k1',
      contractId: 's1',
      fileName: 'Contrato Marco (v2).pdf',
      now: 1700000000000,
    });
    expect(path).toBe('c1/k1/s1/1700000000000_contrato_marco_v2.pdf');
  });

  it('un path sólo pertenece a la empresa si empieza con su carpeta', () => {
    const path = buildContractDocumentPath({ companyId: 'c1', customerId: 'k1', contractId: 's1', fileName: 'a.pdf' });
    expect(path.startsWith('c1/')).toBe(true);
  });
});
