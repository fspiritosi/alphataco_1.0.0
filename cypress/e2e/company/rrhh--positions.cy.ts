/**
 * Test: Empresa - RRHH - Puestos
 * Tab: rrhh | Subtab: positions
 * URL: /dashboard/configuration?tab=rrhh&subtab=positions
 *
 * Estado: A IMPLEMENTAR
 */

describe('Company - RRHH - Positions', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/configuration?tab=rrhh&subtab=positions');
  });

  it('should navigate to positions tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=rrhh');
    cy.url().should('include', 'subtab=positions');
  });
});
