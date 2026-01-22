const { test, expect } = require('@playwright/test');
const LoginPage = require('../pages/LoginPage');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL;

test.describe('Login Functionality', () => {
  let loginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.navigateToLogin();
  });

  test.skip('login with invalid credentials', async () => {
    await loginPage.login('wrong@example.com', 'wrongpassword', false);

    console.log('login with invalid credentials');

    // Get the error message text and verify it
    const errorText = await loginPage.getErrorMessage();
    expect(errorText.toLowerCase()).toMatch('invalid credentials');

    // Verify we're still on the login page
    await expect(loginPage.page).toHaveURL(`${BASE_URL}/auth/login`);
  });

  test('login form validation - empty form', async () => {
    // Try to submit empty form
    const validation = await loginPage.checkFormValidation();

    // Verify form validation state
    expect(validation.isValid).toBe(false);
    expect(validation.emailError).toBeTruthy();
    expect(validation.passwordError).toBeTruthy();

    // Verify we're still on the login page
    await expect(loginPage.page).toHaveURL(`${BASE_URL}/auth/login`);
  });

  test('successful login with superadmin credentials @smoke', async ({
    page,
  }) => {
    // Increase test timeout for this specific test
    test.setTimeout(60000);

    await loginPage.login(
      process.env.SUPER_ADMIN_EMAIL,
      process.env.SUPER_ADMIN_PASSWORD,
      true
    );

    // Wait a moment for any redirects to complete
    await page.waitForLoadState('networkidle');

    // Get current URL and check for success
    const url = page.url();
    expect(url).toMatch(/.*\/(app\/users|dashboard)/);
  });

  test('login form validation - empty password', async () => {
    // Try to submit empty form
    const validation = await loginPage.checkFormValidation();

    // Verify form validation state
    expect(validation.isValid).toBe(false);
    expect(validation.passwordError).toBeTruthy();

    // Verify we're still on the login page
    await expect(loginPage.page).toHaveURL(`${BASE_URL}/auth/login`);
  });

  test('login form validation - empty email', async () => {
    // Try to submit empty form
    const validation = await loginPage.checkFormValidation();

    // Verify form validation state
    expect(validation.isValid).toBe(false);
    expect(validation.emailError).toBeTruthy();

    await expect(loginPage.page).toHaveURL(`${BASE_URL}/auth/login`);
  });

  test.skip('remember me functionality @smoke', async ({ page }) => {
    // Increase test timeout for this specific test
    test.setTimeout(60000);

    await loginPage.toggleRememberMe();
    await loginPage.login(
      process.env.SUPER_ADMIN_EMAIL,
      process.env.SUPER_ADMIN_PASSWORD,
      true
    );

    // Wait a moment for any redirects to complete
    await page.waitForLoadState('networkidle');

    // Get current URL and check for success
    const url = page.url();
    expect(url).toMatch(/.*\/(app\/users|dashboard)/);
  });

  test('forgot password link', async () => {
    await loginPage.clickForgotPassword();
    await loginPage.page.waitForTimeout(5000);
    await expect(loginPage.page).toHaveURL(`${BASE_URL}/auth/forget-password`);
  });
});
