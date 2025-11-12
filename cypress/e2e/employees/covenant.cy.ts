/**
 * Test: Empleados - CCT
 * Tab: covenant
 * URL: /dashboard/employee?tab=covenant
 *
 * Estado: A IMPLEMENTAR
 */

describe('Employees - CCT', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/employee?tab=covenant');
  });

  it('should navigate to covenant tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=covenant');
  });
});
