document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const addBtn = document.getElementById('addBtn');
    const addModal = document.getElementById('addModal');
    const cancelBtn = document.getElementById('cancelBtn');
    const snippetForm = document.getElementById('snippetForm');
    const snippetsContainer = document.getElementById('snippetsContainer');
    const searchInput = document.getElementById('searchInput');
    const themeToggleBtn = document.getElementById('themeToggleBtn');

    // Theme State
    const currentTheme = localStorage.getItem('theme') || 'dark';
    if (currentTheme === 'light') {
        document.body.setAttribute('data-theme', 'light');
    }

    // State
    let snippets = JSON.parse(localStorage.getItem('snippets')) || [];

    // Initialize
    renderSnippets();

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

    snippetForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const title = document.getElementById('titleInput').value;
        const language = document.getElementById('languageInput').value;
        const code = document.getElementById('codeInput').value;

        const newSnippet = {
            id: Date.now().toString(),
            title,
            language,
            code,
            date: new Date().toISOString()
        };

        snippets.unshift(newSnippet);
        saveSnippets();
        renderSnippets();
        closeModal();
    });

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        renderSnippets(searchTerm);
    });

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

    function saveSnippets() {
        localStorage.setItem('snippets', JSON.stringify(snippets));
    }

    function renderSnippets(filter = '') {
        snippetsContainer.innerHTML = '';

        const filteredSnippets = snippets.filter(s => 
            s.title.toLowerCase().includes(filter) || 
            s.language.toLowerCase().includes(filter) ||
            s.code.toLowerCase().includes(filter)
        );

        if (filteredSnippets.length === 0) {
            snippetsContainer.innerHTML = '<p style="color: var(--text-secondary); text-align: center; grid-column: 1 / -1;">No snippets found. Add one!</p>';
            return;
        }

        filteredSnippets.forEach(snippet => {
            const card = document.createElement('div');
            card.className = 'snippet-card glass';
            
            card.innerHTML = `
                <div class="snippet-header">
                    <div>
                        <div class="snippet-title">${escapeHTML(snippet.title)}</div>
                        <span class="snippet-lang">${snippet.language}</span>
                    </div>
                    <div class="snippet-actions">
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
                <div class="snippet-body">
                    <pre><code>${escapeHTML(snippet.code)}</code></pre>
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
    }

    async function handleCopy(e) {
        const btn = e.currentTarget;
        const id = btn.getAttribute('data-id');
        const snippet = snippets.find(s => s.id === id);
        
        if (snippet) {
            try {
                await navigator.clipboard.writeText(snippet.code);
                
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

    function handleDelete(e) {
        if (confirm('Are you sure you want to delete this snippet?')) {
            const btn = e.currentTarget;
            const id = btn.getAttribute('data-id');
            snippets = snippets.filter(s => s.id !== id);
            saveSnippets();
            renderSnippets(searchInput.value.toLowerCase());
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
