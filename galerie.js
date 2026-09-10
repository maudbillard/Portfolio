import LiquidBackground from "https://cdn.jsdelivr.net/npm/threejs-components@0.0.27/build/backgrounds/liquid1.min.js";

/* --------------------------
   DONNÉES DES PROJETS
   👉 Utilise tes visuels dans Designs/1.png à Designs/11.png

   Le "ratio" ci-dessous n'est qu'une valeur de secours utilisée
   le temps que l'image charge. Dès qu'une image est chargée, son
   vrai ratio (largeur / hauteur réelles du fichier) est appliqué
   automatiquement — plus besoin de le calculer à la main.
-------------------------- */

const PROJECTS = [
  { title: "Cthalha",     category: "Poster",  image: "Designs/1.png",  ratio: "4 / 5" },
  { title: "Recycler le marc de café",       category: "Educational poster",       image: "Designs/2.png",  ratio: "1 / 1" },
  { title: "Substance",     category: "Advertisement,",  image: "Designs/3.png",  ratio: "3 / 4" },
  { title: "Substance", category: "Mockup Advertissement",   image: "Designs/4.png",  ratio: "6 / 7" },
  { title: "EXALT Festival",      category: "Poster",          image: "Designs/5.png",  ratio: "1 / 1" },
  { title: "T-shirt CV design",   category: "Fashion Design",    image: "Designs/6.png",  ratio: "3 / 4" },
  { title: "Vision board 2026",   category: "Poster",  image: "Designs/7.png",  ratio: "4 / 5" },
  { title: "Make your cake",       category: "3D design",       image: "Designs/8.png",  ratio: "1 / 1" },
  { title: "Catch",      category: "Digital painting",      image: "Designs/9.png",  ratio: "3 / 4" },
  { title: "Digitally minded",     category: "Illustration",        image: "Designs/10.png", ratio: "6 / 7" },
];

/* --------------------------
   RENDU DES DEUX COLONNES
-------------------------- */

const trackLeft = document.getElementById("track-left");
const trackRight = document.getElementById("track-right");

function createWorkItem(project) {
  const item = document.createElement("a");
  item.href = "#";
  item.className = "work-item";

  const media = document.createElement("div");
  media.className = "work-item-media";
  media.style.setProperty("--ratio", project.ratio);

  const img = document.createElement("img");
  img.className = "work-item-img";
  img.src = project.image;
  img.alt = project.title;
  img.loading = "lazy";

  // Dès que l'image réelle est chargée, on récupère ses vraies
  // dimensions et on ajuste le ratio du cadre en conséquence.
  // Résultat : chaque affiche s'affiche entière, jamais recadrée.
  const applyRealRatio = () => {
    if (img.naturalWidth && img.naturalHeight) {
      media.style.setProperty("--ratio", `${img.naturalWidth} / ${img.naturalHeight}`);
    }
  };

  if (img.complete) {
    applyRealRatio();
  } else {
    img.addEventListener("load", applyRealRatio, { once: true });
  }

  const canvas = document.createElement("canvas");
  canvas.className = "work-item-canvas";

  media.appendChild(img);
  media.appendChild(canvas);

  const caption = document.createElement("div");
  caption.className = "work-item-caption";
  caption.innerHTML = `
    <span class="work-item-title">${project.title}</span>
    <span class="work-item-category">${project.category}</span>
  `;

  item.appendChild(media);
  item.appendChild(caption);

  // Ouvre l'affiche en plein écran au clic au lieu de suivre le lien "#"
  item.addEventListener("click", (e) => {
    e.preventDefault();
    openLightbox(project.image, project.title);
  });

  return item;
}

PROJECTS.forEach((project, i) => {
  const item = createWorkItem(project);
  if (i % 2 === 0) {
    trackLeft.appendChild(item);
  } else {
    trackRight.appendChild(item);
  }
});

/* --------------------------
   LIGHTBOX (PLEIN ÉCRAN)
-------------------------- */

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxClose = document.getElementById("lightbox-close");

function openLightbox(src, alt) {
  lightboxImg.src = src;
  lightboxImg.alt = alt || "";
  lightbox.classList.add("is-open");
  document.body.style.overflow = "hidden"; // bloque le scroll de la page en arrière-plan

  // Active le mode "loupe" du curseur, seulement en plein écran
  if (cursor) {
    cursor.classList.remove("is-active"); // au cas où on venait de survoler une vignette
    cursor.classList.add("is-zoom");
  }
}

function closeLightbox() {
  lightbox.classList.remove("is-open");
  document.body.style.overflow = "";

  // Désactive le mode loupe et réinitialise l'image de fond du curseur
  if (cursor) {
    cursor.classList.remove("is-zoom", "is-zoom-visible");
    const cursorImageEl = cursor.querySelector(".cursor-image");
    if (cursorImageEl) cursorImageEl.style.backgroundImage = "";
  }
}

lightboxClose?.addEventListener("click", closeLightbox);

// Clic en dehors de l'image (sur le fond) = fermer aussi
lightbox?.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});

// Touche Échap = fermer
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && lightbox.classList.contains("is-open")) {
    closeLightbox();
  }
});

/* --------------------------
   LOUPE DANS LE CURSEUR
   (uniquement quand une image est ouverte en plein écran,
   pas quand on survole simplement les colonnes de la galerie)
-------------------------- */

const LENS_SIZE = 90; // doit correspondre à la taille du curseur en CSS (.custom-cursor)
const ZOOM = 2.2;     // facteur d'agrandissement de la loupe

function updateMagnifier(e) {
  if (!cursor || !lightbox.classList.contains("is-open")) return;

  const cursorImageEl = cursor.querySelector(".cursor-image");
  if (!cursorImageEl) return;

  const rect = lightboxImg.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const inside = x >= 0 && y >= 0 && x <= rect.width && y <= rect.height;

  if (!inside) {
    cursor.classList.remove("is-zoom-visible");
    cursorImageEl.style.backgroundImage = "none"; // vide l'aperçu : simple cercle jaune
    return;
  }

  cursor.classList.add("is-zoom-visible");
  cursorImageEl.style.backgroundImage = `url("${lightboxImg.src}")`;
  cursorImageEl.style.backgroundSize = `${rect.width * ZOOM}px ${rect.height * ZOOM}px`;
  cursorImageEl.style.backgroundPosition =
    `${-(x * ZOOM - LENS_SIZE / 2)}px ${-(y * ZOOM - LENS_SIZE / 2)}px`;
}

lightbox?.addEventListener("mousemove", updateMagnifier);

/* --------------------------
   PARALLAXE INVERSÉ + DÉFORMATION AU SCROLL
-------------------------- */

const gallerySection = document.getElementById("work-gallery");

const MAX_OFFSET = 160;   // décalage max (en px) entre les deux colonnes
const LERP = 0.08;        // fluidité du rattrapage
const MAX_SKEW = 4;       // degrés max de déformation pendant le scroll

let targetProgress = 0;
let currentProgress = 0;
let lastProgress = 0;

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function computeProgress() {
  const rect = gallerySection.getBoundingClientRect();
  const scrollable = gallerySection.offsetHeight - window.innerHeight;
  const raw = -rect.top / Math.max(scrollable, 1);
  targetProgress = clamp(raw, 0, 1);
}

window.addEventListener("scroll", computeProgress, { passive: true });
window.addEventListener("resize", computeProgress);
computeProgress();

function animateParallax() {
  currentProgress += (targetProgress - currentProgress) * LERP;

  const velocity = currentProgress - lastProgress;
  lastProgress = currentProgress;

  const skew = clamp(velocity * 900, -MAX_SKEW, MAX_SKEW);

  const leftY = -currentProgress * MAX_OFFSET;
  const rightY = currentProgress * MAX_OFFSET;

  trackLeft.style.transform = `translateY(${leftY}px) skewY(${skew}deg)`;
  trackRight.style.transform = `translateY(${rightY}px) skewY(${skew}deg)`;

  requestAnimationFrame(animateParallax);
}

animateParallax();

/* --------------------------
   CURSEUR PERSONNALISÉ
-------------------------- */

const cursor = document.querySelector(".custom-cursor");
const isFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

if (isFinePointer && cursor) {
  window.addEventListener("mousemove", (e) => {
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
  });

  document.querySelectorAll(".work-item").forEach((item) => {
    item.addEventListener("mouseenter", () => cursor.classList.add("is-active"));
    item.addEventListener("mouseleave", () => cursor.classList.remove("is-active"));
  });
}

/* --------------------------
   EFFET LIQUIDE AU SURVOL
   (basé sur https://codepen.io/soju22/pen/myVWBGa)
-------------------------- */

const MAX_ACTIVE_LIQUID_APPS = 6; // limite de contextes WebGL simultanés
const activeApps = new Map(); // canvas -> { app, lastUsed }

function evictOldestIfNeeded() {
  if (activeApps.size < MAX_ACTIVE_LIQUID_APPS) return;

  let oldestCanvas = null;
  let oldestTime = Infinity;

  activeApps.forEach((entry, canvas) => {
    if (entry.hovering) return; // ne jamais virer celui survolé actuellement
    if (entry.lastUsed < oldestTime) {
      oldestTime = entry.lastUsed;
      oldestCanvas = canvas;
    }
  });

  if (oldestCanvas) {
    const entry = activeApps.get(oldestCanvas);
    try {
      entry.app.dispose?.();
    } catch (err) {
      console.warn("Nettoyage effet liquide échoué :", err);
    }
    activeApps.delete(oldestCanvas);
    oldestCanvas.classList.remove("is-active");
  }
}

function initLiquid(canvas, imageUrl) {
  // dimensionne le canvas sur la taille réelle affichée avant l'init
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * Math.min(window.devicePixelRatio || 1, 2);
  canvas.height = rect.height * Math.min(window.devicePixelRatio || 1, 2);

  const app = LiquidBackground(canvas);
  app.loadImage(imageUrl);
  // Moins "métallique" et plus "mat" = reflet plus doux, couleurs
  // de l'image moins délavées par la lumière de l'effet.
  app.liquidPlane.material.metalness = 0.25;
  app.liquidPlane.material.roughness = 0.6;
  app.liquidPlane.uniforms.displacementScale.value = 4;
  app.setRain(false);

  return app;
}

if (isFinePointer) {
  document.querySelectorAll(".work-item").forEach((item) => {
    const canvas = item.querySelector(".work-item-canvas");
    const img = item.querySelector(".work-item-img");

    item.addEventListener("mouseenter", () => {
      canvas.classList.add("is-active");

      let entry = activeApps.get(canvas);

      if (!entry) {
        evictOldestIfNeeded();
        const app = initLiquid(canvas, img.src);
        entry = { app, lastUsed: performance.now(), hovering: true };
        activeApps.set(canvas, entry);
      } else {
        entry.hovering = true;
        entry.lastUsed = performance.now();
      }
    });

    item.addEventListener("mouseleave", () => {
      canvas.classList.remove("is-active");
      const entry = activeApps.get(canvas);
      if (entry) {
        entry.hovering = false;
        entry.lastUsed = performance.now();
      }
    });
  });
}

/* --------------------------
   RETOUR AU PORTFOLIO
-------------------------- */

function goBack(e) {
  e.preventDefault();
  if (document.referrer) {
    history.back();
  } else {
    window.location.href = "index.html"; // 👉 adapte si ton fichier d'accueil a un autre nom
  }
}

document.getElementById("nav-back")?.addEventListener("click", goBack);
document.getElementById("nav-back-footer")?.addEventListener("click", goBack);