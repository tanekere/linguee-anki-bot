# Implementation Hints — Linguee-Anki-Bot (Browser Extension)

## Architecture Direction

The research suggests a **direct browser-extension-to-AnkiConnect** architecture is simpler than a Python CLI:
- No middleware process to install/manage; users only need the extension + AnkiConnect add-on
- The content script already has the page's DOM — no need to re-fetch what the user is already looking at
- Service workers in MV3 can call `localhost:8765` without mixed-content issues (content scripts can't)
- `chrome.storage.local` provides a built-in persistence layer for preferences and offline queues

A Python companion app could still be useful later for batch `.apkg` generation or LLM-powered enrichment, but it's not needed for the core flow.

---

## Linguee DOM Parsing

### Why content-script parsing works well

Linguee renders dictionary data as **server-side static HTML** — no client-side API calls, no JS-rendered content. When a user is on a page like:
```
https://www.linguee.com/german-english/search?source=auto&query=Haus
```
the content script can simply read `document.querySelectorAll(...)` and extract everything needed.

### Key CSS classes (stable across pages)

| Class | What it contains |
|-------|-----------------|
| `.exact` | Main entry container (one per lemma/sense) |
| `.tag_lemma` | Word + POS + gender combined text |
| `.tag_type` | Abbreviated POS (n, v, adj, adv...) |
| `.tag_forms` | Verb conjugations (e.g., "ran, run") |
| `.tag_usage` | Frequency tag ("often used") |
| `.translation` | Individual translation block |
| `.dictLink` | Translation word/phrase link |
| `.example_lines` | Paired example sentences |
| `.inexact` | Container for "less common" translations |
| `.singleline` | Single-line lesser translations |
| `.examples` | Compound phrase section |

### Key data available per word

- **Headword** (lemma form)
- **Part of speech** (noun, verb, adjective, adverb...)
- **Gender** (masculine/feminine/neuter — nouns only)
- **Plural form** (nouns)
- **Verb conjugations** (past tense, past participle)
- **Ranked translations** with frequency indicators ("often used" → common list → "less common" divider)
- **Example sentence pairs** per translation (German + English)
- **Compound phrases** (e.g., "großes Haus → large mansion")

### Things to watch for

- The "less common" section is often **hidden by CSS** in the browser — but the HTML is still present in the DOM source, so `querySelector` still finds it
- Multi-sense words (e.g., "schön" as adjective and adverb) appear as **separate `.exact` divs** — each should produce its own card
- Reflexive verbs (e.g., "sich erinnern") and separable verbs (e.g., "auf|machen") need special handling
- Linguee uses the `deepl.com` analytics endpoint — consider whether to block those requests for privacy

### Rate limiting

Linguee has **not been observed using CAPTCHAs**, but rate limiting via delays between requests is prudent. Since the extension scrapes the page the user already navigated to (not automated fetching), rate limiting is less of a concern than it would be for a Python CLI.

---

## AnkiConnect Integration

### Connection model

AnkiConnect runs an HTTP JSON API at `http://localhost:8765`. All requests are HTTP POST with a JSON body containing `action`, `version` (6), and `params`.

The browser extension should:
- Make all AnkiConnect calls from the **service worker** (background script), not from content scripts — this avoids HTTPS→HTTP mixed content blocking in MV3
- Check connectivity with the `version` endpoint before offering "Add to Anki" functionality
- Show a clear connection status indicator (connected/disconnected)

### Core endpoints to use

| Endpoint | Purpose |
|----------|---------|
| `version` | Check if AnkiConnect is reachable |
| `deckNames` | Populate deck selector dropdown |
| `createDeck` | Auto-create deck if user types a new name |
| `modelNames` / `createModel` | Ensure the vocabulary note type exists |
| `canAddNotes` | Check for duplicates before adding |
| `addNote` | Create the flashcard |
| `findNotes` | Custom duplicate search (word + POS combo) |
| `updateNoteFields` | Refresh an existing card with new data |
| `storeMediaFile` | Add audio/images if available |

### Duplicate detection

Anki's default duplicate check only cares about the **first field** matching. For vocabulary, this means "Haus" (noun) and "laufen" (verb) wouldn't conflict, but you couldn't add "laufen" (verb) and "Laufen" (noun) separately unless using a custom `findNotes` query with word+POS filtering. A suggestion: check for `Word:X POS:Y` before adding, and `allowDuplicate: true` in the `addNote` options to bypass Anki's own check.

### Error states to plan for

- **Anki not running**: Connection refused → show "Open Anki Desktop" message
- **AnkiConnect not installed**: `version` fails → show install link (add-on code: 2055492159)
- **Duplicate card**: `canAddNotes` returns false → offer "Update existing" or "Skip"
- **Deck doesn't exist**: Auto-create with `createDeck` (Anki `::` syntax for subdecks)
- **Offline queue**: Save card data to `chrome.storage.local` and retry when Anki reconnects

---

## Card & Note Type Design

### Suggested note type fields

A custom note type (`German Vocabulary` or similar) with separate fields for each data component allows flexible card template design:

| Field | Purpose |
|-------|---------|
| `Word` | German lemma (front of card) |
| `POS` | Part of speech (front) |
| `Gender` | m/f/n/nt (front, nouns only — conditional) |
| `Translations` | Common translations with examples (HTML) |
| `LeastCommon` | Less common translations (HTML, conditional) |
| `Source` | Linguee / Wiktionary attribution |

### Card template approach

The **Basic** (front/back) card type is a good fit for vocabulary. Cloze deletions are better for grammar/sentence exercises.

- **Front**: Large word display + POS + gender badge (color-coded: blue=masc, red=fem, green=neuter)
- **Back**: Ranked translations grouped by frequency, example sentences under each, "Least Common" divider for remaining ones

Generate pre-formatted HTML for the `Translations` and `LeastCommon` fields in the service worker, using `{{{triple braces}}}` in Anki templates so the HTML renders directly.

### Dark mode

Anki applies `.nightMode` to the card container when the user has dark mode enabled. Include `.nightMode` CSS overrides in the note type stylesheet for all colors.

---

## Extension Structure

### MV3 component roles

```
popup (popup.html/js)
  → Deck selector, "Add to Anki" button, status display
  → Talks to service worker via chrome.runtime.sendMessage

content script (content.js)
  → Injected into Linguee/Wiktionary pages
  → Reads the DOM, extracts structured word data
  → Sends extracted data to popup or service worker

service worker (background.js)
  → AnkiConnect HTTP client (avoids mixed-content issues)
  → HTML formatter for card fields
  → Manages offline queue in chrome.storage.local
  → Handles model/deck creation on first use
```

### Manifest permissions (MV3)

- `activeTab` — read the current page's DOM
- `storage` — save deck preferences and offline queue
- `scripting` — inject content scripts
- `host_permissions`: `http://localhost:8765/*`, `https://www.linguee.com/*`, `https://*.wiktionary.org/*`

---

## User Experience Flow

1. User navigates to a Linguee word page
2. Content script detects the page and extracts word data
3. Extension popup shows the extracted word, POS, gender
4. User selects a deck from dropdown (or types a new one)
5. User clicks "Add to Anki"
6. Service worker checks AnkiConnect availability, ensures deck/model exist, checks for duplicates, adds the note
7. Popup shows success/duplicate/error feedback

For batch addition (e.g., all compound phrases on a page), show a checklist of extracted terms and let the user select which ones to add.

---

## Edge Cases & Gotchas

- **Words with umlauts/special chars**: Already handled by Linguee search; content script receives correctly encoded text from DOM
- **Multiple senses**: Each `.exact` div is a separate entry — consider adding a "Sense #N" label or letting the user pick which to add
- **"Less common" section hidden**: CSS `display:none` in browser, but DOM nodes are present and queryable
- **Linguee changes DOM**: Use semantic selectors (class-based) rather than positional/nth-child selectors to be more resilient
- **Mixed content (HTTPS→HTTP)**: Only a concern for content scripts. Service workers in MV3 can call `localhost` freely
- **Anki subdecks**: Use `::` separator (e.g., `German::Nouns`); AnkiConnect auto-creates parent decks
- **Offline resilience**: Queue cards in `chrome.storage.local` when Anki isn't reachable; retry on next popup open
- **Whitespace/normalization**: Linguee text often has non-breaking spaces and special whitespace — normalize during extraction

---

## Data Source Summary

| Source | Strengths | Best used for |
|--------|-----------|---------------|
| **Linguee** | Frequency-ranked translations, rich examples, consistent DOM | Primary: translations + examples |
| **Wiktionary** | Free API, structured POS/gender/IPA, inflection tables | Structural data, fallback for rare words |
| **Glosbe** | Large translation coverage | Not recommended for v1 (aggressive rate limiting, inconsistent quality) |

A suggestion: start with Linguee-only for the MVP. Wiktionary can be added as a fallback source later.
