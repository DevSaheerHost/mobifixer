export const inventoryCard = ({ prodName, prodModel, prodCategory, prodQuantity }) => {

  const icons = {
    ringer: "fa-volume-off",
    earpiece: "fa-phone",
    display: "fa-mobile-button",
    pouch: "fa-bag-shopping",
    mic:'fa-microphone'
  };

  const iconClass = icons[prodCategory?.toLowerCase()] || "fa-box"; // default icon

  return `
    <div class="img_container">
      <i class="fa-solid ${iconClass}"></i>
    </div>

    <div class="middle_container">
      <h4 class='${prodQuantity<=2?"low":""}'>${prodName}</h4>
      <div class="category_qty_container">
        <span>
          <p>${prodCategory}</p>
          <p>${prodModel}</p>
        </span>
        <p class="qty ${prodQuantity<=2?"low":""}">${prodQuantity} PCS</p>
      </div>
    </div>
  `;
};