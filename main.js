const initialTime = performance.now();
import { cardLayout } from './cardLayout.js';
import { searchCard } from './searchCard.js';
import { inventoryCard} from './inventoryCard.js';
import { generateWhatsAppLink} from './generateWhatsappLink.js';

// Firebase core import
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import { onAuthStateChanged, getAuth, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
// Realtime Database import
import { getDatabase, ref, onChildAdded, onChildChanged, update, query, limitToLast, orderByKey, remove , onValue, push, goOffline, goOnline}
from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";
// DOM helpers
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const downloadLocalData = () => {
 


  const backupData = JSON.parse(localStorage.getItem('backupData') || '{}');

  // Optional: Prevent downloading an empty file if there is no data
  if (Object.keys(backupData).length === 0) {
    console.log('No backup data found to export.');
    return; 
  }

  // Convert and create Blob
  const jsonString = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });

  // Create anchor and trigger download
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(blob);
  downloadLink.download = 'backup.json';

  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(downloadLink.href);

  
}

$('#exportJson').onclick=()=>downloadLocalData()
$('#clearLocalData').onclick=()=>{
  const isConfirmed = confirm('Are you sure you want to delete the backup data? This action cannot be undone.')
    if(isConfirmed){
      saveLogToDatabase('LocalData Cleared From settings', 'user cleared all local data from settings', 'warning' )
      localStorage.removeItem('backupData')
      showNotice({title:'LocalData Clearing', body:`Running command...`, type:'warn'})
      history.back();
      setTimeout(()=>location.reload(), 2000)
    
  

const homeContainer = document.querySelector('main.home');

if (homeContainer) {
  // 1. Core styles injected to create the terminal container
  homeContainer.style.background = "#0c0f12";
  homeContainer.style.color = "#a9b1d6";
  homeContainer.style.fontFamily = "'Fira Code', 'Courier New', monospace";
  homeContainer.style.padding = "20px";
  homeContainer.style.height = "80%";
  homeContainer.style.overflowY = "scroll";
  homeContainer.style.borderRadius = "6px";
  homeContainer.style.boxShadow = "inset 0 0 10px #000";
  homeContainer.style.scrollBehavior = "smooth";

  // 2. Inject basic skeleton with CSS Keyframes for the blinking cursor
  homeContainer.innerHTML = `
    <style>
      @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      .term-blink { animation: blink 1s infinite; color: #7aa2f7; }
      .log-line { margin-bottom: 4px; font-size: 13px; line-height: 1.4; }
    </style>
    <div id="console-stream"></div>
  `;

  const streamTarget = document.getElementById('console-stream');

  // 3. Pool of high-density fake app variables to loop through
  const dataPool = [
    { type: 'CASH', label: 'TRANSACTION_RECONCILED', val: 'ENCRYPED', color: '#9ece6a' },
    { type: 'CASH', label: 'ESCROW_LOCK_ENGAGED', val: 'ID_99218A', color: '#e0af68' },
    { type: 'CASH', label: 'LEDGER_SETTLEMENT_BATCH', val: 'SUCCESS (0.003s)', color: '#9ece6a' },
    { type: 'DEVICE', label: 'HARDWARE_ATTESTATION', val: 'PASS_CRYPTO_TOKEN', color: '#7aa2f7' },
    { type: 'DEVICE', label: 'GEOLOCATION_PING', val: '40.7128° N, 74.0060° W', color: '#bb9af3' },
    { type: 'DEVICE', label: 'MEM_ALLOCATION', val: 'Heap: 42.1MB / 128MB', color: '#565f89' },
    { type: 'LOGS', label: 'KERNEL_WS_CONNECT', val: 'wss://api.internal/v3', color: '#2ac3de' },
    { type: 'LOGS', label: 'RATE_LIMIT_CHECK', val: '0.04% capacity utilized', color: '#9ece6a' },
    { type: 'LOGS', label: 'SYNC_COMPLETED', val: 'Fetched 142 remote records', color: '#9ece6a' },
    { type: 'LOGS', label: 'THROTTLING_WARNING', val: 'DB pool connection near threshold', color: '#f7768e' }
  ];

  let lineCount = 0;

  // 4. Function to feed lines dynamically into the container
  function appendLog() {
    const timestamp = new Date().toLocaleTimeString();
    const item = dataPool[Math.floor(Math.random() * dataPool.length)];
    
    let tagColor = "#7dcfff";
    if (item.type === 'CASH') tagColor = '#9ece6a';
    if (item.type === 'DEVICE') tagColor = '#bb9af3';

    const logHTML = `
      <div class="log-line">
        <span style="color: #444b6a;">[${timestamp}]</span> 
        <span style="color: ${tagColor}; font-weight: bold;">[${item.type}]</span> 
        <span style="color: #c0caf5;">${item.label}</span> 
        <span style="color: #444b6a;">=&gt;</span> 
        <span style="color: ${item.color};">${item.val}</span>
      </div>
    `;

    // Remove old cursor
    const oldCursor = document.getElementById('term-cursor');
    if (oldCursor) oldCursor.remove();

    // Append new line and reposition cursor
    streamTarget.insertAdjacentHTML('beforeend', logHTML);
    streamTarget.insertAdjacentHTML('beforeend', `<span id="term-cursor" class="term-blink">█</span>`);

    // Clean memory if lines grow too dense
    lineCount++;
    if (lineCount > 100) {
      streamTarget.removeChild(streamTarget.firstChild);
    }

    // Direct downward anchor scrolling
    homeContainer.scrollTop = homeContainer.scrollHeight;

    // 5. CRITICAL UPDATE: Calculate a totally randomized delay strictly below 500ms
    // Math.random() * 490 generates a value from 0 to 490, adding 10 keeps it between 10ms and 500ms
    const randomDelay = Math.floor(Math.random() * 130) + 10;
    
    // Call the next iteration with the unique timing gap
    setTimeout(appendLog, randomDelay);
  }

  // Kickstart the recursive cycle
  appendLog();
    }
  }
  
}

logoutBtn.onclick=()=>{
  const isConfirmed = confirm(
  "Warning!\n\nIf you haven't downloaded your backup, your data may be lost after logging out.\n\nContinue?"
);
  if(isConfirmed){
    showNotice({title: 'Logging Out', body:'Running command...', type:'warn'})
    saveLogToDatabase('User Logged out', 'User logged out by clicking logout btn from settings', 'info' )

    history.go(-2);
    const homeContainer = document.querySelector('main.home');

  if (homeContainer) {
    // 1. Instantly clean the stream canvas and prep the target view
    homeContainer.innerHTML = `
      <style>
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .term-blink { animation: blink 1s infinite; color: #f7768e; }
        .log-line { margin-bottom: 4px; font-size: 13px; line-height: 1.4; }
      </style>
      <div id="console-stream"></div>
    `;

    const streamTarget = document.getElementById('console-stream');

    // 2. Specialized pool of shutdown and destructive console events
    const logoutPool = [
      { type: 'AUTH', label: 'REVOKING_BEARER_TOKEN', val: 'DEGRADED', color: '#f7768e' },
      { type: 'SESSION', label: 'TERMINATING_WS_THREAD', val: 'DISCONNECTED (0.00s)', color: '#e0af68' },
      { type: 'DEVICE', label: 'FLUSHING_SECURE_ENCLAVE', val: 'WIPED_OK', color: '#bb9af3' },
      { type: 'CASH', label: 'CLOSE_LEDGER_CHANNEL', val: 'ID_99218A_CLOSED', color: '#565f89' },
      { type: 'MEMORY', label: 'GARBAGE_COLLECTION', val: 'Heap: 0.0MB / 128MB', color: '#9ece6a' },
      { type: 'CACHE', label: 'DELETING_INDEXED_DB', val: 'SUCCESS', color: '#9ece6a' },
      { type: 'NET', label: 'CLOSING_INBOUND_SOCKET', val: 'PORT_STATUS_CLOSED', color: '#f7768e' }
    ];

    let currentLogIndex = 0;
    const totalShutdownLogs = 15; // Exact total amount of logs to print before final action

    // 3. Recursive logging stream function
    function appendLogoutLog() {
      // Safety threshold check: If we have shown enough text, execute hard data wipe
      if (currentLogIndex >= totalShutdownLogs) {
        executeFinalDataWipe(streamTarget);
        return;
      }

      const timestamp = new Date().toLocaleTimeString();
      const item = logoutPool[Math.floor(Math.random() * logoutPool.length)];
      
      let tagColor = "#7dcfff";
      if (item.type === 'CASH') tagColor = '#9ece6a';
      if (item.type === 'SESSION' || item.type === 'AUTH') tagColor = '#f7768e';

      const logHTML = `
        <div class="log-line">
          <span style="color: #444b6a;">[${timestamp}]</span> 
          <span style="color: ${tagColor}; font-weight: bold;">[${item.type}]</span> 
          <span style="color: #c0caf5;">${item.label}</span> 
          <span style="color: #444b6a;">=&gt;</span> 
          <span style="color: ${item.color};">${item.val}</span>
        </div>
      `;

      // Remove the old blinking cursor element
      const oldCursor = document.getElementById('term-cursor');
      if (oldCursor) oldCursor.remove();

      // Append new row and anchor the layout to the bottom
      streamTarget.insertAdjacentHTML('beforeend', logHTML);
      streamTarget.insertAdjacentHTML('beforeend', `<span id="term-cursor" class="term-blink">█</span>`);

      homeContainer.scrollTop = homeContainer.scrollHeight;
      currentLogIndex++;

      // Rapidly print logout lines (10ms to 90ms intervals for a high-speed crash effect)
      const randomDelay = Math.floor(Math.random() * 80) + 10;
      setTimeout(appendLogoutLog, randomDelay);
    }

    // 4. Final destructive sequence executor
    function executeFinalDataWipe(target) {
      const timestamp = new Date().toLocaleTimeString();
      
      // Inject terminal confirmation statement directly
      const finalHTML = `
        <div class="log-line" style="margin-top: 10px; border-top: 1px dashed #f7768e; padding-top: 10px;">
          <span style="color: #f7768e; font-weight: bold;">[SYSTEM_CRITICAL] ALL LOCAL STORAGE DATA FLUSHED...</span>
        </div>
      `;
      target.insertAdjacentHTML('beforeend', finalHTML);
      homeContainer.scrollTop = homeContainer.scrollHeight;

      // Stop reminders following a phone that is no longer signed in. Fire and
      // forget - logging out must not wait on, or be blocked by, the network.
      try { unregisterPush(); } catch (_) {}

      // Allow the user to see the confirmation for a brief split second, then clear storage completely
      setTimeout(() => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.replace('./auth')
      }, 400);
    }

    // Start processing active logout logs
    appendLogoutLog();
  }
  }
}


// // Check if the file has already been downloaded
//   if (localStorage.getItem('isBackupDownloaded') === 'true') {
//     console.log('Backup already downloaded. Skipping.');
//     return;
//   } else {
//     downloadLocalData();
//     //Set the flag in localStorage so it never runs again
//   localStorage.setItem('isBackupDownloaded', 'true');
//   }


// Records store their date as DD-MON-YYYY, built with
// toLocaleDateString('en-GB', {month:'short'}). Modern ICU renders September
// as "SEPT" while older engines (and the hardcoded tables below) use "SEP",
// so a stored date and a freshly computed one disagree for the same day -
// which is why today's entry count and today's takings both read zero for the
// whole of September. Two staff on different browsers can disagree the same
// way. Normalise the month to three letters before comparing; this only reads
// dates, so no stored record changes.
function normDateKey(v) {
  const t = String(v == null ? '' : v).toUpperCase().trim();
  const m = t.match(/^(\d{1,2})-([A-Z]+)-(\d{4})$/);
  return m ? `${m[1].padStart(2, '0')}-${m[2].slice(0, 3)}-${m[3]}` : t;
}

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



// Reference to your data
const backupRef = ref(db, `shops/${shopName}`);

// Function to generate key format: MM-DD-YYYY-HH-MM-SS-AM/PM
const getFormattedLogKey = () => {
  const date = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  
  const MM = pad(date.getMonth() + 1);
  const DD = pad(date.getDate());
  const YYYY = date.getFullYear();
  
  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // Convert 0 to 12 for 12-hour format
  const HH = pad(hours);
  
  const MIN = pad(date.getMinutes());
  const SS = pad(date.getSeconds());
  
  return `${DD}-${MM}-${YYYY}-${HH}-${MIN}-${SS}-${ampm}`;
};

// Function to push logs to Firebase with custom key
const saveLogToDatabase = (title, description, type) => {
  // Assuming 'db' is already initialized using getDatabase()
  // const db = getDatabase();
  
  const customKey = getFormattedLogKey();
  const logsRef = ref(db, `shops/${shopName}/logs`);
  
  const logData = {
    title: title,
    description: description, // This will save your HTML string exactly as passed
    type: type,
    author:localStorage.getItem('author') || '',
    timestamp: Date.now() // Useful if you need exact sorting later
  };

  // We use 'update' so it adds the new key without overwriting the 'logs' node
  update(logsRef, {
    [customKey]: logData
  })
  .then(() => console.log(`Log saved to: logs/${customKey}`))
  .catch((err) => console.error('Error saving log:', err));
};

const createPopUp = (title, description, buttonAction = null, type = 'success') => {
  
  // ---> Fire the logging function immediately when popup is called <---
  if (typeof saveLogToDatabase === 'function') {
    saveLogToDatabase(title, description, type);
  }

  let container = document.querySelector('.android-popup-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'android-popup-container';
    document.body.appendChild(container);
  }

  const popup = document.createElement('div');
  popup.className = `android-popup ${type}`;

  const icons = {
    success: '✅',
    warn: '⚠️',
    error: '🛑'
  };
  const icon = icons[type] || 'ℹ️';

  popup.innerHTML = `
    <div class="popup-header">
      <span style="font-size: 24px;">${icon}</span>
      <div class="popup-title">${title}</div>
    </div>
    <div class="popup-desc">${description}</div>
  `;

  // Create a container for buttons
  const actionsContainer = document.createElement('div');
  actionsContainer.className = 'popup-actions';

  // Create the Dismiss button
  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'popup-btn popup-btn-secondary';
  dismissBtn.innerText = 'DISMISS';
  dismissBtn.addEventListener('click', removePopup);

  // If there is an action, show both Dismiss and Action buttons
  if (buttonAction && typeof buttonAction === 'function') {
    const actionBtn = document.createElement('button');
    actionBtn.className = 'popup-btn';
    actionBtn.innerText = 'DOWNLOAD BACKUP'; 
    actionBtn.addEventListener('click', () => {
      buttonAction();
      removePopup();
    });
    
    actionsContainer.appendChild(dismissBtn);
    actionsContainer.appendChild(actionBtn);
  } else {
    // If no action, just show one button (e.g., GOT IT)
    dismissBtn.innerText = 'GOT IT';
    dismissBtn.classList.remove('popup-btn-secondary'); // Remove secondary styling so it uses theme color
    actionsContainer.appendChild(dismissBtn);
  }
  
  popup.appendChild(actionsContainer);
  container.appendChild(popup);

  // Trigger animations
  setTimeout(() => {
    container.classList.add('active'); 
    popup.classList.add('show');       
  }, 10);

  function removePopup() {
    popup.classList.remove('show');
    
    // Check if this is the last popup to remove the background blur
    if (container.children.length <= 1) {
       container.classList.remove('active');
    }

    popup.addEventListener('transitionend', () => {
      popup.remove();
      if (container.children.length === 0) {
        container.remove();
      }
    });
  }
};

// createPopUp('Sync Complete', 'All your data has been successfully saved to cloud.', null, 'success');






get(backupRef).then(snapshot => {
  if (!snapshot.exists()) {
    showNotice({ title: 'Backup', body: 'No data found in cloud', type: 'warn' });
    return;
  } else {
    const Main = snapshot.val()
    
    const email = Main.email || null;
    const userName = Main.username || null;
  }
  
  
  

  
  
  
  const cloudData = snapshot.val();
  const cloudServices = cloudData.service ? Object.fromEntries(Object.entries(cloudData.service).filter(([key, value]) => value != null)) : {};

  
  
  const author = localStorage.getItem('author') || ''
  !author?$('.customInput').classList.remove('hidden'): '';
  author.toLowerCase()=='shahin sha'? localStorage.setItem('role', 'Shop Owner') :null
  const role = localStorage.getItem('role')
  !role?$('.customInput').classList.remove('hidden'): '';
  $('#author_name_p').textContent=author || 'Unknown';
   
  const localData = JSON.parse(localStorage.getItem('backupData') || '{}');
  const localServices = localData.service ? Object.fromEntries(Object.entries(localData.service).filter(([key, value]) => value != null)) : {};

  
  const cloudCount = Object.keys(cloudServices).length;
  const localCount = Object.keys(localServices).length;

  
  console.log(`Local: ${localCount} | Cloud: ${cloudCount}`);
  //const cloudServicesCount = Object.keys(cloudData.service).length;
 // console.log(cloudCount)
  
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
      body: `⚠️ ${localCount-cloudCount}Data loss detected — Backup not updated! Please Inform to the Developer!!!`,
      type: 'error'
    });
    createPopUp(
  'Data Loss Detected', 
  `Cloud data is missing <b>${localCount-cloudCount} items</b>. Backup not updated! <b>Please Download ${localCount} current Backup instantly.</b><br><br>
  <small><i>Avoid this message if you already Downloaded the backup. This Message will Stop within 48hrs<i><small>
  `, 
  () => { downloadLocalData();saveLogToDatabase('Data downloaded', 'Uswr clicked Download Btn', 'Success'); }, 
  'error'
);
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


// Load only the most recent N services on startup (keeps load fast and memory bounded).
// Service keys are numeric SN strings, which RTDB orders numerically, so limitToLast returns the newest N.
const SERVICE_LOAD_LIMIT = 500;
const itemsRef = query(ref(db, `shops/${shopName}/service`), orderByKey(), limitToLast(SERVICE_LOAD_LIMIT))

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



// 🔁 Debounced list refresh — coalesces the initial burst (and rapid live updates)
// into a SINGLE re-render instead of one full filterByStatus() per record. This is
// the main fix for slow loading, and it hides the loader only AFTER the burst settles.
let refreshTimer = null;
const scheduleListRefresh = () => {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    const activeStatus = document.querySelector("nav a.active")?.dataset.text.toLowerCase() || "pending";
    filterByStatus(activeStatus);
    showUnseenCount();
    setAutoHeightTextArea();
    // Approximate preview for other contexts; the #add router reads the authoritative
    // counter, so don't overwrite it while the add form is open.
    if (data.length && location.hash !== '#add') $('#new_sn').textContent = Math.max(...data.map(d => Number(d.sn) || 0)) + 1;
    checkDoneDevices(data);
    remindOpenJobs(data);
    paintReminderButtons();
    if ($('#staticText')) $('#staticText').textContent = 'No Pending works';
    timerElement?.remove(); // drop the debug timer once load settles
    $('.loader').classList.add('hidden');
  }, 80);
};

onChildAdded(itemsRef, (snapshot) => {
  const item = snapshot.val();
  // Duplicate check → push or replace
  const existingIndex = data.findIndex(d => d.sn === item.sn);
  if (existingIndex === -1) {
    data.push(item);
  } else {
    data[existingIndex] = item;
  }

  // unseen counter for items not on the currently active tab
  const activeStatus = document.querySelector("nav a.active")?.dataset.text.toLowerCase() || "pending";
  if (item.status !== activeStatus) {
    unseen[item.status] = (unseen[item.status] || 0) + 1;
  }

  // 🔊 sound (kept for parity; playback currently disabled)
  const audio = document.getElementById("newSound");
  if (audio) {
    audio.currentTime = 0;
    //audio.play().catch(err => console.log("Audio play blocked:", err));
  }

  // one coalesced render for the whole burst
  scheduleListRefresh();
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

  // ✅ current active tab refresh (coalesced)
  scheduleListRefresh();

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
    nav.innerHTML=`<h3>${item.name} </h4> <h3 class='sn'>${item.sn} </h4> `;
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

  renderStart = 0;
  listContainer.innerHTML = "";

  let filtered = [...data];

  if (sn) filtered = filtered.filter(item => item.sn === sn);
  if (status && status !== 'all') filtered = filtered.filter(item => item.status === status); // 👈 only change
  if (date) filtered = filtered.filter(item => item.date === date);

  filtered.sort((a, b) => b.sn - a.sn);

  activeFiltered = filtered;

  if (filtered.length === 0) {
    listContainer.innerHTML = `<li class="empty">No data available</li>`;
    return;
  }

  renderNext();
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
    // Skip rendering if the item is marked as deleted
if (item.isDeleted === true) return; 

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
    divider.innerHTML = `<p>${date}, ${count} ${count === 1 ? 'entry' : 'entries'}</p>`;
  });
}
$('.delete_page').onclick=e=>{
  if(e.target.matches('main')) e.target.classList.add('hidden')
  
}

$('.delete_page .cancel').onclick=()=>$('.delete_page').classList.add('hidden')

// 📝 Fire-and-forget audit log. Never let logging break the actual action.
const logActivity = (action, opts = {}) => {
  try {
    push(ref(db, `shops/${shopName}/activity`), {
      action,                                   // create | edit | delete | status | note | bulk | collect
      sn: opts.sn ?? null,
      customer: opts.customer ?? null,
      detail: opts.detail ?? null,
      by: localStorage.getItem('author') || 'Unknown',
      role: localStorage.getItem('role') || '',
      at: new Date().toISOString()
    });
  } catch (e) {
    console.error('activity log failed:', e);
  }
};

// Only the shop owner may delete records (guardrail against accidental staff deletes).
const isOwner = () => (localStorage.getItem('role') || '').toLowerCase() === 'shop owner';

$('.delete_page .delete').onclick = async () => {
  if (!isOwner()) {
    $('.delete_page').classList.add('hidden');
    showNotice({ title: 'Not allowed', body: 'Only the Shop Owner can delete records.', type: 'warn', delay: 6 });
    return;
  }

  $('.loader').classList.remove('hidden')
  const sn = $('.delete_page').dataset.sn;
  $('.delete_page').classList.add('hidden');

  if (!sn) {
    $('.loader').classList.add('hidden')
    showNotice({title: 'Write Error', body: '❌ No Data found to delete', type: 'warn'});
    return
  }

  const itemsRef = ref(db, `shops/${shopName}/service/${sn}`);
  const deletedCustomer = data.find(d => String(d.sn) === String(sn))?.name || null;

  try {
    await update(itemsRef, { 
      isDeleted: true, 
      deletedAt: Date.now(),
      deletedBy: localStorage.getItem('author') || 'Unknown'
    });
        const localBackup = JSON.parse(localStorage.getItem('backupData') || '{}');
    if (localBackup.service && localBackup.service[sn]) {
      delete localBackup.service[sn];
      localStorage.setItem('backupData', JSON.stringify(localBackup));
    }

    logActivity('delete', { sn, customer: deletedCustomer });
    // NOTE: do NOT touch lastServiceSn here. A serial number is a permanent
    // identity — once issued it is never reused, even after the record is deleted.
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
  '#payments': '.payments-page',
  '#activity': '.activity-log-page',
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
    // The 404 animation is 237 KB and <lottie-player> fetches its src on
    // parse, even inside a display:none panel. It is held in data-src and
    // handed over only here, the first time the view is actually shown.
    const _nf = $('#notFoundAnim');
    if (_nf && !_nf.getAttribute('src') && _nf.dataset.src) {
      _nf.setAttribute('src', _nf.dataset.src);
    }
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
  // Show the TRUE next SN (max of stored counter and highest existing SN) + 1,
  // so the preview matches what will actually be assigned even after deletes.
  const floor = Math.max(0, ...data.map(d => Number(d.sn) || 0));
  $('#new_sn').textContent = floor + 1; // instant fallback
  get(ref(db, `shops/${shopName}/lastServiceSn`))
    .then(s => { $('#new_sn').textContent = Math.max(Number(s.val()) || 0, floor) + 1; })
    .catch(() => {});
}
  }
  
  if(hash==='#inventorySearch') $('#search_pouch').focus()
  if(hash==='#payments') renderPayments();
  if(hash==='#activity') renderActivity();
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
}
  
  $('#totalData').textContent = data.length;

// 🔹 Get today's date in "DD-MMM-YYYY" format (e.g., 12-OCT-2025)
const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const d = new Date();
const today =
  `${String(d.getDate()).padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;

// 🔹 Filter today's entries
const todayData = data.filter(item => normDateKey(item.date) === normDateKey(today));

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


function generateToken4() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 6; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}



// Create a promise that resolves when user confirms
function askUserToDo(task) {
    return new Promise((resolve, reject) => {
        const userConfirmed = confirm(`${task}`);
        
        if (userConfirmed) {
            resolve(`User completed: ${task}`);
        } else {
            reject(new Error(`User cancelled: ${task}`));
        }
    });
}

// Usage
// askUserToDo("review the document")
//     .then(result => console.log("Success:", result))
//     .catch(error => console.error("Error:", error.message));
    

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

// Firebase RTDB write promises never reject on a bad connection — they queue and
// stay pending forever. Race them against a timeout so the UI never hangs silently.
const SAVE_TIMEOUT = 15000;
const withTimeout = (p, ms, label) => Promise.race([
  p,
  new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT:' + label)), ms))
]);

let dataIsEdit = false;
let editDataSn = 0;

$('.add-data').onclick = async () => {
  const dataAddingTime = performance.now();
  const wasEdit = dataIsEdit; // snapshot mode — safe for deferred completion
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
  if(number.length<10 || number.length>10)return showNotice({title: 'Validation Error', body:'Invalid Number', type: 'error', delay:10})

  let snToUse = editDataSn;

  const resetAddButton = () => {
    $('.loader').classList.add('hidden');
    $('.add-data').disabled = false;
    $('.add-data').style.background = '';
    $('.add-data').textContent = wasEdit ? 'Update' : 'Add to List';
  };

  const onSaveError = (err) => {
    $('.loader').classList.add('hidden');
    $('.add-data').disabled = false;
    $('.add-data').textContent = (err && err.message) || 'Error';
    $('.add-data').style.background = 'red';
    console.error("❌ Error saving data:", err);
    showNotice({ title: 'ERROR', body: `Operation failed: ${err.message}`, type: 'error', delay: 6 });
  };

  // deferred=true → the write completed AFTER a slow-connection timeout; the card
  // already lands via onChildAdded, so skip navigation to avoid yanking the user around.
  const onSaveSuccess = (deferred = false) => {
    $('.loader').classList.add('hidden');
    $('.add-data').disabled = false;
    $('.add-data').style.background = '';
    $('.add-data').textContent = wasEdit ? 'Update' : 'Add to List';

    showNotice({
      title: snToUse,
      body: wasEdit
        ? 'Data updated successfully'
        : `Data added successfully${deferred ? '' : ` (${Math.floor(performance.now() - dataAddingTime)}ms)`}`,
      type: 'success',
      delay: 30
    });
    logActivity(wasEdit ? 'edit' : 'create', { sn: snToUse, customer: name });
    if (!wasEdit) createAlert();

    if (!wasEdit) {
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

    if (!deferred) {
      history.back();
      $$('nav a').forEach(elem => elem.classList.remove('active'));
      filterBySn(snToUse);
    }
  };

  $('.add-data').textContent = wasEdit ? 'Updating...' : 'Loading...';
  $('.add-data').disabled = true;
  $('.loader').classList.remove('hidden');

  // Don't even attempt a write while offline — it would silently queue and hang.
  if (!navigator.onLine) {
    showNotice({ title: 'Offline', body: 'No internet connection. Connect and try again.', type: 'error', delay: 8 });
    resetAddButton();
    return;
  }

  try {
    if (!wasEdit) {
      const lastSnRef = ref(db, `shops/${shopName}/lastServiceSn`);
      // Allocate above BOTH the stored counter and the true highest existing SN,
      // so a new SN can never collide with (overwrite) an existing record — even if
      // the counter was left corrupted by an older delete. `data` is loaded newest-
      // first, so its max SN is the global max.
      const floor = Math.max(0, ...data.map(d => Number(d.sn) || 0));
      const tx = await withTimeout(
        runTransaction(lastSnRef, (current) => Math.max(Number(current) || 0, floor) + 1),
        SAVE_TIMEOUT, 'sn'
      );
      snToUse = tx.snapshot.val();
      $('#new_sn').textContent = snToUse;
    }

    const token = generateToken4()

    const itemRef = ref(db, `shops/${shopName}/service/${snToUse}`);

    // 🧠 Get old record if editing (to preserve date/time)
    let oldData = {};
    if (wasEdit) {
      const snap = await withTimeout(get(itemRef), SAVE_TIMEOUT, 'sn');
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
        devices.push({ model: nameInput || '', complaints: complaintInput || '', lock: lockInput || '' , token:token || generateToken4()});
      }
    });
    devices.unshift({ model, complaints, lock });

// get updating date and author
let updateTime = null
let updatedBy=null
if(wasEdit){
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
      date: wasEdit ? oldData.date : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase().replace(/ /g, "-"),
      time: wasEdit ? oldData.time : getCurrentTime(),
      updateInfo: {updateTime, updatedBy},
      token
    };

    // ✅ Save — race against a timeout so the button never hangs on a bad connection.
    const savePromise = set(itemRef, newData);
    
    try {
      await withTimeout(savePromise, SAVE_TIMEOUT, 'save');
      onSaveSuccess(false);
    } catch (saveErr) {
      if (String(saveErr.message).startsWith('TIMEOUT')) {
        // The write is still queued and WILL commit when the connection returns.
        // Keep the button LOCKED (re-submitting would create a duplicate SN) and
        // finish up when the real write resolves.
        $('.loader').classList.add('hidden');
        $('.add-data').textContent = 'Saving… do not refresh';
        showNotice({
          title: 'Weak connection',
          body: 'Still saving. Keep the app open — it will finish automatically. Please do NOT refresh or re-submit.',
          type: 'warn',
          delay: 12
        });
        savePromise.then(() => onSaveSuccess(true)).catch(onSaveError);
      } else {
        throw saveErr;
      }
    }
   
   //____ 
  //   const localServices = localData.service ?
  //   (Array.isArray(localData.service) ? localData.service.filter(item=>item!=null) : Object.values(localData.service)) :
  //   [];
  
  // const cloudCount = cloudServices.length;
  // const localCount = localServices.length;
  //_____
    const existingBackupString = localStorage.getItem('backupData');
    const existingBackupData = existingBackupString ?JSON.parse(existingBackupString) : {};
    const Data = existingBackupData || [];
    const ValidData = Object.values(Data.service || {}).filter(i => i != null);

    
    
    
    if (ValidData.length <= data.length) {
        // Convert the filtered array back into an Object to prevent nulls forever
      const cleanServiceObject = {};
      ValidData.forEach(item => {
        // Use the 'sn' inside your data as the object key
        if (item && item.sn) {
          cleanServiceObject[item.sn] = item;
        }
      });
      
      Data.service = cleanServiceObject;
      Data.service[snToUse] = newData;
      Data.lastServiceSn = snToUse;
      console.log('updated service : ', Data.service)
      localStorage.setItem('backupData', JSON.stringify(Data));
    }else {
            

      showNotice({
      title: 'Backup Missmatch',
      body:'CoudData and localData is Different',
      type: 'error',
      })
      createPopUp('⚠️ Data Lose warning', `Your Backuped Datas : ${ValidData.length}. And Cloud Datas: ${data.length}. See difference?!. So Please Download Your Back-up datas NOW, and relogin to fix this issue (settings -> manage profile -> logout)`, ()=>{downloadLocalData()}, 'error')
    }
    
    
  } catch (err) {
    if (String(err.message).startsWith('TIMEOUT')) {
      // SN reservation / read timed out → nothing was written, safe to retry.
      onSaveError(new Error('Weak connection — please try again.'));
    } else {
      onSaveError(err);
    }
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
      .then(() => {
        logActivity('status', { sn, detail: newStatus });
        showNotice({
        title: sn,
        body: `Status Updated To, ${newStatus.toUpperCase()}`,
        type: 'info',
        delay: 5000
      });
      })
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
      .then(() => {
        logActivity('note', { sn });
        showNotice({title: sn, body:`Notes added to ${sn}` , type: 'success', delay: 5000});
      })
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
  //searchOut.classList.remove("hidden");
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
    //speakText("നന്ദി, വീണ്ടും വരുക kumar ഏട്ടാ!", "ml-IN", 1.1, 1);
  }
  if (type==='error') {
    speakText(body);
  }
  if (type ==='info') {
    navigator.vibrate([50, 70, 50]);
   // speakText(body);
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
    addBtn.style.height='50px'
    addBtn.innerHTML='<a>New</a>'
    addBtn.style.setProperty('border-radius', '14px', 'important'); 
  } else {
    addBtn.classList.add('smallAddBtn');
    addBtn.style.width = '60px'
    addBtn.style.height = '60px'
    addBtn.innerHTML='<a><i class="fa-solid fa-plus"></i></a>'
    addBtn.style.setProperty('border-radius', '50px', 'important'); 

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

const openPrintReceipt = (service) => {
  const sName = localStorage.getItem('shopName') || 'Service Center';
  const author = localStorage.getItem('author') || '';

  document.getElementById('pr-shop-name').textContent = sName.toUpperCase();
  document.getElementById('pr-sn').textContent = '#' + service.sn;
  document.getElementById('pr-date').textContent = `${service.date || ''} ${service.time || ''}`.trim();
  document.getElementById('pr-name').textContent = service.name || '';
  document.getElementById('pr-phone').textContent = service.number ? '+91 ' + service.number : '';

  const altRow = document.querySelector('.pr-alt-row');
  if (service.altNumber) {
    document.getElementById('pr-alt-phone').textContent = '+91 ' + service.altNumber;
    altRow.classList.remove('hidden');
  } else {
    altRow.classList.add('hidden');
  }

  // Devices
  const devContainer = document.getElementById('pr-devices-container');
  devContainer.innerHTML = '';
  if (Array.isArray(service.devices) && service.devices.length > 0) {
    service.devices.forEach((d, i) => {
      devContainer.innerHTML += `
        <div class="pr-row"><span class="pr-label">Device ${i + 1}</span><span class="pr-value">${d.model || ''}</span></div>
        <div class="pr-row"><span class="pr-label">Issue</span><span class="pr-value">${d.complaints || ''}</span></div>
        ${d.lock ? `<div class="pr-row"><span class="pr-label">Lock</span><span class="pr-value">${d.lock}</span></div>` : ''}
      `;
    });
  } else {
    devContainer.innerHTML = `
      <div class="pr-row"><span class="pr-label">Device</span><span class="pr-value">${service.model || ''}</span></div>
      <div class="pr-row"><span class="pr-label">Issue</span><span class="pr-value">${service.complaints || ''}</span></div>
      ${service.lock ? `<div class="pr-row"><span class="pr-label">Lock</span><span class="pr-value">${service.lock}</span></div>` : ''}
    `;
  }

  document.getElementById('pr-status').textContent = (service.status || '').toUpperCase();

  const amt = Number(service.amount) || 0;
  const adv = Number(service.advance) || 0;
  const bal = amt - adv;

  const amtRow = document.querySelector('.pr-amount-row');
  const advRow = document.querySelector('.pr-advance-row');
  const balRow = document.querySelector('.pr-balance-row');

  if (amt) {
    document.getElementById('pr-amount').textContent = '₹' + amt.toLocaleString('en-IN');
    amtRow.classList.remove('hidden');
  } else { amtRow.classList.add('hidden'); }

  if (adv) {
    document.getElementById('pr-advance').textContent = '₹' + adv.toLocaleString('en-IN');
    advRow.classList.remove('hidden');
  } else { advRow.classList.add('hidden'); }

  if (adv && amt) {
    document.getElementById('pr-balance').textContent = '₹' + bal.toLocaleString('en-IN');
    balRow.classList.remove('hidden');
  } else { balRow.classList.add('hidden'); }

  const notesSection = document.getElementById('pr-notes-section');
  if (service.notes && service.notes.trim()) {
    document.getElementById('pr-notes').textContent = service.notes;
    notesSection.classList.remove('hidden');
  } else {
    notesSection.classList.add('hidden');
  }

  document.getElementById('pr-technician').textContent = service.author ? 'Technician: ' + service.author : '';

  document.getElementById('printReceiptModal').classList.remove('hidden');
};

document.addEventListener('click', e => {


  //////////
if (e.target.tagName.toLowerCase() === 'nav') {
  const parent = e.target.closest('li');
//  alert(parent)
  if (parent) parent.classList.toggle('collapse');
}

  const remindBtn = e.target.closest('.remind-btn');
  if (remindBtn) {
    openRemindSheet(remindBtn.dataset.sn);
    return;
  }

  const printBtn = e.target.closest('.print-btn');
  if (printBtn) {
    const sn = printBtn.dataset.sn;
    const service = data.find(d => String(d.sn) === String(sn));
    if (service) openPrintReceipt(service);
    return;
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
    const bulkCount = selectedItems.size;
    await update(ref(db), updates);
    logActivity('bulk', { detail: newStatus, count: bulkCount });
    showNotice({
      title: '✅ Updated',
      body: `${bulkCount} items updated to ${newStatus}`,
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


/* ============================================================
   💰 PAYMENTS / BALANCE DUE
   ============================================================ */
const inr = (n) => '₹' + (Number(n) || 0).toLocaleString('en-IN');
const serviceBalance = (d) => (Number(d.amount) || 0) - (Number(d.advance) || 0);

const renderPayments = () => {
  const listEl = $('.payments-list');
  if (!listEl) return;

  // outstanding = jobs still owing money that aren't already handed over
  const due = data
    .filter(d => serviceBalance(d) > 0 && d.status !== 'collected' && d.status !== 'return')
    .sort((a, b) => serviceBalance(b) - serviceBalance(a));

  const outstanding = due.reduce((s, d) => s + serviceBalance(d), 0);

  // today's collected (uses payment date if present, else creation date)
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  const dt = new Date();
  const today = `${String(dt.getDate()).padStart(2,'0')}-${months[dt.getMonth()]}-${dt.getFullYear()}`;
  const collectedToday = data
    .filter(d => d.status === 'collected' && normDateKey(d.paidInfo?.date || d.date) === normDateKey(today))
    .reduce((s, d) => s + (Number(d.amount) || 0), 0);

  const setTxt = (id, v) => { const el = $('#' + id); if (el) el.textContent = v; };
  setTxt('pay-outstanding', inr(outstanding));
  setTxt('pay-due-count', due.length);
  setTxt('pay-today', inr(collectedToday));

  if (!due.length) {
    listEl.innerHTML = `<li class="empty">🎉 No pending balances. All settled!</li>`;
    return;
  }

  listEl.innerHTML = due.map(d => {
    const device = Array.isArray(d.devices) && d.devices[0]?.model ? d.devices[0].model : (d.model || '');
    return `
      <li class="pay-item" data-sn="${d.sn}">
        <div class="pay-main">
          <div class="pay-who">
            <p class="pay-name">${d.name || 'Unknown'} <span class="pay-sn">#${d.sn}</span></p>
            <p class="pay-sub">${device ? device + ' · ' : ''}${(d.status || '').toUpperCase()}</p>
          </div>
          <p class="pay-bal">${inr(serviceBalance(d))}</p>
        </div>
        <div class="pay-actions">
          ${d.number ? `<button class="call-btn pay-call" data-num="+91${d.number}"><i class="fa-solid fa-phone"></i></button>` : ''}
          <button class="pay-collect-btn" data-sn="${d.sn}"><i class="fa-solid fa-indian-rupee-sign"></i> Collect</button>
        </div>
      </li>`;
  }).join('');
};

// Mark a job fully paid & collected
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.pay-collect-btn');
  if (!btn) return;

  const sn = btn.dataset.sn;
  const svc = data.find(d => String(d.sn) === String(sn));
  if (!svc) return;

  const amt = Number(svc.amount) || 0;
  const bal = serviceBalance(svc);
  if (!confirm(`Mark #${sn} (${svc.name || ''}) as fully paid & collected?\nBalance ${inr(bal)} will be cleared.`)) return;

  btn.disabled = true;
  try {
    const paidInfo = { date: getCurrentDate(), time: getCurrentTime(), by: localStorage.getItem('author') || 'Unknown', amount: amt };
    await update(ref(db, `shops/${shopName}/service/${sn}`), { advance: amt, status: 'collected', paidInfo });
    // optimistic local update so the list refreshes instantly
    svc.advance = amt; svc.status = 'collected'; svc.paidInfo = paidInfo;
    logActivity('collect', { sn, customer: svc.name, detail: inr(bal) });
    showNotice({ title: 'Collected', body: `#${sn} marked paid & collected`, type: 'success' });
    renderPayments();
  } catch (err) {
    btn.disabled = false;
    showNotice({ title: 'Error', body: err.message, type: 'error', delay: 6 });
  }
});


/* ============================================================
   📝 STAFF ACTIVITY LOG
   ============================================================ */
const ACTIVITY_META = {
  create:  { icon: 'fa-plus',            verb: 'added' },
  edit:    { icon: 'fa-pen',             verb: 'edited' },
  delete:  { icon: 'fa-trash',           verb: 'deleted' },
  status:  { icon: 'fa-arrows-rotate',   verb: 'changed status of' },
  note:    { icon: 'fa-note-sticky',     verb: 'noted on' },
  bulk:    { icon: 'fa-layer-group',     verb: 'bulk-updated' },
  collect: { icon: 'fa-indian-rupee-sign', verb: 'collected payment for' }
};

const renderActivity = async () => {
  const listEl = $('.activity-list');
  if (!listEl) return;
  listEl.innerHTML = `<li class="empty">Loading…</li>`;

  try {
    const snap = await get(query(ref(db, `shops/${shopName}/activity`), limitToLast(100)));
    if (!snap.exists()) {
      listEl.innerHTML = `<li class="empty">No activity yet.</li>`;
      return;
    }

    const entries = Object.values(snap.val())
      .sort((a, b) => String(b.at).localeCompare(String(a.at)));

    listEl.innerHTML = entries.map(en => {
      const meta = ACTIVITY_META[en.action] || { icon: 'fa-circle-info', verb: en.action };
      let when = en.at;
      try { when = new Date(en.at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (_) {}
      const target = en.sn ? `#${en.sn}` : '';
      const cust = en.customer ? ` (${en.customer})` : '';
      const detail = en.detail ? ` → <b>${en.detail}</b>` : '';
      return `
        <li class="act-item act-${en.action}">
          <span class="act-icon"><i class="fa-solid ${meta.icon}"></i></span>
          <div class="act-body">
            <p class="act-text"><b>${en.by || 'Unknown'}</b>${en.role ? ` <span class="act-role">${en.role}</span>` : ''} ${meta.verb} ${target}${cust}${detail}</p>
            <p class="act-when">${when}</p>
          </div>
        </li>`;
    }).join('');
  } catch (err) {
    console.error('activity load failed:', err);
    listEl.innerHTML = `<li class="empty">⚠️ Couldn't load activity.</li>`;
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
    div.textContent = `${item.name || ''}, ${item.number || ''}, ${item.devices[0].model||''}`;
    div.classList.add('suggest-item');

    div.onclick = () => {
      nameInput.value = item.name || '';
      numberInput.value = item.number || '';
      modelInput.value = item.devices[0].model || '';
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
    div.textContent = `${item.prodName || ''}, ${item.prodModel ||''}`;
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

    // Device name input field
    const nameWrapper = document.createElement('div');
    nameWrapper.className = 'input_field';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.placeholder = '';
    nameInput.className = 'device-input name-input';
    nameInput.required=true

    const nameLabel = document.createElement('label');
    nameLabel.textContent = `Device ${i} Model Name`;

    nameWrapper.appendChild(nameInput);
    nameWrapper.appendChild(nameLabel);

    // Complaint input field
    const complaintWrapper = document.createElement('div');
    complaintWrapper.className = 'input_field';

    const complaintInput = document.createElement('input');
    complaintInput.type = 'text';
    complaintInput.placeholder = '';
    complaintInput.required=true

    complaintInput.className = 'device-input complaint-input';

    const complaintLabel = document.createElement('label');
    complaintLabel.textContent = `Device ${i} complaint`;

    complaintWrapper.appendChild(complaintInput);
    complaintWrapper.appendChild(complaintLabel);

    // Lock input field
    const lockWrapper = document.createElement('div');
    lockWrapper.className = 'input_field';

    const lockInput = document.createElement('input');
    lockInput.type = 'text';
    lockInput.placeholder = '';
    lockInput.required=true
    lockInput.className = 'device-input lock-input';

    const lockLabel = document.createElement('label');
    lockLabel.textContent = `Device ${i} lock`;

    lockWrapper.appendChild(lockInput);
    lockWrapper.appendChild(lockLabel);

    // Append input fields to device set
    set.appendChild(nameWrapper);
    set.appendChild(complaintWrapper);
    set.appendChild(lockWrapper);

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

    // The markup names this input voice_alert, so the previous branch here
    // (input.name === 'notify') never matched and the setting did nothing.
    if (input?.name === 'voice_alert') {
      const on = input.checked;
      localStorage.setItem(REMINDER_ENABLED_KEY, on ? 'on' : 'off');
      // The only place permission is requested: the user just asked for it.
      if (on && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
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


//################################################
// To set ShopDetails on Settings Page
const setShopInfo = (owner) =>{
  const shopOwnerName = owner.name || 'UnKnOwN'
  $('#ownerName').textContent= shopOwnerName;
}
//################################################
// stafref for each data show //


const getStaff = async () => {
  const stafRef = ref(db, `shops/${shopName}/staff`);
  const snapshot = await get(stafRef);

  if (!snapshot.exists()) return;

  const data = snapshot.val();
   

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
setShopInfo(owner)
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

// (Previously a second 'beforeunload' listener wrote app_version here. It is
// already written above on the same path, and 'beforeunload' disqualifies the
// page from the back/forward cache, forcing a full cold reload on every
// back-navigation.)

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
 
 // Only drop the realtime socket when the page is genuinely being discarded.
 // This used to run on 'beforeunload', but on iOS a page usually goes into the
 // back/forward cache and is later RESTORED - so after switching to WhatsApp
 // and coming back, the app looked fine while the socket was dead: no live
 // updates, and writes queued against a closed connection. Nothing called
 // goOnline (its only mention was a comment), and the visibilitychange handler
 // that should have recovered has its one real call commented out.
 // 'pagehide' with event.persisted tells us which case we are in, and
 // registering it instead of 'beforeunload' also keeps the page eligible for
 // the back/forward cache.
 window.addEventListener('pagehide', (event) => {
  if (!event.persisted) goOffline(db);
});

 // Coming back from the bfcache, or from a background tab: make sure the
 // connection is live again. goOnline is a no-op when already connected.
 window.addEventListener('pageshow', (event) => {
  if (event.persisted) goOnline(db);
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') goOnline(db);
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






// (removed a duplicate localStorageSize() scan that existed only to log a
// debug line; logStorageStatus() below already computes it for the UI.)

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

 // Helper function to format bytes into KB or MB
  function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    if (bytes < 1024) {
      return bytes + ' Bytes';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    } else {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
  }

  // Set the formatted text content for used and total storage
  $('#usedStorage').textContent = formatBytes(used);
  $('#totalStorage').textContent = formatBytes(max); // Fixed: changed 'used' to 'max'
}
logStorageStatus()


// manually online === goOnline(db);
if (navigator.hardwareConcurrency <= 4) {
//  alert('syatem slow')
  console.log("Low-end device detected, enabling light mode...");
}






/* ########## SHOP ACCESS ##########
 *
 * Signing in proves WHO you are. It proves nothing about WHICH shop you may
 * open. Until now the app took the shop from localStorage:
 *
 *     const shopName = localStorage.getItem('shopName')   // main.js, top
 *
 * and onAuthStateChanged only checked that you were signed in to *some*
 * account in this Firebase project. Anyone can make one on the signup page.
 * So: sign up as yourself, set localStorage.shopName to another shop, reload,
 * and you had that shop's customers, phone numbers and amounts.
 *
 * This is the same hole cashbook had (F1 in firebase/SECURITY-AUDIT.md) and
 * this is the same fix, in the same order: record first, enforce later.
 * ENFORCE_SHOP_ACCESS is false, so nothing below denies anybody. It builds the
 * uid -> shop mapping that the security rules will eventually need, and tells
 * us — from real logins, not guesswork — which shops are already mapped.
 *
 * Turning it on is one constant. Turning it back off is the same constant.
 */
const ENFORCE_SHOP_ACCESS = false;

// Audit trail. uid and outcome only: never an email, a password or a token
// (and never the shop's data). Fire and forget - a login must not fail, or
// wait, because logging did.
const logShopAccess = (shop, uid, outcome) => {
  try {
    push(ref(db, `shops/${shop}/authAudit`), {
      uid: uid || null,
      outcome,
      at: Date.now(),
      enforced: ENFORCE_SHOP_ACCESS
    }).catch(() => {});
  } catch (_) { /* never let the audit break a login */ }
};

/**
 * Does this signed-in account belong to this shop?
 *
 *   member    - a uid we already recognise for this shop
 *   claimed   - a legacy shop with no uid recorded, just mapped to this account
 *   mismatch  - the shop knows uids, and this is not one of them
 *   no-record - we cannot tell (offline, unreadable, or no anchor to claim on)
 *
 * Only `mismatch` is ever a denial, and only once ENFORCE_SHOP_ACCESS is true.
 * Anything we are unsure about stays allowed on purpose: this runs against
 * live shops, and a wrong guess locks a real person out of their own work.
 */
async function resolveShopAccess(shop, user) {
  const uid = user && user.uid;
  if (!shop || !uid) return 'no-record';

  // Deliberately NOT get(`shops/${shop}`): that pulls the whole shop - every
  // service record - down the wire on every auth state change, on phones, on
  // mobile data. Read only the four small nodes this decision needs.
  let owner, members, legacyUid, legacyEmail;
  try {
    [owner, members, legacyUid, legacyEmail] = await Promise.all([
      get(ref(db, `shops/${shop}/owner`)),
      get(ref(db, `shops/${shop}/members`)),
      get(ref(db, `shops/${shop}/uid`)),
      get(ref(db, `shops/${shop}/email`))
    ]);
  } catch (_) {
    return 'no-record';               // offline or unreadable: never deny
  }

  // owner is an object on shops created by signup. The removed Google sign-in
  // wrote it as a bare display-name string, so guard the shape before reading
  // through it.
  const ownerVal = owner.exists() ? owner.val() : null;
  const ownerObj = (ownerVal && typeof ownerVal === 'object') ? ownerVal : {};
  const shopData = {
    owner: ownerObj,
    uid: legacyUid.exists() ? legacyUid.val() : null,
    email: legacyEmail.exists() ? legacyEmail.val() : null
  };

  const membersVal = members.exists() ? members.val() : null;
  if (membersVal && membersVal[uid]) return 'member';

  // Nothing here at all - no owner, no members, no legacy fields. Either the
  // shop does not exist or it is unrecognisable; both are "cannot tell".
  if (!ownerVal && !membersVal && !shopData.uid && !shopData.email) return 'no-record';

  // Shops created by signup carry owner.uid; shops migrated off a plaintext
  // password got a top-level uid instead (auth/main.js writes both shapes).
  const ownerUid = ownerObj.uid || shopData.uid || null;
  if (ownerUid && ownerUid === uid) {
    // Known owner, but not in the members map yet. Record it so the map ends
    // up complete without anyone having to do anything.
    await writeMember(shop, uid, shopData, 'owner-uid');
    return 'member';
  }
  if (ownerUid || membersVal) return 'mismatch';

  // Legacy shop: no uid anywhere. Claim it for the account whose email matches
  // the one on the shop record. That anchor is not forgeable from here - the
  // address is already registered in Firebase Auth, and Auth will not hand out
  // a second account for it.
  //
  // It is still only as strong as the rules, which are still open: today
  // anyone could write this node directly. That is why the audit records HOW a
  // mapping was made, and why a server-side backfill supersedes it later.
  const shopEmail = String(ownerObj.email || shopData.email || '').trim().toLowerCase();
  const userEmail = String((user && user.email) || '').trim().toLowerCase();
  if (shopEmail && shopEmail === userEmail) {
    const ok = await writeMember(shop, uid, shopData, 'client-claim');
    return ok ? 'claimed' : 'no-record';
  }

  return 'no-record';
}

// Additive: a new node beside the existing ones. Nothing is moved or removed,
// and no `role` is recorded - owner and staff share one account today, so a
// uid-level role would be a guess that a future rule would read and be wrong
// about.
async function writeMember(shop, uid, shopData, claimedVia) {
  try {
    await update(ref(db, `shops/${shop}/members/${uid}`), {
      name: (shopData.owner && shopData.owner.name) || '',
      claimedAt: Date.now(),
      claimedVia
    });
    return true;
  } catch (_) {
    return false;
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    console.log("🚪 Logged out");
    location='./auth/index.html'
    return;
  }

  // Deliberately not logging user.email - see logShopAccess.
  console.log("✅ Signed in");

  const outcome = await resolveShopAccess(shopName, user);
  logShopAccess(shopName, user.uid, outcome);
  console.log("shop access:", outcome);

  if (outcome === 'mismatch' && ENFORCE_SHOP_ACCESS) {
    try { await signOut(auth); } catch (_) {}
    localStorage.removeItem('shopName');
    localStorage.removeItem('author');
    localStorage.removeItem('role');
    alert("This account does not have access to that shop.");
    location='./auth/index.html';
  }
});
/* ########## END SHOP ACCESS ########## */



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
// Same modal, reached from the empty-state card at the top of the page.
if ($('#setupShopBtn')) $('#setupShopBtn').onclick = () => editShopDetails()
// Edit shop details - Open modal with current data
function editShopDetails() {
  try {
    // The hidden button is cosmetic; this is what actually stops a staff
    // member reaching the form. Still a guard rail, not a security boundary —
    // see canEditShopDetails().
    if (!canEditShopDetails()) {
      showNotice({
        title: 'Owner only',
        body: 'Only the shop owner can change the shop details.',
        type: 'warning'
      });
      return;
    }

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
    // Blank, not invented. These fields used to be PREFILLED with the
    // developer's name, address and GST number, so a shop that opened this
    // form and pressed Save would have written someone else's tax identifier
    // in as their own. An empty field shows its placeholder instead.
    const d = shopDetailsCache || {};
    const cur = (k) => {
      const v = d[k] != null ? d[k] : localStorage.getItem(k);
      return (v && String(v).trim()) ? String(v).trim() : '';
    };
    // Display name only. The tenant key (localStorage 'shopName') is never
    // written from this form.
    const shopName = cur('shopDisplayName') || localStorage.getItem('shopName') || '';
    const ownerName = cur('ownerName');
    const ownerPhone = cur('ownerPhone');
    const shopEmail = cur('shopEmail');
    const shopLocation = cur('shopLocation');
    const shopGST = cur('shopGST');
    const shopEstablished = cur('shopEstablished');
    const shopDescription = cur('shopDescription');
    const shopTagline = cur('shopTagline');
    const hoursMF = cur('hoursMF');
    const hoursSat = cur('hoursSat');
    const hoursSun = cur('hoursSun');

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
$('#modalOverlay').onclick=closeEditShopModal
$('#modalClose').onclick=closeEditShopModal
$('#cancelModalClose').onclick=closeEditShopModal

// Save shop details
function saveShopDetails(event) {
  event.preventDefault();

  try {
    // Get all form values
    const displayName = $('#editShopName').value.trim();   // display only, NOT the tenant key
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
    if (!displayName) {
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

    // NOT localStorage.setItem('shopName', ...). `shopName` is the tenant key
    // behind every database path in this app; rewriting it here would repoint
    // the whole app at a different (probably non-existent) node and the shop's
    // data would appear to vanish. The field is disabled in the markup, so
    // this was a no-op rewrite — but it was one attribute away from being
    // catastrophic. The display name is stored separately.
    localStorage.setItem('shopDisplayName', displayName);
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

    const details = {
      shopDisplayName: displayName, shopTagline, shopDescription, ownerName, ownerPhone,
      shopEmail, shopLocation, shopGST, shopEstablished, hoursMF, hoursSat, hoursSun,
      updatedAt: Date.now(),
      updatedBy: localStorage.getItem('author') || 'Unknown'
    };
    shopDetailsCache = { ...(shopDetailsCache || {}), ...details };

    // Close modal and repaint from the cache straight away, so the change is
    // visible whether or not the network is up.
    closeEditShopModal();
    loadShopDetails();

    // Then share it with the rest of the shop. Only claim success once it
    // has actually been written.
    update(ref(db, `shops/${shopName}/shopDetails`), details)
      .then(() => showNotice({
        title: 'Saved',
        body: 'Shop details updated for everyone in the shop.',
        type: 'success'
      }))
      .catch(() => showNotice({
        title: 'Saved on this phone only',
        body: 'Could not reach the server, so your team will not see this yet. It will need saving again when you are back online.',
        type: 'warning'
      }));

  } catch (error) {
    console.error('Error saving shop details:', error);
    showNotice({ 
      title: 'Error', 
      body: 'Failed to save shop details!', 
      type: 'error' 
    });
  }
}
$('#editShopForm').onsubmit=(event)=>saveShopDetails(event)

// Load shop details from localStorage/Firebase
// Shop details live at shops/{shop}/shopDetails so every staff member sees
// the same thing. They used to be written to localStorage only — the Firebase
// write was a commented-out TODO — so each phone had its own copy while the
// app said "Shop details updated successfully!".
//
// A separate node on purpose: `owner` holds the account's uid and email from
// signup, and must not be overwritten by a details form.
let shopDetailsCache = null;

// The name on shops/{shop}/owner, lowercased. Used only as a second way to
// recognise the owner: `role` is picked from a radio button at login, so a real
// owner who once signed in as staff has it set to something else and would
// otherwise be locked out of their own shop's details with no way back.
let shopOwnerName = (localStorage.getItem('shopOwnerName') || '').trim().toLowerCase();

// Is this person allowed to edit the shop's details? A guard rail, not a
// security boundary: both halves come from values the client controls, and the
// database still accepts the write. It exists so staff do not overwrite the
// owner's details by accident. Enforcement belongs in the Firebase rules.
function canEditShopDetails() {
  if (isOwner()) return true;
  const author = (localStorage.getItem('author') || '').trim().toLowerCase();
  return !!author && !!shopOwnerName && author === shopOwnerName;
}

async function fetchShopDetails() {
  if (!shopName) return;
  try {
    const snap = await get(ref(db, `shops/${shopName}/shopDetails`));
    if (snap.exists()) {
      shopDetailsCache = snap.val() || {};
      // Cache locally so the page paints instantly next time.
      Object.entries(shopDetailsCache).forEach(([k, v]) => {
        if (typeof v === 'string') localStorage.setItem(k, v);
      });
      loadShopDetails();
    }
  } catch (_) { /* offline: the localStorage cache below still renders */ }
  // Separate node, separate read: shopDetails is the form's data, owner is the
  // account. A shop with no owner record simply falls back to the role check.
  try {
    const own = await get(ref(db, `shops/${shopName}/owner`));
    const name = (own.exists() && own.val() && own.val().name) ? String(own.val().name).trim() : '';
    if (name) {
      shopOwnerName = name.toLowerCase();
      localStorage.setItem('shopOwnerName', name);
      loadShopDetails();
    }
  } catch (_) { /* offline: the cached name above still applies */ }
}

function loadShopDetails() {
  try {
    const shopDetailsPage = $('.shop_details_page');
    if (!shopDetailsPage) return;

    // No invented defaults. These used to fall back to the developer's own
    // name, a Thrissur address and a real-looking GST number, so every shop
    // that had not filled the page in was shown someone else's details as if
    // they were their own — including a tax identifier. An empty field now
    // reads "Not set", which is true.
    const unset = (v) => (v && String(v).trim()) ? String(v).trim() : '';
    const d = shopDetailsCache || {};
    const pick = (k) => unset(d[k]) || unset(localStorage.getItem(k));

    // The shop's DISPLAY name. Deliberately not `shopName` from localStorage:
    // that value is the tenant key behind every database path in this app.
    const displayName = pick('shopDisplayName') || localStorage.getItem('shopName') || '';
    const ownerName = pick('ownerName');
    const ownerPhone = pick('ownerPhone');
    const shopEmail = pick('shopEmail');
    const shopLocation = pick('shopLocation');
    const shopGST = pick('shopGST');
    const shopEstablished = pick('shopEstablished');
    const shopDescription = pick('shopDescription');
    const shopTagline = pick('shopTagline');
    const hoursMF = pick('hoursMF');
    const hoursSat = pick('hoursSat');
    const hoursSun = pick('hoursSun');
    const shopName = displayName;

    // Update shop header
    if ($('#shopName')) $('#shopName').textContent = shopName;
    if ($('#shopTagline')) $('#shopTagline').textContent = shopTagline;
    
    // Update shop information. An empty field says so plainly and is greyed,
    // so nobody mistakes a placeholder for real shop data.
    const put = (id, val) => {
      const el = $('#' + id);
      if (!el) return;
      el.textContent = val || 'Not set';
      el.classList.toggle('value-unset', !val);
    };
    put('ownerName', ownerName);
    put('ownerPhone', ownerPhone);
    put('shopEmail', shopEmail);
    put('shopLocation', shopLocation);
    put('shopGST', shopGST);
    put('shopEstablished', shopEstablished);
    put('shopDescription', shopDescription);

    // Opening hours. The edit form has always collected these and
    // saveShopDetails() has always stored them — nothing ever painted them, so
    // the card showed three hardcoded times no matter what the shop entered.
    put('hoursMF', hoursMF);
    put('hoursSat', hoursSat);
    put('hoursSun', hoursSun);
    const closedBadge = $('#sundayClosedBadge');
    if (closedBadge) {
      closedBadge.classList.toggle('hidden', !/closed/i.test(hoursSun));
    }

    // Does this shop have anything of its own saved yet? `displayName` is
    // deliberately left out: it falls back to the tenant key, so it is never
    // empty and would hide the prompt for ever.
    const hasDetails = !!(ownerName || ownerPhone || shopEmail || shopLocation ||
      shopGST || shopEstablished || shopDescription || shopTagline ||
      hoursMF || hoursSat || hoursSun);

    // Editing is the owner's job. This is a guard rail, not a security
    // boundary — `role` is a localStorage string the user can edit, and the
    // write itself is still allowed by the database. It exists so staff do not
    // overwrite the owner's details by accident, which is the real failure
    // mode. Enforcement belongs in the Firebase rules.
    const owner = canEditShopDetails();

    // The prompt. "Edit Shop Details" sits ~2200px down the page, past six
    // sections, so a new shop never found it. This sits under the header.
    const setupCard = $('#shopSetupCard');
    if (setupCard) setupCard.classList.toggle('hidden', hasDetails || !owner);
    const editBtn = $('#editShop_details');
    if (editBtn) editBtn.classList.toggle('hidden', !owner);
    // A button that silently vanishes reads as a bug, so say why it is gone.
    const lockedNote = $('#shopEditLocked');
    if (lockedNote) lockedNote.classList.toggle('hidden', owner);

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
  
    
    const totalCustomers = Object.keys(data|| {}).length || 124;
    const activeJobs = total_not_included|| 0; // Would come from job status
    const todayRevenue = calculateTodayRevenue(data)||0; // Would be calculated from today's transactions
    const completedJobs = collected|| 0; // Would come from completed jobs count
    const pendingJobs = pending || 0; // Would come from pending jobs
    const totalRevenue = totalCollectedRevenue||0; // Would sum all revenue
    // No rating is collected anywhere in this app. This used to read 4.8,
    // which was simply made up and shown as the shop's own customer rating.
    const shopRating = '—';

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

// Initialize shop details page on load. loadShopDetails() paints from the
// local cache immediately; fetchShopDetails() then pulls whatever the rest of
// the shop has saved and repaints if it differs.
window.addEventListener('load', () => {
  setTimeout(() => {
    loadShopDetails();
    fetchShopDetails();
  }, 2000);
});

// Also load when hash changes to shop details
window.addEventListener('hashchange', () => {
  if (location.hash === '#shop-details') {
    loadShopDetails();
    fetchShopDetails();
  }
});

/* ########## END SHOP DETAILS PAGE ########## */

 // downloadServiceData()
 
 
// Usage:
// 1) page లో ഈ സ്ക്രിപ്റ്റ് ചേർക്കുക.
// 2) ഉപയോക്താവിൽ നിന്നും Notification permission വേണം.

// ── Reminder: work still open ───────────────────────────────────────────
// Replaces a hardcoded "monthly task (9th)" reminder that was the source of
// the notification spam: its setTimeout delay exceeded the browser's ~24.9
// day maximum for roughly five days each month, so it fired immediately and
// then rescheduled itself to the same date, looping. It also called
// Notification.requestPermission() on every page load.
//
// This one is deliberately quiet:
//   * at most ONE reminder per calendar day, and once per page load
//   * only when something is actually outstanding
//   * never asks for permission by itself - that happens only when the
//     Settings toggle is switched on
//   * a fixed tag, so a new one replaces the old instead of stacking
// There is no push server, so a notification can only appear while the app
// is open. When permission has not been granted it falls back to the in-app
// notice, under the same once-a-day rule.
const REMINDER_ENABLED_KEY = 'MF_OPEN_JOBS_REMINDER';
const REMINDER_LAST_KEY    = 'MF_OPEN_JOBS_REMINDER_DAY';
// Work not finished. 'done' is excluded: the repair is complete and it is the
// customer's turn to collect. 'collected' is finished outright.
const OPEN_STATUSES = ['pending', 'progress', 'spare'];

const reminderEnabled = () => localStorage.getItem(REMINDER_ENABLED_KEY) !== 'off';

const openJobs = (rows) => (rows || []).filter(d =>
  d && d.isDeleted !== true && OPEN_STATUSES.includes(String(d.status || '').toLowerCase())
);

let reminderShownThisLoad = false;

async function remindOpenJobs(rows) {
  if (reminderShownThisLoad || !reminderEnabled()) return;

  const todayKey = normDateKey(getCurrentDate());
  if (!todayKey || localStorage.getItem(REMINDER_LAST_KEY) === todayKey) return;

  const open = openJobs(rows);
  if (!open.length) return;            // nothing outstanding: stay quiet

  reminderShownThisLoad = true;
  localStorage.setItem(REMINDER_LAST_KEY, todayKey);

  const latest = [...open].sort((a, b) => (Number(b.sn) || 0) - (Number(a.sn) || 0)).slice(0, 3);
  const names  = latest.map(d => `#${d.sn} ${d.name || 'Unknown'}`).join(', ');
  const more   = open.length - latest.length;
  const title  = `${open.length} job${open.length > 1 ? 's' : ''} still open`;
  const body   = more > 0 ? `Latest: ${names} - and ${more} more.` : `Latest: ${names}`;

  if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      // Android Chrome forbids `new Notification()`; it must go through the
      // service worker registration.
      await reg.showNotification(title, {
        body,
        tag: 'mobifixer-open-jobs',
        // The real logo, transparent, as supplied. The previous icon was the
        // mark on a solid black plate, which read as a black tile.
        icon: './assets/images/notification-logo.png',
        // Android builds the status-bar badge from a PNG's ALPHA CHANNEL
        // ALONE, painting every opaque pixel white. The favicon that used to
        // be passed here has no alpha channel, so it rendered as a solid
        // white square. This is a square, white-on-transparent silhouette of
        // the arrow mark, 81% transparent, built from the mark-only artwork.
        badge: './assets/images/badge-96.png',
        data: { hash: '' }   // home; the list already opens on the pending tab
      });
      return;
    } catch (_) { /* fall through to the in-app notice */ }
  }
  showNotice({ title, body, type: 'info', delay: 6 });
}

// Reflect the stored setting on the Settings toggle, which was hardcoded to
// "active" in the markup and never restored.
(() => {
  const input = document.querySelector('input[name="voice_alert"]');
  const btn = input?.parentElement?.querySelector('.toggle_btn');
  if (!input || !btn) return;
  const on = reminderEnabled();
  btn.classList.toggle('active', on);
  input.checked = on;
})();

// ── Per-job reminders ────────────────────────────────────────────────────
// "Remind me" on a job card. Stored shop-wide so any staff member who opens
// the app sees and gets it.
//
// Deliberately NOT stored on the service record: saving an edited job does a
// whole-node set() with only the form's fields, which would silently drop a
// reminder. A sibling node is immune to that.
//
// Due reminders are found by a ticker, not by setTimeout. A timer long enough
// to reach the due date would exceed the browser's ~24.9 day maximum and fire
// instantly in a loop — which is exactly the bug that made the old monthly
// reminder spam. A ticker cannot have that failure mode, and it also means a
// reminder set on one phone still fires on another.
const REMINDER_TICK_MS = 30000;
const remindersBySn = new Map();

const remindersRef = () => ref(db, `shops/${shopName}/reminders`);
const reminderRef = (sn) => ref(db, `shops/${shopName}/reminders/${sn}`);

const fmtWhen = (ts) => {
  const d = new Date(ts), now = new Date();
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  const sameDay = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
  if (sameDay) return `today at ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `tomorrow at ${time}`;
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })} at ${time}`;
};

const fmtOverdue = (ts) => {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
  const days = Math.round(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

// Reflect reminder state on the cards without waiting for a re-render.
function paintReminderButtons() {
  document.querySelectorAll('.remind-btn').forEach(btn => {
    const rem = remindersBySn.get(String(btn.dataset.sn));
    const live = rem && !rem.fired;
    btn.classList.toggle('has-reminder', !!live);
    btn.classList.toggle('is-overdue', !!(live && rem.dueAt <= Date.now()));
    const label = live ? (rem.dueAt <= Date.now() ? 'Overdue' : fmtWhen(rem.dueAt)) : 'Remind';
    const icon = live ? 'fa-solid fa-bell' : 'fa-regular fa-bell';
    btn.innerHTML = `<i class="${icon}"></i> ${label}`;
  });
}

async function fireReminder(rem) {
  const job = data.find(d => String(d.sn) === String(rem.sn));
  const who = job ? (job.name || 'Unknown') : `#${rem.sn}`;
  const device = job && job.devices && job.devices[0] ? job.devices[0].model : '';
  const late = rem.dueAt < Date.now() - 60000;
  const title = late ? `Overdue reminder - ${who}` : `Reminder - ${who}`;
  const body = [`#${rem.sn}${device ? ' - ' + device : ''}`,
                late ? `Was due ${fmtOverdue(rem.dueAt)}.` : '',
                rem.note || ''].filter(Boolean).join(' ');

  if ('Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, {
        body,
        tag: `mobifixer-reminder-${rem.sn}`,   // one per job, never stacks
        icon: './assets/images/notification-logo.png',
        badge: './assets/images/badge-96.png',
        data: { hash: '' }
      });
    } catch (_) { showNotice({ title, body, type: 'info', delay: 8 }); }
  } else {
    showNotice({ title, body, type: 'info', delay: 8 });
  }

  try { await update(reminderRef(rem.sn), { fired: true, firedAt: Date.now() }); }
  catch (_) { rem.fired = true; }   // at least don't repeat it this session
}

function checkDueReminders() {
  const now = Date.now();
  remindersBySn.forEach(rem => {
    if (rem && !rem.fired && Number(rem.dueAt) <= now) fireReminder(rem);
  });
  paintReminderButtons();
}

function watchReminders() {
  if (!shopName) return;
  onValue(remindersRef(), snap => {
    remindersBySn.clear();
    const all = snap.val() || {};
    Object.entries(all).forEach(([sn, r]) => { if (r) remindersBySn.set(String(sn), { ...r, sn }); });
    checkDueReminders();       // catches anything that fell due while the app was closed
  });
  setInterval(checkDueReminders, REMINDER_TICK_MS);
}

// ── the sheet ──
const remindOverlay = $('#remindOverlay');
let remindSn = null;

const localInputValue = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

function closeRemindSheet() {
  remindOverlay?.classList.remove('active');
  remindSn = null;
}

function openRemindSheet(sn) {
  if (!remindOverlay) return;
  remindSn = String(sn);
  const job = data.find(d => String(d.sn) === remindSn);
  const device = job && job.devices && job.devices[0] ? job.devices[0].model : '';
  $('#remindFor').textContent = job
    ? `#${sn} · ${job.name || 'Unknown'}${device ? ' · ' + device : ''}`
    : `#${sn}`;

  const rem = remindersBySn.get(remindSn);
  const existing = $('#remindExisting');
  if (rem && !rem.fired) {
    existing.classList.remove('hidden');
    $('#remindExistingText').textContent = rem.dueAt <= Date.now()
      ? `Was due ${fmtOverdue(rem.dueAt)}`
      : `Set for ${fmtWhen(rem.dueAt)}${rem.createdBy ? ' by ' + rem.createdBy : ''}`;
  } else {
    existing.classList.add('hidden');
  }

  // "This evening" is meaningless once it is past 6pm; say so rather than
  // silently scheduling something in the past.
  const now = new Date();
  const evening = new Date(now); evening.setHours(18, 0, 0, 0);
  const eveBtn = document.querySelector('.remind-chip[data-at="today-18"]');
  if (eveBtn) eveBtn.disabled = evening.getTime() <= now.getTime();

  const custom = $('#remindCustom');
  const soon = new Date(now.getTime() + 60 * 60 * 1000);
  custom.min = localInputValue(now);
  custom.value = localInputValue(soon);
  $('#remindHint').textContent = '';
  $('#remindHint').classList.remove('warn');

  remindOverlay.classList.add('active');
}

async function saveReminder(dueAt) {
  if (!remindSn) return;
  if (!Number.isFinite(dueAt)) return;
  if (dueAt <= Date.now()) {
    const h = $('#remindHint');
    h.textContent = 'Pick a time in the future.';
    h.classList.add('warn');
    return;
  }
  const sn = remindSn;
  try {
    await set(reminderRef(sn), {
      sn: Number(sn) || sn,
      dueAt,
      dueISO: new Date(dueAt).toISOString(),
      fired: false,
      createdAt: Date.now(),
      createdBy: localStorage.getItem('author') || 'Unknown'
    });
    closeRemindSheet();
    showNotice({ title: 'Reminder set', body: `#${sn} · ${fmtWhen(dueAt)}`, type: 'info', delay: 4 });
    logActivity('reminder', { sn, detail: fmtWhen(dueAt) });
    // Ask for permission only now — the person has just asked to be reminded.
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  } catch (err) {
    const h = $('#remindHint');
    h.textContent = 'Could not save the reminder. Check your connection and try again.';
    h.classList.add('warn');
  }
}

if (remindOverlay) {
  $('#remindClose')?.addEventListener('click', closeRemindSheet);
  remindOverlay.addEventListener('click', e => { if (e.target === remindOverlay) closeRemindSheet(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && remindOverlay.classList.contains('active')) closeRemindSheet(); });

  $('#remindPresets')?.addEventListener('click', e => {
    const chip = e.target.closest('.remind-chip');
    if (!chip || chip.disabled) return;
    if (chip.dataset.mins) return saveReminder(Date.now() + Number(chip.dataset.mins) * 60000);
    const d = new Date();
    if (chip.dataset.at === 'today-18') d.setHours(18, 0, 0, 0);
    if (chip.dataset.at === 'tomorrow-10') { d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); }
    saveReminder(d.getTime());
  });

  $('#remindSetCustom')?.addEventListener('click', () => {
    const v = $('#remindCustom').value;
    if (!v) {
      const h = $('#remindHint');
      h.textContent = 'Choose a date and time first.';
      h.classList.add('warn');
      return;
    }
    saveReminder(new Date(v).getTime());
  });

  $('#remindClear')?.addEventListener('click', async () => {
    if (!remindSn) return;
    const sn = remindSn;
    try { await remove(reminderRef(sn)); closeRemindSheet();
      showNotice({ title: 'Reminder cancelled', body: `#${sn}`, type: 'info', delay: 3 });
    } catch (_) {
      const h = $('#remindHint');
      h.textContent = 'Could not cancel. Check your connection.';
      h.classList.add('warn');
    }
  });
}


// ── Push registration ────────────────────────────────────────────────────
// Lets a reminder arrive while the app is CLOSED. Without this, a reminder
// that falls due on a locked phone only appears when the app is next opened.
//
// PUSH_VAPID_KEY is the public Web Push certificate from
// Firebase console -> Project settings -> Cloud Messaging -> Web Push
// certificates. It is public by design and safe to commit.
//
// While it is empty, everything below is skipped: no SDK is fetched, no
// permission is requested, and the app behaves exactly as it did before.
const PUSH_VAPID_KEY = 'BCPJmqD8LHgF3zLMLGtdP1IODMw90Xf2qW19PVisGwUxPr6IJzAGvz1AV332iH5bU-Up-wOZdeYr-SVUxb_FoDA';

const pushTokensRef = () => ref(db, `shops/${shopName}/pushTokens`);

// A stable per-device id, so re-registering updates one row instead of
// growing a new one on every load.
function pushDeviceId() {
  let id = localStorage.getItem('MF_DEVICE_ID');
  if (!id) {
    id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('MF_DEVICE_ID', id);
  }
  return id;
}

async function registerPush() {
  if (!PUSH_VAPID_KEY) return;                       // not configured yet
  if (!shopName) return;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if (Notification.permission !== 'granted') return; // never prompt from here
  try {
    // Loaded on demand: the messaging SDK is only fetched by shops that have
    // actually granted permission, not by everyone on every page load.
    const { getMessaging, getToken, isSupported } =
      await import('https://www.gstatic.com/firebasejs/12.2.1/firebase-messaging.js');
    if (!(await isSupported())) return;              // iOS Safari below 16.4, etc.

    const reg = await navigator.serviceWorker.ready;
    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: PUSH_VAPID_KEY,
      serviceWorkerRegistration: reg                 // reuse sw.js; no firebase-messaging-sw.js
    });
    if (!token) return;

    await update(ref(db, `shops/${shopName}/pushTokens/${pushDeviceId()}`), {
      token,
      author: localStorage.getItem('author') || 'Unknown',
      ua: navigator.userAgent.slice(0, 120),
      updatedAt: Date.now()
    });
  } catch (err) {
    // Push is an enhancement. If the SDK, the service worker or the network
    // fails, the in-app reminder path still works, so fail quietly.
    console.warn('push registration skipped:', err && err.message);
  }
}

// Drop this device's token when the shop signs out, so reminders stop
// following a phone that is no longer logged in.
async function unregisterPush() {
  if (!PUSH_VAPID_KEY || !shopName) return;
  try { await remove(ref(db, `shops/${shopName}/pushTokens/${pushDeviceId()}`)); }
  catch (_) {}
}

registerPush();

watchReminders();




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






// ---------------------------------------------
// PWA SETUP: REGISTER SERVICE WORKER
// ---------------------------------------------

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch((err) => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}
