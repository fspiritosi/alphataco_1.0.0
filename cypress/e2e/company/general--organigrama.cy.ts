/**
 * Test: Empresa - General - Organigrama
 * Tab: general | Subtab: organigrama
 * URL: /dashboard/company/actualCompany?tab=general&subtab=organigrama
 *
 * Estado: A IMPLEMENTAR
 */

describe('Company - General - Organigrama', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/company/actualCompany?tab=general&subtab=organigrama');
  });

  it('should navigate to organigrama tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=general');
    cy.url().should('include', 'subtab=organigrama');
  });
});
