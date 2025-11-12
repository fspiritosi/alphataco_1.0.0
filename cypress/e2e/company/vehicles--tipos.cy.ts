/**
 * Test: Empresa - Vehicles - Tipos de Unidad
 * Tab: vehicles | Subtab: tipos
 * URL: /dashboard/company/actualCompany?tab=vehicles&subtab=tipos
 *
 * Estado: A IMPLEMENTAR
 */

describe('Company - Vehicles - Tipos', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/company/actualCompany?tab=vehicles&subtab=tipos');
  });

  it('should navigate to tipos tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=vehicles');
    cy.url().should('include', 'subtab=tipos');
  });
});
