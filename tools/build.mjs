/*
 * Site build script — no dependencies, run with:  node tools/build.mjs
 *
 * Generates:  brands.html, one page per brand, faq.html, locations.html, 404.html,
 *             sitemap.xml, llms-full.txt
 * Updates:    every other *.html page (bakes header/footer into the HTML so crawlers and
 *             AI bots see navigation without running JavaScript, injects the security CSP
 *             and the shared enhance.css/enhance.js, refreshes the FAQ blocks between
 *             <!--FAQ:name--> markers).
 *
 * To add or edit a brand or product: change data/brands.json, then re-run this script.
 * To edit FAQs: change data/faqs.json, then re-run this script.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const write = (f, s) => fs.writeFileSync(path.join(ROOT, f), s);

const SITE = "https://www.alkhaleejopticals.com";
const PHONE_DISPLAY = "+971 56 774 3136";
const PHONE_TEL = "+971567743136";
const EMAIL = "alkhaleejoptmain@gmail.com";
const TODAY = new Date().toISOString().slice(0, 10);
const EXTRA_KEYWORDS = "best opticals in Ras Al Khaimah, best optical shop in RAK UAE, best optician in UAE, top opticals Ras Al Khaimah, affordable glasses Ras Al Khaimah, value opticals Ras Al Khaimah, best price glasses RAK, high quality eyewear UAE, premium glasses Ras Al Khaimah, quality prescription glasses UAE, original branded sunglasses RAK, best sunglasses shop Ras Al Khaimah, best eye test centre RAK, best contact lenses shop Ras Al Khaimah, trusted optical store UAE, opticals near me Ras Al Khaimah, glasses shop Ras Al Khaimah, eyeglasses Ras Al Khaimah UAE";
const ORG_ID = `${SITE}/#organization`;

const brands = JSON.parse(read("data/brands.json"));
const faqs = JSON.parse(read("data/faqs.json"));

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const ld = (obj) => `<script type="application/ld+json">\n${JSON.stringify(obj, null, 2).replace(/</g, "\\u003c")}\n</script>`;
const wa = (text) => `https://wa.me/${PHONE_TEL.slice(1)}?text=${encodeURIComponent(text)}`;

/* ------------------------------------------------------------------ security */
const CSP_BASE = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "connect-src 'self'",
  "frame-src https://www.google.com https://maps.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests"
].join("; ");
// The AI frame finder loads MediaPipe (WebAssembly) from a pinned jsDelivr version.
const CSP_AI = CSP_BASE
  .replace("script-src 'self'", "script-src 'self' https://cdn.jsdelivr.net 'wasm-unsafe-eval' 'unsafe-eval'")
  .replace("connect-src 'self'", "connect-src 'self' https://cdn.jsdelivr.net");
const securityMeta = (ai) =>
  `<meta http-equiv="Content-Security-Policy" content="${ai ? CSP_AI : CSP_BASE}">\n    <meta name="referrer" content="strict-origin-when-cross-origin">`;

/* ------------------------------------------------------------------ shared head */
function head({ title, description, keywords, file, image = "assets/mall-shop.png", imageAlt, schema = [], robots = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1", extra = "" }) {
  const url = `${SITE}/${file}`;
  const img = `${SITE}/${image}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    ${securityMeta(false)}
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}">
    <meta name="keywords" content="${esc(keywords + ", " + EXTRA_KEYWORDS)}">
    <meta name="robots" content="${robots}">
    <meta name="author" content="Al Khaleej Opticals">
    <link rel="canonical" href="${url}">
    <link rel="alternate" hreflang="en-AE" href="${url}">
    <link rel="alternate" hreflang="x-default" href="${url}">
    <meta name="theme-color" content="#3d0d14">
    <meta name="format-detection" content="telephone=yes">
    <meta name="geo.region" content="AE-RK">
    <meta name="geo.placename" content="Al Nakheel, Ras Al Khaimah">
    <meta name="geo.position" content="25.7895;55.9432">
    <meta name="ICBM" content="25.7895, 55.9432">

    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Al Khaleej Opticals">
    <meta property="og:locale" content="en_AE">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(description)}">
    <meta property="og:image" content="${img}">
    <meta property="og:image:alt" content="${esc(imageAlt || title)}">
    <meta property="og:url" content="${url}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(description)}">
    <meta name="twitter:image" content="${img}">
    <meta name="twitter:image:alt" content="${esc(imageAlt || title)}">

    <link rel="icon" href="favicon.png" type="image/png">
    <link rel="apple-touch-icon" href="favicon.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="styles.css">
    <link rel="stylesheet" href="css/enhance.css">
    ${schema.map(ld).join("\n    ")}${extra}
</head>`;
}

const breadcrumb = (items) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map(([name, file], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${SITE}/${file}` }))
});

const faqSchema = (items) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } }))
});

function faqSection(items, { kicker = "FAQs", heading = "Frequently Asked Questions", intro = "", soft = false } = {}) {
  return `<section class="section faq-section${soft ? " section-soft" : ""}">
            <div class="container faq-wrap">
                <p class="kicker center">${esc(kicker)}</p>
                <h2 class="center">${esc(heading)}</h2>
                ${intro ? `<p class="center faq-intro">${esc(intro)}</p>` : ""}
                <div class="faq-list">
${items
  .map(
    (f) => `                    <details class="faq-item">
                        <summary>${esc(f.q)}</summary>
                        <div class="faq-a"><p>${esc(f.a)}</p></div>
                    </details>`
  )
  .join("\n")}
                </div>
            </div>
        </section>
        ${ld(faqSchema(items))}`;
}

/* ------------------------------------------------------------------ baked header/footer */
const headerHTML = read("components/header.html").trim();
const footerHTML = read("components/footer.html").trim();
const headerBlock = `<!--HEADER-->\n    ${headerHTML.replace(/\n/g, "\n    ")}\n    <!--/HEADER-->`;
const footerBlock = `<!--FOOTER-->\n    ${footerHTML.replace(/\n/g, "\n    ")}\n    <!--/FOOTER-->`;

function bakeLayout(html) {
  html = html.replace(/<div id="site-header"><\/div>|<!--HEADER-->[\s\S]*?<!--\/HEADER-->/, () => headerBlock);
  html = html.replace(/<div id="site-footer"><\/div>|<!--FOOTER-->[\s\S]*?<!--\/FOOTER-->/, () => footerBlock);
  return html;
}

function pageShell({ headHtml, bodyClass = "", navSection = "", main }) {
  return `${headHtml}
<body${bodyClass ? ` class="${bodyClass}"` : ""}${navSection ? ` data-nav-section="${navSection}"` : ""}>
    <a class="skip-link" href="#main-content">Skip to main content</a>
    ${headerBlock}

    <main id="main-content">
${main}
    </main>

    ${footerBlock}
    <script src="js/layout.js"></script>
    <script src="js/enhance.js" defer></script>
</body>
</html>
`;
}

const banner = (crumbs, h1, img = "assets/brands-banner.png") => `        <section class="page-banner">
            <div class="page-banner-bg" style="background-image: url('${img}')"></div>
            <div class="page-banner-overlay"></div>
            <div class="container page-banner-inner">
                <p class="page-breadcrumb">${crumbs}</p>
                <h1>${h1}</h1>
            </div>
        </section>`;

/* ------------------------------------------------------------------ brands */
const brandFile = (b) =>
  b.types.includes("lenses") ? `${b.slug === "kodak-lens" ? "kodak-lens" : b.slug + "-lenses"}-ras-al-khaimah.html` : `${b.slug}-glasses-ras-al-khaimah.html`;

const typeLabel = (b) => (b.types.includes("lenses") ? "Prescription Lenses" : b.types.includes("sunglasses") ? "Glasses & Sunglasses" : "Optical Frames");

function brandCollections(b) {
  if (b.collections) return b.collections;
  const n = b.name;
  const base = [{ title: `${n} optical frames`, text: `Prescription-ready ${n} frames. Our optometrists test your eyes and fit lenses made for your prescription.` }];
  if (b.types.includes("sunglasses")) {
    base.push({ title: `${n} sunglasses`, text: `UV-protective ${n} sunglasses for driving, travel and everyday wear in the Ras Al Khaimah sun.` });
    base.push({ title: `${n} prescription sunglasses`, text: `Your ${n} sunglasses made with your own prescription, so you get clear vision and sun protection in one pair.` });
  } else {
    base.push({ title: "Computer & blue-light glasses", text: `Pair ${n} frames with blue-light filtering and anti-reflective lenses for long hours on screens.` });
    base.push({ title: "Progressive & reading glasses", text: `Choose ${n} frames fitted with progressive, bifocal or reading lenses, measured carefully for your eyes.` });
  }
  return base;
}

function brandFaqs(b) {
  const n = b.name;
  const lens = b.types.includes("lenses");
  return [
    {
      q: `Where can I buy ${n} ${lens ? "lenses" : "glasses"} in Ras Al Khaimah?`,
      a: `Al Khaleej Opticals sells ${n} ${lens ? "lenses" : "eyewear"} at our Al Nakheel branches in Ras Al Khaimah. Call or WhatsApp ${PHONE_DISPLAY} to check current ${lens ? "options" : "styles"} before you visit.`
    },
    {
      q: lens ? `Can I get ${n} lenses in the frame I already own?` : `Can ${n} frames be fitted with my prescription?`,
      a: lens
        ? `In many cases yes. Bring your frame and prescription and our optometrists will check whether the lens can be fitted and what coatings suit you.`
        : `Yes. Our optometrists can test your eyes and fit ${n} frames with single vision, progressive, blue-light or tinted lenses made to your prescription.`
    },
    {
      q: `Is ${n} covered by insurance?`,
      a: `Cover depends on your individual insurance plan. We work with ADNIC, NAS, Nextcare, Mednet, Orient and Saico Health, so bring your card or call us and we will help you check your benefits.`
    },
    {
      q: `Can my company order ${n} ${lens ? "lenses" : "eyewear"} for employees?`,
      a: `Yes. Our Corporate Vision Care Programme supports companies across Ras Al Khaimah and the UAE with eye tests, prescription eyewear and bulk delivery. Visit our corporate page or message us on WhatsApp to start.`
    }
  ];
}

function productCard(b, p) {
  return `                    <article class="product-card">
                        <div class="product-img"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" decoding="async"></div>
                        <h3>${esc(p.name)}</h3>
                        ${p.description ? `<p>${esc(p.description)}</p>` : ""}
                        ${p.price ? `<p class="product-price">${esc(p.price)}</p>` : ""}
                        <a class="btn btn-maroon btn-sm" href="${wa(`Hi Al Khaleej Opticals, I'm interested in ${p.name} (${b.name}).`)}" target="_blank" rel="noopener noreferrer">Enquire on WhatsApp</a>
                    </article>`;
}

function buildBrandPage(b) {
  const file = brandFile(b);
  const lens = b.types.includes("lenses");
  const h1 = lens ? `${esc(b.name)} Lenses in Ras Al Khaimah` : b.types.includes("sunglasses") ? `${esc(b.name)} Glasses &amp; Sunglasses in Ras Al Khaimah` : `${esc(b.name)} Glasses in Ras Al Khaimah`;
  const title = lens
    ? `${b.name} Lenses in Ras Al Khaimah | Prescription Lenses | Al Khaleej Opticals`
    : b.types.includes("sunglasses")
    ? `${b.name} Glasses & Sunglasses in Ras Al Khaimah | Al Khaleej Opticals`
    : `${b.name} Glasses & Frames in Ras Al Khaimah | Al Khaleej Opticals`;
  const desc = `${b.name} ${lens ? "prescription lenses" : b.types.includes("sunglasses") ? "glasses, frames & sunglasses" : "glasses & frames"} in Ras Al Khaimah. Try, fit and buy at Al Khaleej Opticals, Al Nakheel — 22+ years of expert eye care.`;
  const collections = brandCollections(b);
  const items = brandFaqs(b);
  const products = b.products || [];
  const related = brands.filter((x) => x.slug !== b.slug && (x.types.some((t) => b.types.includes(t)))).slice(0, 4);
  const more = (related.length < 4 ? related.concat(brands.filter((x) => x.slug !== b.slug && !related.includes(x))) : related).slice(0, 4);

  const schema = [
    breadcrumb([["Home", "index.html"], ["Brands", "brands.html"], [b.name, file]]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${SITE}/${file}#page`,
      url: `${SITE}/${file}`,
      name: title,
      description: desc,
      about: { "@type": "Brand", name: b.name, logo: `${SITE}/${b.logo}` },
      isPartOf: { "@id": `${SITE}/#website` },
      provider: { "@id": ORG_ID },
      inLanguage: "en-AE"
    },
    ...products.filter((p) => p.price).map((p) => ({
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      brand: { "@type": "Brand", name: b.name },
      image: `${SITE}/${p.image}`,
      offers: { "@type": "Offer", priceCurrency: "AED", price: String(p.price).replace(/[^\d.]/g, ""), availability: "https://schema.org/InStock", seller: { "@id": ORG_ID } }
    }))
  ];

  const main = `${banner(`<a href="index.html">Home</a> / <a href="brands.html">Brands</a> / ${esc(b.name)}`, h1)}

        <section class="section">
            <div class="container brand-intro">
                <div class="brand-intro-logo">
                    <div class="brand-logo-panel"><img src="${b.logo}" alt="${esc(b.name)} logo" width="220" height="120"></div>
                    <p class="brand-intro-tag">${typeLabel(b)}</p>
                    <ul class="brand-highlights">
${b.highlights.map((h) => `                        <li>${esc(h)}</li>`).join("\n")}
                    </ul>
                </div>
                <div class="brand-intro-text">
                    <p class="kicker">${esc(b.name)} at Al Khaleej Opticals</p>
                    <h2>${esc(b.tagline)}</h2>
${b.intro.map((p) => `                    <p>${esc(p)}</p>`).join("\n")}
                    <p>Visit our <a href="locations.html">Al Nakheel branches in Ras Al Khaimah</a>, or <a href="contact.html">book an eye test</a> so we can recommend the ${lens ? "right lens" : "right frame and lens"} for you.</p>
                    <div class="button-row">
                        <a class="btn btn-maroon" href="${wa(`Hi Al Khaleej Opticals, I'd like to ask about ${b.name} ${lens ? "lenses" : "eyewear"}.`)}" target="_blank" rel="noopener noreferrer">Ask About ${esc(b.name)} on WhatsApp</a>
                        <a class="btn btn-outline-dark" href="contact.html">Book Eye Test</a>
                    </div>
                </div>
            </div>
        </section>

        <section class="section section-soft">
            <div class="container">
                <p class="kicker center">${esc(b.name)} Collection</p>
                <h2 class="center">${lens ? `${esc(b.name)} Lens Options` : `${esc(b.name)} Opticals in Al Nakheel, Ras Al Khaimah`}</h2>
                <p class="center collection-intro">${lens ? "Ask our optometrists which of these options suits your prescription and routine." : "Browse the range in-store. Availability changes, so message us and we will confirm current styles."}</p>
                <div class="collection-grid">
${collections
  .map(
    (c, i) => `                    <article class="collection-card">
                        <span class="collection-num" aria-hidden="true">${String(i + 1).padStart(2, "0")}</span>
                        <h3>${esc(c.title)}</h3>
                        <p>${esc(c.text)}</p>
                        <a href="${wa(`Hi Al Khaleej Opticals, I'd like to ask about: ${c.title}.`)}" target="_blank" rel="noopener noreferrer">Enquire<span class="arr" aria-hidden="true"></span></a>
                    </article>`
  )
  .join("\n")}
                </div>
${products.length ? `                <h3 class="center products-title">Featured ${esc(b.name)} Products</h3>\n                <div class="product-grid">\n${products.map((p) => productCard(b, p)).join("\n")}\n                </div>` : ""}
            </div>
        </section>
${lens ? "" : `
        <section class="section">
            <div class="container">
                <p class="kicker center">Find Your Shape</p>
                <h2 class="center">Not Sure Which ${esc(b.name)} Style Suits You?</h2>
                <p class="center collection-intro">Try our free <a href="frame-finder.html">AI Frame Finder</a> — it matches frame shapes to your face shape in seconds.</p>
                <div class="shape-strip">
                    <a href="frame-finder.html"><img src="frame-finder/round/r1.png" alt="Round frame style" loading="lazy" decoding="async"><span>Round</span></a>
                    <a href="frame-finder.html"><img src="frame-finder/wayfarer/w1.png" alt="Wayfarer frame style" loading="lazy" decoding="async"><span>Wayfarer</span></a>
                    <a href="frame-finder.html"><img src="frame-finder/rectangle/rect1.png" alt="Rectangle frame style" loading="lazy" decoding="async"><span>Rectangle</span></a>
                    <a href="frame-finder.html"><img src="frame-finder/cateye/cat1.png" alt="Cat-eye frame style" loading="lazy" decoding="async"><span>Cat Eye</span></a>
                </div>
            </div>
        </section>
`}
        <section class="section ${lens ? "" : "section-soft"}">
            <div class="container">
                <div class="why-mini">
                    <article><h4>22+ years in RAK</h4><p>Trusted by families and professionals across Ras Al Khaimah since 2004.</p></article>
                    <article><h4>Eye test &amp; fitting together</h4><p>Get your eyes tested, choose your ${lens ? "lens" : "frame"} and have it fitted in one place.</p></article>
                    <article><h4>Insurance friendly</h4><p>We work with ADNIC, NAS, Nextcare, Mednet, Orient and Saico Health.</p></article>
                    <article><h4>Corporate tie-ups</h4><p>Eye care and eyewear programmes for companies. <a href="corporate.html">Learn more</a>.</p></article>
                </div>
            </div>
        </section>

        ${faqSection(items, { kicker: `${b.name} FAQs`, heading: `${b.name} in Ras Al Khaimah — Your Questions`, soft: lens })}

        <section class="section ${lens ? "" : "section-soft"}">
            <div class="container">
                <p class="kicker center">More Brands</p>
                <h2 class="center">Explore Other Brands</h2>
                <div class="related-brands">
${more.map((x) => `                    <a class="related-brand" href="${brandFile(x)}"><img src="${x.logo}" alt="${esc(x.name)}" loading="lazy" decoding="async"><span>${esc(x.name)}</span></a>`).join("\n")}
                </div>
                <div class="center mt-28"><a class="btn btn-gold" href="brands.html">View All Brands</a></div>
            </div>
        </section>`;

  write(file, pageShell({
    headHtml: head({ title, description: desc, keywords: [...b.keywords, "optician Ras Al Khaimah", "Al Nakheel optical shop", "Al Khaleej Opticals"].join(", "), file, image: "assets/brands-banner.png", imageAlt: `${b.name} at Al Khaleej Opticals, Ras Al Khaimah`, schema }),
    navSection: "brands.html",
    main
  }));
  return file;
}

function buildBrandsIndex() {
  const file = "brands.html";
  const cats = [["all", "All"], ["frames", "Frames"], ["sunglasses", "Sunglasses"], ["lenses", "Lenses"]];
  const title = "Premium Eyewear Brands in Ras Al Khaimah | Ray-Ban, Armani & More | Al Khaleej Opticals";
  const desc = "Shop Ray-Ban, Emporio Armani, Armani Exchange, Essilor, Kodak Lens and more eyewear brands at Al Khaleej Opticals, Al Nakheel, Ras Al Khaimah. Frames, sunglasses and lenses with expert fitting.";
  const schema = [
    breadcrumb([["Home", "index.html"], ["Brands", file]]),
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "Eyewear brands at Al Khaleej Opticals, Ras Al Khaimah",
      numberOfItems: brands.length,
      itemListElement: brands.map((b, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/${brandFile(b)}`, name: b.name }))
    },
    faqSchema(faqs.general.filter((_, i) => [4, 0, 1].includes(i)))
  ];
  const main = `${banner(`<a href="index.html">Home</a> / Brands`, "Premium Brands")}

        <section class="section section-soft">
            <div class="container">
                <p class="kicker center">Our Collection</p>
                <h2 class="center">World-Class Eyewear Brands in Ras Al Khaimah</h2>
                <p class="center collection-intro">Open any brand to see its optical collection, lens options, FAQs and how to enquire. All brands are available at our Al Nakheel branches.</p>
                <div class="brand-filter" role="group" aria-label="Filter brands">
${cats.map(([k, l], i) => `                    <button type="button" class="pill${i === 0 ? " active" : ""}" data-filter="${k}" aria-pressed="${i === 0}">${l}</button>`).join("\n")}
                    <label class="visually-hidden" for="brandSearch">Search brands</label>
                    <input id="brandSearch" class="search" type="search" placeholder="Search brands…" autocomplete="off" maxlength="40">
                </div>
                <div class="brand-cards" id="brandCards">
${brands
  .map(
    (b) => `                    <article class="brand-card" data-types="${b.types.join(" ")}" data-name="${esc(b.name.toLowerCase())}">
                        <a class="brand-card-link" href="${brandFile(b)}" aria-label="${esc(b.name)} — view collection">
                            <div class="brand-card-img"><img src="${b.logo}" alt="${esc(b.name)} logo" loading="lazy" decoding="async"></div>
                            <h3>${esc(b.name)}</h3>
                            <p class="brand-card-type">${typeLabel(b)}</p>
                            <span class="brand-card-cta">View Collection<span class="arr" aria-hidden="true"></span></span>
                        </a>
                    </article>`
  )
  .join("\n")}
                </div>
                <p class="brand-empty" id="brandEmpty" hidden>No brands match your search. <a href="contact.html">Ask us</a> — we may be able to source it.</p>
            </div>
        </section>

        <section class="section">
            <div class="container why-mini">
                <article><h4>Original branded eyewear</h4><p>Frames and lenses from recognised brands, fitted by qualified opticians.</p></article>
                <article><h4>Prescription ready</h4><p>Every frame can be fitted with single vision, progressive or blue-light lenses.</p></article>
                <article><h4>Corporate &amp; insurance</h4><p>Eyewear programmes for companies and support with insurance plans.</p></article>
                <article><h4>Try before you buy</h4><p>Not sure of your shape? Use the free <a href="frame-finder.html">AI Frame Finder</a>.</p></article>
            </div>
        </section>

        ${faqSection(faqs.general.filter((_, i) => [4, 0, 1].includes(i)), { kicker: "Brand FAQs", heading: "Eyewear Brands — Quick Answers", soft: true })}`;
  write(file, pageShell({
    headHtml: head({ title, description: desc, keywords: "eyewear brands Ras Al Khaimah, Ray-Ban Ras Al Khaimah, Emporio Armani glasses UAE, Armani Exchange eyewear, Essilor lenses RAK, Kodak lens UAE, designer sunglasses Ras Al Khaimah, branded glasses Al Nakheel", file, image: "assets/brands-banner.png", schema }),
    main
  }));
}

/* ------------------------------------------------------------------ FAQ page */
function buildFaqPage() {
  const file = "faq.html";
  const groups = [
    ["Visiting Us", faqs.general],
    ["Eye Tests & Eye Care", faqs.eyecare],
    ["Insurance", faqs.insurance],
    ["Corporate Eye Care Programmes", faqs.corporate],
    ["AI Frame Finder", faqs.frames]
  ];
  const all = groups.flatMap(([, g]) => g);
  const title = "FAQs | Eye Tests, Glasses, Insurance & Corporate Eye Care | Al Khaleej Opticals";
  const desc = "Answers to common questions about eye tests, prescription glasses, contact lenses, insurance, corporate eye care and opening hours at Al Khaleej Opticals, Al Nakheel, Ras Al Khaimah.";
  const main = `${banner(`<a href="index.html">Home</a> / FAQs`, "Frequently Asked Questions", "assets/contact-us.png")}

        <section class="section">
            <div class="container faq-wrap">
                <p class="faq-intro center">Quick answers about eye care, glasses and corporate programmes at Al Khaleej Opticals in Al Nakheel, Ras Al Khaimah. Can't find yours? <a href="${wa("Hi Al Khaleej Opticals, I have a question.")}" target="_blank" rel="noopener noreferrer">Ask on WhatsApp</a>.</p>
${groups
  .map(
    ([name, items]) => `                <h2 class="faq-group-title">${esc(name)}</h2>
                <div class="faq-list">
${items
  .map(
    (f) => `                    <details class="faq-item">
                        <summary>${esc(f.q)}</summary>
                        <div class="faq-a"><p>${esc(f.a)}</p></div>
                    </details>`
  )
  .join("\n")}
                </div>`
  )
  .join("\n")}
            </div>
        </section>
        ${ld(faqSchema(all))}`;
  write(file, pageShell({
    headHtml: head({ title, description: desc, keywords: "optician FAQ Ras Al Khaimah, eye test cost RAK, insurance optician UAE, corporate eye care questions, license eye test RAK, contact lens fitting Ras Al Khaimah", file, image: "assets/contact-us.png", schema: [breadcrumb([["Home", "index.html"], ["FAQs", file]])] }),
    main
  }));
}

/* ------------------------------------------------------------------ locations page */
const BRANCHES = [
  { name: "Al Khaleej Opticals — Main Branch", area: "Ras Al Khaimah", map: "https://maps.app.goo.gl/jGzaJAgJ7JvNhbf39" },
  { name: "Al Khaleej Opticals — Branch 1, Al Nakheel", area: "Al Nakheel, Ras Al Khaimah", map: "https://maps.app.goo.gl/Yb5NaRmwStptcYgx6" },
  { name: "Al Khaleej Opticals — Branch 2, Al Nakheel", area: "Al Nakheel, Ras Al Khaimah", map: "https://maps.app.goo.gl/pYPzLSYQLrDUxYFHA" }
];

function buildLocationsPage() {
  const file = "locations.html";
  const title = "Optician in Al Nakheel, Ras Al Khaimah | 3 Branches | Al Khaleej Opticals";
  const desc = "Find Al Khaleej Opticals in Al Nakheel, Ras Al Khaimah — eye tests, prescription glasses, sunglasses and contact lenses at 3 branches. Open Sat–Thu 9AM–10PM, Fri 4PM–10PM. Call +971 56 774 3136.";
  const items = faqs.general.filter((_, i) => [0, 1, 3].includes(i));
  const schema = [
    breadcrumb([["Home", "index.html"], ["Locations", file]]),
    ...BRANCHES.map((b, i) => ({
      "@context": "https://schema.org",
      "@type": "Optician",
      "@id": i === 0 ? ORG_ID : `${SITE}/locations.html#branch-${i}`,
      name: b.name,
      url: `${SITE}/${file}`,
      telephone: `+971-56-774-3136`,
      priceRange: "$$",
      address: { "@type": "PostalAddress", addressLocality: b.area.startsWith("Al Nakheel") ? "Al Nakheel" : "Ras Al Khaimah", addressRegion: "Ras Al Khaimah", addressCountry: "AE" },
      hasMap: b.map,
      ...(i ? { parentOrganization: { "@id": ORG_ID } } : {})
    })),
    faqSchema(items)
  ];
  const areas = ["Al Nakheel", "Al Hamra", "Julfar", "Khuzam", "Al Dhait", "Mina Al Arab", "Al Marjan Island", "Ras Al Khaimah City"];
  const main = `${banner(`<a href="index.html">Home</a> / Locations`, "Optician in Al Nakheel, Ras Al Khaimah", "assets/contact-us.png")}

        <section class="section">
            <div class="container">
                <p class="kicker center">3 Branches</p>
                <h2 class="center">Visit Al Khaleej Opticals in Ras Al Khaimah</h2>
                <p class="center collection-intro">For more than 22 years, families and professionals have visited us in Al Nakheel for eye tests, prescription glasses, sunglasses and contact lenses.</p>
                <div class="branch-grid">
${BRANCHES.map(
  (b, i) => `                    <article class="branch-card">
                        <span class="branch-num" aria-hidden="true">${i + 1}</span>
                        <h3>${esc(b.name)}</h3>
                        <p class="branch-area">${esc(b.area)}, UAE</p>
                        <p><a href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a></p>
                        <p class="branch-hours">Sat–Thu 9 AM–10 PM<br>Fri 4 PM–10 PM</p>
                        <div class="button-row">
                            <a class="btn btn-maroon btn-sm" href="${b.map}" target="_blank" rel="noopener noreferrer">Get Directions</a>
                            <a class="btn btn-outline-dark btn-sm" href="${wa(`Hi Al Khaleej Opticals, I'd like to visit ${b.name}.`)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
                        </div>
                    </article>`
).join("\n")}
                </div>
                <div class="open-now-wrap center"><span class="open-now" data-open-now>Checking opening hours…</span></div>
            </div>
        </section>

        <section class="section section-soft">
            <div class="container about-grid">
                <div>
                    <p class="kicker">Local Eye Care</p>
                    <h2>Your Neighbourhood Optician in Al Nakheel</h2>
                    <p>Looking for an optician near you in Ras Al Khaimah? Al Khaleej Opticals offers complete eye care in Al Nakheel: eye examinations by qualified optometrists, <a href="brands.html">branded frames and sunglasses</a>, prescription lenses, contact lens fitting, repairs and licence eye tests.</p>
                    <p>We also look after companies across the emirate with <a href="corporate.html">corporate vision care programmes</a> and support with major insurance plans.</p>
                    <div class="button-row">
                        <a class="btn btn-maroon" href="contact.html">Book an Eye Test</a>
                        <a class="btn btn-outline-dark" href="corporate.html">Corporate Tie-Ups</a>
                    </div>
                </div>
                <div>
                    <h3>Areas We Serve</h3>
                    <ul class="area-chips">
${areas.map((a) => `                        <li>${a}</li>`).join("\n")}
                    </ul>
                    <h3 class="mt-28">What You Can Do Here</h3>
                    <ul class="check-grid">
                        <li>Comprehensive eye test</li>
                        <li>Driving licence eye test</li>
                        <li>Prescription glasses</li>
                        <li>Designer sunglasses</li>
                        <li>Contact lenses</li>
                        <li>Repairs &amp; adjustments</li>
                    </ul>
                </div>
            </div>
        </section>

        ${faqSection(items, { kicker: "Visiting FAQs", heading: "Before You Visit" })}`;
  write(file, pageShell({
    headHtml: head({ title, description: desc, keywords: "optician Al Nakheel Ras Al Khaimah, optical shop Al Nakheel RAK, eye test Al Nakheel, glasses shop near me Ras Al Khaimah, opticals RAK, Al Khaleej Opticals location, نظارات رأس الخيمة, بصريات الخليج", file, image: "assets/mall-shop.png", imageAlt: "Al Khaleej Opticals store in Al Nakheel, Ras Al Khaimah", schema }),
    main
  }));
}

/* ------------------------------------------------------------------ 404 */
function build404() {
  const main = `        <section class="section not-found">
            <div class="container center">
                <p class="kicker">Error 404</p>
                <h1>This page has moved out of focus</h1>
                <p>The page you are looking for doesn't exist. Try one of these instead.</p>
                <div class="button-row" style="justify-content:center">
                    <a class="btn btn-maroon" href="index.html">Go Home</a>
                    <a class="btn btn-gold" href="brands.html">Browse Brands</a>
                    <a class="btn btn-outline-dark" href="contact.html">Contact Us</a>
                </div>
            </div>
        </section>`;
  write("404.html", pageShell({
    headHtml: head({ title: "Page Not Found | Al Khaleej Opticals", description: "This page could not be found. Return to Al Khaleej Opticals, optician in Ras Al Khaimah.", keywords: "Al Khaleej Opticals", file: "404.html", robots: "noindex, follow" }),
    main
  }));
}

/* ------------------------------------------------------------------ hand-written pages */
const FAQ_SETS = {
  home: () => [faqs.general[6], faqs.general[7], faqs.general[0], faqs.general[1], faqs.general[2], faqs.general[4], faqs.eyecare[1], faqs.insurance[0], faqs.corporate[0], faqs.corporate[1]],
  services: () => [...faqs.eyecare, ...faqs.insurance],
  corporate: () => [...faqs.corporate, faqs.insurance[0]],
  contact: () => [faqs.general[0], faqs.general[1], faqs.general[3], faqs.general[5], faqs.insurance[1]],
  frames: () => [...faqs.frames, faqs.eyecare[5]]
};
const FAQ_COPY = {
  home: { kicker: "FAQs", heading: "Eye Care in Ras Al Khaimah — Your Questions Answered", soft: true },
  services: { kicker: "Service FAQs", heading: "Eye Care Services — Common Questions" },
  corporate: { kicker: "Corporate FAQs", heading: "Corporate Eye Care Tie-Ups — Your Questions", soft: true },
  contact: { kicker: "Before You Visit", heading: "Contact & Visiting FAQs", soft: true },
  frames: { kicker: "FAQs", heading: "AI Frame Finder — Your Questions", soft: true }
};

function processHandwritten(file) {
  let html = read(file);
  const ai = file === "frame-finder.html";
  html = bakeLayout(html);
  html = html.replace(/(<meta name="keywords" content=")([^"]*)(">)/, (m, a, v, c) => v.includes("best opticals in Ras Al Khaimah") ? m : a + v + ", " + EXTRA_KEYWORDS + c);

  // security meta (replace if present, else insert after viewport)
  const sec = securityMeta(ai);
  if (/<meta http-equiv="Content-Security-Policy"/.test(html)) {
    html = html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>\s*<meta name="referrer"[^>]*>/, () => sec);
  } else {
    html = html.replace(/(<meta name="viewport"[^>]*>)/, (m) => `${m}\n    ${sec}`);
  }

  if (!html.includes("css/enhance.css")) html = html.replace(/(<link rel="stylesheet" href="styles\.css">)/, (m) => `${m}\n    <link rel="stylesheet" href="css/enhance.css">`);
  if (!html.includes("js/enhance.js")) html = html.replace(/<\/body>/, () => `    <script src="js/enhance.js" defer></script>\n</body>`);

  html = html.replace(/<!--FAQ:(\w+)-->[\s\S]*?<!--\/FAQ:\1-->/g, (_, key) => {
    const items = FAQ_SETS[key]();
    return `<!--FAQ:${key}-->\n        ${faqSection(items, FAQ_COPY[key])}\n        <!--/FAQ:${key}-->`;
  });
  write(file, html);
}

/* ------------------------------------------------------------------ sitemap + llms-full */
function buildSitemap(pages) {
  const body = pages
    .map(([file, freq, prio, img]) => `    <url>
        <loc>${SITE}/${file}</loc>
        <lastmod>${TODAY}</lastmod>
        <changefreq>${freq}</changefreq>
        <priority>${prio}</priority>${img ? `\n        <image:image><image:loc>${SITE}/${img}</image:loc></image:image>` : ""}
    </url>`)
    .join("\n");
  write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${body}
</urlset>
`);
}

function buildLlmsFull() {
  const lines = [];
  lines.push(`# Al Khaleej Opticals — full reference for AI assistants and search engines`);
  lines.push(`\nLast updated: ${TODAY}\n`);
  lines.push(`Al Khaleej Opticals is a trusted optician and eyewear store in Al Nakheel, Ras Al Khaimah (RAK), United Arab Emirates, serving customers for more than 22 years (since 2004). It has 3 branches in Ras Al Khaimah, including two in Al Nakheel.`);
  lines.push(`\n## Contact\n- Phone / WhatsApp: ${PHONE_DISPLAY}\n- Email: ${EMAIL}\n- Website: ${SITE}/\n- Hours: Saturday–Thursday 9:00 AM–10:00 PM; Friday 4:00 PM–10:00 PM (UAE time, GMT+4)`);
  lines.push(`\n## Branches\n${BRANCHES.map((b) => `- ${b.name} (${b.area}, UAE): ${b.map}`).join("\n")}`);
  lines.push(`\n## Services\n- Comprehensive eye tests by qualified optometrists\n- Driving licence eye tests\n- Prescription glasses (single vision, progressive, blue-light, anti-reflective)\n- Contact lens fitting and supply\n- Sunglasses (including prescription sunglasses)\n- Repairs and adjustments\n- Corporate vision care programmes and bulk delivery\n- Free online AI Frame Finder (face-shape analysis and virtual try-on, runs in the browser)\n- Insurance support (ADNIC, NAS, Nextcare, Mednet, Orient, Saico Health — cover depends on the plan)`);
  lines.push(`\n## Brands (each has its own page)\n${brands.map((b) => `- [${b.name}](${SITE}/${brandFile(b)}): ${b.tagline}.`).join("\n")}`);
  lines.push(`\n## Corporate tie-ups\nAl Khaleej Opticals partners with companies in Ras Al Khaimah and across the UAE: employee eye examinations, prescription eyewear, digital eye strain solutions, safety eyewear, contact lenses, sunglasses and bulk delivery. Industries: corporate offices, healthcare, education, retail and hospitality, construction and engineering, transportation and logistics. Details: ${SITE}/corporate.html`);
  lines.push(`\n## Frequently asked questions`);
  for (const [, g] of Object.entries(faqs)) for (const f of g) lines.push(`\n**Q: ${f.q}**\nA: ${f.a}`);
  lines.push(`\n## Pages\n- ${SITE}/index.html — Home\n- ${SITE}/about.html — About\n- ${SITE}/services.html — Services\n- ${SITE}/brands.html — Brands\n- ${SITE}/corporate.html — Corporate tie-ups\n- ${SITE}/locations.html — Locations\n- ${SITE}/faq.html — FAQs\n- ${SITE}/frame-finder.html — AI Frame Finder\n- ${SITE}/contact.html — Contact`);
  write("llms-full.txt", lines.join("\n") + "\n");
}

/* ------------------------------------------------------------------ run */
const generated = brands.map(buildBrandPage);
buildBrandsIndex();
buildFaqPage();
buildLocationsPage();
build404();

const HAND = ["index.html", "about.html", "services.html", "corporate.html", "contact.html", "frame-finder.html", "privacy.html", "terms.html"];
HAND.forEach(processHandwritten);

buildSitemap([
  ["index.html", "weekly", "1.0", "assets/hero1.png"],
  ["services.html", "monthly", "0.9"],
  ["brands.html", "weekly", "0.9", "assets/brands-banner.png"],
  ["corporate.html", "monthly", "0.9", "assets/corporate-banner.png"],
  ["locations.html", "monthly", "0.9"],
  ["contact.html", "monthly", "0.9"],
  ["frame-finder.html", "monthly", "0.8"],
  ["faq.html", "monthly", "0.8"],
  ["about.html", "monthly", "0.7"],
  ...generated.map((f) => [f, "monthly", "0.7"]),
  ["privacy.html", "yearly", "0.3"],
  ["terms.html", "yearly", "0.3"]
]);
buildLlmsFull();

console.log(`Built ${generated.length} brand pages, brands/faq/locations/404, ${HAND.length} updated pages, sitemap.xml, llms-full.txt`);
