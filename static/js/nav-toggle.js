document.querySelectorAll('.nav-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const nav = btn.closest('.navbar');
    nav.classList.toggle('nav-open');
  });
});
