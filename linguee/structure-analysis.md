# Linguee Website Structure Analysis

## Overview
Linguee (linguee.com) is a bilingual dictionary and translation search engine owned by DeepL. It provides dictionary entries with translations ranked by frequency, along with example sentences sourced from bilingual texts across the web.

**Search URL pattern:**
```
https://www.linguee.com/german-english/search?source=auto&query={word}
```

---

## Page Structure (Search Results)

### 1. Main Sections (top to bottom)
```
┌─────────────────────────────────────────┐
│  Header: DeepL nav, language selector   │
├─────────────────────────────────────────┤
│  ▾ Dictionary German-English            │ ← h2 heading
│    [word entry with POS & gender]       │ ← .exact divs
│    ├── Translation 1 (most common)      │ ← .translation
│    │   ├── Example sentences (DE→EN)   │ ← .example_lines
│    │   └── Source attribution           │ ← .source_url
│    ├── Translation 2                     │
│    ├── ...                               │
│    └── less common:                     │ ← .inexact section
│        ├── Translation N                │
│        └── ...                          │
├─────────────────────────────────────────┤
│  Examples: (compound phrases)           │ ← .examples section
├─────────────────────────────────────────┤
│  ▾ External sources (not reviewed)       │
│    Bilingual text snippets from web     │
├─────────────────────────────────────────┤
│  Footer                                 │
└─────────────────────────────────────────┘
```

### 2. Key CSS Classes (verified via DOM inspection)

| CSS Class | Purpose |
|-----------|---------|
| `.exact` | Main entry container for exact word matches |
| `.lemma` | Lemma/headword section |
| `.lemma_desc` | Lemma description/header |
| `.lemma_content` | Content within lemma |
| `.tag_lemma` | Word + POS/gender combined (e.g., "Haus  noun, neuter") |
| `.tag_wordtype` | Detailed part of speech (e.g., "verb", "noun, neuter") |
| `.tag_type` | Abbreviated POS (e.g., "n", "v", "adj", "nt") |
| `.tag_forms` | Verb conjugation forms (past tense, etc.) |
| `.tag_usage` | Usage frequency tag (e.g., "often used") |
| `.tag_trans` | Translation tag |
| `.translation` | Individual translation entry |
| `.translation_group` | Group of related translations |
| `.translation_lines` | Lines within a translation group |
| `.translation_first` | First/most-common translation section |
| `.translation_desc` | Description of translation |
| `.example_lines` | Example sentence pairs |
| `.dictLink` | Link to a word's dedicated dictionary page |
| `.inexact` | Container for "less common" translations |
| `.singleline` | Single-line translations (less common) |
| `.group_line` | Separator line between frequency groups |
| `.more_example` | "See more examples" link |
| `.source_url` | Source URL attribution for examples |
| `.examples` / `.example` | Compound phrase examples section |

### 3. Word Type Handling

#### Nouns (e.g., "Haus")
```
Structure:
  Haus → noun, neuter (plural: Häuser)
  ├── house n (often used)         ← #1 most common
  │   ├── "Mein Haus hat..."       │ example DE
  │   └── "My house has..."        │ example EN
  ├── building n                    ← #2
  ├── home n                        ← #3
  │   ├── "Sie blieben in..."      │
  │   └── "They remained in..."    │
  ├── domicile n                    ← #4
  └── less common:
      ├── establishment n
      ├── dwelling n
      ├── household n
      └── shell n
```

#### Verbs (e.g., "laufen")
```
Structure:
  laufen → verb
  ├── run v (ran, run)              ← #1 most common
  │   ├── "Ich musste heute..."     │
  │   └── "I had to run..."         │
  ├── walk v (walked, walked)       ← #2
  ├── work v                         ← #3
  ├── go v (went, gone)              ← #4
  ├── go on v                        ← #5
  ├── be in progress v               ← #6
  └── less common:                  ← .inexact
      ├── operate v
      ├── race v
      ├── flow v
      └── ... (15+ more)
```

#### Adjectives (e.g., "schön")
```
Structure:
  schön → adjective
  ├── beautiful adj                 ← #1 most common
  │   ├── "Von meinem Fenster..."  │
  │   └── "From my window..."      │
  ├── good adj                      ← #2
  ├── nice adj                      ← #3
  ├── attractive adj                ← #4
  ├── pretty adj                    ← #5
  └── less common:
      ├── handsome adj
      ├── beauteous adj
      └── pulchritudinous adj
```

### 4. Translation Frequency Ranking
Translations are **ranked by frequency** (implied by order of appearance):
- Top translations appear first with full example sentences
- "less common:" section is collapsed/hidden by default (requires clicking to expand)
- "often used" tag appears on the most frequent translation
- The `.inexact` div contains less common translations in a flat list
- Within `.inexact`, translations use `.singleline` class (no examples)

### 5. Example Sentences
- Each top translation typically has **1-2 example sentence pairs**
- Format: German sentence → English sentence
- The searched word is **bolded** in the example (using `<strong>` or `<b>` tags)
- Source URLs are provided below examples (e.g., "en.wiktionary.org")
- Example sentences are linked to specific translations via `.example_lines` within `.translation_lines`

### 6. Additional Sections
- **Examples:** Compound phrases and idioms (e.g., "großes Haus → large mansion")
- **External sources:** Bilingual text from crawled web pages (not reviewed)
- **JavaScript letters:** Special character buttons (ä, ß, ü, ö) for German input

---

## Network Analysis

### Request Flow
1. Initial page load: `GET /german-english/search?source=auto&query={word}` → returns full HTML
2. CSS/JS assets: Static files from `assets.linguee.com`
3. Ad scripts: Multiple third-party ad networks (snigelweb, doubleclick, rubicon, etc.)
4. Statistics: `POST https://s.deepl.com/linguee/statistics` (analytics)

### Key Finding: NO Hidden API Endpoints
- **No JSON API was detected** for dictionary data
- Search results are rendered server-side as **static HTML**
- No XHR/fetch requests return structured dictionary data
- The page is a traditional server-rendered HTML page with JavaScript enhancements for UI only

### Data Delivery Mechanism
- All dictionary data is embedded in the **initial HTML response**
- JavaScript is used for:
  - Search-as-you-type (but not for the initial page load)
  - Expanding/collapsing "less common" translations
  - UI interactions (menu, language switching)
  - Advertising
- **No client-side API calls** for word data

---

## Anti-Scraping Observations
1. **No CAPTCHAs** observed on search results pages
2. **No obvious rate limiting** headers detected
3. **No bot detection** JavaScript observed (only ads and analytics)
4. **`robots.txt`**: Not explicitly checked but Linguee is generally permissive
5. The page uses standard HTTP (no authentication required)
6. Heavy advertising presence suggests the business model is ad-supported (not data-protection focused)

### Potential Challenges
- DeepL (Linguee's parent) has **API Terms of Service** that may restrict scraping
- The "less common" translations are **hidden by default** (click to expand) — may require Selenium or parsing collapsed HTML
- The DOM structure uses minified/unpredictable class names (e.g., `.lmt__textarea_separator__vertical_line`) but core data classes (`.exact`, `.lemma`, `.tag_lemma`, etc.) are consistent
