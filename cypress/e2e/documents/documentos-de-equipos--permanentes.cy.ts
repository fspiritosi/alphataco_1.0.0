/**
 * Test: Documentos - Equipos Permanentes
 * Tab: Documentos de equipos | Subtab: permanentes
 * URL: /dashboard/document?tab=Documentos de equipos&subtab=permanentes
 *
 * Estado: A IMPLEMENTAR
 */

describe('Documents - Equipos Permanentes', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/document?tab=Documentos de equipos&subtab=permanentes');
  });

  it('should navigate to equipos permanentes tab', () => {
    // A IMPLEMENTAR
    cy.url().should('include', '/dashboard/document');
  });
});
