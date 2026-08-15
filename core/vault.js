import { createEntry, normalizeEntry } from './models.js';
import { serializeVault, deserializeVault } from './serialization.js';

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

    async listEntries(options = {}) {
        let entries = await this.repository.list();
        entries = entries.map(normalizeEntry);

        const { query, type, language, status, tag, sort } = options;

        // 1. Status filter (favorites/recent)
        if (status === 'favorites') {
            entries = entries.filter(e => e.isFavorite);
        } else if (status === 'recent') {
            entries = entries.filter(e => e.lastUsedAt);
        }

        // 2. Type filter
        if (type && type !== 'all') {
            entries = entries.filter(e => e.type === type);
        }

        // 3. Language filter
        if (language && language !== 'all') {
            entries = entries.filter(e => e.language === language);
        }

        // 4. Tag filter
        if (tag) {
            const normalizedTag = tag.trim().toLowerCase();
            entries = entries.filter(e => e.tags.some(t => t.toLowerCase() === normalizedTag));
        }

        // 5. Search rank scoring and sort
        if (query && query.trim() !== '') {
            const filter = query.trim().toLowerCase();
            const scored = entries.map(s => {
                let score = 0;
                const titleLower = (s.title || '').toLowerCase();
                const langLower = (s.language || '').toLowerCase();
                const contentLower = (s.content || '').toLowerCase();
                const typeLower = (s.type || '').toLowerCase();
                const descLower = (s.description || '').toLowerCase();
                const tagsLower = (s.tags || []).map(t => t.toLowerCase());

                if (titleLower === filter) score += 100;
                else if (titleLower.includes(filter)) score += 50;

                if (tagsLower.includes(filter)) score += 80;
                else if (tagsLower.some(t => t.includes(filter))) score += 40;

                if (typeLower === filter) score += 30;

                if (langLower === filter) score += 30;
                else if (langLower.includes(filter)) score += 15;

                if (descLower.includes(filter)) score += 20;

                if (contentLower.includes(filter)) score += 5;

                return { entry: s, score };
            }).filter(item => item.score > 0);

            scored.sort((a, b) => b.score - a.score);
            entries = scored.map(item => item.entry);
        } else {
            // Apply sorting
            const sortMode = sort || (status === 'recent' ? 'recently_used' : 'recently_added');
            if (sortMode === 'recently_added') {
                entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            } else if (sortMode === 'recently_updated') {
                entries.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
            } else if (sortMode === 'recently_used') {
                entries.sort((a, b) => {
                    const dateA = a.lastUsedAt ? new Date(a.lastUsedAt) : new Date(0);
                    const dateB = b.lastUsedAt ? new Date(b.lastUsedAt) : new Date(0);
                    return dateB - dateA;
                });
            } else if (sortMode === 'title_asc') {
                entries.sort((a, b) => a.title.localeCompare(b.title));
            } else if (sortMode === 'title_desc') {
                entries.sort((a, b) => b.title.localeCompare(a.title));
            }
        }

        return entries;
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
        if (typeof localStorage === 'undefined') {
            return;
        }
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

    async exportEntries() {
        const entries = await this.repository.list();
        return serializeVault(entries);
    }

    async importEntries(serializedString) {
        let data;
        try {
            data = JSON.parse(serializedString);
        } catch (err) {
            throw new Error('Backup file must be a valid JSON format.');
        }

        const entriesToImport = deserializeVault(data);
        let imported = 0;
        let skipped = 0;
        let failed = 0;

        for (const entry of entriesToImport) {
            try {
                const existing = await this.repository.get(entry.id);
                if (existing) {
                    skipped++;
                } else {
                    await this.repository.create(entry);
                    imported++;
                }
            } catch (err) {
                console.error(`Failed to import entry ${entry.id}:`, err);
                failed++;
            }
        }

        return { imported, skipped, failed };
    }
}
