const scrollAmount = 250;

// Seleciona todos os blocos de carrossel
document.querySelectorAll('.carousel-block').forEach(block => {
  const carouselId = block.dataset.carousel; // pega o valor do data-carousel

  // Seleciona os elementos correspondentes com o mesmo data-carousel
  const scrollContainer = document.querySelector(`.carousel-items[data-carousel="${carouselId}"]`);
  const btnPrev = block.querySelector('.btnPrev');
  const btnNext = block.querySelector('.btnNext');

  // Adiciona os eventos de scroll
  btnPrev.addEventListener('click', () => {
    scrollContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  });

  btnNext.addEventListener('click', () => {
    scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  });
});
