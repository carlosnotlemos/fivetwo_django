const scrollAmount = 250;

document.querySelectorAll('.carousel-block').forEach(block => {
  const carouselId = block.dataset.carousel;
  const scrollContainer = document.querySelector(`.carousel-items[data-carousel="${carouselId}"]`);
  const btnPrev = block.querySelector('.btnPrev');
  const btnNext = block.querySelector('.btnNext');
  const progressBar = block.querySelector('.carousel-progress-bar');

  if (!progressBar) return;

  function updateProgress() {
    const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
    let scrollLeft = scrollContainer.scrollLeft;

    // Corrige início e fim para não deixar "resto"
    if (scrollLeft <= 1) scrollLeft = 0;
    if (Math.abs(scrollLeft - maxScroll) <= 1) scrollLeft = maxScroll;

    const percent = (scrollLeft / maxScroll) * 100;
    progressBar.style.width = `${percent}%`;
  }

  // Botões só acionam o scroll animado
  btnPrev.addEventListener('click', () => {
    scrollContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
  });

  btnNext.addEventListener('click', () => {
    scrollContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  });

  // Atualiza a barra continuamente enquanto o scroll acontece
  scrollContainer.addEventListener('scroll', updateProgress);

  // Inicializa a barra
  updateProgress();
});
