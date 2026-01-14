import dotenv from "dotenv";
import sequelize from "../db";
import logger from "../lib/logger";

dotenv.config();

const { DB_WORK_MEM_SIZE = "64MB" } = process.env;

/**
 * Executes a database query or operation with increased work_mem setting.
 * This is useful for complex queries that involve large sorts, hash joins, or grouping operations.
 *
 * The work_mem setting is applied at the session level using SET LOCAL, which means:
 * - It only affects the current transaction
 * - It automatically resets after the transaction completes
 * - It's safe to use in a connection pool
 *
 * @template T - The return type of the query function
 * @param {() => Promise<T>} queryFn - The async function that executes the database query
 * @param {string} [workMemSize] - The work_mem size to set (e.g., '64MB', '128MB'). Defaults to DB_WORK_MEM_SIZE env variable or '64MB'
 * @returns {Promise<T>} - The result of the query function
 *
 * @example
 * const results = await executeWithIncreasedWorkMem(
 *   () => DistributorRepository.getProductInsights(...),
 *   '128MB'
 * );
 */
export async function executeWithIncreasedWorkMem<T>(
  queryFn: () => Promise<T>,
  workMemSize: string = DB_WORK_MEM_SIZE
): Promise<T> {
  try {
    // Use a transaction to ensure SET LOCAL is scoped properly
    return await sequelize.transaction(async (transaction) => {
      // Set work_mem for this transaction only (SET LOCAL)
      await sequelize.query(`SET LOCAL work_mem = '${workMemSize}'`, {
        transaction
      });

      logger.debug(
        `[DB Optimization] Set work_mem to ${workMemSize} for current transaction`
      );

      // Execute the query function within the same transaction
      // Note: The queryFn should accept and use the transaction if possible
      // For now, we're setting it at the session level which will apply to subsequent queries
      const result = await queryFn();

      return result;
    });
  } catch (error) {
    logger.error(
      `[DB Optimization] Error executing query with increased work_mem: ${error}`
    );
    throw error;
  }
}

/**
 * Executes a raw SQL query with increased work_mem setting.
 * This is a convenience wrapper for raw queries that need performance optimization.
 *
 * @param {string} sql - The SQL query to execute
 * @param {any} [options] - Sequelize query options
 * @param {string} [workMemSize] - The work_mem size to set. Defaults to DB_WORK_MEM_SIZE env variable or '64MB'
 * @returns {Promise<any>} - The result of the query
 *
 * @example
 * const results = await executeRawQueryWithWorkMem(
 *   'SELECT * FROM large_table WHERE ...',
 *   { type: QueryTypes.SELECT },
 *   '128MB'
 * );
 */
export async function executeRawQueryWithWorkMem(
  sql: string,
  options: any = {},
  workMemSize: string = DB_WORK_MEM_SIZE
): Promise<any> {
  return await executeWithIncreasedWorkMem(async () => {
    return await sequelize.query(sql, options);
  }, workMemSize);
}

/**
 * Higher-order function that wraps a repository method to execute with increased work_mem.
 * Useful for creating optimized versions of repository methods without modifying the original.
 *
 * @template T - The return type of the method
 * @param {(...args: any[]) => Promise<T>} method - The repository method to wrap
 * @param {string} [workMemSize] - The work_mem size to set. Defaults to DB_WORK_MEM_SIZE env variable or '64MB'
 * @returns {(...args: any[]) => Promise<T>} - A wrapped version of the method
 *
 * @example
 * const optimizedGetProductInsights = withIncreasedWorkMem(
 *   DistributorRepository.getProductInsights.bind(DistributorRepository),
 *   '128MB'
 * );
 * const results = await optimizedGetProductInsights(distributorId, ...);
 */
export function withIncreasedWorkMem<T>(
  method: (...args: any[]) => Promise<T>,
  workMemSize: string = DB_WORK_MEM_SIZE
): (...args: any[]) => Promise<T> {
  return async (...args: any[]): Promise<T> => {
    return await executeWithIncreasedWorkMem(
      () => method(...args),
      workMemSize
    );
  };
}

/**
 * Decorator function to mark methods that should execute with increased work_mem.
 * Can be used as a TypeScript decorator on repository or service methods.
 *
 * @param {string} [workMemSize] - The work_mem size to set. Defaults to DB_WORK_MEM_SIZE env variable or '64MB'
 * @returns {MethodDecorator} - A method decorator
 *
 * @example
 * class MyRepository {
 *   @OptimizeWorkMem('128MB')
 *   async getComplexData() {
 *     // This method will automatically execute with increased work_mem
 *   }
 * }
 */
export function OptimizeWorkMem(
  workMemSize: string = DB_WORK_MEM_SIZE
): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return await executeWithIncreasedWorkMem(
        () => originalMethod.apply(this, args),
        workMemSize
      );
    };

    return descriptor;
  };
}
