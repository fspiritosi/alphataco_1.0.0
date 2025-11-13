/**
 * Test: Equipos - Otros
 * Tab: equipos | Subtab: others
 * URL: /dashboard/equipment?tab=equipos&subtab=others
 *
 * Estado: A IMPLEMENTAR
 */

describe('Equipment - Otros', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/equipment?tab=equipos&subtab=others');
  });

  it('should navigate to others tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=equipos');
    cy.url().should('include', 'subtab=others');
  });
});
