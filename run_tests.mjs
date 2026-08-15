import assert from 'assert';
import { serializeVault, validateExport, deserializeVault } from './core/serialization.js';
import { Vault } from './core/vault.js';

// Setup Mock Repository
class MockRepository {
    constructor(initialEntries = []) {
        this.entries = new Map(initialEntries.map(e => [e.id, e]));
    }
    async list() {
        return Array.from(this.entries.values());
    }
    async get(id) {
        return this.entries.get(id);
    }
    async create(entry) {
        this.entries.set(entry.id, entry);
        return entry;
    }
    async update(id, changes) {
        const entry = this.entries.get(id);
        if (!entry) throw new Error('Not found');
        const updated = { ...entry, ...changes };
        this.entries.set(id, updated);
        return updated;
    }
    async remove(id) {
        this.entries.delete(id);
    }
}

// 1. Serialization Tests
function testSerialization() {
    console.log('Running: Serialization Tests...');

    // Test: Empty entries list
    const emptyResultStr = serializeVault([]);
    const emptyResult = JSON.parse(emptyResultStr);
    assert.strictEqual(emptyResult.format, 'dev-vault');
    assert.strictEqual(emptyResult.version, 1);
    assert.ok(Array.isArray(emptyResult.entries));
    assert.strictEqual(emptyResult.entries.length, 0);
    assert.ok(!isNaN(Date.parse(emptyResult.exportedAt)));

    // Test: Population with entries
    const originalEntries = [
        {
            id: 'id-1',
            title: 'Test Snippet',
            language: 'javascript',
            content: 'console.log("hello");\n"quotes" and \'single\' and `template` test.',
            type: 'snippet',
            description: 'A test description',
            tags: ['test', 'js'],
            createdAt: '2026-08-15T12:00:00.000Z',
            updatedAt: '2026-08-15T12:00:00.000Z',
            lastUsedAt: '2026-08-15T12:30:00.000Z',
            isFavorite: true
        }
    ];

    const resultStr = serializeVault(originalEntries);
    const result = JSON.parse(resultStr);

    assert.strictEqual(result.entries.length, 1);
    const serializedEntry = result.entries[0];
    assert.strictEqual(serializedEntry.id, 'id-1');
    assert.strictEqual(serializedEntry.title, 'Test Snippet');
    assert.strictEqual(serializedEntry.language, 'javascript');
    assert.strictEqual(serializedEntry.content, 'console.log("hello");\n"quotes" and \'single\' and `template` test.');
    assert.strictEqual(serializedEntry.type, 'snippet');
    assert.strictEqual(serializedEntry.description, 'A test description');
    assert.deepStrictEqual(serializedEntry.tags, ['test', 'js']);
    assert.strictEqual(serializedEntry.createdAt, '2026-08-15T12:00:00.000Z');
    assert.strictEqual(serializedEntry.updatedAt, '2026-08-15T12:00:00.000Z');
    assert.strictEqual(serializedEntry.lastUsedAt, '2026-08-15T12:30:00.000Z');
    assert.strictEqual(serializedEntry.isFavorite, true);

    console.log('✓ Serialization Tests Passed.');
}

// 2. Validation Tests
function testValidation() {
    console.log('Running: Validation Tests...');

    // Test: Wrong format
    assert.throws(() => {
        validateExport({ format: 'wrong-format', version: 1, entries: [] });
    }, /Unsupported file format/);

    // Test: Wrong version
    assert.throws(() => {
        validateExport({ format: 'dev-vault', version: 2, entries: [] });
    }, /Unsupported format version/);

    // Test: Entries not array
    assert.throws(() => {
        validateExport({ format: 'dev-vault', version: 1, entries: 'not-an-array' });
    }, /Backup does not contain a valid entries list/);

    // Test: Malformed entry (missing title)
    assert.throws(() => {
        validateExport({
            format: 'dev-vault',
            version: 1,
            entries: [{ id: '1', content: 'test', language: 'bash' }]
        });
    }, /missing a title/);

    // Test: Malformed entry (missing content)
    assert.throws(() => {
        validateExport({
            format: 'dev-vault',
            version: 1,
            entries: [{ id: '1', title: 'title', language: 'bash' }]
        });
    }, /missing content/);

    // Test: Malformed entry (invalid date format)
    assert.throws(() => {
        validateExport({
            format: 'dev-vault',
            version: 1,
            entries: [{ id: '1', title: 'title', language: 'bash', content: 'test', createdAt: 'invalid-date' }]
        });
    }, /invalid createdAt timestamp/);

    // Test: Valid backup passing validation
    const validBackup = {
        format: 'dev-vault',
        version: 1,
        entries: [{ id: '1', title: 'title', language: 'bash', content: 'test' }]
    };
    assert.ok(validateExport(validBackup));

    console.log('✓ Validation Tests Passed.');
}

// 3. Deserialization & Normalization Tests
function testDeserialization() {
    console.log('Running: Deserialization & Normalization Tests...');

    const backupData = {
        format: 'dev-vault',
        version: 1,
        entries: [
            {
                id: 'id-2',
                title: 'Another Test',
                language: 'python',
                content: 'print("hello")',
                // Optional fields omitted to test defaults/normalization
            }
        ]
    };

    const entries = deserializeVault(backupData);
    assert.strictEqual(entries.length, 1);
    const entry = entries[0];
    assert.strictEqual(entry.id, 'id-2');
    assert.strictEqual(entry.title, 'Another Test');
    assert.strictEqual(entry.language, 'python');
    assert.strictEqual(entry.content, 'print("hello")');
    assert.strictEqual(entry.type, 'snippet'); // Normalized default
    assert.strictEqual(entry.description, ''); // Normalized default
    assert.deepStrictEqual(entry.tags, []); // Normalized default
    assert.ok(!isNaN(Date.parse(entry.createdAt))); // Generated default
    assert.ok(!isNaN(Date.parse(entry.updatedAt))); // Generated default
    assert.strictEqual(entry.lastUsedAt, null); // Normalized default
    assert.strictEqual(entry.isFavorite, false); // Normalized default

    console.log('✓ Deserialization & Normalization Tests Passed.');
}

// 4. Merge Import Tests
async function testMergeImport() {
    console.log('Running: Merge Import Tests...');

    // 1. Set up repository with 2 existing entries
    const existingEntries = [
        { id: '1', title: 'Existing 1', language: 'js', content: 'x = 1;' },
        { id: '2', title: 'Existing 2', language: 'js', content: 'y = 2;' }
    ];
    const repository = new MockRepository(existingEntries);
    const vault = new Vault(repository);
    await vault.init();

    // 2. Prepare import data with 1 duplicate, 1 new, and 1 invalid
    const importData = {
        format: 'dev-vault',
        version: 1,
        entries: [
            { id: '1', title: 'Duplicate Title', language: 'js', content: 'should skip' }, // Same ID as Existing 1
            { id: '3', title: 'New Entry', language: 'python', content: 'print("new")' } // New ID
        ]
    };
    const serializedString = JSON.stringify(importData);

    const summary = await vault.importEntries(serializedString);

    // Verify import counts
    assert.strictEqual(summary.imported, 1);
    assert.strictEqual(summary.skipped, 1);
    assert.strictEqual(summary.failed, 0);

    // Verify DB state
    const currentEntries = await repository.list();
    assert.strictEqual(currentEntries.length, 3);

    // Verify existing is preserved (not overwritten)
    const entry1 = await repository.get('1');
    assert.strictEqual(entry1.title, 'Existing 1');
    assert.strictEqual(entry1.content, 'x = 1;');

    // Verify new is added
    const entry3 = await repository.get('3');
    assert.strictEqual(entry3.title, 'New Entry');
    assert.strictEqual(entry3.content, 'print("new")');

    console.log('✓ Merge Import Tests Passed.');
}

// Main Runner
async function runAll() {
    try {
        testSerialization();
        testValidation();
        testDeserialization();
        await testMergeImport();
        console.log('\n=====================================');
        console.log('ALL TESTS COMPLETED SUCCESSFULLY! 🎉');
        console.log('=====================================');
    } catch (err) {
        console.error('\n❌ TEST SUITE FAILED:', err);
        process.exit(1);
    }
}

runAll();
