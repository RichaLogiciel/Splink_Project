/* eslint-disable */
/**
 * Repository Test Template
 *
 * Use this template when creating tests for repository classes.
 * Replace [RepositoryName] with your actual repository name.
 */

import { [RepositoryName] } from '../../repositories/[RepositoryName]';
import { [ModelName] } from '../../models/[ModelName]';
import { createMock[EntityName] } from '../mocks/mockFactories';
import { createMockTransaction } from '../utils/testHelpers';

// Mock the Sequelize model
jest.mock('../../models/[ModelName]');

describe('[RepositoryName]', () => {
  let repository: [RepositoryName];
  let mockModel: any;
  let mockTransaction: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up model mock
    mockModel = [ModelName] as any;
    mockTransaction = createMockTransaction();

    // Initialize repository
    repository = new [RepositoryName]();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findById', () => {
    it('should find [entity] by id successfully', async () => {
      // Arrange
      const mockEntity = createMock[EntityName]({ id: 1 });
      mockModel.findByPk = jest.fn().mockResolvedValue(mockEntity);

      // Act
      const result = await repository.findById(1);

      // Assert
      expect(result).toEqual(mockEntity);
      expect(mockModel.findByPk).toHaveBeenCalledWith(1, undefined);
    });

    it('should return null when [entity] not found', async () => {
      // Arrange
      mockModel.findByPk = jest.fn().mockResolvedValue(null);

      // Act
      const result = await repository.findById(999);

      // Assert
      expect(result).toBeNull();
      expect(mockModel.findByPk).toHaveBeenCalledWith(999, undefined);
    });

    it('should include related models when specified', async () => {
      // Arrange
      const mockEntity = createMock[EntityName]();
      const options = { include: ['RelatedModel'] };
      mockModel.findByPk = jest.fn().mockResolvedValue(mockEntity);

      // Act
      const result = await repository.findById(1, options);

      // Assert
      expect(result).toEqual(mockEntity);
      expect(mockModel.findByPk).toHaveBeenCalledWith(1, options);
    });

    it('should handle database errors', async () => {
      // Arrange
      mockModel.findByPk = jest.fn().mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findById(1)).rejects.toThrow('DB Error');
    });
  });

  describe('findOne', () => {
    it('should find [entity] by criteria', async () => {
      // Arrange
      const mockEntity = createMock[EntityName]();
      const criteria = { name: 'Test' };
      mockModel.findOne = jest.fn().mockResolvedValue(mockEntity);

      // Act
      const result = await repository.findOne(criteria);

      // Assert
      expect(result).toEqual(mockEntity);
      expect(mockModel.findOne).toHaveBeenCalledWith({ where: criteria });
    });

    it('should return null when no match found', async () => {
      // Arrange
      mockModel.findOne = jest.fn().mockResolvedValue(null);

      // Act
      const result = await repository.findOne({ name: 'Nonexistent' });

      // Assert
      expect(result).toBeNull();
    });

    it('should support complex where clauses', async () => {
      // Arrange
      const mockEntity = createMock[EntityName]();
      const criteria = {
        status: 'active',
        createdAt: { $gte: new Date('2025-01-01') },
      };
      mockModel.findOne = jest.fn().mockResolvedValue(mockEntity);

      // Act
      const result = await repository.findOne(criteria);

      // Assert
      expect(result).toEqual(mockEntity);
      expect(mockModel.findOne).toHaveBeenCalledWith({ where: criteria });
    });
  });

  describe('findAll', () => {
    it('should return all [entities]', async () => {
      // Arrange
      const mockEntities = [
        createMock[EntityName]({ id: 1 }),
        createMock[EntityName]({ id: 2 }),
        createMock[EntityName]({ id: 3 }),
      ];
      mockModel.findAll = jest.fn().mockResolvedValue(mockEntities);

      // Act
      const result = await repository.findAll();

      // Assert
      expect(result).toEqual(mockEntities);
      expect(result).toHaveLength(3);
      expect(mockModel.findAll).toHaveBeenCalledWith({});
    });

    it('should filter by criteria', async () => {
      // Arrange
      const mockEntities = [createMock[EntityName]({ status: 'active' })];
      const criteria = { status: 'active' };
      mockModel.findAll = jest.fn().mockResolvedValue(mockEntities);

      // Act
      const result = await repository.findAll(criteria);

      // Assert
      expect(result).toEqual(mockEntities);
      expect(mockModel.findAll).toHaveBeenCalledWith({ where: criteria });
    });

    it('should return empty array when no results', async () => {
      // Arrange
      mockModel.findAll = jest.fn().mockResolvedValue([]);

      // Act
      const result = await repository.findAll({ status: 'nonexistent' });

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should support pagination', async () => {
      // Arrange
      const mockEntities = [createMock[EntityName]()];
      const options = { limit: 10, offset: 20 };
      mockModel.findAll = jest.fn().mockResolvedValue(mockEntities);

      // Act
      const result = await repository.findAll({}, options);

      // Assert
      expect(result).toEqual(mockEntities);
      expect(mockModel.findAll).toHaveBeenCalledWith({ where: {}, ...options });
    });

    it('should support sorting', async () => {
      // Arrange
      const mockEntities = [createMock[EntityName]()];
      const options = { order: [['name', 'ASC']] };
      mockModel.findAll = jest.fn().mockResolvedValue(mockEntities);

      // Act
      const result = await repository.findAll({}, options);

      // Assert
      expect(result).toEqual(mockEntities);
      expect(mockModel.findAll).toHaveBeenCalledWith({ where: {}, ...options });
    });

    it('should support including relations', async () => {
      // Arrange
      const mockEntities = [createMock[EntityName]()];
      const options = { include: ['RelatedModel'] };
      mockModel.findAll = jest.fn().mockResolvedValue(mockEntities);

      // Act
      const result = await repository.findAll({}, options);

      // Assert
      expect(result).toEqual(mockEntities);
      expect(mockModel.findAll).toHaveBeenCalledWith({ where: {}, ...options });
    });
  });

  describe('create', () => {
    it('should create [entity] successfully', async () => {
      // Arrange
      const entityData = {
        name: 'Test Entity',
        description: 'Test description',
      };
      const mockEntity = createMock[EntityName](entityData);
      mockModel.create = jest.fn().mockResolvedValue(mockEntity);

      // Act
      const result = await repository.create(entityData);

      // Assert
      expect(result).toEqual(mockEntity);
      expect(mockModel.create).toHaveBeenCalledWith(entityData, undefined);
    });

    it('should create [entity] within transaction', async () => {
      // Arrange
      const entityData = { name: 'Test' };
      const mockEntity = createMock[EntityName](entityData);
      mockModel.create = jest.fn().mockResolvedValue(mockEntity);

      // Act
      const result = await repository.create(entityData, { transaction: mockTransaction });

      // Assert
      expect(result).toEqual(mockEntity);
      expect(mockModel.create).toHaveBeenCalledWith(entityData, {
        transaction: mockTransaction,
      });
    });

    it('should handle validation errors', async () => {
      // Arrange
      const invalidData = { name: '' }; // Invalid
      mockModel.create = jest.fn().mockRejectedValue(
        new Error('Validation error: name cannot be empty')
      );

      // Act & Assert
      await expect(repository.create(invalidData)).rejects.toThrow('Validation error');
    });

    it('should handle unique constraint violations', async () => {
      // Arrange
      const duplicateData = { email: 'existing@example.com' };
      mockModel.create = jest.fn().mockRejectedValue(
        new Error('Unique constraint violation')
      );

      // Act & Assert
      await expect(repository.create(duplicateData)).rejects.toThrow(
        'Unique constraint violation'
      );
    });
  });

  describe('update', () => {
    it('should update [entity] successfully', async () => {
      // Arrange
      const updateData = { name: 'Updated Name' };
      const mockEntity = createMock[EntityName]({ id: 1, name: 'Updated Name' });
      mockModel.update = jest.fn().mockResolvedValue([1, [mockEntity]]);

      // Act
      const result = await repository.update(1, updateData);

      // Assert
      expect(result).toEqual(mockEntity);
      expect(mockModel.update).toHaveBeenCalledWith(updateData, {
        where: { id: 1 },
        returning: true,
      });
    });

    it('should update [entity] within transaction', async () => {
      // Arrange
      const updateData = { name: 'Updated' };
      const mockEntity = createMock[EntityName](updateData);
      mockModel.update = jest.fn().mockResolvedValue([1, [mockEntity]]);

      // Act
      const result = await repository.update(1, updateData, {
        transaction: mockTransaction,
      });

      // Assert
      expect(result).toEqual(mockEntity);
      expect(mockModel.update).toHaveBeenCalledWith(updateData, {
        where: { id: 1 },
        returning: true,
        transaction: mockTransaction,
      });
    });

    it('should return null when [entity] not found', async () => {
      // Arrange
      mockModel.update = jest.fn().mockResolvedValue([0, []]);

      // Act
      const result = await repository.update(999, { name: 'Updated' });

      // Assert
      expect(result).toBeNull();
    });

    it('should handle partial updates', async () => {
      // Arrange
      const partialUpdate = { status: 'inactive' };
      const mockEntity = createMock[EntityName]({ id: 1, status: 'inactive' });
      mockModel.update = jest.fn().mockResolvedValue([1, [mockEntity]]);

      // Act
      const result = await repository.update(1, partialUpdate);

      // Assert
      expect(result).toEqual(mockEntity);
      expect(mockModel.update).toHaveBeenCalledWith(partialUpdate, {
        where: { id: 1 },
        returning: true,
      });
    });
  });

  describe('delete', () => {
    it('should delete [entity] successfully', async () => {
      // Arrange
      mockModel.destroy = jest.fn().mockResolvedValue(1);

      // Act
      const result = await repository.delete(1);

      // Assert
      expect(result).toBe(true);
      expect(mockModel.destroy).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should delete [entity] within transaction', async () => {
      // Arrange
      mockModel.destroy = jest.fn().mockResolvedValue(1);

      // Act
      const result = await repository.delete(1, { transaction: mockTransaction });

      // Assert
      expect(result).toBe(true);
      expect(mockModel.destroy).toHaveBeenCalledWith({
        where: { id: 1 },
        transaction: mockTransaction,
      });
    });

    it('should return false when [entity] not found', async () => {
      // Arrange
      mockModel.destroy = jest.fn().mockResolvedValue(0);

      // Act
      const result = await repository.delete(999);

      // Assert
      expect(result).toBe(false);
    });

    it('should handle foreign key constraint errors', async () => {
      // Arrange
      mockModel.destroy = jest.fn().mockRejectedValue(
        new Error('Foreign key constraint violation')
      );

      // Act & Assert
      await expect(repository.delete(1)).rejects.toThrow(
        'Foreign key constraint violation'
      );
    });
  });

  describe('count', () => {
    it('should count all [entities]', async () => {
      // Arrange
      mockModel.count = jest.fn().mockResolvedValue(42);

      // Act
      const result = await repository.count();

      // Assert
      expect(result).toBe(42);
      expect(mockModel.count).toHaveBeenCalledWith({});
    });

    it('should count [entities] by criteria', async () => {
      // Arrange
      const criteria = { status: 'active' };
      mockModel.count = jest.fn().mockResolvedValue(10);

      // Act
      const result = await repository.count(criteria);

      // Assert
      expect(result).toBe(10);
      expect(mockModel.count).toHaveBeenCalledWith({ where: criteria });
    });

    it('should return 0 when no matches', async () => {
      // Arrange
      mockModel.count = jest.fn().mockResolvedValue(0);

      // Act
      const result = await repository.count({ status: 'nonexistent' });

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple [entities]', async () => {
      // Arrange
      const entitiesData = [
        { name: 'Entity 1' },
        { name: 'Entity 2' },
        { name: 'Entity 3' },
      ];
      const mockEntities = entitiesData.map((data, index) =>
        createMock[EntityName]({ id: index + 1, ...data })
      );
      mockModel.bulkCreate = jest.fn().mockResolvedValue(mockEntities);

      // Act
      const result = await repository.bulkCreate(entitiesData);

      // Assert
      expect(result).toEqual(mockEntities);
      expect(result).toHaveLength(3);
      expect(mockModel.bulkCreate).toHaveBeenCalledWith(entitiesData, undefined);
    });

    it('should create with transaction', async () => {
      // Arrange
      const entitiesData = [{ name: 'Entity' }];
      const mockEntities = [createMock[EntityName]()];
      mockModel.bulkCreate = jest.fn().mockResolvedValue(mockEntities);

      // Act
      await repository.bulkCreate(entitiesData, { transaction: mockTransaction });

      // Assert
      expect(mockModel.bulkCreate).toHaveBeenCalledWith(entitiesData, {
        transaction: mockTransaction,
      });
    });

    it('should handle empty array', async () => {
      // Arrange
      mockModel.bulkCreate = jest.fn().mockResolvedValue([]);

      // Act
      const result = await repository.bulkCreate([]);

      // Assert
      expect(result).toEqual([]);
      expect(mockModel.bulkCreate).toHaveBeenCalledWith([], undefined);
    });
  });
});
