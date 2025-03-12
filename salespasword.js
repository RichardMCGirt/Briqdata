function togglePrompt(event) {
    event.preventDefault(); // Prevent default link behavior
    const promptBox = document.querySelector(".password-prompt");

    // Toggle display
    promptBox.style.display = (promptBox.style.display === "block") ? "none" : "block";
}

function validatePassword() {
    const password = document.getElementById("password-input").value;
    const correctPassword = "sales"; // Change this to your actual password
    const submitBtn = document.getElementById("submit-btn");

    // Enable the button only if the correct password is entered
    submitBtn.disabled = password !== correctPassword;
}

function checkPassword() {
    const password = document.getElementById("password-input").value;
    const correctPassword = "sales"; 

    if (password === correctPassword) {
        window.location.href = "/nolabor.html";
    } else {
        alert("Incorrect password!");
    }
}