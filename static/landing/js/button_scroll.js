const scrollContainer = document.getElementById('scroll-container');
const btnPrev = document.getElementById('btnPrev');
const btnNext = document.getElementById('btnNext');

// Quanto de pixels você quer que a rolagem avance a cada clique
const scrollAmount = 250;

btnPrev.addEventListener('click', () => {
  scrollContainer.scrollBy({
    left: -scrollAmount,
    behavior: 'smooth'
  });
});

btnNext.addEventListener('click', () => {
  scrollContainer.scrollBy({
    left: scrollAmount,
    behavior: 'smooth'
  });
});