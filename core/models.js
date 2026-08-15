export function createEntry({ id, title, language, content, type, description, tags, createdAt, updatedAt, lastUsedAt, isFavorite }) {
    const now = new Date().toISOString();
    return {
        id: id || Date.now().toString(),
        title: title || 'Untitled Snippet',
        language: language || 'plaintext',
        content: content || '',
        type: type || 'snippet',
        description: description || '',
        tags: tags || [],
        createdAt: createdAt || now,
        updatedAt: updatedAt || now,
        lastUsedAt: lastUsedAt || null,
        isFavorite: isFavorite || false
    };
}

export function normalizeEntry(entry) {
    if (!entry) return null;
    return {
        ...entry,
        type: entry.type || 'snippet',
        description: entry.description || '',
        tags: Array.isArray(entry.tags) ? entry.tags : []
    };
}
