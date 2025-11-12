# Database Migrations

This directory contains database migration logic for schema changes.

## Migration Strategy

Migrations are defined in `database.js` in the `migrations` object. Each migration function receives:
- `db`: The IDBDatabase instance
- `transaction`: The IDBTransaction instance

## Adding a New Migration

When you need to change the database schema:

1. **Increment the version**: Update `DB_VERSION` in `database.js`
2. **Add migration function**: Add a new entry to the `migrations` object:

```javascript
const migrations = {
  1: (db, transaction) => { /* initial setup */ },
  2: (db, transaction) => {
    // Example: Add a new index to existing store
    const store = transaction.objectStore('tasks');
    if (!store.indexNames.contains('byCompletedAt')) {
      store.createIndex('byCompletedAt', 'completedAt');
    }
  },
  3: (db, transaction) => {
    // Example: Create a new object store
    if (!db.objectStoreNames.contains('notifications')) {
      const store = db.createObjectStore('notifications', { keyPath: 'id' });
      store.createIndex('byRead', 'read');
      store.createIndex('byCreatedAt', 'createdAt');
    }
  }
};
```

## Migration Best Practices

1. **Always check if store/index exists**: Use `db.objectStoreNames.contains()` and `store.indexNames.contains()` before creating
2. **Handle data transformations**: If you're changing data structure, transform existing data in the migration
3. **Test migrations**: Test migrations with existing data to ensure they work correctly
4. **Document changes**: Add comments explaining what the migration does and why
5. **Keep migrations idempotent**: Migrations should be safe to run multiple times

## Example: Adding a Field to Existing Records

```javascript
3: async (db, transaction) => {
  const store = transaction.objectStore('tasks');
  const cursor = await store.openCursor();
  
  while (cursor) {
    const task = cursor.value;
    if (!task.hasOwnProperty('newField')) {
      task.newField = 'defaultValue';
      cursor.update(task);
    }
    cursor = await cursor.continue();
  }
}
```

## Migration Testing

When testing migrations:
1. Create a test database with old schema
2. Add sample data
3. Run migration
4. Verify data integrity and new schema

