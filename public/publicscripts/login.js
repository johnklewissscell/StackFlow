document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.success) {
      window.location.href = "/app.html"; // redirect to app
    } else {
      alert(data.error || "Login failed");
    }
  } catch (err) {
    console.error("Login fetch error:", err);
    alert("Server error. Try again.");
  }
});
