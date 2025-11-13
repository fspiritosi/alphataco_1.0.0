/**
 * Test: Empleados - Cargar Diagramas
 * Tab: diagrams | Subtab: new
 * URL: /dashboard/employee?tab=diagrams&subtab=new
 *
 * Estado: A IMPLEMENTAR
 */

describe('Employees - Cargar Diagramas', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/employee?tab=diagrams&subtab=new');
  });

  it('should navigate to diagrams new tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=diagrams');
    cy.url().should('include', 'subtab=new');
  });
});
