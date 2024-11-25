window.onload = function() {
    // Hide the content initially while checking the login status
    document.body.style.display = 'none';

    // Check if the user is logged in by verifying the 'loggedIn' flag in localStorage
    const isLoggedIn = localStorage.getItem('loggedIn');

    // If the user is not logged in, log them out, clear localStorage, and redirect to the login page
    if (!isLoggedIn) {
        // Log the user out by clearing the 'loggedIn' flag
        localStorage.removeItem('loggedIn');

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

// Ensure that the login flag is cleared when the page is closed or refreshed
window.onbeforeunload = function() {
    localStorage.removeItem('loggedIn'); // Clear the login flag when window is unloaded
};
