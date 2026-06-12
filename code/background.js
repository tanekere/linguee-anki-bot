const ANKI_URL = 'http://localhost:8765';
const NOTE_TYPE_NAME = 'Linguee German Vocabulary';

async function ankiInvoke(action, params = {}) {
  const response = await fetch(ANKI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, version: 6, params })
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(`AnkiConnect error (${action}): ${data.error}`);
  }
  return data.result;
}

async function checkAnkiConnect() {
  try {
    await ankiInvoke('version');
    return true;
  } catch {
    return false;
  }
}

async function getActiveProfile() {
  try {
    return await ankiInvoke('getActiveProfile');
  } catch {
    return null;
  }
}

async function getProfilesList() {
  try {
    return await ankiInvoke('getProfiles');
  } catch {
    return [];
  }
}

function escapeHTML(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const NOTE_TYPE_CSS = `
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
.word {
  font-size: 42px;
  font-weight: 700;
  color: #1d3557;
  margin-bottom: 8px;
  letter-spacing: -0.5px;
}
.word-meta { font-size: 16px; color: #6c757d; margin-bottom: 4px; }
.word-meta .pos { font-style: italic; }
.word-meta .gender {
  display: inline-block; padding: 2px 10px; border-radius: 12px;
  font-size: 13px; font-weight: 600; margin-left: 6px; color: #fff;
}
.gender-masculine { background-color: #3498db; }
.gender-feminine  { background-color: #e74c3c; }
.gender-neuter    { background-color: #2ecc71; }
.gender-plural    { background-color: #9b59b6; }
.word-forms { font-size: 14px; color: #868e96; margin-top: 6px; font-style: italic; }
hr#answer { border: none; border-top: 2px solid #e9ecef; margin: 16px 0; }
.translations-section { text-align: left; }
.trans-entry { margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid #f0f0f0; }
.trans-entry:last-of-type { border-bottom: none; }
.trans-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
.trans-word { font-size: 20px; font-weight: 600; color: #1d3557; }
.trans-pos { font-size: 14px; color: #6c757d; font-style: italic; }
.trans-forms { font-size: 13px; color: #868e96; }
.trans-context {
  font-size: 12px; color: #6c5ce7; font-weight: 500;
  background: #f0edff; padding: 1px 6px; border-radius: 8px;
}
.trans-examples { margin-top: 4px; margin-left: 16px; }
.example-pair { margin-bottom: 6px; padding: 6px 10px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #457b9d; }
.example-source { font-size: 14px; color: #34495e; font-style: italic; }
.example-target { font-size: 13px; color: #6c757d; margin-top: 2px; }
.least-common-section { margin-top: 16px; padding-top: 12px; border-top: 2px dashed #dcdde1; }
.least-common-header {
  font-size: 14px; font-weight: 600; color: #95a5a6;
  text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;
}
.least-common-list { font-size: 15px; color: #7f8c8d; line-height: 1.8; }
.lc-item { white-space: nowrap; }
.lc-word { color: #555; font-weight: 500; }
.lc-pos { font-size: 12px; font-style: italic; color: #adb5bd; margin-left: 2px; }
.lc-context { font-size: 11px; color: #6c5ce7; margin-left: 2px; }
.lc-separator { margin: 0 6px; color: #ccc; }
.source { margin-top: 14px; font-size: 11px; color: #adb5bd; text-align: right; }
.nightMode .card { background-color: #1e1e2e; color: #cdd6f4; }
.nightMode .word { color: #cdd6f4; }
.nightMode .word-meta { color: #9399b2; }
.nightMode .trans-word { color: #cdd6f4; }
.nightMode .trans-pos { color: #9399b2; }
.nightMode .trans-forms { color: #585b70; }
.nightMode .trans-context { color: #b4a0ff; background-color: #313244; }
.nightMode .example-pair { background-color: #313244; border-left-color: #89b4fa; }
.nightMode .example-source { color: #cdd6f4; }
.nightMode .example-target { color: #9399b2; }
.nightMode hr#answer { border-top-color: #45475a; }
.nightMode .trans-entry { border-bottom-color: #45475a; }
.nightMode .least-common-section { border-top-color: #45475a; }
.nightMode .least-common-header { color: #6c7086; }
.nightMode .least-common-list { color: #6c7086; }
.nightMode .lc-word { color: #9399b2; }
.nightMode .lc-context { color: #b4a0ff; }
.nightMode .source { color: #585b70; }
.nightMode .gender-masculine { background-color: #1e66f5; }
.nightMode .gender-feminine  { background-color: #d20f39; }
.nightMode .gender-neuter    { background-color: #40a02b; }
.nightMode .gender-plural    { background-color: #8839ef; }
`;

const FRONT_TEMPLATE = `<div class="word">{{Word}}</div>
<div class="word-meta">
  <span class="pos">{{POS}}</span>
  {{#Gender}}<span class="gender gender-{{Gender}}">{{Gender}}</span>{{/Gender}}
</div>
{{#FormsHTML}}
<div class="word-forms">{{FormsHTML}}</div>
{{/FormsHTML}}`;

const BACK_TEMPLATE = `{{FrontSide}}

<hr id="answer">

<div class="translations-section">
  {{TranslationsHTML}}
</div>

{{#LeastCommonHTML}}
<div class="least-common-section">
  <div class="least-common-header">Less Common</div>
  <div class="least-common-list">
    {{LeastCommonHTML}}
  </div>
</div>
{{/LeastCommonHTML}}

{{#SourceURL}}
<div class="source">Source: <a href="{{SourceURL}}">Linguee</a></div>
{{/SourceURL}}`;

async function ensureNoteType() {
  try {
    const models = await ankiInvoke('modelNames');
    if (models.includes(NOTE_TYPE_NAME)) {
      await ankiInvoke('updateModelTemplates', {
        model: {
          name: NOTE_TYPE_NAME,
          templates: {
            Recognition: {
              Front: FRONT_TEMPLATE,
              Back: BACK_TEMPLATE
            }
          }
        }
      });
      await ankiInvoke('updateModelStyling', {
        model: {
          name: NOTE_TYPE_NAME,
          css: NOTE_TYPE_CSS
        }
      });
      return;
    }
  } catch {
    throw new Error('Cannot check model names - AnkiConnect may not be reachable');
  }
  await ankiInvoke('createModel', {
    modelName: NOTE_TYPE_NAME,
    inOrderFields: [
      'Word', 'POS', 'Gender', 'TranslationsHTML',
      'LeastCommonHTML', 'FormsHTML', 'SourceURL', 'Notes'
    ],
    css: NOTE_TYPE_CSS,
    cardTemplates: [{
      Name: 'Recognition',
      Front: FRONT_TEMPLATE,
      Back: BACK_TEMPLATE
    }]
  });
}

async function ensureDeck(deckName) {
  const decks = await ankiInvoke('deckNames');
  if (!decks.includes(deckName)) {
    await ankiInvoke('createDeck', { deck: deckName });
  }
}

async function getDecks() {
  try {
    const decks = await ankiInvoke('deckNames');
    return decks.filter(d => d !== 'Default');
  } catch {
    return [];
  }
}

async function checkDuplicate(deckName, word, pos) {
  try {
    const query = `"deck:${deckName}" "Word:${word}" "POS:${pos}"`;
    const noteIds = await ankiInvoke('findNotes', { query });
    return noteIds.length > 0;
  } catch {
    return false;
  }
}

function formatFormsHTML(forms) {
  const parts = [];
  if (forms && forms.plural) {
    parts.push(`Plural: ${escapeHTML(forms.plural)}`);
  }
  if (forms && forms.conjugations && forms.conjugations.length > 0) {
    parts.push(`Conjugations: ${escapeHTML(forms.conjugations.join(', '))}`);
  }
  return parts.join(' · ');
}

function formatTranslationsHTML(translations) {
  return translations
    .filter(t => t.isCommon)
    .map(t => {
      let html = '<div class="trans-entry"><div class="trans-header">';
      html += `<span class="trans-word">${escapeHTML(t.text)}</span>`;
      if (t.pos) {
        html += `<span class="trans-pos">${escapeHTML(t.pos)}</span>`;
      }
      if (t.verbForms && t.verbForms.length > 0) {
        html += `<span class="trans-forms">(${escapeHTML(t.verbForms.join(', '))})</span>`;
      }
      if (t.usageNote) {
        html += `<span class="trans-context">${escapeHTML(t.usageNote)}</span>`;
      }
      html += '</div>';
      if (t.examples && t.examples.length > 0) {
        html += '<div class="trans-examples">';
        for (const ex of t.examples) {
          html += '<div class="example-pair">';
          html += `<div class="example-source">${escapeHTML(ex.source)}</div>`;
          html += `<div class="example-target">${escapeHTML(ex.target)}</div>`;
          html += '</div>';
        }
        html += '</div>';
      }
      html += '</div>';
      return html;
    })
    .join('\n');
}

function formatLeastCommonHTML(translations) {
  const leastCommon = translations.filter(t => !t.isCommon);
  if (leastCommon.length === 0) return '';
  return leastCommon
    .map((t, i) => {
      let html = '<span class="lc-item">';
      html += `<span class="lc-word">${escapeHTML(t.text)}</span>`;
      if (t.pos) {
        html += `<span class="lc-pos">${escapeHTML(t.pos)}</span>`;
      }
      if (t.usageNote) {
        html += `<span class="lc-context">${escapeHTML(t.usageNote)}</span>`;
      }
      html += '</span>';
      if (i < leastCommon.length - 1) {
        html += '<span class="lc-separator">·</span>';
      }
      return html;
    })
    .join('\n');
}

async function addEntryToAnki(entry, deckName) {
  await ensureNoteType();
  await ensureDeck(deckName);

  const allTranslations = [
    ...(entry.commonTranslations || []),
    ...(entry.leastCommonTranslations || [])
  ];

  const isDuplicate = await checkDuplicate(deckName, entry.word, entry.pos);
  if (isDuplicate) {
    return {
      success: false,
      error: 'duplicate',
      message: `"${entry.word}" (${entry.pos}) already exists in deck "${deckName}"`
    };
  }

  const fields = {
    Word: entry.word,
    POS: entry.pos,
    Gender: entry.gender || '',
    TranslationsHTML: formatTranslationsHTML(allTranslations),
    LeastCommonHTML: formatLeastCommonHTML(allTranslations),
    FormsHTML: formatFormsHTML(entry.forms),
    SourceURL: entry.sourceURL || '',
    Notes: ''
  };

  const tags = ['linguee', entry.pos, `source:linguee`];

  const noteId = await ankiInvoke('addNote', {
    note: {
      deckName,
      modelName: NOTE_TYPE_NAME,
      fields,
      tags,
      options: {
        allowDuplicate: false,
        duplicateScope: 'deck',
        duplicateScopeOptions: {
          deckName,
          checkChildren: true,
          checkAllModels: false
        }
      }
    }
  });

  return { success: true, noteId };
}

async function queueForLater(entry, deckName) {
  const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue');
  offlineQueue.push({
    entry,
    deckName,
    timestamp: Date.now(),
    attempts: 0
  });
  await chrome.storage.local.set({ offlineQueue });
}

async function processOfflineQueue() {
  const connected = await checkAnkiConnect();
  if (!connected) {
    return { processed: 0, remaining: -1, error: 'Anki is not running or AnkiConnect is not installed.' };
  }

  const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue');
  if (offlineQueue.length === 0) return { processed: 0, remaining: 0 };

  const remaining = [];
  let processed = 0;

  for (const item of offlineQueue) {
    const result = await addEntryToAnki(item.entry, item.deckName);
    if (result.success || result.error === 'duplicate') {
      processed++;
    } else {
      item.attempts++;
      if (item.attempts < 5) {
        remaining.push(item);
      }
    }
  }

  await chrome.storage.local.set({ offlineQueue: remaining });
  return { processed, remaining: remaining.length };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    switch (message.action) {
      case 'ADD_TO_ANKI': {
        const { entry } = message;
        const { selectedDeck } = await chrome.storage.local.get('selectedDeck');

        if (!selectedDeck) {
          sendResponse({ success: false, error: 'no_deck', message: 'No deck selected. Select a deck first.' });
          return;
        }

        try {
          const connected = await checkAnkiConnect();
          if (!connected) {
            await queueForLater(entry, selectedDeck);
            sendResponse({ success: false, queued: true });
            return;
          }

          const result = await addEntryToAnki(entry, selectedDeck);

          if (result.success) {
            const { cardsAddedCount = 0 } = await chrome.storage.local.get('cardsAddedCount');
            await chrome.storage.local.set({ cardsAddedCount: cardsAddedCount + 1 });
            sendResponse(result);
          } else {
            sendResponse(result);
          }
        } catch (e) {
          await queueForLater(entry, selectedDeck);
          sendResponse({ success: false, queued: true });
        }
        break;
      }

      case 'CHECK_ANKI_STATUS': {
        const connected = await checkAnkiConnect();
        if (!connected) {
          sendResponse({ connected: false, profile: null, deck: null });
          return;
        }
        try {
          const activeProfile = await ankiInvoke('getActiveProfile');
          const { selectedDeck } = await chrome.storage.local.get('selectedDeck');
          sendResponse({ connected: true, profile: activeProfile, deck: selectedDeck || null });
        } catch {
          sendResponse({ connected: false, profile: null, deck: null });
        }
        break;
      }

      case 'GET_STATUS': {
        const connected = await checkAnkiConnect();
        if (!connected) {
          sendResponse({ connected: false, profile: null, profiles: [], deck: null });
          return;
        }
        try {
          const activeProfile = await ankiInvoke('getActiveProfile');
          const profiles = await ankiInvoke('getProfiles');
          const { selectedDeck } = await chrome.storage.local.get('selectedDeck');
          sendResponse({ connected: true, profile: activeProfile, profiles, deck: selectedDeck || null });
        } catch {
          sendResponse({ connected: false, profile: null, profiles: [], deck: null });
        }
        break;
      }

      case 'GET_DECKS': {
        const connected = await checkAnkiConnect();
        if (!connected) {
          sendResponse({ decks: [] });
          return;
        }
        try {
          const decks = await getDecks();
          sendResponse({ decks });
        } catch {
          sendResponse({ decks: [] });
        }
        break;
      }

      case 'SET_DECK': {
        await chrome.storage.local.set({ selectedDeck: message.deckName });
        chrome.tabs.query({ url: 'https://www.linguee.com/*' }, (tabs) => {
          for (const tab of tabs) {
            chrome.tabs.sendMessage(tab.id, { action: 'DECK_CHANGED' }).catch(() => {});
          }
        });
        sendResponse({ success: true });
        break;
      }

      case 'GET_PROFILES': {
        const connected = await checkAnkiConnect();
        if (!connected) {
          sendResponse({ connected: false, profiles: [], activeProfile: null });
          return;
        }
        try {
          const profiles = await ankiInvoke('getProfiles');
          const activeProfile = await ankiInvoke('getActiveProfile');
          sendResponse({ connected: true, profiles, activeProfile });
        } catch {
          sendResponse({ connected: false, profiles: [], activeProfile: null });
        }
        break;
      }

      case 'LOAD_PROFILE': {
        try {
          await ankiInvoke('loadProfile', { name: message.name });
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false, error: e.message });
        }
        break;
      }

      case 'CREATE_DECK': {
        const connected = await checkAnkiConnect();
        if (!connected) {
          sendResponse({ success: false, error: 'anki_unreachable', message: 'Anki is not running or AnkiConnect is not installed.' });
          break;
        }
        try {
          const decks = await getDecks();
          if (decks.includes(message.deckName)) {
            sendResponse({ success: false, error: 'duplicate', message: 'Deck already exists' });
          } else {
            await ankiInvoke('createDeck', { deck: message.deckName });
            sendResponse({ success: true });
          }
        } catch (e) {
          sendResponse({ success: false, error: 'anki_error', message: e.message });
        }
        break;
      }

      case 'PROCESS_QUEUE': {
        const result = await processOfflineQueue();
        sendResponse(result);
        break;
      }

      case 'EXTRACT_WORD': {
        sendResponse({ success: true });
        break;
      }

      default:
        sendResponse({ success: false, error: 'unknown_action' });
    }
  })();
  return true;
});
