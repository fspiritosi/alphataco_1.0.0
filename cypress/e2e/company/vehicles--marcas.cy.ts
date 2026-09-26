/**
 * Test: Empresa - Vehicles - Marcas
 * Tab: vehicles | Subtab: marcas
 * URL: /dashboard/configuration?tab=vehicles&subtab=marcas
 *
 * Estado: A IMPLEMENTAR
 */

describe('Company - Vehicles - Marcas', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/configuration?tab=vehicles&subtab=marcas');
  });

  it('should navigate to marcas tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=vehicles');
    cy.url().should('include', 'subtab=marcas');
  });
});
