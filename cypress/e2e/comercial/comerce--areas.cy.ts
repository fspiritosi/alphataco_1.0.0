/**
 * Test: Comercial - Áreas
 * Tab: comerce | Subtab: areas
 * URL: /dashboard/comercial?tab=comerce&subtab=areas
 *
 * Estado: A IMPLEMENTAR
 */

describe('Comercial - Áreas', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/comercial?tab=comerce&subtab=areas');
  });

  it('should navigate to areas tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=comerce');
    cy.url().should('include', 'subtab=areas');
  });
});
