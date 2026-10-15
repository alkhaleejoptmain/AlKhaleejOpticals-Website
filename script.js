const state = {
    products: [],
    currentFaceShape: null,
    activeSource: null,
    stream: null,
    faceMesh: null,
    lastMetrics: null,
    lastLandmarks: null,
    activeFrameId: null,
    sourceImage: null,
    imageWidth: 0,
    imageHeight: 0
};

const recommendationRules = {
    oval: { bestMatch: ["wayfarer", "aviator", "premium metal"], recommended: ["rectangle", "round", "cat eye"], trending: ["titanium", "oversized"] },
    round: { bestMatch: ["rectangle", "wayfarer", "premium metal"], recommended: ["aviator", "rimless", "titanium"], trending: ["square", "gunmetal"] },
    square: { bestMatch: ["round", "oval", "rimless"], recommended: ["aviator", "cat eye", "transparent"], trending: ["premium metal", "oversized"] },
    heart: { bestMatch: ["oval", "rimless", "aviator"], recommended: ["round", "wayfarer", "premium metal"], trending: ["transparent", "gold"] },
    diamond: { bestMatch: ["oval", "cat eye", "rimless"], recommended: ["rectangle", "aviator", "premium metal"], trending: ["titanium", "silver"] },
    rectangle: { bestMatch: ["round", "oval", "oversized"], recommended: ["rimless", "wayfarer", "cat eye"], trending: ["premium metal", "gold"] }
};

/** Per-shape tuning: ideal width from IPD, lens vertical align, max % of cheek width */
const frameFitConfig = {
    aviator: { widthMult: 3.2, lensOffset: 0.11, yNudge: 0.04, maxCheekFill: 0.94 },
    wayfarer: { widthMult: 3.0, lensOffset: 0.09, yNudge: 0.03, maxCheekFill: 0.91 },
    rectangle: { widthMult: 2.9, lensOffset: 0.08, yNudge: 0.035, maxCheekFill: 0.9 },
    round: { widthMult: 2.8, lensOffset: 0.07, yNudge: 0.03, maxCheekFill: 0.88 },
    "cat eye": { widthMult: 3.05, lensOffset: 0.1, yNudge: 0.025, maxCheekFill: 0.9 }
};

const ui = {
    uploadInput: document.getElementById("uploadInput"),
    uploadZone: document.getElementById("uploadZone"),
    startCameraBtn: document.getElementById("startCameraBtn"),
    captureBtn: document.getElementById("captureBtn"),
    scanBtn: document.getElementById("scanBtn"),
    video: document.getElementById("video"),
    uploadedImage: document.getElementById("uploadedImage"),
    overlayCanvas: document.getElementById("overlayCanvas"),
    tryOnCanvas: document.getElementById("tryOnCanvas"),
    tryOnDisplay: document.getElementById("tryOnDisplay"),
    previewPlaceholder: document.getElementById("previewPlaceholder"),
    analysisText: document.getElementById("analysisText"),
    loadingOverlay: document.getElementById("loadingOverlay"),
    loadingText: document.getElementById("loadingText"),
    faceResultCard: document.querySelector("#faceResultCard .face-result-inner"),
    recommendationBadges: document.getElementById("recommendationBadges"),
    frameTryOnList: document.getElementById("frameTryOnList"),
    tryOnFitLabel: document.getElementById("tryOnFitLabel")
};

const canvasCtx = ui.overlayCanvas?.getContext("2d");

function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function avgLandmark(landmarks, indices) {
    const pts = indices.map((i) => landmarks[i]).filter(Boolean);
    if (!pts.length) return null;
    return {
        x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
        y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
        z: pts.reduce((s, p) => s + (p.z || 0), 0) / pts.length
    };
}

function landmarkToPixel(lm, w, h) {
    return { x: lm.x * w, y: lm.y * h };
}

function getFaceBounds(landmarks, w, h) {
    const leftCheek = landmarkToPixel(landmarks[234], w, h);
    const rightCheek = landmarkToPixel(landmarks[454], w, h);
    const leftTemple = landmarkToPixel(landmarks[127], w, h);
    const rightTemple = landmarkToPixel(landmarks[356], w, h);
    const leftJaw = landmarkToPixel(landmarks[172], w, h);
    const rightJaw = landmarkToPixel(landmarks[397], w, h);
    const leftForehead = landmarkToPixel(landmarks[71], w, h);
    const rightForehead = landmarkToPixel(landmarks[301], w, h);

    const cheekWidth = distance(leftCheek, rightCheek);
    const templeWidth = distance(leftTemple, rightTemple);
    const jawWidth = distance(leftJaw, rightJaw);
    const foreheadWidth = distance(leftForehead, rightForehead);

    return {
        leftCheek,
        rightCheek,
        leftTemple,
        rightTemple,
        cheekWidth,
        templeWidth,
        jawWidth,
        foreheadWidth,
        faceCenterX: (leftCheek.x + rightCheek.x) / 2
    };
}

function getEyeGeometry(landmarks, w, h) {
    const leftEye = landmarks[468] || avgLandmark(landmarks, [33, 133, 159, 145, 153]);
    const rightEye = landmarks[473] || avgLandmark(landmarks, [263, 362, 386, 374, 373]);
    const noseBridge = landmarks[168] || landmarks[6];

    const leftPx = landmarkToPixel(leftEye, w, h);
    const rightPx = landmarkToPixel(rightEye, w, h);

    const ipd = distance(leftPx, rightPx);
    const eyeMid = {
        x: (leftPx.x + rightPx.x) / 2,
        y: (leftPx.y + rightPx.y) / 2
    };
    const angle = Math.atan2(rightPx.y - leftPx.y, rightPx.x - leftPx.x);

    return { leftPx, rightPx, eyeMid, ipd, angle };
}

function computeFramePlacement(landmarks, w, h, frameShape, frameAspect) {
    const geo = getEyeGeometry(landmarks, w, h);
    const bounds = getFaceBounds(landmarks, w, h);
    const cfg = frameFitConfig[frameShape] || frameFitConfig.rectangle;

    const idealWidth = geo.ipd * cfg.widthMult;

    // Max width from face sides — cheekbones, temples, forehead (tightest wins)
    const maxFromCheek = bounds.cheekWidth * cfg.maxCheekFill;
    const maxFromTemple = bounds.templeWidth * (cfg.maxCheekFill - 0.03);
    const maxFromJaw = bounds.jawWidth * 0.86;
    const maxFromForehead = bounds.foreheadWidth * 0.82;

    let maxFrameWidth = Math.min(maxFromCheek, maxFromTemple, maxFromJaw, maxFromForehead);

    // Head tilt makes the frame span wider on screen — shrink allowance
    const tiltFactor = 1 - Math.min(Math.abs(geo.angle), 0.35) * 0.25;
    maxFrameWidth *= tiltFactor;

    // Auto-shrink: never wider than face sides
    let frameWidth = Math.min(idealWidth, maxFrameWidth);
    const wasScaledDown = frameWidth < idealWidth * 0.98;
    const scaleRatio = frameWidth / idealWidth;

    // Keep a sensible minimum so frames don't vanish on small faces
    const minWidth = geo.ipd * 2.1;
    frameWidth = Math.max(Math.min(frameWidth, maxFrameWidth), Math.min(minWidth, maxFrameWidth));

    const frameHeight = frameWidth * frameAspect;

    // Center on eyes, nudged to face center if slightly off
    const centerX = geo.eyeMid.x * 0.7 + bounds.faceCenterX * 0.3;
    const centerY = geo.eyeMid.y - frameHeight * cfg.lensOffset + geo.ipd * cfg.yNudge;

    const cheekFill = frameWidth / bounds.cheekWidth;
    let fitQuality = "fair";
    if (cheekFill >= 0.82 && cheekFill <= 0.96) fitQuality = "excellent";
    else if (cheekFill >= 0.75 && cheekFill <= 1.0) fitQuality = "good";

    return {
        centerX,
        centerY,
        frameWidth,
        frameHeight,
        angle: geo.angle,
        ipd: geo.ipd,
        fitQuality,
        cheekFill,
        wasScaledDown,
        scaleRatio,
        faceWidth: bounds.cheekWidth,
        maxFrameWidth
    };
}

function setAnalysisText(message) {
    if (ui.analysisText) ui.analysisText.textContent = message;
}

function showLoading(show) {
    if (ui.loadingOverlay) ui.loadingOverlay.classList.toggle("hidden", !show);
}

function resetCanvas() {
    if (!canvasCtx || !ui.overlayCanvas) return;
    canvasCtx.clearRect(0, 0, ui.overlayCanvas.width, ui.overlayCanvas.height);
}

function syncCanvasSizeFrom(el) {
    if (!ui.overlayCanvas) return;
    const w = el.videoWidth || el.naturalWidth || el.clientWidth || 640;
    const h = el.videoHeight || el.naturalHeight || el.clientHeight || 480;
    ui.overlayCanvas.width = w;
    ui.overlayCanvas.height = h;
    if (ui.tryOnCanvas) {
        ui.tryOnCanvas.width = w;
        ui.tryOnCanvas.height = h;
    }
    if (ui.tryOnDisplay) {
        ui.tryOnDisplay.width = w;
        ui.tryOnDisplay.height = h;
    }
    state.imageWidth = w;
    state.imageHeight = h;
}

async function loadProducts() {
    try {
        const response = await fetch("products.json");
        state.products = await response.json();
    } catch {
        state.products = buildFallbackProducts();
    }
    state.products = state.products.map((item, i) => ({
        ...item,
        id: item.id || `frame-${i}`,
        image: item.image || `frame-finder/rectangle/rect1.png`
    }));
}

function buildFallbackProducts() {
    const catalog = [
        ["aviator", "a", ["black", "gold", "silver", "gunmetal"]],
        ["wayfarer", "w", ["black", "brown", "brown", "blue"]],
        ["rectangle", "rect", ["black", "gunmetal", "brown", "blue"]],
        ["round", "r", ["black", "gold", "brown", "silver"]],
        ["cat eye", "cat", ["black", "brown", "brown", "gold"]]
    ];
    const products = [];
    catalog.forEach(([shape, prefix, colors]) => {
        const folder = shape === "cat eye" ? "cateye" : shape;
        colors.forEach((color, i) => {
            const file = prefix === "rect" ? `rect${i + 1}` : prefix === "cat" ? `cat${i + 1}` : `${prefix.charAt(0)}${i + 1}`;
            products.push({
                id: `${folder}-${file}`,
                name: `${shape} — ${color}`,
                shape,
                color,
                faceMatch: ["oval", "round", "square"],
                price: `AED ${389 + i * 10}`,
                image: `frame-finder/${folder}/${file}.png`,
                brand: "Premium"
            });
        });
    });
    return products;
}

function createMetrics(landmarks) {
    return {
        foreheadWidth: distance(landmarks[71], landmarks[301]),
        cheekboneWidth: distance(landmarks[234], landmarks[454]),
        jawWidth: distance(landmarks[172], landmarks[397]),
        faceLength: distance(landmarks[10], landmarks[152])
    };
}

function classifyFaceShape(metrics) {
    const widthAvg = (metrics.foreheadWidth + metrics.cheekboneWidth + metrics.jawWidth) / 3;
    const lengthWidthRatio = metrics.faceLength / widthAvg;
    const jawToCheek = metrics.jawWidth / metrics.cheekboneWidth;
    const foreheadToJaw = metrics.foreheadWidth / metrics.jawWidth;

    if (lengthWidthRatio > 1.55 && jawToCheek < 0.95) return "rectangle";
    if (lengthWidthRatio > 1.4 && jawToCheek >= 0.95 && foreheadToJaw > 0.9 && foreheadToJaw < 1.1) return "oval";
    if (lengthWidthRatio <= 1.28 && jawToCheek >= 0.96) return "round";
    if (lengthWidthRatio <= 1.35 && jawToCheek >= 1.0) return "square";
    if (metrics.foreheadWidth > metrics.jawWidth * 1.08) return "heart";
    return "diamond";
}

function drawFaceMeshLandmarks(landmarks) {
    if (!canvasCtx) return;
    resetCanvas();
    const w = state.imageWidth;
    const h = state.imageHeight;
    const bounds = getFaceBounds(landmarks, w, h);
    const geo = getEyeGeometry(landmarks, w, h);

    canvasCtx.strokeStyle = "rgba(201, 154, 60, 0.45)";
    canvasCtx.lineWidth = 1.5;
    canvasCtx.setLineDash([4, 4]);
    canvasCtx.beginPath();
    canvasCtx.moveTo(bounds.leftCheek.x, bounds.leftCheek.y);
    canvasCtx.lineTo(bounds.rightCheek.x, bounds.rightCheek.y);
    canvasCtx.stroke();
    canvasCtx.setLineDash([]);

    canvasCtx.strokeStyle = "rgba(201, 154, 60, 0.6)";
    canvasCtx.beginPath();
    canvasCtx.moveTo(geo.leftPx.x, geo.leftPx.y);
    canvasCtx.lineTo(geo.rightPx.x, geo.rightPx.y);
    canvasCtx.stroke();

    [geo.leftPx, geo.rightPx, bounds.leftCheek, bounds.rightCheek].forEach((p) => {
        canvasCtx.beginPath();
        canvasCtx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        canvasCtx.fillStyle = "#c99a3c";
        canvasCtx.fill();
    });
}

function renderFaceResult(shape, metrics, placement) {
    if (!ui.faceResultCard) return;
    const rows = [
        ["Forehead", metrics.foreheadWidth.toFixed(2)],
        ["Cheekbones", metrics.cheekboneWidth.toFixed(2)],
        ["Jaw", metrics.jawWidth.toFixed(2)],
        ["Eye Distance", placement ? `${placement.ipd.toFixed(0)} px` : "—"],
        ["Face Width", placement ? `${placement.faceWidth?.toFixed(0) || "—"} px` : "—"]
    ];

    ui.faceResultCard.classList.remove("empty");
    ui.faceResultCard.innerHTML = `
        <p class="result-badge">Detected</p>
        <h4>${shape.charAt(0).toUpperCase() + shape.slice(1)} Face Shape</h4>
        <p>AI mapped your eyes, face width, and proportions for accurate virtual try-on.</p>
        <div class="metrics">
            ${rows.map(([l, v]) => `<div class="metric-item"><strong>${l}</strong><br>${v}</div>`).join("")}
        </div>
    `;
}

function renderRecommendations(shape) {
    const rule = recommendationRules[shape] || recommendationRules.oval;
    if (!ui.recommendationBadges) return;
    ui.recommendationBadges.innerHTML = `
        <span class="rec-tag"><strong>Best Match:</strong> ${rule.bestMatch.join(", ")}</span>
        <span class="rec-tag"><strong>Also Recommended:</strong> ${rule.recommended.join(", ")}</span>
        <span class="rec-tag"><strong>Trending:</strong> ${rule.trending.join(", ")}</span>
    `;
}

function isGoodMatch(product, shape) {
    if (!shape) return false;
    if (product.faceMatch.includes(shape)) return true;
    const rule = recommendationRules[shape];
    if (!rule) return false;
    return rule.bestMatch.includes(product.shape) || rule.recommended.includes(product.shape);
}

function renderFrameTryOnList() {
    if (!ui.frameTryOnList) return;

    const shapes = ["aviator", "wayfarer", "rectangle", "round", "cat eye"];
    const grouped = shapes
        .map((shape) => {
            const items = state.products.filter((p) => p.shape === shape);
            if (!items.length) return "";
            const label = shape.charAt(0).toUpperCase() + shape.slice(1);
            return `
                <div class="frame-species-group">
                    <h4 class="frame-species-title">${label}</h4>
                    <div class="frame-species-items">
                        ${items
                            .map((item) => {
                                const match = isGoodMatch(item, state.currentFaceShape);
                                return `
                            <button type="button" class="frame-tryon-item ${match ? "match" : ""}" data-id="${item.id}">
                                <img src="${item.image}" alt="${item.name}">
                                <h5>${item.name}</h5>
                                <span class="frame-color-tag">${item.color}</span>
                                <span class="fit-badge ${match ? "good" : "ok"}">${match ? "Great Fit" : "Try It"}</span>
                            </button>`;
                            })
                            .join("")}
                    </div>
                </div>`;
        })
        .join("");

    ui.frameTryOnList.innerHTML = grouped;

    ui.frameTryOnList.querySelectorAll(".frame-tryon-item").forEach((btn) => {
        btn.addEventListener("click", () => {
            const product = state.products.find((p) => p.id === btn.dataset.id);
            if (product) applyFrameTryOn(product, btn);
        });
    });
}

function getSourceElement() {
    if (state.activeSource === "camera" && ui.video && !ui.video.classList.contains("hidden")) {
        return ui.video;
    }
    if (ui.uploadedImage && !ui.uploadedImage.classList.contains("hidden") && ui.uploadedImage.src) {
        return ui.uploadedImage;
    }
    return null;
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function drawFrameOnCanvas(ctx, source, frameImg, landmarks, product) {
    const w = state.imageWidth;
    const h = state.imageHeight;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(source, 0, 0, w, h);

    const aspect = frameImg.naturalHeight / frameImg.naturalWidth || 0.4;
    const placement = computeFramePlacement(landmarks, w, h, product.shape, aspect);

    ctx.save();
    ctx.translate(placement.centerX, placement.centerY);
    ctx.rotate(placement.angle);
    ctx.drawImage(
        frameImg,
        -placement.frameWidth / 2,
        -placement.frameHeight / 2,
        placement.frameWidth,
        placement.frameHeight
    );
    ctx.restore();

    return placement;
}

async function ensureLandmarks(source) {
    if (state.lastLandmarks) return state.lastLandmarks;
    if (!state.faceMesh) throw new Error("AI not ready");
    syncCanvasSizeFrom(source);
    setAnalysisText("Detecting face for frame fitting...");
    return analyzeFaceOnce(source);
}

function waitForImageReady(el) {
    if (el.videoWidth || (el.naturalWidth && el.complete)) return Promise.resolve();
    return new Promise((resolve) => {
        el.onload = () => resolve();
        el.onerror = () => resolve();
        setTimeout(resolve, 3000);
    });
}

async function applyFrameTryOn(product, btnEl) {
    const source = getSourceElement();
    if (!source) {
        setAnalysisText("Upload or capture a photo first.");
        return;
    }

    await waitForImageReady(source);

    ui.frameTryOnList?.querySelectorAll(".frame-tryon-item").forEach((el) => el.classList.remove("active"));
    btnEl?.classList.add("active");
    state.activeFrameId = product.id;

    try {
        showLoading(true);
        if (ui.loadingText) ui.loadingText.textContent = "Fitting frame to your face...";

        const landmarks = await ensureLandmarks(source);
        syncCanvasSizeFrom(source);

        const w = ui.tryOnDisplay.width;
        const h = ui.tryOnDisplay.height;
        const ctx = ui.tryOnDisplay.getContext("2d");
        const frameImg = await loadImage(product.image);

        const placement = drawFrameOnCanvas(ctx, source, frameImg, landmarks, product);

        const shapeMatch = isGoodMatch(product, state.currentFaceShape);
        const fitLabels = { excellent: "Perfect size fit", good: "Good size fit", fair: "Adjusted fit" };
        const scaledNote = placement.wasScaledDown
            ? ` Auto-sized to ${Math.round(placement.scaleRatio * 100)}% to match your face width.`
            : "";

        if (ui.tryOnFitLabel) {
            if (shapeMatch && placement.fitQuality === "excellent") {
                ui.tryOnFitLabel.textContent = `✓ ${product.name} — Excellent style & ${fitLabels[placement.fitQuality]} for your ${state.currentFaceShape} face.${scaledNote}`;
            } else if (shapeMatch) {
                ui.tryOnFitLabel.textContent = `✓ ${product.name} — Great style match · ${fitLabels[placement.fitQuality]}.${scaledNote}`;
            } else {
                ui.tryOnFitLabel.textContent = `${product.name} — ${fitLabels[placement.fitQuality]} to your face sides.${scaledNote}`;
            }
        }

        setAnalysisText(`Frame sized to your face (${Math.round(placement.cheekFill * 100)}% of cheek width).`);
    } catch (err) {
        console.error(err);
        setAnalysisText("Could not detect face for fitting. Use a front-facing photo with good lighting.");
    } finally {
        showLoading(false);
    }
}

function processFaceResults(landmarks) {
    state.lastLandmarks = landmarks;
    drawFaceMeshLandmarks(landmarks);

    const metrics = createMetrics(landmarks);
    const shape = classifyFaceShape(metrics);
    state.currentFaceShape = shape;
    state.lastMetrics = metrics;

    const geo = getEyeGeometry(landmarks, state.imageWidth, state.imageHeight);
    const bounds = getFaceBounds(landmarks, state.imageWidth, state.imageHeight);
    const placement = { ipd: geo.ipd, faceWidth: bounds.cheekWidth };

    setAnalysisText(`Analysis complete: ${shape} face shape detected.`);
    renderFaceResult(shape, metrics, placement);
    renderRecommendations(shape);
    renderFrameTryOnList();

    return { shape, landmarks };
}

function analyzeFaceOnce(imageEl) {
    return new Promise((resolve, reject) => {
        if (!state.faceMesh) {
            reject(new Error("Face mesh not initialized"));
            return;
        }

        const handler = (results) => {
            state.faceMesh.onResults(onFaceMeshResults);
            if (!results.multiFaceLandmarks?.length) {
                reject(new Error("No face detected"));
                return;
            }
            const landmarks = results.multiFaceLandmarks[0];
            processFaceResults(landmarks);
            resolve(landmarks);
        };

        state.faceMesh.onResults(handler);
        state.faceMesh.send({ image: imageEl }).catch(reject);
    });
}

function onFaceMeshResults(results) {
    showLoading(false);
    if (!results.multiFaceLandmarks?.length) {
        setAnalysisText("No face detected. Use a front-facing photo with good lighting.");
        state.lastLandmarks = null;
        resetCanvas();
        return;
    }

    processFaceResults(results.multiFaceLandmarks[0]);
}

async function runAnalysisOnImage(imageEl) {
    if (!state.faceMesh) {
        setAnalysisText("Loading AI model...");
        return;
    }
    state.sourceImage = imageEl;
    showLoading(true);
    setAnalysisText("Scanning facial landmarks...");
    if (ui.loadingText) ui.loadingText.textContent = "AI is analyzing facial geometry...";
    syncCanvasSizeFrom(imageEl);

    try {
        const landmarks = await analyzeFaceOnce(imageEl);
        const firstMatch = state.products.find((p) => isGoodMatch(p, state.currentFaceShape)) || state.products[0];
        if (firstMatch) {
            const firstBtn = ui.frameTryOnList?.querySelector(".frame-tryon-item");
            await applyFrameTryOn(firstMatch, firstBtn);
        }
        return landmarks;
    } catch {
        setAnalysisText("No face detected. Face the camera directly with good lighting.");
    }
}

function stopCameraStream() {
    if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
        state.stream = null;
    }
}

async function initFaceMesh() {
    if (typeof FaceMesh === "undefined") return;
    state.faceMesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`
    });
    state.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
    });
    state.faceMesh.onResults(onFaceMeshResults);
}

async function startCamera() {
    stopCameraStream();
    ui.previewPlaceholder?.classList.add("hidden");
    ui.video?.classList.remove("hidden");
    ui.uploadedImage?.classList.add("hidden");
    if (ui.captureBtn) ui.captureBtn.disabled = false;
    if (ui.scanBtn) ui.scanBtn.disabled = false;
    state.activeSource = "camera";
    state.lastLandmarks = null;

    state.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false
    });
    ui.video.srcObject = state.stream;
    await ui.video.play();
    syncCanvasSizeFrom(ui.video);
    setAnalysisText("Camera live. Capture then run analysis or try frames.");
}

function captureFromCamera() {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = ui.video.videoWidth;
    tempCanvas.height = ui.video.videoHeight;
    tempCanvas.getContext("2d").drawImage(ui.video, 0, 0);
    const dataUrl = tempCanvas.toDataURL("image/png");
    ui.uploadedImage.src = dataUrl;
    ui.uploadedImage.classList.remove("hidden");
    ui.video.classList.add("hidden");
    stopCameraStream();
    state.activeSource = "upload";
    state.lastLandmarks = null;
    syncCanvasSizeFrom(ui.uploadedImage);
    if (ui.scanBtn) ui.scanBtn.disabled = false;
    setAnalysisText("Photo captured. Run AI analysis or click a frame to auto-fit.");
}

function bindEvents() {
    ui.uploadInput?.addEventListener("change", (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        stopCameraStream();
        const reader = new FileReader();
        reader.onload = (e) => {
            ui.previewPlaceholder?.classList.add("hidden");
            ui.video?.classList.add("hidden");
            ui.uploadedImage.classList.remove("hidden");
            ui.uploadedImage.src = e.target.result;
            state.activeSource = "upload";
            state.lastLandmarks = null;
            if (ui.scanBtn) ui.scanBtn.disabled = false;
            setAnalysisText("Selfie uploaded. Run AI analysis or click a frame to auto-fit.");
        };
        reader.readAsDataURL(file);
    });

    ui.startCameraBtn?.addEventListener("click", async () => {
        try {
            await startCamera();
        } catch (error) {
            setAnalysisText("Camera access denied or unavailable.");
            console.error(error);
        }
    });

    ui.captureBtn?.addEventListener("click", captureFromCamera);

    ui.scanBtn?.addEventListener("click", async () => {
        try {
            const source = getSourceElement();
            if (source) await runAnalysisOnImage(source);
            else setAnalysisText("Please upload a selfie or use the camera first.");
        } catch (error) {
            showLoading(false);
            setAnalysisText("AI scan failed. Please retry.");
            console.error(error);
        }
    });
}

async function init() {
    if (!document.getElementById("uploadInput")) return;
    bindEvents();
    await loadProducts();
    renderFrameTryOnList();
    await initFaceMesh();
}

init();
