/**
 * Test: Empleados - Empleados Activos
 * Tab: employees | Subtab: Empleados activos
 * URL: /dashboard/employee?tab=employees&subtab=Empleados activos
 *
 * Estado: A IMPLEMENTAR
 */

describe('Employees - Empleados Activos', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/employee?tab=employees&subtab=Empleados activos');
  });

  it('should navigate to empleados activos tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=employees');
    cy.url().should('include', 'subtab=Empleados activos');
  });
});
