/**
 * Test: Equipos - Solicitudes de Mantenimiento
 * Tab: type_of_repairs | Subtab: created_solicitudes
 * URL: /dashboard/equipment?tab=type_of_repairs&subtab=created_solicitudes
 *
 * Estado: A IMPLEMENTAR
 */

describe('Equipment - Solicitudes de Mantenimiento', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/equipment?tab=type_of_repairs&subtab=created_solicitudes');
  });

  it('should navigate to solicitudes tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=type_of_repairs');
    cy.url().should('include', 'subtab=created_solicitudes');
  });
});
