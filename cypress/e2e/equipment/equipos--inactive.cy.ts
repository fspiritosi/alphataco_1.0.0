/**
 * Test: Equipos - Inactivos
 * Tab: equipos | Subtab: inactive
 * URL: /dashboard/equipment?tab=equipos&subtab=inactive
 *
 * Estado: A IMPLEMENTAR
 */

describe('Equipment - Inactivos', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/equipment?tab=equipos&subtab=inactive');
  });

  it('should navigate to inactive tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=equipos');
    cy.url().should('include', 'subtab=inactive');
  });
});
