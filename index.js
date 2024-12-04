window.onload = function() {
    // Hide the content initially while checking the login status
    document.body.style.display = 'none';

    // Check if the user is logged in by verifying the 'loggedIn' flag in localStorage or cookies
    const isLoggedIn = localStorage.getItem('loggedIn') || getCookie('loggedIn') === 'true';

    // If the user is not logged in, log them out, clear localStorage, and redirect to the login page
    if (!isLoggedIn) {
        // Clear login status
        localStorage.removeItem('loggedIn');
        document.cookie = "loggedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

        // Show an error message to the user
        const errorMessage = document.createElement('p');
        errorMessage.style.color = 'red';
        errorMessage.textContent = "You must be logged in to access this page.";

        // Append the error message to the body
        document.body.appendChild(errorMessage);

        // Redirect to the login page after 3 seconds
        setTimeout(function() {
            window.location.href = "login.html";
        }, 3000);
    } else {
        // If logged in, proceed with loading the content normally
        console.log("User is logged in.");

        // Show the content after checking login status
        document.body.style.display = 'block';
    }
};

// Function to set a cookie
function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

// Function to get a cookie value
function getCookie(name) {
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookies = decodedCookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        let cookie = cookies[i].trim();
        if (cookie.indexOf(name + "=") === 0) {
            return cookie.substring(name.length + 1);
        }
    }
    return "";
}


// Ensure that the login status is not cleared on page refresh
window.onbeforeunload = function() {
    // Optional: Remove this line if you want to retain the logged-in state
    // localStorage.removeItem('loggedIn');
};