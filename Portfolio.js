import * as THREE from "https://unpkg.com/three@0.180.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.180.0/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "https://unpkg.com/three@0.180.0/examples/jsm/loaders/DRACOLoader.js";
import { FontLoader } from "https://unpkg.com/three@0.180.0/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "https://unpkg.com/three@0.180.0/examples/jsm/geometries/TextGeometry.js";
import { SVGLoader } from "https://unpkg.com/three@0.180.0/examples/jsm/loaders/SVGLoader.js";

console.log("Portfolio.js fonctionne !");

const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;
const isMobile = window.innerWidth <= 640;

/* --------------------------
   SCENE BASIC
-------------------------- */


const scene = new THREE.Scene();
const modelScene = new THREE.Scene();
let character = null;
let handTarget = null; 


const mouseNDC = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const mouseWorldPos = new THREE.Vector3();
const dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); 
// plan face à la caméra, à z=0 (ajuste si ton perso n'est pas à z=0)

const camera = new THREE.OrthographicCamera(
  -1, 1, 1, -1, 0, 1
);
const camera3D = new THREE.PerspectiveCamera(
  35,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

camera3D.position.set(0, 2, 8);
camera3D.lookAt(0, 1, 0);

const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true
});

renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const container = document.getElementById("character-container");

function resizeToContainer() {
  const w = container.clientWidth;
  const h = container.clientHeight;

  if (w === 0 || h === 0) return;

  renderer.setSize(w, h);
  camera3D.aspect = w / h;
  camera3D.updateProjectionMatrix();

  material.uniforms.u_resolution.value.set(w, h);
  console.log(w, h)
}

const resizeObserver = new ResizeObserver(resizeToContainer);
resizeObserver.observe(container);


/* IMPORTANT : permet de voir le background CSS */
renderer.setClearColor(0x000000, 0);
renderer.autoClear = false;

document.getElementById("character-container")
  .appendChild(renderer.domElement);

/* --------------------------
   PERSONNAGE 3D
-------------------------- */

const loader = new GLTFLoader();

const dracoLoader = new DRACOLoader();



dracoLoader.setDecoderPath(
  "https://www.gstatic.com/draco/v1/decoders/"
);

loader.setDRACOLoader(dracoLoader);

loader.load(
  "MeV.glb",
  (gltf) => {
    console.log("Personnage chargé !");

   character = gltf.scene;

    character.traverse((child) => {
      if (child.isMesh) {
        child.geometry.computeVertexNormals();
      }
    });

    character.rotation.y = Math.PI;
    character.position.set(0.4, -0.8, 0);
console.log("Position appliquée :", character.position);
    character.scale.set(1.6, 1.6, 1.6);

    modelScene.add(character);

handTarget = null;

character.traverse((child) => {
  if (child.name === "Empty") {
    handTarget = child;
  }
});

if (!handTarget) {
  console.warn("⚠️ Target point introuvable ! Vérifie le nom dans Blender.");
}

const box = new THREE.Box3().setFromObject(character);
const size = new THREE.Vector3();
const center = new THREE.Vector3();

box.getSize(size);
box.getCenter(center);

console.log("Taille :", size);
console.log("Centre :", center);

console.log("Taille personnage :", character);
console.log(character.position);

  },
  undefined,
  (error) => {
    console.error("Erreur chargement GLB :", error);
  }
);

/* --------------------------
  LUMIERES
-------------------------- */

const keyLight = new THREE.DirectionalLight(
  0xffffff,
  1.2
);

keyLight.position.set(0, 5, 3);

modelScene.add(keyLight);


const rimLight = new THREE.DirectionalLight(
  0xffffff,
  2
);

rimLight.position.set(0, 3, -5);

modelScene.add(rimLight);

const warmLight = new THREE.PointLight(
  0xffc27a, //ORANGE DOUX
  20,
  20
);

warmLight.position.set(4, 2, 2);

modelScene.add(warmLight);

const coolLight = new THREE.PointLight(
  0x9dd6ff,   // bleu glacé,
  20,
  20
);

coolLight.position.set(-4, 2, 2);

modelScene.add(coolLight);

const ambient = new THREE.AmbientLight(
  0xffffff,
  0.4
);

modelScene.add(ambient);
/* --------------------------
   SHADER MATERIAL
-------------------------- */

const material = new THREE.ShaderMaterial({
  transparent: true,

 uniforms: {
  u_time: { value: 0 },
  u_scroll: { value: 0 },
  u_resolution: {
    value: new THREE.Vector2(window.innerWidth, window.innerHeight)
  }
},

  vertexShader: `
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `,

  fragmentShader: `
precision highp float;

uniform float u_time;
uniform float u_scroll;
uniform vec2 u_resolution;

float noise(vec2 p){
  return sin(p.x * 3.0 + sin(p.y * 2.0)) * 
         cos(p.y * 3.0 + sin(p.x * 2.0));
}

float hash(float n) {
  return fract(sin(n) * 43758.5453);
}

float metaball(vec2 uv, vec2 pos, float r) {
  float d = distance(uv, pos);
  float n = noise(uv * 8.0 + pos * 10.0 + u_time * 0.3);
  float distortedD = d + n * 0.01;
  return r * r / (distortedD * distortedD + 0.0001);
}

void main() {

  float t = u_time;
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;

  vec3 baseColor = mix(
    vec3(0.8, 0.7, 0.95),
    vec3(0.6, 0.3, 0.7),
    uv.y
  );

  // 🔒 clamp scroll zone (section 2 only)
  float s = smoothstep(0.2, 0.4, u_scroll);

  float id, offset;

  id = 1.0;
  offset = hash(id) * 6.28;
  float m1 = metaball(uv,
    vec2(0.15 + sin(t*0.7 + offset)*0.15,
         0.20 + cos(t*0.5 + offset)*0.15),
    0.10);

  id = 2.0;
  offset = hash(id) * 6.28;
  float m2 = metaball(uv,
    vec2(0.80 + cos(t*0.6 + offset)*0.18,
         0.25 + sin(t*0.9 + offset)*0.16),
    0.11);

  id = 3.0;
  offset = hash(id) * 6.28;
  float m3 = metaball(uv,
    vec2(0.50 + sin(t*0.4 + offset)*0.20,
         0.50 + cos(t*0.8 + offset)*0.18),
    0.12);

  id = 4.0;
  offset = hash(id) * 6.28;
  float m4 = metaball(uv,
    vec2(0.25 + cos(t*0.9 + offset)*0.17,
         0.80 + sin(t*0.6 + offset)*0.19),
    0.11);

  id = 5.0;
  offset = hash(id) * 6.28;
  float m5 = metaball(uv,
    vec2(0.85 + sin(t*0.8 + offset)*0.18,
         0.70 + cos(t*0.7 + offset)*0.17),
    0.10);

  id = 6.0;
  offset = hash(id) * 6.28;
  float m6 = metaball(uv,
    vec2(0.65 + cos(t*0.5 + offset)*0.20,
         0.15 + sin(t*0.9 + offset)*0.18),
    0.10);

  float field = m1 + m2 + m3 + m4 + m5 + m6;

  float shape = smoothstep(1.0, 1.3, field);
  shape = pow(shape, 1.5);

  // 🔒 BLOBS ONLY IN SECTION 2
  shape *= s;

  vec3 finalColor = mix(baseColor, vec3(1.0), shape);

  gl_FragColor = vec4(finalColor, shape * 0.6);
}
  `
});

/* --------------------------
   MESH FULLSCREEN
-------------------------- */

const quad = new THREE.Mesh(
  new THREE.PlaneGeometry(2, 2),
  material
);

scene.add(quad);

/* --------------------------
   ANIMATION LOOP
-------------------------- */

resizeToContainer(); 


function animate() {
  requestAnimationFrame(animate);

  material.uniforms.u_time.value += 0.01;

if (handTarget) {
  const handWorldPos = new THREE.Vector3();
  handTarget.getWorldPosition(handWorldPos);

  const start = handWorldPos;
  const end = mouseWorldPos;

  for (let i = 0; i <= ROPE_SEGMENTS; i++) {
    const t = i / ROPE_SEGMENTS;
    ropeCurvePoints[i].lerpVectors(start, end, t);
  }

  const newCurve = new THREE.CatmullRomCurve3(ropeCurvePoints);
  const newGeometry = new THREE.TubeGeometry(newCurve, ROPE_SEGMENTS, 0.015, 8, false);

  ropeLine.geometry.dispose(); // libère l'ancienne géométrie (évite les fuites mémoire)
  ropeLine.geometry = newGeometry;
}
  renderer.clear();
  renderer.render(modelScene, camera3D);
}

/* --------------------------
   RESIZE
-------------------------- */

window.addEventListener("resize", () => {
  resizeToContainer();
});

/* --------------------------
   CURSEUR
-------------------------- */

/* --------------------------
   CURSEUR
-------------------------- */

const cursor = document.querySelector(".custom-cursor");

window.addEventListener("mousemove", (e) => {
  cursor.style.left = e.clientX + "px";
  cursor.style.top = e.clientY + "px";
});

const CURSOR_OFFSET_X = -16;
const CURSOR_OFFSET_Y = 16;

function updateMouseWorldPos(clientX, clientY) {
  const rect = container.getBoundingClientRect();

  const targetX = clientX + CURSOR_OFFSET_X;
  const targetY = clientY + CURSOR_OFFSET_Y;

  mouseNDC.x = ((targetX - rect.left) / rect.width) * 2 - 1;
  mouseNDC.y = -((targetY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouseNDC, camera3D);
  raycaster.ray.intersectPlane(dragPlane, mouseWorldPos);
}

window.addEventListener("mousemove", (e) => {
  updateMouseWorldPos(e.clientX, e.clientY);
});

/* --------------------------
   ROTATION PERSONNAGE (SOURIS)
-------------------------- */

window.addEventListener("mousemove", (e) => {
  if (!character) return;

  const centerX = window.innerWidth / 2;
  const normalizedX = (e.clientX - centerX) / centerX;

  const maxTilt = 0.20;
  character.rotation.y = Math.PI + normalizedX * maxTilt;
});
/* --------------------------
 AJOUT
-------------------------- */

const cards = document.querySelectorAll(".card");
const dimOverlay = document.querySelector(".dim-overlay");

cards.forEach(card => {
  const inner = card.querySelector(".card-inner");
  let isFlipped = false;

  if (isTouchDevice) {
    // Sur mobile/tablette (pas de hover) : un tap flip la carte
    card.addEventListener("click", () => {
      isFlipped = !isFlipped;
      card.classList.toggle("is-hovered", isFlipped);
      dimOverlay.classList.toggle("active", isFlipped);
      inner.style.transform = isFlipped
        ? "rotateX(0deg) rotateY(180deg)"
        : "rotateX(0deg) rotateY(0deg)";
    });
    return;
  }

  card.addEventListener("mouseenter", () => {
    isFlipped = true;
    card.classList.add("is-hovered");
    dimOverlay.classList.add("active");
  });

  card.addEventListener("mousemove", (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = -(y - centerY) / 15;
    const rotateY = (x - centerX) / 15;

    const flipRotation = isFlipped ? 180 : 0;

    inner.style.transform =
      `rotateX(${rotateX}deg) rotateY(${rotateY + flipRotation}deg)`;
  });

  card.addEventListener("mouseleave", () => {
    isFlipped = false;
    card.classList.remove("is-hovered");
    dimOverlay.classList.remove("active");
    inner.style.transform = "rotateX(0deg) rotateY(0deg)";
  });
});
/* --------------------------
   BACKGROUND SCROLL
-------------------------- */

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgb(hex) {
  const bigint = parseInt(hex.replace("#", ""), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

const colorStart = hexToRgb("#c9b0ea");
const colorEnd = hexToRgb("#a25c41");

const violetSection = document.querySelector(".violet-section");

window.addEventListener("scroll", () => {
  const rect = violetSection.getBoundingClientRect();
  const vh = window.innerHeight;

  // t = 0 quand le haut de .violet-section est juste en bas de l'écran
  // t = 1 quand le haut de .violet-section atteint le haut de l'écran
  let t = 1 - rect.top / vh;
  t = Math.min(1, Math.max(0, t));

  material.uniforms.u_scroll.value = t;

  const r = Math.round(lerp(colorStart.r, colorEnd.r, t));
  const g = Math.round(lerp(colorStart.g, colorEnd.g, t));
  const b = Math.round(lerp(colorStart.b, colorEnd.b, t));

  document.body.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
});

const ROPE_SEGMENTS = 20;

// Points de départ (seront mis à jour à chaque frame)
const ropeCurvePoints = [];
for (let i = 0; i <= ROPE_SEGMENTS; i++) {
  ropeCurvePoints.push(new THREE.Vector3(0, 0, 0));
}

const ropeCurve = new THREE.CatmullRomCurve3(ropeCurvePoints);

const ropeGeometry = new THREE.TubeGeometry(ropeCurve, ROPE_SEGMENTS, 0.03, 8, false);
// paramètres : (courbe, segments le long, RAYON du tube, segments radiaux, fermé?)

const ropeMaterial = new THREE.MeshStandardMaterial({
  color: 0xA56843,
  depthTest: false
});
const ropeLine = new THREE.Mesh(ropeGeometry, ropeMaterial);
ropeLine.renderOrder = 999;

modelScene.add(ropeLine);

animate();

/* --------------------------
   PARTICULES ARRIÈRE-PLAN (MIX LIGNES + GOUTTES)
-------------------------- */

const particlesContainer = document.getElementById("particles-container");

const particlesScene = new THREE.Scene();
const particlesCamera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  50
);
particlesCamera.position.z = 10;

const particlesRenderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true
});
particlesRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
particlesRenderer.setSize(window.innerWidth, window.innerHeight);
particlesContainer.appendChild(particlesRenderer.domElement);

const RAIN_TOP = 8;
const RAIN_BOTTOM = -8;

/* ===== GROUPE 1 : TRAITS (LineSegments) ===== */

const LINE_COUNT = 45;
const STREAK_LENGTH = 0.35;

const lineGeometry = new THREE.BufferGeometry();
const linePositions = new Float32Array(LINE_COUNT * 2 * 3);
const lineSpeeds = new Float32Array(LINE_COUNT);

function setLineAt(i, x, yTop, z) {
  const i6 = i * 6;
  linePositions[i6]     = x;
  linePositions[i6 + 1] = yTop;
  linePositions[i6 + 2] = z;

  linePositions[i6 + 3] = x;
  linePositions[i6 + 4] = yTop - STREAK_LENGTH;
  linePositions[i6 + 5] = z;
}

for (let i = 0; i < LINE_COUNT; i++) {
  const x = (Math.random() - 0.5) * 20;
  const y = RAIN_BOTTOM + Math.random() * (RAIN_TOP - RAIN_BOTTOM);
  const z = (Math.random() - 0.5) * 10;

  setLineAt(i, x, y, z);
  lineSpeeds[i] = 0.02 + Math.random() * 0.025; // un peu plus rapides
}

lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));

const lineMaterial = new THREE.LineBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.16
});

const lineDrops = new THREE.LineSegments(lineGeometry, lineMaterial);
particlesScene.add(lineDrops);

/* ===== GROUPE 2 : GOUTTES (Points + texture) ===== */

function createDropTexture() {
  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size * 2;

  const ctx = canvas.getContext("2d");

  ctx.beginPath();
  ctx.moveTo(size / 2, 0);
  ctx.quadraticCurveTo(size, size * 1.1, size / 2, size * 1.85);
  ctx.quadraticCurveTo(0, size * 1.1, size / 2, 0);
  ctx.closePath();

  const gradient = ctx.createLinearGradient(0, 0, 0, size * 2);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(0.5, "rgba(255,255,255,0.6)");
  gradient.addColorStop(1, "rgba(255,255,255,1)");

  ctx.fillStyle = gradient;
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const dropTexture = createDropTexture();

const DROP_COUNT = 45;

const dropGeometry = new THREE.BufferGeometry();
const dropPositions = new Float32Array(DROP_COUNT * 3);
const dropSpeeds = new Float32Array(DROP_COUNT);

for (let i = 0; i < DROP_COUNT; i++) {
  dropPositions[i * 3]     = (Math.random() - 0.5) * 20;
  dropPositions[i * 3 + 1] = RAIN_BOTTOM + Math.random() * (RAIN_TOP - RAIN_BOTTOM);
  dropPositions[i * 3 + 2] = (Math.random() - 0.5) * 10;

  dropSpeeds[i] = 0.015 + Math.random() * 0.02; // un peu plus lentes
}

dropGeometry.setAttribute("position", new THREE.BufferAttribute(dropPositions, 3));

const dropMaterial = new THREE.PointsMaterial({
  map: dropTexture,
  color: 0xffffff,
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
  sizeAttenuation: true,
  size: 0.3
});

const drops = new THREE.Points(dropGeometry, dropMaterial);
particlesScene.add(drops);

/* ===== ANIMATION COMMUNE ===== */

let particlesScrollProgress = 0;

window.addEventListener("scroll", () => {
  const scrollY = window.scrollY;
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  particlesScrollProgress = maxScroll > 0 ? scrollY / maxScroll : 0;
});

function animateParticles() {
  requestAnimationFrame(animateParticles);

  // --- traits ---
  const lPos = lineGeometry.attributes.position.array;
  for (let i = 0; i < LINE_COUNT; i++) {
    const i6 = i * 6;
    const fall = lineSpeeds[i];

    lPos[i6 + 1] -= fall;
    lPos[i6 + 4] -= fall;

    if (lPos[i6 + 1] < RAIN_BOTTOM) {
      const x = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 10;
      setLineAt(i, x, RAIN_TOP, z);
    }
  }
  lineGeometry.attributes.position.needsUpdate = true;

  // --- gouttes ---
  const dPos = dropGeometry.attributes.position.array;
  for (let i = 0; i < DROP_COUNT; i++) {
    dPos[i * 3 + 1] -= dropSpeeds[i];

    if (dPos[i * 3 + 1] < RAIN_BOTTOM) {
      dPos[i * 3 + 1] = RAIN_TOP;
      dPos[i * 3]     = (Math.random() - 0.5) * 20;
      dPos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
  }
  dropGeometry.attributes.position.needsUpdate = true;

  particlesRenderer.render(particlesScene, particlesCamera);
}

animateParticles();

window.addEventListener("resize", () => {
  particlesCamera.aspect = window.innerWidth / window.innerHeight;
  particlesCamera.updateProjectionMatrix();
  particlesRenderer.setSize(window.innerWidth, window.innerHeight);
});
/* --------------------------
   TEXTE 3D DÉFORMÉ (technique Codrops)
-------------------------- */

document.fonts.ready.then(initLiftText);

function createTextTexture({ blur = 0, color = "white" } = {}) {
  const canvas = document.createElement("canvas");
  const width = 800;
  const height = 500;
  const scale = 15;

  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  if (blur > 0) ctx.filter = `blur(${blur}px)`;

  ctx.fillStyle = color;
  ctx.textBaseline = "top";
  ctx.font = "bold 120px Boldonse, sans-serif";

  ctx.fillText("My", 20, 20);
  ctx.fillText("Designs", 20, 180);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return { texture, width, height };
}

function initLiftText() {
  const container = document.getElementById("lift-canvas-container");
  const w = container.clientWidth;
  const h = container.clientHeight;

  const liftScene = new THREE.Scene();

  // Caméra simple, face au plan — c'est le plan lui-même qu'on incline
  const liftCamera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.1, 2000);
  liftCamera.position.set(0, 0, 300);
  liftCamera.lookAt(0, 0, 0);

  const liftRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  liftRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  liftRenderer.setSize(w, h);
  container.appendChild(liftRenderer.domElement);

  const { texture: mainTexture, width: texW, height: texH } = createTextTexture({ color: "#ebf206" });
  const { texture: shadowTexture } = createTextTexture({ blur: 12, color: "#000000" });

  const easeGLSL = `
    float easeInOutCubic(float x) {
      return x < 0.5 ? 4. * x * x * x : 1. - pow(-2. * x + 2., 3.) / 2.;
    }
    float map(float value, float min1, float max1, float min2, float max2) {
      return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
    }
  `;

  const displacementMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: mainTexture },
      uDisplacement: { value: new THREE.Vector3(9999, 9999, 9999) }
    },
    vertexShader: `
      varying vec2 vUv;
      uniform vec3 uDisplacement;
      ${easeGLSL}
      void main() {
        vUv = uv;
        vec3 new_position = position;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        float dist = length(uDisplacement - worldPosition.xyz);
        float min_distance = 80.0;
        if (dist < min_distance) {
          float distance_mapped = map(dist, 0.0, min_distance, 1.0, 0.0);
          float val = easeInOutCubic(distance_mapped) * 60.0;
          new_position.z += val;
        }
        gl_Position = projectionMatrix * modelViewMatrix * vec4(new_position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D uTexture;
      void main() {
        gl_FragColor = texture2D(uTexture, vUv);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const shadowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: shadowTexture },
      uDisplacement: { value: new THREE.Vector3(9999, 9999, 9999) }
    },
    vertexShader: `
      varying vec2 vUv;
      varying float dist;
      uniform vec3 uDisplacement;
      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        dist = length(uDisplacement - worldPosition.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying float dist;
      uniform sampler2D uTexture;
      float map(float value, float min1, float max1, float min2, float max2) {
        return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
      }
      void main() {
        vec4 color = texture2D(uTexture, vUv);
        float min_distance = 80.0;
        if (dist < min_distance) {
          color.a = map(dist, min_distance, 0.0, color.a, 0.0);
        }
        gl_FragColor = color;
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const geometry = new THREE.PlaneGeometry(texW, texH, 100, 100);

  // 👇 C'est ICI qu'on crée l'effet "posé au sol, vu en biais"
  const TILT_X = -1.1;   // bascule le plan vers l'arrière
  const TILT_Z = 0.23;  // légère rotation diagonale

  const textMesh = new THREE.Mesh(geometry, displacementMaterial);
  textMesh.rotation.x = TILT_X;
  textMesh.rotation.z = TILT_Z;
  liftScene.add(textMesh);

  const shadowMesh = new THREE.Mesh(geometry.clone(), shadowMaterial);
  shadowMesh.rotation.x = TILT_X;
  shadowMesh.rotation.z = TILT_Z;
  shadowMesh.position.z = -5;
  liftScene.add(shadowMesh);

  const hitGeometry = new THREE.PlaneGeometry(texW * 2, texH * 2);
  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const hitPlane = new THREE.Mesh(hitGeometry, hitMaterial);
  hitPlane.rotation.x = TILT_X;
  hitPlane.rotation.z = TILT_Z;
  liftScene.add(hitPlane);

  const liftRaycaster = new THREE.Raycaster();
  const liftPointer = new THREE.Vector2(9999, 9999);

  window.addEventListener("mousemove", (e) => {
    const rect = container.getBoundingClientRect();
    liftPointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    liftPointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  });

  function animateLift() {
    requestAnimationFrame(animateLift);

    liftRaycaster.setFromCamera(liftPointer, liftCamera);
    const intersects = liftRaycaster.intersectObject(hitPlane);

    if (intersects.length > 0) {
      displacementMaterial.uniforms.uDisplacement.value.copy(intersects[0].point);
      shadowMaterial.uniforms.uDisplacement.value.copy(intersects[0].point);
    }

    liftRenderer.render(liftScene, liftCamera);
  }

  animateLift();

  window.addEventListener("resize", () => {
    const newW = container.clientWidth;
    const newH = container.clientHeight;
    liftCamera.left = -newW / 2;
    liftCamera.right = newW / 2;
    liftCamera.top = newH / 2;
    liftCamera.bottom = -newH / 2;
    liftCamera.updateProjectionMatrix();
    liftRenderer.setSize(newW, newH);
  });


  function animateLift() {
    requestAnimationFrame(animateLift);

    liftRaycaster.setFromCamera(liftPointer, liftCamera);
    const intersects = liftRaycaster.intersectObject(hitPlane);

    if (intersects.length > 0) {
      displacementMaterial.uniforms.uDisplacement.value.copy(intersects[0].point);
      shadowMaterial.uniforms.uDisplacement.value.copy(intersects[0].point);
    }

    liftRenderer.render(liftScene, liftCamera);
  }

  animateLift();

  window.addEventListener("resize", () => {
    const newW = container.clientWidth;
    const newH = container.clientHeight;
    liftCamera.left = -newW / 2;
    liftCamera.right = newW / 2;
    liftCamera.top = newH / 2;
    liftCamera.bottom = -newH / 2;
    liftCamera.updateProjectionMatrix();
    liftRenderer.setSize(newW, newH);
  });
}

/* --------------------------
   MORPH CURSEUR - SECTIONS 3, 4 ET 5
-------------------------- */

const cursorEl = document.querySelector(".custom-cursor");
const thirdSectionEl = document.querySelector(".third-section");
const fourthSectionElForCursor = document.querySelector(".fourth-section");
const fifthSectionElForCursor = document.querySelector(".fifth-section");

const dotSectionsState = {
  third: false,
  fourth: false,
  fifth: false
};

function updateCursorDotState() {
  const shouldBeDot = dotSectionsState.third || dotSectionsState.fourth || dotSectionsState.fifth;
  cursorEl.classList.toggle("is-dot", shouldBeDot);
}

const cursorObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.target === thirdSectionEl) {
        dotSectionsState.third = entry.isIntersecting;
      } else if (entry.target === fourthSectionElForCursor) {
        dotSectionsState.fourth = entry.isIntersecting;
      } else if (entry.target === fifthSectionElForCursor) {
        dotSectionsState.fifth = entry.isIntersecting;
      }
    });
    updateCursorDotState();
  },
  { threshold: 0.3 }
);

cursorObserver.observe(thirdSectionEl);
if (fourthSectionElForCursor) cursorObserver.observe(fourthSectionElForCursor);
if (fifthSectionElForCursor) cursorObserver.observe(fifthSectionElForCursor);

/* --------------------------
   CHANGEMENT IMAGE CURSEUR - SECTION 2
-------------------------- */

const section2El = document.querySelector(".violet-section");

const section2Observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      cursorEl.classList.toggle("is-section2", entry.isIntersecting);
    });
  },
  { threshold: 0.3 }
);

section2Observer.observe(section2El);

/* --------------------------
   LIGHTBOX VIDÉO (clic sur un cube)
-------------------------- */

let videoLightboxEl, videoLightboxVideo, volumeSlider, volumeIconBtn;

function createVideoLightbox() {
  const overlay = document.createElement("div");
  overlay.className = "video-lightbox";
  overlay.innerHTML = `
    <div class="video-lightbox-inner">
      <button class="video-lightbox-close" aria-label="Fermer">&times;</button>
      <video class="video-lightbox-video" playsinline></video>
      <div class="video-lightbox-volume">
        <button class="video-lightbox-volume-icon" aria-label="Volume">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M3 10v4h4l5 5V5L7 10H3z"/>
            <path class="vol-wave" d="M16.5 12a4.5 4.5 0 0 0-2.3-3.9v7.8a4.5 4.5 0 0 0 2.3-3.9z"/>
          </svg>
        </button>
        <input type="range" class="video-lightbox-volume-slider" min="0" max="1" step="0.01" value="1">
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  videoLightboxEl = overlay;
  videoLightboxVideo = overlay.querySelector(".video-lightbox-video");
  videoLightboxVideo.loop = true; 
  volumeSlider = overlay.querySelector(".video-lightbox-volume-slider");
  volumeIconBtn = overlay.querySelector(".video-lightbox-volume-icon");

  // Fermer au clic sur la croix ou sur le fond
  overlay.querySelector(".video-lightbox-close").addEventListener("click", closeVideoLightbox);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeVideoLightbox();
  });

  // Fermer avec Échap
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) {
      closeVideoLightbox();
    }
  });

  // Contrôle du volume
  volumeSlider.addEventListener("input", () => {
    const v = parseFloat(volumeSlider.value);
    videoLightboxVideo.volume = v;
    videoLightboxVideo.muted = v === 0;
    updateVolumeIcon(v);
  });

  // Le petit haut-parleur permet de mute/unmute rapidement
  volumeIconBtn.addEventListener("click", () => {
    videoLightboxVideo.muted = !videoLightboxVideo.muted;
    if (!videoLightboxVideo.muted && videoLightboxVideo.volume === 0) {
      videoLightboxVideo.volume = 1;
      volumeSlider.value = 1;
    }
    updateVolumeIcon(videoLightboxVideo.muted ? 0 : videoLightboxVideo.volume);
  });
}

function updateVolumeIcon(volume) {
  volumeIconBtn.classList.toggle("is-muted", volume === 0);
}

function openVideoLightbox(src) {
  if (!videoLightboxEl) createVideoLightbox();

  videoLightboxVideo.src = src;
  videoLightboxVideo.currentTime = 0;
  videoLightboxVideo.muted = false;
  videoLightboxVideo.volume = 1;
  volumeSlider.value = 1;
  updateVolumeIcon(1);

  videoLightboxEl.classList.add("is-open");
  videoLightboxVideo.play().catch(() => {});
}

function closeVideoLightbox() {
  if (!videoLightboxEl) return;
  videoLightboxEl.classList.remove("is-open");
  videoLightboxVideo.pause();
  videoLightboxVideo.removeAttribute("src");
  videoLightboxVideo.load();
}
/* --------------------------
   GALERIE VIDÉO EN CUBE - SECTION 4
-------------------------- */

const videoCubeGrid = document.getElementById("video-cube-grid");

if (videoCubeGrid) {
  // 👇 Une entrée par cube : ton image de face + ta vidéo
  const PROJECTS = [
    { image: "IMGcouverture/1.png", video: "MotionDesign/Sandwich1.mp4" },
    { image: "IMGcouverture/2.png", video: "MotionDesign/Colors.mp4" },
    { image: "IMGcouverture/3.png", video: "MotionDesign/MYCOMM.mp4" },
    { image: "IMGcouverture/4.png", video: "MotionDesign/Mamie.mp4" },
    { image: "IMGcouverture/5.png", video: "MotionDesign/Crystal.mp4" },
    { image: "IMGcouverture/6.png", video: "MotionDesign/Gateau.mp4" },
    { image: "IMGcouverture/7.png", video: "MotionDesign/Donut.mp4" },
    { image: "IMGcouverture/8.png", video: "MotionDesign/dance.mp4" },
    { image: "IMGcouverture/9.png", video: "MotionDesign/Neige.mp4" },
    { image: "IMGcouverture/10.png", video: "MotionDesign/Showreel.mp4" },
    { image: "IMGcouverture/11.png", video: "MotionDesign/CV.mp4" },
    

    // ... ajoute autant d'objets que tu as de projets
  ];

  const CUBE_COUNT = PROJECTS.length;

  for (let i = 0; i < CUBE_COUNT; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "cube-wrapper";

    const cube = document.createElement("div");
    cube.className = "cube";

    // Face avant : ton image
    const front = document.createElement("div");
    front.className = "cube-face cube-face-front";
    const img = document.createElement("img");
    img.src = PROJECTS[i].image;
    img.alt = `Projet ${i + 1}`;
    front.appendChild(img);

    // Face droite : ta vidéo
    const right = document.createElement("div");
    right.className = "cube-face cube-face-right";
    const video = document.createElement("video");
    video.src = PROJECTS[i].video;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";
    right.appendChild(video);

    cube.appendChild(front);
    cube.appendChild(right);
    wrapper.appendChild(cube);
    videoCubeGrid.appendChild(wrapper);

    wrapper.addEventListener("mouseenter", () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    });
    wrapper.addEventListener("mouseleave", () => {
      video.pause();
    });
    wrapper.addEventListener("click", () => openVideoLightbox(PROJECTS[i].video));
  }
}

/* --------------------------
   APPARITION TEXTE CONTACT - SECTION 5
-------------------------- */

const fifthSectionEl = document.querySelector(".fifth-section");

const fifthTextObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        fifthSectionEl.classList.add("is-visible");
      } else {
        fifthSectionEl.classList.remove("is-visible");
      }
    });
  },
  { threshold: 0.3 }
);

fifthTextObserver.observe(fifthSectionEl);

/* ----------------------- AFFICHES - REVEAL EN SÉRIE AU SCROLL -------------------------- */

// Renomme les fichiers et écris tes vraies légendes
const POSTER_DATA = [
    {
        src: "Designs/1.png",
        caption: "Cthalha"
    },
    {
        src: "Designs/2.png",
        caption: "Recycler le marc de café"
    },
    {
        src: "Designs/3.png",
        caption: "Substance"
    },
    {
        src: "Designs/4.png",
        caption: "Substance - Mockup"
    },
    {
        src: "Designs/5.png",
        caption: "Exalt Festival"
    },
    {
        src: "Designs/6.png",
        caption: "T-shirt CV design"
    },
    {
        src: "Designs/7.png",
        caption: "Vision board 2026"
    },
    {
        src: "Designs/8.png",
        caption: "Make your cake"
    }
];

function initPosterReveal() {

    const container = document.getElementById("poster-reveal-container");
    const captionA = document.querySelector(".caption-a");
    const captionB = document.querySelector(".caption-b");

    const w = container.clientWidth;
    const h = container.clientHeight;

    const revealScene = new THREE.Scene();
    const revealCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const revealRenderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true
    });

    revealRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    revealRenderer.setSize(w, h);
    container.appendChild(revealRenderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    const containerAspect = w / h;
    const textureAspects = POSTER_DATA.map(() => containerAspect);

    const textures = POSTER_DATA.map((item, i) =>
        textureLoader.load(item.src, (tex) => {
            textureAspects[i] = tex.image.width / tex.image.height;
            updatePosters();
        })
    );

    const revealMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTextureBase: { value: textures[0] },
            uTextureReveal: { value: textures[1] || textures[0] },
            uBaseAspect: { value: containerAspect },
            uRevealAspect: { value: containerAspect },
            uContainerAspect: { value: containerAspect },
            uProgress: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec2 vUv;
            uniform sampler2D uTextureBase;
            uniform sampler2D uTextureReveal;
            uniform float uBaseAspect;
            uniform float uRevealAspect;
            uniform float uContainerAspect;
            uniform float uProgress;

            vec2 containUv(vec2 uv, float imgAspect, float containerAspect) {
                vec2 st = uv;
                float ratio = imgAspect / containerAspect;
                if (ratio > 1.0) {
                    st.y = (st.y - 0.5) / ratio + 0.5;
                } else {
                    st.x = (st.x - 0.5) * ratio + 0.5;
                }
                return st;
            }

            vec4 sampleContained(sampler2D tex, vec2 uv, float imgAspect) {
                vec2 st = containUv(uv, imgAspect, uContainerAspect);
                if (st.x < 0.0 || st.x > 1.0 || st.y < 0.0 || st.y > 1.0) {
                    return vec4(0.0);
                }
                return texture2D(tex, st);
            }

            void main() {
                vec2 centered = vUv - 0.5;
                centered.x *= uContainerAspect;
                float dist = length(centered);

                float revealRadius = uProgress * 0.9;
                float distFromEdge = dist - revealRadius;
                float ringPattern = sin(distFromEdge * 55.0);
                float ringFade = exp(-abs(distFromEdge) * 7.0);
                float distortAmount = ringPattern * ringFade * 0.025;

                vec2 direction = normalize(centered + 0.0001);
                vec2 distortedUv = vUv + direction * distortAmount;

                vec4 baseColor = sampleContained(uTextureBase, distortedUv, uBaseAspect);
                vec4 revealColor = sampleContained(uTextureReveal, distortedUv, uRevealAspect);

                float edge = smoothstep(revealRadius - 0.05, revealRadius + 0.05, dist);
                float mixFactor = 1.0 - edge;

                gl_FragColor = mix(baseColor, revealColor, mixFactor);
            }
        `
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, revealMaterial);
    revealScene.add(mesh);

    const total = POSTER_DATA.length;
    let lastBaseIndex = -1;

    const MAX_W = 420;
    const MAX_H = 560;

    function getFitSize(aspect) {
        let width = MAX_W;
        let height = width / aspect;
        if (height > MAX_H) {
            height = MAX_H;
            width = height * aspect;
        }
        return { width, height };
    }

    /* --------------------------
       NAVIGATION AU HOVER + WHEEL
    -------------------------- */
    let galleryFloatIndex = 0; // position continue entre 0 et total - 1
    let galleryTween = null;

    function updatePosters() {
        const baseIndex = Math.min(total - 2, Math.floor(galleryFloatIndex));
        const localProgress = galleryFloatIndex - baseIndex;

        revealMaterial.uniforms.uTextureBase.value = textures[baseIndex];
        revealMaterial.uniforms.uTextureReveal.value = textures[baseIndex + 1];
        revealMaterial.uniforms.uBaseAspect.value = textureAspects[baseIndex];
        revealMaterial.uniforms.uRevealAspect.value = textureAspects[baseIndex + 1];
        revealMaterial.uniforms.uProgress.value = localProgress;

        const sizeA = getFitSize(textureAspects[baseIndex]);
        const sizeB = getFitSize(textureAspects[baseIndex + 1]);

        const newWidth = sizeA.width + (sizeB.width - sizeA.width) * localProgress;
        const newHeight = sizeA.height + (sizeB.height - sizeA.height) * localProgress;

        container.style.width = `${newWidth}px`;
        container.style.height = `${newHeight}px`;

        revealRenderer.setSize(newWidth, newHeight);
        revealMaterial.uniforms.uContainerAspect.value = newWidth / newHeight;

        if (baseIndex !== lastBaseIndex) {
            captionA.textContent = POSTER_DATA[baseIndex].caption;
            captionB.textContent = POSTER_DATA[baseIndex + 1].caption;
            lastBaseIndex = baseIndex;
        }

        captionA.style.opacity = 1 - localProgress;
        captionB.style.opacity = localProgress;
    }

    if (isTouchDevice) {
        // Sur mobile/tablette : un tap sur l'affiche déclenche l'onde
        // et passe au design suivant (on boucle à la fin)
        container.addEventListener("click", () => {
            const atEnd = galleryFloatIndex >= total - 1;
            const target = atEnd ? 0 : Math.min(total - 1, Math.floor(galleryFloatIndex) + 1);

            if (galleryTween) galleryTween.kill();

            const state = { v: galleryFloatIndex };
            galleryTween = gsap.to(state, {
                v: target,
                duration: 0.9,
                ease: "power2.inOut",
                onUpdate: () => {
                    galleryFloatIndex = state.v;
                    updatePosters();
                }
            });
        });
    } else {
        container.addEventListener("wheel", (e) => {
            const atStart = galleryFloatIndex <= 0;
            const atEnd = galleryFloatIndex >= total - 1;

            const scrollingUp = e.deltaY < 0;
            const scrollingDown = e.deltaY > 0;

            // aux extrémités, on laisse le scroll normal de la page reprendre
            if ((atStart && scrollingUp) || (atEnd && scrollingDown)) {
                return;
            }

            e.preventDefault();

            galleryFloatIndex += e.deltaY * 0.0025; // sensibilité, ajuste si trop rapide/lent
            galleryFloatIndex = Math.min(total - 1, Math.max(0, galleryFloatIndex));

            updatePosters();
        }, { passive: false });
    }

    updatePosters();

    function animateReveal() {
        requestAnimationFrame(animateReveal);
        revealRenderer.render(revealScene, revealCamera);
    }

    animateReveal();

    window.addEventListener("resize", () => {
        updatePosters();
    });
}

initPosterReveal();

/* --------------------------
   BOUTON MAGNÉTIQUE "GALERIE"
-------------------------- */

const magneticZone = document.getElementById("magnetic-zone");
const magneticBtn = document.getElementById("galerie-btn");

if (magneticZone && magneticBtn && window.gsap) {
  const strength = 0.4;

  function attractTo(clientX, clientY) {
    const rect = magneticZone.getBoundingClientRect();
    const x = gsap.utils.mapRange(rect.left, rect.right, -rect.width / 2, rect.width / 2, clientX);
    const y = gsap.utils.mapRange(rect.top, rect.bottom, -rect.height / 2, rect.height / 2, clientY);

    gsap.to(magneticBtn, {
      x: x * strength,
      y: y * strength,
      duration: 0.4,
      ease: "power2.out",
      overwrite: true
    });
  }

  function releaseMagnet() {
    gsap.to(magneticBtn, {
      x: 0,
      y: 0,
      duration: 0.7,
      ease: "elastic.out(1, 0.4)",
      overwrite: true
    });
  }

  if (isTouchDevice) {
    // Version tactile : le doigt attire le bouton, comme la souris sur desktop
    magneticZone.addEventListener("touchstart", (e) => {
      const touch = e.touches[0];
      if (touch) attractTo(touch.clientX, touch.clientY);
    }, { passive: true });

    magneticZone.addEventListener("touchmove", (e) => {
      const touch = e.touches[0];
      if (touch) attractTo(touch.clientX, touch.clientY);
    }, { passive: true });

    magneticZone.addEventListener("touchend", releaseMagnet);
    magneticZone.addEventListener("touchcancel", releaseMagnet);
  } else {
    magneticZone.addEventListener("mousemove", (e) => {
      attractTo(e.clientX, e.clientY);
    });

    magneticZone.addEventListener("mouseleave", releaseMagnet);
  }

  magneticBtn.addEventListener("click", () => {
    window.location.href = "galerie.html";
  });
}
/* --------------------------
   BANNIÈRE "PORTFOLIO" - CROISEMENT AU SCROLL
-------------------------- */

const portfolioBanner = document.getElementById("portfolio-banner");

if (portfolioBanner) {
  const trackA = portfolioBanner.querySelector(".track-a");
  const trackB = portfolioBanner.querySelector(".track-b");

  if (trackA && trackB) {
function updateBanner() {
  const rect = portfolioBanner.getBoundingClientRect();
  const vh = window.innerHeight;

  let t = 1 - (rect.top + rect.height) / (vh + rect.height);
  t = Math.min(1, Math.max(0, t));

  const range = 60; // distance de parcours en vw de chaque côté du centre

  trackA.style.transform = `translateY(-50%) translateX(calc(-50% + ${-range + t * range * 2}vw))`;
  trackB.style.transform = `translateY(-50%) translateX(calc(-50% + ${range - t * range * 2}vw))`;
}

    window.addEventListener("scroll", updateBanner);
    window.addEventListener("resize", updateBanner);
    updateBanner();
  } else {
    console.warn("⚠️ .track-a ou .track-b introuvable dans #portfolio-banner");
  }
} else {
  console.warn("⚠️ #portfolio-banner introuvable dans le HTML");
}

/* --------------------------
   SECTION MOTION DESIGN - TEXTE PARTICULES INTERACTIF
   (technique adaptée de la démo "Interactive text with particles" - three.js forum)
-------------------------- */

function clampNum(v, min, max) { return Math.min(max, Math.max(min, v)); }

function createMotionParticleSprite() {
  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

class MotionEnvironment {
  constructor(font) {
    this.container = document.getElementById("motion-canvas-container");
    this.font = font;
    this.scene = new THREE.Scene();

    this.createCamera();
    this.createRenderer();
    this.motionText = new MotionParticleText(this.scene, this.font, this.camera, this.container);

    this.resizeObserver = new ResizeObserver(() => this.onWindowResize());
    this.resizeObserver.observe(this.container);

this.sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      console.log("motion-section intersecting:", entry.isIntersecting, entry.intersectionRatio);
      if (entry.isIntersecting) {
        this.motionText.enter();
      } else {
        this.motionText.exit();
      }
    });
  },
  { threshold: 0.3 }
);
this.sectionObserver.observe(this.container.closest(".fourth-section"));
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      65,
      this.container.clientWidth / this.container.clientHeight,
      1,
      10000
    );
    this.camera.position.set(0, 0, 100);
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.container.appendChild(this.renderer.domElement);
    this.renderer.setAnimationLoop(() => this.render());
  }

  render() {
    this.motionText.render();
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.motionText.onResize();
  }
}

class MotionParticleText {
constructor(scene, font, camera, container) {
    this.scene = scene;
    this.font = font;
    this.camera = camera;
    this.container = container;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-9999, -9999);
    this.colorChange = new THREE.Color();

    this.hasEntered = false;
    this.assembling = false;          
    this.opacityState = { value: 0 }; 
    this.scatterTargets = null;       

    this.data = {
      text: "MOTION DESIGN",
      amount: 700,
      particleSize: 1,
      area: 120,
      ease: 0.05,
    };

    this.setup();
    this.bindEvents();
}

  setup() {
    const geometry = new THREE.PlaneGeometry(
      this.visibleWidthAtZDepth(100, this.camera),
      this.visibleHeightAtZDepth(100, this.camera)
    );
    const material = new THREE.MeshBasicMaterial({ visible: false });
    this.planeArea = new THREE.Mesh(geometry, material);
    this.scene.add(this.planeArea);
    this.createText();
  }

  bindEvents() {
    this.container.addEventListener("mousemove", (e) => this.onMouseMove(e));
    this.container.addEventListener("mouseleave", () => {
      this.mouse.set(-9999, -9999);
    });
  }

  onMouseMove(e) {
    const rect = this.container.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  // Déclenché par l'IntersectionObserver quand la section entre dans l'écran
enter() {
  this.hasEntered = true;
  this.particles.visible = true;
  if (this.assembling) return;
  this.assembling = true;
  gsap.killTweensOf(this.opacityState);
  gsap.to(this.opacityState, { value: 1, duration: 0.8, ease: "power2.out" });
}

exit() {
  if (!this.hasEntered || !this.assembling) return;
  this.assembling = false;
  this.scatterTargets = this.generateScatterTargets();
  gsap.killTweensOf(this.opacityState);
  gsap.to(this.opacityState, { value: 0, duration: 0.7, ease: "power2.in" });
}

generateScatterTargets() {
  const count = this.geometryCopy.attributes.position.count;
  const targets = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    targets[i * 3]     = (Math.random() - 0.5) * 400;
    targets[i * 3 + 1] = (Math.random() - 0.5) * 300;
    targets[i * 3 + 2] = (Math.random() - 0.5) * 300;
  }
  return targets;
}

render() {
    if (!this.hasEntered) return;

    this.pointMaterial.uniforms.uOpacity.value = this.opacityState.value;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.planeArea);

    const pos = this.particles.geometry.attributes.position;
    const copy = this.geometryCopy.attributes.position;
    const colors = this.particles.geometry.attributes.customColor;
    const size = this.particles.geometry.attributes.size;

    let mx = 99999, my = 99999;
    if (this.assembling && intersects.length > 0) {
      mx = intersects[0].point.x;
      my = intersects[0].point.y;
    }

    for (let i = 0, l = pos.count; i < l; i++) {
      let initX, initY, initZ;

      if (this.assembling) {
        initX = copy.getX(i);
        initY = copy.getY(i);
        initZ = copy.getZ(i);
      } else {
        initX = this.scatterTargets[i * 3];
        initY = this.scatterTargets[i * 3 + 1];
        initZ = this.scatterTargets[i * 3 + 2];
      }

      let px = pos.getX(i);
      let py = pos.getY(i);
      let pz = pos.getZ(i);

      this.colorChange.setHSL(0.16, 1, 0.55);
      colors.setXYZ(i, this.colorChange.r, this.colorChange.g, this.colorChange.b);
      colors.needsUpdate = true;

      size.array[i] = this.data.particleSize;
      size.needsUpdate = true;

      if (this.assembling) {
        const dx = mx - px;
        const dy = my - py;
        const mouseDistance = this.distance(mx, my, px, py);
        const d = dx * dx + dy * dy;
        const f = -this.data.area / d;

        if (mouseDistance < this.data.area) {
          const t = Math.atan2(dy, dx);
          px += f * Math.cos(t);
          py += f * Math.sin(t);

          this.colorChange.setHSL(0.08, 1.0, 0.55);
          colors.setXYZ(i, this.colorChange.r, this.colorChange.g, this.colorChange.b);
          colors.needsUpdate = true;

          size.array[i] = this.data.particleSize * 1.3;
          size.needsUpdate = true;
        }
      }

      px += (initX - px) * this.data.ease;
      py += (initY - py) * this.data.ease;
      pz += (initZ - pz) * this.data.ease;

      pos.setXYZ(i, px, py, pz);
      pos.needsUpdate = true;
    }
}

createText() {
    const numChars = this.data.text.length;
    const visibleWidth = this.visibleWidthAtZDepth(100, this.camera);
    const visibleHeight = this.visibleHeightAtZDepth(100, this.camera);

    const maxByWidth = (visibleWidth / (numChars * 0.62)) * 0.7;
    const maxByHeight = visibleHeight * 0.35;

    const textSize = clampNum(Math.min(maxByWidth, maxByHeight), 15, 45);

    const thePoints = [];

    const shapes = this.font.generateShapes(this.data.text, textSize);
    const geometry = new THREE.ShapeGeometry(shapes);
    geometry.computeBoundingBox();

const xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
const yMid = (geometry.boundingBox.max.y - geometry.boundingBox.min.y) / 2.85;

    geometry.center();

    const holeShapes = [];
    shapes.forEach((shape) => {
      if (shape.holes && shape.holes.length > 0) {
        shape.holes.forEach((hole) => holeShapes.push(hole));
      }
    });
    shapes.push(...holeShapes);

    const colors = [];
    const sizes = [];

    shapes.forEach((shape) => {
      const amountPoints = shape.type === "Path" ? this.data.amount / 2 : this.data.amount;
      const points = shape.getSpacedPoints(amountPoints);

      points.forEach((element) => {
        thePoints.push(new THREE.Vector3(element.x, element.y, 0));
        colors.push(this.colorChange.r, this.colorChange.g, this.colorChange.b);
        sizes.push(1);
      });
    });

    const geoParticles = new THREE.BufferGeometry().setFromPoints(thePoints);
    geoParticles.translate(xMid, yMid, 0);
    geoParticles.setAttribute("customColor", new THREE.Float32BufferAttribute(colors, 3));
    geoParticles.setAttribute("size", new THREE.Float32BufferAttribute(sizes, 1));

const material = new THREE.ShaderMaterial({
  uniforms: {
    color: { value: new THREE.Color(0xffffff) },
    pointTexture: { value: createMotionParticleSprite() },
    uOpacity: { value: 0 } // 👈 ajouté
  },
  vertexShader: `
    attribute float size;
    attribute vec3 customColor;
    varying vec3 vColor;
    void main() {
      vColor = customColor;
      vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
      gl_PointSize = size * ( 300.0 / -mvPosition.z );
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 color;
    uniform sampler2D pointTexture;
    uniform float uOpacity;
    varying vec3 vColor;
    void main() {
      vec4 texColor = texture2D( pointTexture, gl_PointCoord );
      gl_FragColor = vec4( color * vColor, 1.0 ) * texColor;
      gl_FragColor *= uOpacity;
    }
  `,
  blending: THREE.AdditiveBlending,
  depthTest: false,
  transparent: true
});

this.pointMaterial = material; // 👈 ajouté, pour piloter l'opacité dans render()

this.particles = new THREE.Points(geoParticles, material);

    // 👇 IMPORTANT : on sauvegarde les positions cibles (le texte) AVANT de disperser les particules
    this.geometryCopy = new THREE.BufferGeometry();
    this.geometryCopy.copy(geoParticles);

    this.particles.visible = false; // caché tant que la section n'est pas entrée dans l'écran

    // Dispersion aléatoire de départ -> l'assemblage se fait naturellement via "ease" dans render()
    const posAttr = this.particles.geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setXYZ(
        i,
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 300,
        (Math.random() - 0.5) * 300
      );
    }
    posAttr.needsUpdate = true;

    this.scene.add(this.particles);
  }

  onResize() {
    const geometry = new THREE.PlaneGeometry(
      this.visibleWidthAtZDepth(100, this.camera),
      this.visibleHeightAtZDepth(100, this.camera)
    );
    this.planeArea.geometry.dispose();
    this.planeArea.geometry = geometry;
  }

  visibleHeightAtZDepth(depth, camera) {
    const cameraOffset = camera.position.z;
    if (depth < cameraOffset) depth -= cameraOffset;
    else depth += cameraOffset;
    const vFOV = (camera.fov * Math.PI) / 180;
    return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
  }

  visibleWidthAtZDepth(depth, camera) {
    const height = this.visibleHeightAtZDepth(depth, camera);
    return height * camera.aspect;
  }

  distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  }
}

const motionContainer = document.getElementById("motion-canvas-container");
if (motionContainer) {
  new FontLoader().load(
    "https://unpkg.com/three@0.180.0/examples/fonts/helvetiker_bold.typeface.json",
    (font) => { new MotionEnvironment(font); },
    undefined,
    (error) => console.error("Erreur chargement font Motion Design :", error)
  );
}

/* --------------------------
   SECTION 5 - GRILLE 3D CONTACT
-------------------------- */

const fifthContainer = document.getElementById("fifth-canvas-container");

if (fifthContainer) {

  // Mots qui apparaissent aléatoirement dans la grille
  // Mots qui remplissent les cases restantes (au hasard)
  const contactWords = [
    "maud69.billard@gmail.com"
  ];
// Mots à un emplacement précis : "ligne-colonne": { word, color?, targetWidth?, maxScale?, skip? }
  // skip: true = case volontairement vide (aucun mesh créé)
  const specialPlacements = {
// Ligne 0 — Nom
    "0-0": { word: "MAUD",    targetWidth: 6, maxScale: 1.6 },
    "0-1": { word: "BILLARD", targetWidth: 6, maxScale: 1.6 },
    "0-2": { skip: true },
    "0-3": { skip: true },

    // Ligne 1 — Téléphone occurrence 1 (réduit)
    "1-0": { word: "438",  targetWidth: 3.5, maxScale: 1.0 },
    "1-1": { word: "528",  targetWidth: 3.5, maxScale: 1.0 },
    "1-2": { word: "0790", targetWidth: 3.5, maxScale: 1.0 },
    "1-3": { skip: true },

// Ligne 2 — Email occurrence 1 + Contact me
    "2-0": { word: "maud69.billard", targetWidth: 7, maxScale: 1.2 },
    "2-1": { word: "@gmail.com",     targetWidth: 5, maxScale: 1.2 },
    "2-2": { word: "CONTACT ME", color: "#fc7c1f", targetWidth: 6, maxScale: 1.4 },
    "2-3": { skip: true },

    // Ligne 3 — Téléphone occurrence 2 (réduit)
    "3-0": { word: "(438)",  targetWidth: 3.5, maxScale: 1.0 },
    "3-1": { word: "528",  targetWidth: 3.5, maxScale: 1.0 },
    "3-2": { word: "0790", targetWidth: 3.5, maxScale: 1.0 },
    "3-3": { skip: true },

// Ligne 4 — Nom occurrence 2
    "4-0": { word: "MAUD",    targetWidth: 6, maxScale: 1.6 },
    "4-1": { word: "BILLARD", targetWidth: 6, maxScale: 1.6 },
    "4-2": { skip: true },
    "4-3": { skip: true },

// Ligne 5 — Nom occurrence 3
    "5-0": { skip: true },
    "5-1": { word: "MAUD",    targetWidth: 6, maxScale: 1.6 },
    "5-2": { word: "BILLARD", targetWidth: 6, maxScale: 1.6 },
    "5-3": { skip: true },

    // Ligne 6 — Email occurrence 2 (séparé en 2)
    "6-0": { word: "maud69.billard", targetWidth: 7, maxScale: 1.2 },
    "6-1": { word: "@gmail.com",     targetWidth: 5, maxScale: 1.2 },
    "6-2": { skip: true },
    "6-3": { skip: true }
  };

  const TARGET_WIDTH = 5.5; // largeur cible par défaut pour les mots aléatoires

  function distanceF(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
  }

  function mapF(value, start1, stop1, start2, stop2) {
    return (value - start1) / (stop1 - start1) * (stop2 - start2) + start2;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

// Petite fonction commune : crée une géométrie de texte + son échelle normalisée
  function buildWordGeometry(font, word, { targetWidth = TARGET_WIDTH, maxScale = 1.3 } = {}) {
    const geometry = new TextGeometry(word, {
      font: font,
      size: 2,
      height: 0.8,
      curveSegments: 4,
      bevelEnabled: true,
      bevelThickness: 0.12,
      bevelSize: 0.06,
      bevelOffset: 0,
      bevelSegments: 3
    });

    geometry.computeBoundingBox();
    geometry.center();

    const box = geometry.boundingBox;
    const rawWidth = box.max.x - box.min.x;
    const scale = Math.min(targetWidth / rawWidth, maxScale);

    return { geometry, scale };
  }

  class ContactGrid {
    constructor(font) {
      this.font = font;
      this.gutter = { size: 6 };
      this.meshes = [];
      this.grid = { rows: 7, cols: 4 };
      this.width = fifthContainer.clientWidth;
      this.height = fifthContainer.clientHeight;
      this.mouse3D = new THREE.Vector2();
      this.raycaster = new THREE.Raycaster();

      // Géométries "aléatoires" (défaut)
      this.geometries = contactWords.map((word) => buildWordGeometry(font, word));

// Géométries à placement fixe, avec leurs options propres
      this.specialGeometries = {};
      Object.entries(specialPlacements).forEach(([key, config]) => {
        if (config.skip) {
          this.specialGeometries[key] = { skip: true };
          return;
        }
        this.specialGeometries[key] = {
          ...buildWordGeometry(font, config.word, config),
          color: config.color || null
        };
      });

      this.createScene();
      this.createGrid();
      this.createCamera();
      this.addFloor();
      this.addLights();
      this.animate();

      this.resizeObserver = new ResizeObserver(() => this.onResize());
      this.resizeObserver.observe(fifthContainer);

      fifthContainer.addEventListener("mousemove", (e) => this.onMouseMove(e));
    }

    createScene() {
      this.scene = new THREE.Scene();
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = false;

      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;

      fifthContainer.appendChild(this.renderer.domElement);
    }

    createCamera() {
      this.camera = new THREE.PerspectiveCamera(30, this.width / this.height, 1, 200);
      this.camera.position.set(15, -8, 40);
      this.camera.lookAt(-5, 0, 0);
      this.scene.add(this.camera);
    }

    addLights() {
      this.pinkLight = new THREE.SpotLight(0xf64a91, 0.5, 1000, 1);
      this.pinkLight.position.set(0, 0, 20);
      this.scene.add(this.pinkLight);

      this.greenLight = new THREE.SpotLight(0x3df9c6, 0.5, 1000, 1);
      this.greenLight.position.set(10, -5, 20);
      this.scene.add(this.greenLight);

      const ambient = new THREE.AmbientLight(0xffffff, 0.6);
      this.scene.add(ambient);

      this.keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
      this.keyLight.position.set(10, 10, 30);
      this.scene.add(this.keyLight);
    }

addFloor() {
      const geometry = new THREE.PlaneGeometry(100, 100);
      const material = new THREE.MeshLambertMaterial({ opacity: 0, transparent: true });
      this.floor = new THREE.Mesh(geometry, material);
      this.scene.add(this.floor);
      this.scene.fog = new THREE.Fog(0x1a0330, 40, 70);
    }

    getRandomGeometry() {
      return this.geometries[Math.floor(Math.random() * this.geometries.length)];
    }

createGrid() {
      this.groupMesh = new THREE.Object3D();

      const makeMaterial = (color) => new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.15,
        roughness: 0.4,
        metalness: 0.1
      });

      const defaultMaterial = makeMaterial("#ebf206");
      const contactMaterial = makeMaterial("#fc7c1f");

for (let row = 0; row < this.grid.rows; row++) {
        this.meshes[row] = [];
        for (let col = 0; col < this.grid.cols; col++) {

          const key = `${row}-${col}`;
          const special = this.specialGeometries[key];

          if (special && special.skip) {
            this.meshes[row][col] = null;
            continue;
          }

          const { geometry, scale } = special || this.getRandomGeometry();

          const material = special && special.color ? contactMaterial : defaultMaterial;
          const mesh = new THREE.Mesh(geometry, material);

          mesh.scale.setScalar(scale);
          mesh.position.z = -1;
          mesh.position.x = col + col * this.gutter.size;
          mesh.position.y = row + row * this.gutter.size;

          this.groupMesh.add(mesh);
          this.meshes[row][col] = mesh;
        }
      }

const offsetX = 10; // ajuste cette valeur pour décaler plus ou moins à droite
      const centerX = -(this.grid.cols / 2) * this.gutter.size - 1 + offsetX;
      const centerY = -(this.grid.rows / 2) * this.gutter.size - 1;
      this.groupMesh.position.set(centerX, centerY, 0);

      this.scene.add(this.groupMesh);
    }
    draw() {
      this.pinkLight.position.x = 20;
      gsap.to(this.pinkLight.position, { y: this.mouse3D.y * 15, duration: 2.5 });

      this.greenLight.position.x = -20;
      gsap.to(this.greenLight.position, { y: this.mouse3D.y * 8, duration: 2.5 });

      this.raycaster.setFromCamera(this.mouse3D, this.camera);
      const intersects = this.raycaster.intersectObjects([this.floor]);

      if (intersects.length) {
        const { x, y } = intersects[0].point;

for (let row = 0; row < this.grid.rows; row++) {
          for (let col = 0; col < this.grid.cols; col++) {
            const mesh = this.meshes[row][col];
            if (!mesh) continue;

            const mouseDistance = distanceF(
              x, y,
              mesh.position.x + this.groupMesh.position.x + this.gutter.size / 2,
              mesh.position.y + this.groupMesh.position.y + this.gutter.size / 2
            );

            const z = mapF(mouseDistance / 4, 0.3, 0, 0, 1) - 5;

            let duration = mouseDistance / 3;
            duration = clamp(duration, 0.5, 1.5);

            gsap.to(mesh.position, { z, duration });
          }
        }
      }
    }

    onMouseMove(e) {
      const rect = fifthContainer.getBoundingClientRect();
      this.mouse3D.x = ((e.clientX - rect.left) / this.width) * 2 - 1;
      this.mouse3D.y = -((e.clientY - rect.top) / this.height) * 2 + 1;
    }

    onResize() {
      this.width = fifthContainer.clientWidth;
      this.height = fifthContainer.clientHeight;

      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();

      this.renderer.setSize(this.width, this.height);
    }

    animate() {
      this.draw();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(() => this.animate());
    }
  }

  new FontLoader().load(
    "https://unpkg.com/three@0.180.0/examples/fonts/helvetiker_bold.typeface.json",
    (font) => {
      new ContactGrid(font);
    },
    undefined,
    (error) => {
      console.error("Erreur chargement font :", error);
    }
  );
}

/* --------------------------
   BOUTONS RÉSEAUX SOCIAUX 3D
-------------------------- */

const socialButtons = document.querySelectorAll(".social-btn");

socialButtons.forEach((btn) => {
  const iconName = btn.dataset.icon; // "Instagram", "Linkedin", "YouTube", "Behance"
  const canvasContainer = btn.querySelector(".social-btn-canvas");
  createSocialIcon3D(canvasContainer, `Icons/${iconName}.svg`, btn); // 👈 "Icons/" avec majuscule
});

function createSocialIcon3D(container, svgPath, hoverTarget) {
  const w = container.clientWidth || 70;
  const h = container.clientHeight || 70;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
  camera.position.set(0, 0, 60);

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(w, h);
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const light = new THREE.DirectionalLight(0xffffff, 1.5);
  light.position.set(2, 3, 5);
  scene.add(light);

  const group = new THREE.Group();
  scene.add(group);

  new SVGLoader().load(svgPath, (data) => {
    const shapes = [];
    data.paths.forEach((path) => shapes.push(...SVGLoader.createShapes(path)));

    const material = new THREE.MeshStandardMaterial({
      color: 0xebf206,
      metalness: 0.3,
      roughness: 0.4
    });

    shapes.forEach((shape) => {
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 6,
        bevelEnabled: true,
        bevelThickness: 1,
        bevelSize: 0.5,
        bevelSegments: 2
      });
      group.add(new THREE.Mesh(geometry, material));
    });

    // Centrage + mise à l'échelle automatique
    const box = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    box.getCenter(center);
    group.children.forEach((mesh) => mesh.position.sub(center));

    const size = new THREE.Vector3();
    box.getSize(size);
    const scale = 30 / Math.max(size.x, size.y);
    group.scale.set(scale, -scale, scale); // -scale sur Y car SVG et Three.js n'ont pas le même repère
  });

  let isHovering = false;
  hoverTarget.addEventListener("mouseenter", () => { isHovering = true; });
  hoverTarget.addEventListener("mouseleave", () => { isHovering = false; });

  function animate() {
    requestAnimationFrame(animate);
    if (isHovering) {
      group.rotation.y += 0.06;
    } else {
      group.rotation.y += (0 - group.rotation.y) * 0.05; // retour doux à 0
    }
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener("resize", () => {
    const newW = container.clientWidth;
    const newH = container.clientHeight;
    if (!newW || !newH) return;
    camera.aspect = newW / newH;
    camera.updateProjectionMatrix();
    renderer.setSize(newW, newH);
  });
}

//  EFFET PARALLAXE

const sunLayer = document.getElementById('sunLayer');
const parallaxLayers = document.querySelectorAll('.parallax-layer[data-speed]');

// soleil visible en haut de la page 1, "couché" vers 70vh (derrière les dunes) à la fin de la page 2
const sunStartTop = 58;  // bas de la 1ère page (au lieu de 8)
const sunEndTop = 90;    // remonte légèrement puis se cache derrière les dunes

const sunStartScale = 1;      // taille de départ (100%)
const sunEndScale = 0.5;      // taille à la fin (50%, ajuste selon l'effet voulu)

function updateDesertParallax() {
  const scrollY = window.scrollY;
  const vh = window.innerHeight;
  const zoneHeight = vh * 2; // video-section + violet-section

  // progression 0 → 1 sur les 2 premières pages
  const progress = Math.min(Math.max(scrollY / zoneHeight, 0), 1);

  // le soleil descend
  const sunTop = sunStartTop + (sunEndTop - sunStartTop) * progress;
  sunLayer.style.top = sunTop + 'vh';

  // nouvelle ligne : le soleil rapetisse avec le scroll
  const sunScale = sunStartScale + (sunEndScale - sunStartScale) * progress;
 sunLayer.style.transform = `translateX(-50%) scale(${sunScale})`;

  // chaque calque de dunes bouge à sa propre vitesse
  // translateX(-50%) recentre le calque (laissé en left:50% en CSS)
  // même quand sa largeur change (mode "cover" en mobile)
  parallaxLayers.forEach(layer => {
    const speed = parseFloat(layer.dataset.speed);
    layer.style.transform = `translateX(-50%) translateY(${scrollY * speed * -0.5}px)`;
  });
}

window.addEventListener('scroll', updateDesertParallax);
updateDesertParallax();


/* --------------------------
   SECTION "LET'S WORK TOGETHER" - EFFET FLICKER AU SCROLL
-------------------------- */

const TOGETHER_PHRASE = "Let's work together!";
const TOGETHER_REPEAT_COUNT = 7; // ajuste selon la hauteur voulue
const OUTLINE_ONLY_CHANCE = 0.18; // ~18% des lettres restent en contour pur

function buildLetterLine(text, offsetX, baseOpacity) {
  const wrap = document.createElement("div");
  wrap.className = "together-line";
  wrap.style.marginLeft = `${offsetX}vw`;
  wrap.style.opacity = baseOpacity;
  const fillSpans = [];

  [...text].forEach((ch) => {
    if (ch === " ") {
      const space = document.createElement("span");
      space.className = "space";
      space.innerHTML = "&nbsp;";
      wrap.appendChild(space);
      return;
    }

    const letterWrap = document.createElement("span");
    letterWrap.className = "letter-wrap";

    const outline = document.createElement("span");
    outline.className = "letter-outline";
    outline.textContent = ch;

    const fill = document.createElement("span");
    fill.className = "letter-fill";
    fill.textContent = ch;

    letterWrap.appendChild(outline);
    letterWrap.appendChild(fill);
    wrap.appendChild(letterWrap);

    // Certaines lettres restent en contour pur : on ne les ajoute pas
    // à fillSpans, donc leur remplissage (opacity: 0 par défaut) ne sera jamais animé
    const isOutlineOnly = Math.random() < OUTLINE_ONLY_CHANCE;
    if (!isOutlineOnly) {
      fillSpans.push(fill);
    }
  });

  return { wrap, fillSpans };
}

// Flicker complet (utilisé à l'entrée dans la section)
function flickerLetters(letters) {
  letters.forEach((letter, i) => {
    gsap.killTweensOf(letter);

    const tl = gsap.timeline({ delay: i * 0.01 });
    const flickerCount = 4 + Math.floor(Math.random() * 5);

    for (let f = 0; f < flickerCount; f++) {
      tl.set(
        letter,
        { opacity: Math.random() > 0.45 ? 1 : 0.1 },
        `+=${0.025 + Math.random() * 0.06}`
      );
    }

    tl.set(letter, { opacity: 1 });
  });
}

// Petit flicker rapide sur des lettres aléatoires (utilisé pendant le scroll)
function flickerRandomLetters(letters, intensity = 1) {
  const count = Math.max(1, Math.floor(letters.length * 0.05 * intensity));

  for (let n = 0; n < count; n++) {
    const letter = letters[Math.floor(Math.random() * letters.length)];
    if (!letter) continue;

    gsap.killTweensOf(letter);

    const tl = gsap.timeline();
    const flickerCount = 2 + Math.floor(Math.random() * 3);

    for (let f = 0; f < flickerCount; f++) {
      tl.set(
        letter,
        { opacity: Math.random() > 0.4 ? 1 : 0.15 },
        `+=${0.02 + Math.random() * 0.05}`
      );
    }

    tl.set(letter, { opacity: 1 });
  }
}

const togetherLinesEl = document.getElementById("together-lines");

if (togetherLinesEl && window.gsap) {

  const OFFSETS = [-15, 5, -35, 20, -5, 30, -25, 10, -20, 15];
  const OPACITIES = [1, 0.4, 1, 0.6, 1, 0.35, 0.8, 0.5, 1, 0.45];

  let allTogetherLetters = [];
  let togetherSectionEl, togetherObserver;
  let togetherInView = false;

  function buildAllLines() {
    // reset
    togetherLinesEl.innerHTML = "";
    allTogetherLetters = [];

    const sectionEl = togetherLinesEl.closest(".together-section");
    const containerHeight = sectionEl.clientHeight;

    // On construit une première ligne "test" pour mesurer sa hauteur réelle
    const { wrap: testWrap } = buildLetterLine(TOGETHER_PHRASE, 0, 1);
    testWrap.style.visibility = "hidden";
    togetherLinesEl.appendChild(testWrap);

    const lineHeight = testWrap.offsetHeight;
    const gapPx = parseFloat(getComputedStyle(togetherLinesEl).rowGap || 0);

    togetherLinesEl.innerHTML = ""; // on nettoie la ligne test

    if (lineHeight === 0) return; // police pas encore chargée, on réessaiera

    // Combien de lignes complètes tiennent dans la hauteur du container ?
    const maxLines = Math.max(
      1,
      Math.floor((containerHeight + gapPx) / (lineHeight + gapPx))
    );

    for (let i = 0; i < maxLines; i++) {
      const offsetX = OFFSETS[i % OFFSETS.length];
      const baseOpacity = OPACITIES[i % OPACITIES.length];
      const { wrap, fillSpans } = buildLetterLine(TOGETHER_PHRASE, offsetX, baseOpacity);
      togetherLinesEl.appendChild(wrap);
      allTogetherLetters = allTogetherLetters.concat(fillSpans);
    }
  }

  function setupObserver() {
    if (togetherObserver) togetherObserver.disconnect();

    togetherSectionEl = togetherLinesEl.closest(".together-section");

    togetherObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          togetherInView = entry.isIntersecting;

          if (togetherInView) {
            flickerLetters(allTogetherLetters);
          } else {
            allTogetherLetters.forEach((l) => {
              gsap.killTweensOf(l);
              gsap.set(l, { opacity: 0 });
            });
          }
        });
      },
      { threshold: 0.3 }
    );

    togetherObserver.observe(togetherSectionEl);
  }

  // Construction initiale (après chargement de la police pour mesurer correctement)
  document.fonts.ready.then(() => {
    buildAllLines();
    setupObserver();
  });

  // Recalcul au resize (débit limité)
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      buildAllLines();
      setupObserver();
      if (togetherInView) flickerLetters(allTogetherLetters);
    }, 200);
  });

  let lastScrollY = window.scrollY;
  let scrollTicking = false;

  window.addEventListener("scroll", () => {
    if (!togetherInView) return;

    const currentScrollY = window.scrollY;
    const delta = Math.abs(currentScrollY - lastScrollY);
    lastScrollY = currentScrollY;

    if (delta < 1) return;

    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(() => {
        const intensity = Math.min(3, delta / 15);
        flickerRandomLetters(allTogetherLetters, intensity);
        scrollTicking = false;
      });
    }
  });
}