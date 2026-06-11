# Research Summary — Linguee-Anki-Bot

## Agent 1: Linguee Source Analysis

**Status:** Complete

### Key Findings

**URL Pattern:**
```
https://www.linguee.com/german-english/search?source=auto&query=WORD
```

**DOM Structure (from live snapshot of "Haus" and "laufen"):**

```
▾ Dictionary German-English
  ├─ Haus noun, neuter (plural: Häuser)       ← word + POS + gender
  │   ├─ house n (often used)                  ← translation #1 (frequent)
  │   │   ├─ "Mein Haus hat drei Schlafzimmer..."  ← German example
  │   │   └─ "My house has three bedrooms..."      ← English example
  │   ├─ building n                            ← translation #2
  │   ├─ home n                                ← translation #3
  │   │   ├─ "Sie blieben in ihrem Haus..."        ← German example
  │   │   └─ "They remained in their home..."      ← English example
  │   ├─ domicile n                            ← translation #4
  │   │   ├─ "Ich habe mein Haus..."               ← German example
  │   │   └─ "I built my domicile..."              ← English example
  │   └─ less common:                          ← frequency divider
  │       ├─ establishment n · dwelling n · household n · shell n
  ├─ Examples:                                 ← compound phrases
  │   ├─ großes Haus → large mansion
  │   ├─ schönes Haus → nice house / lovely house
  │   └─ wunderschönes Haus → beautiful house
  └─ External sources (not reviewed)           ← parallel texts
      └─ [source-language] / [target-language] with source URLs
```

**Verb Entry (e.g., "laufen"):**
```
▾ Dictionary German-English
  ├─ laufen verb                              ← word + POS (no gender for verbs)
  │   ├─ run v (ran, run)                     ← with conjugations
  │   │   ├─ "Ich musste heute Morgen..."         ← example
  │   │   └─ "I had to run really fast..."        ← example
  │   │   ├─ "Dieses Kraftwerk läuft..."          ← 2nd example
  │   │   └─ "This power plant runs..."           ← 2nd example
  │   ├─ walk v (walked, walked)
  │   ├─ work v (worked, worked)
  │   ├─ go v (went, gone)
  │   ├─ go on v
  │   ├─ be in progress v
  │   └─ less common: operate · race · flow · travel · function...
  └─ Laufen noun, neuter                      ← nominalized form as separate entry
      ├─ running n
      └─ operation n
```

### Data Fields Extractable from Linguee

| Field | Present | Notes |
|-------|---------|-------|
| Word | Yes | Lemma form |
| Part of speech | Yes | noun, verb, adjective, etc. |
| Gender | Yes | m, f, n, nt, pl (on nouns) |
| Plural form | Yes | Shown for nouns |
| Verb conjugations | Yes | Past tense, past participle |
| Translations (ranked) | Yes | Frequent first, "less common" divider |
| Frequency labels | Yes | "(often used)", "less common:" |
| Example sentences | Yes | Paired German/English per translation |
| Source URLs | Yes | In external sources section |

### Scraping Feasibility

- **Static HTML:** Core dictionary data is rendered server-side (no JS needed)
- **Python stack:** `requests` + `BeautifulSoup4` is sufficient
- **CSS classes:** Consistent class-based DOM (e.g., `.dictLink`, `.exact`, `.lemma`)
- **No API detected:** No internal JSON API calls found in network tab
- **Anti-scraping:** Moderate. Linguee serves ads and has rate limits but no CAPTCHA observed
- **Edge cases:** Multiple meanings handled by separate sections; reflexive/separable verbs shown with particle

---

## Agent 2: Alternative Sources (Wiktionary / Glosbe)

**Status:** Partial (Linguee found sufficient — alternatives researched at API level)

### Comparison Matrix

| Feature | Linguee | Wiktionary | Glosbe |
|---------|---------|-----------|--------|
| Part of speech | Yes | Yes | Yes |
| Gender | Yes (m/f/n/nt) | Yes (m/f/n) | Inconsistent |
| Translation frequency ranking | Yes ("often used" / "less common") | No (alphabetical or definition-order) | Partial (votes-based) |
| Example sentences per translation | Yes | Rarely | Sometimes |
| API availability | No (HTML-only) | Yes (MediaWiki API, free) | Yes (limited, rate-restricted) |
| Python library support | N/A (DIY) | `wiktextract`, `wiktionaryparser` | No official lib |
| Scraping difficulty | Easy (static HTML) | Medium (inconsistent formatting) | Easy |
| Data completeness | Excellent | Good for definitions, weak for translations | Moderate |
| Rate limiting | Moderate | Minimal | Aggressive |
| Example quality | Native-quality sentence pairs | Rare | Variable |

### Recommendation

**Linguee is the best primary source** due to:
1. Rich, ranked translations with frequency indicators
2. High-quality example sentences paired per translation
3. Consistent DOM structure across word types
4. Gender and part-of-speech always present
5. Verb conjugations shown inline

**Wiktionary** is a viable **fallback** for less common words not indexed by Linguee, via its MediaWiki API with `wiktextract`.

**Glosbe** is not recommended due to aggressive rate limiting, inconsistent data quality, and lack of frequency-ranked translations.

---

## Agent 3: Anki Integration & Card Design

**Status:** Complete

### AnkiConnect — Primary Integration Method

- **Protocol:** HTTP JSON API on `http://127.0.0.1:8765`
- **API Version:** 6
- **Auth:** Optional API key (disabled by default)
- **Add-on Code:** 2055492159
- **Install:** Tools → Add-ons → Get Add-ons → enter code → restart Anki
- **Browsers:** Accessible from browser extensions via CORS (configure `webCorsOriginList`)

### Key API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `deckNames` | List all decks |
| `createDeck` | Create a new deck |
| `modelNames` | List all note types |
| `createModel` | Create a custom note type |
| `addNote` | Add a new card to a deck |
| `findNotes` | Find existing notes (for dedup) |
| `notesInfo` | Get note details by ID |
| `updateNoteFields` | Update existing note fields |
| `storeMediaFile` | Add images/audio to collection |
| `canAddNotes` | Check for duplicates before adding |
| `multi` | Batch multiple actions in one request |

### Python Integration Pattern

```python
import json, urllib.request

def anki(action, **params):
    request = json.dumps({"action": action, "params": params, "version": 6}).encode("utf-8")
    response = json.load(urllib.request.urlopen(
        urllib.request.Request("http://127.0.0.1:8765", request)))
    if response.get("error"):
        raise Exception(response["error"])
    return response["result"]
```

### Recommended Note Type Schema

**Model Name:** `Linguee_Vocabulary`

| Field | Purpose | Card Side |
|-------|---------|-----------|
| `Word` | The German word | Front |
| `POS` | Part of speech (noun, verb, etc.) | Front |
| `Gender` | Gender (m/f/n/nt) | Front |
| `CommonTranslations` | Ranked frequent translations (HTML list) | Back |
| `LessCommonTranslations` | Remaining translations (HTML list) | Back |
| `Examples` | Example sentences with translations (HTML) | Back |
| `Plural` | Plural form (for nouns) | Back |
| `Conjugations` | Verb forms (for verbs) | Back |
| `SourceURL` | Link to Linguee page | Back |

### Card Layout Design

**Front (question):**
```html
<div class="word">{{Word}}</div>
<div class="pos-gender">{{POS}}{{#Gender}} · {{Gender}}{{/Gender}}</div>
```

**Back (answer):**
```html
<div class="translations">
  {{CommonTranslations}}
  {{#LessCommonTranslations}}
    <div class="less-common-header">Less Common</div>
    {{LessCommonTranslations}}
  {{/LessCommonTranslations}}
</div>
<div class="examples">{{Examples}}</div>
{{#Plural}}<div class="meta">Plural: {{Plural}}</div>{{/Plural}}
{{#Conjugations}}<div class="meta">{{Conjugations}}</div>{{/Conjugations}}
```

### Deduplication Strategy

Use `findNotes` with query `deck:DeckName Word:WORD` before adding. If found, optionally call `updateNoteFields` to refresh with newer data.

### Error Handling

- Anki not running → Show user-friendly error "Please open Anki first"
- AnkiConnect not installed → Detect via `requestPermission` failure
- Network error → Graceful fallback with retry
- Duplicate card → Skip or confirm with user

---

## Cross-Agent Findings

### Data Source → Anki Field Mapping

| Linguee Data | Anki Field | Notes |
|-------------|-----------|-------|
| Word (lemma) | `Word` | Front of card |
| Part of speech | `POS` | Front of card |
| Gender | `Gender` | Front of card |
| Translation #1 (often used) | `CommonTranslations` | HTML `<ul>` list |
| Translation #N (less common) | `LessCommonTranslations` | Under "Less Common" header |
| Example sentences | `Examples` | HTML with `<blockquote>` per translation |
| Plural form | `Plural` | Meta section on back |
| Verb conjugations | `Conjugations` | Meta section on back |
| Linguee URL | `SourceURL` | Footer link on back |

### Architecture Overview

```
┌─────────────┐    HTTP GET     ┌─────────────┐    HTTP POST    ┌─────────────┐
│   Linguee   │ ←────────────── │   Python    │ ──────────────→ │    Anki     │
│   .com      │    BeautifulSoup │   Script    │   localhost:8765 │  (desktop)  │
│  (HTML)     │ ──────────────→ │  (extractor) │ ←────────────── │             │
└─────────────┘   Parsed data   └─────────────┘   JSON response  └─────────────┘
```

### Key Architectural Decisions

1. **Python script, not browser extension** — Linguee scraping is most reliable server-side; a Python CLI script is simpler than a browser extension + middleware architecture
2. **Direct AnkiConnect integration** — No need for Genanki (offline .apkg generation) since AnkiConnect handles live card creation
3. **No LLM needed** — Linguee's structured DOM allows deterministic extraction without LLM cost/complexity
4. **Synchronous flow** — User provides word → scrape Linguee → parse → create Anki note → report success

---

## Viability Assessment

| Concern | Assessment |
|---------|-----------|
| Linguee rate limiting | Moderate — add 1-2s delays between requests |
| Linguee anti-bot measures | Low — static HTML, no JS challenge |
| Linguee availability | High — commercial site, consistently online |
| AnkiConnect availability | High — installed locally, always available if Anki is open |
| Wiktionary fallback | Available if Linguee blocks or lacks a word |
| Glosbe fallback | Not recommended |
| LLM-based extraction | Not needed for Linguee; could be useful for Wiktionary's inconsistent structure |
