/// <reference types="cypress" />

/**
 * Los cinco flujos de autenticación de P4, contra el compose levantado.
 *
 * Los tests unitarios no alcanzan para auth: lo que importa es que la cookie de sesión se
 * escriba de verdad, que el proxy la lea y que cada panel resuelva su perímetro. Eso sólo se
 * ve ejecutando la app. Este spec recorre los cinco caminos de punta a punta por la UI real
 * (Server Actions incluidas).
 *
 * Requisitos:
 *   docker compose --env-file .env.docker up -d --wait app
 *   node scripts/seed-auth-fixtures.ts     # empresa, usuarios y legajos de prueba
 *   npx cypress run --spec 'cypress/e2e/auth/p4-auth-flows.cy.ts'
 */
const PASSWORD = 'P4-verificacion-123';
const ADMIN = 'admin@p4.test';
const CLOTHING = 'ropa@p4.test';
const OPERATOR = 'taller@p4.test';
const QR_CUIL = '20111111112';
const QR_DOMAIN = 'P4QR01';

/** Borra todas las cookies: cada flujo arranca sin sesión, como un navegador nuevo. */
function freshBrowser() {
  cy.clearCookies();
  cy.clearLocalStorage();
}

/** Paso 1 del QR: identificar el equipo por dominio en el combobox. */
function selectQrEquipment() {
  cy.get('button[role=combobox]').click();
  cy.get('[cmdk-input]').type(QR_DOMAIN);
  cy.contains('[cmdk-item]', QR_DOMAIN, { timeout: 20000 }).click();
  cy.contains('button', 'Continuar').click();
}

describe('P4 — flujo 1: login del dashboard (email + contraseña)', () => {
  beforeEach(freshBrowser);

  it('entra al dashboard y la sesión sobrevive a la navegación', () => {
    cy.visit('/login');
    cy.get('[data-testid=login-email-input]').type(ADMIN);
    cy.get('[data-testid=login-password-input]').type(PASSWORD);
    cy.get('[data-testid=login-submit-button]').click();

    cy.location('pathname', { timeout: 30000 }).should('include', '/dashboard');
    // El proxy dejó pasar: hay sesión Y hay claim de empresa.
    cy.visit('/dashboard');
    cy.location('pathname').should('include', '/dashboard');
    cy.getCookie('better-auth.session_token').should('exist');
  });

  it('rechaza una contraseña incorrecta y no deja cookie de sesión', () => {
    cy.visit('/login');
    cy.get('[data-testid=login-email-input]').type(ADMIN);
    cy.get('[data-testid=login-password-input]').type('Noesla-contrasena-9');
    cy.get('[data-testid=login-submit-button]').click();

    cy.contains(/inválid|invalid/i, { timeout: 20000 }).should('exist');
    cy.getCookie('better-auth.session_token').should('not.exist');
  });

  it('el logout del menú de usuario cierra la sesión del servidor', () => {
    cy.visit('/login');
    cy.get('[data-testid=login-email-input]').type(ADMIN);
    cy.get('[data-testid=login-password-input]').type(PASSWORD);
    cy.get('[data-testid=login-submit-button]').click();
    cy.location('pathname', { timeout: 30000 }).should('include', '/dashboard');

    // La cookie de sesión y la de empresa activa son httpOnly: las borra el servidor.
    cy.get('[data-testid=user-menu-trigger]').click();
    cy.get('[data-testid=user-menu-logout]').click();

    cy.location('pathname', { timeout: 30000 }).should('eq', '/login');
    cy.getCookie('better-auth.session_token').should('not.exist');
    cy.getCookie('actualComp').should('not.exist');
  });

  it('sin sesión, /dashboard redirige a /login', () => {
    cy.visit('/dashboard', { failOnStatusCode: false });
    cy.location('pathname', { timeout: 30000 }).should('eq', '/login');
  });
});

describe('P4 — flujo 3: QR de mantenimiento', () => {
  beforeEach(freshBrowser);

  it('el empleado entra con su CUIL sobre una sesión anónima', () => {
    cy.visit('/maintenance');

    selectQrEquipment();

    // Paso 2: tipo de acceso.
    cy.contains('button', 'Empleado').click();

    // Paso 3: CUIL.
    cy.get('input').first().type(QR_CUIL);
    cy.get('form').submit();

    cy.location('pathname', { timeout: 30000 }).should('include', '/maintenance/equipment/');
    cy.getCookie('better-auth.session_token').should('exist');
    // La empresa activa la escribió el servidor desde el legajo.
    cy.getCookie('actualComp').should('exist');
  });

  it('el operario anónimo NO puede entrar al dashboard', () => {
    cy.request({ method: 'POST', url: '/api/auth/sign-in/anonymous', headers: { 'content-type': 'application/json' }, body: {} })
      .its('status')
      .should('eq', 200);
    cy.visit('/dashboard', { failOnStatusCode: false });
    cy.location('pathname', { timeout: 30000 }).should('include', '/maintenance');
  });

  it('un CUIL inexistente no abre nada', () => {
    cy.visit('/maintenance');
    selectQrEquipment();
    cy.contains('button', 'Empleado').click();
    cy.get('input').first().type('20987654326');
    cy.get('form').submit();

    // El toast de error es efímero: lo que se afirma es lo que importa para el perímetro —
    // no hay redirección al equipo y la sesión anónima quedó SIN empresa activa.
    cy.wait(2000);
    cy.location('pathname').should('eq', '/maintenance');
    cy.getCookie('actualComp').should('not.exist');
  });
});

describe('P4 — flujo 4: panel de indumentaria', () => {
  beforeEach(freshBrowser);

  it('el operario con legajo vinculado entra a /clothing', () => {
    cy.visit('/clothing/login');
    cy.get('#email').type(CLOTHING);
    cy.get('#password').type(PASSWORD);
    cy.get('form').submit();

    cy.location('pathname', { timeout: 30000 }).should('include', '/clothing');
    cy.location('pathname').should('not.include', '/login');
    // El panel es un puesto fijo: la empresa activa sale del legajo y la escribe el servidor.
    cy.getCookie('actualComp').should('exist');
  });

  it('un usuario sin legajo vinculado no entra (y se le cierra la sesión recién abierta)', () => {
    cy.visit('/clothing/login');
    cy.get('#email').type(ADMIN);
    cy.get('#password').type(PASSWORD);
    cy.get('form').submit();

    cy.contains(/empleado vinculado/i, { timeout: 20000 }).should('exist');
    cy.getCookie('better-auth.session_token').should('not.exist');
    // Y la sesión tampoco quedó viva del lado del servidor: /dashboard sigue mandando a /login.
    cy.visit('/dashboard', { failOnStatusCode: false });
    cy.location('pathname', { timeout: 30000 }).should('eq', '/login');
  });
});

describe('P4 — flujo 5: panel del operario de taller', () => {
  beforeEach(freshBrowser);

  it('el operario con sector asignado entra a /operator/dashboard', () => {
    cy.visit('/operator/login');
    cy.get('#email').type(OPERATOR);
    cy.get('#password').type(PASSWORD);
    cy.get('form').submit();

    cy.location('pathname', { timeout: 30000 }).should('include', '/operator/dashboard');
    cy.getCookie('activeOperatorSectorId').should('exist');
  });

  it('un usuario sin sectores de taller no entra', () => {
    cy.visit('/operator/login');
    cy.get('#email').type(CLOTHING);
    cy.get('#password').type(PASSWORD);
    cy.get('form').submit();

    cy.contains(/sectores de taller/i, { timeout: 20000 }).should('exist');
    cy.getCookie('better-auth.session_token').should('not.exist');
    cy.visit('/dashboard', { failOnStatusCode: false });
    cy.location('pathname', { timeout: 30000 }).should('eq', '/login');
  });
});

describe('P4 — recuperación de contraseña', () => {
  beforeEach(freshBrowser);

  it('pide el enlace sin filtrar si el mail existe', () => {
    cy.visit('/reset_password');
    cy.get('input[type=email]').type('no-existe-en-el-sistema@p4.test');
    cy.get('form').submit();
    cy.contains(/enviad/i, { timeout: 20000 }).should('exist');
  });

  it('sin token, la pantalla de nueva contraseña no muestra el formulario', () => {
    cy.visit('/reset_password/update-user');
    cy.contains(/enlace inválido o expirado/i, { timeout: 20000 }).should('exist');
  });
});
