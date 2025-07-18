// // Smooth Scroll for Navigation Links
// document.querySelectorAll('.nav-links a').forEach(link => {
//     link.addEventListener('click', function (e) {
//       e.preventDefault();
//       const targetId = this.getAttribute('href').substring(1);
//       const targetSection = document.getElementById(targetId);
  
//       window.scrollTo({
//         top: targetSection.offsetTop - 60, // Adjust for sticky navbar
//         behavior: 'smooth',
//       });
//     });
//   });
  

// Smooth Scroll for Navigation Links

// JavaScript code in 'script.js'
document.addEventListener('DOMContentLoaded', function () {
  const steps = document.querySelectorAll('.step');
  steps.forEach(step => {
    step.addEventListener('click', function () {
      window.location.href = 'login.html';  // Redirect to login page
    });
  });
});

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('skin-tone-analysis').addEventListener('click', function() {
    window.location.href = 'skin-tone-analysis.html';
  });
  document.getElementById('face-shape-recognition').addEventListener('click', function() {
    window.location.href = 'face-shape-recognition.html';
  });
  document.getElementById('comprehensive-recommendation').addEventListener('click', function() {
    window.location.href = 'comprehensive-recommendation.html';
  });
  document.getElementById('effortless-experience').addEventListener('click', function() {
    window.location.href = 'effortless-experience.html';
  });
});


document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', function (e) {
    const hrefValue = this.getAttribute('href');
    
    // Check if the link is an internal section link (starts with #)
    if (hrefValue.startsWith('#')) {
      e.preventDefault();
      const targetId = hrefValue.substring(1); // Remove the '#' to get the ID
      const targetSection = document.getElementById(targetId);

      // Smooth scroll to the target section
      if (targetSection) {
        window.scrollTo({
          top: targetSection.offsetTop - 60, // Adjust for sticky navbar
          behavior: 'smooth',
        });
      }
    } else {
      // Allow default navigation for external links
      window.location.href = hrefValue;
    }
  });
});
