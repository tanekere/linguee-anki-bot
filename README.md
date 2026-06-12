# Linguee to Anki card adder

This extenion can add words on Linguee directly to Anki. Cross-browser. Early beta app.

## Todo

### Chrome Web Store
1. Zip the extension: Zip the contents of dist/chrome/ (not the folder itself — the files should be at the root of the zip)
2. Pay the one-time fee: $5 at chrome.google.com/webstore/devconsole (https://chrome.google.com/webstore/devconsole)
3. Upload:
- Click "New Item" → upload the zip
- Fill in store listing (name, description, screenshots)
- Upload at least one 1280×800 or 640×400 screenshot
- Add a 128×128 icon (yours exists but is low quality — consider replacing it)
4. Privacy policy URL: Required. Your extension only talks to localhost (AnkiConnect) and linguee.com — a simple policy stating no data is collected externally suffices. You can host it on GitHub Pages
5. Permissions justification: You'll need to explain each permission:
- storage — saves user preferences (deck, URL)
- host_permissions: http://localhost/, http://127.0.0.1/ — communicates with AnkiConnect on the local machine
- host_permissions: https://www.linguee.com/* — content script extracts vocabulary from pages the user visits
6. Submit for review (typically 1-3 days)
### Firefox Add-ons (AMO)
1. Zip the extension: Zip contents of dist/firefox/
2. Submit at addons.mozilla.org/developers (https://addons.mozilla.org/developers/)
3. Source code: AMO may require you to upload the source code since it contains minified/bundled-like content. Zip the entire code/ directory (excluding dist/ and .git/)
4. Reviewer notes: Mention that AnkiConnect runs locally at http://localhost:8765, and the host_permissions for localhost are for communicating with it
5. No fee required


## Before Publishing Checklist
- Replace placeholder icons with properly designed ones
- Write a store description (I can draft one if you want)
- Take screenshots of the extension in action on a Linguee page
- Host a privacy policy page
Want me to create a CHROMEWEBSTORE.md with drafted store listing copy and privacy policy?
