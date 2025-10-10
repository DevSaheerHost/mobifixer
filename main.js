const initialTime = performance.now();
import { cardLayout } from './cardLayout.js';
import { searchCard } from './searchCard.js';
import { inventoryCard} from './inventoryCard.js';

// Firebase core import
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

// Realtime Database import
import { getDatabase, ref, onChildAdded, onChildChanged, update, query, limitToLast, orderByKey, remove }
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

const shopName = localStorage.getItem('shopName')
if(!shopName) location='./auth/index.html'
// Reference to your data
const backupRef = ref(db, `shops/${shopName}`);

get(backupRef).then(snapshot => {
  if (!snapshot.exists()) {
    showNotice({ title: 'Backup', body: 'No data found in cloud', type: 'warn' });
    return;
  }
  
  
  
  const cloudData = snapshot.val();
  const cloudServices = cloudData.service ?
    (Array.isArray(cloudData.service) ? cloudData.service : Object.values(cloudData.service)) :
    [];
  
  const author = localStorage.getItem('author') || ''
  !author?$('.customInput').classList.remove('hidden'): '';
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
$('#shopname').textContent=shopName || 'My Shop';
const timerElement = $('#timerElement')

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
  
  if (filtered.length > 3 && !notified) {
    notified = true;
    showNotice({
      title: 'WARN',
      body: `${filtered.length} or More Customers have not collected their phones`,
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
    audio.play().catch(err => console.log("Audio play blocked:", err));
  }
  
  // update last SN
  $('#new_sn').textContent = Number(data[data.length - 1].sn) + 1;
  
  // ----------------------
  // Notify if multiple customers not collected their phones
  checkDoneDevices(data)
  
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
  $('.myshop').classList.add('active')
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
console.log(filtered[i])
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
  console.log(rendered)
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

const createCards = (data, status, sn) => {
  const listContainer = $('.list');
  
  // reset if new filter
  renderStart = 0;
  listContainer.innerHTML = "";
  
  // filter
  const filtered = sn ?
    data.filter(item => sn === item.sn) :
    data.filter(item => status === item.status).sort((a, b) => b.sn - a.sn);
  
  activeFiltered = filtered; // save for scroll loading
  
  if (filtered.length === 0) {
    listContainer.innerHTML = `<li class="empty">No data available</li>`;
    return;
  }
  
  renderNext(); // 👈 first 3 load
};


const renderNext = () => {
  const listContainer = $('.list');
  const nextSlice = activeFiltered.slice(renderStart, renderStart + renderLimit);

  nextSlice.forEach(item => {
    const listItem = document.createElement('li');
    listItem.classList.add('list-item');
    listItem.setAttribute("data-sn", item.sn);

    const nav = document.createElement('nav');
    nav.innerHTML = `
    <span class='flex_center'> 
    <input type="checkbox" class="multiSelect" data-sn="${item.sn}" id='${item.sn}'>
    <label for='${item.sn}'>
    <h3>${item.name}</h3></span>
    </label>
    <span><h3 class='sn'>${item.sn}</h3><i class="fa-solid fa-pen editIcon" data-sn='${item.sn}'></i></span>`;
    listItem.appendChild(nav);
    listItem.innerHTML += cardLayout(item);
    
    // delete function 
    listItem.oncontextmenu = (e) => {
  e.preventDefault();
  $('.delete_page').classList.remove('hidden');
  $('.delete_page').dataset.sn = item.sn;
};



    listContainer.appendChild(listItem);
  });

  renderStart += renderLimit;
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
  '#changelog':'.changelog-page'
};

const router = () => {
  //  hide all
    $('.inventory_option_container').classList.remove('show')
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
    return
  }

  // header animation handle
  $('header').classList.toggle('slide-up', hash === "#add" || hash === '#inventory' || hash ==='#addInventory');
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
  if(hash==='') shopSwitcher();
  if (hash==='#changelog') {
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
  }
  
  
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



const getCurrentTime = ()=> {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12; // 0 hours → 12
  return `${hours}:${minutes} ${ampm}`;
}
// Add data

import { set, get, runTransaction }
from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";
let dataIsEdit = false;
let editDataSn = 0
$('.add-data').onclick = async () => {
  const dataAddingTime = performance.now();
  const name = $('#name').value.trim();
  const number = $('#number').value.trim();
  const complaints = $('#complaint').value.trim();
  const model = $('#model').value.trim();
  const lock = $('#lock').value?.trim();
  const status = $('#status').value.trim() || 'None';
  const notes = $('#notes').value.trim() || '';
  const amount = $('#amount').value.trim() || 0;
  const advance = $('#advance').value.trim() || 0;
  
  if (!$('#sim').checked) {
    showNotice({ title: 'WARN', body: "Please check the 'SIM and accessories' box before submitting!", type: 'error' });
    return;
  }
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
      // ➕ ADD MODE
      const lastSnRef = ref(db, `shops/${shopName}/lastServiceSn`);
      const tx = await runTransaction(lastSnRef, (current) => (current === null ? 1 : current + 1));
      snToUse = tx.snapshot.val();
      $('#new_sn').textContent=snToUse
    }
    
    const date = new Date();
    const time = getCurrentTime()
    const options = { day: "2-digit", month: "short", year: "numeric" };
    const formatted = date.toLocaleDateString("en-GB", options).toUpperCase().replace(/ /g, "-");
    
    
    const itemRef = ref(db, `shops/${shopName}/service/${snToUse}`);
    await set(itemRef, {
      sn: snToUse,
      name,
      number,
      complaints,
      model,
      lock,
      status,
      notes,
      amount,
      advance,
      date: formatted,
      time: time,
      author: localStorage.getItem('author')
    });
    
    $('.loader').classList.add('hidden');
    $('.add-data').disabled = false;
    $('.add-data').textContent = 'Add to List';
    
    showNotice({
      title: snToUse,
      body: dataIsEdit ?
        'Data updated successfully ✅' :
        `Data added successfully (${Math.floor(performance.now() - dataAddingTime)}ms)`,
      type: 'success',
      delay: 30
    });
    
    // reset form & flags
    $('#name').value = '';
    $('#number').value = '';
    $('#complaint').value = '';
    $('#model').value = '';
    $('#lock').value = '';
    $('#advance').value = '';
    $('#amount').value = '';
    $('#notes').value = '';
    $('#sim').checked = false;
    
    dataIsEdit = false;
    editDataSn = 0;
    history.back();
    // show ui here
    //filterByStatus('pending')
    $$('nav a').forEach(elem=>elem.classList.remove('active'))
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




// status update listener
document.addEventListener("change", (e) => {
  if (e.target.matches("input[type=radio][name^='status-']")) {
    const sn = e.target.name.split("-")[1];
    const newStatus = e.target.id.split("-")[0];
    const parent = e.target.closest('li');

    // Trigger slide-out animation
    parent.classList.add('slid-out');

    // Wait for the transition to finish
    parent.addEventListener('transitionend', function handler(event) {
      if (event.propertyName === 'transform') { // only trigger once
        // Hide the element after sliding
        parent.style.display = 'none';

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

        parent.removeEventListener('transitionend', handler);
      }
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
      $('#name').value = data.name || '';
      $('#number').value = data.number || '';
      $('#complaint').value = data.complaints || '';
      $('#model').value = data.model || '';
      $('#lock').value = data.lock || '';
      $('#notes').value = data.notes || '';
      $('#amount').value = data.amount || '';
      $('#advance').value = data.advance || '';
      $('#status').value = data.status || '';
      $('#sim').checked = true;
      $('.add-data').textContent = 'Update Data';
    }
  })();
}
}



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
  const results = data.filter(item => 
  String(item.sn).includes(query) ||
    item.name.toLowerCase().includes(query) ||
    
    item.model.toLowerCase().includes(query) ||
    item.number.includes(query)
  );

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
    console.log("Service Worker registered:", reg);
    
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



document.onerror = (msg, src, line, col, err) => {
  showNotice({ 
    title:'ERROR', 
    body: `Something went wrong. ${msg}`, 
    type: 'error', 
    delay:10 
  });
};



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
    addBtn.innerHTML='<a href="#add">Add Customer</a>'
  } else {
    addBtn.classList.add('smallAddBtn');
    addBtn.style.width = '50px'
    addBtn.innerHTML='<a href="#add">+</a>'
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
    showNotice({title:'Offline', body:'Device disconnect.', type:'error'})
  const audio = document.getElementById("disconnect");
  if (audio) {
    audio.currentTime = 0;
    audio.play().catch(err => console.log("Audio play blocked:", err));
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
  location.hash='#add'
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
    refreshServiceData();
  }
});

function refreshServiceData() {
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
      showNotice({title: ' ✅', body:`Data refreshed successfully.`, type:'success'})
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
  });
}



if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}



$('#saveAuthorName').onclick=()=>{
  const Name = $('#authorName').value
  if (Name.length>3) {
   
   localStorage.setItem('author', Name)
   showNotice({title:'🫴', body: `Welcome ${Name} ;)`, type: 'info'})
   $('.customInput').classList.add('hidden')
  } else {
    
    showNotice({title: 'Validation Error', body:'Name include minimum 3 charector', type:'error'})
  }
}
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
  
  // filter data first
  const matches = data.filter(item =>
    item.model.toLowerCase().includes(value)
  );
  
  // ✅ remove duplicate names
  const uniqueMatches = [];
  const seenNames = new Set();
  
  matches.forEach(item => {
    const nameLower = item.model.toLowerCase();
    if (!seenNames.has(nameLower)) {
      seenNames.add(nameLower);
      uniqueMatches.push(item);
    }
  });
  
  // show suggestions
  uniqueMatches.forEach(item => {
    const div = document.createElement('div');
    div.textContent = item.model;
    div.classList.add('suggest-item');
    
    div.onclick = () => {
      modelInput.value = item.model;
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
  
  // filter data first
  const matches = data.filter(item =>
    item.complaints.toLowerCase().includes(value)
  );
  
  // ✅ remove duplicate names
  const uniqueMatches = [];
  const seenNames = new Set();
  
  matches.forEach(item => {
    const nameLower = item.complaints.toLowerCase();
    if (!seenNames.has(nameLower)) {
      seenNames.add(nameLower);
      uniqueMatches.push(item);
    }
  });
  
  // show suggestions
  uniqueMatches.forEach(item => {
    const div = document.createElement('div');
    div.textContent = item.complaints;
    div.classList.add('suggest-item');
    
    div.onclick = () => {
      complaintInput.value = item.complaints;
      complaintSuggestInput.innerHTML = '';
    };
    
    complaintSuggestInput.appendChild(div);
  });
};
complaintInput.onblur=()=> setTimeout(()=>complaintSuggestInput.classList.add('hidden'), 200)
complaintInput.onfocus=()=> complaintSuggestInput.classList.remove('hidden')




// ########### INVENTORY MANAGEMENT SECTION ######### //

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
  
  // All input fields 
  const prodName = $('#prod_name').value.trim();
  const prodModel = $('#prod_model').value.trim();
  const prodQuantity = $('#prod_quantity').value.trim();
  const prodCategory = $('#prod_category').value.trim();
  const prodRate = $('#prod_rate').value.trim() || 0;
  const prodCustRate = $('#prod_customer_rate').value.trim() || 0;
  
  
  // check empty fields
  if (!prodName || !prodModel || !prodQuantity || !prodCategory ) {
    showNotice({title:'Validation Error!', body: 'All input is required!!', type: 'error'})
    return;
  }
  // ###### //
  
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
  author: localStorage.getItem('author') || 'None Author'
}).then(()=>{
  showNotice({title:'Success', body:'Product Added successful!', type:'success'})
  location.hash='#inventory'
}).catch(err=>showNotice({title:'Error', body:err.message, type:'error'}));
}


//#₹###### //

// When new Data Added
const inventoryCardContainer = $('#card_container');
inventoryCardContainer.innerHTML=''

onChildAdded(stockRef, (snapshot) => {
  $('.loader').classList.add('hidden')
  const product = snapshot.val();
  createInventoryCard(product)
  stockData.push(product)
  
  $('#totel_stock').textContent=stockData.length.toLocaleString()
  const outOfStock = stockData.filter(d=>d.prodQuantity<3
  )
  $('#out_of_stock').textContent=outOfStock.length.toLocaleString()
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
}

// ###### END OFF INVENTORY MANAGEMENT SECTION ###### //




//#########################//

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


//#####################################################################//

// put it down 👇 
const CURRENT_VERSION = '3.5.1';
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

