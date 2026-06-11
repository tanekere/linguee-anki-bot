# Wiktionary Research: Structure Analysis & API Documentation

## Overview

Wiktionary (en.wiktionary.org) is the English-language edition of the Wikimedia Foundation's free dictionary. It is a **monolingual dictionary** that provides definitions in English for words in many languages, including German. It is community-edited and follows strict formatting conventions.

## Page Structure Analysis

### Sample Word: "Haus" (German)
- **URL**: `https://en.wiktionary.org/wiki/Haus`
- **Page organization**: Multi-language page. Each language gets its own `<h2>` section.
- **German section** (section 4):
  - `h2#German` → "German"
  - `h3` → "Alternative forms", "Etymology", "Pronunciation", "Noun", "Proper noun", "Further reading"
  - Under `h3#Noun`: headword line, definitions, declension, hyponyms, derived terms, related terms

### How Part of Speech is Indicated
- **Method**: Section heading (level 3 or 4) — e.g., `Noun`, `Verb`, `Adjective`, `Adverb`, `Proper noun`
- **Parsing**: Extract from heading text or from the REST API response `partOfSpeech` field
- **Examples observed**:
  - "Haus" → `Noun`, `Proper noun`
  - "laufen" → `Verb`
  - "schön" → `Adjective`, `Adverb`

### How Gender is Indicated
- **Method**: Abbreviation after the headword — `n` (neuter), `m` (masculine), `f` (feminine)
- **Format**: `**Haus** n (strong, genitive Hauses, plural Häuser, ...)`
- **Location**: In the headword line at the start of each PoS section
- **Availability**: Only for nouns; adjectives and verbs don't have gender
- **Parsing**: Regex extraction from the headword line (e.g., `\*\*(\w+)\*\*\s+([nmf])\s`)
- **REST API**: NOT directly included in `/page/definition/` endpoint; need HTML parsing or raw wikitext

### How Translations/Definitions are Organized
- **NOT a translation dictionary** — it's a monolingual dictionary with English definitions
- Each sense gets a numbered definition, e.g.:
  1. `house` — *In dem Haus haben wir mal gewohnt.*
  2. `home (in various phrases)`
  3. `theatre`
- **Ranking**: Definitions are NOT ranked by usage frequency. They follow Wiktionary editorial conventions (most common first typically, but not guaranteed)
- **No frequency data**: Wiktionary does not provide usage frequency information
- Definitions may include usage notes, qualifiers (e.g., "in various phrases"), and synonyms

### How Example Sentences are Organized
- **YES, available per definition sense**
- Each definition can have one or more example sentences
- German example + English translation, e.g.:
  - `In dem Haus haben wir mal gewohnt.` → `We used to live in that house.`
- Source attribution is sometimes provided (e.g., from literature)
- **REST API**: Available via `parsedExamples` array with `example` and `translation` fields

## REST API Documentation

### Endpoint: `/api/rest_v1/page/definition/{title}`

**URL**: `https://en.wiktionary.org/api/rest_v1/page/definition/{word}`

**Method**: GET

**Response format**: JSON

**Example response for "Haus"**:
```json
{
  "de": [
    {
      "partOfSpeech": "Noun",
      "language": "German",
      "definitions": [
        {
          "definition": "house",
          "parsedExamples": [
            {
              "example": "In dem Haus haben wir mal gewohnt.",
              "translation": "We used to live in that house."
            }
          ],
          "examples": ["In dem Haus haben wir mal gewohnt."]
        },
        {
          "definition": "home (in various phrases)",
          "parsedExamples": [
            {
              "example": "Dann gingen wir nach Hause",
              "translation": "Then we went home."
            }
          ]
        },
        {
          "definition": "theatre"
        }
      ]
    },
    {
      "partOfSpeech": "Proper noun",
      "language": "German",
      "definitions": [
        {
          "definition": "a municipality of Styria, Austria"
        }
      ]
    }
  ]
}
```

**Key fields**:
- `{lang_code}` — Top-level key for each language (e.g., `de` for German, `en` for English)
- `partOfSpeech` — String (e.g., "Noun", "Verb", "Adjective", "Adverb", "Proper noun")
- `language` — Full language name
- `definitions[].definition` — HTML definition text (may contain wiki markup links)
- `definitions[].parsedExamples[]` — Array of `{example, translation}` objects
- `definitions[].examples[]` — Array of source-language example strings
- Note: "other" key may contain entries from less common language variants

### Endpoint: `/api/rest_v1/page/html/{title}`

**URL**: `https://en.wiktionary.org/api/rest_v1/page/html/{word}`

**Method**: GET

**Response**: Full HTML of the Wiktionary page (parsed wikitext to HTML)

**Use case**: Extract gender, pronunciation, inflection tables, derived terms, etc.

### Endpoint: `/api/rest_v1/page/raw/{title}`

**URL**: `https://en.wiktionary.org/api/rest_v1/page/raw/{word}`

**Method**: GET

**Response**: Raw wikitext source of the page

**Use case**: Advanced parsing when HTML/REST API is insufficient

### Rate Limiting
- Wikimedia REST API is free and open
- No documented rate limits, but Wikimedia recommends reasonable usage
- Standard etiquette: ~200 requests/second is generally acceptable
- Heavy usage may get rate-limited; consider caching results

### Data Freshness
- Data is live and community-maintained
- Updates continuously as editors contribute
- Cache locally for performance and to avoid repeated API calls

## Python Libraries for Wiktionary

### 1. wiktextract (Recommended for bulk processing)
- **Package**: `pip install wiktextract`
- **Repo**: https://github.com/tatuylonen/wiktextract
- **Version**: 1.99.7 (latest on PyPI)
- **Description**: Wiktionary dump file parser and multilingual data extractor. Processes the full `enwiktionary-*-pages-articles.xml.bz2` dump.
- **Features**:
  - Extracts all languages from English Wiktionary
  - Expands templates and Lua macros (high quality extraction)
  - Outputs JSON with: word, pos, senses, translations, pronunciations, forms, examples, etymologies, linkages
  - Pre-extracted data available at https://kaikki.org/dictionary/
- **Pros**: Most comprehensive, handles all wikitext edge cases, bulk processing
- **Cons**: Requires downloading multi-GB dump file, takes hours to process, overkill for single-word lookups
- **Use case**: Best for offline processing of the entire dictionary

### 2. wiktionaryparser (Lightweight, for single-word lookups)
- **Package**: `pip install wiktionaryparser`
- **Repo**: https://github.com/Suyash458/WiktionaryParser
- **Version**: 0.0.97
- **Description**: Parses word data from Wiktionary into JSON via web scraping
- **Features**:
  - `fetch(word, language)` method — fetches and parses a single word
  - Returns: pronunciations, definitions (with partOfSpeech, examples, relatedWords), etymology
  - Supports language selection
  - Uses requests + BeautifulSoup4
- **Pros**: Simple API, good for single-word lookups
- **Cons**: Last updated 2018, may have issues with current Wiktionary HTML structure, no frequency data
- **Use case**: Simple single-word lookups (if still compatible)

### 3. Direct REST API calls (Recommended for live lookups)
- **Library**: `requests` (standard HTTP library)
- **Pattern**: Call `/api/rest_v1/page/definition/{word}` + parse JSON
- **Pros**: No dependencies beyond `requests`, always up-to-date, official API
- **Cons**: Need to handle HTML in definitions, need separate call for gender
- **Code pattern**:
```python
import requests

def fetch_wiktionary(word, lang="de"):
    url = f"https://en.wiktionary.org/api/rest_v1/page/definition/{word}"
    resp = requests.get(url)
    data = resp.json()
    
    if lang in data:
        for entry in data[lang]:
            pos = entry["partOfSpeech"]
            for defn in entry["definitions"]:
                translation = defn["definition"]
                examples = defn.get("parsedExamples", [])
                # Process...
```

### 4. wikitextprocessor (Low-level)
- **Package**: `pip install wikitextprocessor`
- **Description**: The underlying library used by wiktextract for wikitext parsing
- **Use case**: If you need to parse raw wikitext dumps directly

## Data Completeness Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| Part of speech | ★★★★★ | Always present, well-structured |
| Gender | ★★★★☆ | Present for nouns in headword line, needs HTML/wikitext parsing |
| Translations/Definitions | ★★★★☆ | English definitions provided, multiple senses covered |
| Translation frequency ranking | ★☆☆☆☆ | NO frequency data at all |
| Example sentences | ★★★★☆ | Available for many (not all) definitions, with English translations |
| Pronunciation (IPA) | ★★★★★ | IPA, audio files, rhymes available |
| Inflection tables | ★★★★★ | Full declension/conjugation tables |
| Derived terms | ★★★★★ | Comprehensive lists |
| Consistency | ★★★☆☆ | Community-edited; some entries are sparse, others very detailed |

## Pros and Cons for Anki Card Generation

### Pros
- Free and open, no API keys required
- Structured REST API returns JSON
- Example sentences include English translations
- Comprehensive coverage of German words
- IPA pronunciation available
- Additional data: inflection tables, derived terms, etymology

### Cons
- **No frequency ranking of translations** — definitions are not ordered by commonness
- Gender data requires HTML/raw parsing (not in definition API)
- Definitions are monolingual (one translation per sense), not a list of synonyms
- Inconsistent formatting across entries (community-edited)
- Some words may have sparse entries
- Cannot distinguish between common and rare translations
