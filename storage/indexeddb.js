import { VaultRepository } from './repository.js';

export class IndexedDBRepository extends VaultRepository {
    constructor() {
        super();
        this.dbName = 'DevVault';
        this.storeName = 'entries';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve();
            };

            request.onerror = (event) => {
                reject(event.target.error);
            };
        });
    }

    async list() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => {
                // sort by createdAt descending to keep newest first
                const items = request.result || [];
                items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                resolve(items);
            };

            request.onerror = (event) => reject(event.target.error);
        });
    }

    async get(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async create(entry) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.add(entry);

            request.onsuccess = () => resolve(entry);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async update(id, changes) {
        const entry = await this.get(id);
        if (!entry) throw new Error('Entry not found');
        
        const updatedEntry = { ...entry, ...changes, updatedAt: new Date().toISOString() };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put(updatedEntry);

            request.onsuccess = () => resolve(updatedEntry);
            request.onerror = (event) => reject(event.target.error);
        });
    }

    async remove(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject(event.target.error);
        });
    }
}
