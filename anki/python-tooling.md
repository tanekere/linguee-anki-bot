# Python Tooling: Libraries & Code Patterns for Dictionary Data Extraction

## 1. Wiktionary — Python Tools

### Option A: Direct REST API (Recommended for Live Use)

**Pros**: No dependencies beyond `requests`, always up-to-date, official  
**Cons**: Need to handle HTML in definitions, gender requires separate parsing

```python
import requests
from bs4 import BeautifulSoup
import re

def fetch_wiktionary_definition(word, lang="de"):
    """
    Fetch structured definition data from Wiktionary REST API.
    Returns list of entries with part of speech, definitions, and examples.
    """
    url = f"https://en.wiktionary.org/api/rest_v1/page/definition/{word}"
    resp = requests.get(url, headers={"User-Agent": "AnkiBot/1.0"})
    
    if resp.status_code != 200:
        return None
    
    data = resp.json()
    results = []
    
    if lang in data:
        for entry in data[lang]:
            pos = entry.get("partOfSpeech", "")
            for defn in entry.get("definitions", []):
                # Clean HTML from definition
                soup = BeautifulSoup(defn.get("definition", ""), "html.parser")
                clean_def = soup.get_text()
                
                # Extract examples with translations
                examples = []
                for ex in defn.get("parsedExamples", []):
                    examples.append({
                        "source": BeautifulSoup(ex["example"], "html.parser").get_text(),
                        "translation": BeautifulSoup(ex["translation"], "html.parser").get_text()
                    })
                
                results.append({
                    "part_of_speech": pos,
                    "definition": clean_def,
                    "examples": examples
                })
    
    return results


def fetch_wiktionary_gender(word, lang="German"):
    """
    Extract gender from Wiktionary HTML page.
    Parses the headword line for n/m/f indicator.
    """
    url = f"https://en.wiktionary.org/api/rest_v1/page/html/{word}"
    resp = requests.get(url, headers={"User-Agent": "AnkiBot/1.0"})
    
    if resp.status_code != 200:
        return None
    
    soup = BeautifulSoup(resp.text, "html.parser")
    
    # Find the German language section
    german_heading = soup.find("h2", string=lang)
    if not german_heading:
        # Try with span
        german_heading = soup.find("span", class_="mw-headline", id=lang)
        if german_heading:
            german_heading = german_heading.find_parent("h2")
    
    if not german_heading:
        return None
    
    # Navigate to the first Noun section within German
    section = german_heading.find_next("h3", string=re.compile(r"Noun", re.I))
    if not section:
        return None
    
    # Get the headword line (strong tag with the word)
    headword = section.find_next("strong")
    if not headword:
        return None
    
    # Look for gender indicator after the strong tag
    text_after = headword.next_sibling
    if text_after and isinstance(text_after, str):
        match = re.search(r'\b([nmf])\b', text_after)
        if match:
            gender_map = {"n": "neuter", "m": "masculine", "f": "feminine"}
            return gender_map.get(match.group(1))
    
    return None


def fetch_wiktionary_ipa(word, lang="German"):
    """Extract IPA pronunciation from Wiktionary HTML."""
    url = f"https://en.wiktionary.org/api/rest_v1/page/html/{word}"
    resp = requests.get(url, headers={"User-Agent": "AnkiBot/1.0"})
    
    if resp.status_code != 200:
        return None
    
    soup = BeautifulSoup(resp.text, "html.parser")
    
    # Find German section
    heading = soup.find("span", class_="mw-headline", id=lang)
    if not heading:
        return None
    
    # Find Pronunciation section and IPA
    pron_section = heading.find_parent("h2").find_next("h3", string=re.compile(r"Pronunciation", re.I))
    if not pron_section:
        return None
    
    ipa_span = pron_section.find_next("span", class_="IPA")
    if ipa_span:
        return ipa_span.get_text().strip("[]/")
    
    return None
```

### Option B: wiktextract (For Bulk/Offline Processing)

```bash
pip install wiktextract
```

```python
from wiktextract import WiktionaryConfig, parse_wiktionary
from wikitextprocessor import Wtp

config = WiktionaryConfig(
    capture_languages=["German"],
    capture_translations=True,
    capture_pronunciation=True,
    capture_linkages=True,
    capture_examples=True,
    capture_etymologies=True,
    capture_inflections=True
)

ctx = Wtp()

def word_callback(data):
    """Process each extracted word."""
    word = data.get("word")
    pos = data.get("pos")
    lang = data.get("lang")
    senses = data.get("senses", [])
    
    for sense in senses:
        glosses = sense.get("glosses", [])
        examples = sense.get("examples", [])
        
        # Build Anki card data
        print(f"Word: {word}, PoS: {pos}, Gloss: {glosses}")
        print(f"Examples: {examples}")

# Parse a dump file (downloaded from dumps.wikimedia.org)
parse_wiktionary(ctx, "enwiktionary-20240601-pages-articles.xml.bz2", config, word_callback)
```

**Note**: The full dump is ~8GB and processing takes hours. Use pre-extracted data from https://kaikki.org/dictionary/ for faster access.

### Option C: wiktionaryparser (Simple, Last Updated 2018)

```bash
pip install wiktionaryparser
```

```python
from wiktionaryparser import WiktionaryParser

parser = WiktionaryParser()
parser.set_default_language('German')

# Fetch a word
word_data = parser.fetch('Haus')

# Structure:
# [{
#   "etymology": "...",
#   "definitions": [
#     {
#       "partOfSpeech": "Noun",
#       "text": ["house"],
#       "examples": ["In dem Haus haben wir mal gewohnt."],
#       "relatedWords": [...]
#     }
#   ],
#   "pronunciations": {"text": ["..."]}
# }]
```

**Limitations**: May not work with current Wiktionary HTML; last updated 2018.

---

## 2. Glosbe — Python Tools

### No Official Library — Custom Scraping Required

**Challenge**: Cloudflare protection + dynamic JavaScript content

### Approach 1: cloudscraper (Attempt Cloudflare Bypass)

```bash
pip install cloudscraper beautifulsoup4
```

```python
import cloudscraper
from bs4 import BeautifulSoup
import re

def fetch_glosbe(word, source_lang="de", target_lang="en"):
    """
    Attempt to fetch Glosbe page using cloudscraper.
    May not work reliably due to Cloudflare updates.
    """
    url = f"https://glosbe.com/{source_lang}/{target_lang}/{word}"
    
    scraper = cloudscraper.create_scraper(
        browser={
            'browser': 'chrome',
            'platform': 'windows',
            'mobile': False
        }
    )
    
    response = scraper.get(url, timeout=30)
    
    if response.status_code != 200:
        raise Exception(f"HTTP {response.status_code}")
    
    return parse_glosbe_html(response.text)


def parse_glosbe_html(html):
    """Parse Glosbe HTML to extract translations and examples."""
    soup = BeautifulSoup(html, "html.parser")
    
    result = {
        "word": "",
        "part_of_speech": "",
        "gender": None,
        "top_translations": [],
        "less_frequent_translations": [],
        "examples": []
    }
    
    # Extract part of speech and gender
    # These appear in specific divs on the page
    pos_elem = soup.find(text=re.compile(r'\b(noun|verb|adjective|adverb)\b', re.I))
    if pos_elem:
        result["part_of_speech"] = pos_elem.strip()
    
    gender_elem = soup.find(text=re.compile(r'\b(neuter|masculine|feminine)\b', re.I))
    if gender_elem:
        result["gender"] = gender_elem.strip()
    
    # Extract top translations (appear as links in translation section)
    # NOTE: Exact selectors depend on current Glosbe HTML structure
    # This is a conceptual template — actual selectors need verification
    
    # ... (implementation depends on current DOM structure)
    
    return result
```

### Approach 2: Playwright (Browser Automation for JS Rendering)

```bash
pip install playwright beautifulsoup4
playwright install chromium
```

```python
from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import re
import time

def fetch_glosbe_playwright(word, source_lang="de", target_lang="en"):
    """
    Fetch Glosbe using Playwright for full JS rendering.
    More reliable but slower than cloudscraper.
    """
    url = f"https://glosbe.com/{source_lang}/{target_lang}/{word}"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = context.new_page()
        
        try:
            page.goto(url, wait_until="networkidle", timeout=30000)
            
            # Wait for content to load
            page.wait_for_selector("main", timeout=10000)
            
            # Get full HTML after JS execution
            html = page.content()
            
            return parse_glosbe_html(html)
            
        finally:
            browser.close()


def extract_glosbe_translations(page):
    """Extract translations using Playwright selectors."""
    translations = []
    
    # Find the translation section
    # These selectors are conceptual — verify against live page
    translation_items = page.query_selector_all(".translation-item")
    
    for item in translation_items:
        translation = {}
        
        # Translation word
        word_elem = item.query_selector(".translation-word")
        if word_elem:
            translation["word"] = word_elem.inner_text()
        
        # Example sentences
        examples = item.query_selector_all(".example-sentence")
        translation["examples"] = []
        for ex in examples:
            source = ex.query_selector(".source")
            target = ex.query_selector(".target")
            if source and target:
                translation["examples"].append({
                    "source": source.inner_text(),
                    "target": target.inner_text()
                })
        
        translations.append(translation)
    
    return translations
```

### Approach 3: selenium-stealth (Alternative Browser Automation)

```bash
pip install selenium selenium-stealth beautifulsoup4
```

```python
from selenium import webdriver
from selenium_stealth import stealth
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup

def fetch_glosbe_selenium(word, source_lang="de", target_lang="en"):
    """
    Fetch Glosbe using Selenium with stealth mode for Cloudflare bypass.
    """
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    driver = webdriver.Chrome(options=options)
    
    # Apply stealth settings
    stealth(driver,
        languages=["en-US", "en"],
        vendor="Google Inc.",
        platform="Win32",
        webgl_vendor="Intel Inc.",
        renderer="Intel Iris OpenGL Engine",
        fix_hairline=True,
    )
    
    try:
        url = f"https://glosbe.com/{source_lang}/{target_lang}/{word}"
        driver.get(url)
        
        # Wait for translations to load
        time.sleep(3)
        
        html = driver.page_source
        return parse_glosbe_html(html)
        
    finally:
        driver.quit()
```

### Reliability Notes for Glosbe Scraping
- Cloudflare updates frequently — all bypass methods may break
- Rate limiting: limit to 1 request/second, use exponential backoff
- Consider using a pool of proxies for bulk operations
- Cache results aggressively to minimize requests
- Have a fallback plan (e.g., switch to Wiktionary if blocked)

---

## 3. Linguee — Python Tools

### Existing Project Context
The project already has a Linguee scraper. The key libraries involved:

```bash
pip install requests beautifulsoup4 cloudscraper
```

### Recommended Pattern (from existing project knowledge)

```python
import cloudscraper
from bs4 import BeautifulSoup

def fetch_linguee(word, source_lang="german", target_lang="english"):
    """
    Fetch Linguee search results for a word.
    Uses cloudscraper for Cloudflare bypass.
    """
    url = f"https://www.linguee.com/{source_lang}-{target_lang}/search"
    params = {"source": "auto", "query": word}
    
    scraper = cloudscraper.create_scraper()
    response = scraper.get(url, params=params)
    
    soup = BeautifulSoup(response.text, "html.parser")
    
    # Extract translations and examples
    results = []
    # ... (existing parsing logic)
    
    return results
```

---

## 4. Hybrid Approach — Combining Sources

### Recommended Architecture

```python
class DictionaryAggregator:
    """
    Combines multiple dictionary sources for comprehensive Anki card data.
    Primary: Wiktionary API (structural data)
    Secondary: Linguee (frequency-ranked translations)
    Fallback: Glosbe (additional coverage)
    """
    
    def __init__(self):
        self.cache = {}  # Cache results to minimize API calls
    
    def get_card_data(self, word):
        """Get complete Anki card data for a word."""
        if word in self.cache:
            return self.cache[word]
        
        result = {
            "word": word,
            "part_of_speech": None,
            "gender": None,
            "ipa": None,
            "translations": [],  # Frequency-ranked
            "examples": []        # Per translation
        }
        
        # Step 1: Get structural data from Wiktionary (reliable API)
        try:
            pos = self._get_wiktionary_pos(word)
            gender = self._get_wiktionary_gender(word)
            ipa = self._get_wiktionary_ipa(word)
            
            result["part_of_speech"] = pos
            result["gender"] = gender
            result["ipa"] = ipa
        except Exception as e:
            print(f"Wiktionary lookup failed for {word}: {e}")
        
        # Step 2: Get translations from Linguee (frequency-ranked)
        try:
            translations = self._get_linguee_translations(word)
            result["translations"] = translations
        except Exception as e:
            print(f"Linguee lookup failed for {word}: {e}")
        
        # Step 3: Fallback to Glosbe if Linguee failed
        if not result["translations"]:
            try:
                translations = self._get_glosbe_translations(word)
                result["translations"] = translations
            except Exception as e:
                print(f"Glosbe lookup failed for {word}: {e}")
        
        self.cache[word] = result
        return result
    
    def _get_wiktionary_pos(self, word):
        """Get part of speech from Wiktionary API."""
        url = f"https://en.wiktionary.org/api/rest_v1/page/definition/{word}"
        resp = requests.get(url)
        if resp.status_code == 200 and "de" in resp.json():
            return resp.json()["de"][0].get("partOfSpeech")
        return None
    
    def _get_wiktionary_gender(self, word):
        """Extract gender from Wiktionary HTML."""
        # ... (implementation from Option A above)
        pass
    
    def _get_wiktionary_ipa(self, word):
        """Extract IPA from Wiktionary."""
        # ... (implementation from Option A above)
        pass
    
    def _get_linguee_translations(self, word):
        """Get frequency-ranked translations from Linguee."""
        # ... (existing Linguee scraper integration)
        pass
    
    def _get_glosbe_translations(self, word):
        """Get frequency-ranked translations from Glosbe (fallback)."""
        # ... (Glosbe scraper from above)
        pass
```

---

## 5. Package Requirements Summary

```txt
# Core dependencies
requests>=2.28.0
beautifulsoup4>=4.12.0

# For Wiktionary bulk processing
wiktextract>=1.99.0
wikitextprocessor>=1.0.0

# For Linguee/Glosbe scraping (Cloudflare bypass)
cloudscraper>=1.2.0

# Optional: Browser automation (for JS-heavy sites)
playwright>=1.40.0
# OR
selenium>=4.15.0
selenium-stealth>=1.0.6

# Common utilities
lxml>=4.9.0  # Faster HTML parsing
python-dotenv>=1.0.0  # API key management
```

---

## 6. Caching Strategy

```python
import json
import os
from datetime import datetime, timedelta

class TranslationCache:
    """
    File-based cache to avoid repeated API calls.
    Caches results for 30 days.
    """
    
    def __init__(self, cache_dir="./cache"):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
    
    def get(self, word):
        """Get cached result for a word."""
        cache_file = os.path.join(self.cache_dir, f"{word}.json")
        if os.path.exists(cache_file):
            with open(cache_file, "r") as f:
                data = json.load(f)
                cached_time = datetime.fromisoformat(data["cached_at"])
                if datetime.now() - cached_time < timedelta(days=30):
                    return data["result"]
        return None
    
    def set(self, word, result):
        """Cache a result."""
        cache_file = os.path.join(self.cache_dir, f"{word}.json")
        with open(cache_file, "w") as f:
            json.dump({
                "cached_at": datetime.now().isoformat(),
                "result": result
            }, f)
```
