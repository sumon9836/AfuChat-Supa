// No-op shim for expo-sqlite on web (Expo dev preview only).
// lib/storage/db.ts returns a stub at runtime for web anyway.
module.exports = {
  openDatabaseAsync: async () => null,
  openDatabaseSync: () => null,
  SQLiteDatabase: class {},
};
