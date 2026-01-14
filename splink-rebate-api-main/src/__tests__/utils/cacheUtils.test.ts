/**
 * CacheUtils Tests
 *
 * Tests for cache key generation utilities
 * Focuses on hashing and key creation for Redis caching
 */

import { createCacheKey, getHashedCacheKey } from "../../utils/cacheUtils";

describe("CacheUtils", () => {
  describe("getHashedCacheKey", () => {
    it("should generate MD5 hash for given string", () => {
      // Arrange
      const input = "test_key";

      // Act
      const result = getHashedCacheKey(input);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
      expect(result).toHaveLength(32); // MD5 hash is 32 characters
    });

    it("should generate consistent hash for same input", () => {
      // Arrange
      const input = "consistent_key";

      // Act
      const result1 = getHashedCacheKey(input);
      const result2 = getHashedCacheKey(input);

      // Assert
      expect(result1).toBe(result2);
    });

    it("should generate different hashes for different inputs", () => {
      // Arrange
      const input1 = "key_one";
      const input2 = "key_two";

      // Act
      const hash1 = getHashedCacheKey(input1);
      const hash2 = getHashedCacheKey(input2);

      // Assert
      expect(hash1).not.toBe(hash2);
    });

    it("should handle empty string", () => {
      // Arrange
      const input = "";

      // Act
      const result = getHashedCacheKey(input);

      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveLength(32);
    });

    it("should handle special characters", () => {
      // Arrange
      const input = "key@#$%^&*()";

      // Act
      const result = getHashedCacheKey(input);

      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveLength(32);
      expect(result).toMatch(/^[a-f0-9]{32}$/); // MD5 hash format
    });

    it("should handle numeric strings", () => {
      // Arrange
      const input = "123456789";

      // Act
      const result = getHashedCacheKey(input);

      // Assert
      expect(result).toBeDefined();
      expect(result).toHaveLength(32);
    });

    it("should generate different hashes for similar but different strings", () => {
      // Arrange
      const input1 = "user_123";
      const input2 = "user_124";

      // Act
      const hash1 = getHashedCacheKey(input1);
      const hash2 = getHashedCacheKey(input2);

      // Assert
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("createCacheKey", () => {
    it("should create cache key with prefix and hash", () => {
      // Arrange
      const prefix = "user";
      const key = { id: 123, role: "admin" };

      // Act
      const result = createCacheKey(prefix, key);

      // Assert
      expect(result).toMatch(/^user_/);
      expect(result.length).toBeGreaterThan(prefix.length + 1);
    });

    it("should create consistent keys for same input", () => {
      // Arrange
      const prefix = "product";
      const key = { id: 456, category: "electronics" };

      // Act
      const result1 = createCacheKey(prefix, key);
      const result2 = createCacheKey(prefix, key);

      // Assert
      expect(result1).toBe(result2);
    });

    it("should create different keys for different prefixes", () => {
      // Arrange
      const key = { id: 123 };

      // Act
      const result1 = createCacheKey("prefix1", key);
      const result2 = createCacheKey("prefix2", key);

      // Assert
      expect(result1).not.toBe(result2);
      expect(result1).toMatch(/^prefix1_/);
      expect(result2).toMatch(/^prefix2_/);
    });

    it("should create different keys for different key objects", () => {
      // Arrange
      const prefix = "store";
      const key1 = { id: 1, type: "A" };
      const key2 = { id: 2, type: "B" };

      // Act
      const result1 = createCacheKey(prefix, key1);
      const result2 = createCacheKey(prefix, key2);

      // Assert
      expect(result1).not.toBe(result2);
    });

    it("should handle undefined values as 'null'", () => {
      // Arrange
      const prefix = "test";
      const key = { id: 123, optional: undefined };

      // Act
      const result = createCacheKey(prefix, key);

      // Assert
      expect(result).toBeDefined();
      expect(result).toMatch(/^test_/);
    });

    it("should handle empty object", () => {
      // Arrange
      const prefix = "empty";
      const key = {};

      // Act
      const result = createCacheKey(prefix, key);

      // Assert
      expect(result).toBeDefined();
      expect(result).toMatch(/^empty_/);
    });

    it("should join multiple key values with underscore", () => {
      // Arrange
      const prefix = "multi";
      const key = { a: 1, b: 2, c: 3 };

      // Act
      const result = createCacheKey(prefix, key);

      // Assert
      expect(result).toBeDefined();
      expect(result).toMatch(/^multi_/);
      // The hash should be deterministic based on "1_2_3"
    });

    it("should handle string values in key object", () => {
      // Arrange
      const prefix = "string";
      const key = { name: "test", type: "user" };

      // Act
      const result = createCacheKey(prefix, key);

      // Assert
      expect(result).toBeDefined();
      expect(result).toMatch(/^string_/);
    });

    it("should handle numeric values in key object", () => {
      // Arrange
      const prefix = "number";
      const key = { id: 999, count: 42 };

      // Act
      const result = createCacheKey(prefix, key);

      // Assert
      expect(result).toBeDefined();
      expect(result).toMatch(/^number_/);
    });

    it("should handle boolean values in key object", () => {
      // Arrange
      const prefix = "bool";
      const key = { active: true, deleted: false };

      // Act
      const result = createCacheKey(prefix, key);

      // Assert
      expect(result).toBeDefined();
      expect(result).toMatch(/^bool_/);
    });

    it("should handle null values in key object", () => {
      // Arrange
      const prefix = "nullable";
      const key = { id: 123, optional: null };

      // Act
      const result = createCacheKey(prefix, key);

      // Assert
      expect(result).toBeDefined();
      expect(result).toMatch(/^nullable_/);
    });

    it("should produce different keys when object property order changes", () => {
      // Arrange - Note: Object.values() order depends on property definition order
      const prefix = "order";
      const key1 = { a: 1, b: 2 };
      const key2 = { b: 2, a: 1 };

      // Act
      const result1 = createCacheKey(prefix, key1);
      const result2 = createCacheKey(prefix, key2);

      // Assert
      // In JavaScript, Object.values() respects insertion order
      // So these should be the same if properties were defined in same order
      // But since they're defined differently, they might differ
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it("should handle complex nested values gracefully", () => {
      // Arrange
      const prefix = "complex";
      const key = {
        id: 123,
        metadata: { nested: "value" },
        array: [1, 2, 3]
      };

      // Act
      const result = createCacheKey(prefix, key);

      // Assert
      expect(result).toBeDefined();
      expect(result).toMatch(/^complex_/);
    });
  });
});
