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
      <h4>${prodName}</h4>
      <div class="category_qty_container">
        <span>
          <p>${prodCategory}</p>
          <p>${prodModel}</p>
        </span>
        <p class="qty">${prodQuantity} PCS</p>
      </div>
    </div>
  `;
};