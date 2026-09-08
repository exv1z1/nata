const glow = document.getElementById('glow');

let x = window.innerWidth / 2;
let y = window.innerHeight / 2;
let targetX = x;
let targetY = y;

window.addEventListener('mousemove', (e) => {
  targetX = e.clientX;
  targetY = e.clientY;
});

window.addEventListener('touchmove', (e) => {
  if (e.touches.length > 0) {
    targetX = e.touches[0].clientX;
    targetY = e.touches[0].clientY;
  }
}, { passive: true });

// Плавное движение пятна
function animate() {
  x += (targetX - x) * 0.12;
  y += (targetY - y) * 0.12;
  const half = glow.offsetWidth / 2;
  glow.style.transform = `translate(${x - half}px, ${y - half}px)`;
  requestAnimationFrame(animate);
}
animate();

// Живой счётчик подписчиков TG: число отдаёт наша серверная функция /api/subs.
// Токена на сайте НЕТ — он лежит в Environment Variables на Vercel.
const subsEl = document.getElementById('subsCount');

async function updateSubs() {
  try {
    const res = await fetch('/api/subs');
    if (!res.ok) return;
    const data = await res.json();
    if (data.count > 0 && subsEl) {
      subsEl.textContent = Number(data.count).toLocaleString('ru-RU');
    }
  } catch (e) {
    // Нет сети — оставляем число-заглушку
  }
}
updateSubs();
setInterval(updateSubs, 60000);
