export const cardLayout=({name, status, number, model, lock, complaints, sn, date})=>`

  <div class="flex">
          
       
        <div class="left">
      
        <p><b>Number</b></p>
        <p><b>Model</b></p>
        <p><b>Complaints</b></p>
        <p><b>Lock</b></p>
        <p><b>Date</b></p>
        </div>

<div class="right">
  
  <p>+91 ${number}</p>
  <p>${model}</p>
  <p>${complaints}</p>
  <p>${lock||'<i>none</i>'}</p>
  <p>${date||''}</p>
</div>
 </div>
 
 <div class='note-input-wrap'>
  <textarea id='note-input-${sn}' class='add-note-input' placeholder='Add note+'></textarea>
  <button id='note-btn-${sn}' class='add-note-btn'>Add</button>
</div>
 <div class="status">
<span>
     <input type="radio" ${status==='pending'? 'checked':''} name="status-${sn}" id="pending-${sn}" />
   <label for="pending-${sn}">Pending</label>
</span>

<span>
     <input type="radio" ${status==='spare'? 'checked':''} name="status-${sn}" id="spare-${sn}" />
   <label for="spare-${sn}">Wait for Spare</label>
</span>

<span>
     <input type="radio" ${status==='progress'? 'checked':''} name="status-${sn}" id="progress-${sn}" />
   <label for="progress-${sn}">In Progress</label>
</span>

<span>
  <input type="radio" ${status==='done'? 'checked':''} name="status-${sn}" id="done-${sn}" />
  <label for="done-${sn}">Done</label>
</span>

<span>
  <input type="radio" ${status==='collected'? 'checked':''} name="status-${sn}" id="collected-${sn}" />
  <label for="collected-${sn}">Collected</label>
</span>

<span>
  <input type="radio" ${status==='return'? 'checked':''} name="status-${sn}" id="return-${sn}" />
  <label for="return-${sn}">Return</label>
</span>

<button class='call-btn' onclick = "window.location.href='tel:+91${number}'">
  Call Now </button>
 </div>
`