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

#### Two caveats on the claim, and what to do about them

While the rules are still open, **the email check in `resolveMembership` runs only in
our own client**. Anyone can open a console and write `/users/{shop}/members/{theirUid}`
directly. So the claim is a convenience for collecting the mapping, not a control — and
the coverage number Phase 2 keys on is itself forgeable.

That is not a regression (with open rules an attacker can already write the whole
ledger), but it has two consequences worth planning around:

1. **A server-side backfill is strictly better than the client claim.** One run of
   `admin.auth().getUserByEmail(signupInfo.email)` with a service credential maps every
   shop deterministically, with nothing to race and no public email carve-out needed.
   Write those records with `claimedVia: 'backfill'`; `audit-membership.mjs` reports
   provenance and warns when a shop's mapping is only client-claimed.
2. **`signupInfo.email` is itself writable today.** Someone could point a shop's signup
   email at an address they control, claim it legitimately, and remove the real owner's
   entry — a lockout that would survive into the rules phase. The backfill closes this
   by resolving uids before anyone can poison the anchor.

Membership records deliberately carry **no `role`**. Owner and staff share one Auth
account, so there is no uid-level role to record, and a wrong-but-unused field would
mislead whoever writes the rules later.

#### Before Phase 3: capture the rules that are live right now

**Nobody currently knows what the production rules are** — they were only ever edited in
the console, and this repo has never held a copy. Export them from
Firebase console → Realtime Database → Rules into `firebase/cashbook.rules.CURRENT.json`
(and the same for the service app). That file is the only rollback if a rules deploy
goes wrong.

**Phase 3 — rules.** Only after Phase 2 has been stable. See the blockers in
`cashbook.rules.json`; the pre-login read of `/users/{shop}` and the root-level ledger
path are the two things most likely to take the app down.

---

## F4 — Service app: any account could open any shop  🔴 critical

Same shape as F1, in the other app, found later. The gate was `main.js`:

```js
const shopName = localStorage.getItem('shopName')
if(!shopName) location='./auth/index.html'
```

`onAuthStateChanged` required an account in `c24o-c038b` — and the signup page hands
one to anybody. Nothing tied the account to the shop, so: sign up, set
`localStorage.shopName` to another shop, reload, and you had their customers, phone
numbers and amounts.

### Status: Phase 1 shipped (record + log, enforce nothing)

In `main.js`, marked `########## SHOP ACCESS ##########`:

1. `resolveShopAccess(shop, user)` → `member` / `claimed` / `no-record` / `mismatch`,
   against `owner.uid`, the legacy top-level `uid`, and a new additive
   `shops/{shop}/members/{uid}` map.
2. A known `owner.uid` is backfilled into the members map (`claimedVia: 'owner-uid'`);
   a legacy shop with no uid at all claims for the account whose email matches the
   shop record (`claimedVia: 'client-claim'`). Same caveat as F1: a client claim is
   only as strong as the rules, and the rules are still open.
3. Outcome and uid go to `shops/{shop}/authAudit`. No email, password or token.
4. `ENFORCE_SHOP_ACCESS = false`. Only a definite `mismatch` is ever a denial;
   offline, unreadable and unknown all stay allowed, deliberately.

Tests: `scripts/test-shop-access.mjs`, in CI.

**Phase 2 — measure.** `node scripts/audit-shop-access.mjs <export.json>` reports
READY / NEEDS-MIGRATION / AT-RISK per shop, plus mapping provenance. Every active shop
must read READY before `ENFORCE_SHOP_ACCESS` is flipped, or a real shop loses access to
its own work.

---

## F5 — Signup could wipe a shop  🟠 fixed

`auth/main.js` wrote a new shop with `set()` on `shops/{name}` — a whole-node replace.
Signing up on a name that already existed replaced that shop's services, stock and staff
with an empty skeleton. This actually happened; commit `f6bdf5b` ("bug fixed : sugnup
data lose") added a client-side `exists()` check afterwards, but it ran *after* the Auth
account was created and check-then-write can be raced.

Now: the name is checked before the Auth account exists, and the write is a
`runTransaction` that aborts when the node is present, so the server refuses the
overwrite regardless of what the client believes. An account created for a shop that
then failed to be created is deleted rather than left orphaned — previously that email
could never be used to sign up again.

Google sign-in was also removed. It derived the shop name from the email local part
(`saheer@gmail.com` → shop `saheer`) and signed the person into that shop if it existed.
The buttons were already `hidden disabled` in `auth/index.html`, so nobody could reach
it, but the handler was one class change away from live.

---

## Export, 2026-09 — what the live database actually contains

One export of `c24o-c038b`, read locally with `scripts/audit-shop-access.mjs`. **9 shops.**

* **No shop carries a plaintext password.** Every one is on Firebase Auth. F2's second step
  turned out to be already true in the data; the migration branch was dead code.
* **Every shop has a uid the rules can match** — `owner.uid` on seven, a top-level `uid` on
  two, and one shop with both.
* **Nine shops, nine different accounts.** No email owns more than one shop, so the operator
  can only sign into `developer`. Enforcement could not be validated by logging in.
* **One shop carries two different uids.** `mobifixer` - 1248 jobs, the real production shop -
  has `owner.uid` from signup *and* a different top-level `uid` written later by the migration
  branch. `resolveShopAccess()` read `ownerObj.uid || shopData.uid`, took the first and never
  looked at the second: if the live account is the other one, enforcement would have signed
  that owner out of their own data. The first simulation missed it because the expected uid was
  computed with the same wrong rule as the code. Fixed - both locations are accepted, matching
  what the rules already accept.
* Re-simulated with expectations derived from the records rather than from the code: for every
  shop, **every uid it carries** resolves to `member`, an account with the **right email but an
  unrecognised uid** resolves to `member`, and a stranger resolves to `mismatch`.

### Why enforcement is safe without logging into all nine

Authorization now has two anchors, either sufficient:

1. the uid, in either location the records use, or
2. **the email on the shop record.**

Login signs in *as* that address, so anyone reaching a shop legitimately holds it; Firebase
Auth will not issue a second account for an address already taken, so it cannot be borrowed;
and once the rules are on, only the owner can change it. It is not a weaker anchor than the
uid - before the rules are on, nothing about the shop is protected either way.

The consequence is that a stale or missing uid is no longer a lockout: the owner still matches
on email and the record is repaired underneath them (`claimedVia: 'owner-email'`). The attack
enforcement exists to stop - sign in as your own shop, then point `localStorage.shopName` at
someone else's - fails on exactly this check, because the email will not match.
* Three record shapes exist, and all three are now handled: `owner` as an object, `owner` as a
  bare name string with the email at the top level (the two made by the removed Google
  sign-in), and both together.
* Outside `shops/` the root still holds a legacy `service` node (103 records) and `lastSn`
  from before the multi-tenant restructure. **Nothing in the codebase reads them.** They are
  world-readable today; the root deny in `service-app.rules.json` closes them. The data is
  left in place.

### Two things the export exposed

**Two shops could not log in at all.** `babushop` and `sheerbabu549` store `owner` as a
string, so `shopData.owner.email` was `undefined` and login fell through to *"Shop found, but
no valid login data!"*. Reset already had the `|| shopData.email` fallback; login did not.
Fixed.

**The rules as written would have broken login for all nine shops.** Login and reset read the
whole `shops/{name}` node before signing in. RTDB evaluates permission at the location you
read, so a public carve-out on `owner/email` does **not** rescue a denied read of the parent.
Both now read only the two public email paths through `lookupShopEmail()`, which is what makes
the rules applicable at all. This had to ship before any rule.

---

## F2 — Service app must read shop records *before* authenticating  🟠 closed in code

`auth/main.js` login does `get(child(shopRef, identifier))` **before**
`signInWithEmailAndPassword` — it needs the shop's email to log in. So today the rules
must permit an **unauthenticated read of `shops/{shop}`**.

Worse, the legacy branch reads `shopData.password` — a **plaintext password** — from that
same publicly-readable record.

**Both steps are done:**
1. ✅ `lookupShopEmail()` reads only `shops/$shop/owner/email` and `shops/$shop/email`. Both
   are public in `service-app.rules.json`; everything else requires auth.
2. ✅ The plaintext branch is gone, along with the `createUserWithEmailAndPassword` call that
   sat inside the *login* handler. The export confirms no `password` field is left to delete.

What remains is deploying the rules, which is a console action and still pending.

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
