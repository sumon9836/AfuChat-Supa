/**
 * expo-sqlite web shim for Metro bundler.
 *
 * expo-sqlite's web entry point imports a wa-sqlite.wasm binary that is not
 * shipped in the npm package, causing Metro to fail during web bundling with
 * "Unable to resolve module ./wa-sqlite/wa-sqlite.wasm".
 *
 * This shim is injected by metro.config.js for the web platform only.
 * Runtime web usage already returns a no-op DB (see lib/storage/db.ts), so
 * these exports are never actually called — they just need to exist so Metro
 * can finish resolving the module graph.
 */

export async function openDatabaseAsync() {
  return {
    execAsync: async () => {},
    runAsync: async () => ({ lastInsertRowId: 0, changes: 0 }),
    getAllAsync: async () => [],
    getFirstAsync: async () => null,
    closeAsync: async () => {},
  };
}

export function openDatabaseSync() {
  return {
    execSync: () => {},
    runSync: () => ({ lastInsertRowId: 0, changes: 0 }),
    getAllSync: () => [],
    getFirstSync: () => null,
    closeSync: () => {},
  };
}

export const SQLiteDatabase = class {};
export const SQLiteStatement = class {};

export default { openDatabaseAsync, openDatabaseSync };
