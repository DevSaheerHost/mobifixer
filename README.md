# Mobile Shop Management WebApp

## Overview
This web application helps mobile shop owners track and manage their daily workflow efficiently.  
It provides a simple CRUD (Create, Read, Update, Delete) system for all customer data and service records.

---


> 📢 **New version information** is available in [CHANGELOG.md](./CHANGELOG.md)

## Features in v1.3.0
- Redesigned "Add Customer" button on Home screen
- Button animates while scrolling
- Two new input fields for advance , approx amounts and notes

## Features
- **Add new customer:** Capture name, phone number, mobile model, complaints, and other details.  
- **View customer list:** Quickly browse all customers added so far.  
- **Edit customer details:** Update information as required.  
- **Delete records:** Remove old or incorrect entries.  
- **Responsive UI:** Works on desktop and mobile devices.  
- **Search & filter:** Easily find customers or specific complaints.  

---

## Usage
1. Open the webapp in a browser or download the APK.
2. Click **Add Customer** to create a new entry.  
3. Fill in the details: name, number, model, complaints.  
4. Save to add to the list.  
5. Use the **Edit** or **Delete** buttons to manage existing entries.  

---

## Future Updates (Planned)
- Analytics dashboard for sales and repairs.  
- inventory management system.

---

## Building the Android app

```bash
npm ci
node scripts/build-www.mjs      # assemble www/, the payload that ships in the APK
npx cap sync android            # copy it into android/ with the plugins
cd android && ./gradlew assembleDebug
```

Needs Java 21 and an Android SDK with `platforms;android-36` and
`build-tools;36.0.0` (the versions `android/variables.gradle` pins), plus
`android/local.properties` containing `sdk.dir=/path/to/android-sdk`. The
Capacitor CLI requires Node 22 or newer.

Every push also builds the debug APK in CI and uploads it as the
`mobifixer-debug-apk` artifact, so a build is downloadable without a local
Android Studio.

### Release signing

A debug APK is signed with a throwaway key Android generates. A release build
needs a key that is yours and stays yours: **whoever holds it can ship an
update that installs over a real shop's app, and losing it means you can never
update the app again.** Back it up somewhere other than this repo.

Create one once:

```bash
keytool -genkeypair -v -keystore mobifixer-release.jks \
  -alias mobifixer -keyalg RSA -keysize 2048 -validity 10000
```

Then tell Gradle where it is, in **`android/keystore.properties`** — git-ignored,
never committed:

```properties
storeFile=/absolute/path/to/mobifixer-release.jks
storePassword=...
keyAlias=mobifixer
keyPassword=...
```

`cd android && ./gradlew assembleRelease` now produces a signed APK at
`android/app/build/outputs/apk/release/app-release.apk`.

With none of this configured the release build still runs, but warns and
produces `app-release-unsigned.apk` instead of `app-release.apk` — the name is
the giveaway, and an unsigned APK will not install on a phone.

### Cutting a release

`.github/workflows/release.yml` builds the signed APK, publishes it as a
GitHub Release and points `updates/apk.json` at it. It is driven by a tag, not
by every push, because a release installs over a real shop's app:

```bash
# bump the version, add a CHANGELOG entry under ## [5.1.1], commit, then
git tag v5.1.1 && git push origin v5.1.1
```

The tag has to match `package.json`, which is also the APK's `versionName` and
what the updater compares against — the workflow refuses to run if they
disagree. `versionCode` is derived from the same place (`5.1.1` → `50101`), so
minor and patch have to stay under 100.

Add these four **repository secrets** first (Settings → Secrets and variables →
Actions). Without them the workflow stops at the first step rather than
publishing something that will not install:

| secret | what it holds |
|---|---|
| `MF_KEYSTORE_BASE64` | the keystore itself: `base64 -w0 mobifixer-release.jks` |
| `MF_KEYSTORE_PASSWORD` | store password |
| `MF_KEY_ALIAS` | key alias |
| `MF_KEY_PASSWORD` | key password |

A keystore is a binary, so it travels base64-encoded; the job decodes it to a
path outside the workspace and deletes it again whatever happens. Before
publishing, the job runs `apksigner verify` and fails unless it prints
`Verifies` — an unsigned APK reaching the Releases tab would be worse than a
red build. `workflow_dispatch` runs it with `dry_run` on by default, which
builds and verifies but publishes nothing.

Two manifests end up driving two different kinds of update:

| | replaces | lives at |
|---|---|---|
| `updates/web.json` | HTML, CSS, JavaScript — almost every change | Vercel, from this repo |
| `updates/apk.json` | the app itself, when the native side moves | Vercel, pointing at the Release asset |

The APK is attached to the Release rather than committed here: a permanent
public URL that needs no GitHub login, and no 8MB binary per release in the
repository.

### Updating the app without a new APK

The APK carries its own copy of the site, so editing the website reaches
browser users and nobody else. `@capgo/capacitor-updater` closes that gap: the
app polls `https://mobifixer.vercel.app/updates/web.json`, downloads the
bundle it names, and applies it **at the next launch** — never mid-session,
because reloading under someone halfway through booking in a phone would lose
what they typed. If the new bundle fails to start, `notifyAppReady` never
fires and the next launch rolls back to the one the APK shipped with.

`scripts/release-web.mjs` writes both files, and CI runs it on every push to
`main`:

```bash
node scripts/build-www.mjs
node scripts/release-web.mjs --check   # say what would happen, write nothing
node scripts/release-web.mjs           # write updates/web.json + the bundle
```

It publishes only when **both** are true:

1. the Mobifixer app's own files changed, and
2. `package.json` carries a higher version than the published one.

The first condition is the important one. This repo holds several apps, and a
change to one of the others is not a change to this app: it must not ask a
shop to restart for something they cannot see. So the trigger is a hash over
`APP_PATHS` in the release script rather than over the whole payload. Keep
that list in step with `build-www.mjs`.

`cashbook/`, `accessories/`, `ordertraker/` and `invoice/` are not in the
payload at all. They used to be — 7.1MB of a 9.4MB payload — and nothing in
Mobifixer could reach any of them: `accessories` is opened by an absolute
`github.io` URL, which loads the website copy, and the rest are not linked
at all. Dropping them took the payload to 2.4MB and the over-the-air bundle
to 1.4MB, which is what a shop on mobile data downloads per update. CI fails
if one reappears in the APK.

The second makes a release deliberate. The shop is shown what changed, and
that text is the `CHANGELOG.md` section for the version — so add an entry
under `## [x.y.z]` when you bump it, or the notice will name a version with
nothing to say about it. An app change with no version bump is reported in the
CI summary and skipped, not published.

### A Play Store build

Google Play forbids an app updating itself, so a Play build must drop
`REQUEST_INSTALL_PACKAGES` from `android/app/src/main/AndroidManifest.xml` and
set `SELF_INSTALL = false` in `native.js`. The over-the-air web updates keep
working either way, because they replace HTML and JavaScript rather than the
app.

---
