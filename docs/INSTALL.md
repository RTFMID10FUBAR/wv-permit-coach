# Installing WV Permit Coach on a Phone

The app is a PWA: it installs from the browser, then runs with no internet at all.
No app store, no account, no sign-up.

Everything below was run and verified on 2026-09-14.

---

## The quickest route: install it over your home Wi-Fi

This serves the real production build from the Mac and installs it on the phone. The
phone only needs the network during install — after that the app works offline, including
with the phone in airplane mode.

### 1. Build and serve (on the Mac)

```bash
cd /Volumes/JarvisSSD/WV_DMV_Learner_App/app
npm install          # first time only
npm run build
npx vite preview --port 4173 --host
```

`--host` is the part that matters — without it the server only listens on localhost and
the phone cannot reach it.

Vite prints the addresses it is listening on, for example:

```
➜  Local:   http://localhost:4173/
➜  Network: http://192.168.1.3:4173/     en0
```

Use the **en0** address — that is the Mac's address on the Wi-Fi network. It will be
different on a different network; take it from the output rather than copying the example.

To find it again later:

```bash
ipconfig getifaddr en0
```

### 2. Install on the phone

Put the phone on the **same Wi-Fi network** as the Mac, then:

**Android (Chrome)**
1. Open `http://192.168.1.3:4173` (substitute the address from step 1).
2. Tap the **⋮** menu.
3. Tap **Add to Home screen** (it may read **Install app**).
4. Confirm.

**iPhone (Safari)**
1. Open the same address.
2. Tap the **Share** button.
3. Tap **Add to Home Screen**.
4. Confirm.

The app then appears as an icon on the home screen and opens full-screen without browser
chrome.

### 3. Confirm it really works offline

Worth doing once, because it is the whole point:

1. Open the app from the home screen icon.
2. Turn on **airplane mode**, or stop the `vite preview` server on the Mac.
3. Open the app again — every lesson, question, mock exam and your saved progress must
   still work.

If it does not, the service worker had not finished caching. Reopen it once with the
network available and try again.

---

## Notes

**Your progress is stored on the phone.** It is never uploaded anywhere. Clearing the
browser's site data or uninstalling the app erases it, so use **Progress → Export
Progress** first if you want to keep a record.

**After an update**, the app fetches the new version in the background and applies it the
next time it is opened. If it looks unchanged after a rebuild, fully close it and reopen.

**The dev server is not the app.** `npm run dev` is for development and does not produce
the offline service worker. Always install from `npm run build` + `npm run preview`.

**The Mac does not need to stay on.** Once the app is installed on the phone, the server
is irrelevant — the phone has its own copy.

---

## Alternative: host it anywhere static

`npm run build` produces `app/dist/`, which is a plain static site. It can be dropped on
any static host (GitHub Pages, Netlify, Cloudflare Pages, a USB stick served locally) and
installed the same way. The app makes no network calls of its own and needs no backend.

Two requirements for PWA install to be offered:

- served over **HTTPS**, or from `localhost`/a local network address
- `manifest.webmanifest` and `sw.js` served from the same origin as the page

---

## If an APK is wanted instead

An APK is not required — the PWA installs to the home screen and behaves the same for
studying. If a true APK is wanted later, the same tested build can be wrapped with
Capacitor. See the final report in the repository for what is and is not present on this
machine for that.
