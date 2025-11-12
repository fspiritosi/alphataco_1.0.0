/**
 * Test: Equipos - Documentos Mensuales
 * Tab: Documentos de equipos | Subtab: mensuales
 * URL: /dashboard/equipment?tab=Documentos de equipos&subtab=mensuales
 *
 * Estado: A IMPLEMENTAR
 */

describe('Equipment - Documentos Mensuales', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/equipment?tab=Documentos de equipos&subtab=mensuales');
  });

  it('should navigate to documentos mensuales tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', '/dashboard/equipment');
  });
});
