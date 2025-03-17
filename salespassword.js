function togglePrompt(event) {
    event.preventDefault();

    if (sessionStorage.getItem("salesAccess") === "true") {
        window.location.href = "/sales.html";
        return;
    }

    const promptBox = document.querySelector(".password-prompt");
    promptBox.style.display = (promptBox.style.display === "block") ? "none" : "block";

    loadPreviousPasswords(); // Load saved passwords when showing prompt
}

function validatePassword() {
    const password = document.getElementById("password-input").value;
    const correctPassword = "Vanir2025!!";
    document.getElementById("submit-btn").disabled = password !== correctPassword;
}

function checkPassword() {
    const password = document.getElementById("password-input").value;
    const correctPassword = "Vanir2025!!";

    if (password === correctPassword) {
        sessionStorage.setItem("salesAccess", "true");
        savePassword(password); // Save password for future autofill
        window.location.href = "/sales.html";
    } else {
        alert("Incorrect password!");
    }
}

function savePassword(password) {
    let savedPasswords = JSON.parse(localStorage.getItem("savedPasswords")) || [];
    if (!savedPasswords.includes(password)) {
        savedPasswords.push(password);
        localStorage.setItem("savedPasswords", JSON.stringify(savedPasswords));
    }
}

function loadPreviousPasswords() {
    const savedPasswords = JSON.parse(localStorage.getItem("savedPasswords")) || [];
    const container = document.getElementById("previous-passwords");
    container.innerHTML = "";

    savedPasswords.forEach(pass => {
        const link = document.createElement("a");
        link.textContent = pass;
        link.onclick = function () {
            document.getElementById("password-input").value = pass;
            validatePassword(); // Check if the selected password is correct
        };
        container.appendChild(link);
    });
}

document.addEventListener("DOMContentLoaded", function () {
    if (window.location.pathname === "/sales.html") {
        if (sessionStorage.getItem("salesAccess") !== "true") {
            alert("You need to enter the password to access this page.");
            window.location.href = "/index.html";
        }
    }
});