/**
 * Test: Equipos - Grupos de Mantenimiento
 * Tab: type_of_repairs | Subtab: maintenance_groups
 * URL: /dashboard/equipment?tab=type_of_repairs&subtab=maintenance_groups
 *
 * Estado: A IMPLEMENTAR
 */

describe('Equipment - Grupos de Mantenimiento', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/equipment?tab=type_of_repairs&subtab=maintenance_groups');
  });

  it('should navigate to grupos de mantenimiento tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=type_of_repairs');
    cy.url().should('include', 'subtab=maintenance_groups');
  });
});
