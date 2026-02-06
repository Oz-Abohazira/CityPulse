// =============================================================================
// PRISMA CLIENT WRAPPER
// Provides lazy initialization and graceful degradation for serverless
// =============================================================================

import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient | null = null;
let initializationFailed = false;

/**
 * Get the Prisma client instance.
 * Returns null if database is unavailable (e.g., serverless without persistent storage).
 */
export function getPrisma(): PrismaClient | null {
  if (initializationFailed) {
    return null;
  }

  if (!prisma) {
    try {
      prisma = new PrismaClient();
      // Test the connection
      // Note: We don't await here because we want this to be sync
      // The actual connection test happens on first query
    } catch (error) {
      console.warn('Prisma initialization failed - database features will be unavailable:', error);
      initializationFailed = true;
      return null;
    }
  }

  return prisma;
}

/**
 * Check if database is available.
 * Tests the connection and returns true/false.
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  const client = getPrisma();
  if (!client) return false;

  try {
    // Simple query to test connection
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.warn('Database connection test failed:', error);
    initializationFailed = true;
    return false;
  }
}

/**
 * Safely execute a database operation.
 * Returns null if database is unavailable.
 */
export async function safeDbOperation<T>(
  operation: (prisma: PrismaClient) => Promise<T>
): Promise<T | null> {
  const client = getPrisma();
  if (!client) return null;

  try {
    return await operation(client);
  } catch (error) {
    console.warn('Database operation failed:', error);
    return null;
  }
}

export default getPrisma;
