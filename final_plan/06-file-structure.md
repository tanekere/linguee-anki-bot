# 06 — File Structure & Manifest

## File Structure

```
linguee-anki-bot/
├── manifest.json                    # MV3 manifest
├── background.js                    # Service worker: AnkiConnect, formatting, queue
├── content.js                       # Content script: DOM extraction, button injection
├── content.css                      # Styles for injected buttons and toasts
├── popup/
│   ├── popup.html                   # Extension popup HTML
│   ├── popup.js                     # Popup logic
│   └── popup.css                    # Popup styles
├── icons/
│   ├── icon-16.png                  # 16x16 extension icon
│   ├── icon-48.png                  # 48x48 extension icon
│   └── icon-128.png                 # 128x128 extension icon
└── final_plan/                      # This plan
    ├── 00-overview.md
    ├── 01-architecture.md
    ├── 02-testing-profile-safeguard.md
    ├── 03-dom-extraction.md
    ├── 04-anki-integration.md
    ├── 05-extension-ui.md
    ├── 06-file-structure.md
    └── 07-implementation-order.md
```

## Manifest (manifest.json)

```json
{
  "manifest_version": 3,
  "name": "Linguee → Anki",
  "version": "1.0.0",
  "description": "Extract German-English vocabulary from Linguee and add flashcards to Anki via AnkiConnect.",
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "http://localhost:8765/*",
    "https://www.linguee.com/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": [
        "https://www.linguee.com/*/search*",
        "https://www.linguee.com/*-*/translation/*"
      ],
      "js": ["content.js"],
      "css": ["content.css"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "Linguee → Anki"
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

### Manifest Notes

1. **`host_permissions`** includes `http://localhost:8765/*` for AnkiConnect and `https://www.linguee.com/*` for content script access
2. **`content_scripts`** matches both search results pages (`/search`) and dictionary entry pages (`/translation/`) — these are the two URL patterns where vocabulary data appears
3. **`run_at: "document_idle"`** ensures the page is fully loaded before content script runs
4. **No `tabs` permission needed** — the popup doesn't need to enumerate tabs; it just communicates with the service worker
5. **`storage` permission** for `chrome.storage.local` — to persist deck selection and offline queue
6. **`activeTab`** may be needed for programmatic injection if we want to support arbitrary Linguee pages

## Key File Responsibilities

### `background.js` (Service Worker)

```
Responsibilities:
├── AnkiConnect communication (all HTTP calls to localhost:8765)
├── Profile safeguard (ensure "testing" profile is active)
├── Card HTML formatting (WordEntry → Anki field HTML)
├── Note type management (create "Linguee German Vocabulary" model)
├── Deck management (create/verify decks under "testing" profile)
├── Message handling (respond to content script and popup messages)
├── Offline queue (store/retry failed adds)
└── Connection status reporting
```

### `content.js` (Content Script)

```
Responsibilities:
├── Page detection (verify we're on a Linguee dictionary page)
├── DOM extraction (parse .exact divs into WordEntry objects)
├── Button injection (create "Add to Anki" buttons next to entries)
├── Click handling (send data to service worker on click)
├── Button state management (idle, adding, added, error states)
├── Status polling (periodically check AnkiConnect status)
├── Toast notifications (show success/error messages on page)
└── MutationObserver (handle dynamic page changes, optional)
```

### `popup/popup.js`

```
Responsibilities:
├── Status display (AnkiConnect connected/disconnected, profile)
├── Deck selector (dropdown of available decks)
├── Deck creation (create new decks via AnkiConnect)
├── Queue management (view/process offline queue)
├── Settings storage (persist selected deck via chrome.storage.local)
└── Setup instructions (guide for AnkiConnect + "testing" profile)
```

### `content.css`

```
Styles for:
├── .linguee-anki-btn (injected button)
├── .linguee-anki-btn-container (button wrapper)
├── .linguee-anki-btn.added (success state)
├── .linguee-anki-btn.error (error state)
├── .linguee-anki-btn.disabled (disabled state)
├── .linguee-anki-toast (notification toast)
└── .linguee-anki-toast-container (toast container)
```

## Data Types

### WordEntry (content script → service worker)

```typescript
interface WordEntry {
  word: string;                        // "Haus"
  pos: string;                         // "noun"
  gender: string;                       // "neuter" | "" (empty for non-nouns)
  forms: {
    plural: string | null;             // "Häuser"
    conjugations: string[] | null;     // ["ran", "run"]
  };
  commonTranslations: Translation[];
  leastCommonTranslations: Translation[];
  sourceURL: string;                   // Linguee page URL
}

interface Translation {
  text: string;                        // "house"
  pos: string;                         // "n"
  usageNote: string;                   // "(often used)" | ""
  isOftenUsed: boolean;               // true if .tag_c.usedveryoften
  isCommon: boolean;                  // true for featured, false for inexact
  examples: ExamplePair[];
}

interface ExamplePair {
  source: string;                      // "Mein Haus hat drei Schlafzimmer."
  target: string;                       // "My house has three bedrooms."
}
```

### Service Worker Messages

```typescript
// Content → Service Worker
type CSMessage =
  | { action: "ADD_TO_ANKI"; data: WordEntry }
  | { action: "CHECK_ANKI_STATUS" }
  | { action: "GET_DECKS" };

// Service Worker → Content
type CSResponse =
  | { success: true; noteId: number }
  | { success: false; error: string; message: string }
  | { success: false; queued: true }
  | { connected: boolean; profile: string | null; deck: string | null };

// Popup → Service Worker
type PopupMessage =
  | { action: "GET_STATUS" }
  | { action: "GET_DECKS" }
  | { action: "SET_DECK"; deckName: string }
  | { action: "CREATE_DECK"; deckName: string }
  | { action: "PROCESS_QUEUE" };

// Service Worker → Popup
type PopupResponse =
  | { connected: boolean; profile: string | null }
  | { decks: string[] }
  | { deck: string }
  | { processed: number; remaining: number };
```

## chrome.storage.local Keys

| Key | Type | Purpose |
|-----|------|---------|
| `selectedDeck` | `string` | Currently selected deck name (default: `"testing--German::Vocabulary"`) |
| `offlineQueue` | `OfflineItem[]` | Queue of cards that failed to add (Anki down, wrong profile) |
| `noteTypeCreated` | `boolean` | Whether the "Linguee German Vocabulary" model has been created |
| `cardsAddedCount` | `number` | Session counter for popup display |
| `ankiStatus` | `object` | Cached AnkiConnect status `{ connected, profile, lastCheck }` |