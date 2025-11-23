document.addEventListener('DOMContentLoaded', function () {
            const login = document.getElementById('login-btn');
            const signup = document.getElementById('signup-btn');
            if (login) login.addEventListener('click', () => { window.location.href = '/login.html' });
            if (signup) signup.addEventListener('click', () => { window.location.href = '/signup.html' });
        });

document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!username || !email || !password) {
    alert("Please fill in all fields");
    return;
  }

  // Get existing users from localStorage
  const users = JSON.parse(localStorage.getItem("stackflow_users") || "{}");

  // Check if username or email already exists
  if (users[username]) {
    alert("Username already exists");
    return;
  }

  if (Object.values(users).some(u => u.email === email)) {
    alert("Email already in use");
    return;
  }

  // Add new user
  users[username] = { email, password };
  localStorage.setItem("stackflow_users", JSON.stringify(users));

  alert("Signup successful! You can now log in.");
  window.location.href = "/login.html";
});
