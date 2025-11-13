/**
 * Test: Empresa - RRHH - Tipos de Diagramas
 * Tab: rrhh | Subtab: listado
 * URL: /dashboard/company/actualCompany?tab=rrhh&subtab=listado
 *
 * Estado: A IMPLEMENTAR
 */

describe('Company - RRHH - Tipos de Diagramas', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/company/actualCompany?tab=rrhh&subtab=listado');
  });

  it('should navigate to listado tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=rrhh');
    cy.url().should('include', 'subtab=listado');
  });
});
