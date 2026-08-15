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
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const typeFilter = document.getElementById('typeFilter');
    const langFilter = document.getElementById('langFilter');
    const filterSelect = document.getElementById('filterSelect');
    const sortSelect = document.getElementById('sortSelect');
    const activeFiltersContainer = document.getElementById('activeFiltersContainer');
    const activeFiltersChips = document.getElementById('activeFiltersChips');
    const clearAllFiltersBtn = document.getElementById('clearAllFiltersBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const vaultMenuBtn = document.getElementById('vaultMenuBtn');
    const vaultDropdown = document.getElementById('vaultDropdown');
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFileInput = document.getElementById('importFileInput');
    const alertModal = document.getElementById('alertModal');
    const alertTitle = document.getElementById('alertTitle');
    const alertMessage = document.getElementById('alertMessage');
    const alertIcon = document.getElementById('alertIcon');
    const alertOkBtn = document.getElementById('alertOkBtn');

    // Navigation State
    let selectedIndex = -1;
    let currentRenderedSnippets = [];

    // Discovery State
    const discoveryState = {
        query: '',
        type: 'all',
        language: 'all',
        status: 'all',
        tag: null,
        sort: 'recently_added'
    };

    // Theme State & SVGs
    const sunIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
    const moonIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

    function updateThemeUI(theme) {
        if (theme === 'light') {
            document.body.setAttribute('data-theme', 'light');
            themeToggleBtn.innerHTML = moonIcon;
            themeToggleBtn.setAttribute('title', 'Switch to Dark Theme');
        } else {
            document.body.removeAttribute('data-theme');
            themeToggleBtn.innerHTML = sunIcon;
            themeToggleBtn.setAttribute('title', 'Switch to Light Theme');
        }
    }

    const currentTheme = localStorage.getItem('theme') || 'dark';
    updateThemeUI(currentTheme);

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
            type: 'command',
            language: 'bash',
            description: 'Kill any process running on port 3000',
            tags: ['bash', 'port', 'kill'],
            content: '#!/bin/bash\nlsof -ti :3000 | xargs kill'
        });
        await vault.createEntry({
            title: 'Find large files',
            type: 'command',
            language: 'bash',
            description: 'Find files larger than 100MB in the current directory',
            tags: ['bash', 'files', 'find'],
            content: 'find . -type f -size +100M -exec ls -lh {} \\;'
        });
        await vault.createEntry({
            title: 'Fetch JSON with async/await',
            type: 'snippet',
            language: 'javascript',
            description: 'Boilerplate for fetching data asynchronously using fetch API',
            tags: ['js', 'fetch', 'async'],
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
        const type = document.getElementById('typeInput').value;
        const language = document.getElementById('languageInput').value;
        const description = document.getElementById('descriptionInput').value;
        const tagsRaw = document.getElementById('tagsInput').value;
        const content = document.getElementById('codeInput').value;

        const tags = tagsRaw.split(/[, ]+/).map(t => t.trim().toLowerCase()).filter(t => t);

        await vault.createEntry({
            title,
            type,
            language,
            description,
            tags,
            content
        });

        await renderSnippets();
        closeModal();
    });

    searchInput.addEventListener('input', async (e) => {
        discoveryState.query = e.target.value.toLowerCase();
        await renderSnippets();
    });

    clearSearchBtn.addEventListener('click', () => {
        discoveryState.query = '';
        searchInput.value = '';
        renderSnippets();
        searchInput.focus();
    });

    typeFilter.addEventListener('change', async (e) => {
        discoveryState.type = e.target.value;
        await renderSnippets();
    });

    langFilter.addEventListener('change', async (e) => {
        discoveryState.language = e.target.value;
        await renderSnippets();
    });

    filterSelect.addEventListener('change', async (e) => {
        discoveryState.status = e.target.value;
        await renderSnippets();
    });

    sortSelect.addEventListener('change', async (e) => {
        discoveryState.sort = e.target.value;
        await renderSnippets();
    });

    clearAllFiltersBtn.addEventListener('click', clearAllFilters);

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
        const isEditable = e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable;

        if (e.key === 'Escape') {
            if (addModal.style.display === 'flex') {
                closeModal();
            } else if (document.activeElement === searchInput) {
                searchInput.blur();
                searchInput.value = '';
                discoveryState.query = '';
                renderSnippets();
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
        const newTheme = document.body.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        updateThemeUI(newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // Toggle Vault Settings Dropdown
    vaultMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        vaultDropdown.classList.toggle('hidden');
    });

    // Prevent closing when clicking inside the dropdown container itself
    vaultDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Close settings dropdown on click outside
    document.addEventListener('click', () => {
        vaultDropdown.classList.add('hidden');
    });

    // Dismiss Alert Modal
    alertOkBtn.addEventListener('click', () => {
        alertModal.style.display = 'none';
    });

    // Export Vault Click
    exportBtn.addEventListener('click', async () => {
        try {
            const dataString = await vault.exportEntries();
            const blob = new Blob([dataString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            // Format file name with current date
            const dateStr = new Date().toISOString().split('T')[0];
            const fileName = `dev-vault-backup-${dateStr}.json`;
            
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            // Count entries
            const entries = await vault.listEntries();
            showAlert('✓', 'Vault Exported', `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} saved successfully.`, false);
        } catch (err) {
            console.error('Export failed:', err);
            showAlert('✕', 'Export Failed', 'An error occurred while exporting the vault.', true);
        }
    });

    // Import Vault Click: triggers file input
    importBtn.addEventListener('click', () => {
        importFileInput.click();
    });

    // Handle File Input Change
    importFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target.result;
                const summary = await vault.importEntries(content);
                
                await renderSnippets();
                
                showAlert('✓', 'Import Complete', `Imported: ${summary.imported}\nSkipped: ${summary.skipped}\nFailed: ${summary.failed}`, false);
            } catch (err) {
                console.error('Import failed:', err);
                showAlert('✕', 'Unable to import vault', err.message || 'The selected file is not a valid Dev-Vault backup.', true);
            } finally {
                importFileInput.value = ''; // Reset file input
            }
        };
        reader.onerror = () => {
            showAlert('✕', 'Unable to import vault', 'Error reading import file.', true);
            importFileInput.value = '';
        };
        reader.readAsText(file);
    });

    // Show Alert Modal Helper
    function showAlert(icon, title, message, isError) {
        alertIcon.textContent = icon;
        if (isError) {
            alertIcon.classList.add('error');
        } else {
            alertIcon.classList.remove('error');
        }
        alertTitle.textContent = title;
        alertMessage.textContent = message;
        alertModal.style.display = 'flex';
    }

    // Functions
    function closeModal() {
        addModal.style.display = 'none';
        snippetForm.reset();
    }

    async function renderSnippets() {
        snippetsContainer.innerHTML = '';
        selectedIndex = -1;
        
        // Fetch snippets matching discovery state
        const snippets = await vault.listEntries({
            query: discoveryState.query,
            type: discoveryState.type,
            language: discoveryState.language,
            status: discoveryState.status,
            tag: discoveryState.tag,
            sort: discoveryState.sort
        });

        // Total count of entries in the vault (unfiltered)
        const allSnippets = await vault.listEntries();

        const snippetCount = document.getElementById('snippetCount');
        if (snippetCount) {
            snippetCount.textContent = `${snippets.length} ${snippets.length === 1 ? 'ENTRY' : 'ENTRIES'}`;
        }

        // Render clear search button visibility
        if (discoveryState.query) {
            clearSearchBtn.style.display = 'flex';
        } else {
            clearSearchBtn.style.display = 'none';
        }

        // Render active filter chips
        renderActiveFilters();

        if (snippets.length === 0) {
            renderEmptyState(allSnippets.length === 0);
            currentRenderedSnippets = [];
            return;
        }

        currentRenderedSnippets = snippets;

        snippets.forEach(snippet => {
            const card = document.createElement('div');
            card.className = 'snippet-card glass';
            card.setAttribute('data-id', snippet.id);
            
            const originalIndex = allSnippets.findIndex(s => s.id === snippet.id);
            const displayId = `DV-${String(allSnippets.length - originalIndex).padStart(3, '0')}`;
            
            const favIcon = snippet.isFavorite 
                ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #f59e0b;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`
                : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`;

            const descHtml = snippet.description ? `<div class="snippet-description">${escapeHTML(snippet.description)}</div>` : '';
            const tagsHtml = snippet.tags && snippet.tags.length > 0 
                ? `<div class="snippet-tags">${snippet.tags.map(t => `<span class="snippet-tag" data-tag="${escapeHTML(t)}">[${escapeHTML(t)}]</span>`).join(' ')}</div>` 
                : '';
            const typeStr = snippet.type.charAt(0).toUpperCase() + snippet.type.slice(1);

            card.innerHTML = `
                <div class="snippet-header">
                    <div class="snippet-meta">
                        <span class="snippet-id">${displayId}</span>
                        <span class="snippet-lang">${typeStr} &middot; ${snippet.language}</span>
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
                    ${descHtml}
                    ${tagsHtml}
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

        document.querySelectorAll('.snippet-tag').forEach(tagEl => {
            tagEl.addEventListener('click', handleTagClick);
        });
    }

    function renderActiveFilters() {
        activeFiltersChips.innerHTML = '';
        let hasActiveFilters = false;

        if (discoveryState.query) {
            createFilterChip('Search', `"${discoveryState.query}"`, () => {
                discoveryState.query = '';
                searchInput.value = '';
                renderSnippets();
            });
            hasActiveFilters = true;
        }

        if (discoveryState.type !== 'all') {
            const displayType = typeFilter.options[typeFilter.selectedIndex]?.text || discoveryState.type;
            createFilterChip('Type', displayType, () => {
                discoveryState.type = 'all';
                typeFilter.value = 'all';
                renderSnippets();
            });
            hasActiveFilters = true;
        }

        if (discoveryState.language !== 'all') {
            const displayLang = langFilter.options[langFilter.selectedIndex]?.text || discoveryState.language;
            createFilterChip('Lang', displayLang, () => {
                discoveryState.language = 'all';
                langFilter.value = 'all';
                renderSnippets();
            });
            hasActiveFilters = true;
        }

        if (discoveryState.status !== 'all') {
            const displayStatus = filterSelect.options[filterSelect.selectedIndex]?.text || discoveryState.status;
            createFilterChip('Status', displayStatus, () => {
                discoveryState.status = 'all';
                filterSelect.value = 'all';
                renderSnippets();
            });
            hasActiveFilters = true;
        }

        if (discoveryState.tag) {
            createFilterChip('Tag', discoveryState.tag, () => {
                discoveryState.tag = null;
                renderSnippets();
            });
            hasActiveFilters = true;
        }

        if (hasActiveFilters) {
            activeFiltersContainer.style.display = 'flex';
        } else {
            activeFiltersContainer.style.display = 'none';
        }
    }

    function createFilterChip(label, value, onRemove) {
        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        chip.innerHTML = `
            <span>${label}: ${value}</span>
            <button class="filter-chip-remove">&times;</button>
        `;
        chip.querySelector('.filter-chip-remove').addEventListener('click', onRemove);
        activeFiltersChips.appendChild(chip);
    }

    function renderEmptyState(isVaultEmpty) {
        if (isVaultEmpty) {
            snippetsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>Your vault is empty.</h3>
                    <p>Save your first piece of developer knowledge.</p>
                    <button class="primary-btn" id="emptyStateAddBtn">+ Add Snippet</button>
                </div>
            `;
            document.getElementById('emptyStateAddBtn').addEventListener('click', () => {
                addModal.style.display = 'flex';
                document.getElementById('titleInput').focus();
            });
        } else {
            snippetsContainer.innerHTML = `
                <div class="empty-state">
                    <h3>No entries found</h3>
                    <p>Nothing matches your search or filters.</p>
                    <ul>
                        <li>Try another search term</li>
                        <li>Remove one or more active filters</li>
                        <li>Reset all filters to start fresh</li>
                    </ul>
                    <button class="secondary-btn" id="emptyStateClearBtn" style="border: 1px solid var(--card-border);">Clear all filters</button>
                </div>
            `;
            document.getElementById('emptyStateClearBtn').addEventListener('click', clearAllFilters);
        }
    }

    function clearAllFilters() {
        discoveryState.query = '';
        discoveryState.type = 'all';
        discoveryState.language = 'all';
        discoveryState.status = 'all';
        discoveryState.tag = null;
        discoveryState.sort = 'recently_added';

        searchInput.value = '';
        typeFilter.value = 'all';
        langFilter.value = 'all';
        filterSelect.value = 'all';
        sortSelect.value = 'recently_added';

        renderSnippets();
        searchInput.focus();
    }

    function handleTagClick(e) {
        const tag = e.currentTarget.getAttribute('data-tag');
        if (tag) {
            discoveryState.tag = tag;
            renderSnippets();
        }
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
        await renderSnippets();
    }

    async function handleDelete(e) {
        if (confirm('Are you sure you want to delete this snippet?')) {
            const btn = e.currentTarget;
            const id = btn.getAttribute('data-id');
            await vault.deleteEntry(id);
            await renderSnippets();
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
