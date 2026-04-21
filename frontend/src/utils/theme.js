// utils/theme.js

export function toggleTheme() {
  const html = document.documentElement;   // THIS was missing

  html.classList.toggle("light");

  const mode = html.classList.contains("light") ? "light" : "dark";
  localStorage.setItem("theme", mode);
}

export function loadTheme() {
  const saved = localStorage.getItem("theme");

  if (saved === "light") {
    document.documentElement.classList.add("light");
  }
}
