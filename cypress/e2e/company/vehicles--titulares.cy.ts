/**
 * Test: Empresa - Vehicles - Titulares
 * Tab: vehicles | Subtab: titulares
 * URL: /dashboard/company/actualCompany?tab=vehicles&subtab=titulares
 *
 * Estado: A IMPLEMENTAR
 */

describe('Company - Vehicles - Titulares', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/company/actualCompany?tab=vehicles&subtab=titulares');
  });

  it('should navigate to titulares tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', 'tab=vehicles');
    cy.url().should('include', 'subtab=titulares');
  });
});
