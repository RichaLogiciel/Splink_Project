# Splink Rebate App E2E Tests

This repository contains end-to-end (E2E) tests for the Splink Rebate App, using [Playwright](https://playwright.dev/) and the Page Object Model (POM) pattern. The tests validate UI functionality, data correctness, and business rules for distributor, manufacturer, and super admin roles.

## Key Features

- **Playwright** for fast, reliable browser automation
- **Page Object Model (POM)** for maintainable, reusable UI interactions
- **JSON-driven validation** for dashboard, program, and rebate data
- **Role-based test suites** for distributor, manufacturer, and super admin
- **Dropdown-driven and dynamic UI checks**

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   # or
   yarn install
   ```
2. **Install dependencies:**
   ```bash
   yarn playwright install
   ```
3. **Configure environment variables:**

   - Create a `.env` file and fill in credentials (emails, passwords, etc.)
   - For S3 snapshot storage, add the following variables:

     ```env
     # S3 Configuration (optional - for snapshot storage)
     S3_BUCKET_NAME=dev-splink-etl-s3
     AWS_REGION=us-east-2
     AWS_ACCESS_KEY_ID=your-access-key
     AWS_SECRET_ACCESS_KEY=your-secret-key
     AWS_SESSION_TOKEN=your-session-token  # Required for temporary credentials

     # Snapshot Storage Mode (local|s3|both)
     SNAPSHOT_STORAGE_MODE=s3
     ```

4. **Test data:**
   - Place expected data files in the `json/` directory (e.g., `wonderful-man.json`).

## Running Tests

- Run all tests:
  ```bash
  npm test
  ```
- Run a specific test file:
  ```bash
  npm test -- tests/distributor-admin/distributor-program.spec.js
  ```
- Run in headed mode for debugging:
  ```bash
  npm run test:headed
  ```
- Run in Playwright UI mode:
  ```bash
  npm run test:ui
  ```
- Run in Chrome, Firefox, or Safari:
  ```bash
  npm run test:chrome
  npm run test:firefox
  npm run test:safari
  ```
- Show the Playwright HTML report:
  ```bash
  npm run report
  ```

## Conventions & Best Practices

- Use POM classes from `pages/` for all UI actions and assertions.
- Use selectors defined in page objects for all queries.
- Prefer explicit waits (`waitForSelector`, `waitForLoadState`) over timeouts.
- Use JSON files for expected values and data-driven tests.
- Use environment variables for credentials and sensitive data.
- Keep tests organized by user role and feature.

## Adding New Tests

1. Create or update a Page Object in `pages/` if needed.
2. Add a new test file in the appropriate `tests/` subfolder.
3. Use the POM and load expected values from JSON as needed.
4. Follow the structure and conventions in existing tests.

## Example: Programs Overview Test

- Validates that all program cards (distributor, store, sales rep) match JSON for name, rate, type, dates, rebate, and compliance.
- Supports dropdown-driven validation for distributor-specific values.
