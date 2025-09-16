export const cardLayout=({name, status, number, model,  complaints, sn, date})=>`
  <div class="flex">
          
       
        <div class="left">
                  <p><b>Name</b></p>
        <p><b>SN</b></p>
        <p><b>Number</b></p>
        <p><b>Model</b></p>
        <p><b>Complaints</b></p>
        <p><b>Date</b></p>
        </div>

<div class="right">
  <p>${name}</p>
  <p>${sn}</p>
  <p>+91 ${number}</p>
  <p>${model}</p>
  <p>${complaints}</p>
  <p>${date||''}</p>
</div>
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
 </div>
`