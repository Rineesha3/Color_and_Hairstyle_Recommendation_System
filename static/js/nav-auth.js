(function () {
  fetch('/api/session', { credentials: 'same-origin' })
    .then((res) => res.json())
    .then((data) => {
      if (!data.loggedIn) return;
      document.querySelectorAll('[data-auth="guest-only"]').forEach((el) => el.remove());
      document.querySelectorAll('[data-auth="user-only"]').forEach((el) => {
        el.hidden = false;
      });
      if (data.username) {
        document.querySelectorAll('.nav-username').forEach((el) => {
          el.textContent = data.username;
        });
      }
    })
    .catch(() => {});
})();
