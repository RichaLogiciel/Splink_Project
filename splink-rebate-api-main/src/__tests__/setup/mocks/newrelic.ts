// Mock NewRelic
const newrelic = {
  startSegment: jest.fn((name, record, handler, callback) => {
    // Handle both sync and async cases properly
    if (typeof handler === "function") {
      // Execute the handler directly and return its result
      try {
        const result = handler();
        // If it's a promise, return it as-is; if not, wrap in resolved promise
        return Promise.resolve(result);
      } catch (error) {
        return Promise.reject(error);
      }
    } else if (typeof callback === "function") {
      // If callback is provided, execute it (callback case)
      try {
        const result = callback();
        return Promise.resolve(result);
      } catch (error) {
        return Promise.reject(error);
      }
    }
    // Fallback - return resolved promise
    return Promise.resolve();
  }),
  addCustomAttribute: jest.fn(),
  addCustomAttributes: jest.fn(),
  setTransactionName: jest.fn(),
  getTransaction: jest.fn(() => ({
    addCustomAttribute: jest.fn(),
    addCustomAttributes: jest.fn(),
    setTransactionName: jest.fn()
  })),
  noticeError: jest.fn()
};

module.exports = newrelic;

// Dummy test to prevent empty test suite warning
describe("NewRelic Mock", () => {
  it("should be properly configured", () => {
    expect(newrelic.startSegment).toBeDefined();
    expect(newrelic.addCustomAttribute).toBeDefined();
    expect(newrelic.addCustomAttributes).toBeDefined();
    expect(newrelic.setTransactionName).toBeDefined();
    expect(newrelic.getTransaction).toBeDefined();
    expect(newrelic.noticeError).toBeDefined();
  });
});
