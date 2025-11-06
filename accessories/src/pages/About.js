import Card from "../components/Card.js";
import Button from "../ui/Button.js";
import showToast from "../ui/toast.js";

export default function About() {
  const section = document.createElement("section");
  section.className = "about-page";

  section.innerHTML = `
    <h2>About MobiFixer</h2>
    <p>We specialize in mobile repair, service tracking, and smart inventory management.</p>
  `;

  const card = Card({
    title: "Our Vision",
    content: "To redefine mobile service experience with technology and transparency.",
  });

  const btn = Button({
    label: "Contact Us",
    onClick: () => showToast("📞 Call us at +91 98765 43210!", "success"),
  });
  
  
  
  const aboutCard = Card({
  title: "Our Services",
  content: "We handle all types of mobile board-level repairs.",
  button: {
    label: "Learn More",
    onClick: () => showToast("Just letting you know...", "info"),
  },
});

const infoCard = Card({
  title: "Experience",
  content: "Over 5 years in mobile service and tech solutions.",
});




//showToast("Something went wrong!", "error");
//showToast("Just letting you know...", "info");
//showToast("Check your inputs", "warning");

  section.append(card, btn, aboutCard, infoCard);
  return section;
}