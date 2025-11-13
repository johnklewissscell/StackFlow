// homepage.js - simple client helpers for the public homepage
document.addEventListener('DOMContentLoaded', () => {
  function goToApp(e) {
    try { sessionStorage.setItem('fromHomepage', '1') } catch (e) {}
  // navigate to the main app page
  window.location.href = '/app.html'
  }

  function goToLogin(e) {
    try { sessionStorage.setItem('fromHomepage', '1') } catch (e) {}
    // navigate to the login page
    window.location.href = '/login.html'
  }

  function goToSignup(e) {
    try { sessionStorage.setItem('fromHomepage', '1') } catch (e) {}
    // navigate to the signup page
    window.location.href = '/signup.html'
  }

  document.getElementById('login-btn').addEventListener('click', goToLogin);
  document.getElementById('signup-btn').addEventListener('click', goToSignup);
  document.getElementById('start-btn').addEventListener('click', goToApp);
});
