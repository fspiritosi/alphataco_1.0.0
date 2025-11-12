/**
 * Test: Comercial - Equipos
 * Tab: comerce | Subtab: equipment
 * URL: /dashboard/comercial?tab=comerce&subtab=equipment
 *
 * Estado: A IMPLEMENTAR
 */

describe('Comercial - Equipos', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/comercial?tab=comerce&subtab=equipment');
  });

  it('should navigate to equipment tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=comerce');
    cy.url().should('include', 'subtab=equipment');
  });
});
