/**
 * Test: Empleados - Tipos de Documentos
 * Tab: Tipos de documentos
 * URL: /dashboard/employee?tab=Tipos de documentos
 *
 * Estado: A IMPLEMENTAR
 */

describe('Employees - Tipos de Documentos', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/employee?tab=Tipos de documentos');
  });

  it('should navigate to tipos de documentos tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', '/dashboard/employee');
  });
});
