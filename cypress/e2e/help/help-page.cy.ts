/**
 * Test: Ayuda
 * URL: /dashboard/help
 *
 * Estado: A IMPLEMENTAR
 */

describe('Help - Página de Ayuda', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/help');
  });

  it('should load help page', () => {
    // A IMPLEMENTAR
    cy.url().should('include', '/dashboard/help');
  });
});
