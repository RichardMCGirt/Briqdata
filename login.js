// Validate login and set cookies for session persistence
function validateLogin() {
    const password = document.getElementById('password').value.trim();
    const errorMessage = document.getElementById('error-message'); // Error message container

    // Check if the entered password is "Vanir"
    if (password === "Vanir") {
        // Set the loggedIn flag in localStorage and as a cookie
        localStorage.setItem('loggedIn', 'true');
        setCookie('loggedIn', 'true', 7); // Cookie lasts for 7 days
        window.location.href = "index.html";
    } else {
        // Show error message if incorrect
        errorMessage.textContent = "Incorrect password. Please enter 'Vanir'.";
    }
}

// Function to enable or disable the login button based on input field
function toggleButton() {
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-button');

    // Enable the button if there's text in the input field, otherwise disable it
    loginButton.disabled = passwordInput.value.trim() === '';
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
