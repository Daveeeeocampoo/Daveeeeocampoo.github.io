const menuButton = document.getElementById("menu-button");
const navigation = document.getElementById("nav-links");
const navigationLinks = document.querySelectorAll(".nav-links a");
const currentYear = document.getElementById("current-year");

menuButton.addEventListener("click", function () {
    navigation.classList.toggle("open");

    if (navigation.classList.contains("open")) {
        menuButton.textContent = "✕";
        menuButton.setAttribute("aria-label", "Close navigation menu");
    } else {
        menuButton.textContent = "☰";
        menuButton.setAttribute("aria-label", "Open navigation menu");
    }
});

navigationLinks.forEach(function (link) {
    link.addEventListener("click", function () {
        navigation.classList.remove("open");
        menuButton.textContent = "☰";
        menuButton.setAttribute("aria-label", "Open navigation menu");
    });
});

currentYear.textContent = new Date().getFullYear();
