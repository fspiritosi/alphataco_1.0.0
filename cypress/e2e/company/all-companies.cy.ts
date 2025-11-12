/**
 * Test: Todas las Compañías
 * URL: /dashboard/company
 *
 * Estado: A IMPLEMENTAR
 */

describe('Company - All Companies', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/company');
  });

  it('should load all companies view', () => {
    // A IMPLEMENTAR
    cy.url().should('include', '/dashboard/company');
  });
});
