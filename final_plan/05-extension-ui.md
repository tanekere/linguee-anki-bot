# 05 — Extension UI Design

## Overview

The extension has three UI components:
1. **Injected buttons** on Linguee pages (content script)
2. **Popup** from the extension toolbar icon
3. **Toast notifications** on the Linguee page for status feedback

## 1. Injected Buttons (Content Script)

### Visual Design

Each `.exact` entry on a Linguee page gets an "Add to Anki" button placed immediately after the `.lemma_desc` heading:

```
┌──────────────────────────────────────────────────────────────────┐
│  ▾ Dictionary German-English                                     │
│                                                                   │
│  Haus noun, neuter (plural: Häuser) —                            │
│  [➕ Add to Anki]  ← injected button                             │
│                                                                   │
│    house n (often used)                                          │
│    "Mein Haus hat drei Schlafzimmer."                            │
│    My house has three bedrooms.                                   │
│    ...                                                            │
│                                                                   │
│    building n                                                     │
│    [➕ Add to Anki]  ← NOT here; button only at top of entry      │
│                                                                   │
│  laufen verb (ran, run) —                                        │
│  [➕ Add to Anki]  ← separate button for each .exact entry       │
│                                                                   │
│    run v (often used)                                            │
│    ...                                                            │
└──────────────────────────────────────────────────────────────────┘
```

### Button States

| State | Color | Text | Behavior |
|-------|-------|------|----------|
| Idle | Blue (#3498db) | `➕ Add to Anki` | Clickable |
| Adding | Yellow (#f39c12) | `⏳ Adding...` | Disabled |
| Added | Green (#27ae60) | `✅ Added` | Disabled, persists |
| Duplicate | Orange (#e67e22) | `⚠️ Exists` | Click to view/update |
| Error | Red (#e74c3c) | `❌ Error` | Hover for message |
| Wrong Profile | Red (#e74c3c) | `❌ Wrong Profile` | Hover for message |
| Disconnected | Gray (#95a5a6) | `🔌 No Anki` | Disabled until Anki reconnects |

### Button CSS (full)

See [03-dom-extraction.md](03-dom-extraction.md) for the CSS.

### Button Injection Logic

```javascript
// content.js — Button injection

function injectAddButtons(entries) {
  const exactDivs = document.querySelectorAll('.exact');
  
  exactDivs.forEach((exactDiv, index) => {
    const entry = entries[index];
    if (!entry) return;
    
    // Find the lemma heading
    const lemmaDesc = exactDiv.querySelector('.lemma_desc');
    if (!lemmaDesc) return;
    
    // Check if button already exists (re-injection guard)
    if (exactDiv.querySelector('.linguee-anki-btn')) return;
    
    // Create button container
    const btnContainer = document.createElement('div');
    btnContainer.className = 'linguee-anki-btn-container';
    
    // Create button
    const btn = document.createElement('button');
    btn.className = 'linguee-anki-btn';
    btn.dataset.entryIndex = String(index);
    btn.dataset.word = entry.word;
    btn.dataset.pos = entry.pos;
    btn.textContent = '➕ Add to Anki';
    btn.title = `Add "${entry.word}" (${entry.pos}) to Anki deck`;
    
    btnContainer.appendChild(btn);
    
    // Insert after lemma_desc (the h2 heading)
    // We insert after the h2's parent to avoid breaking Linguee's layout
    const lemmaWrapper = lemmaDesc.parentElement;
    if (lemmaWrapper) {
      lemmaWrapper.insertBefore(btnContainer, lemmaDesc.nextSibling);
    }
  });
}
```

### Status Polling

Content script periodically checks AnkiConnect status:

```javascript
let ankiStatus = { connected: false, profile: null, deck: null };

async function checkAnkiStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'CHECK_ANKI_STATUS' });
    ankiStatus = response;
    updateButtonStates();
  } catch (e) {
    ankiStatus = { connected: false, profile: null, deck: null };
    updateButtonStates();
  }
}

function updateButtonStates() {
  const buttons = document.querySelectorAll('.linguee-anki-btn');
  buttons.forEach(btn => {
    if (btn.classList.contains('added') || btn.classList.contains('duplicate')) return; // Don't override terminal states
    
    if (!ankiStatus.connected) {
      btn.classList.add('disabled');
      btn.textContent = '🔌 No Anki';
      btn.title = 'Anki is not connected. Open Anki Desktop with AnkiConnect.';
    } else if (ankiStatus.profile !== 'testing') {
      btn.classList.add('disabled');
      btn.textContent = '❌ Wrong Profile';
      btn.title = `Anki profile "${ankiStatus.profile}" is active. Switch to "testing".`;
    } else {
      btn.classList.remove('disabled');
      btn.textContent = '➕ Add to Anki';
      btn.title = `Add to deck: ${ankiStatus.deck}`;
    }
  });
}

// Check every 10 seconds
setInterval(checkAnkiStatus, 10000);
checkAnkiStatus(); // Initial check
```

## 2. Popup (Extension Toolbar)

### Design

```
┌─────────────────────────────────────┐
│  🔤 Linguee → Anki                  │
│─────────────────────────────────────│
│                                      │
│  Status: ✅ Connected                │
│  Profile: testing                    │
│                                      │
│  ─── Deck Selection ───              │
│  Current deck:                       │
│  ┌─────────────────────────────┐     │
│  │ testing--German::Vocabulary ▾│    │
│  └─────────────────────────────┘     │
│  [Create New Deck]                   │
│                                      │
│  ─── Statistics ───                  │
│  Cards added this session: 3         │
│  Queue: 0 pending                    │
│                                      │
│  ─── Help ───                       │
│  • Open Anki Desktop                 │
│ • Install AnkiConnect (2055492159)   │
│ • Create "testing" profile           │
│                                      │
│  [Process Queue] [Check Connection]  │
│                                      │
│  v1.0.0                             │
└─────────────────────────────────────┘
```

### Error State Popup

```
┌─────────────────────────────────────┐
│  🔤 Linguee → Anki                  │
│─────────────────────────────────────│
│                                      │
│  ❌ Wrong Anki Profile              │
│                                      │
│  Active profile: "User"             │
│  Required profile: "testing"        │
│                                      │
│  To fix:                             │
│  1. Open Anki Desktop               │
│  2. File → Switch Profile           │
│  3. Select "testing"               │
│  4. Click [Check Again]             │
│                                      │
│  [Check Again]                       │
│                                      │
└─────────────────────────────────────┘
```

### Popup HTML Structure

```html
<!-- popup.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup">
    <header class="popup-header">
      <h1>🔤 Linguee → Anki</h1>
      <div class="status-indicator" id="status-indicator">
        <span class="status-dot" id="status-dot"></span>
        <span class="status-text" id="status-text">Checking...</span>
      </div>
    </header>

    <div id="profile-warning" class="warning hidden">
      <p id="profile-warning-text"></p>
      <button id="btn-check-again">Check Again</button>
    </div>

    <div id="main-content" class="hidden">
      <section class="section">
        <h2>Deck Selection</h2>
        <label for="deck-select">Add cards to:</label>
        <div class="deck-selector">
          <select id="deck-select">
            <option value="">Loading decks...</option>
          </select>
          <button id="btn-create-deck" title="Create a new deck">+</button>
        </div>
        <div id="create-deck-form" class="hidden">
          <input type="text" id="new-deck-name" placeholder="New deck name (e.g., testing--German::Vocab)">
          <button id="btn-confirm-create">Create</button>
          <button id="btn-cancel-create">Cancel</button>
        </div>
      </section>

      <section class="section stats">
        <h2>Statistics</h2>
        <div class="stat-row">
          <span>Cards added this session:</span>
          <span id="cards-added">0</span>
        </div>
        <div class="stat-row">
          <span>Queue:</span>
          <span id="queue-count">0 pending</span>
        </div>
      </section>
    </div>

    <section class="section help">
      <h2>Setup</h2>
      <ol>
        <li>Open <strong>Anki Desktop</strong></li>
        <li>Install <strong>AnkiConnect</strong> (code: <code>2055492159</code>)</li>
        <li>Create a <strong>"testing"</strong> profile: File → Switch Profile → Add</li>
        <li>Switch to the <strong>"testing"</strong> profile</li>
      </ol>
    </section>

    <div class="actions">
      <button id="btn-process-queue" class="btn-secondary">Process Queue</button>
      <button id="btn-check-connection" class="btn-secondary">Check Connection</button>
    </div>

    <footer class="popup-footer">v1.0.0</footer>
  </div>

  <script src="popup.js"></script>
</body>
</html>
```

### Popup JavaScript

```javascript
// popup.js

document.addEventListener('DOMContentLoaded', async () => {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const profileWarning = document.getElementById('profile-warning');
  const mainContent = document.getElementById('main-content');
  const deckSelect = document.getElementById('deck-select');
  const cardsAdded = document.getElementById('cards-added');
  const queueCount = document.getElementById('queue-count');
  
  // Load saved settings
  const { selectedDeck, cardsAddedCount = 0 } = await chrome.storage.local.get(['selectedDeck', 'cardsAddedCount']);
  cardsAdded.textContent = cardsAddedCount;
  
  // Check status
  await updateStatus();
  await loadDecks();
  await updateQueueCount();
  
  // Event listeners
  document.getElementById('btn-check-connection').addEventListener('click', updateStatus);
  document.getElementById('btn-check-again').addEventListener('click', updateStatus);
  document.getElementById('btn-process-queue').addEventListener('click', processQueue);
  
  deckSelect.addEventListener('change', () => {
    chrome.storage.local.set({ selectedDeck: deckSelect.value });
  });
  
  // ... create deck, etc.
});

async function updateStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });
    
    if (response.connected && response.profile === 'testing') {
      // All good
      statusDot.className = 'status-dot connected';
      statusText.textContent = 'Connected • Profile: testing';
      profileWarning.classList.add('hidden');
      mainContent.classList.remove('hidden');
    } else if (response.connected && response.profile !== 'testing') {
      // Wrong profile
      statusDot.className = 'status-dot error';
      statusText.textContent = `Wrong profile: "${response.profile}"`;
      document.getElementById('profile-warning-text').textContent = 
        `Anki is using profile "${response.profile}". Please switch to "testing" profile in Anki.`;
      profileWarning.classList.remove('hidden');
      mainContent.classList.add('hidden');
    } else {
      // Disconnected
      statusDot.className = 'status-dot disconnected';
      statusText.textContent = 'Anki not connected';
      profileWarning.classList.add('hidden');
      mainContent.classList.remove('hidden');
    }
  } catch (e) {
    statusDot.className = 'status-dot disconnected';
    statusText.textContent = 'Extension error';
  }
}

async function loadDecks() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'GET_DECKS' });
    if (response.decks) {
      deckSelect.innerHTML = '';
      response.decks.forEach(deck => {
        const option = document.createElement('option');
        option.value = deck;
        option.textContent = deck;
        if (deck === selectedDeck) option.selected = true;
        deckSelect.appendChild(option);
      });
    }
  } catch (e) {
    console.error('Failed to load decks:', e);
  }
}

async function processQueue() {
  const response = await chrome.runtime.sendMessage({ action: 'PROCESS_QUEUE' });
  alert(`Processed ${response.processed} cards. ${response.remaining} remaining in queue.`);
  await updateQueueCount();
}

async function updateQueueCount() {
  const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue');
  document.getElementById('queue-count').textContent = `${offlineQueue.length} pending`;
}
```

## 3. Toast Notifications (Content Script)

Inline toast notifications appear on the Linguee page for important status changes:

```javascript
// content.js — Toast notification system

function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('linguee-anki-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'linguee-anki-toast-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `linguee-anki-toast linguee-anki-toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    transition: opacity 0.3s;
    max-width: 350px;
  `;
  
  switch (type) {
    case 'success': toast.style.backgroundColor = '#27ae60'; break;
    case 'error': toast.style.backgroundColor = '#e74c3c'; break;
    case 'warning': toast.style.backgroundColor = '#f39c12'; break;
    default: toast.style.backgroundColor = '#3498db';
  }
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Usage:
showToast(`"${word}" added to Anki!`, 'success');
showToast(`"${word}" already exists in deck`, 'warning');
showToast('Wrong Anki profile. Switch to "testing".', 'error');
showToast('Anki is not connected. Cards will be queued.', 'warning');
```