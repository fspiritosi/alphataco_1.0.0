/**
 * Test: Empleados - Documentos Permanentes
 * Tab: Documentos de empleados | Subtab: permanentes
 * URL: /dashboard/employee?tab=Documentos de empleados&subtab=permanentes
 *
 * Estado: A IMPLEMENTAR
 */

describe('Employees - Documentos Permanentes', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/employee?tab=Documentos de empleados&subtab=permanentes');
  });

  it('should navigate to documentos permanentes tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', '/dashboard/employee');
  });
});
