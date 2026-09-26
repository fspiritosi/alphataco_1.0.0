/**
 * Test: Empresa - Vehicles - Modelos
 * Tab: vehicles | Subtab: modelos
 * URL: /dashboard/configuration?tab=vehicles&subtab=modelos
 *
 * Estado: A IMPLEMENTAR
 */

describe('Company - Vehicles - Modelos', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/configuration?tab=vehicles&subtab=modelos');
  });

  it('should navigate to modelos tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=vehicles');
    cy.url().should('include', 'subtab=modelos');
  });
});
