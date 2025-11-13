/**
 * Test: Empresa - General - Usuarios
 * Tab: general | Subtab: users
 * URL: /dashboard/company/actualCompany?tab=general&subtab=users
 *
 * Estado: A IMPLEMENTAR
 */

describe('Company - General - Users', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/company/actualCompany?tab=general&subtab=users');
  });

  it('should navigate to users tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=general');
    cy.url().should('include', 'subtab=users');
  });
});
