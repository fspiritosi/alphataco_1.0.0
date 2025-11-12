/**
 * Test: Empleados - Documentos Mensuales
 * Tab: Documentos de empleados | Subtab: mensuales
 * URL: /dashboard/employee?tab=Documentos de empleados&subtab=mensuales
 *
 * Estado: A IMPLEMENTAR
 */

describe('Employees - Documentos Mensuales', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/employee?tab=Documentos de empleados&subtab=mensuales');
  });

  it('should navigate to documentos mensuales tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', '/dashboard/employee');
  });
});
