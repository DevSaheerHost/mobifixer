const $ = s => document.querySelector(s)
const username = localStorage.getItem('CASHBOOK_USER_NAME');
const fullname = localStorage.getItem('CASHBOOK_FULLNAME');

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
const handleStaffAccessControl = (user) =>{
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
    staff_container.innerHTML=`<p class="muted" style="display: flex; align-items: center; justify-content: center; padding: 0.5rem;">This section is available only to the shop owner.
If you need changes, please contact the owner.</p>`;
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
  return {
    email: emailInput.value.trim(),
    password: passInput.value.trim() || Math.random().toString(36).slice(-8),
    username: document.getElementById("username").value.trim().toLowerCase(),
    fullname : document.querySelector('#fullname').value.trim(),
    selectedRole : document.querySelector('input[name="role"]:checked')?.value || null
  }
}
  const validateAuthInput = ({ email, username, fullname }) => {
  if (!email || !username || !fullname) {
    showToast('Fill all fields', '#FFC107');
    return false;
  }
  return true;
}
  const getUser = async(username)=>{
  const userRef = db.ref(`/users/${username}`);
  const snap = await userRef.get();
  return snap.exists() ? snap.val() : null;
}
  const verifyPassword=(dbUser, password)=> {
  if (dbUser.password !== password) {
    showTopToast("Wrong password", '#F44336');
    navigator.vibrate?.([15, 80, 15]);
    return false;
  }
  return true;
}
  const detectRole=(dbUser, fullname) =>{
  return dbUser.fullname.toLowerCase().includes(fullname.toLowerCase())
    ? 'owner'
    : 'staff';
}
  const loginUser= async({ email, password, username, fullname })=> {
  const dbUser = await getUser(username);
  if (!dbUser) {
    showTopToast("User not found : 404", '#F44336');
    return;
  }

  if (!verifyPassword(dbUser, password)) return;

  const role = detectRole(dbUser, fullname);

  await auth.signInWithEmailAndPassword(email, password);

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
  showTopToast("SignIn successful : 200");
  location.reload();
}
  const signupUser = async ({ email, password, username, fullname }) => {
  const exists = await getUser(username);
  if (exists) {
    showTopToast("Username already exists : 409", '#F44336');
    return;
  }
  
  await auth.createUserWithEmailAndPassword(email, password);
  
  await db.ref(`/users/${username}`).set({
    username,
    password,
    fullname,
    role: 'owner',
    signupInfo: getDeviceInfo(),
    logins: {}
  });
  
  persistSession(username, fullname, 'owner');
  showTopToast("Signup successful : 201");
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
                    if (navigator.vibrate) {
                      navigator.vibrate([15, 80, 15]); // short, crisp, non-annoying
                    }
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
    <div style='border-bottom: 1px solid #EFEFEF; padding: 0.5rem; padding-top: 0;'>
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
     // set default date to today
     const today = new Date();
     selectDate.value = isoDate(today);
     loadForDate(selectDate.value);
     
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
    
  } catch (err) {
    console.error(err);
    showTopToast('Something went wrong. Retry.');
  }
};

loadUserFromDB()
    // get user data from DB

  
  
  
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
  
  
  
  
  
    // Authentication: simple email sign in (create if not exists)
signInBtn.addEventListener('click', async () => {
  const input = getAuthInput();
  if (!validateAuthInput(input)) return;

  $('.loader')?.classList.remove('off');
  try {
    await loginUser(input);
  } catch (e) {
    await signupUser(input);
  } finally {
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
    
    async function loadForDate(dateISO){
      globalDate = dateISO
      currentDate = dateISO;
      currentDateLabel.textContent = dateISO;
      entriesList.innerHTML = '<div class="small muted">Loading...</div>';
    const  today = new Date();
    //  alert(isoDate(today))
    
    if(currentDate != isoDate(today)){
      // hereee
    }

      const rootRef = db.ref(dayRoot(dateISO));
      const snapshot = await rootRef.get();
      const data = snapshot.val() || {};
      if(!data) throw new Error('Db empty')
      renderEntries(data);
      renderLiquid(data.liquid)
      const buttons = document.querySelectorAll('#in, #out, #all, #bin');

buttons.forEach(btn => {
  btn.onclick = async (e) => {
    if (navigator.vibrate) {
  navigator.vibrate(10); // short, crisp, non-annoying
}
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
  
  // Clear the target container
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
        <div><strong>₹${Number(r.amount).toLocaleString()}</strong></div>
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
 showToast("Set Today's Goal now! 👇")
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
if (data.targetAmount <=totalIn) {
  showOverlay({
  title: '🥳 Mission Accomplished! Your Daily Goal is CRUSHED!',
  desc: `You absolutely smashed your target of <b>₹${data.targetAmount}</b>! Today's total income is a fantastic <b>₹${totalIn}</b>. Keep up the great work!
  <br>
  <small style="font-style: italic">Target set by: **${data.lastUpdatedBy.toLowerCase() === fullname.toLowerCase() ? "You" : data.lastUpdatedBy}**</small>
  <br>
  
  <p> We have a special party 🎉</p>
  <button class="meme_btn">Join For Free </button>
  
  `
, icon:`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#10b981" class="size-2">
  <path fill-rule="evenodd" d="M8.603 3.799A4.49 4.49 0 0 1 12 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 0 1 3.498 1.307 4.491 4.491 0 0 1 1.307 3.497A4.49 4.49 0 0 1 21.75 12a4.49 4.49 0 0 1-1.549 3.397 4.491 4.491 0 0 1-1.307 3.497 4.491 4.491 0 0 1-3.497 1.307A4.49 4.49 0 0 1 12 21.75a4.49 4.49 0 0 1-3.397-1.549 4.49 4.49 0 0 1-3.498-1.306 4.491 4.491 0 0 1-1.307-3.498A4.49 4.49 0 0 1 2.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 0 1 1.307-3.497 4.49 4.49 0 0 1 3.497-1.307Zm7.007 6.387a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd" />
</svg>
`, btnColor:'#10b981'})




localStorage.setItem('isUserViewGoalAlert', 'yes')

$('#target').innerHTML = `<p style="font-weight: bold;" class='small'>${data.targetAmount} Completed ⚡</p>`
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
    data.targetAmount > totalIn && // Goal is NOT reached
    totalIn >= seventyPercentThreshold && // 70% threshold is met
    shouldShowAgain // Show only if it's the first time OR there's a 5% income increase
) {
    // Calculate the remaining amount needed
    const remainingAmount = data.targetAmount - totalIn;

    // Show the Overlay
    showOverlay({
        title: '🔥 You’re So Close! Just a Little Push Needed!',
        desc: `You've already earned <b>₹${totalIn}</b>. You only need <b>₹${remainingAmount}</b> more to reach your daily goal of <b>₹${data.targetAmount}</b>. Keep the momentum going!
        
        <small style="font-style: italic">Target set by: **${data.lastUpdatedBy.toLowerCase() === fullname.toLowerCase() ? "You" : data.lastUpdatedBy}**</small>`
        
    });

    // 5. Update Local Storage AFTER showing the overlay
    // This prevents the overlay from showing again immediately on the next check/refresh
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
      $('.loader').classList.remove('off')
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
        $('.loader').classList.add('off')
        loading_text.textContent='Done'
        if (navigator.vibrate) {
         navigator.vibrate(15); // short, crisp, non-annoying
        }
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
      $('.loader').classList.remove('off')
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
        $('.loader').classList.add('off')
        loading_text.textContent='Done'
        progress=false;
        if (navigator.vibrate) {
         navigator.vibrate(15); // short, crisp, non-annoying
        }
      });
      // clear
      entryFormOut.querySelector('#addBtn').textContent='Done'
      document.getElementById('dashThisMonth').click()
      desc.value=''; amount.value=''; isGpay.checked=false;
      loadForDate(dateISO);
      desc.focus()
    });

    selectDate.addEventListener('change', ()=> loadForDate(selectDate.value));
    reloadBtn.addEventListener('click', ()=> loadForDate(selectDate.value));
    
    
    
    
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
        if (navigator.vibrate) {
         navigator.vibrate(15); // short, crisp, non-annoying
        }
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

  navigator.vibrate?.(15);

  localStorage.setItem('CASHBOOK_LIQUID', now.getDate());

  liquidCard.classList.add('off');
  setTimeout(() => liquidCard.classList.add('hidden'), 1000);
};

/// end liquid ///


// suggestion  entry form 

const incomeInput = entryForm.querySelector('#desc')
const suggestionBox = document.querySelector('#suggestionBox')
incomeInput.addEventListener('input', () => {
  const raw = incomeInput.value;
  const list = JSON.parse(localStorage.getItem('itemNames') || '[]');

  const parts = raw.split(',');
  const lastRaw = parts[parts.length - 1];
  const lastPart = lastRaw.trim().toLowerCase();

  if (!lastPart) {
  const list = JSON.parse(localStorage.getItem('itemNames') || '[]');

  const recent = list.slice(0, 4);

  suggestionBox.innerHTML = recent.length
    ? recent.map(n => `<span class="suggest">${n}</span>`).join('')
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
        .map(n => `<span class="suggest">${n}</span>`)
        .join('')
    : isNew
      ? `<span class="hint">${lastRaw.trim()}</span>`
      : '';
});


suggestionBox.addEventListener('click', e => {
  if (!e.target.classList.contains('suggest')) return;

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
      if (navigator.vibrate) {
        navigator.vibrate([15, 80, 15]);
      }
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



// --------- CAT NEME FUNCTION -------- //

// Function to start the meme process
const startMeme = () => {
  
  const video = document.querySelector('video')
  video.classList.remove('hidden')
  video.play()
  
  
    // ----------------------------------------------------
  // ADDITION: Event Listener to automatically stop the meme when the video ends
  // ----------------------------------------------------
  
  // Define a function reference for the listener so we can remove it later in stopMeme
  const videoEndHandler = () => {
      // The video has ended, so automatically call the stopMeme function
      stopMeme();
      
      // IMPORTANT: Remove the listener so it doesn't fire again unexpectedly 
      // if the video is manually played/replayed outside the meme functions.
      video.removeEventListener('ended', videoEndHandler);
      
      console.log("Video ended. stopMeme() called automatically and listener removed.");
  };

  // Add the listener to the video element
  video.addEventListener('ended', videoEndHandler);
  
  // Select all input elements on the page once
  const inputs = document.querySelectorAll('input');
  

  
  // --- Inner Function for Inputs ---
  // This function handles adding/removing the '.meme' class from all inputs.
  const manageInputMeme = (action) => {
    // action should be 'add' or 'remove'
    if (action === 'add') {
      inputs.forEach(input => {
        input.classList.add('meme');
      });
      console.log('Class .meme ADDED to all input elements.');
    } else if (action === 'remove') {
      inputs.forEach(input => {
        input.classList.remove('meme');
      });
      console.log('Class .meme REMOVED from all input elements.');
    } else {
      console.error("Invalid action for manageInputMeme. Use 'add' or 'remove'.");
    }
  };

  // --- Inner Function for Cards ---
  // This function handles adding/removing the '.meme' class from all cards.
  const manageCardMeme = (action) => {
      // Select all card elements on the page once
  const cards = document.querySelectorAll('.card'); 
    // action should be 'add' or 'remove'
    if (action === 'add') {
      cards.forEach(card => {
        card.classList.add('meme');
      });
      console.log('Class .meme ADDED to all .card elements.');
    } else if (action === 'remove') {
      cards.forEach(card => {
        card.classList.remove('meme');
      });
      console.log('Class .meme REMOVED from all .card elements.');
    } else {
      console.error("Invalid action for manageCardMeme. Use 'add' or 'remove'.");
    }
  };

  // ---------------------------------------------
  // --- Execution Logic (Calling as per needed) ---
  // ---------------------------------------------

  // 1. Initial Step: Add classList .meme to each input element
  manageInputMeme('add');
  
  // OPTIONAL: Wait 1 second and remove the class from inputs (e.g., if the shake animation ends)
  // setTimeout(() => {
  //   manageInputMeme('remove');
  // }, 1000); 

  // 2. Delayed Step: Wait 5 seconds and then add classList .meme to each .card element
  setTimeout(() => {
    manageCardMeme('add');
    
    // OPTIONAL: Wait another 1 second and remove the class from cards
    // setTimeout(() => {
    //   manageCardMeme('remove');
    // }, 1000);

  }, 6500); // 5000 milliseconds = 5 seconds
  
  setTimeout(()=>{
    document.body.classList.add('dj')
  }, 15000)
};

// Example: You can call startMeme() when a button is clicked or on page load.
 //startMeme();






const stopMeme = () => {
  // Select the video element
  const video = document.querySelector('video');
  // Select all input elements on the page
  const inputs = document.querySelectorAll('input');
  // Select all card elements on the page (Note: You are selecting this inside manageCardMeme in startMeme, 
  // but selecting it here is more efficient for stopMeme's logic)
  const cards = document.querySelectorAll('.card'); 

  // --- Inner Function for Inputs (Reusing logic for cleanup) ---
  const manageInputMeme = (action) => {
    // action should be 'add' or 'remove'
    if (action === 'add') {
      // Logic for adding class (not needed for stopMeme, but kept for consistency)
      inputs.forEach(input => input.classList.add('meme'));
      console.log('Class .meme ADDED to all input elements.');
    } else if (action === 'remove') {
      inputs.forEach(input => {
        input.classList.remove('meme');
      });
      console.log('Class .meme REMOVED from all input elements.');
    } else {
      console.error("Invalid action for manageInputMeme. Use 'add' or 'remove'.");
    }
  };

  // --- Inner Function for Cards (Reusing logic for cleanup) ---
  const manageCardMeme = (action) => {
    // action should be 'add' or 'remove'
    if (action === 'add') {
      // Logic for adding class (not needed for stopMeme)
      cards.forEach(card => card.classList.add('meme'));
      console.log('Class .meme ADDED to all .card elements.');
    } else if (action === 'remove') {
      cards.forEach(card => {
        card.classList.remove('meme');
      });
      console.log('Class .meme REMOVED from all .card elements.');
    } else {
      console.error("Invalid action for manageCardMeme. Use 'add' or 'remove'.");
    }
  };

  // ---------------------------------------------
  // --- Execution Logic for Stopping ---
  // ---------------------------------------------

  // 1. Stop the video and hide it
  if (video) {
    video.pause();
    // Resetting the video to the start for the next play is often good practice
    video.currentTime = 0; 
    video.classList.add('hidden');
    console.log('Video paused and hidden.');
  }

  // 2. Remove .meme class from all inputs
  manageInputMeme('remove');
  
  // 3. Remove .meme class from all cards
  manageCardMeme('remove');

  // 4. Remove 'dj' class from the body
  document.body.classList.remove('dj');
  console.log('Class .dj REMOVED from body.');

  // IMPORTANT: Clear any pending timeouts from startMeme if needed. 
  // You would need to store the IDs of the timeouts (e.g., const timeoutId = setTimeout(...)) 
  // and use clearTimeout(timeoutId) here. Since you didn't store them, this is a suggestion 
  // for future optimization.
  
};

// Example: You can call stopMeme() when a 'Stop' button is clicked.
// stopMeme();





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
  dashSummary.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px">
      <div class="small">Range days: ${dayTotals.length}</div>
      <div class="tot-row"><div class="small">Range IN</div><div>₹${aggIn.toLocaleString()}</div></div>
      <div class="tot-row"><div class="small">OB</div><div>₹${ob.toLocaleString()}</div></div>
      <div class="tot-row"><div class="small">Range OUT</div><div>₹${aggOut.toLocaleString()}</div></div>
      <div class="tot-row"><div class="small">Range GPay (IN)</div><div>₹${aggG.toLocaleString()}</div></div>
      <div class="tot-row"><div class="small">Net (IN - OUT - GPay - OB)</div><div>₹${(aggIn-aggOut-aggG-ob).toLocaleString()}</div></div>
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
    <div style='display:flex;gap:8px;align-items:center;margin-bottom:8px'>
      <label class='small'>Start: <input type='date' id='dashStart' /></label>
      <label class='small'>End: <input type='date' id='dashEnd' /></label>
      <button id='dashLoad' style='padding:8px 10px; display:none;'>Load</button>
      <button id='dashToday' class='link'>Today</button>
      <button id='dashThisMonth' class='link'>This Month</button>
    </div>
    <div style='display:flex;gap:12px;align-items:flex-start'>
      <div id='dashSummary' style='flex:1'></div>
      <div id='dashChart' style='width:420px;height:120px'></div>
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


import { ref, onChildAdded, onChildChanged, onChildRemoved } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

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
// realtime watchers
if (username || fullname) {
  onChildAdded(dataRef, () => refreshDashboard('added'));
onChildChanged(dataRef, () => refreshDashboard("Updated"));
onChildRemoved(dataRef, () => refreshDashboard("Deleted"));
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
  console.log("Fetched:", data);

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
    
    if (navigator.vibrate) {
      navigator.vibrate(15);   // short, crisp, non-annoying
    }
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





// error handling 

window.onerror = (message, source, lineno, colno, error) => {
    
    console.error(`Error: ${message}`);
    showOverlay({title: 'Global Error', desc:`${message}. <br>
    ${error}. <br> 
    line: ${lineno}`, important:false})
    return true;
};



window.addEventListener('unhandledrejection', (event) => {
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
        const goalRef = db.ref(`${username}/goals/${currentDate}`);
        
        await goalRef.set({
            targetAmount: amount,
            note: goalData.note || '',
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
// 2. THE HELPER FUNCTION (Unchanged, as it was already correct)
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





const today = new Date();
const isBirthday = today.getDate() === 27 && today.getMonth() === 1;

if (isBirthday) {
  const overlay = document.getElementById('birthday-overlay');
  if (!overlay) throw new Error("missing element.");
  
  const items = ['🎉', '🎂', '🎊'];
  
  setInterval(() => {
    const el = document.createElement('div');
    el.className = 'birthday-item';
    el.textContent = items[Math.floor(Math.random() * items.length)];
    el.style.left = Math.random() * 100 + 'vw';
    el.style.animationDuration = 2 + Math.random() * 2 + 's';
    
    overlay.appendChild(el);
    
    // cleanup each item (memory leak avoid)
    setTimeout(() => el.remove(), 4000);
  }, 400); // 👈 slow, classy
}




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
