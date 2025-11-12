/**
 * Test: Formularios - Tipos de Checklist
 * Tab: formularios
 * URL: /dashboard/forms?tab=formularios
 *
 * Estado: A IMPLEMENTAR
 */

describe('Forms - Tipos de Checklist', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/forms?tab=formularios');
  });

  it('should navigate to formularios tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', '/dashboard/forms');
    cy.url().should('include', 'tab=formularios');
  });
});
