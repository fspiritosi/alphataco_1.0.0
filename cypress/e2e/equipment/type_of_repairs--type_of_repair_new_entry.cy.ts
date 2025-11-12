/**
 * Test: Equipos - Nueva Solicitud de Mantenimiento
 * Tab: type_of_repairs | Subtab: type_of_repair_new_entry
 * URL: /dashboard/equipment?tab=type_of_repairs&subtab=type_of_repair_new_entry
 *
 * Estado: A IMPLEMENTAR
 */

describe('Equipment - Nueva Solicitud', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/equipment?tab=type_of_repairs&subtab=type_of_repair_new_entry');
  });

  it('should navigate to nueva solicitud tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=type_of_repairs');
    cy.url().should('include', 'subtab=type_of_repair_new_entry');
  });
});
