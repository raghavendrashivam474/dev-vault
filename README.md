# Dev-Vault

A lightweight, offline-first developer utility for capturing, organizing, searching, and reusing frequently referenced code snippets.

Dev-Vault is intentionally small: it provides a focused workflow for storing snippets without requiring an account, backend service, database, or external dependency. Everything runs locally in the browser and remains available offline through the Progressive Web App architecture.

**Live:** `https://cozy-boba-e7e30b.netlify.app/`

---

## Overview

Developers repeatedly encounter the same small pieces of code:

* configuration fragments
* shell commands
* SQL queries
* regular expressions
* Git commands
* API patterns
* language-specific syntax
* environment configuration
* one-off solutions worth remembering

These snippets often end up scattered across notes, browser bookmarks, chat history, documentation, or temporary files.

Dev-Vault provides a dedicated, minimal workspace for that information.

The application focuses on four operations:

> **Capture → Find → Copy → Reuse**

There is no server-side data layer. Snippets are persisted locally in the browser, while the service worker enables the application shell to remain available without an active network connection.

---

## Features

### Snippet Management

Store reusable code snippets with:

* Title
* Programming language
* Code content

The interface is designed around quickly capturing useful fragments rather than maintaining heavyweight documentation.

### Instant Search

Search operates directly against the locally stored snippet collection, allowing snippets to be located without navigating through folders or categories.

### One-Click Copy

Snippets can be copied directly to the system clipboard without manually selecting code.

A visual success state provides immediate feedback after a successful copy operation.

### Persistent Local Storage

Snippet data is stored using the browser's `localStorage`.

This means:

* No account is required
* No backend is required
* No database is required
* Data remains available between sessions
* Data stays within the user's browser storage

### Light / Dark Theme

The interface supports both light and dark presentation modes.

The selected preference is persisted locally so the interface remains consistent across sessions.

### Progressive Web App

Dev-Vault is installable as a Progressive Web App.

The application includes:

* Web App Manifest
* Service Worker
* Offline asset caching
* Installable application experience

Once the required assets have been cached, the core application can continue to operate without network connectivity.

---

## Architecture

The application deliberately uses a client-only architecture.

```text
                    ┌─────────────────────┐
                    │       Browser       │
                    │                     │
                    │  Developer Snippet  │
                    │        Hub          │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       Snippet Manager     Search Engine    Theme Manager
              │                │                │
              └────────────────┼────────────────┘
                               │
                               ▼
                         localStorage
                               │
                               ▼
                         Local Snippets


                    ┌─────────────────────┐
                    │    Service Worker   │
                    │                     │
                    │   Cache Management  │
                    └──────────┬──────────┘
                               │
                               ▼
                         Cached Assets
                               │
                               ▼
                         Offline Runtime
```

### Runtime Model

The application does not depend on an application server for its core functionality.

```text
User
 │
 ▼
Browser
 │
 ├── UI
 ├── Application Logic
 ├── Clipboard API
 ├── localStorage
 │
 └── Service Worker
        │
        └── Cache Storage
```

This keeps the runtime surface small and removes unnecessary infrastructure from a problem that does not inherently require a backend.

---

## Technology Stack

| Layer             | Technology             |
| ----------------- | ---------------------- |
| Markup            | HTML                   |
| Styling           | CSS                    |
| Application Logic | Vanilla JavaScript     |
| Persistence       | Browser `localStorage` |
| Offline Runtime   | Service Worker         |
| Installation      | Web App Manifest / PWA |
| Deployment        | Netlify                |

No frontend framework or backend framework is required.

---

## Design Decisions

### Client-Side by Default

The primary requirement is personal snippet storage, not collaborative code management.

A backend would introduce authentication, APIs, database management, synchronization, hosting, and operational overhead without being necessary for the initial problem.

The application therefore keeps the data layer local.

### No Framework

The project intentionally uses browser-native technologies rather than introducing a framework for a relatively small application.

This keeps:

* the dependency surface minimal
* the deployment model simple
* the runtime lightweight
* the codebase easy to inspect

It also keeps the application close to the underlying web platform.

### Offline-First

Snippet access is useful precisely when developers are working with or without reliable connectivity.

The PWA architecture therefore treats offline operation as a first-class capability rather than an afterthought.

### Local Data Ownership

Snippet content is stored in the user's browser rather than being transmitted to a remote application server.

This makes the application particularly suitable for snippets that a developer wants to keep within their local environment.

---

## Data Model

The application stores snippets locally.

Conceptually, a snippet consists of:

```text
Snippet
├── Title
├── Language
└── Code
```

The browser's local storage acts as the persistence layer.

No remote database is required for the current architecture.

---

## Offline Architecture

The service worker is responsible for caching the resources required by the application.

The resulting execution model is approximately:

```text
                 Network Available
                        │
                        ▼
                ┌───────────────┐
                │    Browser    │
                └───────┬───────┘
                        │
                  Service Worker
                        │
                 ┌──────┴──────┐
                 ▼             ▼
              Network        Cache
                 │             │
                 └──────┬──────┘
                        ▼
                    Application


                 Network Unavailable
                        │
                        ▼
                  Service Worker
                        │
                        ▼
                      Cache
                        │
                        ▼
                   Application
```

This allows the application shell to remain available after the relevant resources have been cached.

---

## Security & Privacy

The application does not require an account or a server-side database.

Snippet content is stored locally through browser storage.

However, local browser storage should not be treated as a secure secrets vault.

**Do not use Dev-Vault as a password manager or for storing highly sensitive credentials, private keys, API secrets, or other security-critical material.**

---

## Project Structure

The project is intentionally compact.

A typical deployment consists of the application entry point, styling, client-side logic, PWA metadata, service worker, and application icons.

```text
Dev-Vault/
│
├── index.html
├── style.css
├── script.js
├── manifest.json
├── sw.js
├── icons/
│
├── README.md
└── LICENSE
```

The exact structure may evolve as the project is maintained.

---

## Running Locally

Because the project is a static web application, no backend installation or package manager is required.

Clone the repository:

```bash
git clone <REPOSITORY_URL>
cd Dev-Vault
```

Serve the directory using any local static HTTP server.

For example:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

A local HTTP server is recommended instead of opening `index.html` directly because PWA features such as service workers require an appropriate browser execution context.

---

## Deployment

The application is deployed as a static site on Netlify.

The deployment model is intentionally simple:

```text
Git Repository
      │
      ▼
   Netlify
      │
      ▼
 Static Web Application
      │
      ▼
     User
```

No application server is required.

---

## Current Scope

The current version focuses on personal, local snippet management.

Included:

* Local snippet persistence
* Search
* Clipboard interaction
* Theme persistence
* PWA installation
* Offline application shell

Not currently included:

* User accounts
* Cloud synchronization
* Cross-device synchronization
* Collaborative snippet libraries
* Remote database
* Server-side APIs

These are deliberate scope boundaries rather than missing infrastructure.

---

## Future Possibilities

If the project evolves beyond its current local-first model, potential directions include:

* Optional cloud synchronization
* Import/export of snippet collections
* Backup and restore
* Tags and collections
* Keyboard-driven workflows
* Syntax highlighting
* Fuzzy search
* Cross-device synchronization
* Browser extension integration
* GitHub/Gist integration

Any such additions should preserve the project's original principle:

> **Keep frequently reused developer knowledge accessible with as little friction as possible.**

---

## Project Status

**Status:** Completed / Deployed

**Deployment:** Netlify

**Architecture:** Client-side, offline-first PWA

**Backend:** None

**Database:** None

**Frameworks:** None

---

## Developer

**Raghav**  
Independent Builder · Software Engineering

[GitHub](https://github.com/raghavendrashivam474/) · [Portfolio](<https://evolution-portfolio.vercel.app/)

---

## License

This project is licensed under the **MIT License**.

You are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the software, subject to the conditions of the license.

See the [`LICENSE`](./LICENSE) file for the complete license text.
 
---

## Philosophy

Dev-Vault is deliberately not a platform.

It is a small piece of developer infrastructure built around a simple observation:

> If a piece of code is useful enough to reuse, it deserves a place where it can be retrieved immediately.

The project explores how far a focused browser-native application can go without introducing unnecessary infrastructure.

Sometimes the best engineering decision is not adding another dependency, service, or abstraction.

Sometimes it is simply building the tool, making it fast, making it reliable, and shipping it.
