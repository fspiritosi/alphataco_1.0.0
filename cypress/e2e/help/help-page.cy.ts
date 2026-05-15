/**
 * Test: Centro de Ayuda
 * URL: /dashboard/help
 *
 * Scope: smoke test del layout y validaciones del formulario.
 *
 * NOTA: el flujo end-to-end (crear ticket → aparece en la lista) NO se testea acá
 * porque la creación del ticket sucede en una server action que llama al backend Go
 * (taskApp-backend) server-to-server. `cy.intercept` solo captura tráfico del browser,
 * no del server. Para testear ese flujo hay que levantar taskApp-backend real con seed,
 * o mockearlo con un servicio HTTP intermedio. Queda fuera del scope de este test.
 */

describe('Centro de Ayuda - smoke', () => {
  beforeEach(() => {
    const email = Cypress.env('TEST_EMAIL') || 'testing@e2e.com';
    const password = Cypress.env('TEST_PASSWORD') || 'Testing123!';
    cy.login(email, password);
    cy.visit('/dashboard/help');
  });

  it('muestra el header del Centro de Ayuda', () => {
    cy.contains('h1', 'Centro de Ayuda').should('be.visible');
    cy.contains('Reportá un problema o consultá el estado de tus solicitudes.').should('be.visible');
  });

  it('muestra el formulario con sus 3 campos', () => {
    cy.contains('Reportar un problema').should('be.visible');
    cy.contains('label', 'Categoría').should('be.visible');
    cy.contains('label', 'Asunto').should('be.visible');
    cy.contains('label', 'Descripción').should('be.visible');
    cy.contains('button', 'Enviar reporte').should('be.visible').and('not.be.disabled');
  });

  it('valida campos requeridos antes de enviar', () => {
    // El form arranca con category='otro' (default), asunto vacío, descripción vacía.
    // Submit con asunto y descripción vacíos debe disparar las validaciones de zod.
    cy.contains('button', 'Enviar reporte').click();

    cy.contains('Mínimo 3 caracteres').should('be.visible');
    cy.contains('mínimo 10 caracteres').should('be.visible');
  });
});
