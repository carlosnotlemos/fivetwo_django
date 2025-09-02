// Seleciona todos os cards
const cards = document.querySelectorAll('.card');

cards.forEach(card => {
  const img = card.querySelector('img');
  const hoverSrc = card.querySelector('.hover-src').value;
  const originalSrc = img.src;
  let hoverPreloaded = false;

  // Cria o observer
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !hoverPreloaded) {
        // Pré-carrega a imagem de hover
        const preload = new Image();
        preload.src = hoverSrc;
        hoverPreloaded = true;
        // Não precisa mais observar esse card
        observer.unobserve(card);
      }
    });
  });

  observer.observe(card);

  // Troca de imagem no hover
  card.addEventListener('mouseover', () => {
    img.src = hoverSrc;
  });

  card.addEventListener('mouseout', () => {
    img.src = originalSrc;
  });
});
