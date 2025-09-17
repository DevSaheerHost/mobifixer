//import {data} from './data.js';
import { cardLayout } from './cardLayout.js';

// Firebase core import
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

// Realtime Database import
import { getDatabase, ref, onChildAdded, onChildChanged, update }
from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

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

// Reference to your data
const itemsRef = ref(db, "service");

// Global data array
let data = [];

// DOM helpers
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
let unseenCount = 0;
let unseen = {
  pending: 0,
  spare: 0,
  progress: 0,
  done: 0,
  collected: 0,
  return: 0
};
// When new data is added
onChildAdded(itemsRef, (snapshot) => {
  const item = snapshot.val();
  
  // Duplicate check → push or replace
  const existingIndex = data.findIndex(d => d.sn === item.sn);
  if (existingIndex === -1) {
    data.push(item);
  } else {
    data[existingIndex] = item; // update existing
  }
  
  // ഇപ്പോഴത്തെ active status tab
  const activeStatus = document.querySelector("nav a.active")?.dataset.text.toLowerCase() || "pending";
  
  // active status ആയെങ്കിൽ → refresh list
  if (item.status === activeStatus) {
    filterByStatus(activeStatus);
  } else {
    // unseen counter കൂട്ടുക
    unseen[item.status] = (unseen[item.status] || 0) + 1;
    showUnseenCount();
  }
  
  // sound play
  const audio = document.getElementById("newSound");
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(err => console.log("Audio play blocked:", err));
  }
});

const showUnseenCount = () => {
  Object.keys(unseen).forEach(status => {
    const badge = document.getElementById(`badge-${status}`);
    if (!badge) return;
    if (unseen[status] > 0) {
      badge.textContent = unseen[status];
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  });
};

// When existing data is updated
onChildChanged(itemsRef, (snapshot) => {
  const updated = snapshot.val();

  // find old item 
  const oldIndex = data.findIndex(item => item.sn === updated.sn);
  let oldStatus = null;

  if (oldIndex !== -1) {
    oldStatus = data[oldIndex].status; // old status
    data[oldIndex] = updated;          //  replace update
  } else {
    data.push(updated); // fallback safety
  }

  // 🔊 sound
  const audio = document.getElementById("update");
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(err => console.log("Audio play blocked:", err));
  }

  //  unseen badge update
  if (oldStatus && oldStatus !== updated.status) {
    // minus old status count 
    if (unseen[oldStatus] > 0) unseen[oldStatus]--;

    // new status count + (except active tab)
    const activeStatus = document.querySelector("nav a.active")?.dataset.text.toLowerCase() || "pending";
    if (updated.status !== activeStatus) {
      unseen[updated.status] = (unseen[updated.status] || 0) + 1;
    }
    showUnseenCount();
  }

  // ✅ current active tab refresh
  const activeStatus = document.querySelector("nav a.active")?.dataset.text.toLowerCase() || "pending";
  filterByStatus(activeStatus);
});

// Navigation switcher
const navSwitcher = () => {
  const navs = $$('nav a');
  navs.forEach(n => {
    n.onclick = e => {
      navs.forEach(n => n.classList.remove('active'));
      e.target.classList.add('active');

      const status = e.target.dataset.text.toLowerCase();
      filterByStatus(status);

      // reset unseen counter for this status
      unseen[status] = 0;
      showUnseenCount();
    };
  });
};
navSwitcher();

const shopSwitcher=()=>{
  const navs = $$('.shop-selector-wrap span');
  navs.forEach(n => {
    n.onclick = e => {
      navs.forEach(n => n.classList.remove('active'));
      e.target.parentElement.classList.add('active');
    };
  });
}
shopSwitcher()
// Create cards
const createCards = (data, status) => {
  const listContainer = $('.list');
  listContainer.innerHTML = '';

  const filtered = data.filter(item => status === item.status);

  if (filtered.length === 0) {
    listContainer.innerHTML = `<li class="empty">No data available</li>`;
    return;
  }

  filtered.forEach(item => {
    const listItem = document.createElement('li');
    listItem.classList.add('list-item');
    listItem.setAttribute("data-sn", item.sn);
    listItem.innerHTML = cardLayout(item);
    listContainer.appendChild(listItem);
  });
};

// Filter cards by status
const filterByStatus = (status) => {
  createCards(data, status);
};

// Update data in Firebase
const updateData = (name, number, complaints, status, sn) => {
  const itemRef = ref(db, `service/${sn}`);
  update(itemRef, { name, number, complaints, status, sn });
};



const routes = {
  "": ".home",     // default (no hash)
  "#add": ".form",
  "#shop-work": ".shop-work"
};

const router = () => {
  //  hide all
  Object.values(routes).forEach(selector => {
    $(selector).style.display = "none";
  });

  // current hash 
  const hash = location.hash || "";

  // match ?. show 
  if (routes[hash]) {
    $(routes[hash]).style.display = "block";
  } else {
    $(".not-found").style.display = "block"; // 404 view
  }

  // header animation handle
  $('header').classList.toggle('slide-up', hash === "#add");
};

window.addEventListener("DOMContentLoaded", router);
window.addEventListener("hashchange", router);

// const home = $(".home");
// const form = $(".form");

// // hash change handler
// const handleHashChange = () => {
//   if (location.hash === "#add") {
//     home.style.display = "none";
//     form.style.display = "block";
//     $('header').classList.add('slide-up')
//   } else {
//     home.style.display = "block";
//     form.style.display = "none";
//     $('header').classList.remove('slide-up')
//   }
// };

// // first load check
// handleHashChange();

// // listen to hash changes (back button / forward button support)
// window.addEventListener("hashchange", handleHashChange);




// Add data

import { set, get, runTransaction }
from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

$('.add-data').onclick = async () => {
  const name = $('#name').value.trim();
  const number = $('#number').value.trim();
  const complaints = $('#complaint').value.trim();
  const model = $('#model').value.trim();
  const lock = $('#lock').value?.trim();
  const status = $('#status').value.trim()||'None';
  
  if (!name || !number || !complaints || !model || !status) {
    alert("All fields are required!");
    return;
  }
  $('.add-data').textContent='Loading...'
$('.add-data').disabled=true
  try {
    const lastSnRef = ref(db, "lastSn");

    // 🔹 Transaction: auto-increment lastSn
    let newSn = await runTransaction(lastSnRef, (current) => {
      if (current === null) return 1000; // starting SN
      return current + 1;
    });

    newSn = newSn.snapshot.val();
    
    const date = new Date();
const options = { day: "2-digit", month: "short", year: "numeric" };
const formatted = date
  .toLocaleDateString("en-GB", options)
  .toUpperCase()
  .replace(/ /g, "-");

console.log(formatted);  
// Example: 17-SEP-2025

    const itemRef = ref(db, "service/" + newSn);
    await set(itemRef, {
      sn: newSn,
      name,
      number,
      complaints,
      model,
      lock,
      status,
      date: formatted
    });
      $('.add-data').disabled=false
  $('.add-data').textContent='Add to List'
    console.log("✅ Data added successfully, SN:", newSn);

    // clear form
    $('#name').value = '';
    $('#number').value = '';
    $('#complaint').value = '';
    $('#model').value = '';
    $('#lock').value = '';
    //$('#status').value = '';
    
    location.hash = "";

  } catch (err) {
    $('.add-data').textContent=err.message
    $('.add-data').style.background='red'
    console.error("❌ Error adding data:", err);
  }
};





// status update listener
document.addEventListener("change", (e) => {
  if (e.target.matches("input[type=radio][name^='status-']")) {
    const sn = e.target.name.split("-")[1];   // e.g. "status-2001" → 2001
    const newStatus = e.target.id.split("-")[0]; // e.g. "done-2001" → done

    console.log("🔄 Updating SN:", sn, "→", newStatus);

    const itemRef = ref(db, `service/${sn}`);
    update(itemRef, { status: newStatus })
      .then(() => console.log("✅ Status updated"))
      .catch(err => console.error("❌ Error updating status:", err));
  }
});



// Search fung

const search = $('#search');
const searchOut = $('.search-out');

// focus → show
search.addEventListener("focus", () => {
  searchOut.classList.remove("hidden");
});

// click outside → hide
document.addEventListener("click", (e) => {
  if (!search.contains(e.target) && !searchOut.contains(e.target)) {
    searchOut.classList.add("hidden");
  }
});






// Search function
search.addEventListener("input", () => {
  const query = search.value.trim().toLowerCase();
  searchOut.innerHTML = ""; // reset suggestions
  searchOut.classList.remove("hidden");

  if (!query) {
    searchOut.classList.add("hidden");
    return;
  }

  // Filter 
  const results = data.filter(item => 
    item.name.toLowerCase().includes(query) ||
    String(item.sn).includes(query) ||
    item.model.toLowerCase().includes(query) ||
    item.number.includes(query)
  );

  if (results.length === 0) {
    searchOut.innerHTML = `<li class="empty">No matches found</li>`;
    return;
  }

  // suggestions render
  results.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.sn} - ${item.name} (${item.model}) ~${item.status}`;
    li.onclick = () => {
      // click -> direct filter
      search.value = item.name;
      filterByStatus(item.status); 
      searchOut.classList.add("hidden");
    };
    searchOut.appendChild(li);
  });
});





// Permission ചോദിക്കണം
if (Notification.permission === "granted") {
  new Notification("Hello 👋", {
    body: "This is a test notification!",
    icon: "https://devsaheerhost.github.io/-/avatar-no-bg.png"
  });
} else if (Notification.permission !== "denied") {
  Notification.requestPermission().then(permission => {
    if (permission === "granted") {
      new Notification("Permission Granted ✅", {
        body: "Now you will get notifications.",
        icon: "https://devsaheerhost.github.io/-/avatar-no-bg.png"
      });
    }
  });
}