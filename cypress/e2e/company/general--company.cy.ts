/**
 * Test: Empresa - General - Company
 * Tab: general | Subtab: company
 * URL: /dashboard/company/actualCompany?tab=general&subtab=company
 *
 * Estado: A IMPLEMENTAR
 */

describe('Company - General - Company Info', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/company/actualCompany?tab=general&subtab=company');
  });

  it('should navigate to company info tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=general');
    cy.url().should('include', 'subtab=company');
  });
});
