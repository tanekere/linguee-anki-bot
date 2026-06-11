# Anki Browser Extension Research

## Overview
This document surveys existing browser extensions that integrate with Anki for flashcard creation, analyzing their approaches, communication methods, and relevance to our German-English vocabulary project.

---

## Survey of Chrome Web Store Extensions

### 1. Anki Dictionary (wordwise.me)
- **Rating**: 4.2/5 stars
- **Description**: "Look up words instantly and save them as Anki flashcards, 100x faster than manual entry. Any language, auto-detected."
- **Communication Method**: Likely uses **AnkiConnect** (localhost:8765), the standard protocol for browser-to-Anki communication.
- **Key Features**:
  - Auto-detects language of words on webpages
  - One-click save to Anki
  - Works with any language
- **Relevance**: [HIGH] Closest match to our use case — dictionary lookup + Anki card creation.

### 2. Anki Quick Adder
- **Rating**: 4.2/5 stars
- **Description**: "This extension provides the ability to create anki cards directly from Google Chrome on your Anki Desktop."
- **Communication Method**: Uses **AnkiConnect** (requires AnkiConnect add-on installed in Anki).
- **Key Features**:
  - Quick card addition from browser
  - Customizable fields
- **Relevance**: [MEDIUM] Direct card creation, but no dictionary lookup integration.

### 3. Anki Quicker
- **Rating**: 5.0/5 stars
- **Description**: "Anki Quicker was developed for users of the study support application called Anki."
- **Communication Method**: Likely AnkiConnect.
- **Relevance**: [LOW] Generic flashcard adder.

### 4. Extraordictionary
- **Rating**: 5.0/5 stars
- **Description**: "A dictionary with images and Anki connecting."
- **Communication Method**: AnkiConnect.
- **Key Features**:
  - Dictionary integration
  - Image support
  - Anki card creation
- **Relevance**: [HIGH] Closest to our use case — dictionary + Anki in one extension.

### 5. Anki Chrome
- **Rating**: 4.0/5 stars
- **Description**: "Quickly create Anki flashcards directly from any webpage."
- **Communication Method**: AnkiConnect.
- **Relevance**: [MEDIUM] General-purpose web-to-Anki extension.

### 6. Chrome to Anki (Anki Card Maker)
- **Rating**: Not rated (few users)
- **Description**: Focused on Chinese-Russian dictionary with automatic data extraction.
- **Relevance**: [LOW] Language-specific, limited to Chinese-Russian.

### 7. Chat2Anki
- **Description**: "Make flashcards from your ChatGPT Conversations."
- **Relevance**: [LOW] Conversational AI focused, not dictionary-based.

### 8. YouTube to Anki (xxhk.org)
- **Rating**: 4.5/5 stars
- **Description**: "Take Anki notes on YouTube with timestamped video."
- **Relevance**: [LOW] YouTube-specific, not dictionary-based.

---

## Common Communication Architecture

All browser extensions that integrate with Anki use **AnkiConnect** as their backend:

```
┌──────────────────┐     HTTP POST (JSON)     ┌──────────────────┐
│  Browser Extension│ ────────────────────────>│  Anki Desktop     │
│  (Chrome/Firefox) │ <────────────────────────│  + AnkiConnect    │
└──────────────────┘     JSON Response         │  Add-on (Python)  │
                                                └──────────────────┘
```

### How AnkiConnect Works
1. **AnkiConnect** is an **Anki add-on** (Python plugin) that must be installed in Anki Desktop.
2. It runs a **local HTTP server** on `http://localhost:8765`.
3. Browser extensions send **JSON-RPC-style HTTP POST** requests to this endpoint.
4. AnkiConnect translates these requests into Anki's internal Python API calls.
5. No authentication is required — security relies on localhost-only binding (only programs on the same machine can access it).

### Key Advantages of AnkiConnect
- **Standardized**: The de facto standard for programmatic Anki access from browser extensions
- **Well-documented API**: ~40+ endpoints covering all Anki operations
- **Cross-browser**: Works with any extension capable of HTTP requests (Chrome, Firefox, Edge)
- **No CORS issues**: Localhost communication bypasses CORS restrictions

### Limitations
- **Anki must be running**: Anki Desktop must be open and AnkiConnect installed
- **Localhost only**: Cannot add cards to Anki on a different machine
- **No user authentication**: Anyone on the local machine can add cards (mitigated by localhost binding)

---

## Firefox Extensions

The Firefox Add-ons store has similar extensions, all using AnkiConnect:

- **AnkiConnect Helper** (Firefox-specific)
- **Yomichan** (Japanese, but architecture reference)
- **VocabSieve** (language learning + Anki)

---

## Recommendations for Our Project

### Architecture Choice
Our browser extension should communicate with Anki **via AnkiConnect** directly:

1. **Extension fetches data** from Linguee / Wiktionary / Glosbe
2. **Extension formats card** with HTML
3. **Extension sends `addNote`** request to AnkiConnect at `localhost:8765`

### Why Not a Python Middleware?
- **Simplicity**: Direct extension-to-AnkiConnect avoids an extra running process
- **Lower latency**: No additional network hop
- **Easier installation**: Users only need (1) our extension + (2) AnkiConnect add-on

### When Python Middleware Might Be Needed
- **LLM-powered extraction**: If we use an LLM to format/clean data, we might want a Python backend
- **Rate limiting / caching**: If calling APIs frequently
- **Offline batch processing**: For generating cards without Anki running (using genanki)

---

## Reference: Extension File Structure

A typical Anki-connecting Chrome extension structure:

```
extension/
├── manifest.json          # MV3 manifest with host permissions
├── background.js          # Service worker for background tasks
├── content.js             # Content script injected into Linguee/Wiktionary pages
├── popup.html             # Extension popup UI
├── popup.js              # Popup logic, AnkiConnect API calls
├── anki-connect.js        # Wrapper module for AnkiConnect HTTP calls
└── icons/                 # Extension icons
```

### Required Manifest Permissions
```json
{
  "permissions": [
    "activeTab",
    "storage"
  ],
  "host_permissions": [
    "http://localhost:8765/*",
    "https://www.linguee.com/*",
    "https://*.wiktionary.org/*",
    "https://glosbe.com/*"
  ]
}
```

Note: Chrome MV3 requires explicit `host_permissions` for localhost access.
