const $ = s => document.querySelector(s)
// check is user authenticated
const username = localStorage.getItem('CASHBOOK_USER_NAME');
const fullname = localStorage.getItem('CASHBOOK_FULLNAME');


const progressBar = document.querySelector('.loader .progress .bar')

   
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

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.database();
    
    document.querySelector('#loading_text').textContent=`Fetching DB`
    progressBar.style.width='40%'
    
    // get user data from DB
firebase.database().ref(`/users/${username}`).get()
  .then(snap => {
    if(!username || !fullname){
      showToast('Session Timeout');
      authView.style.display='block';
        mainView.style.display='none';
        $('.dboard').style.display='none'
        userArea.innerHTML='';
        document.querySelector('.loader').classList.add('off')
        return
    }
    if (snap.exists()) {
      document.querySelector('#loading_text').textContent=` User found ${username}`
      progressBar.style.width='100%'
      const user = snap.val();
      //console.log("Logged user:", user);
    } else {
      showToast('Session Timeout');
      authView.style.display='block';
        mainView.style.display='none';
        $('.dboard').style.display='none'
        userArea.innerHTML='';
        document.querySelector('.loader').classList.add('off')
    }
  });

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
    
    const loading_text = document.querySelector('#loading_text')
    const overlay = document.getElementById('alertOverlay');
    const obForm = $('#obForm')
    const obCard = $('#obCard');
    
    
    const VERSION_CODE = 'v1.5'
    
    if (!fullname || !username) {
      localStorage.removeItem('CASHBOOK_USER_NAME')
      localStorage.removeItem('CASHBOOK_FULLNAME')
      
    } 
    else {
      const version = localStorage.getItem('version_code');
      if(version!=VERSION_CODE){
      const confirmBtn = document.getElementById('confirmBtn');
      const cancelBtn = document.getElementById('cancelBtn');
      const overlay = document.getElementById('alertOverlay');
      
      

      
      cancelBtn.style.display='none'
      confirmBtn.textContent='Close'
      
      
      const handleCloseAlert = (e)=>{
        if(e && e.target.id==='alertOverlay'){
          
          
          hideOverlay()
        localStorage.setItem('version_code', VERSION_CODE)
        setTimeout(()=>{cancelBtn.style.display='block'
        confirmBtn.textContent='Confirm'}, 500)
        return
        }
        hideOverlay()
        localStorage.setItem('version_code', VERSION_CODE)
        setTimeout(()=>{cancelBtn.style.display='block'
        confirmBtn.textContent='Confirm'}, 500)
      }
      confirmBtn.onclick=()=>{
        handleCloseAlert()
        if (navigator.vibrate) {
                      navigator.vibrate([15, 80, 15]); // short, crisp, non-annoying
                    }
                
      }
      overlay.removeEventListener('click', handleCloseAlert)
      overlay.addEventListener('click', handleCloseAlert)

    }
    
    const salaryDay = localStorage.getItem('salaryDay')
     if(!salaryDay && username==='shahinsha'){
      const confirmBtn = document.getElementById('confirmBtn');
      const cancelBtn = document.getElementById('cancelBtn');
      const overlay = document.getElementById('alertOverlay');
      
      

      
      cancelBtn.style.display='none'
      confirmBtn.textContent='Close'
      showOverlay({title:"Salary Ahead", desc:`
      <span style='display: flex; flex-flow: column; align-items: start; text-align: left'>
      
<ul style='padding: 0; padding-left: 1rem'>


<li>5 days to go! (Expected credit on [07-12-2025]) ;-)</li>

</ul>

     
      </span>
      `, important:false, icon:`
      
      <svg xmlns="http://www.w3.org/2000/svg" class="icon-svg" viewBox="0 0 20 20" fill="currentColor">
  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
</svg>

      `
      })
      
      const handleCloseAlert = (e)=>{
        if(e && e.target.id==='alertOverlay'){
          
          
          hideOverlay()
        localStorage.setItem('salaryDay', true)
        setTimeout(()=>{cancelBtn.style.display='block'
        confirmBtn.textContent='Confirm'}, 500)
        return
        }
        hideOverlay()
        localStorage.setItem('salaryDay', true)
        setTimeout(()=>{cancelBtn.style.display='block'
        confirmBtn.textContent='Confirm'}, 500)
      }
      confirmBtn.onclick=()=>{
        handleCloseAlert()
        if (navigator.vibrate) {
                      navigator.vibrate([15, 80, 15]); // short, crisp, non-annoying
                    }
                
      }
      overlay.removeEventListener('click', handleCloseAlert)
      overlay.addEventListener('click', handleCloseAlert)

    }
 
}
    
    // Authentication: simple email sign in (create if not exists)
    signInBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passInput.value.trim() || Math.random().toString(36).slice(-8);
      const username = document.getElementById("username").value.trim().toLowerCase();
      const fullname = document.querySelector('#fullname').value.trim()
      const selectedRole = document.querySelector('input[name="role"]:checked')?.value || null;

      
      
      if(!email || !username || !fullname) return showToast('Fill all fields', '#FFC107');
      const userRef = db.ref(`/users/${username}`);
      
      try{
        // try sign in
        
        

        const snap = await userRef.get();
        if (!snap.exists()) {
          showTopToast("User not found", '#F44336');
          throw new Error('User Not found, Try to create one')
          return;
        }
        
        const data = snap.val();
        if (data.password !== password) {
          showTopToast("Wrong password", '#F44336');
          if (navigator.vibrate) {
            navigator.vibrate([15, 80, 15]); // short, crisp, non-annoying
          }
          return
          };
          
        

        
        
        const dbName = data.fullname.toLowerCase()
        const role = dbName.includes(fullname.toLowerCase())?'owner':'staff'
        
        
        await auth.signInWithEmailAndPassword(email,password);
        const loginKey = Date.now();
        await userRef.child(`logins/${loginKey}_${role}_${fullname.trim().replace(/\s+/g, '_')}`).set(getDeviceInfo());
        
       
        localStorage.setItem('CASHBOOK_USER_NAME', username)
        localStorage.setItem('CASHBOOK_ROLL', role)
        localStorage.setItem('CASHBOOK_FULLNAME', fullname)
        

        showTopToast("SignIn successful");
        location.reload()
      }catch(err){
        // create user
        //showToast('User Not Exist, Trying Create Account...', "#FFC107")
        showTopToast(err.message)
        console.log(err)
        //showTopToast(err.message)
        const snap = await userRef.get();
        if (!snap.exists()) {
          //showTopToast("User not found", '#F44336');
          showTopToast('User Not Exist, Trying Create Account...', "#FFC107")
          
        }
        
        try{ 
          const snap = await userRef.get();
        if (snap.exists()) {
          showTopToast("Username already exists, Filed.", '#F44336');
          return;
        }
        
          await auth.createUserWithEmailAndPassword(email,password); 
          
          await userRef.set({
          username,
          password,
          signupInfo: getDeviceInfo(),
          fullname,
          role: 'owner',
          logins: {}
        });
        
        
        // for new user (fixed maximum callstack exceeded error )
        const ref = db.ref(username);
        const snaps = await ref.get();
        await ref.update({ _init: true });
  // ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

        localStorage.setItem('CASHBOOK_USER_NAME', username)
        localStorage.setItem('CASHBOOK_ROLL', 'owner')
        localStorage.setItem('CASHBOOK_FULLNAME', fullname)
        showTopToast("Signup successful");
        location.reload()
        }
        catch(e){ showTopToast('Auth error: '+e.message, '#F44336'); }
      }
    });

    auth.onAuthStateChanged(user => {
      if(user){
        document.querySelector('#loading_text').textContent=username;
        progressBar.style.width='97%'

        authView.style.display='none';
        mainView.style.display='block';
        userArea.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><div>${user.email}</div><button id='signOut' class='link'>Sign out</button></div>`;
        document.getElementById('signOut').addEventListener('click', ()=>auth.signOut());
        // set default date to today
        const today = new Date();
        selectDate.value = isoDate(today);
        loadForDate(selectDate.value);

      }else{
        authView.style.display='block';
        mainView.style.display='none';
        userArea.innerHTML='';
        document.querySelector('.loader').classList.add('off')
      }
    });

    // helpers
    function isoDate(d){
      const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,'0');const day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;
    }
    function formatDT(ts){ const d=new Date(ts); return `${d.toLocaleString()}`; }
    
    
    function renderType(type, data) {
  entriesList.innerHTML = '';

  const group = data[type] || {};
  const rows = Object.keys(group).map(key => ({
    ...group[key],
    _key: key,
    _type: type
  }));
console.log(type)
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
  });}



  
  
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



// for search
function filterData(data, searchValue) {
  const result = { in: {}, out: {} };
  const v = searchValue.toLowerCase();

  // 1) Filter IN
  Object.keys(data.in || {}).forEach(key => {
    const item = data.in[key];
    if (
      (item.name && item.name.toLowerCase().includes(v)) ||
      (item.amount && String(item.amount).includes(v)) ||
      (item.gpay && String(item.gpay).includes(v)) ||
      (item.staffName && item.staffName.toLowerCase().includes(v))
    ) {
      result.in[key] = item;
    }
  });

  // 2) Filter OUT
  Object.keys(data.out || {}).forEach(key => {
    const item = data.out[key];
    if (
      (item.name && item.name.toLowerCase().includes(v)) ||
      (item.amount && String(item.amount).includes(v)) ||
      (item.gpay && String(item.gpay).includes(v)) ||
      (item.staffName && item.staffName.toLowerCase().includes(v))
    ) {
      result.out[key] = item;
    }
  });

  return result;
}


    // Key path per day
    function dayRoot(dateISO){ return `${username}/${dateISO}`; }
    // Load all entries for date
    let currentDate = null;
    
    async function loadForDate(dateISO){
      
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

    if (r._type === 'in') {
      totalIn += Number(r.amount || 0) + Number(r.gpay || 0);
    } else {
      totalOut += Number(r.amount || 0);
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
    
    
var progress = false;
    entryForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      if(progress) return showTopToast('Try again');
      
      const t = 'in';
      const name = entryForm.querySelector('#desc').value.trim();
      const amount = entryForm.querySelector('#amount');
      const staffName = localStorage.getItem('CASHBOOK_FULLNAME').trim() || 'UNKNOWN';
      const amt = Number(amount.value);
      const gpAmount = Number(document.querySelector('#gpAmount').value);
      const g = gpAmount ||0;
      if(!name || !amt && !gpAmount) return showTopToast('Name and amount required');
      progress=true;
      document.querySelector('#addBtn').textContent='Loading...'
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
        if (navigator.vibrate) {
         navigator.vibrate(15); // short, crisp, non-annoying
        }
        $('#desc').focus()
      }).catch((error)=>{
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
            if(progress) return showTopToast('Try again');
            
      const desc = entryFormOut.querySelector('#desc')
      const amount = entryFormOut.querySelector('#amount');
      const t = 'out';
      const name = desc.value.trim();
      const amt = Number(amount.value);
      const g = false;
      if(!name || !amt) return showTopToast('Name and amount required');
      progress=true;
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
  const t = 'in'
  const dateISO =  isoDate(new Date(Date.now() + 24*60*60*1000));
      const s = await nextSerial(dateISO,t);
      const nodeRef = db.ref(dayRoot(dateISO)+`/${t}`).push();
      const staffName = localStorage.getItem('CASHBOOK_FULLNAME').trim() || 'UNKNOWN';
      const now = new Date()
      
if(progress) return showTopToast('Try again');
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
}



// check opening Balance already or timeout 


function checkOBBox() {
  console.log('checking ob')
  const now = new Date();
  const hour = now.getHours(); // 0–23
  
  const noOB = localStorage.getItem('CASHBOOK_OB')!=now.getDate();
  const inTime = hour >= 21 && hour < 23; // 9pm to 11pm
  
  if (noOB && inTime) {
    obCard.classList.remove('hidden');
    
  } else {
    obCard.classList.add('hidden');
  }
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
      showTopToast("Entry not found.");
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





    // Export CSV for current date
    exportCSV.addEventListener('click', async ()=>{
      const rootRef = db.ref(dayRoot(currentDate));
      const snap = await rootRef.get(); const data = snap.val()||{};
      const rows = [];
      ['in','out'].forEach(type=>{
        const group = data[type]||{};
        Object.keys(group).forEach(k=>rows.push({type, key:k, ...group[k]}));
      });
      if(rows.length===0) return showTopToast('No data');
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
   $('.loader').style.display='block'
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

// ------------------------ END DASHBOARD ------------------------


import { ref, onChildAdded, onChildChanged, onChildRemoved } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

const dataRef = ref(db, `/${username}`);
console.log(username)
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
onChildAdded(dataRef, () => refreshDashboard('added'));
onChildChanged(dataRef, () => refreshDashboard("Updated"));
onChildRemoved(dataRef, () => refreshDashboard("Deleted"));


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


$('.dboard').onchange=()=>$('#dashLoad').onclick()




var important
        // Get references to DOM elements
        
       // const triggerBtn = document.getElementById('triggerAlert');
        const confirmBtn = document.getElementById('confirmBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        
        // Function to show the overlay
        function showOverlay(info) {
        const icon = document.getElementById('overlayAlertIcon');
        important=info.important||false
        
        icon.innerHTML=info.icon || `
           <svg xmlns="http://www.w3.org/2000/svg" class="icon-svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>`

        $('#alertTitle').textContent=info.title
        $('#alertMessage').innerHTML=info.desc
            // Set visibility and opacity to trigger CSS transitions
            overlay.classList.add('visible');
            
            // Add event listener to close when clicking outside the card
            // We use setTimeout to ensure the click listener isn't immediately triggered 
            // by the same click that opened the alert.
            setTimeout(() => {
              overlay.onclick=(e)=>handleOverlayClick(e);
            }, 50); 
        }

        // Function to hide the overlay
        function hideOverlay() {
            // Remove visibility class
            overlay.classList.remove('visible');
            
            // Remove event listener
            overlay.removeEventListener('click', handleOverlayClick);
            important = false;
        }

        // Handler for clicks outside the card area (on the dimmed background)
        function handleOverlayClick(event) {
            // Check if the click happened directly on the overlay element
            if (event.target === overlay) {
                console.log("Overlay background clicked. Closing alert.");
              !important? hideOverlay():'';
            }
        }
        
        // Attach event listeners
    //    triggerBtn.addEventListener('click', showOverlay);
        
        confirmBtn.addEventListener('click', function() {
            // Placeholder action: Log and hide
            console.log("User confirmed the action. Proceeding with transaction.");
            !important?hideOverlay():'';
        });
        
        cancelBtn.addEventListener('click', function() {
            // Placeholder action: Log and hide
            console.log("User cancelled the action.");
           !important? hideOverlay():'';
        });

        // Initial setup: hide the overlay when the page loads
        //hideOverlay();
        
       // showOverlay()
       
       
       
       
       
       
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





$('#setReminder').onclick=()=>{
throw new Error("Uh oh! Couldn't set the Reminder.");
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
        const goalRef = db.ref(`${username}/goals/${currentDate}`);
        
        await goalRef.set({
            targetAmount: amount,
            note: goalData.note || '',
            setAt: new Date().toLocaleString("en-IN"),
            lastUpdatedBy: fullname || 'unknown'
        });

        // 4. Success Feedback
        showTopToast("Daily goal set successfully! 🎯");
        
        // Optional: Update UI to show the new goal immediately
        // updateGoalUI(amount); 

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
