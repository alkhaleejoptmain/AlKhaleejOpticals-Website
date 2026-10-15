(function () {
    /* Hero auto-slide */
    const heroSlides = document.querySelectorAll(".hero-slide-bg");
    const heroDotsEl = document.getElementById("heroDots");
    let heroIndex = 0;

    if (heroSlides.length && heroDotsEl) {
        heroSlides.forEach((_, i) => {
            const dot = document.createElement("button");
            dot.type = "button";
            dot.setAttribute("aria-label", `Slide ${i + 1}`);
            if (i === 0) dot.classList.add("active");
            dot.addEventListener("click", () => goHero(i));
            heroDotsEl.appendChild(dot);
        });

        const heroDots = heroDotsEl.querySelectorAll("button");

        function goHero(index) {
            heroSlides[heroIndex].classList.remove("active");
            heroDots[heroIndex]?.classList.remove("active");
            heroIndex = index;
            heroSlides[heroIndex].classList.add("active");
            heroDots[heroIndex]?.classList.add("active");
        }

        setInterval(() => goHero((heroIndex + 1) % heroSlides.length), 5500);
    }

    /* Stats counter */
    function animateCounter(el) {
        const target = parseInt(el.dataset.target, 10);
        const suffix = el.dataset.suffix || "";
        const duration = 1800;
        const start = performance.now();

        function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.floor(target * eased).toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
    }

    const statObserver = new IntersectionObserver(
        (entries, obs) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                animateCounter(entry.target);
                obs.unobserve(entry.target);
            });
        },
        { threshold: 0.4 }
    );

    document.querySelectorAll(".stat-number").forEach((el) => statObserver.observe(el));

    /* Testimonials slider */
    const viewport = document.getElementById("testimonialViewport");
    const track = document.getElementById("testimonialTrack");
    const prevBtn = document.getElementById("testimonialPrev");
    const nextBtn = document.getElementById("testimonialNext");
    if (!viewport || !track) return;

    const testimonials = [
        { text: '"Professional team and excellent frame collection. My family has been coming here for years."', author: "— Fatima A." },
        { text: '"Excellent service, professional staff, and a fantastic collection of original branded eyewear. Highly recommended."', author: "— Ahmed R." },
        { text: '"Quick eye test for my driving license and great advice on lenses. Very satisfied."', author: "— Khalid M." },
        { text: '"The AI frame finder helped me pick the perfect style. Great experience from start to finish."', author: "— Sara K." },
        { text: '"Corporate insurance process was smooth. Our entire team got tested efficiently."', author: "— Omar H." },
        { text: '"Best optical shop in RAK. Genuine brands and fair prices. Staff are always helpful."', author: "— Mariam S." },
        { text: '"My children got their first glasses here. The optometrist was patient and thorough."', author: "— Hassan Y." },
        { text: '"Fast repair on my broken frame. They adjusted my glasses perfectly in minutes."', author: "— Layla N." },
        { text: '"Wide selection of sunglasses and prescription frames. Found exactly what I wanted."', author: "— Rashid A." },
        { text: '"Insurance claim was handled without hassle. Very professional from start to finish."', author: "— Noor K." },
        { text: '"Blue-light lenses made a huge difference for my office work. Highly recommend."', author: "— James T." }
    ];

    track.innerHTML = testimonials
        .map(
            (t) => `
        <article class="testimonial-card">
            <p class="testimonial-text">${t.text}</p>
            <p class="testimonial-author">${t.author}</p>
        </article>`
        )
        .join("");

    let activeIndex = 0;
    let slideTimer;

    function updateCardStates() {
        track.querySelectorAll(".testimonial-card").forEach((card, i) => {
            const dist = Math.abs(i - activeIndex);
            card.classList.remove("is-center", "is-side", "is-far");
            if (dist === 0) card.classList.add("is-center");
            else if (dist === 1) card.classList.add("is-side");
            else card.classList.add("is-far");
        });
    }

    function positionTrack(animate) {
        const list = [...track.querySelectorAll(".testimonial-card")];
        if (!list.length) return;

        const cardWidth = list[0].offsetWidth;
        const gap = 28;
        const offset = activeIndex * (cardWidth + gap);
        const centerOffset = (viewport.offsetWidth - cardWidth) / 2;

        track.style.transition = animate ? "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)" : "none";
        track.style.transform = `translateX(${centerOffset - offset}px)`;
        updateCardStates();
    }

    function goTo(index) {
        activeIndex = (index + testimonials.length) % testimonials.length;
        positionTrack(true);
    }

    function startAutoSlide() {
        clearInterval(slideTimer);
        slideTimer = setInterval(() => goTo(activeIndex + 1), 4500);
    }

    prevBtn?.addEventListener("click", () => {
        goTo(activeIndex - 1);
        startAutoSlide();
    });

    nextBtn?.addEventListener("click", () => {
        goTo(activeIndex + 1);
        startAutoSlide();
    });

    positionTrack(false);
    startAutoSlide();
    window.addEventListener("resize", () => positionTrack(false));
    viewport.addEventListener("mouseenter", () => clearInterval(slideTimer));
    viewport.addEventListener("mouseleave", startAutoSlide);
})();
