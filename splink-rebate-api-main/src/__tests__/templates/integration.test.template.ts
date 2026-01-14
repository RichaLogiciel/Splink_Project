/* eslint-disable */
/**
 * Integration Test Template
 *
 * Use this template when creating integration tests for API endpoints.
 * Replace [Feature] and [endpoint] with your actual feature name and endpoint.
 */

import request from 'supertest';
import app from '../../app';
import { sequelize } from '../../models';
import {
  createMockUser,
  createMock[EntityName],
  createMockJWT,
} from '../mocks/mockFactories';

describe('[Feature] API Integration Tests', () => {
  let authToken: string;
  let testUser: any;

  beforeAll(async () => {
    // Set up test database
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    // Close database connection
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clean database between tests
    await sequelize.truncate({ cascade: true, restartIdentity: true });

    // Create test user and authenticate
    testUser = await createTestUser();
    authToken = await getAuthToken(testUser);
  });

  describe('GET /api/v1/[endpoint]', () => {
    describe('success cases', () => {
      it('should return list of [entities] successfully', async () => {
        // Arrange
        const [entity1, entity2] = await createTestEntities(2);

        // Act
        const response = await request(app)
          .get('/api/v1/[endpoint]')
          .set('Authorization', `Bearer ${authToken}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({ id: [entity1].id }),
            expect.objectContaining({ id: [entity2].id }),
          ]),
        });
      });

      it('should return paginated results', async () => {
        // Arrange
        await createTestEntities(15);

        // Act
        const response = await request(app)
          .get('/api/v1/[endpoint]')
          .query({ page: 1, limit: 10 })
          .set('Authorization', `Bearer ${authToken}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(10);
        expect(response.body.pagination).toMatchObject({
          page: 1,
          limit: 10,
          total: 15,
          totalPages: 2,
          hasNextPage: true,
          hasPrevPage: false,
        });
      });

      it('should filter results by [criteria]', async () => {
        // Arrange
        const activeEntity = await createTestEntity({ status: 'active' });
        const inactiveEntity = await createTestEntity({ status: 'inactive' });

        // Act
        const response = await request(app)
          .get('/api/v1/[endpoint]')
          .query({ status: 'active' })
          .set('Authorization', `Bearer ${authToken}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].id).toBe(activeEntity.id);
      });

      it('should sort results by [field]', async () => {
        // Arrange
        const entity1 = await createTestEntity({ name: 'Zebra' });
        const entity2 = await createTestEntity({ name: 'Alpha' });

        // Act
        const response = await request(app)
          .get('/api/v1/[endpoint]')
          .query({ sortBy: 'name', order: 'asc' })
          .set('Authorization', `Bearer ${authToken}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data[0].name).toBe('Alpha');
        expect(response.body.data[1].name).toBe('Zebra');
      });
    });

    describe('error cases', () => {
      it('should return 401 when not authenticated', async () => {
        // Act
        const response = await request(app)
          .get('/api/v1/[endpoint]');

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      it('should return 403 when user lacks permission', async () => {
        // Arrange
        const unauthorizedUser = await createTestUser({ role: 'basic_user' });
        const unauthorizedToken = await getAuthToken(unauthorizedUser);

        // Act
        const response = await request(app)
          .get('/api/v1/[endpoint]')
          .set('Authorization', `Bearer ${unauthorizedToken}`);

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.message).toContain('permission');
      });

      it('should return 400 for invalid query parameters', async () => {
        // Act
        const response = await request(app)
          .get('/api/v1/[endpoint]')
          .query({ page: -1 })
          .set('Authorization', `Bearer ${authToken}`);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
      });
    });
  });

  describe('GET /api/v1/[endpoint]/:id', () => {
    describe('success cases', () => {
      it('should return [entity] by id successfully', async () => {
        // Arrange
        const entity = await createTestEntity();

        // Act
        const response = await request(app)
          .get(`/api/v1/[endpoint]/${entity.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            id: entity.id,
            name: entity.name,
          }),
        });
      });

      it('should include related entities', async () => {
        // Arrange
        const entity = await createTestEntityWithRelations();

        // Act
        const response = await request(app)
          .get(`/api/v1/[endpoint]/${entity.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.relatedEntity).toBeDefined();
      });
    });

    describe('error cases', () => {
      it('should return 404 when [entity] not found', async () => {
        // Act
        const response = await request(app)
          .get('/api/v1/[endpoint]/999999')
          .set('Authorization', `Bearer ${authToken}`);

        // Assert
        expect(response.status).toBe(404);
        expect(response.body.message).toContain('not found');
      });

      it('should return 400 for invalid id format', async () => {
        // Act
        const response = await request(app)
          .get('/api/v1/[endpoint]/invalid-id')
          .set('Authorization', `Bearer ${authToken}`);

        // Assert
        expect(response.status).toBe(400);
      });
    });
  });

  describe('POST /api/v1/[endpoint]', () => {
    describe('success cases', () => {
      it('should create [entity] successfully', async () => {
        // Arrange
        const entityData = {
          name: 'Test Entity',
          description: 'Test description',
          // Additional fields
        };

        // Act
        const response = await request(app)
          .post('/api/v1/[endpoint]')
          .set('Authorization', `Bearer ${authToken}`)
          .send(entityData);

        // Assert
        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          success: true,
          data: expect.objectContaining({
            name: entityData.name,
            description: entityData.description,
          }),
        });

        // Verify entity was created in database
        const createdEntity = await [Model].findByPk(response.body.data.id);
        expect(createdEntity).toBeDefined();
      });

      it('should create [entity] with default values', async () => {
        // Arrange
        const minimalData = {
          name: 'Test Entity',
        };

        // Act
        const response = await request(app)
          .post('/api/v1/[endpoint]')
          .set('Authorization', `Bearer ${authToken}`)
          .send(minimalData);

        // Assert
        expect(response.status).toBe(201);
        expect(response.body.data.status).toBe('draft'); // Default value
      });
    });

    describe('error cases', () => {
      it('should return 400 when required fields are missing', async () => {
        // Arrange
        const incompleteData = {
          // Missing required field
        };

        // Act
        const response = await request(app)
          .post('/api/v1/[endpoint]')
          .set('Authorization', `Bearer ${authToken}`)
          .send(incompleteData);

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.errors).toBeDefined();
        expect(response.body.errors).toContain(
          expect.objectContaining({
            field: 'requiredField',
            message: expect.any(String),
          })
        );
      });

      it('should return 400 for invalid data types', async () => {
        // Arrange
        const invalidData = {
          name: 'Test',
          amount: 'not-a-number', // Should be number
        };

        // Act
        const response = await request(app)
          .post('/api/v1/[endpoint]')
          .set('Authorization', `Bearer ${authToken}`)
          .send(invalidData);

        // Assert
        expect(response.status).toBe(400);
      });

      it('should return 409 when entity already exists', async () => {
        // Arrange
        const entityData = { name: 'Unique Name' };
        await createTestEntity(entityData);

        // Act - Try to create duplicate
        const response = await request(app)
          .post('/api/v1/[endpoint]')
          .set('Authorization', `Bearer ${authToken}`)
          .send(entityData);

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.message).toContain('already exists');
      });
    });
  });

  describe('PUT /api/v1/[endpoint]/:id', () => {
    describe('success cases', () => {
      it('should update [entity] successfully', async () => {
        // Arrange
        const entity = await createTestEntity();
        const updateData = {
          name: 'Updated Name',
          description: 'Updated description',
        };

        // Act
        const response = await request(app)
          .put(`/api/v1/[endpoint]/${entity.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(updateData);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data).toMatchObject(updateData);

        // Verify entity was updated in database
        await entity.reload();
        expect(entity.name).toBe(updateData.name);
      });

      it('should update partial fields', async () => {
        // Arrange
        const entity = await createTestEntity({ name: 'Original', description: 'Original' });
        const partialUpdate = { name: 'Updated' };

        // Act
        const response = await request(app)
          .put(`/api/v1/[endpoint]/${entity.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send(partialUpdate);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.name).toBe('Updated');
        expect(response.body.data.description).toBe('Original'); // Unchanged
      });
    });

    describe('error cases', () => {
      it('should return 404 when updating non-existent [entity]', async () => {
        // Act
        const response = await request(app)
          .put('/api/v1/[endpoint]/999999')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ name: 'Updated' });

        // Assert
        expect(response.status).toBe(404);
      });

      it('should return 400 for invalid update data', async () => {
        // Arrange
        const entity = await createTestEntity();

        // Act
        const response = await request(app)
          .put(`/api/v1/[endpoint]/${entity.id}`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ invalidField: 'value' });

        // Assert
        expect(response.status).toBe(400);
      });
    });
  });

  describe('DELETE /api/v1/[endpoint]/:id', () => {
    describe('success cases', () => {
      it('should delete [entity] successfully', async () => {
        // Arrange
        const entity = await createTestEntity();

        // Act
        const response = await request(app)
          .delete(`/api/v1/[endpoint]/${entity.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.message).toContain('deleted');

        // Verify entity was deleted from database
        const deletedEntity = await [Model].findByPk(entity.id);
        expect(deletedEntity).toBeNull();
      });
    });

    describe('error cases', () => {
      it('should return 404 when deleting non-existent [entity]', async () => {
        // Act
        const response = await request(app)
          .delete('/api/v1/[endpoint]/999999')
          .set('Authorization', `Bearer ${authToken}`);

        // Assert
        expect(response.status).toBe(404);
      });

      it('should return 403 when user lacks permission to delete', async () => {
        // Arrange
        const entity = await createTestEntity();
        const unauthorizedUser = await createTestUser({ role: 'basic_user' });
        const unauthorizedToken = await getAuthToken(unauthorizedUser);

        // Act
        const response = await request(app)
          .delete(`/api/v1/[endpoint]/${entity.id}`)
          .set('Authorization', `Bearer ${unauthorizedToken}`);

        // Assert
        expect(response.status).toBe(403);
      });

      it('should return 409 when entity has dependencies', async () => {
        // Arrange
        const entity = await createTestEntityWithDependencies();

        // Act
        const response = await request(app)
          .delete(`/api/v1/[endpoint]/${entity.id}`)
          .set('Authorization', `Bearer ${authToken}`);

        // Assert
        expect(response.status).toBe(409);
        expect(response.body.message).toContain('cannot be deleted');
      });
    });
  });
});

// Helper functions
async function createTestUser(overrides = {}) {
  const userData = createMockUser(overrides);
  return await User.create(userData);
}

async function createTestEntity(overrides = {}) {
  const entityData = createMock[EntityName](overrides);
  return await [Model].create(entityData);
}

async function createTestEntities(count: number) {
  const entities = [];
  for (let i = 0; i < count; i++) {
    entities.push(await createTestEntity({ name: `Entity ${i + 1}` }));
  }
  return entities;
}

async function createTestEntityWithRelations() {
  const entity = await createTestEntity();
  const relatedEntity = await createRelatedEntity({ entityId: entity.id });
  await entity.reload({ include: [RelatedModel] });
  return entity;
}

async function createTestEntityWithDependencies() {
  const entity = await createTestEntity();
  await createDependentEntity({ entityId: entity.id });
  return entity;
}

async function getAuthToken(user: any): Promise<string> {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({
      email: user.email,
      password: 'password123', // Use test password
    });
  return response.body.token;
}
