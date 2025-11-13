/**
 * Test: Equipos - Vehículos
 * Tab: equipos | Subtab: vehicles
 * URL: /dashboard/equipment?tab=equipos&subtab=vehicles
 *
 * Estado: A IMPLEMENTAR
 */

describe('Equipment - Vehículos', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/equipment?tab=equipos&subtab=vehicles');
  });

  it('should navigate to vehicles tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=equipos');
    cy.url().should('include', 'subtab=vehicles');
  });
});
