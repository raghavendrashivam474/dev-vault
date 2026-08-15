import { createEntry } from './models.js';

/**
 * Serializes list of vault entries into the standard Dev-Vault v1 format string.
 * @param {Array<Object>} entries 
 * @returns {string} JSON string representation of the vault export
 */
export function serializeVault(entries) {
    const exportData = {
        format: 'dev-vault',
        version: 1,
        exportedAt: new Date().toISOString(),
        entries: (entries || []).map(entry => ({
            id: entry.id,
            title: entry.title,
            language: entry.language,
            content: entry.content,
            type: entry.type || 'snippet',
            description: entry.description || '',
            tags: Array.isArray(entry.tags) ? entry.tags : [],
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            lastUsedAt: entry.lastUsedAt || null,
            isFavorite: entry.isFavorite || false
        }))
    };
    return JSON.stringify(exportData, null, 2);
}

/**
 * Validates the schema and structure of an exported vault object.
 * @param {Object} data 
 * @throws {Error} if format, version, or structural validation fails
 * @returns {boolean} true if valid
 */
export function validateExport(data) {
    if (!data || typeof data !== 'object') {
        throw new Error('Backup data must be a JSON object.');
    }
    if (data.format !== 'dev-vault') {
        throw new Error('Unsupported file format. Must be "dev-vault".');
    }
    if (data.version !== 1) {
        throw new Error('Unsupported format version.');
    }
    if (!Array.isArray(data.entries)) {
        throw new Error('Backup does not contain a valid entries list.');
    }

    data.entries.forEach((entry, index) => {
        if (!entry || typeof entry !== 'object') {
            throw new Error(`Entry at index ${index} is invalid.`);
        }
        if (typeof entry.id !== 'string' || !entry.id.trim()) {
            throw new Error(`Entry at index ${index} is missing a valid ID.`);
        }
        if (typeof entry.title !== 'string' || !entry.title.trim()) {
            throw new Error(`Entry at index ${index} (ID: ${entry.id || 'unknown'}) is missing a title.`);
        }
        if (typeof entry.content !== 'string') {
            throw new Error(`Entry at index ${index} (ID: ${entry.id}) is missing content.`);
        }
        if (typeof entry.language !== 'string') {
            throw new Error(`Entry at index ${index} (ID: ${entry.id}) is missing language.`);
        }
        if (entry.type && typeof entry.type !== 'string') {
            throw new Error(`Entry at index ${index} (ID: ${entry.id}) has an invalid type value.`);
        }
        if (entry.description && typeof entry.description !== 'string') {
            throw new Error(`Entry at index ${index} (ID: ${entry.id}) has an invalid description.`);
        }
        if (entry.tags && !Array.isArray(entry.tags)) {
            throw new Error(`Entry at index ${index} (ID: ${entry.id}) has invalid tags.`);
        }
        if (entry.createdAt && isNaN(Date.parse(entry.createdAt))) {
            throw new Error(`Entry at index ${index} (ID: ${entry.id}) has an invalid createdAt timestamp.`);
        }
        if (entry.updatedAt && isNaN(Date.parse(entry.updatedAt))) {
            throw new Error(`Entry at index ${index} (ID: ${entry.id}) has an invalid updatedAt timestamp.`);
        }
        if (entry.lastUsedAt && isNaN(Date.parse(entry.lastUsedAt))) {
            throw new Error(`Entry at index ${index} (ID: ${entry.id}) has an invalid lastUsedAt timestamp.`);
        }
    });

    return true;
}

/**
 * Deserializes and validates a backup data object, returning normalized model entries.
 * @param {Object} data 
 * @returns {Array<Object>} list of normalized vault entries
 */
export function deserializeVault(data) {
    validateExport(data);
    return data.entries.map(entry => {
        return createEntry({
            id: entry.id,
            title: entry.title,
            language: entry.language,
            content: entry.content,
            type: entry.type,
            description: entry.description,
            tags: entry.tags,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            lastUsedAt: entry.lastUsedAt,
            isFavorite: entry.isFavorite
        });
    });
}
