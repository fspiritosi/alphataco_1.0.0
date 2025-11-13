/**
 * Test: Empresa - RRHH - Tipos de Novedades
 * Tab: rrhh | Subtab: diagrams
 * URL: /dashboard/company/actualCompany?tab=rrhh&subtab=diagrams
 *
 * Estado: A IMPLEMENTAR
 */

describe('Company - RRHH - Tipos de Novedades', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/company/actualCompany?tab=rrhh&subtab=diagrams');
  });

  it('should navigate to diagrams tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=rrhh');
    cy.url().should('include', 'subtab=diagrams');
  });
});
