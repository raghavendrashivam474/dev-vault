export function createEntry({ id, title, language, content, createdAt, updatedAt, lastUsedAt, isFavorite }) {
    const now = new Date().toISOString();
    return {
        id: id || Date.now().toString(),
        title: title || 'Untitled Snippet',
        language: language || 'plaintext',
        content: content || '',
        createdAt: createdAt || now,
        updatedAt: updatedAt || now,
        lastUsedAt: lastUsedAt || null,
        isFavorite: isFavorite || false
    };
}
