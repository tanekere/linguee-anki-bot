# Glosbe Research: Structure Analysis & API Documentation

## Overview

Glosbe (glosbe.com) is a **bilingual dictionary** platform that provides translations between language pairs. For German-English, it offers translations ranked by frequency with example sentences per translation. It is a community-contributed dictionary that aggregates data from multiple sources.

## Page Structure Analysis

### Sample Word: "Haus" (German → English)
- **URL**: `https://glosbe.com/de/en/Haus`
- **Page organization**: Single page per language pair, with clear sections

### Key Page Sections (from actual page data):

#### 1. Top Translations (Frequency-Ranked)
```
Translation of "Haus" into English

house, home, building are the top translations of "Haus" into English.
```
- **Top 3 translations** are listed prominently
- These are the most common/frequent translations

#### 2. Part of Speech & Gender
```
Haus
noun
neuter
grammar
Hütte (umgangssprachlich) [...]
```
- **Part of speech**: Explicitly labeled (`noun`, `verb`, `adjective`, `adverb`)
- **Gender**: Explicitly labeled (`neuter`, `masculine`, `feminine`) — found after the part of speech
- Grammar notes may be included

#### 3. Top Translations with Examples
Each top translation has:
- **Translation word** (e.g., `house`, `home`, `building`)
- **Part of speech** in target language (e.g., `noun`)
- **Definition/context** (e.g., "dynasty, familiar descendance")
- **Example sentence** with translation:
  ```
  Als ich ankam, verschwanden sie schnell aus dem Haus.
  When I arrived, they quickly cleared out of the house.
  ```
- **Source attribution** (e.g., `en.wiktionary.org`, `omegawiki`, `plwiktionary.org`)

#### 4. Less Frequent Translations
```
Less frequent translations:
household, family, domestic, domicile, dwelling, lineage,
counter for houses, family name, husb and, one house,
premises, style, business, business house, chap, company,
drum, firm, floor, occupants, occupants of the house,
theatre, shop, shell, dynasty, good family, house music,
houses, one's family, one's folks, parentage, pedigree, ...
```
- Long list of less common translations (40+ for "Haus")
- This IS ranked — less common translations come after top translations
- Provides comprehensive alternative meanings

#### 5. Algorithmic Translations
- `Show algorithmically generated translations` — toggle for machine-generated translations
- `Glosbe Translate` and `Google Translate` options

#### 6. Alternative Spellings
- Separate section for `haus` (lowercase) with its own translations and examples

#### 7. Images
- Visual examples with the word (house, building images)

#### 8. Related Phrases
- `Phrases similar to "Haus" with translations into English`
- Multiple related expressions with translations, e.g.:
  - `Einsturz eines Hauses` → `collapse of a house`
  - `intelligentes Haus` → `smart home`
  - `außer Haus` → `away from the office`

#### 9. Translations in Sentences
- `Translations of "Haus" into English in sentences, translation memory`
- Additional contextual examples

#### 10. Declension
- `Declension` / `Stem` section mentioned

### Sample Word: "laufen" (German → English)
```
Translation of "laufen" into English

run, walk, roll are the top translations of "laufen" into English.

laufen
verb
grammar
laufen (umgangssprachlich) [...]
```
- Part of speech: `verb` (no gender for verbs)
- Top translations: `run`, `walk`, `roll`
- Each with examples, definitions, and sources
- Less frequent translations: 120+ alternatives including `work`, `operate`, `go`, `running`, `leak`, `flow`, `step`, `travel`, `rush`, `wander`, etc.
- Alternative form `Laufen` (noun, neuter) with its own translations

### Sample Word: "schön" (German → English)
```
Translation of "schön" into English

beautiful, nice, pretty are the top translations of "schön" into English.

schön
adjective
adverb
grammar
warum nicht?! (umgangssprachlich) [...]
```
- Dual part of speech: `adjective, adverb`
- No gender (adjective/adverb)
- Top translations: `beautiful`, `nice`, `pretty`
- Less frequent translations: 80+ alternatives

## How Each Feature is Represented

### Part of Speech
- **Indicated**: Directly after the word, e.g., `noun`, `verb`, `adjective`, `adverb`
- **Dual POS**: Some words like "schön" have multiple (e.g., `adjective, adverb`)
- **Parsing**: Easy — appears as plain text label after the headword

### Gender
- **Indicated**: Directly after part of speech for nouns, e.g., `neuter`, `masculine`, `feminine`
- **Location**: e.g., `Haus / noun / neuter`
- **Availability**: Only for nouns; not present for verbs, adjectives, adverbs
- **Parsing**: Easy — appears as plain text label

### Translation Frequency Ranking
- **YES — this is the key differentiator!**
- Clear two-tier structure:
  1. **Top translations** (3-5 most common) — displayed prominently at the top
  2. **Less frequent translations** (dozens more) — listed in a secondary section
- This provides the frequency-ranked translations that Anki cards need
- Translations WITHIN each tier are also somewhat ordered (but not strictly ranked)

### Example Sentences
- **Available per translation**
- Each top translation typically has 1-3 example sentences
- Format: German sentence → English translation
- Source attribution is provided (useful for verifying quality)
- Less frequent translations generally do NOT have examples

### Additional Features Not in Other Sources
- **Images**: Visual context for many words
- **Phrases**: Related expressions with translations
- **Alternative spellings**: With separate translation entries
- **Translation memory**: Additional contextual examples
- **Grammar notes**: Usage notes and grammatical context

## API Investigation

### Glosbe Translate API (DEPRECATED)
- **Endpoint**: `https://glosbe.com/gapi/translate`
- **Status**: **404 Not Found** — This legacy API is no longer available
- Old API format (no longer works): `?from=de&dest=en&format=json&phrase=Haus`

### Current API Status
- **No public API available** as of June 2026
- The site uses client-side rendering with JavaScript
- Cloudflare protection detected (JS challenge page observed)
- Data is loaded dynamically, making scraping more difficult

### Web Scraping Feasibility
- **Possible but challenging**:
  - Cloudflare JS challenge must be bypassed
  - Page content is loaded dynamically (requires JS rendering)
  - Rate limiting likely aggressive
  - No documented terms of service for automated access
- **Tools needed**:
  - Headless browser (Playwright or Selenium) for JS rendering
  - Cloudflare bypass techniques (e.g., `cloudscraper`, `selenium-stealth`)
  - Robust error handling and rate limiting

## Python Tools for Glosbe

### No Official Library
- There is **no PyPI package** specifically for Glosbe
- Search for "glosbe" on PyPI returned no relevant results (only unrelated packages)

### Custom Scraping Approach (Required)
```python
# Conceptual scraping approach (requires overcoming Cloudflare)
import cloudscraper  # or selenium/playwright

def fetch_glosbe(word, source_lang="de", target_lang="en"):
    url = f"https://glosbe.com/{source_lang}/{target_lang}/{word}"
    scraper = cloudscraper.create_scraper()
    response = scraper.get(url)
    # Parse HTML to extract:
    # - Part of speech
    # - Gender
    # - Top translations (frequency-ranked)
    # - Less frequent translations
    # - Example sentences per translation
```

### Recommended Scraping Stack
1. **cloudscraper** — Python library to bypass Cloudflare anti-bot protection
   - `pip install cloudscraper`
   - May not always work; Cloudflare updates frequently
2. **Playwright** or **Selenium** — For JavaScript rendering
   - Needed if content is loaded dynamically via JS
3. **BeautifulSoup4** — For HTML parsing after page retrieval

### Challenges
- Cloudflare protection is aggressive and updates frequently
- Glosbe may block IPs that make too many requests
- HTML structure may change without notice
- No official support for automated access
- Legal/ToS considerations unclear

## Data Completeness Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| Part of speech | ★★★★★ | Explicitly labeled, clear |
| Gender | ★★★★★ | Explicitly labeled for nouns (neuter/masculine/feminine) |
| Translation frequency ranking | ★★★★★ | THE key feature — top + less frequent tiers |
| Example sentences per translation | ★★★★☆ | Good for top translations, sparse for less frequent ones |
| Number of translations | ★★★★★ | Very comprehensive (40-120+ per word) |
| Pronunciation | ★★☆☆☆ | Not systematically provided |
| Inflection tables | ★★☆☆☆ | Declension mentioned but not comprehensive |
| Related phrases | ★★★★☆ | Good phrase/expression coverage |
| API availability | ★☆☆☆☆ | No public API; scraping required |
| Access reliability | ★★☆☆☆ | Cloudflare protection, rate limiting concerns |

## Pros and Cons for Anki Card Generation

### Pros
- **Frequency-ranked translations** — the single most important feature for Anki cards
- Explicit part of speech and gender labels — easy to parse
- Comprehensive translation coverage (top + less frequent)
- Example sentences per translation with source attribution
- Related phrases for context
- Visual aids (images) available

### Cons
- **No public API** — must web scrape
- **Cloudflare protection** — significant technical barrier
- **Rate limiting likely** — may not be scalable for bulk lookups
- **Dynamic JavaScript content** — requires headless browser
- **Legal uncertainty** — unclear ToS for automated access
- **HTML structure may change** — fragile scraping
- **Inconsistent example coverage** — only top translations have examples
- **No IPA pronunciation** — not systematically provided
