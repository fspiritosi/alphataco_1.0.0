// ***********************************************************
// This example support/e2e.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Stop execution on first test failure
let shouldSkip = false;

beforeEach(function () {
  if (shouldSkip) {
    this.skip();
  }
});

afterEach(function () {
  if (this.currentTest?.state === 'failed') {
    shouldSkip = true;
  }
});

// Prevent TypeScript errors on custom commands
declare global {
  namespace Cypress {
    interface Chainable {
      login(email: string, password: string): Chainable<void>;
      checkNoErrors(): Chainable<void>;
    }
  }
}
