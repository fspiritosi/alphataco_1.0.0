/**
 * Test: Comercial - Clientes
 * Tab: comerce | Subtab: customers
 * URL: /dashboard/comercial?tab=comerce&subtab=customers
 *
 * Estado: A IMPLEMENTAR
 */

describe('Comercial - Clientes', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/comercial?tab=comerce&subtab=customers');
  });

  it('should navigate to customers tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=comerce');
    cy.url().should('include', 'subtab=customers');
  });
});
