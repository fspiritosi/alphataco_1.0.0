/**
 * Test: Empresa - RRHH - CCT
 * Tab: rrhh | Subtab: convenios
 * URL: /dashboard/company/actualCompany?tab=rrhh&subtab=convenios
 *
 * Estado: A IMPLEMENTAR
 */

describe('Company - RRHH - CCT', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/company/actualCompany?tab=rrhh&subtab=convenios');
  });

  it('should navigate to convenios tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=rrhh');
    cy.url().should('include', 'subtab=convenios');
  });
});
