const nav = document.getElementById('nav');
window.addEventListener('scroll', () => nav.classList.toggle('up', window.scrollY > 60));

function scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
function toggleNav() { nav.classList.toggle('mob'); }
document.querySelectorAll('.nav-links a').forEach(a => a.addEventListener('click', () => nav.classList.remove('mob')));

function sendWA(e) {
  e.preventDefault();
  const n = document.getElementById('fn').value.trim();
  const p = document.getElementById('ph').value.trim();
  const i = document.getElementById('it').value;
  const m = document.getElementById('mg').value.trim();
  const t = ['Hello Koshalata! 🙏', `Name: ${n}`, `Phone: ${p}`, i ? `Interest: ${i}` : '', m ? `Message: ${m}` : ''].filter(Boolean).join('\n');
  window.open(`https://wa.me/919999999999?text=${encodeURIComponent(t)}`, '_blank');
}

const io = new IntersectionObserver(entries => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) { setTimeout(() => e.target.classList.add('in'), i * 80); io.unobserve(e.target); }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.rv').forEach(el => io.observe(el));
