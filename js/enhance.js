/* Al Khaleej Opticals — UI behaviour: scroll effects, open-now badge, brand filter,
   mobile action bar, hardened forms. No dependencies. */
(function () {
    "use strict";

    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const PHONE = "+971567743136";
    const EMAIL = "alkhaleejoptmain@gmail.com";

    function ready(fn) {
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
        else fn();
    }

    /* Image fallbacks (replaces inline onerror attributes, which our CSP blocks) */
    function initImageFallbacks() {
        document.querySelectorAll("img[data-fallback]").forEach((img) => {
            const swap = () => {
                const fb = img.getAttribute("data-fallback");
                if (fb && img.getAttribute("src") !== fb) img.src = fb;
            };
            img.addEventListener("error", swap, { once: true });
            if (img.complete && img.naturalWidth === 0) swap();
        });
    }

    /* Header state and banner parallax — one rAF-throttled handler */
    function initScrollEffects() {

        const banner = document.querySelector(".page-banner-bg");
        let ticking = false;

        function update() {
            ticking = false;
            const y = window.scrollY;
            const header = document.querySelector(".site-header");
            if (header) header.classList.toggle("is-scrolled", y > 24);
            if (banner && !reduceMotion && y < 900) banner.style.setProperty("--py", Math.round(y * 0.18) + "px");
        }

        window.addEventListener("scroll", () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        }, { passive: true });
        update();
    }

    /* Cursor-follow highlight on cards (desktop pointers only) */
    function initSpotlight() {
        if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || reduceMotion) return;
        document.addEventListener("pointermove", (e) => {
            const card = e.target.closest && e.target.closest(".service-card, .corp-service-card, .collection-card, .branch-card, .industry-card, .process-step, .value-item, .local-card");
            if (!card) return;
            const r = card.getBoundingClientRect();
            card.style.setProperty("--mx", e.clientX - r.left + "px");
            card.style.setProperty("--my", e.clientY - r.top + "px");
        }, { passive: true });
    }

    /* "Open now" badge, computed in UAE time regardless of the visitor's timezone */
    function initOpenNow() {
        const badges = document.querySelectorAll("[data-open-now]");
        if (!badges.length) return;

        // Sat–Thu 09:00–23:00, Fri 16:00–23:00  (0 = Sunday … 5 = Friday, 6 = Saturday)
        const hours = (day) => (day === 5 ? [16, 23] : [9, 23]);
        const fmt = (h) => (h > 12 ? h - 12 : h) + ":00 " + (h >= 12 ? "PM" : "AM");

        function dubaiNow() {
            try {
                const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dubai", weekday: "short", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date());
                const get = (t) => parts.find((p) => p.type === t).value;
                const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
                return { day, mins: (parseInt(get("hour"), 10) % 24) * 60 + parseInt(get("minute"), 10) };
            } catch (e) {
                return null;
            }
        }

        function render() {
            const now = dubaiNow();
            badges.forEach((el) => {
                if (!now) {
                    el.textContent = "Sat–Thu 9 AM–11 PM · Fri 4 PM–11 PM";
                    return;
                }
                const [open, close] = hours(now.day);
                el.classList.remove("is-open", "is-closed");
                if (now.mins >= open * 60 && now.mins < close * 60) {
                    el.classList.add("is-open");
                    el.textContent = "Open now · closes " + fmt(close);
                } else {
                    el.classList.add("is-closed");
                    if (now.mins < open * 60) el.textContent = "Closed now · opens today at " + fmt(open);
                    else el.textContent = "Closed now · opens tomorrow at " + fmt(hours((now.day + 1) % 7)[0]);
                }
            });
        }
        render();
        setInterval(render, 60000);
    }

    /* Brand filter + search (brands.html) */
    function initBrandFilter() {
        const grid = document.getElementById("brandCards");
        if (!grid) return;
        const cards = [...grid.querySelectorAll(".brand-card")];
        const pills = [...document.querySelectorAll(".brand-filter .pill")];
        const search = document.getElementById("brandSearch");
        const empty = document.getElementById("brandEmpty");
        let filter = "all";

        function apply() {
            const q = (search ? search.value : "").trim().toLowerCase();
            let shown = 0;
            cards.forEach((card) => {
                const okType = filter === "all" || card.dataset.types.split(" ").includes(filter);
                const okName = !q || card.dataset.name.includes(q);
                const show = okType && okName;
                const wasHidden = card.classList.contains("is-hidden");
                card.classList.toggle("is-hidden", !show);
                if (show) {
                    shown++;
                    if (wasHidden) {
                        card.classList.remove("is-showing");
                        void card.offsetWidth;
                        card.classList.add("is-showing");
                    }
                }
            });
            if (empty) empty.hidden = shown !== 0;
        }

        pills.forEach((pill) =>
            pill.addEventListener("click", () => {
                filter = pill.dataset.filter;
                pills.forEach((p) => {
                    const on = p === pill;
                    p.classList.toggle("active", on);
                    p.setAttribute("aria-pressed", on ? "true" : "false");
                });
                apply();
            })
        );
        if (search) search.addEventListener("input", apply);
    }

    /* Sticky call / WhatsApp / directions / book bar on phones */
    function initMobileActions() {
        if (document.querySelector(".mobile-actions")) return;
        const bar = document.createElement("nav");
        bar.className = "mobile-actions";
        bar.setAttribute("aria-label", "Quick contact actions");
        bar.innerHTML =
            '<a href="tel:' + PHONE + '" aria-label="Call us"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>Call</a>' +
            '<a class="is-wa" href="https://wa.me/' + PHONE.slice(1) + '?text=' + encodeURIComponent("Hi Al Khaleej Opticals, I'd like to know more.") + '" target="_blank" rel="noopener noreferrer" aria-label="Chat on WhatsApp"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16.02 2.67C8.62 2.67 2.62 8.67 2.62 16.07c0 2.53.68 4.9 1.87 6.94L2.5 29.33l6.5-1.9a13.3 13.3 0 0 0 7.02 1.98c7.4 0 13.4-6 13.4-13.4s-6-13.34-13.4-13.34z"/></svg>WhatsApp</a>' +
            '<a href="locations.html" aria-label="Branches and directions"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>Directions</a>' +
            '<a href="contact.html" aria-label="Book an eye test"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>Book Test</a>';
        document.body.appendChild(bar);
        document.body.classList.add("has-mobile-actions");
    }

    /* Hardened contact / enquiry forms. There is no backend, so a valid submission opens the
       visitor's email client. Defences: honeypot, minimum fill time, cooldown, input
       sanitising (control chars / header injection), length caps, no innerHTML. */
    function initSecureForms() {
        const MIN_FILL_MS = 2500;
        const COOLDOWN_MS = 30000;
        const MAX_URL = 1900;

        const clean = (v, multiline) => {
            let s = String(v == null ? "" : v).normalize("NFKC");
            s = multiline ? s.replace(/[^\S\n]+/g, " ").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "") : s.replace(/[\u0000-\u001F\u007F]+/g, " ").replace(/\s+/g, " ");
            return s.trim();
        };
        const store = {
            get: () => { try { return parseInt(sessionStorage.getItem("ak_form_ts") || "0", 10); } catch (e) { return 0; } },
            set: () => { try { sessionStorage.setItem("ak_form_ts", String(Date.now())); } catch (e) { /* ignore */ } }
        };

        document.querySelectorAll("form[data-secure-form]").forEach((form) => {
            const note = form.querySelector(".contact-form-note");
            const loadedAt = Date.now();
            const say = (msg, kind) => {
                if (!note) return;
                note.textContent = msg;
                note.classList.toggle("is-error", kind === "error");
                note.classList.toggle("is-ok", kind === "ok");
            };

            form.addEventListener("input", (e) => e.target.classList && e.target.classList.remove("is-invalid"));

            form.addEventListener("submit", (e) => {
                e.preventDefault();

                const trap = form.elements["website"];
                if (trap && trap.value) { say("Thanks! We'll be in touch shortly.", "ok"); return; } // silently drop bots

                if (Date.now() - loadedAt < MIN_FILL_MS) { say("Please check your details and try again.", "error"); return; }
                const wait = COOLDOWN_MS - (Date.now() - store.get());
                if (wait > 0) { say("Please wait " + Math.ceil(wait / 1000) + " seconds before sending another message.", "error"); return; }

                let firstBad = null;
                const lines = [];
                const values = {};
                [...form.elements].forEach((el) => {
                    if (!el.name || el.name === "website" || el.type === "submit") return;
                    const multiline = el.tagName === "TEXTAREA";
                    const val = clean(el.value, multiline);
                    values[el.name] = val;
                    const bad = (el.required && !val) || (val && el.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) || (val && el.pattern && !new RegExp("^(?:" + el.pattern + ")$").test(val));
                    el.classList.toggle("is-invalid", !!bad);
                    if (bad && !firstBad) firstBad = el;
                    if (val) lines.push((el.dataset.label || el.name) + ": " + val);
                });
                if (firstBad) { say("Please complete the highlighted fields correctly.", "error"); firstBad.focus(); return; }

                const subjectField = form.dataset.mailSubjectField;
                const subject = clean((subjectField && values[subjectField]) || form.dataset.mailSubject || "Website enquiry", false).slice(0, 120);
                const prefix = "Sent from alkhaleejopticals.com\n\n";
                let body = prefix + lines.join("\n");
                let url = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
                while (url.length > MAX_URL && body.length > 200) {
                    body = body.slice(0, body.length - 100);
                    url = "mailto:" + EMAIL + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
                }

                store.set();
                window.location.href = url;

                say("Opening your email app to send this message… ", "ok");
                const wa = document.createElement("a");
                wa.href = "https://wa.me/" + PHONE.slice(1) + "?text=" + encodeURIComponent(subject + " — " + (values.name || ""));
                wa.target = "_blank";
                wa.rel = "noopener noreferrer";
                wa.textContent = "Prefer WhatsApp?";
                note && note.appendChild(wa);
            });
        });
    }


    /* Custom dropdowns: the native <select> stays in the DOM (form value, validation) but is
       hidden; a styled listbox with keyboard support replaces its popup. */
    function initDropdowns() {
        document.querySelectorAll(".field-select select").forEach((sel, n) => {
            const field = sel.parentElement;
            const dd = document.createElement("div");
            dd.className = "dd";
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "dd-btn";
            btn.setAttribute("aria-haspopup", "listbox");
            btn.setAttribute("aria-expanded", "false");
            const list = document.createElement("ul");
            list.className = "dd-list";
            list.setAttribute("role", "listbox");
            list.id = (sel.id || "dd" + n) + "-list";
            list.tabIndex = -1;
            btn.setAttribute("aria-controls", list.id);
            const lbl = field.querySelector("label");
            if (lbl) { lbl.id = lbl.id || (sel.id + "-lbl"); btn.setAttribute("aria-labelledby", lbl.id); list.setAttribute("aria-labelledby", lbl.id); }

            const opts = [...sel.options].filter((o) => !o.disabled || o.value);
            opts.forEach((o) => {
                const li = document.createElement("li");
                li.setAttribute("role", "option");
                li.dataset.value = o.value || o.textContent;
                li.textContent = o.textContent;
                list.appendChild(li);
            });
            const items = [...list.children];
            dd.append(btn, list);
            field.appendChild(dd);

            let active = -1;
            const open = () => { dd.classList.add("is-open"); btn.setAttribute("aria-expanded", "true"); setActive(Math.max(items.findIndex((li) => li.classList.contains("is-selected")), 0)); };
            const close = () => { dd.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); };
            function setActive(i) {
                active = (i + items.length) % items.length;
                items.forEach((li, k) => li.classList.toggle("is-active", k === active));
                items[active].scrollIntoView({ block: "nearest" });
            }
            function render() {
                const v = sel.value;
                const cur = items.find((li) => li.dataset.value === v);
                items.forEach((li) => { li.classList.toggle("is-selected", li === cur); li.setAttribute("aria-selected", li === cur ? "true" : "false"); });
                btn.textContent = cur ? cur.textContent : "Select…";
                btn.classList.toggle("is-empty", !cur);
            }
            function choose(i) {
                sel.value = items[i].dataset.value;
                sel.classList.remove("is-invalid");
                sel.dispatchEvent(new Event("change", { bubbles: true }));
                render(); close(); btn.focus();
            }

            btn.addEventListener("click", () => (dd.classList.contains("is-open") ? close() : open()));
            items.forEach((li, i) => {
                li.addEventListener("mousemove", () => setActive(i));
                li.addEventListener("click", () => choose(i));
            });
            btn.addEventListener("keydown", (e) => {
                const isOpen = dd.classList.contains("is-open");
                if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!isOpen) open(); else setActive(active + (e.key === "ArrowDown" ? 1 : -1)); }
                else if (e.key === "Home" && isOpen) { e.preventDefault(); setActive(0); }
                else if (e.key === "End" && isOpen) { e.preventDefault(); setActive(items.length - 1); }
                else if ((e.key === "Enter" || e.key === " ") && isOpen) { e.preventDefault(); choose(active); }
                else if (e.key === "Escape" && isOpen) { e.preventDefault(); close(); }
                else if (e.key === "Tab") close();
                else if (e.key.length === 1 && /S/.test(e.key)) {
                    if (!isOpen) open();
                    const k = e.key.toLowerCase();
                    const from = items.findIndex((li, idx) => idx > active && li.textContent.toLowerCase().startsWith(k));
                    const i = from >= 0 ? from : items.findIndex((li) => li.textContent.toLowerCase().startsWith(k));
                    if (i >= 0) setActive(i);
                }
            });
            document.addEventListener("click", (e) => { if (!dd.contains(e.target)) close(); });
            sel.addEventListener("focus", () => btn.focus());
            sel.closest("form") && sel.closest("form").addEventListener("reset", () => setTimeout(render));
            render();
        });
    }

    ready(() => {
        initImageFallbacks();
        initScrollEffects();
        initSpotlight();
        initOpenNow();
        initBrandFilter();
        initMobileActions();
        initSecureForms();
        initDropdowns();
    });
})();
