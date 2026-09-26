/**
 * Test: Empresa - General - Centro de Costos
 * Tab: general | Subtab: cost-center
 * URL: /dashboard/configuration?tab=general&subtab=cost-center
 *
 * Estado: A IMPLEMENTAR
 */

describe('Company - General - Cost Center', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/configuration?tab=general&subtab=cost-center');
  });

  it('should navigate to cost center tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=general');
    cy.url().should('include', 'subtab=cost-center');
  });
});
