function togglePrompt(event) {
    event.preventDefault(); // Prevent default link behavior
    const promptBox = document.querySelector(".password-prompt");

    // Toggle display
    promptBox.style.display = (promptBox.style.display === "block") ? "none" : "block";
}

function validatePassword() {
    const password = document.getElementById("password-input").value;
    const correctPassword = "Vanir2025!!"; 
    const submitBtn = document.getElementById("submit-btn");

    // Enable the button only if the correct password is entered
    submitBtn.disabled = password !== correctPassword;
}

function checkPassword() {
    const password = document.getElementById("password-input").value;
    const correctPassword = "Vanir2025!!"; 

    if (password === correctPassword) {
        window.location.href = "/sales.html";
    } else {
        alert("Incorrect password!");
    }
}
