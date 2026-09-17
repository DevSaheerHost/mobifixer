# Firebase security audit — findings & proposed rules

**Status: no Firebase Security Rules have been applied.** The `.rules.json` files here
are proposals only. Rules are edited in the Firebase console; this repo had none, so
they were invisible to review. Apply only after reading the constraints below and
testing in the Rules Playground — a wrong rule locks out live shops.

F1 now has **client-side Phase 1 shipped** (see its Status section). That is code, not
rules, and it denies nobody yet.

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

The database could not save us either: **cashbook stored no uid anywhere**.
`signupUser()` wrote `{username, fullname, role, signupInfo:{device,fullname,email}, logins}` —
no `uid`, and `staff` is keyed by `fullname`. There was **no uid→shop mapping to write a
rule against**. Phase 1 below starts building one.

### Status: Phase 1 shipped (record + log, enforce nothing)

Confirmed with the operator: **staff sign in with the owner's email and password**.
`signupUser()` refuses an existing username, so staff have no way to register their own
account for an existing shop. In practice that means **one Firebase Auth account per
shop**, and owner-vs-staff is only the name typed at login.

That splits the problem cleanly:

* **Authorization** (which shop may this account open) — keyed on uid. This is the hole.
* **Display role** (owner or staff) — stays name-based, because staff share the owner's
  uid and no uid check can tell them apart. It is a guard rail, not a boundary (F3).

**Phase 1 — done, in `cashbook/main.js`:**
1. `signupUser()` writes `members/{uid}` as part of the same `/users/{shop}` write, so new
   shops are born mapped.
2. `resolveMembership()` classifies every login as `member` / `claimed` / `no-record` /
   `mismatch` and records it to `/authAudit/{shop}` (uid and outcome only — no email,
   password or token). A legacy shop with no `members` node self-claims for the account
   whose email matches `signupInfo.email`. An attacker cannot forge that anchor: the
   address is already registered in Firebase Auth, and Auth refuses a duplicate
   password account for it.
3. `detectRole()` no longer uses `.includes()`. Typing `a` used to match almost any owner
   name and hand out owner; it is now an exact match against the signup name or the
   current profile name, consistent with `handleStaffAccessControl()`.
4. `loadUserFromDB()` is gated on `onAuthStateChanged` instead of running at module load
   from `localStorage` alone.

`ENFORCE_MEMBERSHIP = false`, so nobody is denied yet. Regression tests for all of this
live in `scripts/test-auth.mjs` and run in CI.

**Phase 2 — enforce.** Run `node scripts/audit-membership.mjs <firebase-export.json>`.
When every active shop reports READY, set `ENFORCE_MEMBERSHIP = true`. Rollback is
flipping it back and redeploying; no data is touched.

**Phase 3 — rules.** Only after Phase 2 has been stable. See the blockers in
`cashbook.rules.json`; the pre-login read of `/users/{shop}` and the root-level ledger
path are the two things most likely to take the app down.

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
security.

For cashbook this is now a **known, accepted limitation** rather than an oversight:
staff share the owner's Auth account, so there is no separate identity to bind a role
to. Making the role a real boundary would mean giving every staff member their own
login — a product change, not a rules change. F1's membership map fixes the
*cross-shop* hole; it does not make owner-vs-staff enforceable.

---

## Applying safely

1. Firebase console → Realtime Database → Rules → **copy the current rules somewhere first**.
2. Paste the proposed file, use **Rules Playground** to simulate: owner read, staff read,
   a stranger's uid, and unauthenticated login lookup.
3. Watch for denied reads in the app after rollout; revert instantly if login breaks.
