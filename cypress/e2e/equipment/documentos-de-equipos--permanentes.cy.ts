/**
 * Test: Equipos - Documentos Permanentes
 * Tab: Documentos de equipos | Subtab: permanentes
 * URL: /dashboard/equipment?tab=Documentos de equipos&subtab=permanentes
 *
 * Estado: A IMPLEMENTAR
 */

describe('Equipment - Documentos Permanentes', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/equipment?tab=Documentos de equipos&subtab=permanentes');
  });

  it('should navigate to documentos permanentes tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', '/dashboard/equipment');
  });
});
