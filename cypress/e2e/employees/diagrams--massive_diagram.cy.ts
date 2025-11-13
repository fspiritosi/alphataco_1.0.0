/**
 * Test: Empleados - Diagramas Masivo
 * Tab: diagrams | Subtab: massive_diagram
 * URL: /dashboard/employee?tab=diagrams&subtab=massive_diagram
 *
 * Estado: A IMPLEMENTAR
 */

describe('Employees - Diagramas Masivo', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/employee?tab=diagrams&subtab=massive_diagram');
  });

  it('should navigate to diagrams massive tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=diagrams');
    cy.url().should('include', 'subtab=massive_diagram');
  });
});
