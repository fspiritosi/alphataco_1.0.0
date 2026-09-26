/**
 * Test: Empresa - RRHH - Aptitudes Técnicas
 * Tab: rrhh | Subtab: aptitudes
 * URL: /dashboard/configuration?tab=rrhh&subtab=aptitudes
 *
 * Estado: A IMPLEMENTAR
 */

describe('Company - RRHH - Aptitudes', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/configuration?tab=rrhh&subtab=aptitudes');
  });

  it('should navigate to aptitudes tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=rrhh');
    cy.url().should('include', 'subtab=aptitudes');
  });
});
