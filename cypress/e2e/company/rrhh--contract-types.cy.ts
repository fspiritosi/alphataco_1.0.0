/**
 * Test: Empresa - RRHH - Tipos de Contrato
 * Tab: rrhh | Subtab: contract-types
 * URL: /dashboard/company/actualCompany?tab=rrhh&subtab=contract-types
 *
 * Estado: A IMPLEMENTAR
 */

describe('Company - RRHH - Contract Types', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/company/actualCompany?tab=rrhh&subtab=contract-types');
  });

  it('should navigate to contract-types tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=rrhh');
    cy.url().should('include', 'subtab=contract-types');
  });
});
