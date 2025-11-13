/**
 * Test: Comercial - Unidades de Medida
 * Tab: comerce | Subtab: mensure_units
 * URL: /dashboard/comercial?tab=comerce&subtab=mensure_units
 *
 * Estado: A IMPLEMENTAR
 */

describe('Comercial - Unidades de Medida', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/comercial?tab=comerce&subtab=mensure_units');
  });

  it('should navigate to mensure units tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=comerce');
    cy.url().should('include', 'subtab=mensure_units');
  });
});
