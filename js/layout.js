(function () {
    function setActiveNav() {
        const page = document.body.dataset.navSection || window.location.pathname.split("/").pop() || "index.html";
        document.querySelectorAll(".site-nav a[data-nav]").forEach((link) => {
            const on = link.dataset.nav === page;
            link.classList.toggle("active", on);
            if (on) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
        });
    }

    function initMobileNav() {
        const toggle = document.querySelector(".nav-toggle");
        const nav = document.getElementById("siteNav");
        if (!toggle || !nav) return;

        let backdrop = document.querySelector(".nav-backdrop");
        if (!backdrop) {
            backdrop = document.createElement("div");
            backdrop.className = "nav-backdrop";
            document.body.appendChild(backdrop);
        }

        function setOpen(open) {
            nav.classList.toggle("open", open);
            toggle.classList.toggle("active", open);
            backdrop.classList.toggle("show", open);
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
            toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        }

        toggle.addEventListener("click", () => setOpen(!nav.classList.contains("open")));
        backdrop.addEventListener("click", () => setOpen(false));

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") setOpen(false);
        });

        nav.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => setOpen(false));
        });
    }

    /* Floating WhatsApp button + back-to-top */
    function initFloatingButtons() {
        if (document.querySelector(".whatsapp-fab")) return;

        const whatsapp = document.createElement("a");
        whatsapp.className = "whatsapp-fab";
        whatsapp.href = "https://wa.me/971567743136?text=" + encodeURIComponent("Hi Al Khaleej Opticals, I'd like to know more.");
        whatsapp.target = "_blank";
        whatsapp.rel = "noopener noreferrer";
        whatsapp.setAttribute("aria-label", "Chat with us on WhatsApp");
        whatsapp.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.02 2.67C8.62 2.67 2.62 8.67 2.62 16.07c0 2.53.68 4.9 1.87 6.94L2.5 29.33l6.5-1.9a13.3 13.3 0 0 0 7.02 1.98c7.4 0 13.4-6 13.4-13.4s-6-13.34-13.4-13.34zm7.83 19.15c-.33.93-1.9 1.75-2.62 1.83-.7.08-1.5.34-4.97-1.04-4.18-1.67-6.88-5.9-7.1-6.18-.2-.28-1.7-2.26-1.7-4.32s1.08-3.07 1.46-3.49c.38-.42.83-.52 1.1-.52.28 0 .55 0 .8.01.26.02.6-.1.94.72.33.8 1.13 2.77 1.23 2.97.1.2.16.44.03.7-.13.28-.2.44-.4.68-.2.24-.42.53-.6.71-.2.2-.4.42-.18.82.23.4 1 1.66 2.16 2.7 1.48 1.32 2.73 1.73 3.13 1.92.4.2.63.17.86-.1.24-.27 1-1.17 1.27-1.57.27-.4.54-.33.9-.2.37.13 2.35 1.1 2.75 1.31.4.2.66.3.76.47.1.18.1 1-.23 1.9z"/></svg>';
        document.body.appendChild(whatsapp);

        const backToTop = document.createElement("button");
        backToTop.type = "button";
        backToTop.className = "back-to-top";
        backToTop.setAttribute("aria-label", "Back to top");
        backToTop.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>';
        backToTop.addEventListener("click", () => {
            window.scrollTo({ top: 0, behavior: "smooth" });
        });
        document.body.appendChild(backToTop);

        window.addEventListener(
            "scroll",
            () => {
                backToTop.classList.toggle("show", window.scrollY > 500);
            },
            { passive: true }
        );
    }

    /* Scroll-triggered reveal animations, applied automatically to shared layout patterns */
    function initScrollReveal() {
        const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        document
            .querySelectorAll(".section > .container > .kicker, .section > .container > h2")
            .forEach((el) => el.classList.add("reveal"));

        document
            .querySelectorAll(
                ".about-grid, .why-grid, .corp-split, .local-grid, .proposal-grid, .brand-intro, .services-why-grid, .competence-grid, .about-intro-grid, .contact-map-form, .inner-hero-grid"
            )
            .forEach((grid) => {
                const kids = [...grid.children];
                if (kids[0]) kids[0].classList.add("reveal", "reveal-left");
                if (kids[1]) kids[1].classList.add("reveal", "reveal-right");
            });

        document
            .querySelectorAll(
                ".services-grid, .corp-services-grid, .industry-grid, .process-steps, .brand-cards, .values-row, .why-points, .about-list, .check-grid, .brand-logo-grid, .insurance-logo-grid, .service-tiles, .benefits-grid, .results-grid, .contact-cards, .collection-grid, .branch-grid, .product-grid, .why-mini, .related-brands, .shape-strip, .corp-chips, .area-chips, .faq-list"
            )
            .forEach((group) => group.classList.add("reveal-group"));

        document
            .querySelectorAll(".corp-cta, .about-visual, .legal-container, .stats-box, .corp-benefits-table, .ai-studio-grid, .tryon-layout")
            .forEach((el) => el.classList.add("reveal"));

        const targets = document.querySelectorAll(".reveal, .reveal-group");

        if (reduceMotion || !("IntersectionObserver" in window)) {
            targets.forEach((t) => t.classList.add("is-visible"));
            return;
        }

        // Elements already in (or near) the viewport at load time are shown instantly —
        // only content revealed by scrolling should animate in, avoiding a flash of
        // invisible content on above-the-fold sections.
        const vh = window.innerHeight;
        const toObserve = [];
        targets.forEach((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.top < vh * 0.92 && rect.bottom > 0) {
                el.classList.add("is-visible");
            } else {
                toObserve.push(el);
            }
        });

        if (!toObserve.length) return;

        const io = new IntersectionObserver(
            (entries, obs) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add("is-visible");
                    obs.unobserve(entry.target);
                });
            },
            { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
        );

        toObserve.forEach((t) => io.observe(t));
    }

    async function injectPartials() {
        const mounts = [[document.getElementById("site-header"), "components/header.html"], [document.getElementById("site-footer"), "components/footer.html"]];
        for (const [mount, url] of mounts) {
            if (!mount) continue;
            try {
                const res = await fetch(url);
                if (res.ok) mount.outerHTML = await res.text();
            } catch { /* header/footer are normally baked in by tools/build.mjs */ }
        }
        setActiveNav();
        initMobileNav();
        initFloatingButtons();
        initScrollReveal();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", injectPartials);
    } else {
        injectPartials();
    }
})();
