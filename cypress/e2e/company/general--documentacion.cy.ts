/**
 * Test: Empresa - General - Documentación
 * Tab: general | Subtab: "documentacion"
 * URL: /dashboard/configuration?tab=general&subtab="documentacion"
 *
 * Estado: A IMPLEMENTAR
 */

describe('Company - General - Documentacion', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/configuration?tab=general&subtab="documentacion"');
  });

  it('should navigate to documentacion tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=general');
  });
});
