import { createEntry, normalizeEntry } from './models.js';

export class Vault {
    constructor(repository) {
        this.repository = repository;
    }

    async init() {
        if (this.repository.init) {
            await this.repository.init();
        }
        await this.migrateFromLocalStorage();
    }

    async listEntries() {
        const entries = await this.repository.list();
        return entries.map(normalizeEntry);
    }

    async createEntry(data) {
        const entry = createEntry(data);
        return this.repository.create(entry);
    }

    async updateEntry(id, changes) {
        return this.repository.update(id, changes);
    }

    async deleteEntry(id) {
        return this.repository.remove(id);
    }

    async markUsed(id) {
        return this.repository.update(id, { lastUsedAt: new Date().toISOString() });
    }

    async toggleFavorite(id) {
        const entry = await this.repository.get(id);
        if (!entry) throw new Error('Entry not found');
        return this.repository.update(id, { isFavorite: !entry.isFavorite });
    }

    async migrateFromLocalStorage() {
        const migrationFlag = localStorage.getItem('dev_vault_migration');
        if (migrationFlag === 'v1') {
            return; // Already migrated
        }

        const oldSnippets = localStorage.getItem('snippets');
        if (oldSnippets) {
            try {
                const parsed = JSON.parse(oldSnippets);
                if (Array.isArray(parsed)) {
                    for (const item of parsed) {
                        // Check if entry exists to avoid duplicates if migration partially failed
                        const existing = await this.repository.get(item.id);
                        if (!existing) {
                            const entry = createEntry({
                                id: item.id,
                                title: item.title,
                                language: item.language,
                                content: item.code, // Map old 'code' to 'content'
                                createdAt: item.date, // Map old 'date' to 'createdAt'
                                updatedAt: item.date
                            });
                            await this.repository.create(entry);
                        }
                    }
                }
            } catch (err) {
                console.error("Migration failed:", err);
            }
        }
        
        // Mark migration as complete
        localStorage.setItem('dev_vault_migration', 'v1');
    }
}
