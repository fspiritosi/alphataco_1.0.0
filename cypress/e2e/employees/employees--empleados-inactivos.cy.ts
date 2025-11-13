/**
 * Test: Empleados - Empleados Inactivos
 * Tab: employees | Subtab: Empleados inactivos
 * URL: /dashboard/employee?tab=employees&subtab=Empleados inactivos
 *
 * Estado: A IMPLEMENTAR
 */

describe('Employees - Empleados Inactivos', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/employee?tab=employees&subtab=Empleados inactivos');
  });

  it('should navigate to empleados inactivos tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=employees');
    cy.url().should('include', 'subtab=Empleados inactivos');
  });
});
