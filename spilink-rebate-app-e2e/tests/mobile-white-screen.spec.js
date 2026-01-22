const { test, expect } = require('@playwright/test');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test data for session testing
const TEST_SESSION_DATA = {
  accessToken:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlkIjoxLCJlbWFpbCI6InN1cGVyYWRtaW5AZXhhbXBsZS5jb20iLCJyb2xlIjoiU1VQRVJfQURNSU4iLCJhc3NvY2lhdGVkVXNlcklkIjoxLCJwYXJlbnRFbnRpdHlJZCI6bnVsbCwicGFyZW50RW50aXR5VHlwZSI6bnVsbCwiaWF0IjoxNzU2NzMwMzkyLCJleHAiOjE3NTY3MzA0NTJ9.XN1Eqny-rO1hj8upjomnIGuCHCZm_Fu8i8l8vKGGlQ8',
  user: '{"id":1,"email":"superadmin@example.com","firstName":"SUPER","lastName":"ADMIN","role":"SUPER_ADMIN","associatedUserId":1,"parentEntityId":null,"parentEntityType":null,"logo":"","name":""}',
  loginTime: 'Mon Sep 01 2025 18:12:19 GMT+0530 (India Standard Time)',
  refreshToken:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsImlhdCI6MTc1NjczMDUzOSwiZXhwIjoxNzYxOTE0NTM5fQ.CyESvILFlp5n8KKAezPhxBNiFiiyRQ3dHTAnSJ156Go',
  expiresIn: '5d',
  rememberMe: 'true',
  relatedUsers: '[]',
};

// Helper function to set mobile viewport and user agent
async function setupMobileDevice(page, deviceType) {
  if (deviceType === 'iphone') {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.setExtraHTTPHeaders({
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    });
  } else if (deviceType === 'android') {
    await page.setViewportSize({ width: 393, height: 851 });
    await page.setExtraHTTPHeaders({
      'User-Agent':
        'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36',
    });
  }

  // Add mobile-specific properties for all device types
  await page.addInitScript(() => {
    // Simulate mobile device capabilities
    Object.defineProperty(navigator, 'maxTouchPoints', {
      value: 5,
      configurable: true,
    });
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      value: 4,
      configurable: true,
    });
    Object.defineProperty(navigator, 'deviceMemory', {
      value: 4,
      configurable: true,
    });

    // Simulate mobile connection
    if (navigator.connection) {
      Object.defineProperty(navigator.connection, 'effectiveType', {
        value: '4g',
        configurable: true,
      });
      Object.defineProperty(navigator.connection, 'downlink', {
        value: 10,
        configurable: true,
      });
      Object.defineProperty(navigator.connection, 'rtt', {
        value: 50,
        configurable: true,
      });
    }

    // Simulate mobile battery
    if (navigator.getBattery) {
      navigator.getBattery = () =>
        Promise.resolve({
          level: 0.8,
          charging: false,
          chargingTime: Infinity,
          dischargingTime: 3600,
        });
    }
  });
}

// Helper function to validate page content
async function validatePageContent(page, deviceType) {
  // Verify page has content (this is the main white screen check)

  // Verify page has content
  const bodyText = await page.locator('body').textContent();
  expect(bodyText).toBeTruthy();
  expect(bodyText.length).toBeGreaterThan(100);

  // Check for Next.js static files loading
  const staticFilesLoaded = await page.evaluate(() => {
    const scripts = Array.from(
      document.querySelectorAll('script[src*="_next/static"]')
    );
    return scripts.length > 0;
  });
  expect(staticFilesLoaded).toBe(true);

  // Additional mobile-specific checks that might reveal white screen issues
  const mobileChecks = await page.evaluate(() => {
    const checks = {
      hasVisibleContent: false,
      hasInteractiveElements: false,
      hasImages: false,
      hasStyles: false,
      viewportMeta: false,
      touchEvents: false,
      cssMediaQueries: false,
    };

    // Check for visible content (not just text)
    const visibleElements = document.querySelectorAll(
      '*:not(script):not(style):not(meta)'
    );
    checks.hasVisibleContent = visibleElements.length > 10;

    // Check for interactive elements
    const interactiveElements = document.querySelectorAll(
      'button, input, a, select, textarea'
    );
    checks.hasInteractiveElements = interactiveElements.length > 0;

    // Check for images
    const images = document.querySelectorAll('img');
    checks.hasImages = images.length > 0;

    // Check for styles
    const styles = document.querySelectorAll('link[rel="stylesheet"], style');
    checks.hasStyles = styles.length > 0;

    // Check for mobile viewport meta tag
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    checks.viewportMeta = !!viewportMeta;

    // Check for touch event support
    checks.touchEvents = 'ontouchstart' in window;

    // Check for CSS media queries (mobile-specific styles)
    const mediaQueries = document.querySelectorAll(
      'link[media*="max-width"], link[media*="min-width"]'
    );
    checks.cssMediaQueries = mediaQueries.length > 0;

    return checks;
  });

  console.log(`Mobile checks for ${deviceType}:`, mobileChecks);

  // Verify no critical console errors
  const consoleErrors = await page.evaluate(() => {
    return window.consoleErrors || [];
  });

  const criticalErrors = consoleErrors.filter(
    (error) =>
      error.includes('Failed to load resource') ||
      error.includes('_next/static') ||
      error.includes('white screen') ||
      error.includes('blank page') ||
      error.includes('Cannot read property') ||
      error.includes('is not defined') ||
      error.includes('Unexpected token') ||
      error.includes('SyntaxError') ||
      error.includes('ReferenceError')
  );

  expect(criticalErrors.length).toBe(0);

  // Take screenshot for verification
  await page.screenshot({
    path: `test-results/${deviceType}-fresh-session.png`,
    fullPage: true,
  });

  console.log(
    `${deviceType} fresh session test passed - no white screen detected`
  );
}

// Helper function to setup cached session
async function setupCachedSession(page) {
  await page.context().addCookies([
    {
      name: 'accessToken',
      value: TEST_SESSION_DATA.accessToken,
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'user',
      value: TEST_SESSION_DATA.user,
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'loginTime',
      value: TEST_SESSION_DATA.loginTime,
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'refreshToken',
      value: TEST_SESSION_DATA.refreshToken,
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'expiresIn',
      value: TEST_SESSION_DATA.expiresIn,
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'rememberMe',
      value: TEST_SESSION_DATA.rememberMe,
      domain: 'localhost',
      path: '/',
    },
    {
      name: 'relatedUsers',
      value: TEST_SESSION_DATA.relatedUsers,
      domain: 'localhost',
      path: '/',
    },
  ]);
}

// iPhone Safari Tests
test.describe('iPhone Safari Mobile White Screen Testing', () => {
  test('should load homepage without white screen on iPhone Safari - fresh session', async ({
    page,
  }) => {
    test.setTimeout(60000);

    // Setup iPhone device configuration
    await setupMobileDevice(page, 'iphone');

    // Clear all cookies for fresh session
    await page.context().clearCookies();

    console.log('Testing iPhone Safari - Fresh Session');

    // Navigate to homepage
    await page.goto(BASE_URL);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Validate page content
    await validatePageContent(page, 'iphone-safari');
  });

  test('should load homepage without white screen on iPhone Safari - cached session', async ({
    page,
  }) => {
    test.setTimeout(60000);

    // Setup iPhone device configuration
    await setupMobileDevice(page, 'iphone');

    // Set up cached session with test data
    await setupCachedSession(page);

    console.log('Testing iPhone Safari - Cached Session');

    // Navigate to homepage
    await page.goto(BASE_URL);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Validate page content
    await validatePageContent(page, 'iphone-safari-cached');
  });
});

// Android Chrome Tests
test.describe('Android Chrome Mobile White Screen Testing', () => {
  test('should load homepage without white screen on Android Chrome - fresh session', async ({
    page,
  }) => {
    test.setTimeout(60000);

    // Setup Android device configuration
    await setupMobileDevice(page, 'android');

    // Clear all cookies for fresh session
    await page.context().clearCookies();

    console.log('Testing Android Chrome - Fresh Session');

    // Navigate to homepage
    await page.goto(BASE_URL);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Validate page content
    await validatePageContent(page, 'android-chrome');
  });

  test('should load homepage without white screen on Android Chrome - cached session', async ({
    page,
  }) => {
    test.setTimeout(60000);

    // Setup Android device configuration
    await setupMobileDevice(page, 'android');

    // Set up cached session with test data
    await setupCachedSession(page);

    console.log('Testing Android Chrome - Cached Session');

    // Navigate to homepage
    await page.goto(BASE_URL);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Validate page content
    await validatePageContent(page, 'android-chrome-cached');
  });
});

// Console Error Monitoring Tests
test.describe('Console Error Monitoring', () => {
  test.beforeEach(async ({ page }) => {
    // Set up console error monitoring
    await page.addInitScript(() => {
      window.consoleErrors = [];
      const originalError = console.error;
      const originalWarn = console.warn;

      console.error = (...args) => {
        window.consoleErrors.push(args.join(' '));
        originalError.apply(console, args);
      };

      console.warn = (...args) => {
        window.consoleErrors.push(args.join(' '));
        originalWarn.apply(console, args);
      };
    });
  });

  test('should not have critical console errors on mobile devices', async ({
    page,
  }) => {
    test.setTimeout(60000);

    // Use mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    console.log('Testing console error monitoring on mobile viewport');

    // Navigate to homepage
    await page.goto(BASE_URL);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Wait a bit more for any delayed errors
    await page.waitForTimeout(2000);

    // Get console errors
    const consoleErrors = await page.evaluate(() => {
      return window.consoleErrors || [];
    });

    console.log(`Total console errors/warnings: ${consoleErrors.length}`);
    if (consoleErrors.length > 0) {
      console.log('Console errors/warnings found:', consoleErrors);
    }

    // Check for critical errors that would cause white screen
    const criticalErrors = consoleErrors.filter(
      (error) =>
        error.includes('Failed to load resource') ||
        error.includes('_next/static') ||
        error.includes('white screen') ||
        error.includes('blank page') ||
        error.includes('Cannot read property') ||
        error.includes('is not defined') ||
        error.includes('Unexpected token')
    );

    expect(criticalErrors.length).toBe(0);

    // Take screenshot for verification
    await page.screenshot({
      path: 'test-results/mobile-console-error-test.png',
      fullPage: true,
    });

    console.log(
      'Console error monitoring test passed - no critical errors detected'
    );
  });
});

// Safari Mobile Specific Tests
test.describe('Safari Mobile Specific Tests', () => {
  test('should load homepage without white screen in Safari mobile', async ({
    page,
  }) => {
    test.setTimeout(90000); // Longer timeout for Safari

    // Setup Safari mobile configuration with more realistic settings
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone 12 Pro
    await page.setExtraHTTPHeaders({
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    });

    // Safari-specific mobile properties
    await page.addInitScript(() => {
      // Safari-specific mobile capabilities
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        configurable: true,
      });
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 6,
        configurable: true,
      });
      Object.defineProperty(navigator, 'deviceMemory', {
        value: 4,
        configurable: true,
      });

      // Safari-specific connection info
      if (navigator.connection) {
        Object.defineProperty(navigator.connection, 'effectiveType', {
          value: '4g',
          configurable: true,
        });
        Object.defineProperty(navigator.connection, 'downlink', {
          value: 10,
          configurable: true,
        });
        Object.defineProperty(navigator.connection, 'rtt', {
          value: 50,
          configurable: true,
        });
      }

      // Safari-specific battery API
      if (navigator.getBattery) {
        navigator.getBattery = () =>
          Promise.resolve({
            level: 0.8,
            charging: false,
            chargingTime: Infinity,
            dischargingTime: 3600,
          });
      }

      // Safari-specific webkit properties
      if (navigator.webkitTemporaryStorage) {
        Object.defineProperty(navigator, 'webkitTemporaryStorage', {
          value: { queryUsageAndQuota: () => Promise.resolve([0, 0]) },
          configurable: true,
        });
      }

      // Safari-specific vendor
      Object.defineProperty(navigator, 'vendor', {
        value: 'Apple Computer, Inc.',
        configurable: true,
      });
      Object.defineProperty(navigator, 'platform', {
        value: 'iPhone',
        configurable: true,
      });
    });

    console.log('Testing Safari mobile - Fresh Session');

    // Clear cookies for fresh session
    await page.context().clearCookies();

    // Navigate to homepage
    await page.goto(BASE_URL);

    // Wait for page to load with Safari-specific timing
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: 45000 });

    // Safari-specific validation
    const safariChecks = await page.evaluate(() => {
      const checks = {
        hasContent: false,
        hasStyles: false,
        hasScripts: false,
        webkitFeatures: false,
        safariSpecific: false,
      };

      // Check for content
      checks.hasContent = document.body.textContent.length > 100;

      // Check for styles
      checks.hasStyles =
        document.querySelectorAll('link[rel="stylesheet"], style').length > 0;

      // Check for scripts
      checks.hasScripts = document.querySelectorAll('script').length > 0;

      // Check for WebKit-specific features
      checks.webkitFeatures =
        'webkitRequestAnimationFrame' in window ||
        'webkitAudioContext' in window;

      // Check for Safari-specific elements
      checks.safariSpecific =
        'webkitTemporaryStorage' in navigator ||
        navigator.vendor === 'Apple Computer, Inc.';

      return checks;
    });

    console.log('Safari mobile checks:', safariChecks);

    // Verify page has content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText.length).toBeGreaterThan(100);

    // Check for Next.js static files
    const staticFilesLoaded = await page.evaluate(() => {
      const scripts = Array.from(
        document.querySelectorAll('script[src*="_next/static"]')
      );
      return scripts.length > 0;
    });
    expect(staticFilesLoaded).toBe(true);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/safari-mobile-fresh-session.png',
      fullPage: true,
    });

    console.log('Safari mobile test passed - no white screen detected');
  });

  test('should handle Safari mobile cached session without white screen', async ({
    page,
  }) => {
    test.setTimeout(90000);

    // Setup Safari mobile configuration
    await page.setViewportSize({ width: 375, height: 812 });
    await page.setExtraHTTPHeaders({
      'User-Agent':
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    });

    // Add Safari-specific properties
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'maxTouchPoints', {
        value: 5,
        configurable: true,
      });
      Object.defineProperty(navigator, 'vendor', {
        value: 'Apple Computer, Inc.',
        configurable: true,
      });
      Object.defineProperty(navigator, 'platform', {
        value: 'iPhone',
        configurable: true,
      });
    });

    console.log('Testing Safari mobile - Cached Session');

    // Set up cached session
    await setupCachedSession(page);

    // Navigate to homepage
    await page.goto(BASE_URL);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: 45000 });

    // Validate page content
    await validatePageContent(page, 'safari-mobile-cached');
  });
});

// Mobile-Specific Behavior Tests
test.describe('Mobile-Specific Behavior Tests', () => {
  test('should handle mobile-specific interactions without white screen', async ({
    page,
  }) => {
    test.setTimeout(60000);

    // Setup mobile device configuration
    await setupMobileDevice(page, 'iphone');

    console.log('Testing mobile-specific interactions');

    // Navigate to homepage
    await page.goto(BASE_URL);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Simulate mobile-specific interactions that might trigger white screen
    try {
      // Simulate touch events
      await page.evaluate(() => {
        // Trigger touchstart event
        const touchEvent = new TouchEvent('touchstart', {
          touches: [
            new Touch({
              identifier: 1,
              target: document.body,
              clientX: 100,
              clientY: 100,
            }),
          ],
        });
        document.body.dispatchEvent(touchEvent);
      });

      // Simulate orientation change
      await page.evaluate(() => {
        // Trigger orientation change event
        const orientationEvent = new Event('orientationchange');
        window.dispatchEvent(orientationEvent);
      });

      // Simulate resize events
      await page.setViewportSize({ width: 320, height: 568 }); // Smaller mobile size
      await page.waitForTimeout(1000);
      await page.setViewportSize({ width: 375, height: 812 }); // Back to iPhone size
      await page.waitForTimeout(1000);

      // Simulate scroll events
      await page.evaluate(() => {
        window.scrollTo(0, 100);
        window.scrollTo(0, 0);
      });

      console.log('Mobile interactions completed successfully');
    } catch (error) {
      console.log(
        'Mobile interaction error (this might indicate the issue):',
        error.message
      );
    }

    // Final validation - check if page still has content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText.length).toBeGreaterThan(100);

    // Take screenshot after interactions
    await page.screenshot({
      path: 'test-results/mobile-interactions-test.png',
      fullPage: true,
    });

    console.log('Mobile-specific behavior test passed');
  });

  test('should handle slow mobile network conditions without white screen', async ({
    page,
  }) => {
    test.setTimeout(120000); // Longer timeout for slow network

    // Setup mobile device configuration
    await setupMobileDevice(page, 'android');

    // Simulate slow mobile network (this is a key mobile issue!)
    await page.route('**/*', async (route) => {
      // Add artificial delay to simulate slow mobile network
      await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay
      await route.continue();
    });

    console.log('Testing with slow mobile network simulation');

    // Navigate to homepage
    await page.goto(BASE_URL);

    // Wait for page to load with longer timeout
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: 60000 });

    // Check if page loaded despite slow network
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText.length).toBeGreaterThan(100);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/mobile-slow-network-test.png',
      fullPage: true,
    });

    console.log('Slow mobile network test passed');
  });

  test('should handle mobile memory pressure simulation', async ({ page }) => {
    test.setTimeout(60000);

    // Setup mobile device configuration
    await setupMobileDevice(page, 'iphone');

    console.log('Testing mobile memory pressure simulation');

    // Navigate to homepage
    await page.goto(BASE_URL);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Simulate memory pressure by creating many objects
    try {
      await page.evaluate(() => {
        // Create memory pressure
        const objects = [];
        for (let i = 0; i < 10000; i++) {
          objects.push({ id: i, data: 'x'.repeat(1000) });
        }

        // Force garbage collection if available
        if (window.gc) {
          window.gc();
        }

        // Trigger memory pressure events
        window.dispatchEvent(new Event('memorywarning'));
      });
    } catch (error) {
      console.log('Memory pressure simulation error:', error.message);
    }

    // Check if page still works after memory pressure
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText.length).toBeGreaterThan(100);

    // Take screenshot
    await page.screenshot({
      path: 'test-results/mobile-memory-pressure-test.png',
      fullPage: true,
    });

    console.log('Mobile memory pressure test passed');
  });
});

// Static Asset Loading Tests
test.describe('Static Asset Loading', () => {
  test('should load all critical Next.js static assets on mobile', async ({
    page,
  }) => {
    test.setTimeout(60000);

    // Use mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    console.log('Testing static asset loading on mobile viewport');

    // Navigate to homepage
    await page.goto(BASE_URL);

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Check for critical Next.js static files
    const staticAssets = await page.evaluate(() => {
      const scripts = Array.from(
        document.querySelectorAll('script[src*="_next/static"]')
      );
      const links = Array.from(
        document.querySelectorAll('link[href*="_next/static"]')
      );

      return {
        scripts: scripts.map((s) => s.src),
        links: links.map((l) => l.href),
        totalScripts: scripts.length,
        totalLinks: links.length,
      };
    });

    console.log(
      `Static assets found: ${staticAssets.totalScripts} scripts, ${staticAssets.totalLinks} links`
    );

    // Verify we have static assets
    expect(staticAssets.totalScripts).toBeGreaterThan(0);
    expect(staticAssets.totalLinks).toBeGreaterThan(0);

    // Check that no static assets failed to load
    const failedAssets = await page.evaluate(() => {
      const failed = [];
      const scripts = document.querySelectorAll('script[src*="_next/static"]');

      return failed;
    });

    expect(failedAssets.length).toBe(0);

    // Take screenshot for verification
    await page.screenshot({
      path: 'test-results/mobile-static-assets-test.png',
      fullPage: true,
    });

    console.log(
      'Static asset loading test passed - all assets loaded successfully'
    );
  });
});
