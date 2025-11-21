const initialTime = performance.now();
import { cardLayout } from './cardLayout.js';
import { searchCard } from './searchCard.js';
import { inventoryCard} from './inventoryCard.js';

// Firebase core import
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import { onAuthStateChanged, getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
// Realtime Database import
import { getDatabase, ref, onChildAdded, onChildChanged, update, query, limitToLast, orderByKey, remove , onValue, push}
from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

const getDateLabel=(dateString) =>{
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (d1, d2) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";

  const options = { day: "2-digit", month: "short", year: "numeric" };
  return date.toLocaleDateString("en-GB", options);
}

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


const shopName = localStorage.getItem('shopName')
if(!shopName) location='./auth/index.html'

document.title=`${shopName} - Smart Mobile Service Management App`

// DOM helpers
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

// Reference to your data
const backupRef = ref(db, `shops/${shopName}`);

get(backupRef).then(snapshot => {
  if (!snapshot.exists()) {
    showNotice({ title: 'Backup', body: 'No data found in cloud', type: 'warn' });
    return;
  } else {
    const Main = snapshot.val()
    
    const email = Main.email || null;
    const userName = Main.username || null;
    console.log(email, userName);
  }
  
  
  

  
  
  
  const cloudData = snapshot.val();
  const cloudServices = cloudData.service ?
    (Array.isArray(cloudData.service) ? cloudData.service : Object.values(cloudData.service)) :
    [];
  
  const author = localStorage.getItem('author') || ''
  !author?$('.customInput').classList.remove('hidden'): '';
  author.toLowerCase()=='shahin sha'? localStorage.setItem('role', 'Shop Owner') :null
  const role = localStorage.getItem('role')
  !role?$('.customInput').classList.remove('hidden'): '';
  $('#author_name_p').textContent=author || 'Unknown';
   
  const localData = JSON.parse(localStorage.getItem('backupData') || '{}');
  const localServices = localData.service ?
    (Array.isArray(localData.service) ? localData.service : Object.values(localData.service)) :
    [];
  
  const cloudCount = cloudServices.length;
  const localCount = localServices.length;
  
  console.log(`Local: ${localCount} | Cloud: ${cloudCount}`);
  
  // 🧠 Compare logic
  if (localCount < cloudCount) {
    // Cloud has more data → update local
    localStorage.setItem('backupData', JSON.stringify(cloudData));
    const difference = Math.abs(localCount - cloudCount);
    showNotice({
      title: 'Backup Updated',
      body: `New data synced (${difference} services)`,
      type: 'info'
    });
  } else if (localCount > cloudCount) {
    // Data loss or hacking suspected
    console.error("⚠️ Data loss detected! Cloud data smaller than local.");
    showNotice({
      title: 'Backup Error',
      body: '⚠️ Data loss detected — Backup not updated! Please Inform to the Developer!!!',
      type: 'error'
    });
  } else {
    // Equal → no changes
    // showNotice({
    //   title: 'Backup',
    //   body: 'Backup already up to date ✅',
    //   type: 'success'
    // });
  }
}).catch(err => {
  console.error("Backup fetch failed:", err);
  showNotice({
    title: 'Backup',
    body: 'Backup failed — ' + err.message,
    type: 'error'
  });
});


const itemsRef = ref(db, `shops/${shopName}/service`)

// first check if folder exists
get(itemsRef).then(snapshot => {
  autoScrollNavIcons()
  if (!snapshot.exists()) {
    $('.loader').classList.add('hidden');
    console.log("⚠️ No service data found yet");
    $('.list').innerHTML = `<li class="empty">No data available</li>
<p>Need to create a new entry? <a class="blue" href="#add">Click here</a> to get started.</p>
    `;
  }
});

const speakText=(text, lang = 'en-IN', rate = 1, pitch = 1)=> {
  if (!('speechSynthesis' in window)) {
    // showNotice({ title: '⚠️ Unsupported', body: 'Text-to-Speech not supported in this browser.', type: 'error' });
    
    return;
  }

  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = lang;        // Language (ml-IN for Malayalam, en-IN for Indian English)
  msg.rate = rate;        // Speed (0.5 – 2)
  msg.pitch = pitch;      // Voice pitch (0 – 2)

  // Vibration + speak
  if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
  window.speechSynthesis.cancel(); // Stop any previous speech
  window.speechSynthesis.speak(msg);
}

// const itemsRef = query(
//   ref(db, "shops/mobifixer/service"),
//   orderByKey(),
//   limitToLast(100)  // last 50 items only
// );

// Global data array
let data = [];

let notification;

let unseenCount = 0;
let unseen = {
  pending: 0,
  spare: 0,
  progress: 0,
  done: 0,
  collected: 0,
  return: 0
};
$('#shopname').textContent=shopName || 'My Shop';
if(shopName && shopName.toLowerCase()==='mobifixer') {
  const myLogo = document.createElement('img')
  myLogo.classList.add('logo')
  myLogo.src='./assets/images/logo_s_no_bg.png';
  myLogo.alt='MOBIFIXER'
  $('#shopname').innerHTML=''
  $('#shopname').appendChild(myLogo)
  
}
const timerElement = $('#timerElement')
$('.settings_page .profile_container .name').textContent=shopName;
$('.profile_page .profile_container .name').textContent=shopName;

//console.log(backupRef)
// in the card section nots textarea size
const setAutoHeightTextArea=  ()=>{
  document.querySelectorAll(".add-note-input").forEach(area => {
  area.addEventListener("input", () => {
    area.style.height = "auto";
    area.style.height = area.scrollHeight + "px";
  });
  
  area.style.height = "auto";
    area.style.height = area.scrollHeight + "px";
});
}

// to get dev info
let device = {}
        // for done status (if customer not collected their mobile ) for for notify the problem that few customers is not collected their mobile
let notified = false;

const checkDoneDevices=(data)=>{
    // Notify if multiple customers not collected their phones
  const filtered = data.filter(i => i.status === 'done');
  
  if (filtered.length > 4 && !notified) {
    notified = true;
    showNotice({
      title: 'WARN',
      body: `${filtered.length} customers have not collected their phones.`,
      type: 'warn',
      delay: 8
    });
    
    console.log(' notification. Done count:', filtered.length);
  } else {
    //console.log('notification Not triggered. Done length:', filtered.length);
  }
}


// header nav auto scroll function 
const autoScrollNavIcons = ()=>
{
  const shopNameWraper = $('.shop-selector-wrap')
    // store original scroll
    const start = shopNameWraper.scrollLeft;

    // scroll to end smoothly
    shopNameWraper.scrollTo({ left: shopNameWraper.scrollWidth, behavior: "smooth" });

    // after scroll ends, return back
    setTimeout(() => {
      shopNameWraper.scrollTo({ left: start, behavior: "smooth" });
    }, 1000); // wait ~2s before going back
}

$('#todayEntry').onclick=()=>{
  history.back()
  filterByDate(data, new Date());
}



onChildAdded(itemsRef, (snapshot) => {
  $('.loader').classList.add('hidden')
  const item = snapshot.val();
  // Duplicate check → push or replace
  const existingIndex = data.findIndex(d => d.sn === item.sn);
  if (existingIndex === -1) {
    data.push(item);
  } else {
    data[existingIndex] = item;
  }
  
  // current active status tab
  const activeStatus = document.querySelector("nav a.active")?.dataset.text.toLowerCase() || "pending";
  
  // refresh list if active
  if (item.status === activeStatus) {
    filterByStatus(activeStatus);
  } else {
    // unseen counter +
    unseen[item.status] = (unseen[item.status] || 0) + 1;
    showUnseenCount();
  }
  
  // play sound
  const audio = document.getElementById("newSound");
  if (audio) {
    audio.currentTime = 0;
    //audio.play().catch(err => console.log("Audio play blocked:", err));
  }
  
  // update last SN
  $('#new_sn').textContent = Number(data[data.length - 1].sn) + 1;
  
  // ----------------------
  // Notify if multiple customers not collected their phones
  setTimeout(()=>checkDoneDevices(data), 2000)
  
  
  setAutoHeightTextArea()



  timerElement.textContent = Math.floor(performance.now() - initialTime) + " ms";
  
  
  if($('#staticText')) $('#staticText').textContent='No Pending works'
setTimeout(()=>timerElement.remove(), 2000)


});

const showUnseenCount = () => {
  Object.keys(unseen).forEach(status => {
    const badge = document.getElementById(`badge-${status}`);
    if (!badge) return;
    if (unseen[status] > 0) {
      badge.textContent = unseen[status] > 99?'99+':unseen[status];
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
   // audio.play().catch(err => console.log("Audio play blocked:", err));
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
  setAutoHeightTextArea()
  
});

// Navigation switcher
const navSwitcher = (statusToSelect) => {
  const navs = $$('nav a');
  if (statusToSelect) {
  navs.forEach(n => {
    const status = n.dataset.text?.toLowerCase();
    n.classList.toggle('active', status === statusToSelect.toLowerCase());
  });
  return;
}
  
  navs.forEach(n => {
    n.onclick = e => {
      navs.forEach(n => n.classList.remove('active'));
      e.target.classList.add('active');

      const status = e.target.dataset.text.toLowerCase();
      filterByStatus(status);

      // reset unseen counter for this status
      unseen[status] = 0;
      showUnseenCount();
      setAutoHeightTextArea()
    };
  });
  
};
navSwitcher();

const shopSwitcher=()=>{
  const navs = $$('.shop-selector-wrap span');
  navs.forEach(n => n.classList.remove('active'));
  // $('.myshop').classList.add('active')
  navs.forEach(n => {
    n.onclick = e => {
      navs.forEach(n => n.classList.remove('active'));
      e.target.closest("span").classList.add("active");
    };
  });
}
shopSwitcher()


// stopped from version 2.6.0
const createCardsyyyy = (data, status, sn) => {
  if (!status) {
    console.log('Noo status is success')
    console.log(sn)
    
    const listContainer = $('.list');
  listContainer.innerHTML = ``;

  const filtered = data.filter(item => sn === item.sn);
  
  
  console.log('DEBUGGGG')
   if (filtered.length === 0) {
   listContainer.innerHTML = `<li class="empty">No data available</li>`;
   return;
 }
 // not working 👇 
 
 filtered.forEach(item => {
  
    const listItem = document.createElement('li');
    const nav = document.createElement('nav')
    listItem.classList.add('list-item');
    listItem.setAttribute("data-sn", item.sn);
    nav.innerHTML=`<h3>${item.name}</h4> <h3 class='sn'>${item.sn} </h4> `;
    listItem.appendChild(nav)
    listItem.innerHTML += cardLayout(item);
    listContainer.appendChild(listItem);
// console.log(filtered[i])
  });
    return
  }
console.log('card created Line: 250')
  
  const listContainer = $('.list');
  listContainer.innerHTML = ``;

 // const filtered = data.filter(item => status === item.status);
  const filtered = data
  .filter(item => status === item.status)
  .sort((a, b) => b.sn - a.sn); // newest first

  if (filtered.length === 0) {
    listContainer.innerHTML = `<li class="empty">No data available</li>`;
    return;
  }
  
  let limit = 50;
let rendered = 0
filtered.forEach(item => {
  // console.log(rendered)
  if (rendered >= limit) return;
  rendered++
  const listItem = document.createElement('li');
  const nav = document.createElement('nav')
  listItem.classList.add('list-item');
  listItem.setAttribute("data-sn", item.sn);
  nav.innerHTML = `<h3>${item.name}</h4> <h3 class='sn'>${item.sn} </h4> `;
  listItem.appendChild(nav)
  listItem.innerHTML += cardLayout(item);
  listContainer.appendChild(listItem);
  
  
});
  
  //$('#new_sn').textContent=;
  
};

// v3.0.0 limited loading and dynamic rendering by user scrolling.
let renderLimit = 20;  // load at a time 
let renderStart = 0;   // where to start
let activeFiltered = []; // last filtered data

const createCards = (data, status = null, sn = null, date = null) => {
  const listContainer = $(".list");

  // reset if new filter
  renderStart = 0;
  listContainer.innerHTML = "";

  // apply filters
  let filtered = [...data];

  if (sn) filtered = filtered.filter(item => item.sn === sn);
  if (status) filtered = filtered.filter(item => item.status === status);
  if (date) filtered = filtered.filter(item => item.date === date);

  // sort latest first (by SN)
  filtered.sort((a, b) => b.sn - a.sn);

  activeFiltered = filtered; // save for scroll loading

  if (filtered.length === 0) {
    listContainer.innerHTML = `<li class="empty">No data available</li>`;
    return;
  }

  renderNext(); // 👈 first 3 load
};


// 🔹 Fetch local data and render immediately
const loadLocalData = () => {
  $('.loader').classList.add('hidden');

  // Step 1: Read localStorage
  const localData = JSON.parse(localStorage.getItem('backupData') || '{}');

  // Step 2: Safely extract array
  let serviceData = [];
  if (Array.isArray(localData.service)) {
    serviceData = localData.service;
  } else if (localData && typeof localData === 'object') {
    // If old format saved as object, convert values to array
    serviceData = Object.values(localData.service || {});
  }

  // Step 3: Filter valid objects only
  serviceData = serviceData.filter(
    item => item && typeof item === "object" && "sn" in item
  );

  // Step 4: Render
  if (serviceData.length > 0) {
   // console.log(`📦 Loaded ${serviceData.length} valid items from localStorage`);
    createCards(serviceData, 'pending'); // ✅ your existing untouched creator
  } else {
    console.log("⚠️ No valid local data found");
    $(".list").innerHTML = `<li class="empty">No local data found</li>`;
  }
};


// 🔹 Call it on page load
document.addEventListener("DOMContentLoaded", loadLocalData);

  // Simple — two-word name 
const initials = (s='')=> (s.trim().split(/\s+/).map(w=>w[0]||'').filter(Boolean).slice(0,2).join('').toUpperCase());
// console.log(initials('Saheer Babu')); // SB

// Usage
// getInitialsSimple('Saheer Babu')
const renderNext = () => {
  const listContainer = $('.list');
  const nextSlice = activeFiltered.slice(renderStart, renderStart + renderLimit);
  
  let lastDateLabel = "";
  let dateGroups = {}; // 🔹 To count entries per dateLabel
  
  nextSlice.forEach(item => {
    const dateLabel = getDateLabel(item.date);
    
    // Count each date’s entries
    dateGroups[dateLabel] = (dateGroups[dateLabel] || 0) + 1;
    
    // Create new divider if date changes
    if (dateLabel !== lastDateLabel) {
      const dateDivider = document.createElement("div");
      dateDivider.className = "date-divider";
      dateDivider.dataset.date = dateLabel; // store raw label
      listContainer.appendChild(dateDivider);
      lastDateLabel = dateLabel;
    }
    
    // Create list item
    const listItem = document.createElement("li");
    listItem.classList.add("list-item");
    listItem.setAttribute("data-sn", item.sn);
    
    const nav = document.createElement("nav");
    nav.innerHTML = `
      <span class='flex_center'> 
        <input type="checkbox" class="multiSelect" data-sn="${item.sn}" id='${item.sn}'>
        <label for='${item.sn}'>
          <h3 class='flex_center'><span class='circle'>${initials(item.name)}</span>
          ${item.name}</h3>
        </label>
      </span>
      <span>
        <h3 class='sn'>${item.sn}</h3>
        <i class="fa-solid fa-pen editIcon" data-sn='${item.sn}'></i>
      </span>
    `;
    listItem.appendChild(nav);
    listItem.innerHTML += cardLayout(item);
    
    listItem.oncontextmenu = (e) => {
      e.preventDefault();
      $(".delete_page").classList.remove("hidden");
      $(".delete_page").dataset.sn = item.sn;
    };
    
    listContainer.appendChild(listItem);
  });
  
  // 🧮 Update text like "Today, 3 entries"
  updateDateDividerCounts(listContainer, dateGroups);
  
  renderStart += renderLimit;
};


const updateDateDividerCounts = (container, groups) =>{
  container.querySelectorAll('.date-divider').forEach(divider => {
    const date = divider.dataset.date;
    const count = groups[date] || 0;
    divider.innerHTML = `<p>${date}, ${count} entries</p>`;
  });
}
$('.delete_page').onclick=e=>{
  if(e.target.matches('main')) e.target.classList.add('hidden')
  
}

$('.delete_page .cancel').onclick=()=>$('.delete_page').classList.add('hidden')

$('.delete_page .delete').onclick = async () => {
  $('.loader').classList.remove('hidden')
  const sn = $('.delete_page').dataset.sn;
  $('.delete_page').classList.add('hidden');

  if (!sn) {
    $('.loader').classList.add('hidden')
    showNotice({title: 'Write Error', body: '❌ No Data found to delete', type: 'warn'});
    return
  }

  const itemsRef = ref(db, `shops/${shopName}/service/${sn}`);

  try {
    await remove(itemsRef);
    const lastSnRef = ref(db, `shops/${shopName}/lastServiceSn`);
      const tx = await runTransaction(lastSnRef, (current) => (current === null ? 1 : current - 1));
    $('.loader').classList.add('hidden');
   showNotice({title: 'Deleted', body: ` Customer Data ${sn} deleted successfully.`, type:'info'});
   
   
   $$('.list .list-item').forEach(el => {
  if (el.dataset.sn === sn) {
    el.classList.add('slide-out');

    
    el.addEventListener('transitionend', () => {
      el.classList.add('hidden');
    }, { once: true });
  }
});
   
  } catch (err) {
    $('.loader').classList.add('hidden')
    showNotice({title:'Backend Error',body:`❌ Error deleting item: ${err.message}`, type:'error'});
  }
};

let keyboardOpen = false;

window.visualViewport?.addEventListener('resize', () => {
  const vh = window.visualViewport.height;
  const full = window.innerHeight;
  keyboardOpen = vh < full * 0.8; // ~20% reduction → keyboard likely open
});

window.addEventListener('scroll', () => {
  // 
  if (keyboardOpen) return; // prevent triggering while keyboard active
  
  const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
  
  if (scrollTop + clientHeight >= scrollHeight - 100) {
    if (renderStart < activeFiltered.length) {
      renderNext();
    }
  }
});

  

// Filter cards by status
const filterByStatus = (status) => {
  createCards(data, status);
  
};



// filter cards by SN

const filterBySn = sn => createCards(data, status=null, sn)

// filter by date

const filterByDate = (data, targetDate, status = null, sn = null) => {
  // format the given date
  const dateObj = new Date(targetDate);
  const options = { day: "2-digit", month: "short", year: "numeric" };
  const formatted = dateObj
    .toLocaleDateString("en-GB", options)
    .toUpperCase()
    .replace(/ /g, "-");

  // call createCards with formatted date
  createCards(data, status, sn, formatted);
};

// Update data in Firebase
const updateData = (name, number, complaints, status, sn) => {
  const itemRef = ref(db, `shops/${shopName}/service/${sn}`);
  
  update(itemRef, { name, number, complaints, status, sn });
};



const routes = {
  "": ".home",     // default (no hash)
  "#add": ".form",
  "#shop-work": ".shop-work",
  '#inventory':'.inventory-page',
  '#addInventory':'.inventory-create-page',
  '#changelog':'.changelog-page',
  '#settings' : '.settings_page',
  '#settings/profile':'.profile_page',
  '#settings/thememode': '.theme_page',
  '#settings/sound': '.sound_page',
  '#inventorySearch':'.inventory_search_page',
  '#bacuprestore':'.bacup_restore_page',
  '#creditPage': '.creditPage',
  '#shop-details': '.shop_details_page',
  '#full_screen_alert': '.full_screen_alert_page'
};

const router = () => {
  //  hide all
    $('.inventory_option_container').classList.remove('show')
  Object.values(routes).forEach(s => {
  const page = $(s);
  if(page) {
        page.classList.add('hidden')
  }else{
    showNotice({ title: 'Page Error', body: `"${s}" Not found!`, type: 'error' });
    
  }
});

  // current hash 
  const hash = location.hash || "";


  // header animation handle
 // const slideUpHashes = ["#add", "#inventory", "#addInventory", "#settings", "#changelog"];
$('header').classList.toggle('slide-up', hash!='');


  // match ?. show 
  if (routes[hash]) {
    $(routes[hash]).classList.remove('hidden')
    $(".not-found").classList.add('hidden'); // 404 view
  } else {
    $(".not-found").classList.remove('hidden'); // 404 view
    return
  }



  if(hash ==='#add'){ 
    window.scrollTo({
  top: 0,
  behavior: 'smooth'
});
    showFirstAnim()
    $('.form input#name').focus()
    if (dataIsEdit) {
    $('.page-title').textContent = 'Edit Service';
    $('#new_sn').textContent = editDataSn;
  }
else {
  $('.page-title').textContent = 'Add Service';
$('#new_sn').textContent = Number(data[data.length - 1]?.sn) + 1 || 1;

}
  }
  
  if(hash==='#inventorySearch') $('#search_pouch').focus()
  if(hash==='') shopSwitcher();
if (hash === '#changelog') {
  // 🔹 1️⃣ CHANGELOG.md load ചെയ്യുക
  fetch("./CHANGELOG.md")
    .then(res => res.text())
    .then(md => {
      const converter = new showdown.Converter();
      document.getElementById("changelog").innerHTML = converter.makeHtml(md);
    })
    .catch(err => {
      document.getElementById("changelog").textContent = "⚠️ Unable to load changelog.";
      console.error(err);
    });

  // 🔹 2️⃣ GitHub commits fetch ചെയ്യുക
  const commitsList = document.querySelector("#commits");
  commitsList.innerHTML = "<li>Loading latest commits...</li>"; // loader text

  fetch("https://api.github.com/repos/DevSaheerHost/mobifixer/commits")
    .then(res => {
      if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
      return res.json();
    })
    .then(data => {
      commitsList.innerHTML = ""; // clear loader
      data.slice(0, 5).forEach(commit => {
        const li = document.createElement("li");
        const msg = commit.commit.message;
        const author = commit.commit.author.name;
        const date = new Date(commit.commit.author.date).toLocaleString();
        const link = commit.html_url;

        li.innerHTML = `
          <strong>${author}</strong>: 
          <a href="${link}" target="_blank">${msg}</a>
          <br><small>${date}</small>
        `;
        commitsList.appendChild(li);
      });
    })
    .catch(err => {
      commitsList.innerHTML = `<li>⚠️ Unable to load commits.</li>`;
      console.error(err);
    });
}
  
  $('#totalData').textContent = data.length;

// 🔹 Get today's date in "DD-MMM-YYYY" format (e.g., 12-OCT-2025)
const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const d = new Date();
const today =
  `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;

// 🔹 Filter today's entries
const todayData = data.filter(item => item.date?.toUpperCase() === today);

$('#todayData').textContent = todayData.length;

//$('#spareAvailableCount')


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


// helpers
const getCurrentTime = () => {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

const getCurrentDate=()=>{
  const dateObj = new Date();
  const options = { day: "2-digit", month: "short", year: "numeric" };
  const formatted = dateObj
    .toLocaleDateString("en-GB", options)
    .toUpperCase()
    .replace(/ /g, "-");
    return formatted;
}

import { set, get, runTransaction }
  from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

let dataIsEdit = false;
let editDataSn = 0;

$('.add-data').onclick = async () => {
  const dataAddingTime = performance.now();
  const name = $('#name').value.trim();
  const number = $('#number').value.trim();
  const altNumber = $('#alt_number').value.trim();
  const complaints = $('#complaint').value.trim();
  const model = $('#model').value.trim();
  const lock = $('#lock').value?.trim();
  const status = $('#status').value.trim() || 'pending';
  const notes = $('#notes').value.trim() || '';
  const amount = $('#amount').value.trim() || 0;
  const advance = $('#advance').value.trim() || 0;

  // if (!$('#sim').checked) {
  //   showNotice({ title: 'WARN', body: "Please check the 'SIM and accessories' box before submitting!", type: 'error' });
  //   return;
  // }
  if (!name || !number || !complaints || !model || !status) {
    showNotice({ title: 'Validation Error', body: 'All fields are required!', type: 'error', delay: 10 });
    return;
  }

  $('.add-data').textContent = dataIsEdit ? 'Updating...' : 'Loading...';
  $('.add-data').disabled = true;
  $('.loader').classList.remove('hidden');

  try {
    let snToUse = editDataSn;
    if (!dataIsEdit) {
      const lastSnRef = ref(db, `shops/${shopName}/lastServiceSn`);
      const tx = await runTransaction(lastSnRef, (current) => (current === null ? 1 : current + 1));
      snToUse = tx.snapshot.val();
      $('#new_sn').textContent = snToUse;
    }

    const itemRef = ref(db, `shops/${shopName}/service/${snToUse}`);

    // 🧠 Get old record if editing (to preserve date/time)
    let oldData = {};
    if (dataIsEdit) {
      const snap = await get(itemRef);
      if (snap.exists()) oldData = snap.val();
    }

    // 🔹 Collect devices
    const devices = [];
    const deviceSets = $$('#more_device_input_container .device-set');
    deviceSets.forEach((set) => {
      const nameInput = set.querySelector('.name-input')?.value.trim();
      const complaintInput = set.querySelector('.complaint-input')?.value.trim();
      const lockInput = set.querySelector('.lock-input')?.value.trim();
      if (nameInput || complaintInput || lockInput) {
        devices.push({ model: nameInput || '', complaints: complaintInput || '', lock: lockInput || '' });
      }
    });
    devices.unshift({ model, complaints, lock });

// get updating date and author
let updateTime = null
let updatedBy=null
if(dataIsEdit){
  updateTime ={date: getCurrentDate(), time: getCurrentTime()}
  updatedBy = {
    name: localStorage.getItem('author') || 'None author', 
    role: localStorage.getItem('role') || 'No rules'}
}

    // 🧩 Construct new data
    const newData = {
      sn: snToUse,
      name,
      number,
      altNumber,
      status,
      notes,
      amount,
      advance,
      author: localStorage.getItem('author'),
      devices,
      // 🧷 Preserve old date/time if editing
      date: dataIsEdit ? oldData.date : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase().replace(/ /g, "-"),
      time: dataIsEdit ? oldData.time : getCurrentTime(),
      updateInfo: {updateTime, updatedBy}
    };
    

    // ✅ Save
    await set(itemRef, newData);

    $('.loader').classList.add('hidden');
    $('.add-data').disabled = false;
    $('.add-data').textContent = 'Add to List';

    showNotice({
      title: snToUse,
      body: dataIsEdit
        ? 'Data updated successfully'
        : `Data added successfully (${Math.floor(performance.now() - dataAddingTime)}ms)`,
      type: 'success',
      delay: 30
    });
    !dataIsEdit?createAlert():'';

    if (!dataIsEdit) {
      $('#name').value = '';
      $('#number').value = '';
      $('#alt_number').value = '';
      $('#complaint').value = '';
      $('#model').value = '';
      $('#lock').value = '';
      $('#advance').value = '';
      $('#amount').value = '';
      $('#notes').value = '';
      $('#sim').checked = false;
      $('#total_device_count').value = 1;
      $('#more_device_input_container').innerHTML = '';
    }

    dataIsEdit = false;
    editDataSn = 0;
    history.back();
    $$('nav a').forEach(elem => elem.classList.remove('active'));
    filterBySn(snToUse);

  } catch (err) {
    $('.loader').classList.add('hidden');
    $('.add-data').textContent = err.message;
    $('.add-data').style.background = 'red';
    console.error("❌ Error saving data:", err);
    showNotice({ title: 'ERROR', body: `Operation failed: ${err.message}`, type: 'error', delay: 6 });
    $('.add-data').disabled = false;
  }
};



// keep track of previous statuses temporarily
const previousStatuses = {};// not set undo button 


// status update listener
document.addEventListener("change", (e) => {
if (e.target.matches("input[type=radio][name^='status-']")) {
const sn = e.target.name.split("-")[1];
const newStatus = e.target.id.split("-")[0];

const itemRef = ref(db, `shops/${shopName}/service/${sn}`);  
    update(itemRef, { status: newStatus })  
      .then(() => showNotice({  
        title: sn,  
        body: `Status Updated To, ${newStatus.toUpperCase()}`,  
        type: 'info',  
        delay: 5000  
      }))  
      .catch(err => {  
        console.error("❌ Error updating status:", err)  
        showNotice({  
          title: 'ERROR',  
          body: `Data didn't update! Please try again later. REASON: ${err.message}`,  
          type: 'error',  
          delay: 6000  
        })  
      });

}
});




// note update listener
document.oninput = (e) => {
  if (e.target.matches(".add-note-input")) {
    const wrap = e.target.closest('.note-input-wrap'); 
    const button = wrap.querySelector('button');
    button.classList.add('active')
  }
  
  

};

document.onclick=e=>{
  if (e.target.classList.contains('add-note-btn')) {
    const sn = e.target.name.split("-")[1];   // e.g. "status-2001" → 2001
    const newNote = e.target.closest('.note-input-wrap').querySelector('textarea').value ||''
    const itemRef = ref(db, `shops/${shopName}/service/${sn}`);
    
    update(itemRef, { notes: newNote })
      .then(() => showNotice({title: sn, body:`Notes added to ${sn}` , type: 'success', delay: 5000}))
      .catch(err => {
        console.error("❌ Error adding notes:", err)
        showNotice({title:'ERROR', body:`Data didn't add the notes!, Please Trying again later. REASON: ${err.message}`, type:'error', delay: 6})
      });
    
    //showNotice({title:'DEBUG', body:"You can't add Note at the moment!", type:'info', delay: 0})
  }
  
  if (e.target.classList.contains('editIcon')) {
  (async () => {
    editDataSn = e.target.dataset.sn;
    dataIsEdit = true;
    location.hash = '#add';

    const itemRef = ref(db, `shops/${shopName}/service/${editDataSn}`);
    const snapshot = await get(itemRef);

    if (snapshot.exists()) {
      const data = snapshot.val();

      // 🔹 Basic fields
      $('#name').value = data.name || '';
      $('#number').value = data.number || '';
      $('#alt_number').value= data.altNumber || ''
      $('#notes').value = data.notes || '';
      $('#amount').value = data.amount || '';
      $('#advance').value = data.advance || '';
      $('#status').value = data.status || '';
      $('#sim').checked = true;
      $('.add-data').textContent = 'Update Data';

      // 🔹 Devices handling
      const deviceCountInput = $('#total_device_count');
      const deviceContainer = $('#more_device_input_container');
      deviceContainer.innerHTML = '';

      let devices = [];

      if (Array.isArray(data.devices) && data.devices.length > 0) {
        devices = data.devices;
      } else {
        // fallback for old structure
        devices = [{
          model: data.model || '',
          complaints: data.complaints || '',
          lock: data.lock || ''
        }];
      }

      // Set main/static device inputs (first one)
      const firstDevice = devices[0];
      $('#model').value = firstDevice.model || '';
      $('#complaint').value = firstDevice.complaints || '';
      $('#lock').value = firstDevice.lock || '';

      // Add additional devices if more than 1
      deviceCountInput.value = devices.length;
      for (let i = 1; i < devices.length; i++) {
        const d = devices[i];
        const set = document.createElement('div');
        set.className = 'device-set';
        set.style.marginBottom = '10px';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.placeholder = `Device ${i + 1} name`;
        nameInput.className = 'device-input name-input';
        nameInput.value = d.model || '';

        const complaintInput = document.createElement('input');
        complaintInput.type = 'text';
        complaintInput.placeholder = `Device ${i + 1} complaint`;
        complaintInput.className = 'device-input complaint-input';
        complaintInput.value = d.complaints || '';

        const lockInput = document.createElement('input');
        lockInput.type = 'text';
        lockInput.placeholder = `Device ${i + 1} lock`;
        lockInput.className = 'device-input lock-input';
        lockInput.value = d.lock || '';

        set.appendChild(nameInput);
        set.appendChild(complaintInput);
        set.appendChild(lockInput);
        deviceContainer.appendChild(set);
      }
    }
  })();
}


if (e.target.matches(".undo-status-btn")) {
  
  const li = e.target.closest('li');
const oldStatus = li.dataset.currentStatus || previousStatuses[sn] || 'pending'; // fallback
previousStatuses[sn] = oldStatus;


    const sn = e.target.dataset.sn;
    
    if (!oldStatus) return;

    const itemRef = ref(db, `shops/${shopName}/service/${sn}`);
    update(itemRef, { status: oldStatus })
      .then(() => {
        showNotice({
          title: sn,
          body: `Undo Successful — reverted to ${oldStatus.toUpperCase()}`,
          type: 'success',
          delay: 4000
        });
        e.target.remove();
      })
      .catch(err => {
        showNotice({
          title: 'ERROR',
          body: `Undo Failed! ${err.message}`,
          type: 'error'
        });
      });
  }
}



// Search fung in 

const search = $('#search');
const searchOut = $('.search-out');

// focus → show
search.addEventListener("focus", () => {
  searchOut.classList.remove("hidden");
});

// click outside → hide
document.addEventListener("click", async (e) => {
  if (!search.contains(e.target) && !searchOut.contains(e.target)) {
    searchOut.classList.add("hidden");
  }
    // 🛒 decrease button
  if (
    e.target.classList.contains('decrease') ||
    e.target.parentElement?.classList.contains('decrease')
  ) {
    const id = e.target.dataset.id || e.target.parentElement.dataset.id;
    const card = e.target.closest('.middle_container');
    const qtyElement = card.querySelector('.qty');

    await updateInventoryPouch('decrease', id, qtyElement);
  }

  // 🏪 increase button
  if (
    e.target.classList.contains('increase') ||
    e.target.parentElement?.classList.contains('increase')
  ) {
    const id = e.target.dataset.id || e.target.parentElement.dataset.id;
    const card = e.target.closest('.middle_container');
    const qtyElement = card.querySelector('.qty');

    await updateInventoryPouch('increase', id, qtyElement);
  }
  
  
  
  // add overlay and do click function.... 

});






// Search function start at / edit at v3.0.0
let searchFiltered = [];
let searchRenderStart = 0;
let searchRenderLimit = 10;

search.addEventListener("input", () => {
  const query = search.value.trim().toLowerCase();
  searchOut.innerHTML = ""; // reset suggestions
  searchOut.classList.remove("hidden");

  if (!query) {
    searchOut.classList.add("hidden");
    return;
  }

  // Filter
  const results = data.filter(item => {
  const q = query.toLowerCase();

  // Check SN, name, number (always exist)
  const matchesBasic =
    String(item.sn).includes(query) ||
    item.name.toLowerCase().includes(q) ||
    item.number.includes(query);

  // Check model: old structure
  let matchesModel = false;
  if (item.model) {
    matchesModel = item.model.toLowerCase().includes(q);
  }

  // Check devices (new structure)
  let matchesDevice = false;
  if (item.devices && Array.isArray(item.devices)) {
    matchesDevice = item.devices.some(d => d.model?.toLowerCase().includes(q));
  }

  return matchesBasic || matchesModel || matchesDevice;
});

  searchFiltered = results;
  searchRenderStart = 0;

  if (results.length === 0) {
    searchOut.innerHTML = `<li class="empty">No matches found</li>`;
    return;
  }

  renderSearchNext(); // 👈 first 20
});

function renderSearchNext() {
  const slice = searchFiltered.slice(searchRenderStart, searchRenderStart + searchRenderLimit);
  slice.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = searchCard(item);
    li.onclick = () => {
      search.value = item.name;
      filterBySn(item.sn);
      searchOut.classList.add("hidden");
    };
    searchOut.appendChild(li);
  });
  searchRenderStart += searchRenderLimit;
}

// Scroll listener inside suggestion box
searchOut.addEventListener("scroll", () => {
  if (searchOut.scrollTop + searchOut.clientHeight >= searchOut.scrollHeight - 10) {
    if (searchRenderStart < searchFiltered.length) {
      renderSearchNext();
    }
  }
});




// not calling yet. (this is the notification function )
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then(reg => {
    // console.log("Service Worker registered:", reg);
    
    notification =(msg) => {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          reg.showNotification("MOBIFIXER", {
            body: "New Service added",
            icon: "https://cdn-icons-png.flaticon.com/512/1827/1827349.png",
            actions: [
              { action: "view", title: "View" },
              { action: "dismiss", title: "Cancel" }
            ]
          });
        }
      });
    };
  });
}



const noticeQueue = [];
let isShowing = false;

function showNotice({ title, body, type = "info" , delay}) {
  noticeQueue.push({ title, body, type , delay});
  if (!isShowing) {
    processQueue();
  } else console.log('New notice already visible, so not created')
}

function processQueue() {
  if (noticeQueue.length === 0) {
    isShowing = false;
    return;
  }

  isShowing = false;
  const { title, body, type, delay } = noticeQueue.shift();

// notice element 

  const newNotice = document.createElement("div");
  newNotice.classList.add("notice", type);
  newNotice.style.animation = `notification ${delay}s cubic-bezier(2,3,3,2) forwards`;
  
  console.log('New notice was created')
  // Pattern: vibrate → pause → vibrate
  if (type==='error' || type ==='warn') {
    navigator.vibrate([50, 50, 50]);
    speakText(body);
    //speakText("നന്ദി, വീണ്ടും വരുക kumar ഏട്ടാ!", "ml-IN", 1.1, 1);
  }
  if (type ==='info') {
    navigator.vibrate([50, 70, 50]);
    speakText(body);
  }
  if (type ==='success') {
    navigator.vibrate([50]);
  }
//navigator.vibrate([50, 50, 50]);
  // newNorice swipe position events
  
  let noticeStartX = 0;
  let noticeCurrentX = 0;
  let noticeDragging = false;
  
  newNotice.ontouchstart = e => {
  noticeStartX = e.touches[0].clientX;
  noticeDragging = true;



  // Stop keyframe from interfering
  newNotice.style.animation='none'
  newNotice.style.animationPlayState = 'paused';

  // remove transition while dragging
  newNotice.style.transition = 'none';

  // optimize performance
  newNotice.style.willChange = 'transform, opacity';
  
newNotice.style.transform = 'translateX(50%) translateY(0)';
newNotice.style.whiteSpace = 'wrap';
newNotice.style.maxHeight = '4rem';
newNotice.style.maxWidth = '80vw';
newNotice.style.width = 'max-content';

};


  // notice touch move
  
  newNotice.ontouchmove = e => {
  if (!noticeDragging) return;
  noticeCurrentX = e.touches[0].clientX - noticeStartX;

  // use calc if your CSS uses right:50% + translateX(50%)
  newNotice.style.transform = `translateX(calc(50% + ${noticeCurrentX}px)) translateY(0)`;
  newNotice.style.opacity = 1 - Math.min(Math.abs(noticeCurrentX) / 150, 1);
};
  
  // notice touch end
  
  
  newNotice.ontouchend = () => {
  noticeDragging = false;
isShowing = false;

  // add smooth transition for reset or swipe out
  newNotice.style.transition = 'transform 0.3s ease, opacity 0.3s ease';

  if (Math.abs(noticeCurrentX) > 100) {
    // dismiss
    newNotice.style.transform = `translateX(${noticeCurrentX > 0 ? '500px' : '-500px'}) translateY(0)`;
    newNotice.remove()
    console.log('done removed of new notice')
    
  } else {
    // reset back to original
    newNotice.style.transform = 'translateX(50%) translateY(0)';
    newNotice.style.opacity = '1';
  }

  noticeCurrentX = 0;
  newNotice.style.willChange = '';
};
  
  //setTimeout(()=>{newNotice.classList.add('dismiss')
  //}, 3000)
  
  
// notice title element
  const titleElem = document.createElement("p");
  titleElem.classList.add("title");
  titleElem.textContent = title;

// notice body element
  const bodyElem = document.createElement("p");
  bodyElem.classList.add("body");
  bodyElem.textContent = body;
  
  // close btn for notice
  const closeBtn = document.createElement('span');
  closeBtn.textContent='×';
  closeBtn.style.cssText=`
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #000;
  font-size: 1.3rem;
  `;
  


// add to UI
  newNotice.appendChild(titleElem);
  newNotice.appendChild(bodyElem);
  // newNotice.appendChild(closeBtn);
  document.body.appendChild(newNotice);
  
    // closeBtn function 
  closeBtn.onclick=()=>{
    alert('c')
    console.log('removed?', newNotice)
    newNotice.style.animation='notification 2s ease-in-out reverse forwards'//check rev forv first
    
  }

// automatic remove the created notice for clean UI.
  newNotice.addEventListener("animationend", () => {
    newNotice?.remove();
    processQueue(); // show next
  });
}

// // Example usage
// setTimeout(() => {
//   showNotice({ title: "WARN", body: "Data is deleted", type: "warn" });
// }, 1000);

// setTimeout(() => {
//   showNotice({ title: "SUCCESS", body: "Profile updated", type: "success" });
// }, 4000);

// setTimeout(() => {
//   showNotice({ title: "INFO", body: "New message received", type: "info" });
// }, 7000);



window.addEventListener("error", (event) => {
  // alert("error caught");
  showNotice({
    title: "ERROR",
    body: "Something went wrong: " + event.message,
    type: "error",
    delay: 10
  });
});



// addbutton animation when scroll 
let lastScroll = 0;

const addBtnWidth = $('button.add').offsetWidth+'px'
$('button.add').style.width = addBtnWidth

document.addEventListener('scroll', () => {
  const currentScroll = window.scrollY;
  const addBtn = $('button.add');

  if (currentScroll < lastScroll) {
    addBtn.classList.remove('smallAddBtn');
    addBtn.style.width = addBtnWidth
    addBtn.innerHTML='<a>New</a>'
  } else {
    addBtn.classList.add('smallAddBtn');
    addBtn.style.width = '50px'
    addBtn.innerHTML='<a>+</a>'
  }

  lastScroll = currentScroll;
});


// New ref
//const newRef = ref(db, "shops/mobifixer/service");

// Copy data
// get(itemsRef).then(snapshot => {
//   if (snapshot.exists()) {
//     set(newRef, snapshot.val());
//     console.log("Data copied successfully!");
//   }
// });

document.addEventListener('click', e => {
  

  //////////
if (e.target.tagName.toLowerCase() === 'nav') {
  const parent = e.target.closest('li');
//  alert(parent)
  if (parent) parent.classList.toggle('collapse');
}
  
  
  
  const btn = e.target.closest('.call-btn');
  if (!btn) return;

  const num = btn.dataset.num;
  const telUrl = `tel:${num}`;

  showNotice(`📞 Dialing ${num}...`, "info");

  setTimeout(() => {
    try {
      window.open(telUrl, '_system');
    } catch {
      try {
        window.location.href = telUrl;
        
      } catch {
        showNotice({title: 'Cant Call', body:"⚠️ Calling feature not supported in this environment.", type:'error'});
      }
    }
  }, 400);
  
  
  
  
 // speakText("Welcome back, Babu! The system is ready.");
// Malayalam voice
//speakText("സിസ്റ്റം റെഡി ആണേ ബാബു!", "ml-IN", 1.1, 1);
});

window.onoffline=()=>{
    // play sound
    showNotice({title:'Offline', body:'Device disconnect. Reloading', type:'error'})
  const audio = document.getElementById("disconnect");
  if (audio) {
    audio.currentTime = 0;
 //   audio.play().catch(err => console.log("Audio play blocked:", err));
  }
  location.reload()
}
window.ononline=()=> showNotice({title:'Online', body:'Device Connected.', type:'success'})





$('.add').onclick=()=>{
  dataIsEdit=false
  $('#name').value = data.name || '';
      $('#number').value = data.number || '';
      $('#complaint').value = data.complaints || '';
      $('#model').value = data.model || '';
      $('#lock').value = data.lock || '';
      $('#notes').value = data.notes || '';
      $('#amount').value = data.amount || '';
      $('#advance').value = data.advance || '';
      $('#status').value = data.status || 'pending';
      $('#sim').checked = false;
      $('.add-data').textContent = 'Add to List';


}





// document.addEventListener("visibilitychange", () => {
//   if (document.visibilityState === "visible") {
//     // User reopened tab
//     location.reload();
//     //$('.loader').classList.remove('hidden')
    
//   }
// });

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    console.log("🔄 Tab reopened → Re-fetching data...");
   // refreshServiceData();
  }
});

const refreshServiceData = ()=> {
  $('.loader').classList.remove('hidden')
  const itemsRef = ref(db, `shops/${shopName}/service`);
  
  get(itemsRef).then(snapshot => {
    if (snapshot.exists()) {
      data = Object.values(snapshot.val());
      const activeStatus =
        document.querySelector("nav a.active")?.dataset.text.toLowerCase() ||
        "pending";
      filterByStatus(activeStatus);
      $('.loader').classList.add('hidden')
      //showNotice({title: ' ✅', body:`Data refreshed successfully.`, type:'success'})
      console.log("✅ Data refreshed successfully.");
    } else {
      $('.list').innerHTML = `
        <li class="empty">No data available</li>
        <p>Need to create a new entry? 
          <a class="blue" href="#add">Click here</a>
        </p>
      `;
      console.log("⚠️ No service data found yet");
      $('.loader').classList.add('hidden')
      showNotice({title:'404', body:'No data found', type:'warn'})
    }
  }).catch(err => {
    console.error("❌ Error reloading data:", err)
   showNotice({title: ' ❌', body:`Error Reloading data: ${err.message}`, type:'error'})
   $('.loader').classList.add('hidden')
  });
}



if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}



$('#saveAuthorName').onclick = async () => {
  const Name = $('#authorName').value.trim();
  const getRole = () => $('input[name="role"]:checked')?.value || 'no-role';
  const staffRef = ref(db, `shops/${shopName}/staff`);
  const ownerRef = ref(db, `shops/${shopName}/owner`);
  const snap = await get(ownerRef);
  const owner = snap.val();
  if (snap.exists()) {
    if (owner.name.toLowerCase()===Name.toLowerCase()) {
      showNotice({title: 'Owner', body:`Welcome back ${owner.name}!`, type: 'info'})
      localStorage.setItem('author', Name);
      localStorage.setItem('role', 'Shop Owner');
      $('.customInput').classList.add('hidden');
      location.reload()
      return
    }
  };

  
  
  if (Name.length > 3) {
    
    try {
      const snapshot = await get(staffRef);
      
      if (snapshot.exists()) {
        const staffData = snapshot.val();
        
        // 🔍 key + value so -> bject.entries()
        let foundKey = null;
        let foundStaff = null;
        
        for (const [key, value] of Object.entries(staffData)) {
          if (value.name?.toLowerCase() === Name.toLowerCase()) {
            foundKey = key;
            foundStaff = value;
            break;
          }
        }
        //console.log(foundKey, foundStaff);
        
        if (foundStaff && foundKey) {
          // ✅ Staff found → update lastLogin & role
          const MyRole = getRole();
          await update(ref(db, `shops/${shopName}/staff/${foundKey}`), {
            lastLogin: new Date().toISOString(),
            role: MyRole
          });
          
          // ✅ LocalStorage save
          localStorage.setItem('author', Name);
          localStorage.setItem('role', MyRole);
          
          showNotice({
            title: '🫴',
            body: `Welcome ${Name} ;)`,
            type: 'info'
          });
          $('.customInput').classList.add('hidden');
          location.reload()
        } else {
          // ❌ Staff not found
          showNotice({
            title: 'Access Denied',
            body: 'Please request access from the shop owner 🙏',
            type: 'error'
          });
        }
        
      } else {
        showNotice({
          title: 'Error',
          body: 'Staff list not found in database ⚠️',
          type: 'error'
        });
      }
      
    } catch (error) {
      console.error(error);
      showNotice({
        title: 'Error',
        body: 'Something went wrong 😔',
        type: 'error'
      });
    }
    
  } else {
    showNotice({
      title: 'Validation Error',
      body: 'Name must include minimum 3 characters',
      type: 'error'
    });
  }
};

$('.customInput .cancel').onclick=()=> $('.customInput').classList.add('hidden')


// Store selected SNs
let selectedItems = new Set();

// Listen for checkbox clicks
document.addEventListener('change', (e) => {
  if (e.target.classList.contains('multiSelect')) {
    const sn = e.target.dataset.sn;
    if (e.target.checked) selectedItems.add(sn);
    else selectedItems.delete(sn);
    
    toggleBulkActionBar();
  }
});

// Show/hide bulk action bar
function toggleBulkActionBar() {
  const bar = document.querySelector('.bulk-action');
  if (selectedItems.size > 0) {
    bar.classList.remove('hide');
    bar.querySelector('.count').textContent = `${selectedItems.size} selected`;
  } else {
    bar.classList.add('hide');
  }
}



$('#applyStatus').onclick = async () => {
  const newStatus = $('#bulkStatus').value;
  if (!newStatus) {
    showNotice({ title: 'Select Status', body: 'Please choose a status first', type: 'warn' });
    return;
  }

  $('.bulk-action').classList.add('loading');
  const updates = {};

  selectedItems.forEach(sn => {
    updates[`shops/${shopName}/service/${sn}/status`] = newStatus;
  });

  try {
    await update(ref(db), updates);
    showNotice({
      title: '✅ Updated',
      body: `${selectedItems.size} items updated to ${newStatus}`,
      type: 'success'
    });
    selectedItems.clear();
    toggleBulkActionBar();
  } catch (err) {
    showNotice({
      title: 'Error',
      body: err.message,
      type: 'error'
    });
  } finally {
    $('.bulk-action').classList.remove('loading');
  }
};



const nameInput = $('.form #name');
const numberInput = $('.form #number');
const nameSuggestContainer = $('#name_suggest_container');

nameInput.oninput = (e) => {
  const value = e.target.value.trim().toLowerCase();

  nameSuggestContainer.innerHTML = '';
  if (!value || nameInput.value.length < 3) return;

  // filter data first
  const matches = data.filter(item =>
    item.name.toLowerCase().includes(value)
  );

  // ✅ remove duplicate names
  const uniqueMatches = [];
  const seenNames = new Set();

  matches.forEach(item => {
    const nameLower = item.name.toLowerCase();
    if (!seenNames.has(nameLower)) {
      seenNames.add(nameLower);
      uniqueMatches.push(item);
    }
  });

  // show suggestions
  uniqueMatches.forEach(item => {
    const div = document.createElement('div');
    div.textContent = `${item.name}, ${item.number}, ${item.model}`;
    div.classList.add('suggest-item');

    div.onclick = () => {
      nameInput.value = item.name;
      numberInput.value = item.number;
      nameSuggestContainer.innerHTML = '';
    };

    nameSuggestContainer.appendChild(div);
  });
};

nameInput.onblur=()=> setTimeout(()=>nameSuggestContainer.classList.add('hidden'), 200)
nameInput.onfocus=()=> nameSuggestContainer.classList.remove('hidden')


const modelSuggestContainer = $('#model_suggest_container');
const modelInput = $('.form #model')


modelInput.oninput = (e) => {
  const value = e.target.value.trim().toLowerCase();

  modelSuggestContainer.innerHTML = '';
  if (!value || modelInput.value.length < 3) return;

  // 🔹 Flatten data for filtering both structures
  const flattened = data.flatMap(item => {
    if (item.devices && Array.isArray(item.devices)) {
      // new structure
      return item.devices.map(d => ({ model: d.model }));
    } else if (item.model) {
      // old structure
      return [{ model: item.model }];
    }
    return [];
  });

  // 🔹 filter by input
  const matches = flattened.filter(d => d.model.toLowerCase().includes(value));

  // 🔹 remove duplicates
  const uniqueMatches = [];
  const seen = new Set();
  matches.forEach(d => {
    const lower = d.model.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueMatches.push(d);
    }
  });

  // 🔹 show suggestions
  uniqueMatches.forEach(d => {
    const div = document.createElement('div');
    div.textContent = d.model;
    div.classList.add('suggest-item');
    div.onclick = () => {
      modelInput.value = d.model;
      modelSuggestContainer.innerHTML = '';
    };
    modelSuggestContainer.appendChild(div);
  });
};
modelInput.onblur=()=> setTimeout(()=>modelSuggestContainer.classList.add('hidden'), 200)
modelInput.onfocus=()=> modelSuggestContainer.classList.remove('hidden')


// Suggesition for Number 


const numberSuggestContainer = $('#number_suggest_container')

numberInput.oninput = (e) => {
  const value = e.target.value.trim().toLowerCase();
  
  numberSuggestContainer.innerHTML = '';
  if (!value || numberInput.value.length < 3) return;
  
  // filter data first
  const matches = data.filter(item =>
    item.number.includes(value)
  );
  
  // ✅ remove duplicate names
  const uniqueMatches = [];
  const seenNimbers = new Set();
  
  matches.forEach(item => {
    const nameLower = item.number;
    if (!seenNimbers.has(nameLower)) {
      seenNimbers.add(nameLower);
      uniqueMatches.push(item);
    }
  });
  
  // show suggestions
  uniqueMatches.forEach(item => {
    const div = document.createElement('div');
    div.textContent = item.number;
    div.classList.add('suggest-item');
    
    div.onclick = () => {
      numberInput.value = item.number;
      numberSuggestContainer.innerHTML = '';
    };
    
    numberSuggestContainer.appendChild(div);
  });
};
numberInput.onblur=()=> setTimeout(()=>numberSuggestContainer.classList.add('hidden'), 200)
numberInput.onfocus=()=> numberSuggestContainer.classList.remove('hidden')


// Complaints input suggestions 

const complaintSuggestInput = $('#complaint_suggest_container');
const complaintInput = $('.form #complaint')


complaintInput.oninput = (e) => {
  const value = e.target.value.trim().toLowerCase();

  complaintSuggestInput.innerHTML = '';
  if (!value || complaintInput.value.length < 2) return;

  // 🔹 Flatten data to include complaints from both structures
  const flattened = data.flatMap(item => {
    if (item.devices && Array.isArray(item.devices)) {
      // new structure
      return item.devices.map(d => ({ complaints: d.complaints }));
    } else if (item.complaints) {
      // old structure
      return [{ complaints: item.complaints }];
    }
    return [];
  });

  // 🔹 filter by input
  const matches = flattened.filter(d => d.complaints?.toLowerCase().includes(value));

  // 🔹 remove duplicates
  const uniqueMatches = [];
  const seen = new Set();
  matches.forEach(d => {
    const lower = d.complaints.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueMatches.push(d);
    }
  });

  // 🔹 show suggestions
  uniqueMatches.forEach(d => {
    const div = document.createElement('div');
    div.textContent = d.complaints;
    div.classList.add('suggest-item');
    div.onclick = () => {
      complaintInput.value = d.complaints;
      complaintSuggestInput.innerHTML = '';
    };
    complaintSuggestInput.appendChild(div);
  });
};
complaintInput.onblur=()=> setTimeout(()=>complaintSuggestInput.classList.add('hidden'), 200)
complaintInput.onfocus=()=> complaintSuggestInput.classList.remove('hidden')




// ########### INVENTORY MANAGEMENT SECTION ######### //

const getLastStockSn = async () => {
  const snRef = ref(db, `shops/${shopName}/lastStockSn`);
  const snapshot = await get(snRef);
  return snapshot.exists() ? snapshot.val() : null;
};

(async () => {
  const sn = await getLastStockSn();
  $('#product_sn').textContent = `SN : ${sn ?? 'N/A'}`;
})();

$('.inventoryOpen').onclick = async () => {
  const sn = await getLastStockSn();
  $('#product_sn').textContent = `SN : ${sn ?? 'N/A'}`;
};
let stockData=[];
// Yab switching function 

const tableItems = $$('.table_switcher_container span')

tableItems.forEach(el=>el.onclick=()=>{
  tableItems.forEach(el=>el.classList.remove('active'))
  el.classList.add('active')
  filterByCategory(el.dataset.category)
})

const filterByCategory= category =>{
  inventoryCardContainer.innerHTML=''
  let stock=stockData.filter(d=>d.prodCategory.toLowerCase()===category)
  if (category==='') stock = stockData;
  if (category === 'ringer' || category === 'earpiece') stock = stockData.filter(d =>
    ['ringer', 'earpiece'].includes(d.prodCategory.toLowerCase())
  );
  
  
  stock.forEach(s=>{
    const card = document.createElement('div')
  card.classList.add('card')
  card.innerHTML=inventoryCard(s)
  inventoryCardContainer.appendChild(card)
  })
}

const stockRef = ref(db, `shops/${shopName}/stock`);
const createProdDataBtn = $('.create_prod_data')

createProdDataBtn.onclick=async()=>{
  
  // Date ans time
  const date = getCurrentDate()
  const time = getCurrentTime()
  // All input fields 
  const prodName = $('#prod_name').value.trim();
  const prodModel = $('#prod_model').value.trim();
  const prodQuantity = $('#prod_quantity').value.trim();
  const prodCategory = $('#prod_category').value.trim();
  const prodRate = $('#prod_rate').value.trim() || 0;
  const prodCustRate = $('#prod_customer_rate').value.trim() || 0;
  const prodPosition = $('#position').value.trim() || null;

  
  // check empty fields
  if (!prodName || !prodModel || !prodQuantity || !prodCategory ) {
    showNotice({title:'Validation Error!', body: 'All input is required!!', type: 'error'})
    return;
  }
  // ###### //
        $('.loader').classList.remove('hidden')
//   (async () => {
//   const sn = await getLastStockSn();
//   $('#product_sn').textContent = `SN : ${sn ?? 'N/A'}`;
// })();

  const lastStockSnRef = ref(db, `shops/${shopName}/lastStockSn`);
      const tx = await runTransaction(lastStockSnRef, (current) => (current === null ? 100 : current + 1));
      let snToUse = tx.snapshot.val();
      
      

  // Add to db
  
  const newStockRef = ref(db, `shops/${shopName}/stock/${snToUse}`);
  
  await set(newStockRef, {
  sn: snToUse,
  prodName,
  prodModel,
  prodCategory,
  prodQuantity,
  prodRate,
  prodCustRate,
  prodPosition: prodPosition || null,
  author: localStorage.getItem('author') || 'None Author',
  createdAt: {date, time}
  
})
.then(() => {
  showNotice({
    title: '✅ Success',
    body: 'Product added successfully!',
    type: 'success'
  });
$('.loader').classList.add('hidden')
  //location.hash = '#inventory';
  window.history.back()

  // Clear input fields
  $('#prod_name').value = '';
  $('#prod_model').value = '';
  $('#prod_quantity').value = '';
  // $('#prodCategory').value = '';
  $('#prod_rate').value = '';
  $('#prod_customer_rate').value = '';
  $('#position').value = '';
})
.catch(err => {
  showNotice({
    title: '❌ Error',
    body: err.message,
    type: 'error'
  });
  $('.loader').classList.add('hidden')
});
}


//#₹###### //

// When new Data Added
const inventoryCardContainer = $('#card_container');
inventoryCardContainer.innerHTML=''

onChildAdded(stockRef, (snapshot) => {
  $('.loader').classList.add('hidden')
  const product = snapshot.val();
  // console.log(product)
  createInventoryCard(product)
  stockData.push(product)
  
  $('#totel_stock').textContent=stockData.length.toLocaleString()
  const outOfStock = stockData.filter(d=>d.prodQuantity<3
  )
  $('#out_of_stock').textContent=outOfStock.length.toLocaleString()
  
  const availableSpare = stockData.filter(item => item.prodQuantity > 0);
$('#spareAvailableCount').textContent=availableSpare.length
})

// Next task create UI 

// location.hash='#inventory'


// create UI CARDS 

const createInventoryCard = stock =>{
  const card = document.createElement('div')
  card.classList.add('card')
  card.innerHTML=inventoryCard(stock)
  const optionContainer = $('.inventory_option_container')
  
  
  card.onclick=()=>optionContainer.classList.add('show')
  inventoryCardContainer.appendChild(card)
  optionContainer.onclick=(e)=>{
    if(e.target.classList.contains('inventory_option_container')) optionContainer.classList.remove('show');
    
  }
}

// ================== Auto suggestion ==================== //

// prod model

const prod_model = $('#prod_model')
const prod_model_suggest_container = $('#prod_model_suggest_container')

prod_model.oninput=(e)=>{
  //console.log(stockData)
  const value = e.target.value.trim().toLowerCase();
  prod_model_suggest_container.innerHTML = '';
  if (!value || nameInput.value.length >=2) return;
  
  
  // prod_model_suggest_container.classList.add('hidden')
  if (value.length >=2) {
    prod_model_suggest_container.classList.remove('hidden')
    
    
  // filter data first
  const matches = stockData.filter(item =>
    item.prodModel.toLowerCase().includes(value)
  );

  // ✅ remove duplicate names
  const uniqueMatches = [];
  const seenNames = new Set();

  matches.forEach(item => {
    const nameLower = item.prodModel.toLowerCase();
    if (!seenNames.has(nameLower)) {
      seenNames.add(nameLower);
      uniqueMatches.push(item);
    }
  });

  // show suggestions
  uniqueMatches.forEach(item => {
    const div = document.createElement('div');
    div.textContent = `${item.prodModel}`;
    div.classList.add('suggest-item');

    div.onclick = () => {
      prod_model.value = item.prodModel;
      prod_model_suggest_container.innerHTML = '';
    };

    prod_model_suggest_container.appendChild(div);
  });
  }
}

prod_model.onblur=()=>{
  setTimeout(()=>prod_model_suggest_container.classList.add('hidden'), 100)
}



// prod name suggests 

const prodNameInput = $('#prod_name')
const prod_name_suggest_container = $('#prod_name_suggest_container')

prodNameInput.oninput=(e)=>{
  const value = e.target.value.trim().toLowerCase();
  prod_name_suggest_container.innerHTML = '';
  if (!value || nameInput.value.length >=2) return;
  
  
  // prod_name_suggest_container.classList.add('hidden')
  if (value.length >=2) {
    prod_name_suggest_container.classList.remove('hidden')
    
    
  // filter data first
  const matches = stockData.filter(item =>
    item.prodName.toLowerCase().includes(value)
  );

  // ✅ remove duplicate names
  const uniqueMatches = [];
  const seenNames = new Set();

  matches.forEach(item => {
    const nameLower = item.prodName.toLowerCase();
    if (!seenNames.has(nameLower)) {
      seenNames.add(nameLower);
      uniqueMatches.push(item);
    }
  });

  // show suggestions
  uniqueMatches.forEach(item => {
    const div = document.createElement('div');
    div.textContent = `${item.prodName}, ${item.prodModel}`;
    div.classList.add('suggest-item');

    div.onclick = () => {
      prodNameInput.value = item.prodName;
      prod_model.value = item.prodModel;
      $('#position').value = item.prodPosition || '';
      $('#prod_category').value = item.prodCategory ||'';
      $('#prod_rate').value = item.prodRate || '';
      $('#prod_customer_rate').value=item.prodCustRate || ''
      prod_name_suggest_container.innerHTML = '';
    };

    prod_name_suggest_container.appendChild(div);
  });
  }
}

prodNameInput.onblur=()=>{
  setTimeout(()=>prod_name_suggest_container.classList.add('hidden'), 100)
}



  // category suggest 
const prodCategoryInput = $('#prod_category')
const category_suggest_container = $('#category_suggest_container')

prodCategoryInput.oninput=(e)=>{
  
  const value = e.target.value.trim().toLowerCase();
  category_suggest_container.innerHTML = '';
  if (!value || nameInput.value.length >=2) return;
  
  
  // category_suggest_container.classList.add('hidden')
  if (value.length >=2) {
    category_suggest_container.classList.remove('hidden')
    
    
  // filter data first
  const matches = stockData.filter(item =>
    item.prodCategory.toLowerCase().includes(value)
  );

  // ✅ remove duplicate names
  const uniqueMatches = [];
  const seenNames = new Set();

  matches.forEach(item => {
    const nameLower = item.prodCategory.toLowerCase();
    if (!seenNames.has(nameLower)) {
      seenNames.add(nameLower);
      uniqueMatches.push(item);
    }
  });

  // show suggestions
  uniqueMatches.forEach(item => {
    const div = document.createElement('div');
    div.textContent = `${item.prodCategory}`;
    div.classList.add('suggest-item');

    div.onclick = () => {
      prodCategoryInput.value = item.prodCategory;
      category_suggest_container.innerHTML = '';
    };

    category_suggest_container.appendChild(div);
  });
  }
}

prodCategoryInput.onblur=()=>{
  setTimeout(()=>category_suggest_container.classList.add('hidden'), 100)
}


// ###### END OFF INVENTORY MANAGEMENT SECTION ###### //



// ################## THEME FUNCTION ############### //

const themeInputs = {
  accent: $('#accent'),
  accentOpacity: $('#accentOpacity'),
  blur: $('#blur'),
  textColor: $('#textColor'),
  cardGlass: $('#cardGlass'),
  bgColor: $('#bgColor'),
  radius_large: $('#radius_large'),
  radius_small: $('#radius_small'),
};

// 🎨 Default fallback values
const defaultTheme = {
  accent: '#0ba2ff',
  accentOpacity: '0.5',
  blur: '8',
  textColor: '#e6edf3',
  cardGlass: '0.52',
  bgColor: '#0d1117',
  radius_large: '16',
  radius_small: '10',
};

// 🎨 Theme Presets
const themePresets = {
  'mobifixer-dark': {
    accent: '#0ba2ff',
    accentOpacity: '0.5',
    blur: '8',
    textColor: '#e6edf3',
    cardGlass: '0.52',
    bgColor: '#0d1117',
    radius_large: '16',
    radius_small: '10',
  },
  'natural-day': {
    accent: '#ff6b35',
    accentOpacity: '0.6',
    blur: '10',
    textColor: '#2d3436',
    cardGlass: '0.95',
    bgColor: '#f5f5f5',
    radius_large: '20',
    radius_small: '12',
  },
  'dark-compat': {
    accent: '#1e90ff',
    accentOpacity: '0.7',
    blur: '5',
    textColor: '#ffffff',
    cardGlass: '0.3',
    bgColor: '#1a1a1a',
    radius_large: '12',
    radius_small: '8',
  },
  'developer-mode': {
    accent: '#00ff00',
    accentOpacity: '0.8',
    blur: '12',
    textColor: '#00ff00',
    cardGlass: '0.6',
    bgColor: '#000000',
    radius_large: '24',
    radius_small: '14',
  },
};

function hexToRgba(hex, alpha = 1) {
  if (!hex.startsWith('#')) return hex; // already rgba
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyTheme(theme) {
  if(!theme) return;
  document.documentElement.style.setProperty('--accent-color', theme.accent);
  document.documentElement.style.setProperty('--glass-blur', `${theme.blur}px`);
  document.documentElement.style.setProperty('--text-color', theme.textColor);
  
  // Handle cardGlass - convert if it's a number (opacity) to rgba
  let cardGlassValue = theme.cardGlass;
  if (!cardGlassValue.includes('rgba') && !cardGlassValue.includes('rgb')) {
    cardGlassValue = hexToRgba(theme.accent, parseFloat(cardGlassValue));
  }
  
  document.documentElement.style.setProperty('--accent-glass', cardGlassValue);
  document.documentElement.style.setProperty('--card-bg', theme.bgColor);
  document.documentElement.style.setProperty('--radius-large', `${theme.radius_large}px`);
  document.documentElement.style.setProperty('--radius-small', `${theme.radius_small}px`);
}

function saveTheme() {
  const theme = {};
  for (const key in themeInputs) {
    theme[key] = themeInputs[key]?.value || defaultTheme[key];
  }

  // ✅ Convert accent color with opacity for storage
  theme.accent = themeInputs.accent?.value || defaultTheme.accent;

  localStorage.setItem('userTheme', JSON.stringify(theme));
  applyTheme(theme);
  showNotice({ title: 'Theme', body: 'Theme saved successfully!', type: 'success' });
}

function loadTheme() {
  const saved = localStorage.getItem('userTheme');
  const theme = saved ? JSON.parse(saved) : defaultTheme;

  applyTheme(theme);

  // 🧩 Update input values safely
  for (const key in themeInputs) {
    if (themeInputs[key]) {
      themeInputs[key].value = theme[key]?.toString().replace('px', '') || defaultTheme[key];
    }
  }
  
  // Update range display values
  updateRangeDisplays();
}

function loadPresetTheme(presetName) {
  const preset = themePresets[presetName];
  if (!preset) return;
  
  // Update input fields
  for (const key in preset) {
    if (themeInputs[key]) {
      themeInputs[key].value = preset[key];
    }
  }
  
  updateRangeDisplays();
  saveTheme();
  showNotice({ title: 'Theme', body: `${presetName.replace('-', ' ')} applied!`, type: 'success' });
}

function updateRangeDisplays() {
  const opacityInput = $('#accentOpacity');
  const blurInput = $('#blur');
  const cardGlassInput = $('#cardGlass');
  const radiusLargeInput = $('#radius_large');
  const radiusSmallInput = $('#radius_small');
  const accentInput = $('#accent');
  const bgColorInput = $('#bgColor');
  const textColorInput = $('#textColor');
  
  if (opacityInput) $('#opacityValue').textContent = opacityInput.value;
  if (blurInput) $('#blurValue').textContent = blurInput.value;
  if (cardGlassInput) $('#cardGlassValue').textContent = cardGlassInput.value;
  if (radiusLargeInput) $('#radiusLargeValue').textContent = radiusLargeInput.value;
  if (radiusSmallInput) $('#radiusSmallValue').textContent = radiusSmallInput.value;
  if (accentInput && $('#accentHex')) $('#accentHex').textContent = accentInput.value;
  if (bgColorInput && $('#bgColorHex')) $('#bgColorHex').textContent = bgColorInput.value;
  if (textColorInput && $('#textColorHex')) $('#textColorHex').textContent = textColorInput.value;
}

function resetTheme() {
  if (confirm('Are you sure you want to reset theme to default?')) {
    localStorage.removeItem('userTheme');
    location.reload();
  }
}

// 🔄 Event listeners
for (const key in themeInputs) {
  if (themeInputs[key]) {
    themeInputs[key].addEventListener('input', () => {
      updateRangeDisplays();
      saveTheme();
    });
  }
}

// Theme preset listeners
const themePresetElements = $$('.theme-preset');
themePresetElements.forEach(element => {
  element.addEventListener('click', () => {
    const presetName = element.getAttribute('data-theme');
    loadPresetTheme(presetName);
    
    // Update active state
    themePresetElements.forEach(el => el.classList.remove('active'));
    element.classList.add('active');
  });
});

$('#resetTheme')?.addEventListener('click', resetTheme);
$('#saveThemeBtn')?.addEventListener('click', saveTheme);

window.addEventListener('DOMContentLoaded', loadTheme);

// ################## THEME FUNCTION END ############### //


// ########## Input count for multiple devices ######### //


const decrease_device_btn = $('#decrease_device');
const increase_device_btn = $('#increase_device');
const device_count_input = $('#total_device_count');
const more_device_input_container = $('#more_device_input_container');

const handleDeviceCountChange = () => {
  let count = parseInt(device_count_input.value) || 1;

  // Initialize inputs on load
  updateInputs(count);

  decrease_device_btn.onclick = () => {
    if (count > 1) {
      count--;
      device_count_input.value = count;
      updateInputs(count);
    }
  };

  increase_device_btn.onclick = () => {
    if (count < 5) {
      count++;
      device_count_input.value = count;
      updateInputs(count);
    }
  };
};

const updateInputs = (count) => {
  const existingSets = more_device_input_container.querySelectorAll('.device-set').length;

  // ➕ Add missing device input sets
  for (let i = existingSets + 2; i <= count; i++) {
    const set = document.createElement('div');
    set.className = 'device-set';
    

    // Device name input
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = `Device ${i} Model Name`;
    nameInput.className = 'device-input name-input';

    // Complaint input
    const complaintInput = document.createElement('input');
    complaintInput.type = 'text';
    complaintInput.placeholder = `Device ${i} complaint`;
    complaintInput.className = 'device-input complaint-input';

    // Lock input
    const lockInput = document.createElement('input');
    lockInput.type = 'text';
    lockInput.placeholder = `Device ${i} lock`;
    lockInput.className = 'device-input lock-input';

    set.appendChild(nameInput);
    set.appendChild(complaintInput);
    set.appendChild(lockInput);

    more_device_input_container.appendChild(set);
  }

  // ➖ Remove extra device input sets if count decreased
  while (more_device_input_container.querySelectorAll('.device-set').length > count - 1) {
    more_device_input_container.lastElementChild.remove();
  }
};

handleDeviceCountChange();



// ########## SEARCH_POUCH ########## //

import { searchPouchCard } from './searchPouchCard.js';

const searchPouchInput = $('#search_pouch');
const pouchSearchOut = $('#search_out');

// Listen to all stock changes to keep stockData always up-to-date
//const stockRef = ref(db, `shops/${shopName}/stock`);
onValue(stockRef, (snapshot) => {
  stockData = [];
  snapshot.forEach(childSnap => {
    stockData.push({ sn: childSnap.key, ...childSnap.val() });
  });
});

// Search input
searchPouchInput.oninput = e => {
  const value = e.target.value.trim().toLowerCase();
  pouchSearchOut.innerHTML = '';

  if (value.length < 2) return pouchSearchOut.classList.add('hidden');

  pouchSearchOut.classList.remove('hidden');

  // Use the latest stockData (kept updated by onValue)
  const matches = stockData.filter(item =>
    item.prodCategory?.toLowerCase().includes('pouch') &&
    (item.prodName?.toLowerCase().includes(value) || item.prodModel?.toLowerCase().includes(value) || item.prodPosition?.toLowerCase() === value)
  );

  const uniqueMatches = [];
  const seenNames = new Set();

  matches.forEach(item => {
    const nameLower = item.prodName.toLowerCase();
    if (!seenNames.has(nameLower)) {
      seenNames.add(nameLower);
      uniqueMatches.push(item);
    }
  });

  uniqueMatches.forEach(item => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = searchPouchCard(item); // latest prodQuantity always
    pouchSearchOut.appendChild(div);
  });
};

// ######################### //



// ######################### //

const updateInventoryPouch = async (option, id, qtyElement) => {
  if (!option || !id) return;

  const itemRef = ref(db, `shops/${shopName}/stock/${id}`);
  const snapshot = await get(itemRef);

  if (!snapshot.exists()) return;
//$('.loader').classList.remove('hidden')
  const data = snapshot.val();
  let newQty = data.prodQuantity || 0;
// console.log(newQty)
  if (option === 'increase') newQty++;
  else if (option === 'decrease') newQty = newQty > 0 ? newQty - 1 : 0;

  // ✏️ UI update
  qtyElement.textContent = `${newQty} PCS`;

  // 💾 Firebase update
  await update(itemRef, { prodQuantity: newQty });
};

const serviceRef = ref(db, `shops/${shopName}/stock`);

onChildChanged(serviceRef, (snapshot) => {
  //$('.loader').classList.add('hidden')
  const changedKey = snapshot.key;       // child node key (sn)
  const updatedProduct = snapshot.val(); // updated product object

  // 🔁 Update local stockData array
  const index = stockData.findIndex(item => item.sn === changedKey);

  if (index !== -1) {
    // merge old object with updated values
    stockData[index] = { ...stockData[index], ...updatedProduct };
  } else {
    // if not found, push new object
    stockData.push(updatedProduct);
  }

  console.log(`🔄 StockData updated: ${changedKey}`, stockData[index] || updatedProduct);

  
});

//  New buttons
const showFirstAnim=()=>{
  document.querySelectorAll('.intro-anim').forEach(el => {
  const key = el.dataset.key || Math.random().toString(36).slice(2);
  const storageKey = `seen_${key}`;

  if (!localStorage.getItem(storageKey)) {
    // Animate only first-time
    setTimeout(() => el.classList.add('animate'), 150);
    localStorage.setItem(storageKey, 'true');
  } else {
    el.style.transform = 'scale(1)';
    el.style.opacity = '1';
  }
});
}


//.     TOGGLE BTN FUNCTION    ////

$$('.toggle_btn').forEach(btn => {
  btn.onclick = () => {
    btn.classList.toggle('active');

    // linked input (for logic or saving)
    const input = btn.parentElement.querySelector('input[type=checkbox]');
    if (input) input.checked = btn.classList.contains('active');

    // example: specific actions
    if (input?.name === 'theme') {
      document.documentElement.classList.toggle('light-mode', input.checked);
      localStorage.setItem('theme', input.checked ? 'light' : 'dark');
    }

    if (input?.name === 'notify') {
      console.log('Notifications:', input.checked ? 'Enabled' : 'Disabled');
    }
  };
});



// ###### Bottom sheet Functions ###### //




const sheetOverlay = document.querySelector('.bottom_sheet_overlay');
const sheet = document.querySelector('.bottom-sheet');
const closeBtn = document.querySelector('.close_sheet');

// Show the bottom sheet
const openSheet = () => {
  sheet.classList.add('active');
  sheetOverlay.classList.add('active');
}

// Hide the bottom sheet
const closeSheet = () => {
  sheet.classList.remove('active');
  sheetOverlay.classList.remove('active');
}

// Close button click
closeBtn.addEventListener('click', closeSheet);

// Overlay click (outside area)
sheetOverlay.addEventListener('click', (e) => {
  // prevent closing if clicking inside the sheet
  if (!sheet.contains(e.target)) {
    closeSheet();
  }
});

// Example trigger (you can call openSheet() from anywhere)
$$('[data-open-sheet]').forEach(btn => {
  btn.addEventListener('click', openSheet);
});

$$('[data-close-sheet]').forEach(btn => {
  btn.addEventListener('click', closeSheet);
});

// ###### Bottom sheet Functions END ###### //


// stafref for each data show //


const getStaff = async () => {
  const stafRef = ref(db, `shops/${shopName}/staff`);
  const snapshot = await get(stafRef);

  if (!snapshot.exists()) return;

  const data = snapshot.val();
  // console.log(data);

  const staffList = $('.staff_list'); // for example <div id="staff-list"></div>
  staffList.innerHTML = ''; // clear old data

  Object.entries(data).forEach(([id, staff]) => {
    const el = document.createElement('li');
    el.className = 'list-item'; // use your CSS class

    el.innerHTML = `
      <p>${staff.name} (${staff.role})</p>
    <i class="fa-solid fa-angle-right"></i>
    
    `;

    staffList.appendChild(el);
  });
};

getStaff()


/////////
//if author 

const owner = async ()=>{
  const ownerRef = ref(db, `shops/${shopName}/owner`);
  const snapshot = await get(ownerRef);

  if (!snapshot.exists()) return;

  const owner = snapshot.val();
  
  $('#my-name').textContent=localStorage.getItem('author')
  $('#my-role').textContent=localStorage.getItem('role')
  
$('.settings_page .profile_container .mail').textContent=owner.email || '(null)';
$('.profile_page .profile_container .mail').textContent=owner.email || '(null)';
  
  if (localStorage.getItem('author')?.toLowerCase() !== owner.name.toLowerCase()) {
  
  $('.staff_list').innerHTML = `
    <p class='pd-1' style='color: var(--text-muted)'><i>You can’t add or manage staff. Please contact <b>${owner.name}</b> for more information.</i></p>
  `;
}
}

owner()


// download data

const downloadData = async format => {
  const shopRef = ref(db, `shops/${shopName}`);
  const snapshot = await get(shopRef);

  if (!snapshot.exists()) {
    alert('No data found for this shop.');
    return;
  }

  const data = snapshot.val();

  if (format === 'json') {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    triggerDownload(blob, `${shopName}.json`);
  } 
  
  else if (format === 'excel') {
  const XLSXLib = window.XLSX;
  if (!XLSXLib) {
    alert('❌ XLSX not available. Check script import.');
    return;
  }

  const rows = Object.keys(data).map(id => ({
    id,
    ...data[id]
  }));

  const ws = XLSXLib.utils.json_to_sheet(rows);
  const wb = XLSXLib.utils.book_new();
  XLSXLib.utils.book_append_sheet(wb, ws, 'ShopData');
  XLSXLib.writeFile(wb, `${shopName}.xlsx`);
}
  
  else if (format === 'pdf') {
  const { jsPDF } = window.jspdf; // 👈 this is important
  const doc = new jsPDF();
  doc.setFontSize(12);
  doc.text(`Shop Data: ${shopName}`, 10, 10);

  // Convert object to string safely
  const text = JSON.stringify(data, null, 2);
  const splitText = doc.splitTextToSize(text, 180);
  doc.text(splitText, 10, 20);

  doc.save(`${shopName}.pdf`);
}
};

const triggerDownload = (blob, filename)=> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}



//downloadData('json')
















//#####################################################################//

// put it down 👇 
const CURRENT_VERSION = '5.0.0';
const LAST_VERSION = localStorage.getItem('app_version') || null;

if (LAST_VERSION !== CURRENT_VERSION) {
    // show notice
    showNotice({
        title: "App updated!",
        body: "You are now using version " + CURRENT_VERSION,
        type: "info",
        delay: 5 // seconds or use animation timing
    });

    // update last seen version
    localStorage.setItem('app_version', CURRENT_VERSION);
}

window.addEventListener('beforeunload', () => {
  localStorage.setItem('app_version', CURRENT_VERSION);
});

//######################### THE END ###################################//

 // location.hash='#settings'
 
const connectedRef = ref(db, '.info/connected');
onValue(connectedRef, (snap) => {
  if (snap.val() === true) {
    //alert('✅ Firebase is ONLINE now!');
  } else {
   // console.log('⚠️ Firebase went offline');
  }
});
 
 window.addEventListener('beforeunload', () => {
  goOffline(db);
});



///// check after after effect 

const infoRef = ref(db, '.info');
onValue(infoRef, snap => {
//  console.log(snap.val());
});

///

function localStorageSize() {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += ((localStorage[key].length + key.length) * 2); // 2 bytes per char
    }
  }
  return total; // size in bytes
}




////#######₹####### ALERT PAGE #############
let scrollY=0
const createAlert=()=>{
  const main = document.createElement('main')
  main.className='alert_page'
  main.innerHTML=`
  <div class='card'>
  <span>
    <i class="fa-solid fa-sim-card"></i>
    <h4>SIM CARD </h4>
  </span>
  
  <p>Don’t forget to return the <b>SIM card</b> to the customer</p>
  <button>Ok</button>
  </div>
  `
  document.body.appendChild(main)
  
  $('.alert_page button').onclick=()=>closeAlert()
  
  scrollY = window.scrollY;
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollY}px`;
  document.body.style.width = '100%';
} 

//createAlert()
const closeAlert=()=> {
  document.body.style.position = '';
  document.body.style.top = '';
  window.scrollTo(0, scrollY);
  $('.alert_page').style.opacity=0
 setTimeout(()=>$('.alert_page').remove(), 700)
}
///-----------///






console.log(`Approx localStorage used: ${localStorageSize()} bytes`);

// 

function logStorageStatus() {
  const used = localStorageSize();
  const max = 5 * 1024 * 1024;
  const percent = ((used / max) * 100).toFixed(2);
  
  console.log(`📦 localStorage used: ${used} bytes (${percent}%)`);
const backupData = JSON.parse(localStorage.getItem('backupData') || '{}');

const serviceCount = backupData.service ? Object.keys(backupData.service).length : 0;
const stockCount = backupData.stock ? backupData.stock.length : 0;

$('.percentage_count').textContent =`${percent}%`;
  $('.bacup_restore_page .prog_bar').style.width=`${percent}%`;
//  console.log(backupData)
$('#customers').textContent=`${serviceCount ||'No'} Clients`;
$('#stocks').textContent=`${stockCount || 'No'} Stocks`;
}
logStorageStatus()


// manually online === goOnline(db);
if (navigator.hardwareConcurrency <= 4) {
//  alert('syatem slow')
  console.log("Low-end device detected, enabling light mode...");
}






onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("✅ Logged in as:", user.email);
  } else {
    console.log("🚪 Logged out");
    location='./auth/index.html'
  }
});
//



function downloadServiceData() {
  // 1️⃣ Read from localStorage
  const localData = JSON.parse(localStorage.getItem("backupData") || "{}");

  // 2️⃣ Extract service array
  const serviceData = Array.isArray(localData.stock)
    ? localData.stock
    : Object.values(localData.stock || {});

  if (!serviceData.length) {
    alert("⚠️ No service data found in localStorage!");
    return;
  }

  // 3️⃣ Prepare JSON content
  const jsonString = JSON.stringify(serviceData, null, 2); // pretty format

  // 4️⃣ Create a downloadable blob
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  // 5️⃣ Create and trigger hidden link
  const a = document.createElement("a");
  a.href = url;
  a.download = `service_backup_${new Date().toISOString().split("T")[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // 6️⃣ Clean up
  URL.revokeObjectURL(url);

  console.log("📦 Service data exported successfully!");
}

/* ########## SHOP DETAILS PAGE ########## */

// Navigate to shop details page
function goToShopDetails() {
  location.hash = '#shop-details';
}
$("#editShop_details").onclick=()=>editShopDetails()
// Edit shop details - Open modal with current data
function editShopDetails() {
  try {
    const modal = $('#editShopModal');
    if (!modal) {
      showNotice({ 
        title: 'Error', 
        body: 'Edit modal not found!', 
        type: 'error' 
      });
      return;
    }

    // Get current data from localStorage
    const shopName = localStorage.getItem('shopName') || 'MobiFixer Service Center';
    const ownerName = localStorage.getItem('ownerName') || 'Saheer Babu';
    const ownerPhone = localStorage.getItem('ownerPhone') || '+91 98765 43210';
    const shopEmail = localStorage.getItem('shopEmail') || 'info@mobifixer.com';
    const shopLocation = localStorage.getItem('shopLocation') || 'Thrissur, Kerala, India';
    const shopGST = localStorage.getItem('shopGST') || '27AAJPA5055K1Z0';
    const shopEstablished = localStorage.getItem('shopEstablished') || 'January 2023';
    const shopDescription = localStorage.getItem('shopDescription') || '';
    const shopTagline = localStorage.getItem('shopTagline') || 'Professional Mobile Repair & Services';
    const hoursMF = localStorage.getItem('hoursMF') || '9:00 AM - 6:00 PM';
    const hoursSat = localStorage.getItem('hoursSat') || '10:00 AM - 5:00 PM';
    const hoursSun = localStorage.getItem('hoursSun') || 'Closed';

    // Fill form fields
    $('#editShopName').value = shopName;
    $('#editShopTagline').value = shopTagline;
    $('#editShopDescription').value = shopDescription;
    $('#editOwnerName').value = ownerName;
    $('#editOwnerPhone').value = ownerPhone;
    $('#editShopEmail').value = shopEmail;
    $('#editShopLocation').value = shopLocation;
    $('#editShopGST').value = shopGST;
    $('#editShopEstablished').value = shopEstablished;
    $('#editHoursMF').value = hoursMF;
    $('#editHoursSat').value = hoursSat;
    $('#editHoursSun').value = hoursSun;

    // Show modal with animation
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

  } catch (error) {
    console.error('Error opening edit modal:', error);
    showNotice({ 
      title: 'Error', 
      body: 'Failed to open edit form!', 
      type: 'error' 
    });
  }
}

// Close edit modal
function closeEditShopModal() {
  try {
    const modal = $('#editShopModal');
    if (modal) {
      modal.classList.add('hidden');
      document.body.style.overflow = 'auto';
    }
  } catch (error) {
    console.error('Error closing modal:', error);
  }
}

// Save shop details
function saveShopDetails(event) {
  event.preventDefault();

  try {
    // Get all form values
    const shopName = $('#editShopName').value.trim();
    const shopTagline = $('#editShopTagline').value.trim();
    const shopDescription = $('#editShopDescription').value.trim();
    const ownerName = $('#editOwnerName').value.trim();
    const ownerPhone = $('#editOwnerPhone').value.trim();
    const shopEmail = $('#editShopEmail').value.trim();
    const shopLocation = $('#editShopLocation').value.trim();
    const shopGST = $('#editShopGST').value.trim();
    const shopEstablished = $('#editShopEstablished').value.trim();
    const hoursMF = $('#editHoursMF').value.trim();
    const hoursSat = $('#editHoursSat').value.trim();
    const hoursSun = $('#editHoursSun').value.trim();

    // Validation
    if (!shopName) {
      showNotice({ title: 'Required', body: 'Shop name is required!', type: 'warning' });
      return;
    }

    if (!ownerName) {
      showNotice({ title: 'Required', body: 'Owner name is required!', type: 'warning' });
      return;
    }

    if (!ownerPhone) {
      showNotice({ title: 'Required', body: 'Phone number is required!', type: 'warning' });
      return;
    }

    if (!shopEmail) {
      showNotice({ title: 'Required', body: 'Email is required!', type: 'warning' });
      return;
    }

    if (!shopLocation) {
      showNotice({ title: 'Required', body: 'Location is required!', type: 'warning' });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shopEmail)) {
      showNotice({ title: 'Invalid Email', body: 'Please enter a valid email address!', type: 'warning' });
      return;
    }

    // Phone validation (basic)
    if (ownerPhone.length < 10) {
      showNotice({ title: 'Invalid Phone', body: 'Please enter a valid phone number!', type: 'warning' });
      return;
    }

    // Save to localStorage
    localStorage.setItem('shopName', shopName);
    localStorage.setItem('shopTagline', shopTagline);
    localStorage.setItem('shopDescription', shopDescription);
    localStorage.setItem('ownerName', ownerName);
    localStorage.setItem('ownerPhone', ownerPhone);
    localStorage.setItem('shopEmail', shopEmail);
    localStorage.setItem('shopLocation', shopLocation);
    localStorage.setItem('shopGST', shopGST);
    localStorage.setItem('shopEstablished', shopEstablished);
    localStorage.setItem('hoursMF', hoursMF);
    localStorage.setItem('hoursSat', hoursSat);
    localStorage.setItem('hoursSun', hoursSun);

    // TODO: Save to Firebase as well
    // const db = getDatabase(app);
    // update(ref(db, 'shopDetails'), {
    //   shopName, shopTagline, shopDescription, ownerName, ownerPhone, shopEmail,
    //   shopLocation, shopGST, shopEstablished, hours: { hoursMF, hoursSat, hoursSun }
    // });

    // Close modal
    closeEditShopModal();

    // Reload shop details
    loadShopDetails();

    // Show success message
    showNotice({ 
      title: 'Success', 
      body: 'Shop details updated successfully!', 
      type: 'success' 
    });

  } catch (error) {
    console.error('Error saving shop details:', error);
    showNotice({ 
      title: 'Error', 
      body: 'Failed to save shop details!', 
      type: 'error' 
    });
  }
}

// Load shop details from localStorage/Firebase
function loadShopDetails() {
  try {
    const shopDetailsPage = $('.shop_details_page');
    if (!shopDetailsPage) return;

    // Get shop info from localStorage or set defaults
    const shopName = localStorage.getItem('shopName') || 'MobiFixer Service Center';
    const ownerName = localStorage.getItem('ownerName') || 'Saheer Babu';
    const ownerPhone = localStorage.getItem('ownerPhone') || '+91 98765 43210';
    const shopEmail = localStorage.getItem('shopEmail') || 'info@mobifixer.com';
    const shopLocation = localStorage.getItem('shopLocation') || 'Thrissur, Kerala, India';
    const shopGST = localStorage.getItem('shopGST') || '27AAJPA5055K1Z0';
    const shopEstablished = localStorage.getItem('shopEstablished') || 'January 2023';
    const shopDescription = localStorage.getItem('shopDescription') || 'Welcome to MobiFixer Service Center - Your one-stop solution for all mobile device repairs and services. With over 5+ years of experience in the mobile repair industry, we pride ourselves on providing professional, reliable, and affordable repair services. Our team of certified technicians ensures that your device is handled with utmost care and expertise. We use genuine parts and the latest tools to deliver quality service every time.';
    const shopTagline = localStorage.getItem('shopTagline') || 'Professional Mobile Repair & Services';

    // Update shop header
    if ($('#shopName')) $('#shopName').textContent = shopName;
    if ($('#shopTagline')) $('#shopTagline').textContent = shopTagline;
    
    // Update shop information
    if ($('#ownerName')) $('#ownerName').textContent = ownerName;
    if ($('#ownerPhone')) $('#ownerPhone').textContent = ownerPhone;
    if ($('#shopEmail')) $('#shopEmail').textContent = shopEmail;
    if ($('#shopLocation')) $('#shopLocation').textContent = shopLocation;
    if ($('#shopGST')) $('#shopGST').textContent = shopGST;
    if ($('#shopEstablished')) $('#shopEstablished').textContent = shopEstablished;
    if ($('#shopDescription')) $('#shopDescription').textContent = shopDescription;

    // Calculate and update statistics from data
    calculateAndUpdateShopStats();

  } catch (error) {
    console.error('Error loading shop details:', error);
  }
}

// Calculate statistics from stored data
function calculateAndUpdateShopStats() {
  try {
    // These would be calculated from your Firebase data
    // For now, using placeholder values that can be updated when data is available
    
    const total_not_included = data.filter(
  item => item.status !== 'collected' && item.status !== 'return'
).length;

const collected = data.filter(
  item => item.status == 'collected').length;
  
  const pending = data.filter(
  item => item.status == 'pending').length;
  
  const totalCollectedRevenue = data
  .filter(item => item.status === 'collected')
  .reduce((sum, item) => {
    const amt = parseFloat(item.amount);

    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);


const monthMap = {
  JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
  JUL: 6, AUG: 7, SEP: 8, SEPT: 8, OCT: 9, NOV: 10, DEC: 11
};

function toStringIfElement(value) {
  // If it's a DOM element, take its text
  if (value && typeof value === 'object' && value.nodeType === 1) {
    return (value.textContent || value.innerText || '').trim();
  }
  return value;
}

function normalizeDateStr(raw) {
  if (!raw) return null;
  raw = toStringIfElement(raw);
  if (typeof raw !== 'string') return null;

  // remove time part if like "19/11/2025, 23:29:59"
  raw = raw.split(',')[0].trim();

  // replace multiple whitespace or slashes or dots with single dash
  raw = raw.replace(/[\/\s\.]+/g, '-');

  return raw;
}

function parseCustomDate(dateStr) {
  const s = normalizeDateStr(dateStr);
  if (!s) return null;

  const parts = s.split('-').filter(Boolean);
  if (parts.length < 3) return null;

  let day = parts[0];
  let mon = parts[1];
  let year = parts[2];

  // If format is dd-mm-yyyy or dd/mm/yyyy where month could be numeric
  if (/^\d+$/.test(mon)) {
    const mi = Number(mon) - 1;
    if (mi < 0 || mi > 11) return null;
    return new Date(Number(year), mi, Number(day));
  }

  // Normalize month text (use first 3 or 4 letters)
  mon = mon.toUpperCase();
  // try direct lookup, then try first 3 letters
  let monthIndex = monthMap[mon];
  if (monthIndex === undefined) monthIndex = monthMap[mon.slice(0,3)];

  if (monthIndex === undefined) return null;

  return new Date(Number(year), monthIndex, Number(day));
}

function parseAmount(amount) {
  if (amount == null) return 0;
  // if DOM element, get text
  amount = toStringIfElement(amount);
  // remove any non-digit except minus or dot, and parse
  const cleaned = String(amount).replace(/[^0-9\.\-]/g, '');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// today revenue
function calculateTodayRevenue(dataArray) {
  const today = new Date();
  return dataArray
    .filter(item => item && item.status === 'collected')
    .map(item => {
      return { ...item, _parsedDate: parseCustomDate(item.date) };
    })
    .filter(it => it._parsedDate
      && it._parsedDate.getDate() === today.getDate()
      && it._parsedDate.getMonth() === today.getMonth()
      && it._parsedDate.getFullYear() === today.getFullYear()
    )
    .reduce((sum, it) => sum + parseAmount(it.amount), 0);
}
  
    console.log(data)
    const totalCustomers = Object.keys(data|| {}).length || 124;
    const activeJobs = total_not_included|| 0; // Would come from job status
    const todayRevenue = calculateTodayRevenue(data)||0; // Would be calculated from today's transactions
    const completedJobs = collected|| 0; // Would come from completed jobs count
    const pendingJobs = pending || 0; // Would come from pending jobs
    const totalRevenue = totalCollectedRevenue||0; // Would sum all revenue
    const shopRating = 4.8; // Could be average of customer ratings

    // Update stat boxes
    if ($('#totalCustomers')) $('#totalCustomers').textContent = totalCustomers;
    if ($('#activeJobs')) $('#activeJobs').textContent = activeJobs;
    if ($('#todayRevenue')) $('#todayRevenue').textContent = todayRevenue;
    if ($('#completedJobs')) $('#completedJobs').textContent = completedJobs;
    if ($('#pendingJobs')) $('#pendingJobs').textContent = pendingJobs;
    if ($('#totalRevenue')) $('#totalRevenue').textContent = totalRevenue;
    if ($('#shopRating')) $('#shopRating').textContent = shopRating;

  } catch (error) {
    console.error('Error calculating shop statistics:', error.message);
  }
}

// Initialize shop details page on load
window.addEventListener('load', () => {
  setTimeout(() => {
    loadShopDetails();
  }, 2000);
});

// Also load when hash changes to shop details
window.addEventListener('hashchange', () => {
  if (location.hash === '#shop-details') {
    loadShopDetails();
  }
});

/* ########## END SHOP DETAILS PAGE ########## */

 // downloadServiceData()
 
 
// Usage:
// 1) page లో ഈ സ്ക്രിപ്റ്റ് ചേർക്കുക.
// 2) ഉപയോക്താവിൽ നിന്നും Notification permission വേണം.

const REMINDER_HOUR = 10;   // 24-hour (IST) — change as needed
const REMINDER_MIN = 0;
const REMINDER_TEXT = "Remind: Do the monthly task (9th).";

function getNext9thAt(hour = REMINDER_HOUR, minute = REMINDER_MIN) {
  const now = new Date();
  // create date in local timezone
  let year = now.getFullYear();
  let month = now.getMonth(); // 0..11
  let candidate = new Date(year, month, 9, hour, minute, 0, 0);

  if (now > candidate) {
    // already past this month's 9th -> next month
    month += 1;
    if (month > 11) { month = 0; year += 1; }
    candidate = new Date(year, month, 9, hour, minute, 0, 0);
  }
  return candidate;
}

function msUntil(date) {
  return date.getTime() - Date.now();
}

async function requestAndSchedule() {
  if (!("Notification" in window)) {
    console.warn("Notifications not supported in this browser.");
    return;
  }

  let permission = Notification.permission;
  if (permission !== "granted") {
    permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("User denied notifications.");
      return;
    }
  }

  scheduleNext();
}

function scheduleNext() {
  const next = getNext9thAt();
  const wait = msUntil(next);

  console.log("Next reminder scheduled at:", next.toString());

  // If wait is too big for setTimeout in some envs, you can split timers.
  setTimeout(() => {
    showNotification(REMINDER_TEXT);
    // schedule the subsequent month
    scheduleNext(); // recursion: compute next 9th and schedule again
  }, wait);
}

function showNotification(text) {
  try {
    new Notification(text);
    // optionally also play a sound or show UI on page
  } catch (err) {
    console.error("Notification failed:", err);
  }
}

// Start
requestAndSchedule();



//////////

const getDeviceInfo = () => {
    return {
        os: getOS(),
        browser: getBrowser(),
        deviceType: getDeviceType(),
        userAgent: navigator.userAgent,
        screen: {
            width: screen.width,
            height: screen.height,
            pixelRatio: window.devicePixelRatio
        },
        language: navigator.language,
        timestamp: Date.now()
    };
};

function getOS() {
    const ua = navigator.userAgent;

    if (/android/i.test(ua)) return "Android";
    if (/iPad|iPhone|iPod/.test(ua)) return "iOS";
    if (/Win/.test(ua)) return "Windows";
    if (/Mac/.test(ua)) return "macOS";
    if (/Linux/.test(ua)) return "Linux";

    return "Unknown";
}

function getBrowser() {
    const ua = navigator.userAgent;

    if (ua.includes("Edg")) return "Microsoft Edge";
    if (ua.includes("Chrome")) return "Google Chrome";
    if (ua.includes("Firefox")) return "Firefox";
    if (ua.includes("Safari")) return "Safari";
    if (ua.includes("Opera") || ua.includes("OPR")) return "Opera";

    return "Unknown";
}

function getDeviceType() {
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return "Mobile";
  if (/iPad|Tablet|Tab/i.test(ua)) return "Tablet";
  return "Desktop";
}

console.log("Device Type:", getDeviceType());
console.log(getDeviceInfo());


document.querySelector('#toggle_fullscreen_notification *').onclick = async () => {
  const devinfo = getDeviceInfo()
    const clickRef = ref(db, `clicks/${shopName}`);
    const logData = {
        button: "toggle_fullscreen_notification",
        id: "BTN_FS", 
        time: new Date().toLocaleTimeString("en-IN"),
        date: new Date().toLocaleDateString("en-IN"),
        timestamp: Date.now() ,// for sorting
        devinfo,
        shopName,
        authorName:localStorage.getItem('author') ||''
    };
    location.href='#full_screen_alert'

    try {
        await push(clickRef, logData);
        console.log("Click logged:", logData);
        
    } catch (err) {
        console.error("Logging failed:", err.message);
    }
};

