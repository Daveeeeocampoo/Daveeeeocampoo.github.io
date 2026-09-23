const menuButton = document.getElementById("menu-button");
const navigation = document.getElementById("nav-links");
const navigationLinks = document.querySelectorAll(".nav-links a");
const currentYear = document.getElementById("current-year");
const themePicker = document.querySelector(".theme-picker");
const themeToggle = document.getElementById("theme-toggle");
const themeMenu = document.getElementById("theme-menu");
const themeOptions = document.querySelectorAll(".theme-option");
const availableThemes = ["red", "pink", "blue", "green", "purple"];
const themeStorageKey = "portfolio-theme";

function setNavigationOpen(isOpen) {
    navigation.classList.toggle("open", isOpen);
    menuButton.textContent = isOpen ? "✕" : "☰";
    menuButton.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
    menuButton.setAttribute("aria-expanded", String(isOpen));
}

function setThemeMenuOpen(isOpen) {
    themeMenu.hidden = !isOpen;
    themeToggle.setAttribute("aria-expanded", String(isOpen));
}

function applyTheme(theme, savePreference) {
    const selectedTheme = availableThemes.includes(theme) ? theme : "blue";

    document.documentElement.dataset.theme = selectedTheme;

    themeOptions.forEach(function (option) {
        option.setAttribute("aria-pressed", String(option.dataset.theme === selectedTheme));
    });

    if (savePreference) {
        try {
            localStorage.setItem(themeStorageKey, selectedTheme);
        } catch (error) {
            // The theme still applies for this visit if storage is unavailable.
        }
    }
}

menuButton.addEventListener("click", function () {
    setThemeMenuOpen(false);
    setNavigationOpen(!navigation.classList.contains("open"));
});

navigationLinks.forEach(function (link) {
    link.addEventListener("click", function () {
        setNavigationOpen(false);
    });
});

themeToggle.addEventListener("click", function () {
    const shouldOpen = themeMenu.hidden;

    setNavigationOpen(false);
    setThemeMenuOpen(shouldOpen);
});

themeOptions.forEach(function (option) {
    option.addEventListener("click", function () {
        applyTheme(option.dataset.theme, true);
        setThemeMenuOpen(false);
        themeToggle.focus();
    });
});

document.addEventListener("click", function (event) {
    if (!themePicker.contains(event.target)) {
        setThemeMenuOpen(false);
    }
});

document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        const themeMenuWasOpen = !themeMenu.hidden;

        setThemeMenuOpen(false);
        setNavigationOpen(false);

        if (themeMenuWasOpen) {
            themeToggle.focus();
        }
    }
});

window.addEventListener("resize", function () {
    if (window.innerWidth > 650) {
        setNavigationOpen(false);
    }
});

applyTheme(document.documentElement.dataset.theme || "blue", false);

currentYear.textContent = new Date().getFullYear();
