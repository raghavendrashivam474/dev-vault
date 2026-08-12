import { Vault } from './core/vault.js';
import { IndexedDBRepository } from './storage/indexeddb.js';

document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const addBtn = document.getElementById('addBtn');
    const addModal = document.getElementById('addModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const snippetForm = document.getElementById('snippetForm');
    const snippetsContainer = document.getElementById('snippetsContainer');
    const searchInput = document.getElementById('searchInput');
    const filterSelect = document.getElementById('filterSelect');
    const themeToggleBtn = document.getElementById('themeToggleBtn');

    // Navigation State
    let selectedIndex = -1;
    let currentRenderedSnippets = [];

    // Theme State
    const currentTheme = localStorage.getItem('theme') || 'dark';
    if (currentTheme === 'light') {
        document.body.setAttribute('data-theme', 'light');
    }

    // Initialize Vault
    const repository = new IndexedDBRepository();
    const vault = new Vault(repository);
    await vault.init();

    // Check if we need to add default snippets
    let initialSnippets = await vault.listEntries();
    if (initialSnippets.length === 0 && !localStorage.getItem('dev_vault_migration')) {
        // If no snippets and no migration flag, it's a fresh install
        await vault.createEntry({
            title: 'Kill process on port',
            language: 'bash',
            content: '#!/bin/bash\nlsof -ti :3000 | xargs kill'
        });
        await vault.createEntry({
            title: 'Find large files',
            language: 'bash',
            content: 'find . -type f -size +100M -exec ls -lh {} \\;'
        });
        await vault.createEntry({
            title: 'Fetch JSON with async/await',
            language: 'javascript',
            content: 'async function getData(url) {\n    try {\n        const response = await fetch(url);\n        if (!response.ok) throw new Error(`Status: ${response.status}`);\n        return await response.json();\n    } catch (error) {\n        console.error("Fetch error:", error);\n    }\n}'
        });
    }

    // Initial render
    await renderSnippets();

    // Event Listeners
    addBtn.addEventListener('click', () => {
        addModal.style.display = 'flex';
        document.getElementById('titleInput').focus();
    });

    cancelBtn.addEventListener('click', () => {
        closeModal();
    });

    // Close modal on outside click
    addModal.addEventListener('click', (e) => {
        if (e.target === addModal) {
            closeModal();
        }
    });

    snippetForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const title = document.getElementById('titleInput').value;
        const language = document.getElementById('languageInput').value;
        const content = document.getElementById('codeInput').value;

        await vault.createEntry({
            title,
            language,
            content
        });

        await renderSnippets();
        closeModal();
    });

    searchInput.addEventListener('input', async (e) => {
        const searchTerm = e.target.value.toLowerCase();
        await renderSnippets(searchTerm, filterSelect.value);
    });

    filterSelect.addEventListener('change', async (e) => {
        await renderSnippets(searchInput.value.toLowerCase(), e.target.value);
    });

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        const isEditable = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;

        if (e.key === 'Escape') {
            if (addModal.style.display === 'flex') {
                closeModal();
            } else if (document.activeElement === searchInput) {
                searchInput.blur();
                searchInput.value = '';
                renderSnippets('', filterSelect.value);
            } else {
                selectedIndex = -1;
                updateSelection();
            }
            return;
        }

        if (!isEditable) {
            // Focus Search: / or Ctrl+K / Cmd+K
            if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key === 'k')) {
                e.preventDefault();
                searchInput.focus();
                return;
            }

            // Navigation: Up/Down
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                if (currentRenderedSnippets.length === 0) return;
                e.preventDefault();
                
                if (e.key === 'ArrowDown') {
                    selectedIndex = (selectedIndex + 1) % currentRenderedSnippets.length;
                } else {
                    selectedIndex = selectedIndex - 1;
                    if (selectedIndex < 0) selectedIndex = currentRenderedSnippets.length - 1;
                }
                updateSelection();
                return;
            }

            // Enter: Copy selected
            if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < currentRenderedSnippets.length) {
                e.preventDefault();
                const snippetId = currentRenderedSnippets[selectedIndex].id;
                const copyBtn = document.querySelector(`.copy-btn[data-id="${snippetId}"]`);
                if (copyBtn) copyBtn.click();
            }
        }
    });

    function updateSelection() {
        document.querySelectorAll('.snippet-card').forEach((card, idx) => {
            if (idx === selectedIndex) {
                card.classList.add('selected');
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            } else {
                card.classList.remove('selected');
            }
        });
    }

    themeToggleBtn.addEventListener('click', () => {
        if (document.body.getAttribute('data-theme') === 'light') {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
        }
    });

    // Functions
    function closeModal() {
        addModal.style.display = 'none';
        snippetForm.reset();
    }

    async function renderSnippets(filter = '', filterMode = 'all') {
        snippetsContainer.innerHTML = '';
        selectedIndex = -1;
        
        let snippets = await vault.listEntries();

        // Apply Mode Filter
        if (filterMode === 'favorites') {
            snippets = snippets.filter(s => s.isFavorite);
        } else if (filterMode === 'recent') {
            snippets = snippets.filter(s => s.lastUsedAt);
            snippets.sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt));
        }

        const snippetCount = document.getElementById('snippetCount');
        if (snippetCount) {
            snippetCount.textContent = `${snippets.length} ${snippets.length === 1 ? 'ENTRY' : 'ENTRIES'}`;
        }

        // Apply Search and Ranking
        let filteredSnippets = [];
        if (!filter) {
            filteredSnippets = snippets;
        } else {
            const scoredSnippets = snippets.map(s => {
                let score = 0;
                const titleLower = s.title.toLowerCase();
                const langLower = s.language.toLowerCase();
                const contentLower = s.content.toLowerCase();
                
                if (titleLower === filter) score += 100;
                else if (titleLower.includes(filter)) score += 50;
                
                if (langLower === filter) score += 30;
                else if (langLower.includes(filter)) score += 15;
                
                if (contentLower.includes(filter)) score += 5;
                
                return { snippet: s, score };
            }).filter(item => item.score > 0);
            
            scoredSnippets.sort((a, b) => b.score - a.score);
            filteredSnippets = scoredSnippets.map(item => item.snippet);
        }

        currentRenderedSnippets = filteredSnippets;

        if (filteredSnippets.length === 0) {
            snippetsContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; grid-column: 1 / -1;">No snippets found. Add one!</p>';
            return;
        }

        filteredSnippets.forEach(snippet => {
            const card = document.createElement('div');
            card.className = 'snippet-card glass';
            card.setAttribute('data-id', snippet.id);
            
            const originalIndex = snippets.indexOf(snippet);
            const displayId = `DV-${String(snippets.length - originalIndex).padStart(3, '0')}`;
            
            const favIcon = snippet.isFavorite 
                ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #f59e0b;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
                : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;

            card.innerHTML = `
                <div class="snippet-header">
                    <div class="snippet-meta">
                        <span class="snippet-id">${displayId}</span>
                        <span class="snippet-lang">${snippet.language}</span>
                    </div>
                    <div class="snippet-title-row">
                        <div class="snippet-title">${escapeHTML(snippet.title)}</div>
                        <div class="snippet-actions">
                            <button class="icon-btn fav-btn" data-id="${snippet.id}" title="Toggle Favorite">
                                ${favIcon}
                            </button>
                            <button class="icon-btn copy-btn" data-id="${snippet.id}" title="Copy Code">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                            </button>
                            <button class="icon-btn delete-btn" data-id="${snippet.id}" title="Delete Snippet">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
                <div class="snippet-body">
                    <div class="source-label">SOURCE</div>
                    <pre><code>${escapeHTML(snippet.content)}</code></pre>
                </div>
            `;

            snippetsContainer.appendChild(card);
        });

        // Add event listeners to newly created buttons
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', handleCopy);
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });
        
        document.querySelectorAll('.fav-btn').forEach(btn => {
            btn.addEventListener('click', handleFavorite);
        });
    }

    async function handleCopy(e) {
        const btn = e.currentTarget;
        const id = btn.getAttribute('data-id');
        const snippets = await vault.listEntries();
        const snippet = snippets.find(s => s.id === id);
        
        if (snippet) {
            try {
                await navigator.clipboard.writeText(snippet.content);
                await vault.markUsed(id); // Mark as used when copied
                
                // Visual feedback
                const originalIcon = btn.innerHTML;
                btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>`;
                btn.style.color = 'var(--success)';
                
                setTimeout(() => {
                    btn.innerHTML = originalIcon;
                    btn.style.color = '';
                }, 2000);
            } catch (err) {
                console.error('Failed to copy text: ', err);
            }
        }
    }

    async function handleFavorite(e) {
        const btn = e.currentTarget;
        const id = btn.getAttribute('data-id');
        await vault.toggleFavorite(id);
        await renderSnippets(searchInput.value.toLowerCase(), filterSelect.value);
    }

    async function handleDelete(e) {
        if (confirm('Are you sure you want to delete this snippet?')) {
            const btn = e.currentTarget;
            const id = btn.getAttribute('data-id');
            await vault.deleteEntry(id);
            await renderSnippets(searchInput.value.toLowerCase(), filterSelect.value);
        }
    }

    // Utility
    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});

// PWA Setup
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}
