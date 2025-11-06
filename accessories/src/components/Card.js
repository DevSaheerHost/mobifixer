

import Button from "../ui/Button.js";

export default function Card({ title, content, button }) {
  const div = document.createElement("div");
  div.className = "card";

  const h3 = document.createElement("h3");
  h3.textContent = title;

  const p = document.createElement("p");
  p.innerHTML = content;

  div.append(h3, p);

  if (button) {
    div.append(Button(button)); // uses your reusable Button component
  }

  return div;
}