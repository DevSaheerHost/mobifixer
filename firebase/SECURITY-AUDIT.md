# Firebase security audit — findings & proposed rules

**Status: documentation only. Nothing here has been applied.** Rules are edited in the
Firebase console; this repo had none, so they were invisible to review. Apply only
after reading the constraints below and testing in the Rules Playground — a wrong
rule locks out live shops.

There are **two separate Firebase projects**:

| App | Project | Data root |
|---|---|---|
| Service app (repo root) | `c24o-c038b` | `shops/{shopName}/…`, `clicks/…` |
| Cashbook (`/cashbook`) | `recat-auth-test` | `{username}/…`, `/users/{username}/…` |

---

## F1 — Cashbook login never checks that your account belongs to the shop  🔴 critical

`cashbook/main.js` → `loginUser()`:

```js
const dbUser = await getUser(username);                 // only checks the shop EXISTS
await auth.signInWithEmailAndPassword(email, password); // signs in ANY valid account
const role = detectRole(dbUser, fullname);              // then treats you as a member
```

Nothing links the signed-in account to `username`. Anyone holding **any** valid account
in `recat-auth-test` can type **someone else's shop username** and the client hands them
that shop's ledger. `detectRole` then grants **owner** to anyone whose typed name is a
substring of the stored owner name.

The database cannot save us here either: **cashbook stores no uid anywhere**.
`signupUser()` writes `{username, fullname, role, signupInfo:{device,fullname,email}, logins}` —
no `uid`, and `staff` is keyed by `fullname`. So there is currently **no uid→shop mapping
to write a rule against**.

**Fix order (code first, then rules):**
1. On signup, also write `members/{uid}: true` and `ownerUid: uid` under `/users/{username}`.
2. On login, after `signInWithEmailAndPassword`, verify `members[auth.uid]` exists; if not,
   sign out and refuse — instead of trusting the typed username.
3. Backfill `members` for existing shops (one-off script, owner's uid from their email).
4. Only then apply `cashbook.rules.json`, which gates everything on membership.

---

## F2 — Service app must read shop records *before* authenticating  🟠

`auth/main.js` login does `get(child(shopRef, identifier))` **before**
`signInWithEmailAndPassword` — it needs the shop's email to log in. So today the rules
must permit an **unauthenticated read of `shops/{shop}`**.

Worse, the legacy branch reads `shopData.password` — a **plaintext password** — from that
same publicly-readable record.

**Fix order:**
1. Narrow the pre-auth read to just the email: expose `shops/{shop}/owner/email` publicly and
   require auth for the rest (see `service-app.rules.json`, `PUBLIC_EMAIL_LOOKUP`).
2. Retire the plaintext-password branch and delete every remaining `password` field.
   Un-migrated shops should go through password reset instead.

---

## F3 — Role is self-selected  🟠

Both apps let the person pick their own role at login (service app: radio buttons;
cashbook: `detectRole` on a typed name). Client-side role gates — including the
owner-only delete added earlier — are therefore a guard rail against accidents, not
security. Real enforcement needs the uid→role mapping from F1 plus rules.

---

## Applying safely

1. Firebase console → Realtime Database → Rules → **copy the current rules somewhere first**.
2. Paste the proposed file, use **Rules Playground** to simulate: owner read, staff read,
   a stranger's uid, and unauthenticated login lookup.
3. Watch for denied reads in the app after rollout; revert instantly if login breaks.
