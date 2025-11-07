import Card from "../components/Card.js";

export default function Home() {
  const page = document.createElement("section");
  page.className = "home";

  const title = document.createElement("h2");
  title.textContent = "Home";
  page.append(title);

  const cards = [
    {
      title: "iPhone 15 Pro",
      content: "Latest Apple flagship with A17 Pro chip.",
      image: "https://via.placeholder.com/300x180?text=iPhone+15+Pro",
    },
    {
      title: "Samsung S24 Ultra",
      content: "Powerful Android phone with 200MP camera.",
      image: "https://via.placeholder.com/300x180?text=Galaxy+S24+Ultra",
    },
  ];

  cards.forEach((data) => {
    const card = Card({
      ...data,
      onAction: () => alert(`Clicked: ${data.title}`),
    });
    page.append(card);
  });

  return page;
}