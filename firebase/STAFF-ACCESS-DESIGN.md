# Staff access: sign up, ask to join, owner approves

**Status: proposed. Nothing in this document is implemented.**

You asked for: a staff member signs up against a live shop, the request appears on an admin
page, the owner approves, and from then on that person uses the app normally.

This is an authorization change, so per your own brief it is written down first and built only
once you have read it.

---

## 1. What is actually there today

There are **two separate identity systems** in the app, and only one of them is real.

### The real one: Firebase Auth + `shops/<shop>/members`

`onAuthStateChanged` → `resolveShopAccess(shop, user)` (`main.js`). It returns one of four
outcomes, and `ENFORCE_SHOP_ACCESS` is **already `true`**:

| outcome | meaning | what happens |
|---|---|---|
| `member` | this uid is in `shops/<shop>/members` | allowed |
| `claimed` | legacy shop with no uid; just mapped to this account | allowed |
| `no-record` | cannot tell — offline, unreadable, nothing to match on | allowed, deliberately |
| `mismatch` | the shop knows uids and this is not one of them | **signed out** |

A uid becomes a member by matching `owner.uid`, the legacy top-level `uid`, or `owner.email`.

**All three of those are the owner.** So today, a staff member who creates their own account
gets `mismatch` and is signed out. There is no path for anyone but the owner to hold a login.

The signup form (`auth/index.html`) only creates shops — name, business name, email, password,
button reads "Create shop". There is no "join an existing shop" anywhere.

### The other one: the name box

`shops/<shop>/staff/<key>` = `{ name, role, lastLogin }`, plus `localStorage.author` and
`localStorage.role`. You type a name; if it matches the owner you are the owner, if it matches a
staff entry you are that person, otherwise "Please request access from the shop owner".

This runs **after** you are already signed in — on the owner's account, because that is the only
one that gets in. It labels receipts and the activity log. It is not a security boundary and
nothing treats it as one.

Two consequences worth stating plainly:

- **Every staff member in every shop is currently sharing the owner's login.** The name box is
  a politeness, not a door.
- **There is no way to add a staff member from inside the app.** `shops/<shop>/staff` can only
  be populated by hand in the Firebase console. The code that reads it has no partner that
  writes it.

### A drift I found while reading

`firebase/service-app.rules.json` — the rules that are prepared but not deployed — grants access
only on `uid` or `owner/uid`. It does not mention `members` at all. If those rules went live
today, `resolveShopAccess` would be unable to write `members`, and any non-owner member would be
denied. The rules and the client have already gone out of step. Whatever we do here has to fix
that too.

---

## 2. The proposal

One new node, additive, beside the existing ones:

```
shops/<shop>/joinRequests/<uid> = {
  name:        "Raheem",                 // typed by the person asking
  email:       "raheem@example.com",     // from their Firebase account
  requestedAt: 1758790000000,
  status:      "pending" | "approved" | "rejected",
  decidedAt:   1758800000000,            // written on approve/reject
  decidedBy:   "<owner uid>"
}
```

Nothing existing moves. Nothing is deleted. A shop with no `joinRequests` behaves exactly as it
does now.

### The flow

**1. Staff creates an account.** The signup page gains a second choice: *Create a shop* (as now)
or *Join a shop*. Join asks for their name, the shop name, their email and a password. It
creates the Firebase account and writes `joinRequests/<uid>` with `status: 'pending'`. It writes
**nothing** to `members`, `staff`, `service` or anything else.

**2. They land on a waiting screen.** `resolveShopAccess` gains a fifth outcome, checked only on
the path that currently returns `mismatch`:

```
mismatch  → is there a joinRequests/<uid> for this shop?
              status 'pending'  → 'pending-approval'  → waiting screen, stay signed in
              status 'approved' → write members/<uid>, return 'member'
              status 'rejected' → 'mismatch' as now, signed out
              no request        → 'mismatch' as now, signed out
```

The waiting screen says who they asked, and offers *Sign out* and *Ask again*. It shows no shop
data, because nothing has been read.

**3. The owner sees it.** Settings → Staff grows a **Requests** section above the existing list:
name, email, when they asked, and **Approve** / **Reject**. It is only rendered for the owner —
`localStorage.role === 'Shop Owner'` today, and see the honesty section below about what that
is worth.

Approve asks for a role (Technician / Trainee Technician / Manager) and writes:

```
shops/<shop>/members/<uid>   = { name, role, claimedAt, claimedVia: 'owner-approved',
                                 approvedBy: <owner uid> }
shops/<shop>/staff/<uid>     = { name, role, lastLogin: null }
shops/<shop>/joinRequests/<uid>/status = 'approved'
```

Note `staff` is keyed by **uid** for new joiners, where today's entries are keyed by a push id.
`getStaff()` iterates `Object.entries`, so both shapes render; nothing needs migrating.

Reject writes `status: 'rejected'` and nothing else. The request row stays, so the same person
cannot quietly re-ask and slip through on a second look — and the owner can change their mind.

**4. Next load they are in.** `members/<uid>` exists → `member` → the app opens normally. Their
own name goes on their receipts and in the activity log, because `author` comes from the
approved record instead of a typed box.

---

## 3. What this is, and what it is not

**It is a workflow. It is not yet enforcement.**

Your database currently has no security rules deployed. It is world-readable and
world-writable. Anyone who knows the URL can write `shops/<shop>/members/<uid>` with one REST
call and skip every screen described above. That is true of `service`, `owner` and everything
else today; this feature does not make it worse, and it does not make it better.

The approval gate becomes a real boundary **only** when the rules land. So this work must ship
with the rules updated in the same change, ready to deploy:

```jsonc
"shops": {
  "$shop": {
    ".read":  "auth != null && (data.child('uid').val() === auth.uid
                             || data.child('owner/uid').val() === auth.uid
                             || data.child('members').child(auth.uid).exists())",
    ".write": "auth != null && (data.child('uid').val() === auth.uid
                             || data.child('owner/uid').val() === auth.uid
                             || data.child('members').child(auth.uid).exists()
                             || !data.exists())",

    "joinRequests": {
      "$uid": {
        // Anyone signed in may ask, for themselves only, and may read only
        // their own request - so a waiting screen works before membership.
        ".read":  "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid
                   && !newData.child('status').val().matches(/approved/)",
        "status": {
          // Only the owner may approve. Without this the whole thing is theatre:
          // the asker could write their own 'approved' and then their own member row.
          ".write": "auth != null
                     && (root.child('shops').child($shop).child('owner/uid').val() === auth.uid
                      || root.child('shops').child($shop).child('uid').val() === auth.uid)"
        }
      }
    },

    "members": {
      // The owner grants membership. A member cannot add another member.
      ".write": "auth != null
                 && (root.child('shops').child($shop).child('owner/uid').val() === auth.uid
                  || root.child('shops').child($shop).child('uid').val() === auth.uid)"
    }
  }
}
```

That `members` rule also closes something that exists right now: `resolveShopAccess` writes
`members/<uid>` from the client on the `owner-email` and `client-claim` paths. Under the rule
above those writes keep working for the owner and stop working for anyone else — which is the
intent, but it is a behaviour change on a live path and needs its own test.

**Two more things this does not do:**

- **`role` is still not a security boundary.** It decides what buttons are drawn, nothing more.
  A staff member who edits `localStorage.role` sees the owner's buttons. Making roles real means
  role checks in the rules, which is a further piece of work.
- **It does not retrofit the shops already running.** Every existing staff member keeps sharing
  the owner's login until they are invited through this flow. Nothing forces that, and nothing
  breaks if it never happens.

---

## 4. Backward compatibility

Per your brief, point by point.

- **Nothing is deleted or moved.** One new node, two new writes on approval, one new outcome.
- **No existing shop changes behaviour.** A shop with no `joinRequests` takes exactly the code
  path it takes today.
- **The only changed outcome is `mismatch`,** and only in the direction of being *less* harsh: a
  pending request gets a waiting screen instead of a sign-out. Nobody who is allowed in today is
  kept out, and nobody gets in without an explicit approval.
- **Reversible.** Delete `joinRequests` and the feature is gone; the `members` rows it created
  are the same shape as the ones `resolveShopAccess` already writes.
- **No rules deployed as part of this.** They are written, committed and left for you.
- **Missing records are handled explicitly.** No request → deny, as now. Unreadable → `no-record`
  → allowed, as now, because an unreadable node must never lock out a real person.

## 5. Test matrix

1. Owner of shop A signs in to shop A — allowed, unchanged.
2. Staff with an approved membership for A signs in to A — allowed.
3. The same staff member points `localStorage.shopName` at shop B — denied.
4. Staff with a **pending** request for A — waiting screen, stays signed in, reads no shop data.
5. Staff with a **rejected** request for A — signed out, as today.
6. A stranger with no request — signed out, as today.
7. An existing shop with no `members` and no `joinRequests` — owner still gets in on
   `owner.email`, exactly as now.
8. A request for a shop that does not exist — refused, nothing written.
9. Two shops, two owners: neither sees the other's requests.
10. The staff node keyed by push id (today) and by uid (new) both render in Settings.
11. Approving twice does not create two members or two staff rows.
12. Offline during the check — `no-record`, allowed, as now.

## 6. Cost, honestly

Roughly: a second mode on the signup page, one new outcome and branch in `resolveShopAccess`, a
waiting screen, a requests section in Settings, the approve/reject writes, the rules, and tests
for all of it. It touches the login path of a live app used by real shops, which is the part of
this codebase where a mistake is most expensive — so it wants to be its own change, on its own,
not folded in with anything else.

**Two questions before I build it:**

1. Should a rejected person be able to ask again, or stay rejected until the owner clears it?
   (Proposed above: stay rejected.)
2. Should the owner get a push notification when someone asks? The worker and the token plumbing
   are already there, so it is cheap — but it is the first notification the app would send that
   is not about a job.
