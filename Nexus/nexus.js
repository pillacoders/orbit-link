/* ===== SCROLL REVEAL ===== */
const revealEls = document.querySelectorAll('.reveal-up');
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
revealEls.forEach(el => revealObserver.observe(el));

/* ===== NAVBAR SCROLL ===== */
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 60);
});

/* ===== SMOOTH ANCHOR SCROLL ===== */
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(a.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
});

/* ===== COUNTER ANIMATION ===== */
function formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 10000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    if (n >= 1000) return n.toLocaleString();
    return n.toString();
}

function animateCounter(el) {
    const target = parseInt(el.dataset.target);
    const duration = 2200;
    const start = performance.now();
    function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 4); // ease-out quart
        const current = Math.floor(ease * target);
        el.textContent = formatNumber(current);
        if (progress < 1) requestAnimationFrame(tick);
        else el.textContent = formatNumber(target);
    }
    requestAnimationFrame(tick);
}

const counters = document.querySelectorAll('.counter');
const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });
counters.forEach(c => counterObserver.observe(c));

/* ===== HEX GRID ANIMATION ===== */
const hexCells = document.querySelectorAll('.hex-cell');
if (hexCells.length) {
    setInterval(() => {
        hexCells.forEach(cell => cell.classList.remove('active'));
        const indices = [];
        while (indices.length < 3) {
            const r = Math.floor(Math.random() * hexCells.length);
            if (!indices.includes(r)) indices.push(r);
        }
        indices.forEach(i => hexCells[i].classList.add('active'));
    }, 2500);
}

/* ===== MAGNETIC BUTTONS ===== */
document.querySelectorAll('.btn-solid, .nav-cta').forEach(btn => {
    btn.addEventListener('mousemove', e => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.12}px, ${y * 0.12}px) scale(1.02)`;
    });
    btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
    });
});

/* ===== PARALLAX DOT GRID ===== */
const dotGrid = document.querySelector('.dot-grid');
let ticking = false;
window.addEventListener('scroll', () => {
    if (!ticking) {
        requestAnimationFrame(() => {
            const scrollY = window.scrollY;
            dotGrid.style.transform = `translateY(${scrollY * 0.04}px)`;
            ticking = false;
        });
        ticking = true;
    }
});

/* ===== CURSOR GLOW (subtle) ===== */
const glow = document.createElement('div');
glow.style.cssText = `
    position: fixed; width: 500px; height: 500px; border-radius: 50%;
    background: radial-gradient(circle, rgba(79,125,247,0.04), transparent 70%);
    pointer-events: none; z-index: 1; transform: translate(-50%, -50%);
    transition: left 0.3s ease-out, top 0.3s ease-out;
`;
document.body.appendChild(glow);

document.addEventListener('mousemove', e => {
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
});
