/**
 * Test: Mantenimiento - Tipos de Reparación
 * Tab: type_of_repairs | Subtab: type_of_repair
 * URL: /dashboard/maintenance?tab=type_of_repairs&subtab=type_of_repair
 *
 * Estado: A IMPLEMENTAR
 */

describe('Maintenance - Tipos de Reparación', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/maintenance?tab=type_of_repairs&subtab=type_of_repair');
  });

  it('should navigate to tipos de reparacion tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=type_of_repairs');
    cy.url().should('include', 'subtab=type_of_repair');
  });
});
