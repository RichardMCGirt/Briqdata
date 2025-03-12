function checkPassword() {
    const password = document.getElementById("password-input").value;
    const correctPassword = "sales"; // Change this to your actual password

    if (password === correctPassword) {
        window.location.href = "/nolabor.html";
    } else {
        alert("Incorrect password!");
    }
}