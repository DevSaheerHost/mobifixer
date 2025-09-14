export const cardLayout=({name, status, number, complaints, sn})=>`
  <div class="flex">
          
       
        <div class="left">
                  <p><b>Name</b></p>
        <p><b>SN</b></p>
        <p><b>Number</b></p>
        <p><b>Complaints</b></p>
        </div>

<div class="right">
  <p>${name}</p>
  <p>${sn}</p>
  <p>+91 ${number}</p>
  <p>${complaints}</p>
</div>
 </div>
 
 <div class="status">
<span>
     <input type="radio" ${status==='pending'? 'checked':''} name="status-${sn}" id="pending-${sn}" />
   <label for="pending-${sn}">Pending</label>
</span>

<span>
     <input type="radio" ${status==='in progress'? 'checked':''} name="status-${sn}" id="progress-${sn}" />
   <label for="progress-${sn}">In Progress</label>
</span>

<span>
  <input type="radio" ${status==='done'? 'checked':''} name="status-${sn}" id="done-${sn}" />
  <label for="done-${sn}">Done</label>
</span>
 </div>
`