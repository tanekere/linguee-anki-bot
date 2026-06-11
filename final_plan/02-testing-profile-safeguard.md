# 02 — Testing Profile Safeguard

## Overview

The extension must **never modify, create, or delete cards in any Anki profile other than "testing"**. This safeguard prevents accidental data corruption of the user's real study decks. The check is enforced at multiple layers.

## Why This Matters

AnkiConnect runs on localhost and has full access to whatever Anki profile is currently active. If the user is reviewing cards in their main profile and clicks "Add to Anki", the card could be added to their realdeck — polluting study data. The "testing" profile is a safe sandbox where mistakes are harmless.

## AnkiConnect Profile API

AnkiConnect provides these profile-related endpoints:

| Endpoint | Action | Description |
|----------|--------|-------------|
| `getProfiles` | Read | Returns list of all Anki profile names |
| `getActiveProfile` | Read | Returns the name of the currently active profile |
| `loadProfile` | Write | Switches Anki to a different profile (requires Anki to be unlocked/restart) |

### Important Limitations

1. **`loadProfile` requires Anki to be restarted** — AnkiConnect cannot switch profiles while a session is active (deck browser, review, etc. are open)
2. **Profile switching closes the current session** — This is disruptive; we should ASK the user, not do it automatically
3. **The "testing" profile must be created manually** — AnkiConnect does not provide a `createProfile` endpoint; the user must create it in Anki Desktop

## Multi-Layer Safeguard Design

### Layer 1: Service Worker — Hard Gate (Primary Safeguard)

The service worker is the ONLY component that makes AnkiConnect calls. Every write operation goes through a profile check:

```javascript
// background.js

const ALLOWED_PROFILE = "testing";

async function ensureActiveProfileIsTesting() {
  try {
    const response = await ankiInvoke("getActiveProfile");
    if (response.result === ALLOWED_PROFILE) {
      return { ok: true };
    }
    return {
      ok: false,
      error: "wrong_profile",
      activeProfile: response.result,
      message: `Anki is using profile "${response.result}", not "${ALLOWED_PROFILE}". ` +
               `Please switch to the "testing" profile in Anki before adding cards.`
    };
  } catch (e) {
    return { ok: false, error: "anki_unreachable", message: "Anki is not running or AnkiConnect is not installed." };
  }
}

// Wrapper for all write operations
async function safeAnkiWrite(operationFn) {
  // Step 1: Check AnkiConnect is reachable
  const versionCheck = await checkAnkiConnectVersion();
  if (!versionCheck.ok) {
    return { success: false, error: "anki_unreachable", message: versionCheck.message };
  }

  // Step 2: Check active profile is "testing"
  const profileCheck = await ensureActiveProfileIsTesting();
  if (!profileCheck.ok) {
    return { success: false, error: profileCheck.error, message: profileCheck.message };
  }

  // Step 3: Verify the "testing" profile exists
  const profilesCheck = await verifyTestingProfileExists();
  if (!profilesCheck.ok) {
    return { success: false, error: "profile_missing", message: profilesCheck.message };
  }

  // Step 4: Execute the operation (only if all checks pass)
  return await operationFn();
}
```

### Layer 2: Service Worker — Deck Name Validation (Secondary Safeguard)

Even within the "testing" profile, we ensure deck names are explicitly scoped. The extension offers only decks from the current profile and prefixes custom deck names:

```javascript
async function getAvailableDecks() {
  // Only called after profile check passes
  const decks = await ankiInvoke("deckNames");
  
  // In the "testing" profile, all decks are safe to use.
  // But we explicitly exclude "Default" to avoid confusion.
  return decks.filter(d => d !== "Default");
}

async function createDeckSafely(deckName) {
  // Enforce that custom deck names start with "testing--" prefix
  // This makes it visually obvious which decks belong to the test profile
  const safeDeckName = deckName.startsWith("testing--") 
    ? deckName 
    : `testing--${deckName}`;
  
  return await ankiInvoke("createDeck", { deck: safeDeckName });
}
```

### Layer 3: Content Script — UX Guard

The content script shows a visual indicator of the current Anki profile status:

```javascript
// content.js

function updateButtonStates(ankiStatus) {
  const buttons = document.querySelectorAll('.linguee-anki-btn');
  buttons.forEach(btn => {
    if (ankiStatus.connected && ankiStatus.profile === "testing") {
      btn.classList.remove('disabled');
      btn.title = `Add to deck: ${ankiStatus.deck}`;
    } else if (ankiStatus.connected && ankiStatus.profile !== "testing") {
      btn.classList.add('disabled');
      btn.title = `Wrong Anki profile: "${ankiStatus.profile}". Switch to "testing".`;
    } else {
      btn.classList.add('disabled');
      btn.title = "Anki is not connected. Open Anki with AnkiConnect installed.";
    }
  });
}
```

### Layer 4: Popup — Status Dashboard

The popup shows a persistent status bar:

```
┌─────────────────────────────────────┐
│  Linguee → Anki                     │
│                                     │
│  Status: ✅ Connected               │  ← green if connected
│  Profile: testing                   │  ← shows current profile
│  Deck: [testing--German::Vocab ▾]   │  ← dropdown (testing decks only)
│                                     │
│  ─────────────────────────────────  │
│  Cards added this session: 3        │
│  Queue: 0 pending                   │
│                                     │
│  [Process Queue]                    │
└─────────────────────────────────────┘
```

If the wrong profile is active:

```
┌─────────────────────────────────────┐
│  Linguee → Anki                     │
│                                     │
│  ⚠️ Wrong Anki Profile!             │
│  Currently active: "User"           │
│  Required: "testing"                 │
│                                     │
│  Please switch to the "testing"     │
│  profile in Anki Desktop:           │
│  File → Switch Profile → testing    │
│                                     │
│  [Check Again]                      │
└─────────────────────────────────────┘
```

If AnkiConnect is missing:

```
┌─────────────────────────────────────┐
│  Linguee → Anki                     │
│                                     │
│  ❌ Anki Not Connected              │
│                                     │
│  Please:                             │
│  1. Open Anki Desktop               │
│  2. Install AnkiConnect (code:     │
│     2055492159)                      │
│  3. Restart Anki                    │
│                                     │
│  Cards will be queued for later.    │
│  Queue: 2 pending                   │
│  [Retry Connection]                 │
└─────────────────────────────────────┘
```

## Safeguard Enforcement Flowchart

```
User clicks "Add to Anki" button on Linguee page
│
├── Content script extracts word data
│   └── Sends { action: "ADD_TO_ANKI", data: wordEntry } to service worker
│
└── Service worker receives message
    │
    ├── Check 1: Is AnkiConnect reachable?
    │   ├── NO → Queue offline, show "Queued" state on button
    │   └── YES → Continue
    │
    ├── Check 2: Is "testing" profile the active profile?
    │   ├── NO → Return error, show "Wrong profile" message
    │   └── YES → Continue
    │
    ├── Check 3: Does "testing" profile exist in Anki?
    │   ├── NO → Return error, show "Create 'testing' profile" setup guide
    │   └── YES → Continue
    │
    ├── Check 4: Does the target deck exist?
    │   ├── NO → Create it (under "testing" profile context)
    │   └── YES → Continue
    │
    ├── Check 5: Is this a duplicate card?
    │   ├── YES → Return "duplicate exists" info, offer update
    │   └── NO → Continue
    │
    ├── Check 6: Create the note
    │   └── addNote() → Return success/failure
    │
    └── Return result to content script
        ├── Success → Button shows "Added ✓" (green)
        ├── Duplicate → Button shows "Already exists" (yellow)
        └── Error → Button shows "Error" + error details (red)
```

## Profile Setup Guide

When the extension detects that the "testing" profile doesn't exist, it should display a setup guide:

1. Open Anki Desktop
2. Go to **File → Switch Profile**
3. Click **Add Profile**
4. Name it **testing** (must be exactly "testing", lowercase)
5. Click **OK**
6. Switch to the "testing" profile
7. Install AnkiConnect (Tools → Add-ons → Get Add-ons → code: `2055492159`)
8. Restart Anki
9. The extension should now show "Connected ✅" and "Profile: testing"

## Self-Testing

The extension should include a self-test function in the service worker:

```javascript
async function selfTest() {
  const results = {};

  // Test AnkiConnect connectivity
  try {
    const version = await ankiInvoke("version");
    results.ankiConnect = { ok: true, version };
  } catch (e) {
    results.ankiConnect = { ok: false, error: e.message };
    return results; // Can't test further without AnkiConnect
  }

  // Test profile listing
  try {
    const profiles = await ankiInvoke("getProfiles");
    results.profiles = { ok: true, profiles };
    results.testingProfileExists = profiles.includes("testing");
  } catch (e) {
    results.profiles = { ok: false, error: e.message };
  }

  // Test active profile
  try {
    const activeProfile = await ankiInvoke("getActiveProfile");
    results.activeProfile = activeProfile;
    results.profileIsTesting = activeProfile === "testing";
  } catch (e) {
    results.activeProfile = { ok: false, error: e.message };
  }

  // Test deck listing
  try {
    const decks = await ankiInvoke("deckNames");
    results.decks = { ok: true, decks };
  } catch (e) {
    results.decks = { ok: false, error: e.message };
  }

  return results;
}
```