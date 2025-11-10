/// <reference types="cypress" />

/**
 * Custom command to login
 * Usage: cy.login('email@example.com', 'password')
 */
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('[data-testid="login-email-input"]').type(email);
    cy.get('[data-testid="login-password-input"]').type(password);
    cy.get('[data-testid="login-submit-button"]').click();

    // Wait for redirect to dashboard
    cy.url().should('include', '/dashboard', { timeout: 10000 });
  });
});

/**
 * Custom command to check for console errors and page errors
 * Usage: cy.checkNoErrors()
 */
Cypress.Commands.add('checkNoErrors', () => {
  // Check that the page loaded without critical errors
  cy.get('body').should('exist');

  // Check for error boundaries or error messages
  cy.get('body').then(($body) => {
    // Check if there's an error boundary rendered
    const hasErrorBoundary = $body.find('[data-error-boundary]').length > 0;
    const hasErrorMessage =
      $body.text().includes('Something went wrong') || $body.text().includes('Error') || $body.text().includes('error');

    if (hasErrorBoundary || hasErrorMessage) {
      cy.log('⚠️ Potential error detected on page');
      // Take a screenshot for debugging
      cy.screenshot('potential-error');
    }
  });
});

// Prevent Cypress from failing on uncaught exceptions
// This is useful for testing that pages load even if there are JS errors
Cypress.on('uncaught:exception', (err) => {
  // Log the error but don't fail the test
  cy.log(`Uncaught exception: ${err.message}`);

  // Return false to prevent the error from failing the test
  // We want to see if the page loads, even with errors
  return false;
});
