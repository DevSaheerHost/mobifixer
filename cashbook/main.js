const $ = s => document.querySelector(s)
const username = localStorage.getItem('CASHBOOK_USER_NAME');
const fullname = localStorage.getItem('CASHBOOK_FULLNAME');

// ── NETWORK SPEED: Data cache ──────────────────────────────────
// In-memory cache: instant re-render when switching back to same date
const _memCache = {};
// localStorage cache key
const _cacheKey = (date) => `cb_${username}_${date}`;
// Max localStorage cache entries to keep (prevents bloat)
const _MAX_CACHE = 7;

function _saveToCache(dateISO, data) {
  // Memory
  _memCache[dateISO] = data;
  // LocalStorage (best-effort, non-blocking)
  try {
    const key = _cacheKey(dateISO);
    localStorage.setItem(key, JSON.stringify(data));
    // Prune old cache entries beyond _MAX_CACHE
    const allKeys = Object.keys(localStorage).filter(k => k.startsWith(`cb_${username}_`));
    if (allKeys.length > _MAX_CACHE) {
      allKeys.sort().slice(0, allKeys.length - _MAX_CACHE)
        .forEach(k => localStorage.removeItem(k));
    }
  } catch(_) {}
}

function _loadFromCache(dateISO) {
  // Memory first (fastest)
  if (_memCache[dateISO]) return _memCache[dateISO];
  // Then localStorage
  try {
    const raw = localStorage.getItem(_cacheKey(dateISO));
    if (raw) { const d = JSON.parse(raw); _memCache[dateISO] = d; return d; }
  } catch(_) {}
  return null;
}

// Invalidate cache for a date (call after any write)
function _invalidateCache(dateISO) {
  delete _memCache[dateISO];
  try { localStorage.removeItem(_cacheKey(dateISO)); } catch(_) {}
}

import { ref, onChildAdded, onChildChanged, onChildRemoved } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";
    // UI refs
    const authView = document.getElementById('authView');
    const mainView = document.getElementById('mainView');
    const userArea = document.getElementById('userArea');
    const chartView = document.getElementById('chartView');
    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const signInBtn = document.getElementById('signInBtn');
    const entryForm = document.getElementById('entryFormIn');
    const entryFormOut = document.getElementById('entryFormOut');
    const ioType = 'h'
    const desc = document.getElementById('desc');
    const amount = document.getElementById('amount');
    const staffName = document.querySelector('#staff');
    const isGpay = document.getElementById('isGpay');
    const entriesList = document.getElementById('entriesList');
    const currentDateLabel = document.getElementById('currentDateLabel');
    const selectDate = document.getElementById('selectDate');
    const totalInEl = document.getElementById('totalIn');
    const totalOutEl = document.getElementById('totalOut');
    const totalGpayEl = document.getElementById('totalGpay');
    const netBalEl = document.getElementById('netBal');
    const reloadBtn = document.getElementById('reloadBtn');
    const exportCSV = document.getElementById('exportCSV');
    const clearDay = document.getElementById('clearDay');
    const downloadAll = document.getElementById('downloadAll');
    const overlay = document.getElementById('alertOverlay');
    const obForm = $('#obForm')
    const obCard = $('#obCard');
    const liquidCard = $('#liquidCard')
    const liquidMoneyForm = $('#liquidMoneyForm')
    let globalDate // for load for date = change thisndate value too
    const VERSION_CODE = 'v1.5'
    var important // for show overlay type
    const confirmBtn = document.getElementById('confirmBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    var globalIn =0 // for get total amount for ever
    const progressBar = document.querySelector('.loader .progress .bar')
    const oldTotalStaffCount = Number(localStorage.getItem('CASHBOOK_TOTAL_STAFF')) || 0;
    const staff_container = $('#staff_container')
    const loading_text = $('#loading_text')
    const version = localStorage.getItem('version_code');
    const reminderCache = {};
    const isOwner = localStorage.getItem('CASHBOOK_ROLL') === 'owner';
    const positive = $('#positive');
    const negative = $('#negative');
    const feedbackContainer = $('#feedbackContainer')
    
    const FEEDBACK_KEY = 'feedback.profilePage.voted';
    const SETTINGS_KEY = 'app_settings';

    const defaultSettings = {
      suggestion: true,
      vibration: true,
      specialDayEffects: true,
      autoSetDailyGoal:false,
      enableAI:false,
    };
    // ------------------------ CONFIG ------------------------
    const firebaseConfig = {
    apiKey: "AIzaSyCOqgE6IiCyvsZ0BCuCeuTdfRYZEXf7yJs",
    authDomain: "recat-auth-test.firebaseapp.com",
    projectId: "recat-auth-test",
    storageBucket: "recat-auth-test.firebasestorage.app",
    messagingSenderId: "974600242853",
    appId: "1:974600242853:web:1bce6de6e6bb4512342f4c"
  };
    // ------------------------ END CONFIG --------------------



// ── Theme toggle ──────────────────────────────────────────────
// ── Theme toggle ──────────────────────────────────────────────
(function () {
  const lightBtn       = document.getElementById('theme_light');
  const lightBtnParent = document.getElementById('for_theme_light');
  const darkBtn        = document.getElementById('theme_dark');
  const darkBtnParent  = document.getElementById('for_theme_dark');

  // Apply saved theme on load
  const saved = localStorage.getItem('theme') || 'light';
  applyTheme(saved);

  // Listeners for radio buttons
  lightBtn.addEventListener('change', () => applyTheme('light'));
  darkBtn.addEventListener('change',  () => applyTheme('dark'));

  // Listeners for parent elements (Triggers theme change on parent click)
  if (lightBtnParent) lightBtnParent.addEventListener('click', () => applyTheme('light'));
  if (darkBtnParent)  darkBtnParent.addEventListener('click',  () => applyTheme('dark'));

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.body.classList.add('dark');
      darkBtn.checked  = true;
      lightBtn.checked = false;
    } else {
      document.body.classList.remove('dark');
      lightBtn.checked = true;
      darkBtn.checked  = false;
    }
    localStorage.setItem('theme', theme);
  }
})();




$('#fullname_profile').textContent=fullname || '';
// helper function 

function getTime() {
  const now = new Date();
  return now.toLocaleTimeString();
}
function isoDate(d){
      const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,'0');const day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;
    }
function formatDT(ts){ const d=new Date(ts); return `${d.toLocaleString()}`; }


// functions

const handleInvalidAuthState = ()=>{
  localStorage.removeItem('CASHBOOK_USER_NAME')
  localStorage.removeItem('CASHBOOK_FULLNAME')
  showToast('Session Timeout : 401');
  authView.style.display = 'block';
  mainView.style.display = 'none';
  if($('.dboard'))$('.dboard').style.display='none';
  userArea.innerHTML = '';
  document.querySelector('.loader').classList.add('off')
  
  return;
}

/**
  * @param {object} user check user status on db and take access.
**/
const handleStaffAccessControl = (user) =>{
  if(!user.signupInfo.fullname) throw new Error('fullname not found in signup info, please contact the developer')
  const isOwner = fullname.trim().toLowerCase() === user.signupInfo.fullname.trim().toLowerCase();
  if (!isOwner) {
  
  const staffUser = user.staff?.[fullname] ?? null;
    if (!staffUser) {
      auth.signOut()
      localStorage.clear()
      showTopToast('User not found : 404');
      return;
    }
    if (!staffUser.status) {
      showOverlay({
        title: `Welcome, ${fullname}`,
        desc: `
      Your access is pending approval from the shop owner.
      You’ll be able to use the app once it’s approved.
      `
      });
      
      document.body.classList.add('ui-locked')
    }
    if (staffUser.status == 'removed') {
      auth.signOut()
      localStorage.clear()
      showTopToast('Access revoked by owner');
      return;
    }
    
    if (staffUser.status == 'logout') {
      auth.signOut()
      // localStorage.clear()
      // document.body.classList.add('ui-locked');
      
      showTopToast('Access revoked by owner.');
      authView.style.display = 'block';
     mainView.style.display = 'none';
      const userRef = db.ref(`/users/${username}`);
      (async () => await userRef.child(`staff/${staffUser.fullname}`).update({
        status: 'active'
      }))()
      return;
    }
  }
}

const detectNewStaffAndNotifyOwner=(totalStaff)=>
{
  if(oldTotalStaffCount < totalStaff && localStorage.getItem('CASHBOOK_ROLL')!=='staff'){
  
      if($('summary'))$('summary').classList.add('new');
      (async () => {
        
      const userConfirmed = await askUserPermission({
          title: `New staff detected.`,
          desc: `A new staff member is waiting for your approval. Open settings and 
    Approve to allow access, or manage later from Settings.
      `,
          icon: ` 
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#FFD54F" class="size-6">
      <path stroke-linecap="round" stroke-linejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
            </svg>
    
          `,
          btnColor: '#FFD54F', // blue red#FFD54F
        });
        
        if (!userConfirmed) return;
        localStorage.setItem('CASHBOOK_TOTAL_STAFF', totalStaff)
      })()
  }
}
const renderStaffList = (staffList) =>{
  staff_container.innerHTML=''
  staffList.forEach(staff =>addStaffToUI(staff));
}
const addStaffToUI = (staff)=>{
  if(!isOwner) {
    staff_container.classList.add('hidden');
    $('#staff_container_title').classList.add('hidden')
//     staff_container.innerHTML=`<p class="muted" style="display: flex; align-items: center; justify-content: center; padding: 0.5rem;">This section is available only to the shop owner.
// If you need changes, please contact the owner.</p>`;
return
  };
  const userRef = db.ref(`/users/${username}`);
  const li = document.createElement('li')
  li.setAttribute('data-key', staff.fullname)
  li.classList.add('staff-item')
li.innerHTML = `
  
  
        <div class="left">
          <p class='name'>${staff.fullname}</p>
          <div>
          <p class="muted status status-${staff.status || 'new'} text">${staff.status||'new'}</p>
          <p class='muted'>${staff.date}</p>
          </div>
        </div>
        
        <div class="icons">
          
          
          <span class="logout">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
</svg>

          </span>
          <span class="remove">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
</svg>
          </span>
          
          <span class='approve'>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
</svg>
</span>
        </div>
      
      `
staff_container.appendChild(li)

const removeBtn = li.querySelector('.remove')
const logoutBtn = li.querySelector('.logout')
const approveBtn = li.querySelector('.approve')

logoutBtn.addEventListener('click', async () => {
  
  const userConfirmed = await askUserPermission({
    title: `Sign Out ${staff.fullname}?`,
    desc: `This will sign the staff out from the app. They can log in again anytime using their account.`,
    icon: ` 
        <svg style='width: 60px' xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#FFD54F" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
</svg>
      `,
    btnColor: '#FFD54F', //'#F44336', // red#FFD54F
  });
  
  if (!userConfirmed) return;
  
  await userRef.child(`staff/${staff.fullname}`).update({
    status: 'logout'
  });
  
  const statusEl = li.querySelector('.text');
  statusEl.textContent = 'logout';
  statusEl.className = 'muted status-logout text';
})
removeBtn.addEventListener('click', async () => {
  
  const userConfirmed = await askUserPermission({
    title: `Remove ${staff.fullname} permanently?`,
    desc: `This will permanently remove the staff from your shop.
They will no longer be able to log in or access the app.`,
    icon: ` 
        <svg xmlns="http://www.w3.org/2000/svg" class="icon-svg" viewBox="0 0 20 20" fill="red">
             <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      `,
    btnColor: '#F44336',
  });
  
  if (!userConfirmed) return;
  
  
  await userRef.child(`staff/${staff.fullname}`).update({
    status: 'removed'
  });
  
  const statusEl = li.querySelector('.text');
  statusEl.textContent = 'removed';
  statusEl.className = 'muted status-removed text';
})

approveBtn.addEventListener('click', async () => {
  
  const userConfirmed = await askUserPermission({
    title: `Approve new staf ( ${staff.fullname})?`,
    desc: `${staff.fullname} wants to join your shop.
Once approved, they can log in and access the app.`,
    icon: ` 
                  <svg style='width: 60px' xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#0ECF36" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
</svg>
      `,
    btnColor: '#0BA2FF', //'#F44336', // red#FFD54F
  });
  
  if (!userConfirmed) return;
  
  await userRef.child(`staff/${staff.fullname}`).update({
    status: 'active'
  });
  
  const statusEl = li.querySelector('.text');
  statusEl.textContent = 'active';
  statusEl.className = 'muted status-active text';
})
}


function showOverlay(info={}){
        
        let{
          title = '',
          desc = '',
          icon = null,
          btnColor='#0BA2FF',
          important=false
        } = info
        const iconEl = document.getElementById('overlayAlertIcon');
        important=info.important||false
        
        iconEl.innerHTML=info.icon || `
        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" 
     viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 1 0 .001 20.001A10 10 0 0 0 12 2Zm0 4a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0V7a1 1 0 0 1 1-1Zm0 10.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3Z"/>
      </svg>
`

        $('#alertTitle').textContent=info.title
        $('#alertMessage').innerHTML=info.desc
        
        confirmBtn.style.background=`${info.btnColor
                      ?info.btnColor
                      : '#0BA2FF'
        };`
        
            overlay.classList.add('visible');
            
            // Add event listener to close when clicking outside the card
            // We use setTimeout to ensure the click listener isn't immediately triggered 
            // by the same click that opened the alert.
            setTimeout(() => {
              overlay.onclick=(e)=>handleOverlayClick(e);
            }, 50); 
        }
function hideOverlay() {
            // Remove visibility class
            overlay.classList.remove('visible');
            
            // Remove event listener
            overlay.removeEventListener('click', handleOverlayClick);
            important = false;
        }
function handleOverlayClick(event) {
            // Check if the click happened directly on the overlay element
            if (event.target === overlay) {
                console.log("Overlay background clicked. Closing alert.");
              !important? hideOverlay():'';
            }
        }
confirmBtn.addEventListener('click', function() {
  // Placeholder action: Log and hide
  console.log("User confirmed the action. Proceeding with transaction.");
  !important ? hideOverlay() : '';
});
cancelBtn.addEventListener('click', function() {
  // Placeholder action: Log and hide
  console.log("User cancelled the action.");
  !important ? hideOverlay() : '';
});


function renderType(type, data) {
  entriesList.innerHTML = '';

  const group = data[type] || {};
  const rows = Object.keys(group).map(key => ({
    ...group[key],
    _key: key,
    _type: type
  }));

  if (rows.length === 0) {
    entriesList.innerHTML = `<div class="small muted">No ${type} entries.</div>`;
    return;
  }

  // Sort by time (latest first)
  rows.sort((a, b) => b.ts - a.ts);
  rows.forEach(r => {
    const el = document.createElement('div');
    el.className = `entry ${type} ${r.gpay ? 'gp' : ''} ${ r.name==='Opening Balance'?' ob':''}`;

    el.innerHTML = `
      <div class="meta">
        <div><strong>${type.toUpperCase()} — ${r.name}</strong></div>
        <div class="small">${formatDT(r.ts)} • ${r.userEmail || ''} <br> ${r.staffName || ''} ${r.writer ? ` : ${r.writer} (${r.role ||'_'})` : ` (${r.role||'_'})`}<br> ${r.deletedBy ? `${r.deletedBy} Deleted This Transaction` : ''}</div>
      </div>
      <div style="text-align:right">
        <div><strong>₹${Number(r.amount).toLocaleString()}</strong></div>
        <div><strong class='gpay'>₹${Number(r.gpay || 0).toLocaleString()}</strong></div>
        <div class="actions gpay">
          ${r.gpay ? '<span><i class="fa-brands fa-google-pay"></i></span>' : ''} 
          <button data-key='${r._key}' class='deleteBtn'>Delete</button>
        </div>
      </div>
    `;

    entriesList.appendChild(el);
  })}
  
  const getAuthInput = () =>{
  // Read fields based on active auth mode
  const isLogin = authMode === 'login';
  const fullnameEl = isLogin ? document.getElementById('fullname_login') : document.getElementById('fullname');
  const usernameEl = isLogin ? document.getElementById('username_login') : document.getElementById('username');
  return {
    email: emailInput.value.trim(),
    password: passInput.value.trim(),
    username: (usernameEl?.value || '').trim().toLowerCase(),
    fullname: (fullnameEl?.value || '').trim(),
  }
}
  const validateAuthInput = ({ email, username, fullname, password }) => {
  if (!email) {
    showToast('Enter your email', '#FFC107');
    return false;
  }
  if (!password) {
    showToast('Enter your password', '#FFC107');
    return false;
  }
  if (password.length < 6) {
    showToast('Password must be at least 6 characters', '#FFC107');
    return false;
  }
  if (!username) {
    showToast('Enter shop username', '#FFC107');
    return false;
  }
  if (authMode === 'signup' && !fullname) {
    showToast('Enter your full name', '#FFC107');
    return false;
  }
  return true;
}
  const getUser = async(username)=>{
  const userRef = db.ref(`/users/${username}`);
  const snap = await userRef.get();
  return snap.exists() ? snap.val() : null;
}
  const detectRole=(dbUser, fullname) =>{
  return dbUser.fullname.toLowerCase().includes(fullname.toLowerCase())
    ? 'owner'
    : 'staff';
}
  const loginUser= async({ email, password, username, fullname })=> {
  const dbUser = await getUser(username);
  if (!dbUser) {
    showTopToast("Shop not found. Check username or sign up.", '#F44336');
    return;
  }

  // Firebase Auth handles password — no DB password check
  await auth.signInWithEmailAndPassword(email, password);

  const role = detectRole(dbUser, fullname);

  await db.ref(`/users/${username}/logins/${Date.now()}_${role}_${fullname}`)
    .set(getDeviceInfo());

  if (role === 'staff') {
    await db.ref(`/users/${username}/staff/${fullname}`).update({
      fullname,
      date: new Date().toLocaleString(),
      time: getTime(),
      device: getDeviceInfo()
    });
  }

  persistSession(username, fullname, role);
  showTopToast("Sign in successful ✓");
  location.reload();
}
  const signupUser = async ({ email, password, username, fullname }) => {
  const exists = await getUser(username);
  if (exists) {
    showTopToast("Username already taken. Try another.", '#F44336');
    return;
  }
  
  await auth.createUserWithEmailAndPassword(email, password);
  
  // ⚠️ Password is NEVER stored in the database — Firebase Auth handles it
  await db.ref(`/users/${username}`).set({
    username,
    fullname,
    role: 'owner',
    signupInfo: {
      device: getDeviceInfo(),
      fullname,
      email,
    },
    logins: {}
  });
  
  persistSession(username, fullname, 'owner');
  showTopToast("Account created ✓");
  location.reload();
}
  const persistSession = (username, fullname, role) => {
  localStorage.setItem('CASHBOOK_USER_NAME', username);
  localStorage.setItem('CASHBOOK_ROLL', role);
  localStorage.setItem('CASHBOOK_FULLNAME', fullname);
}
  async function loadRemindersForDate(dateISO){
  if(reminderCache[dateISO]){
    renderReminders(reminderCache[dateISO]);
    return;
  }

  const snap = await db
    .ref(`${username}/reminders/${dateISO}`)
    .get();

  const data = snap.val();

  if(!data){
    renderReminders({});
    return;
  }

  reminderCache[dateISO] = data;
  renderReminders(data);
}
  const askUserPermission=(info)=> {
            return new Promise((resolve) => {
              
              showOverlay(info)
                const overlay = document.getElementById('alertOverlay')
                const confirmBtn = document.getElementById('confirmBtn');
                const cancelBtn = document.getElementById('cancelBtn');

                // Cleanup function to remove listeners and hide modal
                const cleanup = () => {
                    hideOverlay()
                    confirmBtn.removeEventListener('click', handleYes);
                    cancelBtn.removeEventListener('click', handleNo);
                    overlay.removeEventListener('click', handleOverlayClick);
                };

                // Handle "Continue" click
                const handleYes = () => {
                    cleanup();
                    resolve(true); // Promise resolves with TRUE
                };

                // Handle "Cancel" click
                const handleNo = () => {
                    cleanup();
                    resolve(false); // Promise resolves with FALSE
                    showToast('Aborted by user')
                    
                      vibrate([15, 80, 15]); // short, crisp, non-annoying
                    
                };
                
                const handleOverlayClick=e =>{
                  if(e.target.id ==='alertOverlay')handleNo()
                }

                // adding e listener 
                confirmBtn.addEventListener('click', handleYes);
                cancelBtn.addEventListener('click', handleNo);
                
                overlay.addEventListener('click', handleOverlayClick);
                if(info.btnColor){
                  confirmBtn.style.background=info.btnColor
                }else{confirmBtn.style.background='#2563eb' // primary blue
                }

            });
        }
        
  const updateStaffInUI = (updatedStaff) => {
//     if(updatedStaff&&updatedStaff.fullname===fullname && updatedStaff.status!='active'){
//       auth.signOut()
// localStorage.clear()
//     }
  if (!updatedStaff || !isOwner) return;
  
  const staffEl = document.querySelector(
    `.staff-item[data-key="${updatedStaff.fullname}"]`
  );
  
  if (!staffEl) {
    console.warn('Staff element not found in UI', updatedStaff);
    return;
  }
  
  // update name
  const nameEl = staffEl.querySelector('.name');
  if (nameEl && updatedStaff.fullname) {
    nameEl.textContent = updatedStaff.fullname;
  }
  
  // update status
  const statusEl = staffEl.querySelector('p.status');
  if (statusEl) {
    statusEl.textContent = updatedStaff.status || 'active';
    
    statusEl.classList.remove('status-active', 'status-logout', 'status-suspend');
    statusEl.classList.add(`status-${updatedStaff.status || 'active'}`);
  }
};
        
        // search functions 
    const SEARCH_FIELDS = ['name', 'amount', 'gpay', 'staffName'];

    const isMatch = (item = {}, v = '') =>
      SEARCH_FIELDS.some(key =>
        String(item[key] ?? '').toLowerCase().includes(v)
      );
        
        
  
  function filterGroup(group = {}, searchValue = '') {
  const v = searchValue.toLowerCase();
  const result = {};

  if (!v) return { ...group }; // intentional behavior

  for (const [key, item] of Object.entries(group)) {
    if (isMatch(item, v)) {
      result[key] = item;
    }
  }

  return result;
}


if(!username || !fullname)handleInvalidAuthState();

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.database();
    
    loading_text.textContent=`Fetching DB`
    progressBar.style.width='40%'
    


    auth.onAuthStateChanged(user => {
   if (user) {
     loading_text.textContent = username;
     $('#userEmail').textContent=user.email || '';
     progressBar.style.width = '97%'
     
     authView.style.display = 'none';
     mainView.style.display = 'block';
     
     userArea.innerHTML = `
        <details class="user-menu">
  <summary class="user-summary">
    <span class="menu_icon">
    
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
</svg>

    </span>

    
    
  </summary>

  <div class="menu-content" style='color: #fff'>
    <div style='border-bottom: 1px solid #EFEFEF; padding: 0.5rem; padding-top: 0; display: flex; align-items:center; gap: 0.3rem' data-link='profile'>
    <div class='prof-picture-sml'>
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#777777" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
</svg>

    </div>
      <p style='color: #000; font-weight: 500; font-size: 18px; margin:0;'>${fullname}</p>
    </div>
    <button class="link hidden">Profile</button>
    
    <button class="link" style='background: rgba(11, 162, 255, 0.15);' data-link='settings'>
      <div class='flex'>
        
              <svg style='width: 20px ;min-width: 20px; color: var(--accent); font-weight: bold;' xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
</svg>






Settings
      </div>



<svg style='height: 20px; color: var(--accent)' xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
</svg>


    </button>
    <button class="link danger signout" id='signOut'>
                          <svg style='width: 20px' xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="size-6">
  <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3H15" />
</svg>
Sign out</button>
  </div>
</details>
        `
     
     document.getElementById('signOut').addEventListener('click', async () => {
       
       const userConfirmed = await askUserPermission({
         title: 'Confirm Sign Out',
         desc: 'Are you sure you want to Sign Out?',
         icon: ` 
        <svg xmlns="http://www.w3.org/2000/svg" class="icon-svg" viewBox="0 0 20 20" fill="red">
             <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      `,
         btnColor: '#F44336', // red
       });
       
       if (!userConfirmed) return;
       const roll = localStorage.getItem('CASHBOOK_ROLL');
       
       
       // work, but add later. (we need yo to set if user login back=== set status )
            if(roll && roll =='staff'){
              const userRef = db.ref(`/users/${username}`);
        (async () => await userRef.child(`staff/${fullname}`).update({
         status: 'logout'
        }))()
            }
       auth.signOut();
       localStorage.clear()
     });
     // ── SPEED: Prefetch today's data immediately on auth confirm ──
     // Kick off the network request BEFORE any UI work below finishes
     const today = new Date();
     const todayISO = isoDate(today);
     selectDate.value = todayISO;
     // Start fetching in background instantly (don't await — parallel with UI setup)
     const _prefetchPromise = db.ref(dayRoot(todayISO)).get();
     loadForDate(todayISO, _prefetchPromise);
     
   } else {
     authView.style.display = 'block';
     mainView.style.display = 'none';
     userArea.innerHTML = '';
     document.querySelector('.loader').classList.add('off')
   }
 });
 
 
    
    const loadUserFromDB = async () => {
  if (!username) return handleInvalidAuthState();
  
  try {
    loading_text.textContent = 'Loading user...';
    progressBar.style.width = '30%';
    document.querySelector('.loader').classList.remove('off');
    
    const snap = await firebase
      .database()
      .ref(`/users/${username}`)
      .get();
    
    if (!snap.exists()) {
      handleInvalidAuthState();
      return;
    }
    
    loading_text.textContent = `User found ${username}`;
    progressBar.style.width = '100%';
    document.querySelector('.loader').classList.add('off');
    
    authView.style.display = 'none';
    mainView.style.display = 'block';
    
    const today = new Date();
    selectDate.value = isoDate(today);
    loadForDate(selectDate.value);
    
    const user = snap.val();
    handleStaffAccessControl(user);
    
    $('#dashThisMonth').click()
    
onChildAdded(dataRef, () => debouncedRefresh('added'));
onChildChanged(dataRef, () => debouncedRefresh('updated'));
onChildRemoved(dataRef, () => debouncedRefresh('deleted'));
  } catch (err) {
    console.error(err);
    showTopToast('Something went wrong. Retry.');
  }
};

loadUserFromDB()
    // get user data from DB

const ProfilePageFeedback = (type) => {
  // prevent double vote
  if (localStorage.getItem(FEEDBACK_KEY)) return;

  firebase.database()
    .ref(`/feedback/users/${username}/profile`)
    .push({
      fullname,
      type, // positive | negative
      source: 'profile_page',
      createdAt: Date.now(),
      createdAtISO: new Date().toISOString()
    });

  // mark as voted (one time)
  localStorage.setItem(FEEDBACK_KEY, 'true');
  checkUserClickFeedback()
  showToast('Thanks for your feedback');
};

positive.onclick = () => {
  ProfilePageFeedback('positive');
}
negative.onclick = () => {
  ProfilePageFeedback('negative');
}

const checkUserClickFeedback = ()=>{
  if (localStorage.getItem(FEEDBACK_KEY)) feedbackContainer.classList.add('hidden');
}
checkUserClickFeedback()


    
   
  const logSettingsChange = (oldSet, newSet) => {
  const changes = {};

  Object.keys(newSet).forEach(key => {
    if (oldSet[key] !== newSet[key]) {
      changes[key] = {
        from: oldSet[key],
        to: newSet[key]
      };
    }
  });

  if (!Object.keys(changes).length) return;

  firebase.database()
    .ref(`/auditLogs/users/${username}/settings`)
    .push({
      fullname,
      changed: changes,
      fullSettings: newSet,
      changedAt: Date.now(),
      changedAtISO: new Date().toISOString()
    });
};

  const loadSettings = () => {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY));
  const settings = { ...defaultSettings, ...saved };

  document.querySelector('#suggestion').checked = settings.suggestion;
  document.querySelector('#vibration').checked = settings.vibration;
  document.querySelector('#specialDay').checked = settings.specialDayEffects;
  document.querySelector('#autoGoal').checked = settings.autoSetDailyGoal;
  const aiToggle = document.querySelector('#enableAI');
  if (aiToggle) aiToggle.checked = !!settings.enableAI;
  const keyInput = document.querySelector('#geminiKey');
  if (keyInput) keyInput.value = localStorage.getItem('CASHBOOK_GEMINI_KEY') || '';

  return settings;
};

let appSettings = loadSettings();
let prevSettings = { ...appSettings }; 


const saveSettings = () => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings));
  logSettingsChange(prevSettings, appSettings);
  prevSettings = { ...appSettings };
};



document.querySelector('#vibration').addEventListener('change', e => {
  appSettings.vibration = e.target.checked;
  saveSettings();
});

document.querySelector('#enableAI')?.addEventListener('change', e => {
  appSettings.enableAI = e.target.checked;
  saveSettings();
  if (typeof updateAiNavVisibility === 'function') updateAiNavVisibility();
});

document.querySelector('#geminiKey')?.addEventListener('change', e => {
  const v = e.target.value.trim();
  if (v) localStorage.setItem('CASHBOOK_GEMINI_KEY', v);
  else localStorage.removeItem('CASHBOOK_GEMINI_KEY');
  if (typeof updateAiNavVisibility === 'function') updateAiNavVisibility();
});

document.querySelector('#suggestion').addEventListener('change', e => {
  appSettings.suggestion = e.target.checked;
  saveSettings();
  
  if (!appSettings.suggestion) {
    incomeInput.classList.remove('focus');
    suggestionBox.innerHTML = '';
  }
});

$('#specialDay').onclick=(e)=>{
  appSettings.specialDayEffects = e.target.checked;
  saveSettings()
}
document.querySelector('#autoGoal').onclick=(e)=>{
  appSettings.autoSetDailyGoal = e.target.checked;
  saveSettings()
}

const vibrate = (pattern = 50) => {
  if (!appSettings.vibration) return;
  if (!('vibrate' in navigator)) return;

  navigator.vibrate(pattern);
};
  
  
  let staffInitialLoadDone = false;
  const staffRef = firebase.database().ref(`/users/${username}/staff`);
  staffRef.once('value', snap => {
  if (!snap.exists()) {
    renderStaffList([]);
    return;
  }
  
  const staffList = Object.values(snap.val());
  const staffCount = staffList.length
  detectNewStaffAndNotifyOwner(staffCount);
  renderStaffList(staffList);
  staffInitialLoadDone = true
});
  
  staffRef.on('child_added', snap => {
  if (!staffInitialLoadDone || !isOwner) return; // ❌ ignore initial data

  const staff = snap.val();

  addStaffToUI(staff);

  oldTotalStaffCount
  const newCount = oldTotalStaffCount + 1;

  localStorage.setItem('CASHBOOK_TOTAL_STAFF', newCount);

  showOverlay({title:`New staff Request: ${staff.fullname}`, desc:`Approve only If you know
  <p>Click <a href='#settings'>Here</a> to Open Settings.</p>
  `});

  if ($('summary')) $('summary').classList.add('new');
});


staffRef.on('child_changed', snap => {
  const updatedStaff = snap.val();

  updateStaffInUI(updatedStaff);
});
  
  
  
  
  
    // Authentication mode (login | signup)
let authMode = 'login';

const switchAuthMode = (mode) => {
  authMode = mode;
  const isLogin = mode === 'login';

  // Update tabs
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabSignup').classList.toggle('active', !isLogin);

  // Show/hide field blocks
  document.getElementById('signupOnlyFields').classList.toggle('hidden', isLogin);
  document.getElementById('loginOnlyFields').classList.toggle('hidden', !isLogin);

  // Button label
  signInBtn.textContent = isLogin ? 'Sign In' : 'Create Account';

  // Forgot password only makes sense in login mode
  document.getElementById('forgotPasswordBtn').classList.toggle('hidden', !isLogin);
};

document.getElementById('tabLogin').addEventListener('click', () => switchAuthMode('login'));
document.getElementById('tabSignup').addEventListener('click', () => switchAuthMode('signup'));

// Forgot Password
document.getElementById('forgotPasswordBtn').addEventListener('click', async () => {
  const email = emailInput.value.trim();
  if (!email) {
    showToast('Enter your email first', '#FFC107');
    emailInput.focus();
    return;
  }
  try {
    await auth.sendPasswordResetEmail(email);
    showOverlay({
      title: '📧 Reset Email Sent',
      desc: `A password reset link was sent to <strong>${email}</strong>.<br><br>
      ⚠️ <strong>Don't see it? Check your Spam / Junk folder</strong> — Gmail sometimes sends reset emails there.<br><br>
      The link expires in 1 hour.`,
      icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="#0BA2FF" style="width:60px">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>`,
    });
  } catch (e) {
    const msg = e.code === 'auth/user-not-found'
      ? 'No account found with this email.'
      : e.code === 'auth/invalid-email'
        ? 'Invalid email address.'
        : 'Failed to send reset email. Try again.';
    showTopToast(msg, '#F44336');
  }
});

// Firebase auth error messages
function getFirebaseAuthError(code) {
  const map = {
    'auth/wrong-password'        : 'Wrong password. Try again.',
    'auth/invalid-credential'    : 'Wrong email or password.',
    'auth/user-not-found'        : 'No account found with this email.',
    'auth/invalid-email'         : 'Invalid email address.',
    'auth/too-many-requests'     : 'Too many attempts. Try again later.',
    'auth/email-already-in-use'  : 'Email already registered. Try signing in.',
    'auth/weak-password'         : 'Password too weak. Use at least 6 characters.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

    // Sign In / Sign Up button
signInBtn.addEventListener('click', async () => {
  const input = getAuthInput();
  if (!validateAuthInput(input)) return;

  signInBtn.disabled = true;
  signInBtn.textContent = authMode === 'login' ? 'Signing in…' : 'Creating account…';
  $('.loader')?.classList.remove('off');

  try {
    if (authMode === 'login') {
      await loginUser(input);
    } else {
      await signupUser(input);
    }
  } catch (e) {
    showTopToast(getFirebaseAuthError(e.code), '#F44336');
    vibrate([15, 80, 15]);
  } finally {
    signInBtn.disabled = false;
    signInBtn.textContent = authMode === 'login' ? 'Sign In' : 'Create Account';
    $('.loader')?.classList.add('off');
  }
});

// for search
function filterData(data, searchValue) {
  return {
    in: filterGroup(data.in, searchValue),
    out: filterGroup(data.out, searchValue)
  };
}


    // Key path per day
    function dayRoot(dateISO){ return `${username}/${dateISO}`; }
    // Load all entries for date
    let currentDate = null;
    
    // ── loadForDate: accepts optional prefetchPromise to skip redundant fetch ──
    async function loadForDate(dateISO, prefetchPromise = null){
      if (!username || !fullname) handleInvalidAuthState();
      globalDate = dateISO
      currentDate = dateISO;
      currentDateLabel.textContent = dateISO;

      // ── SPEED: Show cached data instantly (zero network wait) ──
      const cached = _loadFromCache(dateISO);
      if (cached) {
        renderEntries(cached);
        renderLiquid(cached.liquid);
        // Still fetch fresh in background to catch any new entries
      } else {
        entriesList.innerHTML = '<div class="small muted">Loading…</div>';
      }

      const rootRef = db.ref(dayRoot(dateISO));
      const snapshot = await (prefetchPromise || rootRef.get());
      const data = snapshot.val() || {};

      // ── SPEED: Only re-render if data differs from cache ──
      const cachedStr = cached ? JSON.stringify(cached) : null;
      const freshStr  = JSON.stringify(data);
      if (freshStr !== cachedStr) {
        renderEntries(data);
        renderLiquid(data.liquid);
      }

      // Save to cache (memory + localStorage)
      _saveToCache(dateISO, data);

      // ── SPEED: Prefetch adjacent dates in background (zero-cost) ──
      // When user taps prev/next day, data is already cached
      requestIdleCallback(() => {
        const d = new Date(dateISO);
        const prev = new Date(d); prev.setDate(d.getDate() - 1);
        const next = new Date(d); next.setDate(d.getDate() + 1);
        [isoDate(prev), isoDate(next)].forEach(adj => {
          if (!_memCache[adj]) {
            db.ref(dayRoot(adj)).get().then(s => {
              if (s.exists()) _saveToCache(adj, s.val());
            }).catch(() => {});
          }
        });
      }, { timeout: 2000 });

      renderEntries(data);
      renderLiquid(data.liquid)
      const buttons = document.querySelectorAll('#in, #out, #all, #bin');

buttons.forEach(btn => {
  btn.onclick = async (e) => {
    
  vibrate(10); // short, crisp, non-annoying

    buttons.forEach(b => b.classList.remove("active"));
    e.target.classList.add("active");
document.querySelector('#today_summery_card').style.display='block'
    if (e.target.id === 'in') renderType('in', data);
    if (e.target.id === 'out') renderType('out', data);
    if (e.target.id === 'all') renderEntries(data);
    if (e.target.id === 'bin') {
      
      function dayRoot(dateISO){ return `${username}/recycleBin/${dateISO}`; }
      
      currentDate = dateISO;
      
      currentDateLabel.textContent = dateISO;
      entriesList.innerHTML = '<div class="small muted">Loading...</div>';
      
      const rootRef = db.ref(dayRoot(dateISO));
      const snapshot = await rootRef.get();
      const data = snapshot.val() ||{};
      if(!data)throw new Error('Db is Empty')
      renderEntries(data);
      document.querySelector('#today_summery_card').style.display='none'
    }

  };
});





// SEARCH 🔍 🔎 
const search = $('#search');
const parrent = $('#parrent');
//const entriesList = $('#entriesList');
const dboard = $('.dboard');

// Create a clone for search results
const entriesListClone = entriesList.cloneNode(true);
entriesListClone.id = 'entriesListSearch';
search.parentElement.appendChild(entriesListClone);
entriesListClone.style.display = 'none';

let scrollTimer;
let isSearchActive = false;

// Update search input to track state
search.oninput = e => {
  if(!fullname)return;
  const value = e.target.value.trim();
  isSearchActive = !!value;

  if (!value) {
    dboard.classList.remove('hidden');
    //entriesList.style.display = 'block';
    entriesListClone.style.display = 'none';
    renderEntries(data);
    return;
  }

  dboard.classList.add('hidden');
  //entriesList.style.display = 'none';
  entriesListClone.style.display = 'block';
  
  const filtered = filterData(data, value);
  renderEntries(filtered, entriesListClone);
};

window.onscroll = () => {
  // Only hide search results if they're active
  if (!isSearchActive) return;
  
  clearTimeout(scrollTimer);
  scrollTimer = setTimeout(() => {
    if (entriesListClone.style.display !== 'none') {
      entriesListClone.style.display = 'none';
     // entriesList.style.display = 'block';
      dboard.classList.remove('hidden');
      isSearchActive = false;
      search.value = ''; // Optional: clear search input
    }
  }, 100);
};  

  


//const buttons = document.querySelectorAll('#in, #out, #all, #bin');

      buttons.forEach(btn => {
        btn.classList.remove("active");
      });
      
      document.querySelector('#all').classList.add("active");

    }



// render liquid money 
function renderLiquid(liquid) {
  if (!liquid) {
    console.log('ther is no Liquid money')
    return;
  }

  $('#liquidMoneyLabel').textContent=liquid.amount;
  
}



// Updated renderEntries function with target support
function renderEntries(data, target = entriesList) {
  document.querySelector('.loader').classList.add('off');
  // Reveal real summary totals, hide skeleton (direct call — no MutationObserver)
  hideSkeleton();
  target.innerHTML = '';
  
  const rows = [];
  ['in','out'].forEach(type => {
    const group = data[type] || {};
    Object.keys(group).forEach(key => {
      rows.push({...group[key], _type: type, _key: key});
    });
  });
  

  // 🔁 sort by timestamp (latest first)
  rows.sort((a, b) => b.ts - a.ts);

  let totalIn = 0, totalOut = 0, totalGpay = 0;
  
  if (rows.length === 0) {
    target.innerHTML = '<div class="small muted">No entries found.</div>'; 
    
    // Reset totals when no data
    totalInEl.textContent = '₹0';
    totalOutEl.textContent = '₹0';
    totalGpayEl.textContent = '₹0';
    netBalEl.textContent = '₹0';
    return;
  }
  let ob = 0
let count = 0;
let inCount =0
let outCount = 0
  rows.forEach(r => {
    if(r.name === 'Opening Balance') ob = r.amount;
    const el = document.createElement('div');
    el.className = `entry ${r._type === 'in' ? 'in' : 'out'}${r.gpay ? ' gp' : ''} ${ r.name==='Opening Balance'?' ob':''}`;
    el.innerHTML = `
      <div class="meta">
        <div><strong>${r._type.toUpperCase()} — ${r.name}</strong></div>
        <div class="small">${formatDT(r.ts)} • ${r.userEmail || ''} <br> ${r.staffName || ''} ${r.writer ? ` : ${r.writer} (${r.role ||'_'})` : ` (${r.role||'_'})`}<br> ${r.deletedBy ? `${r.deletedBy} Deleted This Transaction` : ''}<br>
        
       ${r.deleteReason?`Reason: ${r.deleteReason}`:''}
        </div>
      </div>
      <div style="text-align:right">
        <div><strong class='cash'>₹${Number(r.amount).toLocaleString()}</strong></div>
        <div><strong class='gpay'>₹${Number(r.gpay || 0).toLocaleString()}</strong></div>
        <div class="actions gpay">
          ${r.gpay ? '<span><i class="fa-brands fa-google-pay"></i></span>' : ''} 
          <button data-key='${r._key}' class='deleteBtn'>Delete</button>
        </div>
      </div>`;
    target.appendChild(el);
    
    if(r.name.toLowerCase()!='opening balance')count ++;
document.querySelector('#all').innerHTML=`ALL <span>${count}</span>`
    if (r._type === 'in') {
      
      if(r.name.toLowerCase()!='opening balance')inCount++;
      totalIn += Number(r.amount || 0) + Number(r.gpay || 0);
      document.querySelector('#in').innerHTML=`IN <span>${inCount}</span>`
    } else {
      outCount++
      totalOut += Number(r.amount || 0);
      document.querySelector('#out').innerHTML=`OUT <span>${outCount}</span>`
    }
    if (r.gpay) totalGpay += Number(r.gpay || 0);
  });

  // Update totals (shared for both views)
  const withoutOb = `₹${totalIn - ob.toLocaleString()}`
  totalInEl.textContent = `₹${totalIn.toLocaleString()}`;
  totalOutEl.textContent = `₹${totalOut.toLocaleString()}`;
  totalGpayEl.textContent = `₹${totalGpay.toLocaleString()}`;
  const net = totalIn - totalOut - totalGpay;
  netBalEl.textContent = `₹${net.toLocaleString()}`;
  // total - ob
  
  globalIn = totalIn
  checkGoals(totalIn)
  
}
// check goal function 

const checkGoals = async (totalIn) =>{
  function dayRoot(dateISO) { return `${username}/goals/${dateISO}`; }

// currentDate = dateISO;

// currentDateLabel.textContent = dateISO;
//entriesList.innerHTML = '<div class="small muted">Loading...</div>';

const rootRef = db.ref(dayRoot(currentDate));
const snapshot = await rootRef.get();
const data = snapshot.val() || {};
const isUserViewGoalAlert = localStorage.getItem('isUserViewGoalAlert')
if (!data) throw new Error('Db is Empty')
if (Object.values(data).length === 0) {
 // $('#setGoal').click()
 //showToast("Set Today's Goal now! 👇")
 appSettings.autoSetDailyGoal?setGoalDataToDb('Auto Goal', 10000, currentDate):''
 
 
}

$('#target').innerHTML = `
${
  data.targetAmount && Number(data.targetAmount) != 0
    ? `${data.targetAmount}`
    : `<a style="color:#09a0ff;" onclick="document.querySelector('#setGoal').click()">Set now</a>`
}
`;


// 2. Data exists, now check the alert flag for UI/logic control
if (isUserViewGoalAlert ==='yes') {
  // User has already viewed the goal alert, so skip showing it.
  console.log("Goal alert already shown to the user. Skipping.", isUserViewGoalAlert);
  return; // Or continue processing other non-alert logic
}
//renderEntries(data);
if (data.targetAmount <= totalIn) {
  const setBy = data.lastUpdatedBy?.toLowerCase() === fullname.toLowerCase()
    ? 'You'
    : (data.lastUpdatedBy || 'Owner');
  const overAmount = totalIn - data.targetAmount;
  const overPct = Math.round((overAmount / data.targetAmount) * 100);

  showOverlay({
    title: '🏆 Goal Crushed!',
    desc: `
      <div class="goal-overlay-card achieved">
        <div class="goal-overlay-row">
          <span class="goal-overlay-label">🎯 Target</span>
          <span class="goal-overlay-val">₹${Number(data.targetAmount).toLocaleString()}</span>
        </div>
        <div class="goal-overlay-row highlight">
          <span class="goal-overlay-label">💰 Earned Today</span>
          <span class="goal-overlay-val green">₹${Number(totalIn).toLocaleString()}</span>
        </div>
        ${overAmount > 0 ? `
        <div class="goal-overlay-row">
          <span class="goal-overlay-label">📈 Over Target</span>
          <span class="goal-overlay-val green">+₹${Number(overAmount).toLocaleString()} (+${overPct}%)</span>
        </div>` : ''}
        <div class="goal-overlay-progress">
          <div class="goal-overlay-bar" style="width:100%;background:#10b981"></div>
        </div>
        <p class="goal-overlay-setby">Set by <b>${setBy}</b></p>
      </div>
      <p class="goal-overlay-party-text">We have a special surprise for you! 🎉</p>
      <button class="meme_btn">🎬 Watch Party</button>
    `,
    icon: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10b981" style="width:56px">
      <path fill-rule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd" />
    </svg>`,
    btnColor: '#10b981'
  });

  localStorage.setItem('isUserViewGoalAlert', 'yes');
  $('#target').innerHTML = `<span class="goal-done-badge">₹${Number(data.targetAmount).toLocaleString()} ✅</span>`;
}

// Local Storage Key to track the last totalIn when the overlay was shown
const LAST_SHOWN_INCOME_KEY = 'lastShownOverlayIncome';

// 1. Calculate the 70% threshold
const seventyPercentThreshold = data.targetAmount * 0.7;

// 2. Get the last recorded income from Local Storage (defaults to 0 if not set)
const lastShownIncomeString = localStorage.getItem(LAST_SHOWN_INCOME_KEY);
const lastShownIncome = lastShownIncomeString ? parseFloat(lastShownIncomeString) : 0;

// 3. Define the increment threshold (Here we use 5% increase for simplicity, 
//    but since you just said 'old amount++', we'll check if the current income is greater).
//    For better UX, we'll keep the 5% buffer from the previous suggestion:
const MIN_INCREASE_PERCENT = 0.05; // 5% minimum increase
const requiredIncrease = lastShownIncome * MIN_INCREASE_PERCENT;

// Determine if the overlay should be displayed again:
// a) If it's the first time (lastShownIncome === 0)
// b) OR if the current totalIn is significantly higher than the last time it was shown
const shouldShowAgain = lastShownIncome === 0 || (totalIn >= lastShownIncome + requiredIncrease);


// 4. Combined Check
if (
    data.targetAmount > totalIn &&
    totalIn >= seventyPercentThreshold &&
    shouldShowAgain
) {
    const remainingAmount = data.targetAmount - totalIn;
    const progressPct = Math.min(Math.round((totalIn / data.targetAmount) * 100), 99);
    const setBy70 = data.lastUpdatedBy?.toLowerCase() === fullname.toLowerCase()
      ? 'You'
      : (data.lastUpdatedBy || 'Owner');

    showOverlay({
        title: '\uD83D\uDD25 Almost There!',
        desc: `
          <div class="goal-overlay-card progress">
            <div class="goal-overlay-row highlight">
              <span class="goal-overlay-label">\uD83D\uDCB0 Earned</span>
              <span class="goal-overlay-val green">\u20B9${Number(totalIn).toLocaleString()}</span>
            </div>
            <div class="goal-overlay-row">
              <span class="goal-overlay-label">\uD83C\uDFAF Target</span>
              <span class="goal-overlay-val">\u20B9${Number(data.targetAmount).toLocaleString()}</span>
            </div>
            <div class="goal-overlay-row">
              <span class="goal-overlay-label">\u23F3 Remaining</span>
              <span class="goal-overlay-val amber">\u20B9${Number(remainingAmount).toLocaleString()}</span>
            </div>
            <div class="goal-overlay-progress">
              <div class="goal-overlay-bar" style="width:${progressPct}%;background:#f59e0b"></div>
            </div>
            <p class="goal-overlay-pct">${progressPct}% complete</p>
            <p class="goal-overlay-setby">Set by <b>${setBy70}</b></p>
          </div>
          <p class="goal-overlay-msg">One last push \u2014 you\u2019ve got this! \uD83D\uDCAA</p>
        `,
        btnColor: '#f59e0b'
    });

    localStorage.setItem(LAST_SHOWN_INCOME_KEY, totalIn.toString());
}



//document.querySelector('#today_summery_card').style.display = 'none'


}



// Optional: Add event delegation for delete buttons in both lists
function setupEventDelegation() {
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('deleteBtn')) {
      const key = e.target.dataset.key;
      // Your delete logic here
      //handleDelete(key); // this function not exist 
    }
    
  });
}

// Initialize event delegation
//setupEventDelegation();
    
  
  


    // Create serial number (count existing children +1)
    async function nextSerial(dateISO,type){
      const ref = db.ref(dayRoot(dateISO)+`/${type}`);
      const snap = await ref.get();
      const count = snap.exists()? Object.keys(snap.val()).length:0;
      return count+1;
    }

const saveItemName = (raw) => {
  if (!raw) return;

  const stored = JSON.parse(localStorage.getItem('itemNames') || '[]');

  const normalizedStored = stored.map(s => s.toLowerCase());

  raw
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 1)
    .forEach(name => {
      const key = name.toLowerCase();

      if (!normalizedStored.includes(key)) {
        stored.unshift(name);
        normalizedStored.unshift(key);
      }
    });

  localStorage.setItem(
    'itemNames',
    JSON.stringify(stored.slice(0, 20))
  );
};
    
var progress = false;
    entryForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if(progress) return showTopToast('Try again : 409');
      
      const t = 'in';
      const name = entryForm.querySelector('#desc').value.trim();
      const amount = entryForm.querySelector('#amount');
      const staffName = localStorage.getItem('CASHBOOK_FULLNAME').trim() || 'UNKNOWN';
      const amt = Number(amount.value);
      const gpAmount = Number(document.querySelector('#gpAmount').value);
      const g = gpAmount ||0;
      if(!name || !amt && !gpAmount) return showTopToast('Name and amount required');
      saveItemName(name)
      progress=true;
      document.querySelector('#addBtn').textContent='Loading...'
      //$('.loader').classList.remove('off')
      loading_text.textContent='Updating...'
    //  const dateISO = selectDate.value || isoDate(new Date());
    const dateISO = isoDate(new Date());
      const s = await nextSerial(dateISO,t);
      const nodeRef = db.ref(dayRoot(dateISO)+`/${t}`).push();
      await nodeRef.set({
        serial: s,
        name,
        amount: amt,
        gpay: g,
        ts: Date.now(),
        staffName,
        writer: document.querySelector('#staff').value || null,
        userEmail: auth.currentUser ? auth.currentUser.email : 'local',
        role: localStorage.getItem('CASHBOOK_ROLL') || 'unknown'
      }).then(()=>{
        
        progress=false
        //$('.loader').classList.add('off')
        loading_text.textContent='Done'
        
         vibrate(15); // short, crisp, non-annoying
        
        $('#desc').focus()
      }).catch((error)=>{
        $('.loader').classList.add('off')
        showOverlay({
          title:'Data save failed!',
          desc:`Please check your connection or try again. Error:  ${error.message}`,
          btnColor:'#ef4444'
        })
      });
      
      
      

      // clear
      document.querySelector('#addBtn').textContent='Done'
      document.getElementById('dashThisMonth').click()
      desc.value=''; amount.value=''; isGpay.checked=false;document.querySelector('#gpAmount').value =''
      document.querySelector('#staff').value=''
      loadForDate(dateISO);
    });
    
    
    entryFormOut.addEventListener('submit', async (e)=>{
      
      e.preventDefault();
            if(progress) return showTopToast('Try again : 409');
            
      const desc = entryFormOut.querySelector('#desc')
      const amount = entryFormOut.querySelector('#amount');
      const t = 'out';
      const name = desc.value.trim();
      const amt = Number(amount.value);
      const g = false;
      if(!name || !amt) return showTopToast('Name and amount required');
      progress=true;
      //$('.loader').classList.remove('off')
      loading_text.textContent='Updating...'
      entryFormOut.querySelector('#addBtn').textContent='Loading...'
      // const dateISO = selectDate.value || isoDate(new Date());
      const dateISO = isoDate(new Date());
      const s = await nextSerial(dateISO,t);
      const nodeRef = db.ref(dayRoot(dateISO)+`/${t}`).push();
      const staffName = localStorage.getItem('CASHBOOK_FULLNAME').trim() || 'UNKNOWN';
      await nodeRef.set({
        serial: s,
        name,
        amount: amt,
        gpay: g,
        ts: Date.now(),
        staffName,
        userEmail: auth.currentUser ? auth.currentUser.email : 'local',
        role: localStorage.getItem('CASHBOOK_ROLL') || 'UNKNOWN',
      }).then(()=>{
        //$('.loader').classList.add('off')
        loading_text.textContent='Done'
        progress=false;
        
         vibrate(15); // short, crisp, non-annoying
        
      });
      // clear
      entryFormOut.querySelector('#addBtn').textContent='Done'
      document.getElementById('dashThisMonth').click()
      desc.value=''; amount.value=''; isGpay.checked=false;
      loadForDate(dateISO);
      desc.focus()
    });

    selectDate.addEventListener('change', () => loadForDate(selectDate.value));
    reloadBtn.addEventListener('click', () => { _invalidateCache(selectDate.value); loadForDate(selectDate.value); });
    
    
    
    
    ///. OPENING BALANCE ////


obForm.onsubmit = async (e)=> {
  const obAmount = $('#obAmount').value
  e.preventDefault()
  if(!obAmount)throw new  Error('Enter Amount')
  const t = 'in'
  const dateISO =  isoDate(new Date(Date.now() + 24*60*60*1000));
      const s = await nextSerial(dateISO,t);
      const nodeRef = db.ref(dayRoot(dateISO)+`/${t}`).push();
      const staffName = localStorage.getItem('CASHBOOK_FULLNAME').trim() || 'UNKNOWN';
      const now = new Date()
      
if(progress) return showTopToast('Try again : 409');
$('.loader').classList.remove('off')
      progress = true;
      await nodeRef.set({
        serial: s,
        name: 'Opening Balance',
        amount: obAmount,
        gpay: false,
        ts: Date.now(),
        staffName,
        userEmail: auth.currentUser ? auth.currentUser.email : 'local',
        role: localStorage.getItem('CASHBOOK_ROLL') || 'UNKNOWN',
      }).then(()=>{
        $('.loader').classList.add('off')
        progress=false;
        
         vibrate(15); // short, crisp, non-annoying
        
        localStorage.setItem('CASHBOOK_OB',now.getDate());
        obCard.classList.add('off')
        setTimeout(() => {
  obCard.classList.add('hidden')
}, 1000);



      });
      
      // clear 
      $('#obAmount').value = '';
      
      checkGoalAchived()
      
}


const checkGoalAchived= async ()=>{
  function dayRoot(dateISO) { return `${username}/goals/${currentDate}`; }
  
  
  



// currentDate = dateISO;

// currentDateLabel.textContent = dateISO;
//entriesList.innerHTML = '<div class="small muted">Loading...</div>';

const rootRef = db.ref(dayRoot(currentDate));
const snapshot = await rootRef.get();
const data = snapshot.val() || {};

if (!data) throw new Error('Db is Empty')
if (Object.values(data).length === 0) {
 // $('#setGoal').click()
}


if (data.targetAmount > globalIn) {
  showOverlay({
  title: '😔 Keep Going! Daily Goal Not Yet Reached!',
  desc: `You aimed for <b>₹${data.targetAmount}</b>. Today's total income is <b>₹${globalIn}</b>. You're close—let's hit that target tomorrow!
  
  <small style="font-style: italic">Target set by: **${data.lastUpdatedBy.toLowerCase() === fullname.toLowerCase() ? "You" : data.lastUpdatedBy}**</small>`
})
}
//document.querySelector('#today_summery_card').style.display = 'none'


}





  ////. LIQUID MONTY THAT TODAYS LAST AMOUT IN COUNTER /////
  
  liquidMoneyForm.onsubmit = async (e) => {
  e.preventDefault();

  if (progress) return showTopToast('Try again : 409');

  const liqAmount = $('#liqAmount').value;
  if (!liqAmount) {
    showTopToast('Enter Amount');
    return;
  }

  progress = true;
  $('.loader').classList.remove('off');

  const now = new Date();
  const dateISO = isoDate(now);

  const s = await nextSerial(dateISO);
  const staffName = localStorage.getItem('CASHBOOK_FULLNAME')?.trim() || 'UNKNOWN';

  const liquidRef = db.ref(dayRoot(dateISO) + '/liquid');

  _invalidateCache(currentDate);
  await liquidRef.set({
    serial: s,
    name: 'Liquid Amount',
    amount: Number(liqAmount),
    gpay: false,

    // 🔥 time & date
    date: dateISO,                       // 2025-12-18
    time: now.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    }),                                  // 09:42 PM

    ts: now.getTime(),                   // machine timestamp

    staffName,
    userEmail: auth.currentUser?.email || 'local',
    role: localStorage.getItem('CASHBOOK_ROLL') || 'UNKNOWN',
  });

  $('.loader').classList.add('off');
  progress = false;

  vibrate(15);

  localStorage.setItem('CASHBOOK_LIQUID', now.getDate());

  liquidCard.classList.add('off');
  setTimeout(() => liquidCard.classList.add('hidden'), 1000);
};

/// end liquid ///


// suggestion  entry form 

const incomeInput = entryForm.querySelector('#desc')
const suggestionBox = document.querySelector('#suggestionBox')
const toggleSuggestionFocus = (isFocus) => {
  if (!appSettings.suggestion) return;
  incomeInput.classList.toggle('focus', isFocus);
};

incomeInput.onfocus = () => toggleSuggestionFocus(true);
incomeInput.onblur  = () => toggleSuggestionFocus(false);

incomeInput.addEventListener('input', () => {
  if (!appSettings.suggestion) return; // STOP HERE
  const raw = incomeInput.value;
  const list = JSON.parse(localStorage.getItem('itemNames') || '[]');

  const parts = raw.split(',');
  const lastRaw = parts[parts.length - 1];
  const lastPart = lastRaw.trim().toLowerCase();

  if (!lastPart) {
  const list = JSON.parse(localStorage.getItem('itemNames') || '[]');

  const recent = list.slice(0, 4);

  suggestionBox.innerHTML = recent.length
    ? recent.map(n => `<span class="suggest suggestion">${n}</span>`).join('')
    : '';

  return;
}

  const matches = list.filter(n =>
    n.toLowerCase().startsWith(lastPart)
  );

  // 👉 check if this is a NEW word
  const isNew = !list.some(n => n.toLowerCase() === lastPart);

  suggestionBox.innerHTML = matches.length
    ? matches.slice(0, 5)
        .map(n => `<span class="suggest suggestion">${n}</span>`)
        .join('')
    : isNew
      ? `<span class="hint suggestion">${lastRaw.trim()}</span>`
      : '';
});


suggestionBox.addEventListener('click', e => {
  if (!e.target.classList.contains('suggestion')) return;

  const value = incomeInput.value;
  const parts = value.split(',');

  // replace last token
  parts[parts.length - 1] = ' ' + e.target.textContent;

  incomeInput.value = parts.join(',').replace(/^ /, '');

  suggestionBox.innerHTML = '';
  incomeInput.focus()
});








//checkGoalAchived()


function checkOBBox() {
  console.log('checking ob')
  const now = new Date();
  const hour = now.getHours(); // 0–23
  
  const noOB = localStorage.getItem('CASHBOOK_OB')!=now.getDate();
  const inTime = hour >= 17 && hour < 23; // 9pm to 11pm
  
  if (noOB && inTime) {
    obCard.classList.remove('hidden');
  } else {
    obCard.classList.add('hidden');
  }
  
  
  // liquid card
  
  const noLiquid = localStorage.getItem('CASHBOOK_LIQUID')!=now.getDate();
  
  if(inTime){
    liquidCard.classList.remove('hidden');
  }else liquidCard.classList.add('hidden');
}

checkOBBox();





// DELETE EVENT LISTENER: 
document.addEventListener('click', async (e) => {
  // Check if the clicked element is a delete button
  if (e.target.classList.contains('deleteBtn')) {
    
    const key = e.target.dataset.key;
    
    // Find type: in or out
    const inPath = db.ref(dayRoot(currentDate) + `/in/${key}`);
    const type = (await inPath.get()).exists() ? 'in' : 'out';

    // Original entry
    const originalRef = db.ref(dayRoot(currentDate) + `/${type}/${key}`);

    const snap = await originalRef.get();
    if (!snap.exists()) {
      showTopToast("Entry not found. : 404");
      
        vibrate([15, 80, 15]);
      
      return;
    }

    const data = snap.val();

    // 1. First Popup: CONFIRMATION
    const userConfirmed = await askUserPermission({
      title: 'Confirm Deletion',
      desc: 'Are you sure you want to delete this entry?',
      icon: ` 
        <svg xmlns="http://www.w3.org/2000/svg" class="icon-svg" viewBox="0 0 20 20" fill="red">
             <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      `,
      btnColor: '#F44336', // red
    });
    
    if (!userConfirmed) return;

    // 2. Second Popup: REASON FOR DELETION (New Step)
    const deletionReason = await askUserReason({
        title: 'Reason for Deletion (Optional)',
        placeholder: 'e.g., Wrong Amount, Duplicate Entry...',
        btnText: 'Confirm Delete'
    });

    // If user cancels the reason input or leaves it empty (optional: remove !deletionReason check if empty is allowed)
    if (deletionReason === null) return; 

    // 3. MOVE TO RECYCLE BIN with Reason
    const recycleRef = db.ref(`${username}/recycleBin/${currentDate}/${type}/${key}`);
    _invalidateCache(currentDate);
    await recycleRef.set({
      ...data,
      deleteReason: deletionReason || 'No reason provided', // Save the input
      deletedAt: new Date().toLocaleString("en-IN"),
      deletedBy: fullname || 'unknown',
      role: localStorage.getItem('CASHBOOK_ROLL') || 'UNKNOWN',
    });

    // 4. DELETE ORIGINAL
    await originalRef.remove();

    // 5. Refresh UI
    loadForDate(currentDate);
    
    $('.dboard').classList.remove('hidden');

    if(search.value.trim()){
      // Use closest() for more reliable traversal
      const cloneNode = e.target.closest('.entry')?.parentElement;
      if (cloneNode && cloneNode.id === 'entriesListSearch') {
        cloneNode.remove();
        search.value = '';
      }
    }
  }
  
  
  if (e.target.classList.contains('meme_btn')) {
    hideOverlay()
    setTimeout(()=>startMeme(), 2000)
  }
});

// --- HELPER FUNCTION ---
// This creates a popup with a text input
function askUserReason({ title, placeholder, btnText }) {
  return new Promise((resolve) => {
    // Create Modal HTML elements
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay'; // Using custom CSS class
    
    overlay.innerHTML = `
      <div class="popup-box">
        <h3 class="popup-title">${title}</h3>
        <input type="text" id="reasonInput" class="popup-input" placeholder="${placeholder}" autocomplete="off">
        <div class="popup-actions">
          <button id="cancelReasonBtn" class="popup-btn popup-btn-cancel">Cancel</button>
          <button id="confirmReasonBtn" class="popup-btn popup-btn-confirm">${btnText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#reasonInput');
    const confirmBtn = overlay.querySelector('#confirmReasonBtn');
    const cancelBtn = overlay.querySelector('#cancelReasonBtn');

    // Focus input automatically
    setTimeout(() => input.focus(), 50);

    const close = (value) => {
      // Small fade-out effect logic could go here, but removing directly for simplicity
      overlay.remove();
      resolve(value);
    };

    confirmBtn.onclick = () => {
        const val = input.value.trim();
        close(val);
    };

    cancelBtn.onclick = () => close(null);

    // Allow Enter key to confirm
    input.onkeydown = (e) => {
        if (e.key === 'Enter') confirmBtn.click();
        if (e.key === 'Escape') cancelBtn.click();
    };
  });
}



// --------- MEME / PARTY FUNCTION -------- //

// Add your video files to ./assets/video/ and list them here
const MEME_VIDEOS = [
  './assets/video/cat.mp4',
  './assets/video/blabla.mp4',
  './assets/video/manual_override.mp4',
  //'./assets/video/party4.mp4',
 // './assets/video/party5.mp4',
];

let _memeTimers = [];
const startMeme = () => {
  const overlay  = document.getElementById('memeOverlay');
  const videoEl  = document.getElementById('memeVideo');
  if (!overlay || !videoEl) return;

  // Pick a random video each time
  const src = MEME_VIDEOS[Math.floor(Math.random() * MEME_VIDEOS.length)];
  videoEl.src = src;
  videoEl.load();

  overlay.classList.remove('hidden');
  videoEl.play().catch(() => {}); // ignore autoplay policy errors

  // Auto-stop when video ends
  videoEl.addEventListener('ended', () => stopMeme(), { once: true });




if (src.includes('cat')) {
    // Add .meme to inputs immediately
  document.querySelectorAll('input').forEach(el => el.classList.add('meme'));
  
  // Add .meme to cards after 6.5 s
  _memeTimers.push(setTimeout(() => {
    document.querySelectorAll('.card').forEach(el => el.classList.add('meme'));
  }, 6500));
  
  // Add .dj body class at 15 s
  _memeTimers.push(setTimeout(() => {
    document.body.classList.add('dj');
  }, 15000));
} else if (src.includes('blabla')) {
    document.body.classList.add('blabla');
    setTimeout(()=>{
      document.querySelectorAll('.entry').forEach(el => el.classList.add('blabla'));
  }, 7500)
} else if (src.includes('manual_override')){
  // Function to apply Phonk effect to elements


applyPhonkEffect()

}
};
// Optimized Phonk Effect
let phonkInterval
function applyPhonkEffect() {
    const selectors = 'button, .card, input, h1, p, select, .nav';
    const elements = document.querySelectorAll(selectors);

    if (elements.length === 0) return;

    // Trigger an effect on a random element every 300ms
    phonkInterval = setInterval(() => {
        const randomElement = elements[Math.floor(Math.random() * elements.length)];
        const effect = Math.random() > 0.5 ? 'manual_override-shake' : 'manual_override-glitch';

        randomElement.classList.add(effect);

        // Remove the effect after 100ms
        

    }, 300); // Adjust this speed as needed
}




// document.querySelector('.nav').onclick=()=>startMeme();
const stopMeme = () => {
  const overlay = document.getElementById('memeOverlay');
  const videoEl = document.getElementById('memeVideo');

  // Stop & reset video
  if (videoEl) {
    videoEl.pause();
    videoEl.currentTime = 0;
    videoEl.src = '';
  }

  // Hide overlay
  if (overlay) overlay.classList.add('hidden');

  // Clear all pending timers
  _memeTimers.forEach(id => clearTimeout(id));
  _memeTimers = [];

  // Remove .meme and .dj classes
  document.querySelectorAll('input, .card').forEach(el => el.classList.remove('meme'));
  document.body.classList.remove('dj');
  document.body.classList.remove('blabla');
  
  
  clearInterval(phonkInterval);
  const selectors = 'button, .card, input, h1, p, select, .nav';
    const elements = document.querySelectorAll(selectors);
    
    elements.forEach(el => {
        el.classList.remove('manual_override-shake', 'manual_override-glitch');
    });
};


// Example: stopMeme() is called automatically when video ends, or via Skip button.
document.getElementById('stopMemeBtn').addEventListener('click', () => stopMeme());







    // Clear day (CAUTION): deletes all data for date
    clearDay.addEventListener('click', async ()=>{
    
    const userConfirmed = await askUserPermission({title:'Confirm Deletion', desc:`Are you sure you want to delete this day? <span style='color: #ef4444; font-weight: 500'>This action cannot be undone.</span>`, icon:`
      <svg xmlns="http://www.w3.org/2000/svg" class="icon-svg" viewBox="0 0 20 20" fill="#ef4444">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
    
    `, btnColor:'#F44336'}); //red
    
      if(!userConfirmed) return;
     // await db.ref(dayRoot(currentDate)).remove(); loadForDate(currentDate);
     
     showTopToast('Sorry, This function was deactivated for security issue','#FFD54F')
    });

    // Download day (same as export for now)
    downloadAll.addEventListener('click', ()=> exportCSV.click());

    // initial view
    authView.style.display='block';

  
// ------------------------ DASHBOARD: date-range summary & mini chart ------------------------

// Utility: iterate date strings between two ISO dates (inclusive)
function datesBetween(startISO, endISO){
  const arr=[]; let cur=new Date(startISO); const end=new Date(endISO);
  while(cur<=end){ arr.push(isoDate(cur)); cur.setDate(cur.getDate()+1); }
  return arr;
}

// Fetch totals for a date range and render dashboard
async function fetchRangeTotals(startISO, endISO){
  // ── Show skeleton immediately while fetching ──
  const dashSummaryEl = document.getElementById('dashSummary');
  const dashChartEl   = document.getElementById('dashChart');
  if (dashSummaryEl) {
    dashSummaryEl.innerHTML = `
      <div class="dash-skel-grid">
        <div class="dash-skel-stat"><div class="skel-line w55 thin"></div><div class="skel-line w70" style="height:22px;margin-top:6px;border-radius:6px"></div></div>
        <div class="dash-skel-stat"><div class="skel-line w55 thin"></div><div class="skel-line w70" style="height:22px;margin-top:6px;border-radius:6px"></div></div>
        <div class="dash-skel-stat"><div class="skel-line w55 thin"></div><div class="skel-line w70" style="height:22px;margin-top:6px;border-radius:6px"></div></div>
        <div class="dash-skel-stat"><div class="skel-line w55 thin"></div><div class="skel-line w70" style="height:22px;margin-top:6px;border-radius:6px"></div></div>
        <div class="dash-skel-stat dash-skel-full"><div class="skel-line w45 thin"></div><div class="skel-line w80" style="height:22px;margin-top:6px;border-radius:6px"></div></div>
      </div>`;
  }
  if (dashChartEl) {
    dashChartEl.innerHTML = `
      <div class="dash-skel-chart">
        <div class="dash-skel-bars">
          ${[55,80,40,90,65,75,50,85,45,70,95,60].map(h =>
            `<div class="dash-skel-bar" style="height:${h}%"></div>`
          ).join('')}
        </div>
        <div class="dash-skel-xaxis">
          ${Array.from({length:6},()=>`<div class="skel-line" style="width:20px;height:8px"></div>`).join('')}
        </div>
      </div>`;
  }

  const days = datesBetween(startISO,endISO);
  const dayTotals = [];
  let aggIn=0, aggOut=0, aggG=0, ob=0;
  for(const d of days){
    const snap = await db.ref(dayRoot(d)).get();
    const data = snap.val() || {};
    let tin=0, tout=0, tg=0;
    ['in','out'].forEach(type=>{
      const group = data[type]||{};
      Object.values(group).forEach(r=>{
      if(r.name==='Opening Balance') ob+=Number(r.amount);
        if(type==='in') tin += Number(r.amount||0) + Number(r.gpay || 0); else tout += Number(r.amount||0);
        if(r.gpay) tg += Number(r.gpay||0);
      });
    });
    dayTotals.push({date:d,in:tin,out:tout,gpay:tg});
    aggIn += tin; aggOut += tout; aggG += tg;
  }
  renderDashboard(dayTotals, {aggIn, aggOut, aggG, ob});
}


// Render small stats and mini SVG chart
function renderDashboard(dayTotals, aggs){
  const dashSummary = document.getElementById('dashSummary');
  const dashChart = document.getElementById('dashChart');
  const {aggIn, aggOut, aggG, ob} = aggs;
  const net = aggIn - aggOut - aggG - ob;

  dashSummary.innerHTML = `
    <div class="dash-range-label">Range: ${dayTotals.length} day${dayTotals.length !== 1 ? 's' : ''}</div>
    <div class="dash-stats-grid">
      <div class="dash-stat-box in">
        <div class="dash-stat-label">RANGE IN</div>
        <div class="dash-stat-val tod-in">₹${aggIn.toLocaleString()}</div>
      </div>
      <div class="dash-stat-box out">
        <div class="dash-stat-label">RANGE OUT</div>
        <div class="dash-stat-val tod-out">₹${aggOut.toLocaleString()}</div>
      </div>
      <div class="dash-stat-box ob">
        <div class="dash-stat-label">OB</div>
        <div class="dash-stat-val tod-ob">₹${ob.toLocaleString()}</div>
      </div>
      <div class="dash-stat-box gpay">
        <div class="dash-stat-label">GPAY (IN)</div>
        <div class="dash-stat-val tod-gp-in">₹${aggG.toLocaleString()}</div>
      </div>
      <div class="dash-stat-box net full">
        <div class="dash-stat-label">NET (IN − OUT − GPay − OB)</div>
        <div class="dash-stat-val tod-tot">₹${net.toLocaleString()}</div>
      </div>
    </div>
  `;

  // prepare points for line chart (net per day)
  const nets = dayTotals.map(d=> (d.in - d.out));
  const labels = dayTotals.map(d=>d.date.slice(5)); // MM-DD
  drawSparkline(dashChart, nets, labels);
  // mine
  const fullscreenChart=document.querySelector('.fullscreenChart')
drawSparklineFullscreen(fullscreenChart, nets, labels)
  
  const chartEl = document.querySelector('#dashChart');
  const chartElSvg = document.querySelector('#dashChart');

  chartElSvg.onclick=()=>{
  location.href='./dashboard'
  //  mainView.style.display='none';
   // chartView.style.display='block';
   // document.querySelector('.card.dboard').style.display='none';
   // showFullChart(dayTotals)
   $('.loader').classList.remove('off')
  }
if (dayTotals.length > 0) {
  drawSparkline(
    chartEl,
    dayTotals.map(d => d.in), // blue = income
    dayTotals.map(d => d.out), // red = expense
    dayTotals.map(d => d.date)
  );
} else {
  chartEl.innerHTML = "<p style='text-align:center;color:#999;'>Not enough data to plot chart</p>";
}
}


// BACK button handler
document.getElementById('backToMain').addEventListener('click', ()=>{
  chartView.style.display='none';
  mainView.style.display='block';
  document.querySelector('.card.dboard').style.display='block';
});

// When dashboard chart clicked → open full chart view with same data
function showFullChart(dayTotals){
  document.getElementById('chartView').style.display='block';
  mainView.style.display='none';
  
  const fullContainer = document.getElementById('fullChart');
  fullContainer.innerHTML = "<div>Loading chart...</div>";

  setTimeout(()=>{
    drawSparkline(fullContainer,
      dayTotals.map(d=>d.in),
      dayTotals.map(d=>d.out),
      dayTotals.map(d=>d.date)
    );
  },100);
}

document.getElementById('backToMain').onclick=()=>{
  document.getElementById('chartView').style.display='none';
  mainView.style.display='block';
};

// Draw a simple SVG sparkline inside container
// Draw a dual-line SVG sparkline (Income + Expense)
function drawSparkline(container, valuesIn, valuesOut, labels) {
  if (!valuesIn?.length && !valuesOut?.length) return;
  
  const len = Math.max(valuesIn.length, valuesOut.length);
  const safeIn  = Array.from({length: len}, (_, i) => valuesIn[i]  ?? 0);
  const safeOut = Array.from({length: len}, (_, i) => valuesOut[i] ?? 0);

  const rect = container.getBoundingClientRect();
  const w = rect.width, pad = 10;
  const h = rect.width * 0.45; // slightly more height for bottom labels

  const allValues = [...safeIn, ...safeOut];
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);

  const scaleY = v => pad + (1 - (v - min)/(max - min || 1))*(h - 35); // 35 = space for labels
  const scaleX = i => pad + (i * (w - 2*pad) / (len - 1 || 1));

  const makePath = vals => vals
    .map((v,i) => `${i===0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(v)}`)
    .join(' ');

  const pathIn  = makePath(safeIn);
  const pathOut = makePath(safeOut);

  // GRID LINES + LABELS
  const gridLines = [];
  const bottomLabelY = h - 10;

  const gridH = 4;
  for (let i=0; i<=gridH; i++) {
    const y = pad + (i * ((h - 35) - pad) / gridH);
    gridLines.push(`
      <line x1='${pad}' y1='${y}' x2='${w - pad}' y2='${y}'
        stroke='#ccc' stroke-width='1' stroke-dasharray='3,3'/>
    `);
  }

  for (let i = 0; i < len; i++) {
  const x = scaleX(i);

  gridLines.push(`
    <line 
      x1='${x}' 
      y1='${pad}' 
      x2='${x}' 
      y2='${h - 25}' 
      stroke='#ddd' 
      stroke-width='1' 
      stroke-dasharray='3,3'
    />
  `);

  // show date below
  if (labels?.[i]) {
  const day = new Date(labels[i]).getDate();
  gridLines.push(`
    <text 
      x='${x}' 
      y='${h - 10}' 
      font-size='10' 
      text-anchor='middle' 
      fill='#666'
    >
      ${day}
    </text>
  `);
}
}

  // DOTS + VALUE LABELS (safeIn)
  const dots = [];
  safeIn.forEach((v, i) => {
    const x = scaleX(i), y = scaleY(v);

    const textWidth = String(v).length * 6;
    const rectX = x - textWidth/2 - 4;
    const rectY = y - 17;
    const rectW = textWidth + 8;
    const rectH = 14;

    dots.push(`
      <rect x='${rectX}' y='${rectY}' width='${rectW}' height='${rectH}'
        fill='#E8EAFF' rx='3'/>
      <circle cx='${x}' cy='${y}' r='3' fill='#0BA2FF'/>
      <text x='${x}' y='${y - 6}' font-size='10' text-anchor='middle' fill='#0BA2FF'>${v}</text>
    `);
  });

  // DOTS for OUT
  safeOut.forEach((v, i) => {
    const x = scaleX(i), y = scaleY(v);
    dots.push(`
      <circle cx='${x}' cy='${y}' r='3' fill='#FF4D4D'/>
      <text x='${x}' y='${y - 6}' font-size='10' text-anchor='middle' fill='#FF4D4D'>${v}</text>
    `);
  });

  const strokeWidth = Math.max(1, Math.min(window.innerWidth / 200, 10));

  const svg = `
    <svg width='${w}' height='${h}' viewBox='0 0 ${w} ${h}' xmlns='http://www.w3.org/2000/svg'>
      ${gridLines.join('\n')}
      <path d='${pathIn}' fill='none' stroke='#0BA2FF' stroke-width='${strokeWidth}' stroke-linejoin='round' stroke-linecap='round'/>
      <path d='${pathOut}' fill='none' stroke='#FF4D4D' stroke-width='${strokeWidth}' stroke-linejoin='round' stroke-linecap='round'/>
      ${dots.join('\n')}
    </svg>
  `;

  container.innerHTML = svg;
}


function drawSparklineFullscreen(container, valuesIn, valuesOut, labels) {
  if (!valuesIn?.length && !valuesOut?.length) return;

  const len = Math.max(valuesIn.length, valuesOut.length);
  const safeIn = Array.from({ length: len }, (_, i) => valuesIn[i] ?? 0);
  const safeOut = Array.from({ length: len }, (_, i) => valuesOut[i] ?? 0);

  const svgW = window.innerHeight * 1.8; // landscape width
  const svgH = window.innerWidth * 0.9;  // proportional height
  const pad = 40;

  const allValues = [...safeIn, ...safeOut];
  const max = Math.max(...allValues, 1);
  const min = Math.min(...allValues, 0);

  const scaleY = v => pad + (1 - (v - min) / (max - min || 1)) * (svgH - 2 * pad);
  const scaleX = i => pad + (i * (svgW - 2 * pad) / (len - 1 || 1));

  const makePath = vals => vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(v)}`).join(' ');

  const pathIn = makePath(safeIn);
  const pathOut = makePath(safeOut);

  // grid lines
  const gridLines = [];
  for (let i = 0; i <= 4; i++) {
    const y = pad + (i * (svgH - 2 * pad) / 4);
    gridLines.push(`<line x1='${pad}' y1='${y}' x2='${svgW - pad}' y2='${y}' stroke='#ddd' stroke-dasharray='4,4' />`);
  }

  // dots with values
  const dots = [];
  safeIn.forEach((v, i) => {
    const x = scaleX(i), y = scaleY(v);
    dots.push(`
      <circle cx='${x}' cy='${y}' r='6' fill='#0BA2FF'/>
      <text x='${x}' y='${y - 10}' font-size='24' text-anchor='middle' fill='#0BA2FF' font-weight='bold'>${v}</text>
    `);
  });
  safeOut.forEach((v, i) => {
    const x = scaleX(i), y = scaleY(v);
    dots.push(`
      <circle cx='${x}' cy='${y}' r='6' fill='#FF4D4D'/>
      <text x='${x}' y='${y - 10}' font-size='24' text-anchor='middle' fill='#FF4D4D' font-weight='bold'>${v}</text>
    `);
  });

  const svg = `
    <svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="${svgW}" height="${svgH}" fill="transparent"/>
      ${gridLines.join('\n')}
      <path d="${pathIn}" fill="none" stroke="#0BA2FF" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="${pathOut}" fill="none" stroke="#FF4D4D" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
      ${dots.join('\n')}
    </svg>
  `;

  container.innerHTML = svg;
}



// Inject dashboard UI into the page (top area)

if (username || fullname) {
  
(function addDashboardUI(){


  const container = document.querySelector('#app');
  const dashCard = document.createElement('div');
  dashCard.className = 'card dboard';
  dashCard.style.marginBottom='12px';
  dashCard.style.marginTop='12px'
  dashCard.innerHTML = `
    <h3>Dashboard</h3>
    <div style='display:flex;gap:8px;align-items:center;margin-bottom:8px' class='fliter-btns'>
      <label class='small'>Start: <input type='date' id='dashStart' /></label>
      <label class='small'>End: <input type='date' id='dashEnd' /></label>
      <button id='dashLoad' style='padding:8px 10px; display:none;'>Load</button>
      <button id='dashToday' class='link'>Today</button>
      <button id='dashThisMonth' class='link'>This Month</button>
    </div>
    <div style='display:flex;gap:12px;align-items:flex-start'>
      <div id='dashSummary' style='flex:1'>
      <div class="dash-skel-grid">
        <div class="dash-skel-stat"><div class="skel-line w55 thin"></div><div class="skel-line w70" style="height:22px;margin-top:6px;border-radius:6px"></div></div>
        <div class="dash-skel-stat"><div class="skel-line w55 thin"></div><div class="skel-line w70" style="height:22px;margin-top:6px;border-radius:6px"></div></div>
        <div class="dash-skel-stat"><div class="skel-line w55 thin"></div><div class="skel-line w70" style="height:22px;margin-top:6px;border-radius:6px"></div></div>
        <div class="dash-skel-stat"><div class="skel-line w55 thin"></div><div class="skel-line w70" style="height:22px;margin-top:6px;border-radius:6px"></div></div>
        <div class="dash-skel-stat dash-skel-full"><div class="skel-line w45 thin"></div><div class="skel-line w80" style="height:22px;margin-top:6px;border-radius:6px"></div></div>
      </div>
      </div>
      <div id='dashChart' style='width:420px;height:120px'>
      
      <div class="dash-skel-chart">
        <div class="dash-skel-bars">
          ${[55,80,40,90,65,75,50,85,45,70,95,60].map(h =>
            `<div class="dash-skel-bar" style="height:${h}%"></div>`
          ).join('')}
        </div>
        <div class="dash-skel-xaxis">
          ${Array.from({length:6},()=>`<div class="skel-line" style="width:20px;height:8px"></div>`).join('')}
        </div>
      </div>
      
      </div>
    </div>
  `;
  container.insertBefore(dashCard, container.firstChild);

  // attach handlers
  $('#dashLoad').onclick=()=>{
    const s = document.getElementById('dashStart').value;
    const e = document.getElementById('dashEnd').value;
    if(!s||!e) return showTopToast('Pick start and end date');
    fetchRangeTotals(s,e);
  }
  document.getElementById('dashToday').addEventListener('click', ()=>{
    const t = isoDate(new Date());
    document.getElementById('dashStart').value = t; document.getElementById('dashEnd').value = t;
    fetchRangeTotals(t,t);
  });
  document.getElementById('dashThisMonth').addEventListener('click', ()=>{
    const d = new Date(); const start = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
    const end = isoDate(d);
    document.getElementById('dashStart').value = start; document.getElementById('dashEnd').value = end;
    fetchRangeTotals(start,end);
  });
})();
} // username || fullname
// ------------------------ END DASHBOARD ------------------------




const dataRef = ref(db, `/${username}`);
console.log(username || 'unknown user')
// simple toast function
function showToast(msg) {
  let toast = document.createElement("div");
  toast.textContent = msg;
  toast.style.position = "fixed";
  toast.style.bottom = "2rem";
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";
  toast.style.background = "#fff";
  toast.style.color = "#34A853";
  toast.style.padding = "0.8rem 1.6rem";
  toast.style.borderRadius = "2rem";
  toast.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)";
  toast.style.fontWeight = "500";
  toast.style.fontSize='13px';
  toast.style.zIndex = "9999";
  toast.style.opacity = "0";
  toast.style.transition = "opacity 0.3s ease";
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}


// Top toast alert
function showTopToast(msg, bg = "#34A853") {
  const toast = document.createElement("div");
  toast.textContent = msg;

  toast.style.position = "fixed";
  toast.style.top = "1.2rem";                 // ⬅ TOP POSITION
  toast.style.left = "50%";
  toast.style.transform = "translateX(-50%)";

  toast.style.background = bg;
  toast.style.color = '#fff';
  toast.style.padding = "0.8rem 1.6rem";
  toast.style.borderRadius = "2rem";
  toast.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)";
  toast.style.fontWeight = "500";
  toast.style.fontSize = "13px";
  toast.style.zIndex = "9999";

  toast.style.opacity = "0";
  toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(10px)";
  });

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(0)";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// reload + toast
function refreshDashboard(type) {
  // loadForDate(selectDate.value);
  document.getElementById("dashThisMonth").click();
 type==='Deleted'?showToast(`${type}`):''
 
 
 const buttons = document.querySelectorAll('#in, #out, #all, #bin');

buttons.forEach(btn => {
  btn.classList.remove("active");
});

//document.querySelector('#in').classList.add("active");

}



// Debounce helper function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Debounced refresh function
const debouncedRefresh = debounce((type) => {
  console.log(`Debounced refresh: ${type}`);
  
  // ഇവിടെ മാത്രം UI അപ്ഡേറ്റ് ചെയ്യുക
  if (type === 'Deleted') {
    showToast('Item deleted');
  }
}, 1500); // 1.5 seconds delay


// realtime watchers
if (username && fullname) {

//debouncedRefresh('added')

// Event listeners with debounce



} else {
  console.log("not signed in")
}


// Auto add common items

const outDesc = entryFormOut.querySelector('#desc');
outDesc.oninput = e => {
  const val = outDesc.value.trim().toLowerCase();
  const amount = entryFormOut.querySelector('#amount');

  // Default reset
  amount.value = '';

  if (val === 'kuri') {
    amount.value = 200;
    return;
  }

  if (val === 'tea') {
    // base amount
    amount.value = 50;

    // special rule for "mobifixer chengamanad"
    if (username.toLowerCase() === 'mobifixer chengamanad') {
      amount.value = 100;
    }
  }
  
  if (val === 'bus') {
    amount.value = 20;
  }
};






function getDeviceInfo() {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    time: new Date().toISOString(),
  };
}







// ----------------------


// ----------------------
// Save (Backup New Dates)
// ----------------------
const saveData = async () => {
  const rootRef = db.ref(username);
  const snapshot = await rootRef.get();
  const data = snapshot.val() || {};
if(!data){alert('no data detect')}
 // console.log("Fetched:", data);

  const firebaseDates = Object.keys(data);

  let backup = JSON.parse(localStorage.getItem("cashbook_backup") || "{}");
  const localDates = Object.keys(backup);

  const newDates = firebaseDates.filter(d => !localDates.includes(d));

if (newDates.length < 0) {
  //  console.log("New dates found:", newDates);

    

    
    showTopToast("Data missing", '#ef4444');
  }
  
  if (newDates.length > 0) {
    console.log("New dates found:", newDates);

    newDates.forEach(date => {
      backup[date] = data[date];
    });

    localStorage.setItem("cashbook_backup", JSON.stringify(backup));
    showTopToast("Data Backup done", '#34A853');
  }
  
  
};




// ----------------------
// Full Sync Pipeline
// ----------------------
const syncCashbook = async () => {
  await saveData();
};


// ----------------------
// Run Once Per Day
// ----------------------
function shouldRunToday() {
  const today = isoDate(new Date());
  const lastRun = localStorage.getItem("cashbook_last_sync");

  if (lastRun === today) return false;

  localStorage.setItem("cashbook_last_sync", today);
  return true;
}

if (shouldRunToday()) {
  // syncCashbook();
  showTopToast("Daily sync completed", "#34A853");
}

syncCashbook();




// input animation 

document.querySelectorAll('input').forEach(inp => {
  inp.addEventListener("input", () => {
    inp.classList.remove("pop-anim");
    void inp.offsetWidth;     // reflow trigger
    inp.classList.add("pop-anim");
    
    
      vibrate(15);   // short, crisp, non-annoying
    
  });
});


username || fullname ?
$('.dboard').onchange=()=>$('#dashLoad').onclick()
: null;





       
       
       
       
       
       const MAX_INACTIVE_TIME_MS = 10 * 60 * 1000;

let timeoutID;

/**
 * 
 */
function startInactivityTimer() {
// clear current time 
    clearTimeout(timeoutID);

    // set new time 
    timeoutID = setTimeout(() => {
        console.warn('10 over, reloading');
        
        showTopToast('Session Timeout, Reloading')
        window.location.reload(); 
        
    }, MAX_INACTIVE_TIME_MS);
}

/**
 * user here -> update timer
 */
function resetInactivityTimer() {
    // clear timer, then start new 
    clearTimeout(timeoutID);
    startInactivityTimer();
    // console.log('inactivity reseted.');
}

/**
 * 
 */
function setupInactivityDetection() {
    // reset while ->
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('mousedown', resetInactivityTimer);
    window.addEventListener('keypress', resetInactivityTimer);
    window.addEventListener('scroll', resetInactivityTimer);
    window.addEventListener('touchstart', resetInactivityTimer); // mobile touch

    // page load-> start timer
    startInactivityTimer(); 
    
    console.info('activity trancing, timeout: ' + (MAX_INACTIVE_TIME_MS / 60000) + ' minute.');
}

// start
setupInactivityDetection();


const SESSION_ID =
  sessionStorage.getItem('session_id') ||
  (() => {
    const id = Date.now() + '_' + Math.random().toString(36).slice(2);
    sessionStorage.setItem('session_id', id);
    return id;
  })();


// error handling 

window.onerror = (message, source, lineno, colno, error) => {
  
  const ref = firebase.database()
    .ref(`/logs/errors/users/${username || 'unknkwn'}/${SESSION_ID}`)
    .push();

  ref.set({
    type: 'window_error',
    message: String(message),
    source,
    line: lineno,
    column: colno,
    stack: error?.stack || null,
    user: {
      username,
      fullname
    },
    userAgent: navigator.userAgent,
    createdAt: Date.now()
  });
    
    console.error(`Error: ${message}`);
    showOverlay({title: 'Global Error', desc:`${message}. <br>
    ${error}. <br> 
    line: ${lineno}`, important:false})
    return true;
};



window.addEventListener('unhandledrejection', (event) => {
  
  const ref = firebase.database()
    .ref(`/logs/errors/users/${username || 'unknown'}/${SESSION_ID}`)
    .push();

  ref.set({
    type: 'unhandled_promise',
    reason: String(event.reason),
    stack: event.reason?.stack || null,
    user: {
      username,
      fullname
    },
    userAgent: navigator.userAgent,
    createdAt: Date.now()
  });
  
  
    // 'event' 'event.reason'.
    console.error('Promise rejection (unhandled):', event.reason);
    showOverlay({title: 'Promise rejection', desc:`${event.reason} `, important:false})

 const confirmBtn = document.getElementById('confirmBtn');
const cancelBtn = document.getElementById('cancelBtn');
confirmBtn.style.display='none'

cancelBtn.onclick=()=>{
  hideOverlay()
  confirmBtn.style.display='block'
}
    
    // (preventing default), 'Unhandled Rejection' 
    event.preventDefault(); 
});






const setGoalDataToDb= async (note, amount, currentDate)=>{
  const goalRef = db.ref(`${username}/goals/${currentDate}`);
        await goalRef.set({
            targetAmount: amount,
            note: note || '',
            setAt: new Date().toLocaleString("en-IN"),
            lastUpdatedBy: fullname || 'unknown'
        });
        
                // set to Localstorage
        localStorage.setItem('isUserViewGoalAlert', 'no')

        // 4. Success Feedback
        showTopToast("Daily goal set successfully! 🎯");
        
        // Optional: Update UI to show the new goal immediately
        // updateGoalUI(amount); 
        $('#target').innerHTML = amount
}

$('#setGoal').onclick = async () => {
    try {
        // 1. Get input from user using a custom popup
        const goalData = await askUserForGoal({
            title: 'Set Daily Goal',
            currentDate: currentDate // Display the date in popup if needed
        });

        // If user cancelled
        if (!goalData) return;

        // 2. Validate Amount
        const amount = parseFloat(goalData.amount);
        if (isNaN(amount) || amount <= 0) {
            showTopToast("Please enter a valid amount.");
            return;
        }

        // 3. Define the path: username/goals/YYYY-MM-DD
        // Using set() to overwrite if a goal already exists for today
        setGoalDataToDb(goalData.note, amount, currentDate)
        


    } catch (error) {
        console.error("Error setting goal:", error);
        showTopToast("Failed to set goal. Try again.");
    }
};

// --- HELPER FUNCTION: Popup for Goal ---
function askUserForGoal({ title, currentDate }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';

    overlay.innerHTML = `
      <div class="popup-box">
        <h3 class="popup-title">${title} <span style="font-size:0.8em; color:#666">(${currentDate})</span></h3>
        
        <label class="popup-label">Target Amount</label>
        <input type="number" id="goalAmount" class="popup-input" placeholder="e.g., 5000" autocomplete="off">
        
        <label class="popup-label">Note (Optional)</label>
        <input type="text" id="goalNote" class="popup-input" placeholder="e.g., Limit expenses" autocomplete="off">
        
        <div class="popup-actions">
          <button id="cancelGoalBtn" class="popup-btn popup-btn-cancel">Cancel</button>
          <button id="saveGoalBtn" class="popup-btn popup-btn-confirm" style="background-color: #10b981;">Set Goal</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const amountInput = overlay.querySelector('#goalAmount');
    const noteInput = overlay.querySelector('#goalNote');
    const saveBtn = overlay.querySelector('#saveGoalBtn');
    const cancelBtn = overlay.querySelector('#cancelGoalBtn');

    setTimeout(() => amountInput.focus(), 50);

    const close = (data) => {
      overlay.remove();
      resolve(data);
    };

    saveBtn.onclick = () => {
        const amount = amountInput.value.trim();
        const note = noteInput.value.trim();
        if (!amount) {
            amountInput.style.borderColor = 'red';
            return;
        }
        close({ amount, note });
    };

    cancelBtn.onclick = () => close(null);
    
    // Allow Enter key on Amount input to jump to Note, and Enter on Note to Submit
    amountInput.onkeydown = (e) => {
        if (e.key === 'Enter') noteInput.focus();
        if (e.key === 'Escape') cancelBtn.click();
    };
    noteInput.onkeydown = (e) => {
        if (e.key === 'Enter') saveBtn.click();
        if (e.key === 'Escape') cancelBtn.click();
    };
  });
}








// ====================================================================
// !!! REQUIRED GLOBAL DEPENDENCIES DEFINITION !!!
// These variables and functions MUST be defined globally for setReminder to work.
// We are defining them here based on your existing code structure.
// ====================================================================

// Mock Variables (Replace with actual user/system data in production)


// Mock Toast Function (Replace with your actual UI notification function)

// Simple Mock for jQuery-style element selection. 
// Assumes the button with id 'setReminder' is available.


// Mock function for database reference (dbRef is now fully defined)
const dbRef = {
    ref: (path) => ({
        set: (data) => {
            return new Promise(resolve => {
                console.log(`\n============================================`);
                console.log(`[DBRef MOCK ACTION]: Data SET attempted.`);
                console.log(`[PATH]: ${path}`);
                console.log(`[DATA SAVED]:`, data);
                console.log(`============================================\n`);
                resolve();
            });
        }
    })
};

// ====================================================================
// 1. THE MAIN setReminder EXECUTION FUNCTION
// ====================================================================

/**
 * Function to set a daily reminder, mirroring the structure of the setGoal function,
 * utilizing the global dependencies and helper function.
 */
$('#setReminder').onclick = async () => {
    try {
        // 1. Get input from user using the custom popup
        const reminderData = await askUserForReminder({
            title: 'Set New Reminder',
            // Passing the nicely formatted current date for the popup header
            currentDate: new Date().toLocaleDateString("en-IN") 
        });
// gettime old func here



        // If user cancelled
        if (!reminderData) return;

        // 2. Validate essential inputs (Validation is also done inside the popup, but repeated here for safety)
        const reminderDate = reminderData.reminderDate; // YYYY-MM-DD
        const reminderTime = reminderData.reminderTime || getTime() ; // HH:MM
        const reminderTitle = reminderData.title;

        if (!reminderDate || !reminderTitle) {
            // This case should ideally not be hit if popup validation is strong
            showTopToast("Missing required reminder details (Date, Time, or Title).");
            return;
        }

        // Combine date and time for full timestamp
        const fullReminderTime = `${reminderDate} ${reminderTime}`;


        // 3. Define the path and save to database (USING dbRef)
        // Path structure: username/reminders/YYYY-MM-DD (Reminder Date)/uniqueId
        const uniqueReminderKey = Date.now(); 
        // THIS LINE NOW USES THE DEFINED username and dbRef
        const reminderRefPath = db.ref(`${username}/reminders/${reminderDate}/${uniqueReminderKey}`);
        
        // Data structure to save
        await reminderRefPath.set({
            reminderTitle: reminderTitle,
            reminderDate: reminderDate, 
            reminderTime: reminderTime, 
            fullTimestamp: fullReminderTime,
            note: reminderData.note || '', 
            setAt: new Date().toLocaleString("en-IN"),
            lastUpdatedBy: fullname || 'unknown' // Uses defined fullname
        });
        
        // set to Localstorage 
        localStorage.setItem('hasNewReminderToday', 'yes');

        // 4. Success Feedback
        showTopToast(`Reminder "${reminderTitle}" set successfully for ${reminderDate} at ${reminderTime}! 🔔`);
        
    } catch (error) {
        // Error handling
        console.error("Error setting reminder:", error);
        // The console.error will show if variables like dbRef, username etc., were undefined.
        showTopToast("Failed to set reminder. Try again.");
    }
};

// ====================================================================
// 2. THE HELPER FUNCTION
// ====================================================================

/**
 * Displays a custom popup to ask the user for reminder details (What, Date, and Time).
 * @param {object} options - Configuration options.
 * @param {string} options.title - The title for the popup header.
 * @param {string} options.currentDate - The date to display in the header.
 * @returns {Promise<{title: string, reminderDate: string, reminderTime: string, note: string} | null>} - A promise that resolves with the reminder data or null if cancelled.
 */
function askUserForReminder({ title, currentDate }) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay'; 

    overlay.innerHTML = `
      <div class="popup-box">
        <h3 class="popup-title">${title} <span style="font-size:0.8em; color:#666">(${currentDate})</span></h3>
        
        <label class="popup-label">Reminder Title / What to do?</label>
        <input type="text" id="reminderTitle" class="popup-input" placeholder="e.g., Call the customer" autocomplete="off">
        
        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <div style="flex: 1;">
                <label class="popup-label">Reminder Date</label>
                <input type="date" id="reminderDate" class="popup-input" style="width: 100%;">
            </div>
            <div style="flex: 1;">
                <label class="popup-label">Reminder Time</label>
                <input type="time" id="reminderTime" class="popup-input" style="width: 100%;">
            </div>
        </div>
        
        <label class="popup-label">Note (Optional Details)</label>
        <input type="text" id="reminderNote" class="popup-input" placeholder="e.g., Pending money" autocomplete="off">

        <div class="popup-actions">
          <button id="cancelReminderBtn" class="popup-btn popup-btn-cancel">Cancel</button>
          <button id="saveReminderBtn" class="popup-btn popup-btn-confirm" style="background-color: #f7931e;">Set Reminder</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Get input and button references
    const titleInput = overlay.querySelector('#reminderTitle');
    const dateInput = overlay.querySelector('#reminderDate');
    const timeInput = overlay.querySelector('#reminderTime');
    const noteInput = overlay.querySelector('#reminderNote');
    const saveBtn = overlay.querySelector('#saveReminderBtn');
    const cancelBtn = overlay.querySelector('#cancelReminderBtn');

    // Set default date to today for better UX
    dateInput.value = new Date().toISOString().slice(0, 10);
    
    // Focus on the first required input
    setTimeout(() => titleInput.focus(), 50);

    const close = (data) => {
      overlay.remove();
      resolve(data);
    };

    saveBtn.onclick = () => {
        const title = titleInput.value.trim();
        const reminderDate = dateInput.value.trim(); 
        const reminderTime = timeInput.value.trim(); 
        const note = noteInput.value.trim();
        
        // Basic validation: Title, Date, and Time are mandatory
        if (!title) {
            titleInput.style.borderColor = 'red';
            return;
        }
        if (!reminderDate) {
            dateInput.style.borderColor = 'red';
            return;
        }
        if (!reminderTime) {
            timeInput.style.borderColor = 'red';
           // return;
        }

        // Return the collected data
        close({ title, reminderDate, reminderTime, note });
    };

    cancelBtn.onclick = () => close(null);
    
    // Keyboard navigation logic
    titleInput.onkeydown = (e) => {
        if (e.key === 'Enter') dateInput.focus(); 
        if (e.key === 'Escape') cancelBtn.click();
    };
    dateInput.onkeydown = (e) => {
        if (e.key === 'Enter') timeInput.focus();
        if (e.key === 'Escape') cancelBtn.click();
    };
    timeInput.onkeydown = (e) => {
        if (e.key === 'Enter') noteInput.focus(); 
        if (e.key === 'Escape') cancelBtn.click();
    };
    noteInput.onkeydown = (e) => {
        if (e.key === 'Enter') saveBtn.click();
        if (e.key === 'Escape') cancelBtn.click();
    };
  });
}




// for fast transaction/reload
let wasHidden = false;

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    wasHidden = true;
    
  }

  if (document.visibilityState === "visible" && wasHidden) {
    reloadBtn.click();
    wasHidden = false;
    
  }
});






function isReminderSeen(id){
  return localStorage.getItem('rem_seen_' + id) === 'yes';
}

function markReminderSeen(id){
  localStorage.setItem('rem_seen_' + id, 'yes');
}



function renderReminders(data){

  const keys = Object.keys(data);
  if(keys.length === 0) return;

  const arr = keys.map(k => ({ id: k, ...data[k] }));

  // earliest first
  arr.sort((a,b)=> a.reminderTime.localeCompare(b.reminderTime));

  // 🔍 find FIRST unseen reminder
  const r = arr.find(rem => !isReminderSeen(rem.id));

  // all reminders already seen → do nothing
  if(!r) return;

  showOverlay({
    title: r.reminderTitle,
    desc: `🕒 ${r.reminderTime}${r.note ? ' • ' + r.note : ''}`
  });

  // ✅ mark as seen immediately
  markReminderSeen(r.id);
}


const todayISO = new Date().toISOString().slice(0,10);
loadRemindersForDate(todayISO);



const EVENTS = [
  {
    name: 'Birthday',
    day: 27,
    month: 2,
    emojis: ['🎉', '🎂', '🎊'],
    burst: 3,
    maxCount: 60
  },
  {
    name: 'NewYear',
    day: 1,
    month: 1,
    emojis: ['🎆', '🎉', '✨'],
    burst: 4,
    maxCount: 80
  },
  {
    name: 'IndependenceDay',
    day: 15,
    month: 8,
    emojis: ['🇮🇳', '🎆', '🎉'],
    burst: 5,
    maxCount: 100
  },
  {
  name: 'ValentinesDay',
  day: 14,
  month: 2,
  emojis: ['❤️', '🌹', '✨'],
  burst: 2,
  maxCount: 40
},
{
  name: "eidAlFitr",
  day: 28,
  month: 5,
  emojis: ["🌙", "🕌", "✨"], 
  burst: 2,
  maxCount: 40
}
];


const todayIs = ({ day, month }) => {
  const today = new Date();
  return (
    today.getDate() === day &&
    today.getMonth() === month-1
  );
};







const startEmojiRain = ({
  overlayId = 'birthday-overlay',
  items,
  interval = 400,
  burst = 1,
  maxCount = 40,
  minDuration = 2,
  maxDuration = 4,
  cleanupAfter = 4000
}) => {
  const overlay = document.getElementById(overlayId);
  if(!appSettings.specialDayEffects) return;
  if (!overlay) throw new Error('Missing element');
  

  setInterval(() => {
    if (overlay.children.length >= maxCount) return;

    for (let i = 0; i < burst; i++) {
      if (overlay.children.length >= maxCount) break;

      const el = document.createElement('div');
      el.className = 'birthday-item'; // 👈 unchanged
      el.textContent =
        items[Math.floor(Math.random() * items.length)];

      el.style.left = Math.random() * 100 + 'vw';
      el.style.animationDuration =
        minDuration + Math.random() * (maxDuration - minDuration) + 's';

      overlay.appendChild(el);
      setTimeout(() => el.remove(), cleanupAfter);
    }
  }, interval);
};





EVENTS.forEach(event => {
  if (todayIs(event)) {
    startEmojiRain({
      items: event.emojis,
      burst: event.burst,
      maxCount: event.maxCount
    });
  }
});




const syncExitStates = (pages, current) => {
  pages.forEach(page => {
    if (page !== current) {
      page.classList.remove('active');
      page.classList.add('exit');
    } else {
      page.classList.remove('exit');
    }
  });
};


// page switching 

const PageRouter = (() => {
  const pages = document.querySelectorAll('.page');
  let current = document.querySelector('.page.active');

  function show(hash, from = 'direct') {
    const id = hash.replace('#', '') || 'home';
    const next = document.getElementById(id);

    if (!next || next === current) return;

    // exit current
    current.classList.remove('active');
    current.classList.add('exit');

    // enter next
    next.classList.remove('exit');
    next.classList.add('active');

    current = next;
  }
syncExitStates(pages, current)
  // click handler
  document.addEventListener('click', e => {
    const link = e.target.closest('[data-link]');
    if (!link) return;

    e.preventDefault();
    location.hash = link.dataset.link;
  });

  // hash change (back / forward)
  window.addEventListener('hashchange', () => {
    show(location.hash, 'back');
  });

  // first load
  show(location.hash);

  return { show };
})();

//PageRouter.show('#about');
//PageRouter.show('#settings');



const isUserSeeCustomAlert=''


    // Export CSV for current date
    exportCSV.addEventListener('click', async ()=>{
      const rootRef = db.ref(dayRoot(currentDate));
      const snap = await rootRef.get(); const data = snap.val()||{};
      const rows = [];
      ['in','out'].forEach(type=>{
        const group = data[type]||{};
        Object.keys(group).forEach(k=>rows.push({type, key:k, ...group[k]}));
      });
      if(rows.length===0) return showTopToast('No data : 404');
      let csv = 'type,serial,name,amount,gpay,ts,user\n';
      rows.forEach(r=>{ csv+=`${r.type},${r.serial},"${(r.name||'').replace(/"/g,'""')}",${r.amount},${r.gpay?1:0},${new Date(r.ts).toLocaleString()},${r.userEmail||''}\n`; });
      const blob = new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=`cashbook-${currentDate}.csv`; a.click(); URL.revokeObjectURL(url);
    });
// ── Bottom Nav: sync active state with page navigation ──
(function() {
  function syncBottomNav(pageId) {
    document.querySelectorAll('.bnav-item[data-link]').forEach(b => {
      b.classList.toggle('active', b.dataset.link === pageId);
    });
  }

  // Watch hash changes (history.back() from settings/profile pages)
  window.addEventListener('popstate', () => {
    const hash = location.hash.replace('#','') || 'home';
    syncBottomNav(hash);
  });

  // Wire bottom nav buttons to the existing data-link navigation
  document.querySelectorAll('.bnav-item[data-link]').forEach(btn => {
    btn.addEventListener('click', () => {
      const link = btn.dataset.link;
      // Re-use existing data-link button if present (JS already handles it)
      const existing = document.querySelector(
        `[data-link="${link}"]:not(.bnav-item):not([style*="display:none"])`
      );
      if (existing) {
        existing.click();
      } else {
        // Fallback: manually transition pages
        document.querySelectorAll('.page').forEach(p => {
          if (p.classList.contains('active')) p.classList.replace('active','exit');
          setTimeout(() => p.classList.remove('exit'), 250);
        });
        const page = document.getElementById(link);
        if (page) {
          setTimeout(() => page.classList.add('active'), 10);
          if (link !== 'home') history.pushState({page:link},'',`#${link}`);
        }
      }
      syncBottomNav(link);
    });
  });
})();

// ═══════════════════════════════════════════════════════════════
// SKELETON LOADER HELPERS
// ═══════════════════════════════════════════════════════════════

// Call this when data arrives — swaps skeleton → real entries
function hideSkeleton() {
  // Hide summary skeleton, show real totals
  const skelTotals  = document.getElementById('skelTotals');
  const realTotals  = document.getElementById('realTotals');
  if (skelTotals) skelTotals.classList.add('hidden');
  if (realTotals) realTotals.style.display = '';
}

// Show entry skeletons (while loadForDate is fetching)
function showEntrySkeleton(count = 5) {
  const list = document.getElementById('entriesList');
  if (!list) return;
  // Only show if list is empty or already showing skeletons
  if (list.querySelector('.entry')) return; // real data already visible
  const skels = Array.from({length: count}, (_, i) => {
    const ws  = [70,55,80,60,75];
    const ws2 = [45,35,50,40,45];
    const wa  = [50,45,55,40,40];
    return `<div class="skel-entry">
      <div class="skel-left-bar"></div>
      <div class="skel-meta">
        <div class="skel-line w${ws[i]}"></div>
        <div class="skel-line w${ws2[i]} thin"></div>
      </div>
      <div class="skel-amount">
        <div class="skel-line w${wa[i]}"></div>
        <div class="skel-line w30 thin"></div>
      </div>
    </div>`;
  }).join('');
  list.innerHTML = skels;
}

// Patch: show skeleton at start of every loadForDate
const _origLoadForDate = window.loadForDate;
// Show summary skeleton when switching dates
document.addEventListener('DOMContentLoaded', () => {
  // Reveal real totals once renderEntries has fired
  const _origRenderEntries = window.renderEntries;

  // Intercept date changes to show skeleton
  const selectDate = document.getElementById('selectDate');
  if (selectDate) {
    selectDate.addEventListener('change', () => {
      showEntrySkeleton();
      // Show summary skeleton again
      const sk = document.getElementById('skelTotals');
      const rt = document.getElementById('realTotals');
      if (sk) sk.classList.remove('hidden');
      if (rt) rt.style.display = 'none';
    });
  }
});

// Skeleton reveal handled directly in renderEntries — no observer needed


// ═══════════════════════════════════════════════════════════════
// PROFILE PAGE — load data, inline edit, save to Firebase
// No onclick in HTML — all wired here via event delegation
// Uses firebase.auth() / firebase.database() directly (compat SDK)
// ═══════════════════════════════════════════════════════════════

// ── Helpers ──
function _setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ── Load profile data from Firebase ──
async function loadSettingsProfile() {
  try {
    const _auth = firebase.auth();
    const _db   = firebase.database();
    const _user = _auth.currentUser;

    const snap = await _db.ref(`/users/${username}`).get();
    if (!snap.exists()) return;
    const data = snap.val();

    // Avatar initials
    const name     = fullname || username || '?';
    const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    _setText('settingsAvatar',     initials);
    _setText('settingsAvatarName', name);
    _setText('settingsAvatarSub',  `@${username}`);
    // Keep legacy IDs in sync
    _setText('fullname_profile', name);
    _setText('userEmail', _user?.email || '');

    // Role badge
    const isOwner = (data.fullname || '').toLowerCase() === (name).toLowerCase()
                    || data.role === 'owner';
    const roleBadge = document.getElementById('settingsRoleBadge');
    if (roleBadge) {
      roleBadge.textContent = isOwner ? 'Owner' : 'Staff';
      roleBadge.className   = `role-badge ${isOwner ? 'role-owner' : 'role-staff'}`;
    }

    // Field values
    _setText('disp-fullname',  name);
    _setText('disp-username',  username || '—');
    _setText('disp-email',     _user?.email || data.signupInfo?.email || '—');
    _setText('disp-shopName',  data.shopName || username || '—');
    _setText('disp-phone',     data.phone || 'Not set');

    // Input defaults
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
    setVal('input-fullname',  name);
    setVal('input-shopName',  data.shopName || '');
    setVal('input-phone',     data.phone || '');

    // Member Since
    if (data.signupInfo?.date) {
      _setText('disp-joined', data.signupInfo.date);
    } else {
      const keys = Object.keys(data.logins || {});
      if (keys.length) {
        const earliest = Math.min(...keys.map(k => parseInt(k)));
        _setText('disp-joined', new Date(earliest).toLocaleDateString('en-IN', {
          day: 'numeric', month: 'long', year: 'numeric'
        }));
      } else {
        _setText('disp-joined', '—');
      }
    }
  } catch (e) {
    console.error('loadSettingsProfile error:', e.message || e);
  }
}

// ── Inline edit flow ──
function startEdit(field) {
  document.getElementById(`disp-${field}`)?.classList.add('hidden');
  document.getElementById(`edit-${field}`)?.classList.remove('hidden');
  document.getElementById(`editbtn-${field}`)?.classList.add('hidden');
  document.getElementById(`input-${field}`)?.focus();
}

function cancelField(field) {
  document.getElementById(`edit-${field}`)?.classList.add('hidden');
  document.getElementById(`disp-${field}`)?.classList.remove('hidden');
  document.getElementById(`editbtn-${field}`)?.classList.remove('hidden');
}

async function saveField(field) {
  const inputEl = document.getElementById(`input-${field}`);
  const dispEl  = document.getElementById(`disp-${field}`);
  if (!inputEl || !dispEl) return;

  const value = inputEl.value.trim();
  if (!value) { showToast('Field cannot be empty', '#FFC107'); return; }

  const saveBtn = inputEl.parentElement?.querySelector('.field-save-btn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '…'; }

  try {
    const _db = firebase.database();
    const updates = {};

    if (field === 'fullname') {
      updates.fullname = value;
      updates['signupInfo/fullname'] = value;
      await _db.ref(`/users/${username}`).update(updates);
      localStorage.setItem('CASHBOOK_FULLNAME', value);
      _setText('settingsAvatarName', value);
      const av = document.getElementById('settingsAvatar');
      if (av) av.textContent = value.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    } else if (field === 'shopName') {
      await _db.ref(`/users/${username}`).update({ shopName: value });

    } else if (field === 'phone') {
      await _db.ref(`/users/${username}`).update({ phone: value });
    }

    dispEl.textContent = value;
    cancelField(field);
    showTopToast('Saved ✓', '#10b981');

  } catch (e) {
    showTopToast('Save failed: ' + (e.message || 'Try again'), '#ef4444');
  } finally {
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save'; }
  }
}

// ── Event delegation — all profile page clicks handled here ──
document.getElementById('profile')?.addEventListener('click', e => {
  const target = e.target;

  // Edit pencil button
  const editBtn = target.closest('[id^="editbtn-"]');
  if (editBtn) { startEdit(editBtn.id.replace('editbtn-', '')); return; }

  // Save button
  if (target.classList.contains('field-save-btn')) {
    const row = target.closest('[id^="edit-"]');
    if (row) saveField(row.id.replace('edit-', ''));
    return;
  }

  // Cancel button
  if (target.classList.contains('field-cancel-btn')) {
    const row = target.closest('[id^="edit-"]');
    if (row) cancelField(row.id.replace('edit-', ''));
    return;
  }

  // Change Password row
  if (target.closest('#changePasswordRow')) {
    const email = firebase.auth().currentUser?.email;
    if (!email) { showTopToast('No email on record', '#FFC107'); return; }
    firebase.auth().sendPasswordResetEmail(email)
      .then(() => showTopToast('Reset email sent — check Spam too ✓', '#10b981'))
      .catch(err => showTopToast('Failed: ' + err.message, '#ef4444'));
    return;
  }

  // Sign Out row
  if (target.closest('#signOutRow')) {
    showOverlay({
      title: '🚪 Sign Out?',
      desc:  'You will be signed out of this device.',
      btnColor: '#ef4444',
    });
    // Override the overlay confirm button to call signOut
    const btn = document.getElementById('alertBtn');
    if (btn) {
      btn.onclick = () => {
        firebase.auth().signOut()
          .then(() => location.reload())
          .catch(err => showTopToast(err.message, '#ef4444'));
      };
    }
    return;
  }
});

// ── Enter key saves active field ──
document.getElementById('profile')?.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const active = document.activeElement;
  if (!active?.classList.contains('field-input')) return;
  const row = active.closest('[id^="edit-"]');
  if (row) saveField(row.id.replace('edit-', ''));
});

// ── MutationObserver — trigger load when profile page becomes active ──
(function () {
  const page = document.getElementById('profile');
  if (!page) return;
  new MutationObserver(() => {
    if (page.classList.contains('active')) loadSettingsProfile();
  }).observe(page, { attributes: true, attributeFilter: ['class'] });
})();


/* ============================================================
   ✨ ASK-YOUR-CASHBOOK — AI chat (Gemini free tier, dual-mode)
   ============================================================ */
const AI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
let _aiWorkingModel = null;         // first model that succeeded this session
const AI_CHAT_KEY = 'CASHBOOK_AI_CHAT';
const aiSleep = (ms) => new Promise(r => setTimeout(r, ms));
let aiMessages = [];               // [{role:'user'|'model', text}]
let _aiLedgerText = null;          // cached context block
let _aiLedgerAt = 0;               // cache timestamp

const aiKey = () => localStorage.getItem('CASHBOOK_GEMINI_KEY') || '';
const aiEnabled = () => !!(appSettings && appSettings.enableAI) && !!aiKey();

// Show/hide the bottom-nav "Ask AI" entry based on settings + key
function updateAiNavVisibility() {
  const item = document.getElementById('bnav-chat');
  if (!item) return;
  item.classList.toggle('hidden', !aiEnabled());
  // if the AI page is open but got disabled, bounce home
  if (!aiEnabled() && location.hash === '#chat') location.hash = 'home';
}

// ---- Ledger → context text (cached per session) ----
async function aiFetchLedger() {
  const user = localStorage.getItem('CASHBOOK_USER_NAME');
  if (!user) throw new Error('NO_USER');
  const snap = await firebase.database().ref(user).get();
  const raw = snap.val() || {};
  const entries = [];
  Object.keys(raw).forEach(dateKey => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return; // skip goals/reminders/recycleBin
    const day = raw[dateKey] || {};
    ['in', 'out'].forEach(type => {
      const group = day[type] || {};
      Object.values(group).forEach(r => {
        if (!r || typeof r !== 'object') return;
        entries.push({
          date: dateKey,
          type,
          name: r.name || '',
          cash: Number(r.amount) || 0,
          gpay: Number(r.gpay) || 0,
          staff: r.staffName || r.writer || '',
          ts: Number(r.ts) || 0
        });
      });
    });
  });
  entries.sort((a, b) => a.ts - b.ts);
  return entries;
}

function aiBuildContext(entries) {
  const byMonth = {};
  let tIn = 0, tOut = 0, tGpay = 0;
  entries.forEach(e => {
    const m = e.date.slice(0, 7);
    (byMonth[m] = byMonth[m] || { in: 0, out: 0, gpay: 0 });
    if (e.type === 'in') { byMonth[m].in += e.cash + e.gpay; tIn += e.cash + e.gpay; }
    else { byMonth[m].out += e.cash; tOut += e.cash; }
    if (e.gpay) { byMonth[m].gpay += e.gpay; tGpay += e.gpay; }
  });
  const net = tIn - tOut - tGpay;
  const monthLines = Object.keys(byMonth).sort().map(m => {
    const g = byMonth[m];
    return `${m}: IN ₹${g.in}  OUT ₹${g.out}  GPay ₹${g.gpay}  Net ₹${g.in - g.out - g.gpay}`;
  }).join('\n');

  const CAP = 1000;
  const recent = entries.slice(-CAP);
  const truncated = entries.length > CAP;
  const rows = recent.map(e => {
    const t = e.ts ? new Date(e.ts) : null;
    const hm = t ? t.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
    return `${e.date} ${hm} | ${e.type.toUpperCase()} | ${e.name} | cash ₹${e.cash} | gpay ₹${e.gpay}${e.staff ? ' | ' + e.staff : ''}`;
  }).join('\n');

  return `TODAY: ${isoDate(new Date())}
OVERALL TOTALS: IN ₹${tIn}  OUT ₹${tOut}  GPay ₹${tGpay}  Net(cash-in-hand) ₹${net}

MONTHLY TOTALS:
${monthLines || '(none)'}

${truncated ? `ENTRIES (most recent ${CAP} of ${entries.length}; older ones roll up into the monthly totals above):` : `ALL ENTRIES (${entries.length}):`}
${rows || '(no entries yet)'}`;
}

async function aiGetLedgerText(force) {
  const fresh = _aiLedgerText && (Date.now() - _aiLedgerAt < 180000);
  if (fresh && !force) return _aiLedgerText;
  const entries = await aiFetchLedger();
  _aiLedgerText = aiBuildContext(entries);
  _aiLedgerAt = Date.now();
  return _aiLedgerText;
}

const AI_SYSTEM = `You are "Cashbook Buddy", a friendly AI assistant inside a mobile-repair shop's cashbook app in India.

You have TWO modes and you pick automatically per message:
1) FINANCE MODE — when the user asks about money/cash/GPay/profit/expenses/entries: answer using ONLY the CASHBOOK DATA provided below. Currency is Indian Rupees ₹ (format like ₹1,250). Definitions you MUST use so your numbers match the app exactly:
   - Total IN = sum over IN entries of (cash + gpay)   [IN includes GPay]
   - Total OUT = sum over OUT entries of cash
   - Total GPay = sum of gpay across all entries
   - Net / cash-in-hand = Total IN − Total OUT − Total GPay  (physical cash)
   Be concise, show the ₹ figures, never invent numbers, and if the data doesn't cover it, say so plainly. You may add a light emoji like 📈💰.
2) FUN MODE — when the user is just greeting, chatting, joking or venting: be a warm, playful shop buddy 😄. Use emojis, light banter and encouragement (e.g. "big sales today, keep it up! 🚀"). Keep it friendly and appropriate for a shopkeeper — never rude, offensive, or personal-attacking.

Keep replies short and mobile-friendly. Today's date and the ledger follow.`;

async function aiAsk() {
  const key = aiKey();
  if (!key) { showTopToast('Add your Gemini API key in Settings', '#ef4444'); location.hash = 'settings'; return null; }
  let ledger = '';
  try { ledger = await aiGetLedgerText(false); } catch (e) { ledger = '(ledger unavailable)'; }
  const contents = aiMessages.slice(-10).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
  const body = {
    system_instruction: { parts: [{ text: AI_SYSTEM + '\n\n=== CASHBOOK DATA ===\n' + ledger }] },
    contents,
    generationConfig: { temperature: 0.5 }
  };
  return aiGenerate(key, body);
}

// Low-level call with real-error surfacing, 429 backoff, and model fallback.
async function aiGenerate(key, body) {
  const models = _aiWorkingModel ? [_aiWorkingModel, ...AI_MODELS.filter(m => m !== _aiWorkingModel)] : AI_MODELS.slice();
  let lastErr = null;

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const backoffs = [0, 1500, 4000]; // initial try + 2 retries for transient 429s

    for (let attempt = 0; attempt < backoffs.length; attempt++) {
      if (backoffs[attempt]) await aiSleep(backoffs[attempt]);
      let res;
      try {
        res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      } catch (netErr) {
        lastErr = new AiError(navigator.onLine ? 'NETWORK' : 'OFFLINE', netErr.message);
        break; // network failure → try next model won't help much, but break retry loop
      }

      if (res.ok) {
        const data = await res.json();
        const text = ((data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [])
          .map(p => p.text || '').join('').trim();
        if (!text) { lastErr = new AiError('EMPTY', 'Model returned an empty response.'); break; }
        _aiWorkingModel = model;
        return text;
      }

      // Non-OK: read Google's real error
      let status = 'HTTP_' + res.status, message = '';
      try { const j = await res.json(); if (j && j.error) { status = j.error.status || status; message = j.error.message || ''; } }
      catch (_) {}
      console.error(`Gemini error [${model}] ${res.status} ${status}: ${message}`);
      lastErr = new AiError(status, message, res.status);

      if (res.status === 429) continue;                 // transient → retry with backoff
      if (res.status === 404 || status === 'NOT_FOUND') break; // model unavailable → next model
      break; // other errors (permission/invalid) → don't retry this model
    }
    // move to next model on 429-exhausted or NOT_FOUND
  }
  throw lastErr || new AiError('UNKNOWN', 'Unknown error');
}

// Typed error carrying Google's real status + message
class AiError extends Error {
  constructor(status, message, httpCode) {
    super(message || status);
    this.aiStatus = status;
    this.aiMessage = message || '';
    this.httpCode = httpCode;
  }
}

// Map a status to friendly guidance (shown with the raw message)
function aiGuidance(status) {
  switch (status) {
    case 'RESOURCE_EXHAUSTED':
      return "Free-tier quota/limit hit for this key. Wait a minute and retry — or your key's project/region may have no free Gemini quota. Try a key from a fresh Google account at aistudio.google.com.";
    case 'PERMISSION_DENIED':
      return "Key rejected. Enable the ‘Generative Language API’ for the key's project, and if the key has an HTTP-referrer restriction, make sure it allows this site.";
    case 'INVALID_ARGUMENT':
      return "The key looks malformed — re-copy it from aistudio.google.com.";
    case 'OFFLINE':
      return "You appear to be offline. 📴";
    case 'NETWORK':
      return "Couldn't reach Gemini. Check your connection and retry.";
    default:
      return '';
  }
}

// Settings diagnostic: ping the API and report the real outcome
async function aiTestKey() {
  const key = aiKey();
  if (!key) { showTopToast('Enter your Gemini API key first', '#ef4444'); return; }
  showTopToast('Testing key…', '#0BA2FF');
  try {
    const reply = await aiGenerate(key, { contents: [{ role: 'user', parts: [{ text: 'Reply with just: ok' }] }] });
    showTopToast(`✅ Working${_aiWorkingModel ? ' (' + _aiWorkingModel + ')' : ''}`, '#34A853');
    updateAiNavVisibility();
  } catch (err) {
    const status = err.aiStatus || err.message || 'UNKNOWN';
    const guide = aiGuidance(status);
    if (typeof showOverlay === 'function') {
      showOverlay({
        title: '❌ Key test failed',
        desc: `<b>${status}</b><br>${(err.aiMessage || '').replace(/</g, '&lt;')}${guide ? '<br><br>' + guide : ''}`,
        icon: '🔑', btnColor: '#ef4444', important: true
      });
    } else {
      showTopToast(`❌ ${status}`, '#ef4444');
    }
    console.error('Gemini key test failed:', status, err.aiMessage);
  }
}

// ---- Chat UI ----
function aiEscape(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function aiFormat(t) {
  return aiEscape(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}
function aiRenderMessages() {
  const box = document.getElementById('aiMessages');
  if (!box) return;
  if (!aiMessages.length) {
    box.innerHTML = `<div class="ai-empty">👋 Hi! I'm your Cashbook Buddy.<br>Ask me about your cash, GPay or profit — or just say hi 😄</div>`;
  } else {
    box.innerHTML = aiMessages.map(m =>
      `<div class="ai-msg ai-${m.role}"><div class="ai-bubble">${aiFormat(m.text)}</div></div>`
    ).join('');
  }
  box.scrollTop = box.scrollHeight;
}
function aiSaveChat() {
  try { localStorage.setItem(AI_CHAT_KEY, JSON.stringify(aiMessages.slice(-40))); } catch (e) {}
}
function aiLoadChat() {
  try { aiMessages = JSON.parse(localStorage.getItem(AI_CHAT_KEY)) || []; } catch (e) { aiMessages = []; }
}
function aiShowTyping() {
  const box = document.getElementById('aiMessages');
  if (!box) return null;
  const el = document.createElement('div');
  el.className = 'ai-msg ai-model ai-typing';
  el.innerHTML = `<div class="ai-bubble"><span class="ai-dot"></span><span class="ai-dot"></span><span class="ai-dot"></span></div>`;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  return el;
}

async function aiSendMessage(text) {
  text = (text || '').trim();
  if (!text) return;
  const suggestions = document.getElementById('aiSuggestions');
  if (suggestions) suggestions.style.display = 'none';

  aiMessages.push({ role: 'user', text });
  aiRenderMessages();
  aiSaveChat();

  const typing = aiShowTyping();
  const sendBtn = document.getElementById('aiSend');
  if (sendBtn) sendBtn.disabled = true;
  try {
    const reply = await aiAsk();
    if (typing) typing.remove();
    if (reply == null) return;               // no key (already handled)
    aiMessages.push({ role: 'model', text: reply });
    aiRenderMessages();
    aiSaveChat();
  } catch (err) {
    if (typing) typing.remove();
    const status = err.aiStatus || err.message || 'UNKNOWN';
    const guide = aiGuidance(status);
    const raw = err.aiMessage ? `\n\n_${status}: ${err.aiMessage}_` : (guide ? '' : `\n\n_${status}_`);
    // Show the real reason as a chat bubble so it's readable and copyable
    aiMessages.push({ role: 'model', text: `⚠️ ${guide || 'Something went wrong — please try again.'}${raw}` });
    aiRenderMessages();
    aiSaveChat();
    showTopToast(guide ? status.replace(/_/g, ' ').toLowerCase() : 'AI error — see chat', '#ef4444');
  } finally {
    if (sendBtn) sendBtn.disabled = false;
  }
}

// ---- Wire up chat UI ----
(function initAiChat() {
  aiLoadChat();
  updateAiNavVisibility();

  const form = document.getElementById('aiForm');
  const input = document.getElementById('aiInput');
  if (form && input) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = input.value;
      input.value = '';
      aiSendMessage(v);
    });
  }

  document.querySelectorAll('#aiSuggestions .ai-chip').forEach(chip => {
    chip.addEventListener('click', () => aiSendMessage(chip.textContent));
  });

  const testBtn = document.getElementById('aiTestKeyBtn');
  if (testBtn) testBtn.addEventListener('click', aiTestKey);

  const clearBtn = document.getElementById('aiClearChat');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    aiMessages = [];
    aiSaveChat();
    const s = document.getElementById('aiSuggestions');
    if (s) s.style.display = '';
    aiRenderMessages();
  });

  // Refresh ledger cache + render whenever the chat page opens
  const page = document.getElementById('chat');
  if (page) {
    new MutationObserver(() => {
      if (page.classList.contains('active')) {
        _aiLedgerAt = 0;           // force fresh ledger on next question
        aiRenderMessages();
      }
    }).observe(page, { attributes: true, attributeFilter: ['class'] });
  }

  aiRenderMessages();
})();
