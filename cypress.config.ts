import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotOnRunFailure: true,
    viewportWidth: 1920,
    viewportHeight: 1080,
    defaultCommandTimeout: 20000,
    requestTimeout: 20000,
    responseTimeout: 20000,
    pageLoadTimeout: 30000,
    retries: {
      runMode: 0,
      openMode: 0,
    },
  },
  env: {
    // Testing user credentials
    TEST_EMAIL: 'testing@e2e.com',
    TEST_PASSWORD: 'Testing123!',
    // These can be overridden in cypress.env.json
  },
});
