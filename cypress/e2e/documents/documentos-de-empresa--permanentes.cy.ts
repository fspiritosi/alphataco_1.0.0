/**
 * Test: Documentos - Empresa Permanentes
 * Tab: Documentos de empresa | Subtab: permanentes
 * URL: /dashboard/document?tab=Documentos de empresa&subtab=permanentes
 *
 * Estado: A IMPLEMENTAR
 */

describe('Documents - Empresa Permanentes', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/document?tab=Documentos de empresa&subtab=permanentes');
  });

  it('should navigate to empresa permanentes tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', '/dashboard/document');
  });
});
