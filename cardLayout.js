export const cardLayout=({name, status, number, model, lock, complaints, sn, date, advance, amount, notes, time})=>`

  <div class="box">
          
       <div class='item_flex'>
       <p class='key'><b>Number</b></p>
         <p class='value'>+91 ${number}</p>
       </div>
       
        <div class='item_flex'>
        <p class='key'><b>Model</b></p>
         <p class='value'>${model}</p>
       </div>
       
       <div class='item_flex'>
       <p class='key'><b>Complaints</b></p>
         <p class='value'>${complaints}</p>
       </div>
       
              <div class='item_flex'>
       <p class='key'><b>Lock</b></p>
         <p class='value'>${lock || '<i>none</i>'}</p>
       </div>
       
       
       <div class='item_flex'>
       <p class='key'><b>Date</b></p>
         <p class='value'>${date || ''} ${time || ''}</p>
       </div>
       
       
       <div class='item_flex'>
       <p class='key'><b>Approx Rate</b></p>
         <p class='amount value'>₹${amount?Number(amount).toLocaleString('en-IN') :''}</p>
       </div>
       
        <div class='item_flex'>
       <p class='key'><b>Advance</b></p>
         <p class='advance value'>₹${advance?Number(advance).toLocaleString('en-IN') : ''}</p>
       </div>


 </div>
 
 <div class='note-input-wrap'>
  <textarea id='note-input-${sn}' class='add-note-input' placeholder='Add note+' '>${notes||''}</textarea>
  <button id='note-btn-${sn}' class='add-note-btn' name='sn-${sn}'>Save notes</button>
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

   <button class='call-btn' data-num="+91${number}">
      <i class="fa-solid fa-phone"></i>
    </button>
 </div>
`