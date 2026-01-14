# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands

- `yarn dev` - Start development server with hot reload
- `yarn build` - Build TypeScript to JavaScript (runs lint first)
- `yarn start` - Run production build
- `yarn lint` - Run ESLint on source files
- `yarn lint:fix` - Run ESLint with auto-fix
- `yarn format` - Format code with Prettier

### Database Commands

- `yarn migrate` - Run database migrations
- `yarn migrate:undo` - Undo last migration
- `yarn seed` - Run database seeders
- `yarn db:create:test` - Create test database
- `yarn db:migrate:test` - Run migrations on test database

### Testing Commands

- `yarn test` - Run Jest tests
- `yarn test-watch` - Run tests in watch mode
- `yarn test:coverage` - Run tests with coverage report
- `yarn test:coverage:html` - Generate and open HTML coverage report
- `yarn test:coverage:ci` - Run tests with coverage for CI (text + lcov)
- `yarn test:watch:coverage` - Watch mode with coverage

## Architecture Overview

### Core Structure

- **Express.js API** with TypeScript
- **PostgreSQL** database with Sequelize ORM
- **Redis** for caching (ElastiCache)
- **JWT Authentication** with role-based authorization
- **Swagger** for API documentation
- **New Relic** for monitoring

### Key Patterns

- **Controller → Service → Repository → Model** architecture
- Controllers handle HTTP requests/responses
- Services contain business logic
- Repositories handle database queries
- Models define database schema and relationships

### Authentication & Authorization

- JWT-based authentication middleware in `src/middleware/authentication.ts`
- Role-based authorization in `src/middleware/authorize.ts`
- Request context middleware for user session data
- Roles defined in `src/config/roles.ts`

### Caching Strategy

- Redis caching with TTL configuration
- Cache keys generated using `createCacheKey()` utility
- Caching controlled by `useApiCaching` flag in app constants

### Database Architecture

- Sequelize models in `src/models/`
- Migrations in `src/migrations/`
- Multiple entity types: Users, Programs, Stores, Distributors, Manufacturers, Chains
- Materialized views for performance optimization

## Domain Entities

### Primary Business Objects

- **Programs**: Rebate programs with details, compliance, and participants
- **Stores**: Retail locations with sales representatives
- **Distributors**: Distribution companies managing stores
- **Manufacturers**: Companies creating rebate programs
- **Chains**: Store chains with aggregated data
- **Users**: System users with various roles

### Key Relationships

- Programs belong to Manufacturers
- Stores can participate in Programs through compliance
- Users have roles that determine access permissions
- Chains aggregate multiple stores for reporting

## Testing Guidelines

**See [TESTING.md](./TESTING.md) for comprehensive testing guidelines, patterns, and best practices.**

### Quick Reference

#### Test Structure

- Integration tests in `src/__tests__/integration/`
- Service tests in `src/__tests__/services/`
- Unit tests in `src/__tests__/unit/`
- Test mocks in `src/__tests__/mocks/`
- Test utilities in `src/__tests__/utils/`
- Test templates in `src/__tests__/templates/`

#### Coverage Goals

- Critical Services (Program, Chain, Store, Create/Update): **90%+**
- Supporting Services: **85%+**
- Overall Codebase: **70%+**

#### Git Hooks

- **Pre-commit**: Runs linting and tests on changed files
- **Pre-push**: Runs full test suite (prevents push if tests fail)

#### Key Resources

- **Testing Guidelines**: [TESTING.md](./TESTING.md) - Comprehensive patterns and best practices
- **Test Utilities**: `src/__tests__/utils/testHelpers.ts` - Reusable test helpers
- **Mock Factories**: `src/__tests__/mocks/mockFactories.ts` - Domain entity mocks
- **Templates**: `src/__tests__/templates/` - Test templates for services, integration, repositories

#### Testing Best Practices

- Place `jest.mock()` statements at the top of test files
- Use Arrange-Act-Assert pattern
- Test one thing at a time with descriptive names
- Mock only external dependencies (database, APIs, Redis)
- Test success cases, error cases, and edge cases
- Keep tests independent and isolated
- Use test utilities and mock factories for consistency

## Code Style Guidelines

### From .cursorrules

- Follow SOLID principles and strong typing
- Use descriptive naming: PascalCase for classes, camelCase for variables/functions
- Prefer arrow functions for simple operations
- Cache expensive computations with Redis
- Add comprehensive comments
- Use `Promise.all()` for performance optimization

### Performance Considerations

- Leverage Redis caching for expensive operations
- Use database indexes appropriately
- Implement materialized views for complex aggregations
- Optimize queries with proper joins and filtering

## Environment Setup

### Required Environment Variables

- Database configuration (DB_HOST, DB_USER, DB_PASSWORD, etc.)
- Redis configuration
- JWT secrets
- AWS S3 configuration for file uploads
- New Relic configuration

### SSH Tunnel Support

- Configure SSH tunnel for remote database access
- Set SSH_HOST, SSH_USERNAME, SSH_KEY_PATH in .env
- Use `USE_SSH_TUNNEL=true` to enable tunneling

## API Documentation

- Swagger UI available at `http://localhost:3000/` when running locally
- API endpoints prefixed with `/api/v1`
- Swagger JSON available at `/api/v1/swagger.json`
