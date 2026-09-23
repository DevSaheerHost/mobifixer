import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

// Realtime Database import
import { getDatabase, ref, runTransaction }
from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  deleteUser
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";


const firebaseConfig = {
  apiKey: "AIzaSyAWQP1HENutTN4cPyMM86norOGMSXDnc2g",
  authDomain: "c24o-c038b.firebaseapp.com",
  databaseURL: "https://c24o-c038b-default-rtdb.firebaseio.com",
  projectId: "c24o-c038b",
  storageBucket: "c24o-c038b.firebasestorage.app",
  messagingSenderId: "418015450687",
  appId: "1:418015450687:web:3d0a9632558f242aad4a8a",
  measurementId: "G-X98S86SEV2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// Reference to your data
//const itemsRef = ref(db, "service");
const shopRef = ref(db, "shops/")

//==========//

const $ = s => document.querySelector(s);

let lastHash = location.hash;
let direction = "forward"; // default

window.addEventListener("popstate", () => {
  // back pressed
  direction = "backward";
});

const router = () => {
  const pages = document.querySelectorAll("main");
  pages.forEach(m => m.classList.add('hidden'));

  let target;
  switch (location.hash) {
    case "#/login":
      target = $("#login-page");
      break;
    case "#/signup":
      target = $("#signup-page");
      break;
    case "#/reset":
      target = $("#reset-page");
      break;
    default:
      target = $("#home-page");
  }

  // apply animation
  
  target.classList.remove('hidden')
  

  lastHash = location.hash;
  direction = "forward"; // reset
};

window.addEventListener("hashchange", router);
router();

$(".get-started-btn").onclick = () => (location.hash = "#/login");



import { get, child } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

// $('.logo').onclick = async (e) => {
//   e.preventDefault();
//   const email = $('#login_businessName').value.trim(); // <-- here use email instead of name
//   const password = $('#login_businessPass').value.trim();

//   if (!email || !password) {
//     alert("Please enter all fields!");
//     return;
//   }

//   $('.loader').classList.remove('hidden');

//   try {
//     const userCredential = await signInWithEmailAndPassword(auth, email, password);
//     const user = userCredential.user;

//     localStorage.setItem('uid', user.uid);
//     localStorage.setItem('shopEmail', user.email);
//     alert("✅ Login successful!");
//     location = "/";
//   } catch (err) {
//     console.error(err);
//     alert("❌ Login failed: " + err.message);
//   } finally {
//     $('.loader').classList.add('hidden');
//   }
// };


// The shop's login email, and nothing else.
//
// This used to read the whole shops/{name} node before signing in. Realtime
// Database evaluates permission at the location you read, so once the security
// rules require auth on shops/$shop that read is denied outright - making
// shops/$shop/owner/email public would not have rescued it, and login would
// have broken for every shop the moment rules went live.
//
// Two paths because the records have two shapes: shops created by signup keep
// the email on owner, and the two created by the old Google sign-in kept it at
// the top level with `owner` as a bare name string. Both are readable
// unauthenticated by design; everything else needs to be signed in.
const lookupShopEmail = async (identifier) => {
  const [onOwner, onShop] = await Promise.all([
    get(child(shopRef, `${identifier}/owner/email`)),
    get(child(shopRef, `${identifier}/email`))
  ]);
  const email = (onOwner.exists() && onOwner.val()) || (onShop.exists() && onShop.val()) || '';
  return String(email).trim();
};

$('#login').onclick = async (e) => {
  e.preventDefault();

  const identifier = $('#login_businessName').value.trim().toLowerCase();
  const password = $('#login_businessPass').value.trim();

  if (!identifier || !password) {
    alert("Please enter all fields!");
    return;
  }

  $('.loader').classList.remove('hidden');

  try {
    // The plaintext-password branch that used to sit here is gone. It read a
    // password out of a publicly readable node and, on a first login, called
    // createUserWithEmailAndPassword - a login handler that created accounts.
    // The database export confirms no shop carries a password any more; every
    // one is on Firebase Auth. A shop that somehow still had one goes through
    // Forgot password instead.
    const email = await lookupShopEmail(identifier);

    if (!email) {
      // Either no such shop, or a record with no email on it. Deliberately the
      // same message: a login form should not confirm which shops exist.
      alert("❌ Shop not found, or it has no login email. Check the business name.");
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      localStorage.setItem('shopName', identifier);
      localStorage.setItem('uid', user.uid);
      alert("✅ Logged in (FB Account)");
      location = "/";
    } catch (err) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" ||
          err.code === "auth/user-not-found") {
        alert("❌ Wrong password!");
      } else if (err.code === "auth/too-many-requests") {
        alert("⚠️ Too many attempts. Please wait a few minutes and try again.");
      } else {
        console.error(err);
        alert("❌ Login failed: " + err.message);
      }
    }
  } catch (err) {
    console.error(err);
    alert("❌ Error: " + err.message);
  } finally {
    $('.loader').classList.add('hidden');
  }
};


// 🔐 Forgot password → send Firebase reset email to the shop's registered email
$('#reset-btn').onclick = async (e) => {
  e.preventDefault();

  const identifier = $('#reset_businessName').value.trim().toLowerCase();

  if (!identifier) {
    alert("Please enter your Business Name.");
    return;
  }

  $('.loader').classList.remove('hidden');

  try {
    // Same narrow lookup as login: only the public email paths, never the whole
    // shop node, so this keeps working once the security rules are applied.
    const email = await lookupShopEmail(identifier);

    if (!email) {
      alert("❌ Shop not found, or no email is registered for it. Check the business name, or contact support.");
      return;
    }

    // The checks that used to sit here - "does this shop have a Firebase Auth
    // account yet" and "is it still on a plaintext password" - are gone with
    // the migration branch. The database export confirms every shop is on
    // Firebase Auth, so a reset email always has an account to land on.
    //
    // Firebase's Email Enumeration Protection still resolves this call even
    // when an address has no account, so the wording below stays conditional
    // on purpose: it must not become a way to test whether an email exists.
    await sendPasswordResetEmail(auth, email);

    // mask the email a little for privacy
    const [user, domain] = email.split('@');
    const masked = `${user.slice(0, 2)}***@${domain || ''}`;
    alert(`✅ If an account exists for ${masked}, a password reset link has been sent. Check your inbox and spam folder.`);
    location.hash = "#/login";

  } catch (err) {
    console.error(err);
    if (err.code === "auth/user-not-found") {
      // Said "log in once with your current password first" when there was a
      // migration step to do. There isn't one any more, so that advice would
      // just send someone in a circle.
      alert("⚠️ No account was found for this shop's registered email. Please contact support.");
    } else if (err.code === "auth/invalid-email") {
      alert("❌ The email on record is invalid. Please contact support.");
    } else if (err.code === "auth/too-many-requests") {
      alert("⚠️ Too many attempts. Please wait a few minutes and try again.");
    } else {
      alert("❌ Error: " + err.message);
    }
  } finally {
    $('.loader').classList.add('hidden');
  }
};


// Creating a shop. This used to lose data: the shop record was written with
// set(), which replaces the whole node, so signing up on a name that already
// existed replaced that shop's services, stock and staff with an empty
// skeleton. A client-side exists() check was added afterwards, but it ran
// AFTER the Auth account was created and check-then-write can be raced.
//
// Two changes below:
//   1. the name is checked BEFORE the Auth account exists, so a taken name no
//      longer strands the person with an account they cannot reuse - retrying
//      with a different shop name used to fail auth/email-already-in-use for
//      ever;
//   2. the write is a transaction that aborts when the node is already there,
//      so there is no ordering of events in which an existing shop is
//      overwritten. The server decides, not the client.
$('#signup').onclick = async (e) => {
  e.preventDefault();
  const userName = $('#signup_name').value.trim();
  const businessName = $('#signup_businessName').value.trim().toLowerCase();
  const businessEmail = $('#signup_businessEmail').value.trim();
  const businessPass = $('#signup_businessPassword').value.trim();

  if (!userName || !businessName || !businessEmail || !businessPass) {
    alert("Please enter all fields!");
    return;
  }

  $('.loader').classList.remove('hidden');

  let createdUser = null;
  try {
    // 1) Is the name free? Asked first, so a taken name costs nothing.
    const existing = await get(child(shopRef, businessName));
    if (existing.exists()) {
      alert("❌ This business name is already taken. Please choose another.");
      return;
    }

    // 2) Create the Firebase Auth account.
    const userCredential = await createUserWithEmailAndPassword(auth, businessEmail, businessPass);
    createdUser = userCredential.user;

    // 3) Create the shop, and only create it. Returning undefined aborts the
    //    transaction, so a name claimed in the meantime is left untouched.
    const result = await runTransaction(child(shopRef, businessName), (current) => {
      if (current !== null) return;   // already exists - abort, change nothing
      return {
        shop: businessName,
        owner: {
          name: userName,
          email: businessEmail,
          uid: createdUser.uid,
          createdAt: Date.now()
        },
        lastServiceSn: 0,
        service: {},
        staff: {}
      };
    });

    if (!result.committed) {
      // Somebody claimed the name between step 1 and step 3. Their shop is
      // untouched. Remove the account we just made so this email stays usable.
      try { await deleteUser(createdUser); } catch (_) {}
      createdUser = null;
      alert("❌ That business name was just taken. Please choose another.");
      return;
    }

    localStorage.setItem('shopName', businessName);
    localStorage.setItem('author', userName);
    localStorage.setItem('role', 'Shop Owner');

    alert("✅ Signup successful!");
    location.hash = "#/login";
  } catch (err) {
    console.error(err);
    // If the account was created but the shop was not, roll the account back
    // rather than leaving an email that can never be signed up again.
    if (createdUser) { try { await deleteUser(createdUser); } catch (_) {} }
    alert("❌ Error: " + err.message);
  } finally {
    $('.loader').classList.add('hidden');
  }
};

// Google sign-in removed. It derived the shop name from the email local part
// (saheer@gmail.com -> the shop named "saheer") and signed the person into that
// shop if it already existed, which is a straightforward takeover of any shop
// whose name matches somebody's email. The buttons were already hidden and
// disabled in auth/index.html, so nobody could reach it, but leaving the
// handler in place meant one stray class change would have switched it back on.
// Email + password login and the reset flow above cover everything it did.
