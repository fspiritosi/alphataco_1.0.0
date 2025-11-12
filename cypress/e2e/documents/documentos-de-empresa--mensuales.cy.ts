/**
 * Test: Documentos - Empresa Mensuales
 * Tab: Documentos de empresa | Subtab: mensuales
 * URL: /dashboard/document?tab=Documentos de empresa&subtab=mensuales
 *
 * Estado: A IMPLEMENTAR
 */

describe('Documents - Empresa Mensuales', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/document?tab=Documentos de empresa&subtab=mensuales');
  });

  it('should navigate to empresa mensuales tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', '/dashboard/document');
  });
});
