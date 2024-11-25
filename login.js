function validateLogin() {
    const password = document.getElementById('password').value.trim(); // Get the entered password
    const errorMessage = document.getElementById('error-message'); // Error message container

    // Check if the entered password is "Vanir"
    if (password === "Vanir") {
        // Redirect to index.html if correct
        window.location.href = "index.html";
    } else {
        // Show error message if incorrect
        errorMessage.textContent = "Incorrect password.'.";
    }
}
// Function to enable or disable the login button based on input field
function toggleButton() {
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');

    // Enable the button if there's text in the input field, otherwise disable it
    if (passwordInput.value.trim() !== '') {
        loginButton.disabled = false;
    } else {
        loginButton.disabled = true;
    }
}

// Function to validate the login input
function validateLogin() {
    const password = document.getElementById('password').value.trim();
    const errorMessage = document.getElementById('error-message'); // Error message container

    // Check if the entered password is "Vanir"
    if (password === "Vanir") {
        // Set the loggedIn flag in localStorage and redirect to index.html
        localStorage.setItem('loggedIn', 'true');
        window.location.href = "index.html";
    } else {
        // Show error message if incorrect
        errorMessage.textContent = "Incorrect password. Please enter 'Vanir'.";
    }
}
