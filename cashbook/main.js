
// check is user authenticated
const username = localStorage.getItem('CASHBOOK_USER_NAME');


   
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
    
    // get user data from DB
firebase.database().ref(`/users/${username}`).get()
  .then(snap => {
    if (snap.exists()) {
      document.querySelector('#loading_text').textContent=` User found ${username}`
      const user = snap.val();
      console.log("Logged user:", user);
    } else {
      showToast('Session Timeout');
      authView.style.display='block';
        mainView.style.display='none';
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

    // Authentication: simple email sign in (create if not exists)
    signInBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passInput.value.trim() || Math.random().toString(36).slice(-8);
      const username = document.getElementById("username").value.trim().toLowerCase();
      if(!email || !username) return showToast('Fill all fields', '#FFC107');
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
          return;
        }

        
        
        
        
        
        await auth.signInWithEmailAndPassword(email,password);
        const loginKey = Date.now();
        await userRef.child(`logins/${loginKey}`).set(getDeviceInfo());
        
       
        localStorage.setItem('CASHBOOK_USER_NAME', username)
        showTopToast("SignIn successful");
        location.reload()
      }catch(err){
        // create user
        //showToast('User Not Exist, Trying Create Account...', "#FFC107")
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
          logins: {}
        });

        localStorage.setItem('CASHBOOK_USER_NAME', username)
        showTopToast("Signup successful");
        location.reload()
        }
        catch(e){ showTopToast('Auth error: '+e.message, '#F44336'); }
      }
    });

    auth.onAuthStateChanged(user => {
      if(user){
        document.querySelector('#loading_text').textContent=username;

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
    el.className = `entry ${type}${r.gpay ? ' gp' : ''}`;

    el.innerHTML = `
      <div class="meta">
        <div><strong>${type.toUpperCase()} — ${r.name}</strong></div>
        <div class="small">${formatDT(r.ts)}</div>
      </div>
      <div style="text-align:right">
        <div><strong>₹${Number(r.amount).toLocaleString()}</strong></div>
        <div class="actions gpay">
          ${r.gpay ? '<span><i class="fa-brands fa-google-pay"></i></span>' : ''}
          <button data-key="${r._key}" class="deleteBtn">Delete</button>
        </div>
      </div>
    `;

    entriesList.appendChild(el);
  });

  // Delete handler
  document.querySelectorAll('.deleteBtn').forEach(btn =>
    btn.addEventListener('click', async e => {
      const key = e.target.dataset.key;

      const ref = db.ref(dayRoot(currentDate) + `/${type}/${key}`);
      const snap = await ref.get();
      if (!snap.exists()) return alert("Entry not found!");

      const row = snap.val();

      if (!confirm("Delete entry?")) return;

      // Move to recycle bin
      await db.ref(`${username}/recycleBin/${currentDate}/${type}/${key}`)
        .set({ ...row, deletedAt: new Date().toLocaleString("en-IN") });

      // Delete original
      await ref.remove();

      // Reload same type
      loadForDate(currentDate, type);
    })
  );
}

    // Key path per day
    function dayRoot(dateISO){ return `${username}/${dateISO}`; }
    // Load all entries for date
    let currentDate = null;
    async function loadForDate(dateISO){
      
      currentDate = dateISO;
      currentDateLabel.textContent = dateISO;
      entriesList.innerHTML = '<div class="small muted">Loading...</div>';

      const rootRef = db.ref(dayRoot(dateISO));
      const snapshot = await rootRef.get();
      const data = snapshot.val() || {};
      renderEntries(data);
      document.querySelector('#in').onclick=()=>renderType('in', data)
      document.querySelector('#out').onclick=()=>renderType('out', data)
      document.querySelector('#all').onclick=()=>renderEntries(data)
    }

    function renderEntries(data){
      document.querySelector('.loader').classList.add('off')
  entriesList.innerHTML='';
  const rows = [];
  ['in','out'].forEach(type=>{
    const group = data[type] || {};
    Object.keys(group).forEach(key=>{
      rows.push({...group[key], _type:type, _key:key});
    });
  });

  // 🔁 sort by timestamp (latest first)
  rows.sort((a,b)=> b.ts - a.ts);

  let totalIn=0,totalOut=0,totalGpay=0;
  if(rows.length===0){ 
    entriesList.innerHTML='<div class="small muted">No entries for this day.</div>'; 
    return;
  }

  rows.forEach(r=>{
    const el = document.createElement('div');
    el.className = `entry ${r._type === 'in' ? 'in' : 'out'}${r.gpay ? ' gp' : ''}`;
    el.innerHTML = `
      <div class="meta">
        <div><strong>${r._type.toUpperCase()} — ${r.name}</strong></div>
        <div class="small">${formatDT(r.ts)} • ${r.userEmail||''} • ${r.staffName ||''}</div>
      </div>
      <div style="text-align:right">
        <div><strong>₹${Number(r.amount).toLocaleString()}</strong></div>
        <div class="actions gpay">
          ${r.gpay?'<span><i class="fa-brands fa-google-pay"></i></span>':''} 
          <button data-key='${r._key}' class='deleteBtn'>Delete</button>
        </div>
      </div>`;
    entriesList.appendChild(el);

    if(r._type==='in') totalIn += Number(r.amount||0);
    else totalOut += Number(r.amount||0);
    if(r.gpay) totalGpay += Number(r.amount||0);
  });

  totalInEl.textContent = `₹${totalIn.toLocaleString()}`;
  totalOutEl.textContent = `₹${totalOut.toLocaleString()}`;
  totalGpayEl.textContent = `₹${totalGpay.toLocaleString()}`;
  const net = totalIn - totalOut - totalGpay;
  netBalEl.textContent = `₹${net.toLocaleString()}`;

  document.querySelectorAll('.deleteBtn').forEach(btn=>
    btn.addEventListener('click', async (e) => {
  const key = e.target.dataset.key;

  // Find type: in or out
  const inPath = db.ref(dayRoot(currentDate) + `/in/${key}`);
  const type = (await inPath.get()).exists() ? 'in' : 'out';

  // Original entry
  const originalRef = db.ref(dayRoot(currentDate) + `/${type}/${key}`);

  const snap = await originalRef.get();
  if (!snap.exists()) {
    alert("Entry not found.");
    return;
  }

  const data = snap.val();

  if (!confirm("Delete entry?")) return;

  // ------------------------------------------------
  // 1) MOVE TO RECYCLE BIN with type folder
  // ------------------------------------------------
  const recycleRef = db.ref(`${username}/recycleBin/${currentDate}/${type}/${key}`);

  await recycleRef.set({
    ...data,
    deletedAt: new Date().toLocaleString("en-IN")
  });

  // ------------------------------------------------
  // 2) DELETE ORIGINAL
  // ------------------------------------------------
  await originalRef.remove();

  // ------------------------------------------------
  // 3) Refresh UI
  // ------------------------------------------------
  loadForDate(currentDate);
})

)}
    
  

    // Create serial number (count existing children +1)
    async function nextSerial(dateISO,type){
      const ref = db.ref(dayRoot(dateISO)+`/${type}`);
      const snap = await ref.get();
      const count = snap.exists()? Object.keys(snap.val()).length:0;
      return count+1;
    }

    entryForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const t = 'in';
      const name = entryForm.querySelector('#desc').value.trim();
      const amount = entryForm.querySelector('#amount');
      const staffName = document.querySelector('#staff').value.trim();
      const amt = Number(amount.value);
      const g = isGpay.checked;
      if(!name || !amt) return alert('Name and amount required');
      document.querySelector('#addBtn').textContent='Loading...'
      const dateISO = selectDate.value || isoDate(new Date());
      const s = await nextSerial(dateISO,t);
      const nodeRef = db.ref(dayRoot(dateISO)+`/${t}`).push();
      await nodeRef.set({
        serial: s,
        name,
        amount: amt,
        gpay: g,
        ts: Date.now(),
        staffName,
        userEmail: auth.currentUser ? auth.currentUser.email : 'local'
      });
      // clear
      document.querySelector('#addBtn').textContent='Add'
      document.getElementById('dashThisMonth').click()
      desc.value=''; amount.value=''; isGpay.checked=false;
      document.querySelector('#staff').value=''
      loadForDate(dateISO);
    });
    
    
    entryFormOut.addEventListener('submit', async (e)=>{
      
      e.preventDefault();
      const desc = entryFormOut.querySelector('#desc')
      const amount = entryFormOut.querySelector('#amount');
      const t = 'out';
      const name = desc.value.trim();
      const amt = Number(amount.value);
      const g = false;
      if(!name || !amt) return alert('Name and amount required');
      entryFormOut.querySelector('#addBtn').textContent='Loading...'
      const dateISO = selectDate.value || isoDate(new Date());
      const s = await nextSerial(dateISO,t);
      const nodeRef = db.ref(dayRoot(dateISO)+`/${t}`).push();
      await nodeRef.set({
        serial: s,
        name,
        amount: amt,
        gpay: g,
        ts: Date.now(),
        userEmail: auth.currentUser ? auth.currentUser.email : 'local'
      });
      // clear
      entryFormOut.querySelector('#addBtn').textContent='Add'
      document.getElementById('dashThisMonth').click()
      desc.value=''; amount.value=''; isGpay.checked=false;
      loadForDate(dateISO);
    });

    selectDate.addEventListener('change', ()=> loadForDate(selectDate.value));
    reloadBtn.addEventListener('click', ()=> loadForDate(selectDate.value));



    // Export CSV for current date
    exportCSV.addEventListener('click', async ()=>{
      const rootRef = db.ref(dayRoot(currentDate));
      const snap = await rootRef.get(); const data = snap.val()||{};
      const rows = [];
      ['in','out'].forEach(type=>{
        const group = data[type]||{};
        Object.keys(group).forEach(k=>rows.push({type, key:k, ...group[k]}));
      });
      if(rows.length===0) return alert('No data');
      let csv = 'type,serial,name,amount,gpay,ts,user\n';
      rows.forEach(r=>{ csv+=`${r.type},${r.serial},"${(r.name||'').replace(/"/g,'""')}",${r.amount},${r.gpay?1:0},${new Date(r.ts).toLocaleString()},${r.userEmail||''}\n`; });
      const blob = new Blob([csv],{type:'text/csv'}); const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=`cashbook-${currentDate}.csv`; a.click(); URL.revokeObjectURL(url);
    });

    // Clear day (CAUTION): deletes all data for date
    clearDay.addEventListener('click', async ()=>{
      if(!confirm('Delete all entries for this day?')) return;
      await db.ref(dayRoot(currentDate)).remove(); loadForDate(currentDate);
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
  let aggIn=0, aggOut=0, aggG=0;
  for(const d of days){
    const snap = await db.ref(dayRoot(d)).get();
    const data = snap.val() || {};
    let tin=0, tout=0, tg=0;
    ['in','out'].forEach(type=>{
      const group = data[type]||{};
      Object.values(group).forEach(r=>{
        if(type==='in') tin += Number(r.amount||0); else tout += Number(r.amount||0);
        if(r.gpay) tg += Number(r.amount||0);
      });
    });
    dayTotals.push({date:d,in:tin,out:tout,gpay:tg});
    aggIn += tin; aggOut += tout; aggG += tg;
  }
  renderDashboard(dayTotals, {aggIn, aggOut, aggG});
}


// Render small stats and mini SVG chart
function renderDashboard(dayTotals, aggs){
  const dashSummary = document.getElementById('dashSummary');
  const dashChart = document.getElementById('dashChart');
  const {aggIn, aggOut, aggG} = aggs;
  dashSummary.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px">
      <div class="small">Range days: ${dayTotals.length}</div>
      <div class="tot-row"><div class="small">Range IN</div><div>₹${aggIn.toLocaleString()}</div></div>
      <div class="tot-row"><div class="small">Range OUT</div><div>₹${aggOut.toLocaleString()}</div></div>
      <div class="tot-row"><div class="small">Range GPay (IN)</div><div>₹${aggG.toLocaleString()}</div></div>
      <div class="tot-row"><div class="small">Net (IN - OUT - GPay)</div><div>₹${(aggIn-aggOut-aggG).toLocaleString()}</div></div>
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
    mainView.style.display='none';
   // chartView.style.display='block';
   // document.querySelector('.card.dboard').style.display='none';
   // showFullChart(dayTotals)
  }
if (dayTotals.length > 1) {
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
  const container = document.querySelector('.container');
  const dashCard = document.createElement('div');
  dashCard.className = 'card dboard';
  dashCard.style.marginBottom='12px';
  dashCard.style.marginTop='12px'
  dashCard.innerHTML = `
    <h3>Dashboard</h3>
    <div style='display:flex;gap:8px;align-items:center;margin-bottom:8px'>
      <label class='small'>Start: <input type='date' id='dashStart' /></label>
      <label class='small'>End: <input type='date' id='dashEnd' /></label>
      <button id='dashLoad' style='padding:8px 10px'>Load</button>
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
  document.getElementById('dashLoad').addEventListener('click', ()=>{
    const s = document.getElementById('dashStart').value;
    const e = document.getElementById('dashEnd').value;
    if(!s||!e) return alert('Pick start and end date');
    fetchRangeTotals(s,e);
  });
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
  loadForDate(selectDate.value);
  document.getElementById("dashThisMonth").click();
 // showToast(`${type}`);
}

// realtime watchers
onChildAdded(dataRef, () => refreshDashboard('added'));
onChildChanged(dataRef, () => refreshDashboard("Updated"));
onChildRemoved(dataRef, () => refreshDashboard("Deletion"));


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