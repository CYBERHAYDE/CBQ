# Church of Christ Igbogbo — Bible Quiz Bee

A mock Bible quiz bee builder: assign passages to groups of contestants, auto-generate
practice questions, run a live round (with or without a device per contestant), and get
a full accuracy breakdown at the end.

This app is a single static HTML file. It needs two free services hooked up before it
works outside of Claude.ai:

1. **Firebase (Firestore)** — stores session data so every contestant's device (and
   yours) sees the same live quiz. One-time setup, done by you (the host).
2. **Google Gemini API** — generates the actual quiz questions. Each quiz master pastes
   their own free key into the app when they use it — nothing to configure in the code.

---

## 1. Set up Firebase (storage) — do this once

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in
   with any Google account.
2. Click **Add project**, give it any name (e.g. `coc-igbogbo-quiz`), and finish the
   wizard (you can turn off Google Analytics, you don't need it).
3. In the left sidebar, go to **Build → Firestore Database → Create database**.
   Choose any region close to you, and start in **production mode**.
4. Once created, go to the **Rules** tab and replace the rules with:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /quizbee_kv/{doc} {
         allow read, write: if true;
       }
     }
   }
   ```

   Click **Publish**. (This makes the quiz data open to anyone who has your app's URL —
   fine for an internal church tool with no sensitive data. Don't store anything private
   in it.)
5. In the left sidebar, click the gear icon → **Project settings**. Under "Your apps",
   click the **</>** (web) icon to register a new web app. Give it any nickname, skip
   Firebase Hosting.
6. Firebase will show you a `firebaseConfig` object like this:

   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "coc-igbogbo-quiz.firebaseapp.com",
     projectId: "coc-igbogbo-quiz",
     storageBucket: "coc-igbogbo-quiz.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
   ```

7. Open `index.html` in this folder, find the `FIREBASE_CONFIG` block near the top of
   the `<script>` section, and paste your six values in. It's safe to commit this to a
   public GitHub repo — Firebase web config is meant to be public; the Firestore rules
   above are what actually control access.

That's it — storage is done. (Free tier: 50,000 reads and 20,000 writes a day, far more
than a quiz session needs.)

---

## 2. Add a Gemini API key — do this once, so nobody else has to

No one needs Google-savvy for this. **You** get one free key, paste it once into the
code, and every quiz master just opens the app and starts building — no key box, no
prompts, nothing technical for them.

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey), sign in with
   any Google account, click **Create API key** — no card required.
2. Open `index.html`, find the `GEMINI_API_KEY` constant near the top of the
   `<script>` section, and paste your key between the quotes:
   ```js
   let GEMINI_API_KEY = "AIza...your key here...";
   ```
3. Save. The app detects this automatically — the "paste your API key" box on the setup
   screen disappears entirely once this is filled in, for every visitor.

**Trade-off to know about:** anyone who views your page's source code (right-click →
View Source) can see this key and technically use it against your free quota. For an
internal church tool this is normally a non-issue — it's a free-tier key, so the worst
case is someone burns through your daily quota, not a bill. If you want the key fully
hidden instead, the proper way is a tiny serverless proxy (e.g. a free Cloudflare
Worker) that holds the key server-side and the app calls that instead of Google
directly. That's a bit more setup — ask if you'd like help wiring that up.

---

## 3. Host it on GitHub Pages

1. Create a new GitHub repository (public or private — either works with GitHub Pages
   on a paid plan; public repos get Pages free).
2. Upload everything in this folder (`index.html`, `manifest.json`, `sw.js`, `logo.png`,
   `icons/`) to the repo root.
3. In the repo, go to **Settings → Pages**. Under "Build and deployment", choose
   **Deploy from a branch**, pick your main branch and the `/ (root)` folder, then Save.
4. GitHub will give you a URL like `https://yourname.github.io/your-repo/`. Give it a
   minute or two after the first deploy.
5. Open that URL — once Firebase is configured (step 1), everything should work:
   creating sessions, joining from other devices, generating questions, and installing
   the app to a phone's home screen (look for "Add to Home Screen" / an install icon in
   the browser bar).

---

## Limits — what "free" actually caps out at

**Firebase Firestore (storage), Spark free plan:**
| | Limit |
|---|---|
| Stored data | 1 GiB total |
| Reads | 50,000 / day |
| Writes | 20,000 / day |
| Deletes | 20,000 / day |
| Data transfer out | 10 GiB / month |

In practice: every contestant screen polls for updates every ~4 seconds while active,
and the master's live monitor polls every ~3.5 seconds. A mock quiz with, say, 15 kids
running for 30–40 minutes uses roughly a few thousand reads and a few hundred writes —
comfortably inside the daily free limits even running several sessions a day. You'd only
realistically approach the cap with a genuinely large event (100+ concurrent
contestants) or leaving many sessions open and idle for hours.

**Google Gemini API (question generation), free tier:**
| | Typical limit (Gemini Flash family) |
|---|---|
| Requests per minute | ~10–15 |
| Requests per day | ~250–1,500 |
| Tokens per minute | ~250,000–1,000,000 |

These numbers shift as Google adjusts capacity — check
[ai.google.dev/gemini-api/docs/rate-limits](https://ai.google.dev/gemini-api/docs/rate-limits)
for the live figures. In practice: generating a full 200-question pool takes roughly
7–10 API calls (30 questions per call). Even setting up several groups at once — each
with its own pool — stays in the range of 20–40 calls total, a small fraction of the
daily allowance. You could run several full mock quiz setups a day without going near
the limit. If you ever do hit a 429 error, it means too many requests too fast — wait a
minute and retry.

**Built into the app itself (not a Google/Firebase limit, just how it's built):**
- Question pools cap at 200 questions (a dropdown limit in the UI — raise it in the code
  if you ever want more; search for `[20,40,60,100,150,200]`).
- Each generation "batch" asks for 30 questions at a time, firing up to 4 batches at
  once, for up to 10 rounds per pool — plenty of headroom to hit any target up to 200.
- Contestant boards (number grids) are generated once per contestant and don't change
  size mid-session.

**GitHub Pages hosting:**
- Soft limit of ~1 GB per repository (this app is well under 1 MB).
- Soft bandwidth guidance of ~100 GB/month per site — far beyond what a church quiz
  night needs.
- No login/account limits since it's just static file hosting.

None of these are limits you're likely to bump into for a normal quiz bee — they only
start to matter at genuinely large scale (hundreds of simultaneous contestants across
many sessions, run constantly, every day).

---

## Notes

- The number of questions per pool caps out around 200 — that's a deliberate limit in
  the app, not a Gemini restriction.
- If question generation stops working later, it's almost always one of: an expired/
  invalid Gemini key, or Google retiring the free model named in `GEMINI_MODEL` near the
  top of the script — check [aistudio.google.com](https://aistudio.google.com) for the
  current free-tier model name and swap it in.
- Everything runs client-side; there's no backend server to maintain.
