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

const WA_SVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

const io = new IntersectionObserver(entries => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) { setTimeout(() => e.target.classList.add('in'), i * 80); io.unobserve(e.target); }
  });
}, { threshold: 0.08 });

function observeNew(el) { io.observe(el); }
document.querySelectorAll('.rv').forEach(el => io.observe(el));

function formatPrice(price, originalPrice) {
  if (originalPrice) return `<s>₹${Number(originalPrice).toLocaleString('en-IN')}</s> ₹${Number(price).toLocaleString('en-IN')}`;
  return `₹${Number(price).toLocaleString('en-IN')}`;
}

function buildCard(saree) {
  const card = document.createElement('div');
  card.className = 'prod-card rv';
  const waLink = `https://wa.me/919999999999?text=${encodeURIComponent(saree.wa_message || `Hello Koshalata, I'm interested in the ${saree.name}.`)}`;
  card.innerHTML = `
    <div class="prod-card-img">
      ${saree.badge ? `<span class="prod-badge">${saree.badge}</span>` : ''}
      <img src="${saree.image_url}" alt="${saree.name}" loading="lazy"/>
      <div class="prod-veil"></div>
      <div class="prod-corners"></div>
      <div class="prod-over">
        <p class="prod-type">${saree.type}</p>
        <h3 class="prod-name">${saree.name}</h3>
        <p class="prod-price">${formatPrice(saree.price, saree.original_price)}</p>
      </div>
      <a class="prod-enquire" href="${waLink}" target="_blank" rel="noopener">
        ${WA_SVG} Enquire on WhatsApp
      </a>
    </div>`;
  return card;
}

async function loadSarees() {
  const grid = document.getElementById('prod-grid');
  try {
    const res = await fetch('/api/sarees');
    if (!res.ok) throw new Error('Failed to load');
    const sarees = await res.json();
    grid.innerHTML = '';
    if (sarees.length === 0) {
      grid.innerHTML = '<p style="color:var(--cr);text-align:center;padding:2rem">No sarees listed yet.</p>';
      return;
    }
    sarees.forEach(s => {
      const card = buildCard(s);
      grid.appendChild(card);
      observeNew(card);
    });
  } catch {
    grid.innerHTML = '<p style="color:var(--cr);text-align:center;padding:2rem">Could not load sarees. Please refresh.</p>';
  }
}

loadSarees();
