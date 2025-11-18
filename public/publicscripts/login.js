document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("login-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!username || !password) {
      alert("Please fill in all fields");
      return;
    }

    // Get registered users from localStorage
    const users = JSON.parse(localStorage.getItem("stackflow_users") || "{}");

    // Check if user exists and password matches
    if (users[username] && users[username].password === password) {
      // Store username for the app page
      sessionStorage.setItem("currentUser", username);
      window.location.href = "/app.html";
    } else {
      alert("Invalid username or password");
    }
  });
});
