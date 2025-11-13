/**
 * Test: Documentos - Empleados Permanentes
 * Tab: Documentos de empleados | Subtab: permanentes
 * URL: /dashboard/document?tab=Documentos de empleados&subtab=permanentes
 *
 * Estado: A IMPLEMENTAR
 */

describe('Documents - Empleados Permanentes', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/document?tab=Documentos de empleados&subtab=permanentes');
  });

  it('should navigate to empleados permanentes tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', '/dashboard/document');
  });
});
