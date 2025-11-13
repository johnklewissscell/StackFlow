document.getElementById("signup-form").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
    });

    const data = await res.json();

    if (data.success) {
      alert("Signup successful! You can now log in.");
      window.location.href = "/login.html";
    } else {
      alert(data.error || "Signup failed");
    }
  } catch (err) {
    console.error("Signup fetch error:", err);
    alert("Server error. Try again.");
  }
});
