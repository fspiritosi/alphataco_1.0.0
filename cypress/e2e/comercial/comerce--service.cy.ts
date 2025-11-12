/**
 * Test: Comercial - Contratos/Servicios
 * Tab: comerce | Subtab: service
 * URL: /dashboard/comercial?tab=comerce&subtab=service
 *
 * Estado: A IMPLEMENTAR
 */

describe('Comercial - Contratos', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/comercial?tab=comerce&subtab=service');
  });

  it('should navigate to service tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=comerce');
    cy.url().should('include', 'subtab=service');
  });
});
