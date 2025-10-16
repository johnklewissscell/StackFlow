// homepage.js - simple client helpers for the public homepage
document.addEventListener('DOMContentLoaded', () => {
  function goToApp(e) {
    try { sessionStorage.setItem('fromHomepage', '1') } catch (e) {}
  // navigate to the main app page
  window.location.href = '/app.html'
  }

  ['login-btn', 'signup-btn', 'start-btn'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.addEventListener('click', goToApp)
  })});
