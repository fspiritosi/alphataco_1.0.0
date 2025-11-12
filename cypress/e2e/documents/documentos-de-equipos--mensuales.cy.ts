/**
 * Test: Documentos - Equipos Mensuales
 * Tab: Documentos de equipos | Subtab: mensuales
 * URL: /dashboard/document?tab=Documentos de equipos&subtab=mensuales
 *
 * Estado: A IMPLEMENTAR
 */

describe('Documents - Equipos Mensuales', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/document?tab=Documentos de equipos&subtab=mensuales');
  });

  it('should navigate to equipos mensuales tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', '/dashboard/document');
  });
});
