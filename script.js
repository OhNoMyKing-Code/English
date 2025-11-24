// Simple mobile nav toggle & year
document.addEventListener('DOMContentLoaded', function(){
  const navToggle = document.getElementById('nav-toggle');
  const navLinks = document.getElementById('nav-links');
  navToggle && navToggle.addEventListener('click', () => {
    navLinks.classList.toggle('show');
  });

  const y = document.getElementById('year');
  if(y) y.textContent = new Date().getFullYear();
});
