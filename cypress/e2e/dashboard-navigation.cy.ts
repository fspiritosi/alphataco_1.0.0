/// <reference types="cypress" />

describe('Dashboard Navigation Tests', () => {
  beforeEach(() => {
    // Login before each test
    const email = Cypress.env('TEST_EMAIL') || 'test@example.com';
    const password = Cypress.env('TEST_PASSWORD') || 'testpassword';
    cy.login(email, password);
  });

  it('should verify main dashboard loads', () => {
    cy.visit('/dashboard');
    cy.wait(2000);
    cy.get('body').should('exist');
    cy.checkNoErrors();
  });

  it('should verify comercial page and tabs', () => {
    cy.visit('/dashboard/comercial');
    cy.wait(2000);
    cy.checkNoErrors();

    // Test subtabs
    const subtabs = ['customers', 'areas', 'equipment', 'sector', 'service', 'mensure_units', 'daily_reports'];
    subtabs.forEach((subtab) => {
      cy.get(`[data-testid="sub-tab-${subtab}"]`).should('exist').click();
      cy.wait(1000);
      cy.checkNoErrors();
    });
  });

  it('should verify company page loads', () => {
    cy.visit('/dashboard/company');
    cy.wait(2000);
    cy.checkNoErrors();
  });

  it('should verify document page and tabs', () => {
    cy.visit('/dashboard/document');
    cy.wait(2000);
    cy.checkNoErrors();

    // Test main tabs
    cy.get('[data-testid="main-tab-documentos-de-empleados"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    // Test subtabs for employee documents
    cy.get('[data-testid="sub-tab-permanentes"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    cy.get('[data-testid="sub-tab-mensuales"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    // Test equipment documents tab
    cy.get('[data-testid="main-tab-documentos-de-equipos"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    cy.get('[data-testid="sub-tab-permanentes"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    cy.get('[data-testid="sub-tab-mensuales"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    // Test company documents tab
    cy.get('[data-testid="main-tab-documentos-de-empresa"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    cy.get('[data-testid="sub-tab-permanentes"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    cy.get('[data-testid="sub-tab-mensuales"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    // Test document types tab
    cy.get('[data-testid="main-tab-tipos-de-documentos"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();
  });

  it('should verify employee page and tabs', () => {
    cy.visit('/dashboard/employee');
    cy.wait(2000);
    cy.checkNoErrors();

    // Test main tabs
    cy.get('[data-testid="main-tab-employees"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    // Test employee subtabs
    cy.get('[data-testid="sub-tab-empleados-activos"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    cy.get('[data-testid="sub-tab-empleados-inactivos"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    // Test documents tab
    cy.get('[data-testid="main-tab-documentos-de-empleados"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    // Test diagrams tab
    cy.get('[data-testid="main-tab-diagrams"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    cy.get('[data-testid="sub-tab-old"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    cy.get('[data-testid="sub-tab-new"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    cy.get('[data-testid="sub-tab-massive_diagram"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    cy.get('[data-testid="sub-tab-reports"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    // Test document types tab
    cy.get('[data-testid="main-tab-tipos-de-documentos"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    // Test CCT tab
    cy.get('[data-testid="main-tab-covenant"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();
  });

  it('should verify equipment page and tabs', () => {
    cy.visit('/dashboard/equipment');
    cy.wait(2000);
    cy.checkNoErrors();

    // Test main tabs
    cy.get('[data-testid="main-tab-equipos"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    // Test equipment subtabs
    cy.get('[data-testid="sub-tab-vehicles"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    cy.get('[data-testid="sub-tab-others"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    cy.get('[data-testid="sub-tab-inactive"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    // Test documents tab
    cy.get('[data-testid="main-tab-documentos-de-equipos"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    // Test document types tab
    cy.get('[data-testid="main-tab-tipos-de-documentos"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    // Test maintenance tab
    cy.get('[data-testid="main-tab-type_of_repairs"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    cy.get('[data-testid="sub-tab-type_of_repair"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    cy.get('[data-testid="sub-tab-maintenance_groups"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();
  });

  it('should verify forms page loads', () => {
    cy.visit('/dashboard/forms');
    cy.wait(2000);
    cy.checkNoErrors();
  });

  it('should verify help page loads', () => {
    cy.visit('/dashboard/help');
    cy.wait(2000);
    cy.checkNoErrors();
  });

  it('should verify maintenance page and tabs', () => {
    cy.visit('/dashboard/maintenance');
    cy.wait(2000);
    cy.checkNoErrors();

    // Test maintenance subtabs
    cy.get('[data-testid="sub-tab-type_of_repair"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    cy.get('[data-testid="sub-tab-maintenance_groups"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();
  });

  it('should verify operations page and tabs', () => {
    cy.visit('/dashboard/operations');
    cy.wait(2000);
    cy.checkNoErrors();

    // Test operations tabs
    cy.get('[data-testid="main-tab-preparte"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();

    cy.get('[data-testid="main-tab-dailyreportstable"]').should('exist').click();
    cy.wait(1000);
    cy.checkNoErrors();
  });
});
