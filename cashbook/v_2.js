    // ------------------------ CONFIG ------------------------
    // Replace with your Firebase project's config object
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

    // UI refs
    const authView = document.getElementById('authView');
    const mainView = document.getElementById('mainView');
    const userArea = document.getElementById('userArea');

    const emailInput = document.getElementById('email');
    const passInput = document.getElementById('password');
    const signInBtn = document.getElementById('signInBtn');

    const entryForm = document.getElementById('entryForm');
    const ioType = document.getElementById('ioType');
    const desc = document.getElementById('desc');
    const amount = document.getElementById('amount');
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

    // Authentication: simple email sign in (create if not exists)
    signInBtn.addEventListener('click', async () => {
      const email = emailInput.value.trim();
      const password = passInput.value.trim() || Math.random().toString(36).slice(-8);
      if(!email) return alert('Enter email');
      try{
        // try sign in
        await auth.signInWithEmailAndPassword(email,password);
      }catch(err){
        // create user
        try{ await auth.createUserWithEmailAndPassword(email,password); }
        catch(e){ alert('Auth error: '+e.message); }
      }
    });

    auth.onAuthStateChanged(user => {
      if(user){
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
      }
    });

    // helpers
    function isoDate(d){
      const y=d.getFullYear();const m=String(d.getMonth()+1).padStart(2,'0');const day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`;
    }
    function formatDT(ts){ const d=new Date(ts); return `${d.toLocaleString()}`; }

    // Key path per day
    function dayRoot(dateISO){ return `cashbook/${dateISO}`; }

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
    }

    function renderEntries(data){
      entriesList.innerHTML='';
      // combine in and out into single array with type and serial
      const rows = [];
      ['in','out'].forEach(type=>{
        const group = data[type] || {};
        Object.keys(group).forEach(key=>{
          rows.push({...group[key], _type:type, _key:key});
        });
      });
      // sort by serial number
      rows.sort((a,b)=> (a.serial||0)-(b.serial||0));

      let totalIn=0,totalOut=0,totalGpay=0;
      if(rows.length===0){ entriesList.innerHTML='<div class="small muted">No entries for this day.</div>'; }

      rows.forEach(r=>{
        const el = document.createElement('div');
        el.className = `entry ${r._type === 'in' ? 'in' : 'out'}${r.gpay ? ' gp' : ''}`;
        el.innerHTML = `<div class="meta"><div><strong>#${r.serial} — ${r.name}</strong></div><div class="small">${formatDT(r.ts)} • ${r.userEmail||''}</div></div><div style="text-align:right"><div><strong>₹${Number(r.amount).toLocaleString()}</strong></div><div class="actions small">${r.gpay?'<span>GPay</span>':''} <button data-key='${r._key}' class='deleteBtn'>Delete</button></div></div>`;
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

      // attach delete handlers
      document.querySelectorAll('.deleteBtn').forEach(btn=>btn.addEventListener('click', async (e)=>{
        const key = e.target.dataset.key; const type = (await db.ref(dayRoot(currentDate)+`/in/${key}`).get()).exists()? 'in':'out';
        if(!confirm('Delete entry?')) return;
        await db.ref(dayRoot(currentDate)+`/${type}/${key}`).remove();
        loadForDate(currentDate);
      }));
    }

    // Create serial number (count existing children +1)
    async function nextSerial(dateISO,type){
      const ref = db.ref(dayRoot(dateISO)+`/${type}`);
      const snap = await ref.get();
      const count = snap.exists()? Object.keys(snap.val()).length:0;
      return count+1;
    }

    entryForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const t = ioType.value;
      const name = desc.value.trim();
      const amt = Number(amount.value);
      const g = isGpay.checked;
      if(!name || !amt) return alert('Name and amount required');
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
