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

In CI, set these four as repository secrets instead of using the properties
file; the build reads either:

| | |
|---|---|
| `MF_KEYSTORE_FILE` | path to the keystore on the runner |
| `MF_KEYSTORE_PASSWORD` | store password |
| `MF_KEY_ALIAS` | key alias |
| `MF_KEY_PASSWORD` | key password |

The keystore itself is a binary, so a runner gets it by storing it
base64-encoded in a fifth secret and decoding it to a path during the job.

With none of this configured the release build still runs, but warns and
produces `app-release-unsigned.apk` instead of `app-release.apk` — the name is
the giveaway, and an unsigned APK will not install on a phone.

### A Play Store build

Google Play forbids an app updating itself, so a Play build must drop
`REQUEST_INSTALL_PACKAGES` from `android/app/src/main/AndroidManifest.xml` and
set `SELF_INSTALL = false` in `native.js`. The over-the-air web updates keep
working either way, because they replace HTML and JavaScript rather than the
app.

---
