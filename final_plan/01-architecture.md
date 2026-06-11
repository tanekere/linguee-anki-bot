# 01 — Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Chrome MV3 Extension                               │
│                                                                             │
│  ┌──────────────────────────┐                                              │
│  │   Content Script          │  Injected into linguee.com pages             │
│  │   (content.js + content.css)│                                             │
│  │                            │  • Reads DOM, extracts word data            │
│  │   • detectLingueePage()   │  • Injects "Add to Anki" buttons            │
│  │   • extractWordEntries()  │  • Sends extracted data to service worker    │
│  │   • injectAddButtons()   │                                              │
│  │   • handleAddClick()     │                                              │
│  └─────────┬──────────────────┘                                              │
│            │ chrome.runtime.sendMessage                                      │
│            ▼                                                                 │
│  ┌──────────────────────────┐                                              │
│  │   Service Worker           │  Persistent background script               │
│  │   (background.js)          │                                             │
│  │                            │  • AnkiConnect HTTP client                  │
│  │   • ankiInvoke()          │  • Profile safeguard enforcement           │
│  │   • formatCardHTML()      │  • Offline queue management                │
│  │   • ensureNoteType()      │  • Note type creation                     │
│  │   • safeAddNote()         │                                              │
│  │   • processOfflineQueue()│                                              │
│  └─────────┬──────────────────┘                                              │
│            │ chrome.runtime.onMessage (popup ↔ service worker)              │
│            ▼                                                                 │
│  ┌──────────────────────────┐                                              │
│  │   Popup                    │  Extension toolbar popup                    │
│  │   (popup.html/js/css)     │                                             │
│  │                            │  • Deck selector (filtered to "testing")   │
│  │   • Deck list dropdown    │  • Connection status indicator             │
│  │   • Status display        │  • Settings / info                          │
│  │   • AnkiConnect status    │                                              │
│  └──────────────────────────┘                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
        │                          │
        │ HTTP POST localhost:8765 │ chrome.storage.local
        ▼                          ▼
┌──────────────────┐   ┌─────────────────────┐
│  Anki Desktop     │   │  chrome.storage      │
│  + AnkiConnect    │   │  • selectedDeck       │
│  (testing profile)│   │  • offlineQueue       │
│                   │   │  • noteTypeCreated     │
└──────────────────┘   └─────────────────────┘
```

## Data Flow

### Primary flow: User clicks "Add to Anki" button

```
1. User navigates to https://www.linguee.com/german-english/search?query=Haus
2. Content script detects Linguee page (URL match)
3. Content script calls extractWordEntries() to parse the DOM
4. Content script calls injectAddButtons() to insert buttons next to each .exact entry
5. User clicks the "Add to Anki" button next to "Haus (noun, neuter)"
6. Content script extracts that specific .exact entry's data
7. Content script sends message: { action: "ADD_TO_ANKI", data: wordEntry }
8. Service worker receives message
9. Service worker calls ensureActiveProfileIsTesting()
   → If wrong profile: REJECT with error message
   → If "testing" profile active: continue
10. Service worker calls ensureDeckExists(deckName) within "testing" context
11. Service worker calls ensureNoteType() to verify/create "Linguee German Vocabulary"
12. Service worker calls formatCardHTML(wordEntry) to generate Anki field content
13. Service worker calls canAddNotes() to check for duplicates
14. Service worker calls addNote() to create the card
15. Service worker sends response: { success: true, noteId } back to content script
16. Content script updates button state: "Added ✓" (green)
```

### Secondary flow: Popup deck selection

```
1. User clicks extension icon in toolbar
2. Popup opens, sends { action: "GET_STATUS" } to service worker
3. Service worker checks AnkiConnect connectivity (version endpoint)
4. Service worker calls ensureActiveProfileIsTesting()
5. If "testing" profile active:
   → Returns deck list filtered to decks within "testing" profile
6. If "testing" profile not active:
   → Returns error + offer to switch profile
7. Popup renders deck selector, status indicator
8. User selects a deck
9. Popup stores selection in chrome.storage.local
10. Future "Add to Anki" button clicks use the stored deck
```

### Offline flow: Anki unavailable

```
1. Content script sends ADD_TO_ANKI message
2. Service worker detects AnkiConnect is unreachable
3. Service worker saves card data to chrome.storage.local offlineQueue
4. Service worker responds: { success: false, queued: true }
5. Content script shows "Queued" state on button
6. On next popup open or service worker wake: processOfflineQueue()
7. Cards are sent when Anki becomes available
```

## Message Protocol

### Content Script → Service Worker

```javascript
// Add a word to Anki
{ action: "ADD_TO_ANKI", data: WordEntry }

// Check AnkiConnect status
{ action: "CHECK_ANKI_STATUS" }

// Get deck list
{ action: "GET_DECKS" }
```

### Service Worker → Content Script

```javascript
// Response to ADD_TO_ANKI
{ success: true, noteId: 12345 }
{ success: false, error: "duplicate", message: "..." }
{ success: false, error: "wrong_profile", message: "..." }
{ success: false, queued: true }

// Response to CHECK_ANKI_STATUS
{ connected: true, profile: "testing" }
{ connected: false, reason: "anki_not_running" }

// Response to GET_DECKS
{ decks: ["testing::German::Vocabulary", "testing::German::Nouns"] }
```

### Popup → Service Worker

```javascript
// Get status
{ action: "GET_STATUS" }

// Get deck list
{ action: "GET_DECKS" }

// Set selected deck
{ action: "SET_DECK", deckName: "testing::German::Vocabulary" }

// Process offline queue
{ action: "PROCESS_QUEUE" }
```

## Component Responsibilities

### Content Script (content.js)
- **Page detection**: Match URL pattern `*://www.linguee.com/*/search*`
- **Data extraction**: Parse `.exact` divs into structured `WordEntry` objects
- **Button injection**: Create "Add to Anki" button elements next to each `.lemma_desc`
- **User interaction**: Handle button clicks, show loading/success/error states
- **Message passing**: Send extracted data to service worker, receive results

### Service Worker (background.js)
- **AnkiConnect client**: All HTTP calls to `localhost:8765`
- **Profile safeguard**: Enforce "testing" profile before any write operation
- **Card formatting**: Convert `WordEntry` to HTML for Anki fields
- **Note type management**: Create "Linguee German Vocabulary" model on first use
- **Deck management**: Create/verify decks
- **Duplicate checking**: `canAddNotes` + `findNotes` for smart dedup
- **Offline queue**: Store failed attempts, retry when Anki reconnects
- **Status reporting**: AnkiConnect connection status, profile status

### Popup (popup.html/js/css)
- **Deck selector**: Dropdown of available decks (filtered to "testing" profile scope)
- **Status indicator**: AnkiConnect status (connected/disconnected/wrong profile)
- **Current deck display**: Show which deck the user is adding cards to
- **Quick actions**: Manual deck creation, queue processing

## MV3 Key Decisions

1. **`host_permissions`**: Must include `http://localhost:8765/*` for AnkiConnect access
2. **Mixed content**: Content scripts CANNOT call `http://localhost:8765` from `https://www.linguee.com` — all AnkiConnect calls go through the service worker
3. **Service worker ephemerality**: No global state — use `chrome.storage.local` for queue and settings
4. **Content script injection**: Use `manifest.json` `content_scripts` (not `chrome.scripting.executeScript`) since we always inject on Linguee pages
5. **Permissions**: `activeTab` (for tab info), `storage` (for settings/queue), `scripting` (for future dynamic injection)