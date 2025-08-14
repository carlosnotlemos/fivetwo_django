document.addEventListener('DOMContentLoaded', () => {
  const items = document.querySelectorAll('#carouselSugestions .row > li');
  const mediaQuery = window.matchMedia('(max-width: 767px)');

  function updateCarouselClasses(e) {
    items.forEach((item, index) => {
      item.classList.toggle('carousel-item', e.matches);
    });
  }

  // Inicializa
  updateCarouselClasses(mediaQuery);

  // Escuta mudanças de tamanho
  mediaQuery.addEventListener('change', updateCarouselClasses);
});