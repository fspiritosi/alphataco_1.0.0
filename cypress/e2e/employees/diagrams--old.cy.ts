/**
 * Test: Empleados - Diagramas Cargados
 * Tab: diagrams | Subtab: old
 * URL: /dashboard/employee?tab=diagrams&subtab=old
 *
 * Estado: A IMPLEMENTAR
 */

describe('Employees - Diagramas Cargados', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/employee?tab=diagrams&subtab=old');
  });

  it('should navigate to diagrams old tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=diagrams');
    cy.url().should('include', 'subtab=old');
  });
});
