// ============================================================
//  AI Route Planner — script.js
//  Three.js 3D graph + animated 2D demo + particles + algos
// ============================================================

// ── Graph Data ──────────────────────────────────────────────
const NODES = {
  A: { x: -3.5, y:  0,   z:  0,   label: "A" },
  B: { x: -1.5, y:  1.5, z:  1,   label: "B" },
  C: { x: -1.5, y: -1.5, z: -1,   label: "C" },
  D: { x:  0.5, y:  0,   z:  0.5, label: "D" },
  E: { x:  2.5, y:  1.5, z: -0.5, label: "E" },
  F: { x:  2.5, y: -1.5, z:  1,   label: "F" },
  G: { x:  4,   y:  0,   z:  0,   label: "G" }
};

const EDGES = [
  { from:"A", to:"B", w:2 },
  { from:"A", to:"C", w:4 },
  { from:"B", to:"D", w:3 },
  { from:"C", to:"D", w:1 },
  { from:"D", to:"E", w:5 },
  { from:"D", to:"F", w:2 },
  { from:"E", to:"G", w:1 },
  { from:"F", to:"G", w:3 },
  { from:"B", to:"E", w:6 },
  { from:"C", to:"F", w:4 }
];

const NODE_KEYS = Object.keys(NODES);

// ── Build adjacency list ─────────────────────────────────────
function buildAdj() {
  const adj = {};
  NODE_KEYS.forEach(k => (adj[k] = []));
  EDGES.forEach(e => {
    adj[e.from].push({ node: e.to, w: e.w });
    adj[e.to].push({ node: e.from, w: e.w });
  });
  return adj;
}

// ── Algorithms ───────────────────────────────────────────────
function bfs(start, end, adj) {
  const queue = [[start]], visited = new Set([start]);
  while (queue.length) {
    const path = queue.shift(), node = path[path.length - 1];
    if (node === end) return { path, cost: getPathCost(path) };
    for (const nb of adj[node])
      if (!visited.has(nb.node)) { visited.add(nb.node); queue.push([...path, nb.node]); }
  }
  return null;
}

function dfs(start, end, adj) {
  const stack = [[start]], visited = new Set([start]);
  while (stack.length) {
    const path = stack.pop(), node = path[path.length - 1];
    if (node === end) return { path, cost: getPathCost(path) };
    for (const nb of adj[node])
      if (!visited.has(nb.node)) { visited.add(nb.node); stack.push([...path, nb.node]); }
  }
  return null;
}

function ucs(start, end, adj) {
  const pq = [{ cost: 0, path: [start] }], visited = {};
  while (pq.length) {
    pq.sort((a, b) => a.cost - b.cost);
    const { cost, path } = pq.shift(), node = path[path.length - 1];
    if (visited[node]) continue;
    visited[node] = true;
    if (node === end) return { path, cost };
    for (const nb of adj[node])
      if (!visited[nb.node]) pq.push({ cost: cost + nb.w, path: [...path, nb.node] });
  }
  return null;
}

function heuristic3D(a, b) {
  const dx = NODES[a].x - NODES[b].x, dy = NODES[a].y - NODES[b].y, dz = NODES[a].z - NODES[b].z;
  return Math.sqrt(dx*dx + dy*dy + dz*dz) * 0.6;
}

function astar(start, end, adj) {
  const open = [{ f: 0, g: 0, path: [start] }], closed = {};
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const { g, path } = open.shift(), node = path[path.length - 1];
    if (closed[node]) continue;
    closed[node] = true;
    if (node === end) return { path, cost: g };
    for (const nb of adj[node]) {
      if (!closed[nb.node]) { const ng = g + nb.w; open.push({ f: ng + heuristic3D(nb.node, end), g: ng, path: [...path, nb.node] }); }
    }
  }
  return null;
}

function greedy(start, end, adj) {
  let node = start; const path = [start], visited = new Set([start]);
  while (node !== end) {
    const nbs = adj[node].filter(n => !visited.has(n.node));
    if (!nbs.length) return null;
    nbs.sort((a, b) => heuristic3D(a.node, end) - heuristic3D(b.node, end));
    node = nbs[0].node; visited.add(node); path.push(node);
  }
  return { path, cost: getPathCost(path) };
}

function runAlgo(name, start, end) {
  const adj = buildAdj();
  if (name === "bfs")    return bfs(start, end, adj);
  if (name === "dfs")    return dfs(start, end, adj);
  if (name === "ucs")    return ucs(start, end, adj);
  if (name === "astar")  return astar(start, end, adj);
  if (name === "greedy") return greedy(start, end, adj);
  return null;
}

function getPathCost(path) {
  let c = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const e = EDGES.find(e => (e.from===path[i]&&e.to===path[i+1])||(e.to===path[i]&&e.from===path[i+1]));
    if (e) c += e.w;
  }
  return c;
}

// ── Populate selects ─────────────────────────────────────────
function populateSelects() {
  const ids = ["start3d","end3d","startNode2d","endNode2d"];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    NODE_KEYS.forEach((k, i) => {
      const opt = document.createElement("option");
      opt.value = k; opt.textContent = k;
      if (id.includes("start") && i === 0) opt.selected = true;
      if (id.includes("end")   && k === "G") opt.selected = true;
      el.appendChild(opt);
    });
  });
}

// ════════════════════════════════════════════════════════════
//  THREE.JS 3D SCENE
// ════════════════════════════════════════════════════════════
let scene, camera, renderer3d, nodeMeshes = {}, edgeMeshes = [], labelSprites = {};
let isDragging = false, prevMouse = { x: 0, y: 0 }, spherical = { theta: 0.4, phi: 1.1, r: 12 };
let animFrameId;

function initThree() {
  const canvas = document.getElementById("canvas3d");
  if (!canvas) return;

  scene = new THREE.Scene();
  scene.background = null;

  const w = canvas.clientWidth, h = canvas.clientHeight;
  camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100);
  updateCameraPosition();

  renderer3d = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer3d.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer3d.setSize(w, h);
  renderer3d.setClearColor(0x000000, 0);

  // Lighting
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const dLight = new THREE.DirectionalLight(0xa78bfa, 1.2);
  dLight.position.set(5, 8, 5);
  scene.add(dLight);
  const pLight = new THREE.PointLight(0x34d399, 1.5, 20);
  pLight.position.set(-4, 3, -3);
  scene.add(pLight);

  buildThreeGraph();
  animateThree();

  // Mouse orbit
  canvas.addEventListener("mousedown", e => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; });
  window.addEventListener("mouseup", () => { isDragging = false; });
  window.addEventListener("mousemove", e => {
    if (!isDragging) return;
    const dx = e.clientX - prevMouse.x, dy = e.clientY - prevMouse.y;
    spherical.theta -= dx * 0.008;
    spherical.phi   = Math.max(0.3, Math.min(Math.PI - 0.3, spherical.phi + dy * 0.008));
    prevMouse = { x: e.clientX, y: e.clientY };
    updateCameraPosition();
  });
  canvas.addEventListener("wheel", e => {
    spherical.r = Math.max(5, Math.min(20, spherical.r + e.deltaY * 0.01));
    updateCameraPosition();
    e.preventDefault();
  }, { passive: false });

  // Touch orbit
  let lastTouch = null;
  canvas.addEventListener("touchstart", e => { lastTouch = e.touches[0]; });
  canvas.addEventListener("touchmove", e => {
    if (!lastTouch) return;
    const t = e.touches[0], dx = t.clientX - lastTouch.clientX, dy = t.clientY - lastTouch.clientY;
    spherical.theta -= dx * 0.01;
    spherical.phi = Math.max(0.3, Math.min(Math.PI - 0.3, spherical.phi + dy * 0.01));
    lastTouch = t;
    updateCameraPosition();
    e.preventDefault();
  }, { passive: false });

  // Resize
  window.addEventListener("resize", () => {
    const w2 = canvas.clientWidth, h2 = canvas.clientHeight;
    camera.aspect = w2 / h2;
    camera.updateProjectionMatrix();
    renderer3d.setSize(w2, h2);
  });
}

function updateCameraPosition() {
  const { theta, phi, r } = spherical;
  camera.position.set(
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.cos(theta)
  );
  camera.lookAt(0, 0, 0);
}

function buildThreeGraph(pathNodes = []) {
  // Clear old
  edgeMeshes.forEach(m => scene.remove(m));
  edgeMeshes = [];
  Object.values(nodeMeshes).forEach(m => scene.remove(m));
  nodeMeshes = {};
  Object.values(labelSprites).forEach(s => scene.remove(s));
  labelSprites = {};

  const pathSet = new Set(pathNodes);
  const pathEdgeSet = new Set();
  for (let i = 0; i < pathNodes.length - 1; i++)
    pathEdgeSet.add(pathNodes[i] + "-" + pathNodes[i+1]);

  // Edges
  EDGES.forEach(e => {
    const A = NODES[e.from], B = NODES[e.to];
    const inPath = pathEdgeSet.has(e.from+"-"+e.to) || pathEdgeSet.has(e.to+"-"+e.from);
    const dir = new THREE.Vector3(B.x-A.x, B.y-A.y, B.z-A.z);
    const len = dir.length();
    const mid = new THREE.Vector3((A.x+B.x)/2, (A.y+B.y)/2, (A.z+B.z)/2);

    const geo = new THREE.CylinderGeometry(inPath ? 0.06 : 0.03, inPath ? 0.06 : 0.03, len, 8);
    const mat = new THREE.MeshPhongMaterial({
      color: inPath ? 0x7c6ff7 : 0x2a2850,
      emissive: inPath ? 0x4a3fa0 : 0x0a0830,
      transparent: true,
      opacity: inPath ? 1 : 0.6
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
    scene.add(mesh);
    edgeMeshes.push(mesh);

    // Weight label canvas sprite
    const canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 32;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = inPath ? "rgba(124,111,247,0.9)" : "rgba(30,28,53,0.8)";
    ctx.beginPath(); ctx.roundRect(4, 4, 56, 24, 6); ctx.fill();
    ctx.fillStyle = inPath ? "#fff" : "#8b87b8";
    ctx.font = "bold 16px monospace";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(e.w, 32, 16);
    const tex = new THREE.CanvasTexture(canvas);
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
    spr.scale.set(0.6, 0.3, 1);
    spr.position.set(mid.x, mid.y + 0.25, mid.z);
    scene.add(spr);
    edgeMeshes.push(spr);
  });

  // Nodes
  NODE_KEYS.forEach(k => {
    const n = NODES[k];
    const isStart = pathNodes[0] === k, isEnd = pathNodes[pathNodes.length-1] === k;
    const inPath = pathSet.has(k);
    const color = isStart || isEnd ? 0xa78bfa : inPath ? 0xfbbf24 : 0x1a1836;
    const emissive = isStart || isEnd ? 0x6040c0 : inPath ? 0x806010 : 0x0a0820;
    const radius = isStart || isEnd ? 0.38 : inPath ? 0.32 : 0.28;

    const geo = new THREE.SphereGeometry(radius, 32, 32);
    const mat = new THREE.MeshPhongMaterial({ color, emissive, specular: 0xffffff, shininess: 80 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(n.x, n.y, n.z);
    mesh.userData = { key: k, baseScale: 1 };
    scene.add(mesh);
    nodeMeshes[k] = mesh;

    // Ring for path nodes
    if (inPath || isStart || isEnd) {
      const rGeo = new THREE.TorusGeometry(radius + 0.12, 0.03, 8, 32);
      const rMat = new THREE.MeshPhongMaterial({ color: isStart||isEnd ? 0xa78bfa : 0xfbbf24, emissive: 0x400080 });
      const ring = new THREE.Mesh(rGeo, rMat);
      ring.position.set(n.x, n.y, n.z);
      scene.add(ring);
      edgeMeshes.push(ring);
    }

    // Label sprite
    const lc = document.createElement("canvas");
    lc.width = 64; lc.height = 64;
    const lctx = lc.getContext("2d");
    lctx.fillStyle = isStart||isEnd ? "rgba(167,139,250,0.95)" : inPath ? "rgba(251,191,36,0.95)" : "rgba(30,28,53,0.9)";
    lctx.beginPath(); lctx.arc(32,32,28,0,Math.PI*2); lctx.fill();
    lctx.fillStyle = isStart||isEnd ? "#fff" : inPath ? "#1a1836" : "#e8e6ff";
    lctx.font = "bold 24px monospace"; lctx.textAlign = "center"; lctx.textBaseline = "middle";
    lctx.fillText(k, 32, 32);
    const lTex = new THREE.CanvasTexture(lc);
    const lSpr = new THREE.Sprite(new THREE.SpriteMaterial({ map: lTex, transparent: true }));
    lSpr.scale.set(0.6, 0.6, 1);
    lSpr.position.set(n.x, n.y + 0.55, n.z);
    scene.add(lSpr);
    labelSprites[k] = lSpr;
  });
}

function animateThree() {
  animFrameId = requestAnimationFrame(animateThree);
  // Gentle auto-rotate when not dragging
  if (!isDragging) {
    spherical.theta += 0.002;
    updateCameraPosition();
  }
  // Pulse node scales
  const t = Date.now() * 0.002;
  NODE_KEYS.forEach(k => {
    const m = nodeMeshes[k];
    if (!m) return;
    const pulse = 1 + Math.sin(t + k.charCodeAt(0)) * 0.04;
    m.scale.setScalar(pulse);
  });
  renderer3d.render(scene, camera);
}

// ── 3D Animate Path ─────────────────────────────────────────
let selected3dAlgo = "bfs";
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".pill").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".pill").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selected3dAlgo = btn.dataset.algo;
    });
  });
});

function animate3D() {
  const start = document.getElementById("start3d").value;
  const end   = document.getElementById("end3d").value;
  const box   = document.getElementById("result3d");
  if (start === end) { box.innerHTML = '<span style="color:#f87171">Start and end must differ.</span>'; return; }

  const result = runAlgo(selected3dAlgo, start, end);
  if (!result) { box.innerHTML = '<span style="color:#f87171">No path found.</span>'; buildThreeGraph([]); return; }

  const { path, cost } = result;
  const algoNames = { bfs:"BFS", dfs:"DFS", ucs:"UCS / Dijkstra", astar:"A★", greedy:"Greedy Best-First" };

  // Animate node reveals
  buildThreeGraph([]);
  let i = 0;
  const step = () => {
    buildThreeGraph(path.slice(0, i + 1));
    if (i < path.length - 1) { i++; setTimeout(step, 400); }
    else {
      box.innerHTML =
        `<div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--muted);letter-spacing:2px;margin-bottom:6px">${algoNames[selected3dAlgo]}</div>
         <div style="font-family:'Orbitron',monospace;font-size:11px;color:#a78bfa;letter-spacing:1px">${path.join(" → ")}</div>
         <div style="margin-top:8px;font-size:13px">Cost: <span style="color:#34d399;font-weight:600">${cost}</span> &nbsp;|&nbsp; Hops: <span style="color:#34d399">${path.length-1}</span></div>`;
    }
  };
  setTimeout(step, 100);
}

// ════════════════════════════════════════════════════════════
//  PARTICLE BACKGROUND
// ════════════════════════════════════════════════════════════
function initParticles() {
  const canvas = document.getElementById("bgCanvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, particles = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  const N = 80;
  for (let i = 0; i < N; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2 + 0.5,
      a: Math.random() * 0.5 + 0.1
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(124,111,247,${p.a})`; ctx.fill();
    });
    // Connect nearby
    for (let i = 0; i < N; i++) for (let j = i+1; j < N; j++) {
      const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
      const d = Math.sqrt(dx*dx + dy*dy);
      if (d < 120) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `rgba(124,111,247,${(1 - d/120) * 0.12})`;
        ctx.lineWidth = 0.5; ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  }
  draw();
}

// ════════════════════════════════════════════════════════════
//  2D ANIMATED CANVAS DEMO
// ════════════════════════════════════════════════════════════
const NODES2D = {
  A: { x: 70,  y: 115 }, B: { x: 200, y: 50  }, C: { x: 200, y: 180 },
  D: { x: 340, y: 115 }, E: { x: 470, y: 55  }, F: { x: 470, y: 178 }, G: { x: 600, y: 115 }
};

let canvas2d, ctx2d, W2d, H2d;
let visitedNodes = [], pathNodes2d = [], currentResult2d = null, animRunning = false;

function init2D() {
  canvas2d = document.getElementById("canvas2d");
  if (!canvas2d) return;
  ctx2d = canvas2d.getContext("2d");
  function resize() {
    W2d = canvas2d.width = canvas2d.clientWidth;
    H2d = canvas2d.height = canvas2d.clientHeight;
    draw2D(visitedNodes, pathNodes2d);
  }
  resize();
  window.addEventListener("resize", resize);

  document.getElementById("speedRange").addEventListener("input", function() {
    document.getElementById("speedLabel").textContent = this.value + "ms";
  });
}

function scale2d(x, y) {
  return { x: x * (W2d / 680), y: y * (H2d / 240) };
}

function draw2D(visited = [], path = []) {
  if (!ctx2d) return;
  ctx2d.clearRect(0, 0, W2d, H2d);

  const pathSet = new Set(path);
  const visitedSet = new Set(visited);
  const pathEdge = new Set();
  for (let i = 0; i < path.length - 1; i++)
    pathEdge.add(path[i]+"-"+path[i+1]);

  // Edges
  EDGES.forEach(e => {
    const A = scale2d(NODES2D[e.from].x, NODES2D[e.from].y);
    const B = scale2d(NODES2D[e.to].x,   NODES2D[e.to].y);
    const inPath = pathEdge.has(e.from+"-"+e.to) || pathEdge.has(e.to+"-"+e.from);
    ctx2d.beginPath(); ctx2d.moveTo(A.x, A.y); ctx2d.lineTo(B.x, B.y);
    if (inPath) {
      ctx2d.strokeStyle = "#7c6ff7"; ctx2d.lineWidth = 3;
      ctx2d.shadowColor = "#7c6ff7"; ctx2d.shadowBlur = 10;
    } else {
      ctx2d.strokeStyle = "rgba(120,100,255,0.2)"; ctx2d.lineWidth = 1.5;
      ctx2d.shadowBlur = 0;
    }
    ctx2d.stroke(); ctx2d.shadowBlur = 0;

    // Weight
    const mx = (A.x+B.x)/2, my = (A.y+B.y)/2;
    ctx2d.fillStyle = inPath ? "#a78bfa" : "#4a4870";
    ctx2d.font = `${Math.round(11*(W2d/680))}px 'Orbitron',monospace`;
    ctx2d.textAlign = "center"; ctx2d.textBaseline = "middle";
    ctx2d.fillText(e.w, mx, my - 9*(H2d/240));
  });

  // Nodes
  NODE_KEYS.forEach(k => {
    const p = scale2d(NODES2D[k].x, NODES2D[k].y);
    const isStart = path[0] === k, isEnd = path[path.length-1] === k;
    const inPath = pathSet.has(k), inVisited = visitedSet.has(k);
    const r = 16*(W2d/680);

    // Glow
    if (inPath || isStart || isEnd) {
      const g = ctx2d.createRadialGradient(p.x, p.y, 0, p.x, p.y, r*2.5);
      g.addColorStop(0, isStart||isEnd ? "rgba(167,139,250,0.4)" : "rgba(251,191,36,0.3)");
      g.addColorStop(1, "transparent");
      ctx2d.beginPath(); ctx2d.arc(p.x, p.y, r*2.5, 0, Math.PI*2);
      ctx2d.fillStyle = g; ctx2d.fill();
    }

    ctx2d.beginPath(); ctx2d.arc(p.x, p.y, r, 0, Math.PI*2);
    if (isStart || isEnd) ctx2d.fillStyle = "#7c6ff7";
    else if (inPath)      ctx2d.fillStyle = "#fbbf24";
    else if (inVisited)   ctx2d.fillStyle = "#1a3a4a";
    else                  ctx2d.fillStyle = "#15132e";
    ctx2d.fill();
    ctx2d.strokeStyle = inPath||isStart||isEnd ? "#a78bfa" : "rgba(124,111,247,0.25)";
    ctx2d.lineWidth = inPath||isStart||isEnd ? 2 : 1;
    ctx2d.stroke();

    ctx2d.fillStyle = inPath||isStart||isEnd ? "#fff" : "#8b87b8";
    ctx2d.font = `bold ${Math.round(12*(W2d/680))}px 'Orbitron',monospace`;
    ctx2d.textAlign = "center"; ctx2d.textBaseline = "middle";
    ctx2d.fillText(k, p.x, p.y);
  });
}

function runAnimated2D() {
  if (animRunning) return;
  const algo  = document.getElementById("algoSelect2d").value;
  const start = document.getElementById("startNode2d").value;
  const end   = document.getElementById("endNode2d").value;
  const speed = parseInt(document.getElementById("speedRange").value);
  const box   = document.getElementById("result2d");

  if (start === end) { box.innerHTML = '<span style="color:#f87171">Start and end must differ.</span>'; return; }
  const result = runAlgo(algo, start, end);
  if (!result) { box.innerHTML = '<span style="color:#f87171">No path found.</span>'; return; }

  const { path, cost } = result;
  const algoNames = { bfs:"BFS", dfs:"DFS", ucs:"UCS / Dijkstra", astar:"A★", greedy:"Greedy Best-First" };

  visitedNodes = []; pathNodes2d = []; animRunning = true;
  draw2D([], []);

  // Animate visiting
  let i = 0;
  function stepVisit() {
    if (i < path.length) {
      visitedNodes.push(path[i]);
      draw2D(visitedNodes, []);
      i++; setTimeout(stepVisit, speed * 0.6);
    } else {
      // Now reveal path
      let j = 0;
      function stepPath() {
        pathNodes2d = path.slice(0, j+1);
        draw2D(visitedNodes, pathNodes2d);
        if (j < path.length - 1) { j++; setTimeout(stepPath, speed * 0.8); }
        else {
          animRunning = false;
          box.innerHTML =
            `<div style="font-family:'Orbitron',monospace;font-size:9px;color:var(--muted);letter-spacing:2px;margin-bottom:5px">${algoNames[algo]}</div>
             <div style="font-family:'Orbitron',monospace;font-size:11px;color:#a78bfa;letter-spacing:1px">${path.join(" → ")}</div>
             <div style="margin-top:6px;font-size:13px">Cost: <span style="color:#34d399;font-weight:600">${cost}</span> &nbsp;|&nbsp; Hops: <span style="color:#34d399">${path.length-1}</span></div>`;
        }
      }
      stepPath();
    }
  }
  stepVisit();
}

function resetDemo() {
  animRunning = false;
  visitedNodes = []; pathNodes2d = [];
  draw2D([], []);
  document.getElementById("result2d").innerHTML = '<span class="rph">Result appears here…</span>';
}

// ════════════════════════════════════════════════════════════
//  SCROLL REVEAL
// ════════════════════════════════════════════════════════════
function initScrollReveal() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) e.target.classList.add("visible");
    });
  }, { threshold: 0.15 });

  document.querySelectorAll(".reveal-up, .reveal-card").forEach(el => observer.observe(el));
}

// ── Header scroll effect ─────────────────────────────────────
window.addEventListener("scroll", () => {
  document.getElementById("header").classList.toggle("scrolled", window.scrollY > 60);
});

// ════════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  populateSelects();
  initParticles();
  initThree();
  init2D();
  initScrollReveal();
  draw2D([], []);
});
