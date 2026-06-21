# KSCY — Tournament Registration App

A single-file web app for registering club members and auto-generating 3 balanced cricket teams. Connected to Firebase project **kerala-sports-club-yukon**.

## What it does

- **Registration form** — first/last name (duplicates blocked, case/whitespace-insensitive), then "What do you enjoy most: Batting / Bowling / Both," with a smart follow-up:
  - Picked **Batting** → asks *"Can you also bowl if needed?"*
  - Picked **Bowling** → asks *"Can you also bat if needed?"*
  - Picked **Both** → no follow-up, submits straight away
- **Home page** shows only the live total registered count — nobody can see who else has registered, without the password.
- **View Roster** (top nav, password-protected) — enter the password to see everyone registered so far and their playing style.
- **Generate Teams** (top nav, password-protected) — shuffles everyone into **Team A / B / C** as evenly as possible:
  - If registrations aren't a multiple of 3, the extra player(s) are spread one-per-team (e.g. 20 players → 7/7/6), never stacking two extras on one side.
  - Players are grouped into 5 tiers (pure all-rounders → batting all-rounders → bowling all-rounders → specialist batters → specialist bowlers), shuffled within each tier, then dealt out to whichever team currently has the fewest players (ties broken by lowest combined batting+bowling strength) — so size **and** bat/bowl balance are both kept fair, not just headcount.
  - Re-runnable any time — running it again overwrites the previous teams with a fresh shuffle.
- **Teams view** — visible to everyone once generated, with batter/bowler/all-rounder counts per team.
- Both the roster and team-generator are gated by the same password, currently set to **`22`**.

## Current status

Firebase config is already wired into `index.html` (project: `kerala-sports-club-yukon`). What's left, done once in the Firebase console — not in the file:

1. **Firestore Database → Create database** (Production mode, pick a region near you)
2. **Firestore → Rules tab** → paste in the contents of `firestore.rules.txt` → **Publish**

Once both are done, open `index.html` — the orange banner at the top should disappear, and everything will save permanently and sync live across everyone's devices.

If the page instead shows *"Firebase connected, but Firestore isn't reachable yet"* — that means step 1 or 2 above isn't done yet (the config itself is fine).

## Hosting it (so your club has a link, not a file)

Pick one:
- **Netlify Drop** — go to app.netlify.com/drop, drag `index.html` in, get a live URL in seconds, no account needed
- **Firebase Hosting** — `firebase init hosting` + `firebase deploy` via the Firebase CLI (needs Node.js)
- **GitHub Pages** — push the file to a repo, enable Pages in repo settings

## Automated end-to-end test

A simple Puppeteer script is included to exercise the registration flow and verify the page shows a successful confirmation. It does not connect to Firebase directly — it runs the real UI in a headless browser and asserts the success message appears after submitting.

Quick steps:

1. Install dev dependencies:

```bash
npm install
```

2. Start a local static server (in another terminal):

```bash
npm start
# serves at http://localhost:8080
```

3. Run the E2E test:

```bash
npm run test:e2e
```

If the test passes, the script will exit with code 0 and print `E2E test passed`. If it fails, inspect the console output for errors and the browser console (the script prints network errors it observes).

Notes:
- Ensure your Firebase Firestore has been created and the rules published (see earlier sections) for writes to succeed when the app is actually connected.
- The test uses a unique timestamped name to avoid duplicate-name collisions.

## Changing the password

Open `index.html`, search for `const PASSWORD = "22"`, and change `"22"` to whatever you like. Note this is a UI-level gate, not a server-enforced one — fine for keeping casual club members out, but not bank-grade security (see the note at the bottom of `firestore.rules.txt` if you ever want to harden this further with Cloud Functions).

## Files in this folder

- **`index.html`** — the entire app. Open directly in a browser, or host anywhere.
- **`firestore.rules.txt`** — security rules to paste into the Firebase console (Firestore → Rules tab). Anyone can read the player count / roster / teams; anyone can register once; nobody can edit or delete someone else's entry from the browser.
- **`README.md`** — this file.
