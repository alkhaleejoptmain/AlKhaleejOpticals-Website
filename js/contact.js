(function () {
    const branches = [
        {
            name: "Al Khaleej Opticals",
            address: "Ras Al Khaimah, UAE",
            phone: "+971 56 774 3136",
            mapLink: "https://maps.app.goo.gl/jGzaJAgJ7JvNhbf39",
            mapEmbed:
                "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d460644.2563639089!2d55.35378169645831!3d25.57887691962195!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ef67152a2624ec1%3A0x9be9d8b9348d3892!2sAl%20Khaleej%20Opticals!5e0!3m2!1sen!2sin!4v1780934089986!5m2!1sen!2sin"
        },
        {
            name: "Al Khaleej Opticals Br 2 — Al Nakheel",
            address: "Al Nakheel, Ras Al Khaimah, UAE",
            phone: "+971 56 774 3136",
            mapLink: "https://maps.app.goo.gl/pYPzLSYQLrDUxYFHA",
            mapEmbed:
                "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d460644.2563639089!2d55.35378169645831!3d25.57887691962195!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ef6712ca452fab3%3A0xc6e53d76e0d1b492!2sAl%20Khaleej%20Opticals%20Br%202%20-%20Al%20nakheel!5e0!3m2!1sen!2sin!4v1780934110309!5m2!1sen!2sin"
        },
        {
            name: "Al Khaleej Opticals Br 1 — Al Nakheel",
            address: "Al Nakheel, Ras Al Khaimah, UAE",
            phone: "+971 56 774 3136",
            mapLink: "https://maps.app.goo.gl/Yb5NaRmwStptcYgx6",
            mapEmbed:
                "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d460644.2563639089!2d55.35378169645831!3d25.57887691962195!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ef6776a00b6b211%3A0x26da2d16afe8637c!2sAl%20khaleej%20opticals%20Br%201%20-%20Al%20nakheel!5e0!3m2!1sen!2sin!4v1780934124576!5m2!1sen!2sin"
        }
    ];

    const iframe = document.getElementById("branchMap");
    const label = document.getElementById("branchLabel");
    const openLink = document.getElementById("mapOpenLink");
    const prevBtn = document.getElementById("mapPrev");
    const nextBtn = document.getElementById("mapNext");
    if (!iframe || !label) return;

    let index = 0;

    function showBranch(i) {
        index = (i + branches.length) % branches.length;
        const b = branches[index];
        iframe.src = b.mapEmbed;
        label.textContent = "";
        const strong = document.createElement("strong");
        strong.textContent = b.name;
        label.append(strong, document.createElement("br"), b.address, document.createElement("br"), b.phone);
        if (openLink) {
            openLink.href = b.mapLink;
            openLink.textContent = "Open in Google Maps";
            const arr = document.createElement("span");
            arr.className = "arr";
            arr.setAttribute("aria-hidden", "true");
            openLink.appendChild(arr);
        }
    }

    prevBtn?.addEventListener("click", () => showBranch(index - 1));
    nextBtn?.addEventListener("click", () => showBranch(index + 1));
    showBranch(0);

    /* The contact form is handled by js/enhance.js (honeypot, validation, rate limit). */
})();
