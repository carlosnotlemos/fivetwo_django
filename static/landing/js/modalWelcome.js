document.addEventListener("DOMContentLoaded", function () {
  if (!sessionStorage.getItem("welcomeShown")) {
    var welcomeModal = new bootstrap.Modal(document.getElementById('welcomeModal'));
    welcomeModal.show();
    sessionStorage.setItem("welcomeShown", "true");
  }
});
