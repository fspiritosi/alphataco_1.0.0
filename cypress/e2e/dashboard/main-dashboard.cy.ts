/**
 * Test: Dashboard Principal
 * URL: /dashboard
 *
 * Estado: A IMPLEMENTAR
 *
 * Este test validará la vista principal del dashboard
 */

describe('Dashboard Principal', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard');
  });

  it('should load dashboard', () => {
    // A IMPLEMENTAR
    cy.url().should('include', '/dashboard');
  });
});
