export const searchPouchCard =({prodPosition, prodName, prodCategory, prodModel, prodQuantity, sn})=>`
   <div class="img_container">
   ${prodPosition|| `<i class="fa-solid fa-mobile-button"></i>
`}
    </div>
    
    <div class="middle_container">
      <h4>${prodName}</h4>
      <div class="category_qty_container">
        <span>
          <p>${prodCategory}</p>
          <p>${prodModel}</p>
          <p>ID: ${sn}</p>
        </span>
        <p class="qty">${prodQuantity} PCS</p>
      </div>
          <div class='btn_wrap'>
    <button data-id='${sn}' class='decrease'><i class="fa-solid fa-cart-shopping"></i></button>
    <button data-id='${sn}' class='increase'><i class="fa-solid fa-store"></i></button>
    </div>
    </div>
    

`