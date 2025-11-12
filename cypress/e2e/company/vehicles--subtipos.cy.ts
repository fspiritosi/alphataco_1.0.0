/**
 * Test: Empresa - Vehicles - Subtipos
 * Tab: vehicles | Subtab: subtipos
 * URL: /dashboard/company/actualCompany?tab=vehicles&subtab=subtipos
 *
 * Estado: A IMPLEMENTAR
 */

describe('Company - Vehicles - Subtipos', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/company/actualCompany?tab=vehicles&subtab=subtipos');
  });

  it('should navigate to subtipos tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=vehicles');
    cy.url().should('include', 'subtab=subtipos');
  });
});
