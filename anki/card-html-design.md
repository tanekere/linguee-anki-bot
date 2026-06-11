# Anki Card HTML/CSS Design

## Overview

This document defines the HTML/CSS templates for German-English vocabulary cards. The card design follows the Linguee-inspired layout:

- **Front**: Word + part of speech + gender
- **Back**: Common translations (ordered by frequency), "Least Common" section for rare translations, example sentences

---

## Note Type: "German Vocabulary"

### Fields

We need a custom Anki note type with the following fields:

| Field Name      | Description                                                    | Example                                                      |
|-----------------|----------------------------------------------------------------|--------------------------------------------------------------|
| `Word`          | The German word (lemma form)                                   | `Haus`                                                       |
| `POS`           | Part of speech (noun, verb, adj, adv, etc.)                    | `noun`                                                       |
| `Gender`        | Grammatical gender (masculine, feminine, neuter) — nouns only  | `neuter`                                                     |
| `Translations`  | HTML block: common translations with example sentences         | See below                                                    |
| `LeastCommon`   | HTML block: less common translations (collapsible section)     | See below                                                    |
| `Source`        | Source dictionary (Linguee, Wiktionary, Glosbe)                | `Linguee`                                                    |
| `Notes`         | Optional extra notes (verb forms, plural, etc.)                | `plural: Häuser`                                             |

**Rationale**: Using a single `Translations` field (instead of per-translation fields) gives us flexibility to format the HTML structure — inline CSS, bullet points, nested divs, etc.

---

## Front Template (Question Side)

### Requirement
Show: **Word** + part of speech + gender

### HTML Template

```html
<div class="card-front">
  <div class="word">{{Word}}</div>
  <div class="meta">
    <span class="pos">{{POS}}</span>
    {{#Gender}}<span class="gender gender-{{Gender}}">{{Gender}}</span>{{/Gender}}
  </div>
  {{#Notes}}
  <div class="notes">{{Notes}}</div>
  {{/Notes}}
</div>
```

**Notes**:
- `{{Word}}` — displayed large and prominent
- `{{POS}}` — smaller, secondary text (e.g., "noun", "verb")
- `{{#Gender}}...{{/Gender}}` — conditional block; only shows if Gender field has content
- `{{Gender}}` — shown as a colored label (blue for masculine, red for feminine, green for neuter)
- `{{#Notes}}...{{/Notes}}` — optional field for extra info (plural forms, irregular forms)

### Example Rendered Output

```
┌─────────────────────────────────┐
│                                 │
│            Haus                 │
│        noun · neuter            │
│      plural: Häuser            │
│                                 │
└─────────────────────────────────┘
```

---

## Back Template (Answer Side)

### Requirement
Show:
1. Front content repeated (for context)
2. Common translations — most frequent first, with example sentences
3. "Least Common" heading — remaining less common translations

### HTML Template

```html
{{FrontSide}}

<hr id="answer">

<div class="card-back">
  <!-- Common Translations (pre-formatted HTML from Translations field) -->
  <div class="translations">
    {{{Translations}}}
  </div>

  <!-- Least Common Section (conditionally shown) -->
  {{#LeastCommon}}
  <div class="least-common-section">
    <div class="least-common-header">Least Common</div>
    <div class="least-common-list">
      {{{LeastCommon}}}
    </div>
  </div>
  {{/LeastCommon}}

  <!-- Source attribution -->
  {{#Source}}
  <div class="source">Source: {{Source}}</div>
  {{/Source}}
</div>
```

**Notes**:
- `{{{Translations}}}` — **triple curly braces** used to prevent HTML escaping (Anki normally escapes `{{...}}`, use `{{{...}}}` for raw HTML content)
- `{{#LeastCommon}}...{{/LeastCommon}}` — conditional: only renders if LeastCommon field is non-empty

### Example Rendered Output

```
┌─────────────────────────────────┐
│ Haus                            │
│ noun · neuter                   │
│ plural: Häuser                 │
│ ─────────────────────────────── │
│                                 │
│ 🏠 house (n) — most common     │
│    "Mein Haus hat drei          │
│     Schlafzimmer."              │
│    My house has three bedrooms. │
│                                 │
│ 🏢 building (n)                │
│    "Das Haus wurde 1920         │
│     erbaut."                    │
│    The building was built in    │
│     1920.                       │
│                                 │
│ 🏡 home (n)                    │
│    "Sie blieben in ihrem Haus." │
│    They remained in their home. │
│                                 │
│ ═══════════════════════════════ │
│ Least Common                    │
│ ═══════════════════════════════ │
│                                 │
│ domicile (n) — rare            │
│    "Ich habe mein Haus mit      │
│     meinen eigenen Händen       │
│     gebaut."                    │
│    I built my domicile with     │
│    my own hands.                │
│                                 │
│ establishment (n) — rare       │
│ dwelling (n) — rare            │
│                                 │
│ Source: Linguee                 │
└─────────────────────────────────┘
```

---

## Data Format for `Translations` Field

The extension will populate this field with pre-formatted HTML. Example structure:

```html
<div class="trans-entry">
  <div class="trans-word">
    <span class="trans-text">house</span>
    <span class="trans-pos">n</span>
    <span class="trans-freq">common</span>
  </div>
  <div class="trans-examples">
    <div class="example">
      <div class="example-de">Mein Haus hat drei Schlafzimmer und eine große Küche.</div>
      <div class="example-en">My house has three bedrooms and a large kitchen.</div>
    </div>
    <div class="example">
      <div class="example-de">Hinter dem Haus ist ein Hof.</div>
      <div class="example-en">There is a yard behind the house.</div>
    </div>
  </div>
</div>

<div class="trans-entry">
  <div class="trans-word">
    <span class="trans-text">building</span>
    <span class="trans-pos">n</span>
    <span class="trans-freq">common</span>
  </div>
</div>

<div class="trans-entry">
  <div class="trans-word">
    <span class="trans-text">home</span>
    <span class="trans-pos">n</span>
    <span class="trans-freq">common</span>
  </div>
  <div class="trans-examples">
    <div class="example">
      <div class="example-de">Sie blieben in ihrem Haus, bis die Gefahr vorüber war.</div>
      <div class="example-en">They remained in their home until the danger was over.</div>
    </div>
  </div>
</div>
```

---

## Data Format for `LeastCommon` Field

```html
<span class="lc-item"><span class="lc-text">domicile</span> <span class="lc-pos">n</span></span> ·
<span class="lc-item"><span class="lc-text">establishment</span> <span class="lc-pos">n</span></span> ·
<span class="lc-item"><span class="lc-text">dwelling</span> <span class="lc-pos">n</span></span>
```

---

## CSS Styling

### Complete Stylesheet

```css
/* =============================================
   German Vocabulary Card — Complete Stylesheet
   ============================================= */

/* --- Base Card Styling --- */
.card {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 18px;
  text-align: center;
  color: #1a1a1a;
  background-color: #ffffff;
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

/* --- Front Card --- */
.card-front {
  padding: 40px 20px;
}

.word {
  font-size: 42px;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 12px;
  letter-spacing: -0.5px;
}

.meta {
  font-size: 18px;
  color: #7f8c8d;
  margin-bottom: 8px;
}

.pos {
  font-style: italic;
  margin-right: 4px;
}

.gender {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  margin-left: 6px;
  color: #fff;
}

.gender-masculine { background-color: #3498db; }  /* Blue for der */
.gender-feminine  { background-color: #e74c3c; }  /* Red for die */
.gender-neuter    { background-color: #2ecc71; }  /* Green for das */
.gender-plural    { background-color: #9b59b6; }  /* Purple for die (plural) */

.notes {
  font-size: 14px;
  color: #95a5a6;
  margin-top: 8px;
}

/* --- Back Card — hr divider --- */
hr#answer {
  border: none;
  border-top: 2px solid #ecf0f1;
  margin: 16px 0;
}

/* --- Translation Entries --- */
.translations {
  text-align: left;
}

.trans-entry {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.trans-entry:last-child {
  border-bottom: none;
}

.trans-word {
  font-size: 22px;
  margin-bottom: 4px;
}

.trans-text {
  font-weight: 600;
  color: #2c3e50;
}

.trans-pos {
  font-size: 14px;
  color: #7f8c8d;
  font-style: italic;
  margin-left: 6px;
}

.trans-freq {
  font-size: 12px;
  color: #27ae60;
  margin-left: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* --- Example Sentences --- */
.trans-examples {
  margin-top: 6px;
  margin-left: 20px;
}

.example {
  margin-bottom: 6px;
  padding: 6px 10px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #3498db;
}

.example-de {
  font-size: 15px;
  color: #34495e;
  font-style: italic;
}

.example-en {
  font-size: 14px;
  color: #7f8c8d;
  margin-top: 2px;
}

/* --- Least Common Section --- */
.least-common-section {
  margin-top: 20px;
  padding-top: 12px;
  border-top: 2px dashed #dcdde1;
}

.least-common-header {
  font-size: 16px;
  font-weight: 600;
  color: #95a5a6;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.least-common-list {
  font-size: 16px;
  color: #7f8c8d;
  line-height: 1.8;
}

.lc-item {
  white-space: nowrap;
}

.lc-text {
  color: #555;
}

.lc-text:hover {
  color: #2c3e50;
}

.lc-pos {
  font-size: 12px;
  font-style: italic;
  color: #bdc3c7;
}

/* --- Source --- */
.source {
  margin-top: 16px;
  font-size: 12px;
  color: #bdc3c7;
  text-align: right;
}

/* =============================================
   Night Mode (Dark Theme) Support
   ============================================= */

.nightMode .card {
  background-color: #1e1e2e;
  color: #cdd6f4;
}

.nightMode .word {
  color: #cdd6f4;
}

.nightMode .meta {
  color: #9399b2;
}

.nightMode .trans-text {
  color: #cdd6f4;
}

.nightMode .trans-pos {
  color: #9399b2;
}

.nightMode .example {
  background-color: #313244;
  border-left-color: #89b4fa;
}

.nightMode .example-de {
  color: #cdd6f4;
}

.nightMode .example-en {
  color: #9399b2;
}

.nightMode hr#answer {
  border-top-color: #45475a;
}

.nightMode .trans-entry {
  border-bottom-color: #45475a;
}

.nightMode .least-common-section {
  border-top-color: #45475a;
}

.nightMode .least-common-header {
  color: #6c7086;
}

.nightMode .least-common-list {
  color: #6c7086;
}

.nightMode .lc-text {
  color: #9399b2;
}

.nightMode .source {
  color: #585b70;
}

/* Gender badges — night mode uses slightly dimmer versions */
.nightMode .gender-masculine { background-color: #1e66f5; }
.nightMode .gender-feminine  { background-color: #d20f39; }
.nightMode .gender-neuter    { background-color: #40a02b; }
.nightMode .gender-plural    { background-color: #8839ef; }
```

---

## Alternative: Using Anki's Native `{{type:}}` for Typed Answers

For active recall practice, we could include a typing comparison:

```html
<!-- Front Template (Type-in answer) -->
<div class="card-front">
  <div class="word">{{Word}}</div>
  <div class="meta">
    <span class="pos">{{POS}}</span>
    {{#Gender}}<span class="gender gender-{{Gender}}">{{Gender}}</span>{{/Gender}}
  </div>
</div>
```

```html
<!-- Back Template -->
{{FrontSide}}

<hr id="answer">

<div class="card-back">
  <div class="translations">
    {{{Translations}}}
  </div>

  <!-- Type-in answer box for the primary translation -->
  <div class="type-answer">
    Type the most common translation:<br>
    {{type:PrimaryTranslation}}
  </div>
</div>
```

This would require adding a `PrimaryTranslation` field to the note type.

---

## Card Type Recommendation

### **Recommended: Basic (Front/Back)** ✅

For vocabulary cards, the **Basic** note type (or a custom variation) is recommended because:

1. **Simplicity**: Clear front (word) → back (meaning + examples) flow
2. **Recognition practice**: See German word → recall English meaning
3. **Rich formatting**: HTML/CSS on back gives full control over layout
4. **No cloze complexity**: Cloze deletions are better for grammar/sentences, not vocabulary

### When to Use Cloze Deletion

Cloze (`{{c1::word}}`) is better for:
- Fill-in-the-blank grammar exercises
- Preposition practice (e.g., "Ich warte {{c1::auf}} den Bus")
- Sentence-level vocabulary in context

For our use case (isolated vocabulary with translations and examples), **Basic** is the right choice.

---

## Template Registration via AnkiConnect

To register this note type programmatically:

```javascript
await ankiInvoke('createModel', {
  modelName: 'German Vocabulary',
  inOrderFields: ['Word', 'POS', 'Gender', 'Translations', 'LeastCommon', 'Source', 'Notes'],
  css: `/* Full CSS from above */`,
  cardTemplates: [
    {
      Name: 'Recognition',
      Front: `<div class="card-front">...`,
      Back: `{{FrontSide}}<hr id="answer">...`
    }
  ]
});
```

### Pre-existing Note Type Strategy

If the user already has a note type they prefer, we should:
1. Use `modelFieldNames` to get available fields
2. Map our data to the user's fields (configurable in extension settings)
3. Fall back to creating our "German Vocabulary" note type if no suitable one exists
