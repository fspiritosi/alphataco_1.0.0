/**
 * Test: Empleados - Diagramas Reportes
 * Tab: diagrams | Subtab: reports
 * URL: /dashboard/employee?tab=diagrams&subtab=reports
 *
 * Estado: A IMPLEMENTAR
 */

describe('Employees - Diagramas Reportes', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/employee?tab=diagrams&subtab=reports');
  });

  it('should navigate to diagrams reports tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=diagrams');
    cy.url().should('include', 'subtab=reports');
  });
});
