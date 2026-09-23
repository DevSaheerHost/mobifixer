# Mobifixer push sender

Sends job reminders to phones while the app is closed.

FCM does not schedule anything — something has to wake at the due time, find what is due and
send it. That is this Worker, on a one-minute cron. It reads reminders from the same Realtime
Database node the app writes (`shops/{shop}/reminders/{sn}`), so there is no second copy to
keep in sync.

Cloudflare's free tier covers this: cron triggers are included and no card is required.

---

## Setup

### 1. Get the public VAPID key

Firebase console → **Project settings** → **Cloud Messaging** → *Web Push certificates* →
**Generate key pair**. Copy the key (it starts `B…`).

Paste it into `main.js`:

```js
const PUSH_VAPID_KEY = 'BPaste-your-key-here';
```

This one is **public by design** and safe to commit. Until it is set, the app skips push
entirely and behaves exactly as before.

### 2. Create a service account key

Firebase console → **Project settings** → **Service accounts** → **Generate new private key**.
A JSON file downloads.

**Do not commit it, and do not paste it into a chat, an issue, or a message.** It grants read
and write access to the whole project — every shop's customers, phone numbers and amounts — and
lets the holder send push as you. It belongs in exactly one place: a Cloudflare secret.

If it is ever exposed, treat it as compromised immediately:

1. Google Cloud console → **Service Accounts** → the `firebase-adminsdk-…` account → **Keys**
2. Delete the exposed key id — this invalidates it at once, even for someone who already copied it
3. **Add key → Create new key → JSON**
4. `wrangler secret put FIREBASE_SERVICE_ACCOUNT` with the new one

`scripts/check.mjs` fails the build if a PEM private key or a service-account JSON is ever
committed, but it cannot help with a key pasted somewhere else — rotation is the only fix.

### 3. Deploy

```bash
cd push-worker
npx wrangler login
npx wrangler deploy

# paste the entire JSON file contents when prompted:
npx wrangler secret put FIREBASE_SERVICE_ACCOUNT

# any random string; enables the manual /run check below:
npx wrangler secret put RUN_KEY
```

### 4. Check it

```bash
curl https://mobifixer-push.<your-subdomain>.workers.dev/health          # -> ok
curl "https://mobifixer-push.<your-subdomain>.workers.dev/run?key=YOUR_RUN_KEY"
# -> {"shops":1,"due":0,"pushes":0,"pruned":0}
```

Then the real test: set a reminder two minutes out, **lock the phone**, and wait.

---

## How a reminder travels

1. Someone taps **Remind** on a job → written to `shops/{shop}/reminders/{sn}`.
2. The browser registers for push and stores its token at `shops/{shop}/pushTokens/{deviceId}`.
3. Each minute this Worker reads the shop list (`?shallow=true`, so it stays small), finds
   reminders whose `dueAt` has passed and that are not yet `fired`, and sends one data-only
   FCM message per device.
4. `sw.js` receives the `push` event and draws the notification with the Mobifixer logo.
5. The reminder is marked `fired`, which also stops the in-app ticker repeating it.

Messages are **data-only** on purpose. With a `notification` payload FCM's own service worker
draws the notification and the icon, badge and tag would be out of our hands.

## Notes

- **Dead tokens are pruned.** When FCM reports a token as unregistered, that row is deleted, so
  old phones don't accumulate.
- **A reminder is marked fired even if delivery failed.** The in-app path still surfaces it when
  the shop next opens the app, and a reminder that retried forever would become spam.
- **Cost.** One invocation a minute is ~43k/month, inside Cloudflare's free allowance.
- **Security.** `FIREBASE_SERVICE_ACCOUNT` is a Cloudflare secret, never in this repo. If it
  ever leaks, revoke that key in the Firebase console and generate a new one. Note that the
  database currently has **no security rules**, so push tokens — and all customer data — are
  world-readable; that is tracked separately in `firebase/SECURITY-AUDIT.md`.
