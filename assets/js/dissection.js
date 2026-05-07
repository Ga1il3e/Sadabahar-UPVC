/* ════════════════════════════════════════════════════════════════════════
   SADABAHAR · ANATOMY (detailed UPVC dissection)
   ────────────────────────────────────────────────────────────────────────
   A second sticky 3D stage that follows the cinema. Six scroll-driven
   stations show, in order, what's actually inside a Baydee BD70 system:

     A  Cross-section orbit          (5 chambers labelled)
     B  Steel reinforcement core     (slides into the central chamber)
     C  EPDM gasket lines            (seat into the rebate grooves)
     D  Triple glazing               (3 panes + spacer + argon gap)
     E  Multi-point lock             (8 mushroom cams light up around the sash)
     F  Reassembly & stats

   Scroll progress is normalised against the section's own scroll range,
   then eased per-frame in a RAF loop (target → rendered) so the motion
   tracks the wheel/finger but feels stabilised. Honors prefers-reduced-
   motion by snapping rendered to target.
   ════════════════════════════════════════════════════════════════════════ */
(function initDissection() {
  if (typeof THREE === 'undefined') return;

  const stage    = document.getElementById('anatomy');
  const canvas   = document.getElementById('anatomy-canvas');
  const hostRoot = document.getElementById('anatomyHotspots');
  const railFill = document.getElementById('anatomyRailFill');
  const stationLabel = document.getElementById('anatomyStation');
  const chambersOut  = document.getElementById('anatomyChambers');
  const glazingOut   = document.getElementById('anatomyGlazing');
  const panelsRoot   = document.getElementById('anatomyPanels');

  if (!stage || !canvas || !hostRoot) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = window.innerWidth < 800;

  /* ---------- math helpers ---------- */
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  /* ---------- renderer / scene / camera ---------- */
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true, powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = !isMobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x06090e, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x06090e, 30, 100);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  camera.position.set(0, 1.2, 16);

  /* ---------- lights (key + copper rim + teal fill) ---------- */
  scene.add(new THREE.AmbientLight(0x4a5878, 0.45));
  const key = new THREE.DirectionalLight(0xffeacc, 1.35);
  key.position.set(8, 12, 14);
  if (!isMobile) {
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 50;
    key.shadow.camera.left = -10; key.shadow.camera.right = 10;
    key.shadow.camera.top  =  10; key.shadow.camera.bottom = -10;
    key.shadow.bias = -0.0005;
  }
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xe87d3e, 0.9);
  rim.position.set(-9, 4, -6);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0x4a9d96, 0.35);
  fill.position.set(0, -5, 8);
  scene.add(fill);

  /* ---------- materials ---------- */
  const pvcMat = new THREE.MeshStandardMaterial({
    color: 0xf5f1e8, roughness: 0.55, metalness: 0.05, side: THREE.DoubleSide
  });
  const pvcSashMat = new THREE.MeshStandardMaterial({
    color: 0xece3cf, roughness: 0.5, metalness: 0.05, side: THREE.DoubleSide
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x7a8290, roughness: 0.32, metalness: 0.9
  });
  const gasketMat = new THREE.MeshStandardMaterial({
    color: 0x111317, roughness: 0.95, metalness: 0
  });
  const spacerMat = new THREE.MeshStandardMaterial({
    color: 0x9aa0a7, roughness: 0.45, metalness: 0.7
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xb6dad5, roughness: 0.05, metalness: 0,
    transmission: 0.92, transparent: true, opacity: 0.5,
    thickness: 0.3, ior: 1.45
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd4a574, roughness: 0.25, metalness: 0.9
  });
  const lockEmitMat = new THREE.MeshStandardMaterial({
    color: 0xe87d3e, roughness: 0.4, metalness: 0.4,
    emissive: 0xe87d3e, emissiveIntensity: 0
  });

  /* ============================================================
     STATION A — Real chambered cross-section, extruded ~2.5 deep
     Coordinates: 1 unit ≈ 10 mm. BD70 is ~70×75 mm => 7×7.5 units.
     The chambers below are placed to match the Baydee profile photos:
     a large central cell (steel), four insulating cells, and a small
     glazing-rebate cell.
     ============================================================ */
  function buildFrameProfile() {
    const s = new THREE.Shape();
    // outer boundary (clockwise, with rebate step on top-right)
    s.moveTo(0, 0); s.lineTo(7, 0);
    s.lineTo(7, 4); s.lineTo(4.5, 4);
    s.lineTo(4.5, 6.5); s.lineTo(3.2, 6.5);
    s.lineTo(3.2, 7.5); s.lineTo(0, 7.5);
    s.lineTo(0, 0);

    // chambers as holes (x0,y0,x1,y1)
    const chambers = [
      { id: 'C1', rect: [0.4, 0.4, 1.8, 3.6], label: 'Chamber 1 · outer thermal break' },
      { id: 'C2', rect: [2.2, 0.4, 6.6, 3.6], label: 'Chamber 2 · steel reinforcement' },
      { id: 'C3', rect: [0.4, 4.0, 2.8, 6.0], label: 'Chamber 3 · upper insulator' },
      { id: 'C4', rect: [0.4, 6.4, 2.8, 7.1], label: 'Chamber 4 · top thermal break' },
      { id: 'C5', rect: [3.6, 4.4, 4.1, 6.1], label: 'Chamber 5 · gasket carrier' },
    ];
    chambers.forEach(c => {
      const p = new THREE.Path();
      const [x0, y0, x1, y1] = c.rect;
      p.moveTo(x0, y0); p.lineTo(x1, y0);
      p.lineTo(x1, y1); p.lineTo(x0, y1);
      p.lineTo(x0, y0);
      s.holes.push(p);
    });
    return { shape: s, chambers };
  }

  const { shape: profileShape, chambers } = buildFrameProfile();

  const profileGroup = new THREE.Group();
  scene.add(profileGroup);

  const extrudeSettings = {
    depth: 2.6, bevelEnabled: true,
    bevelSize: 0.045, bevelThickness: 0.045, bevelSegments: 2, steps: 1
  };
  const profileGeom = new THREE.ExtrudeGeometry(profileShape, extrudeSettings);
  // Center the geometry on origin
  profileGeom.translate(-3.5, -3.75, -1.3);
  const profileMesh = new THREE.Mesh(profileGeom, pvcMat);
  profileMesh.castShadow = true;
  profileMesh.receiveShadow = true;
  profileGroup.add(profileMesh);

  /* Steel core — slides into chamber C2 (centre x≈4.4, y≈2.0) */
  const steel = new THREE.Mesh(
    new THREE.BoxGeometry(4.0, 2.8, 2.4),
    steelMat
  );
  // Local coordinates after centering
  const STEEL_HOME = { x: 4.4 - 3.5, y: 2.0 - 3.75, z: 0 };
  steel.position.set(STEEL_HOME.x, -10, STEEL_HOME.z);
  steel.castShadow = true;
  profileGroup.add(steel);

  /* EPDM gasket beads — small black extrusions that slide into the
     rebate notch around (x≈4.5, y≈6.3) and the inner edge (x≈3.85, y≈6.5) */
  const gasketOuter = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.55, 2.5), gasketMat
  );
  const GASKET_OUTER_HOME = { x: 4.5 - 3.5, y: 6.25 - 3.75, z: 0 };
  gasketOuter.position.set(GASKET_OUTER_HOME.x, 9, GASKET_OUTER_HOME.z);
  profileGroup.add(gasketOuter);

  const gasketInner = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.22, 2.5), gasketMat
  );
  const GASKET_INNER_HOME = { x: 3.6 - 3.5, y: 6.6 - 3.75, z: 0 };
  gasketInner.position.set(-9, GASKET_INNER_HOME.y, GASKET_INNER_HOME.z);
  profileGroup.add(gasketInner);

  /* ============================================================
     STATION D — Triple glazing pack (separate group, off-stage right)
     ============================================================ */
  const glazingGroup = new THREE.Group();
  glazingGroup.position.set(0, 0, 0);
  glazingGroup.visible = false;
  scene.add(glazingGroup);

  const PANE_W = 6.2, PANE_H = 6.2;
  const panes = [];
  for (let i = 0; i < 3; i++) {
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(PANE_W, PANE_H, 0.16), glassMat
    );
    pane.userData.idx = i;
    pane.userData.assembled = (i - 1) * 0.22;
    pane.userData.exploded  = (i - 1) * 1.2;
    pane.position.z = pane.userData.assembled;
    glazingGroup.add(pane);
    panes.push(pane);
  }
  // Aluminium spacer bars top & bottom (visible only when separated)
  const spacerTop = new THREE.Mesh(
    new THREE.BoxGeometry(PANE_W - 0.4, 0.18, 0.34), spacerMat
  );
  spacerTop.position.set(0, PANE_H/2 - 0.2, 0);
  glazingGroup.add(spacerTop);
  const spacerBot = new THREE.Mesh(
    new THREE.BoxGeometry(PANE_W - 0.4, 0.18, 0.34), spacerMat
  );
  spacerBot.position.set(0, -PANE_H/2 + 0.2, 0);
  glazingGroup.add(spacerBot);

  /* ============================================================
     STATION E — Mini sash window with 8 mushroom-cam lock points
     A simple flat frame sized so we can pan to it; the lock points
     are gold cylinders that pulse / glow when active.
     ============================================================ */
  const sashGroup = new THREE.Group();
  sashGroup.visible = false;
  sashGroup.position.set(0, 0, 0);
  scene.add(sashGroup);

  // Outer frame
  const F_W = 8, F_H = 9, F_T = 0.7;
  const matStruct = pvcMat;
  function makeBar(w, h, d, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
  const fTop = makeBar(F_W, F_T, 0.6, matStruct); fTop.position.set(0,  F_H/2 - F_T/2, 0); sashGroup.add(fTop);
  const fBot = makeBar(F_W, F_T, 0.6, matStruct); fBot.position.set(0, -F_H/2 + F_T/2, 0); sashGroup.add(fBot);
  const fLft = makeBar(F_T, F_H - F_T*2, 0.6, matStruct); fLft.position.set(-F_W/2 + F_T/2, 0, 0); sashGroup.add(fLft);
  const fRgt = makeBar(F_T, F_H - F_T*2, 0.6, matStruct); fRgt.position.set( F_W/2 - F_T/2, 0, 0); sashGroup.add(fRgt);

  // Sash inset
  const S_W = F_W - 1.4, S_H = F_H - 1.4, S_T = 0.5;
  const sTop = makeBar(S_W, S_T, 0.5, pvcSashMat); sTop.position.set(0,  S_H/2 - S_T/2, 0.25); sashGroup.add(sTop);
  const sBot = makeBar(S_W, S_T, 0.5, pvcSashMat); sBot.position.set(0, -S_H/2 + S_T/2, 0.25); sashGroup.add(sBot);
  const sLft = makeBar(S_T, S_H - S_T*2, 0.5, pvcSashMat); sLft.position.set(-S_W/2 + S_T/2, 0, 0.25); sashGroup.add(sLft);
  const sRgt = makeBar(S_T, S_H - S_T*2, 0.5, pvcSashMat); sRgt.position.set( S_W/2 - S_T/2, 0, 0.25); sashGroup.add(sRgt);

  // Glazing inside the sash (single block, transparent)
  const sashGlass = new THREE.Mesh(
    new THREE.BoxGeometry(S_W - 1.0, S_H - 1.0, 0.18), glassMat
  );
  sashGlass.position.z = 0.25;
  sashGroup.add(sashGlass);

  // Handle
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.7, 0.55), goldMat);
  handle.position.set(-S_W/2 - 0.05, 0, 0.55);
  sashGroup.add(handle);

  // 8 mushroom cam lock points — 3 left, 3 right, 1 top, 1 bottom
  const lockPoints = [];
  function addLockPoint(x, y) {
    const lp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 0.5, 18),
      lockEmitMat.clone()
    );
    lp.rotation.z = Math.PI / 2;
    lp.position.set(x, y, 0.4);
    lp.userData.basePos = { x, y, z: 0.4 };
    sashGroup.add(lp);
    lockPoints.push(lp);
  }
  // Right edge (3)
  addLockPoint( S_W/2 + 0.1,  S_H/3);
  addLockPoint( S_W/2 + 0.1,  0);
  addLockPoint( S_W/2 + 0.1, -S_H/3);
  // Left edge (3)
  addLockPoint(-S_W/2 - 0.1,  S_H/3);
  addLockPoint(-S_W/2 - 0.1, -S_H/3);
  addLockPoint(-S_W/2 - 0.1,  0);
  // Top + bottom (2)
  addLockPoint(0,  S_H/2 + 0.1);
  addLockPoint(0, -S_H/2 - 0.1);

  /* ============================================================
     HOTSPOTS — DOM pins anchored to world-space points.
     Each hotspot has a stage range during which it's visible.
     ============================================================ */
  const hotspots = [
    // Cross-section chambers (Station A, ~0.00–0.18)
    { id: 'C1', label: 'Chamber 1', sub: 'Outer thermal break',  pos: () => world(profileGroup, -2.6, -2.0, 1.4),  range: [0.00, 0.20] },
    { id: 'C2', label: 'Chamber 2', sub: 'Steel core slot',      pos: () => world(profileGroup,  0.9, -1.8, 1.4),  range: [0.00, 0.32] },
    { id: 'C3', label: 'Chamber 3', sub: 'Upper insulator',      pos: () => world(profileGroup, -2.0,  1.3, 1.4),  range: [0.00, 0.20] },
    { id: 'C4', label: 'Chamber 4', sub: 'Top thermal break',    pos: () => world(profileGroup, -1.5,  3.1, 1.4),  range: [0.00, 0.20] },
    { id: 'C5', label: 'Chamber 5', sub: 'Gasket carrier',       pos: () => world(profileGroup,  0.4,  1.6, 1.4),  range: [0.00, 0.20] },
    // Steel core (Station B)
    { id: 'STEEL', label: 'Galvanised steel U-channel', sub: '1.5 mm wall · zinc-plated', pos: () => world(profileGroup, STEEL_HOME.x, STEEL_HOME.y + 0.4, 1.4), range: [0.20, 0.34] },
    // Gaskets (Station C)
    { id: 'GASK_OUT', label: 'Outer EPDM gasket', sub: 'Co-extruded · weather seal', pos: () => world(profileGroup, GASKET_OUTER_HOME.x + 0.4, GASKET_OUTER_HOME.y, 1.4), range: [0.36, 0.54] },
    { id: 'GASK_IN',  label: 'Inner EPDM gasket', sub: 'Acoustic seal · –30 dB',     pos: () => world(profileGroup, GASKET_INNER_HOME.x, GASKET_INNER_HOME.y + 0.5, 1.4), range: [0.42, 0.54] },
    // Glazing (Station D)
    { id: 'PANE_OUT', label: 'Outer pane · 4 mm float',    sub: 'Tempered',          pos: () => world(glazingGroup, 0, PANE_H/2 - 0.5, panes[2].position.z), range: [0.56, 0.72] },
    { id: 'PANE_MID', label: 'Mid pane · 4 mm low-e',      sub: 'Argon 12 mm · IR coat', pos: () => world(glazingGroup, 0, 0, panes[1].position.z), range: [0.56, 0.72] },
    { id: 'PANE_IN',  label: 'Inner pane · 4 mm float',    sub: 'Tempered',          pos: () => world(glazingGroup, 0, -PANE_H/2 + 0.5, panes[0].position.z), range: [0.56, 0.72] },
    { id: 'SPACER',   label: 'Aluminium spacer',           sub: 'Desiccant filled',  pos: () => world(glazingGroup, PANE_W/2 - 1.0, PANE_H/2 - 0.2, 0), range: [0.58, 0.72] },
    // Lock (Station E) — a generic callout on right side and top
    { id: 'LOCK_R',   label: 'Mushroom cam',  sub: '× 3 right edge', pos: () => world(sashGroup,  S_W/2 + 0.6,  S_H/3, 0.6), range: [0.74, 0.92] },
    { id: 'LOCK_T',   label: 'Top lock pin',  sub: 'Anti-lift',      pos: () => world(sashGroup,  0,  S_H/2 + 0.6, 0.6), range: [0.74, 0.92] },
    { id: 'HANDLE',   label: 'German handle', sub: 'Tilt + turn',    pos: () => world(sashGroup, -S_W/2 - 0.6, 0, 0.7),    range: [0.74, 0.92] },
  ];

  // Pre-create hotspot DOM nodes
  hotspots.forEach(h => {
    const el = document.createElement('div');
    el.className = 'hotspot';
    el.dataset.id = h.id;
    el.innerHTML =
      `<span class="hot-pin"></span>` +
      `<span class="hot-card">` +
        `<span class="hot-label">${h.label}</span>` +
        `<span class="hot-sub">${h.sub}</span>` +
      `</span>`;
    hostRoot.appendChild(el);
    h.el = el;
  });

  // World-space → screen helpers
  const _v = new THREE.Vector3();
  function world(obj, x, y, z) {
    _v.set(x, y, z);
    obj.updateMatrixWorld();
    return _v.clone().applyMatrix4(obj.matrixWorld);
  }
  function projectToScreen(vec3, sizeW, sizeH) {
    const v = vec3.clone().project(camera);
    return {
      x: (v.x * 0.5 + 0.5) * sizeW,
      y: (-v.y * 0.5 + 0.5) * sizeH,
      visible: v.z > -1 && v.z < 1
    };
  }

  /* ============================================================
     SCROLL ENGINE — target / rendered RAF easing
     ============================================================ */
  let targetT = 0;
  let renderedT = 0;

  function progressFromScroll() {
    const r = stage.getBoundingClientRect();
    const total = stage.offsetHeight - window.innerHeight;
    if (total <= 0) return 0;
    return clamp01(-r.top / total);
  }

  function inViewSoftly() {
    const r = stage.getBoundingClientRect();
    return r.bottom > -200 && r.top < window.innerHeight + 200;
  }

  /* ============================================================
     APPLY SCENE — drive everything from a single normalized t∈[0,1]
     ============================================================ */
  const STATION_NAMES = [
    'Cross-section', 'Steel core', 'EPDM gaskets',
    'Triple glazing', 'Multi-point lock', 'Reassembly'
  ];
  const STATION_RANGES = [
    [0.00, 0.18], [0.18, 0.34], [0.34, 0.54],
    [0.54, 0.72], [0.72, 0.92], [0.92, 1.00]
  ];

  function applyScene(t) {
    /* ---- camera path: orbit profile, then dolly out for full window ---- */
    let camX, camY, camZ, lookX = 0, lookY = 0, lookZ = 0;
    if (t < 0.18) {
      // Slow turntable around the cross-section
      const u = t / 0.18;
      const ang = -0.55 + u * 1.3;
      const dist = 12 - u * 0.5;
      camX = Math.sin(ang) * dist;
      camY = 1.2 - u * 0.3;
      camZ = Math.cos(ang) * dist;
    } else if (t < 0.34) {
      // Pull back slightly so the steel core entry is visible
      const u = (t - 0.18) / 0.16;
      camX = lerp(Math.sin(0.75) * 11.5, 4.5, smooth(u));
      camY = lerp(0.9, 1.4, smooth(u));
      camZ = lerp(Math.cos(0.75) * 11.5, 12.8, smooth(u));
    } else if (t < 0.54) {
      // Tilt up + side angle for gaskets
      const u = (t - 0.34) / 0.20;
      camX = lerp(4.5, -3.6, smooth(u));
      camY = lerp(1.4, 2.4, smooth(u));
      camZ = lerp(12.8, 11.6, smooth(u));
    } else if (t < 0.72) {
      // Travel right to glazing pack
      const u = (t - 0.54) / 0.18;
      camX = lerp(-3.6, 0.4, smooth(u));
      camY = lerp(2.4, 0.6, smooth(u));
      camZ = lerp(11.6, 12.4, smooth(u));
      lookX = lerp(0, 6, smooth(u));
    } else if (t < 0.92) {
      // Pull back for full sash + lock points
      const u = (t - 0.72) / 0.20;
      camX = lerp(0.4, 0.0, smooth(u));
      camY = lerp(0.6, 0.4, smooth(u));
      camZ = lerp(12.4, 14.5, smooth(u));
      lookX = lerp(6, 0, smooth(u));
    } else {
      // Final reassembly — slow drift
      const u = (t - 0.92) / 0.08;
      camX = Math.sin(0.6 + u * 0.4) * 13;
      camY = 0.6;
      camZ = Math.cos(0.6 + u * 0.4) * 13;
    }
    camera.position.set(camX, camY, camZ);
    camera.lookAt(lookX, lookY, lookZ);

    /* ---- profile group: rotate during station A; settles after ---- */
    if (t < 0.18) {
      const u = t / 0.18;
      profileGroup.rotation.y = u * Math.PI * 1.6;
      profileGroup.rotation.x = -0.05 - u * 0.12;
    } else if (t < 0.54) {
      profileGroup.rotation.y = lerp(Math.PI * 1.6, Math.PI * 1.85, (t - 0.18) / 0.36);
      profileGroup.rotation.x = -0.17;
    } else if (t < 0.72) {
      // slide profile group off-stage left as glazing takes over
      const u = (t - 0.54) / 0.18;
      profileGroup.position.x = lerp(0, -7, smooth(u));
      profileGroup.rotation.y = lerp(Math.PI * 1.85, Math.PI * 2.2, u);
    } else if (t < 0.92) {
      profileGroup.position.x = -7;
      profileGroup.visible = false;
    } else {
      // Reassembly: bring profile back
      const u = (t - 0.92) / 0.08;
      profileGroup.visible = true;
      profileGroup.position.x = lerp(-7, 0, easeOut(u));
      profileGroup.rotation.y = lerp(Math.PI * 2.2, Math.PI * 2.6, easeOut(u));
    }
    if (t < 0.72) profileGroup.visible = true;

    /* ---- STEEL CORE: drops in 0.18 → 0.30 ---- */
    {
      const u = clamp01((t - 0.18) / 0.12);
      const eu = easeOut(u);
      steel.position.y = lerp(-10, STEEL_HOME.y, eu);
      // Slight wobble tail
      if (u > 0 && u < 1) {
        steel.position.y += Math.sin(u * Math.PI * 4) * 0.05 * (1 - u);
      }
    }

    /* ---- GASKET OUTER drops, GASKET INNER slides 0.34 → 0.50 ---- */
    {
      const u1 = clamp01((t - 0.34) / 0.10);
      gasketOuter.position.y = lerp(9, GASKET_OUTER_HOME.y, easeOut(u1));
      const u2 = clamp01((t - 0.42) / 0.10);
      gasketInner.position.x = lerp(-9, GASKET_INNER_HOME.x, easeOut(u2));
    }

    /* ---- GLAZING pack: appears at 0.54, panes separate then rejoin ---- */
    if (t >= 0.50 && t < 0.94) {
      glazingGroup.visible = true;
      // entry
      const entry = clamp01((t - 0.50) / 0.06);
      glazingGroup.position.x = lerp(10, 6, easeOut(entry));
      glazingGroup.position.y = 0;
      glazingGroup.rotation.y = lerp(0.6, 0.0, easeOut(entry));

      // pane separation
      let sep = 0;
      if (t < 0.70) sep = clamp01((t - 0.56) / 0.10);
      else if (t < 0.78) sep = 1 - clamp01((t - 0.70) / 0.08);
      panes.forEach(p => {
        p.position.z = lerp(p.userData.assembled, p.userData.exploded, sep);
      });
      spacerTop.material.opacity = 0.4 + sep * 0.6;
      spacerBot.material.opacity = 0.4 + sep * 0.6;
      spacerTop.material.transparent = true;
      spacerBot.material.transparent = true;

      // exit
      if (t > 0.78) {
        const exit = clamp01((t - 0.78) / 0.10);
        glazingGroup.position.x = lerp(6, 14, easeOut(exit));
        glazingGroup.rotation.y = lerp(0, 0.4, easeOut(exit));
      }
    } else {
      glazingGroup.visible = false;
    }

    /* ---- SASH WINDOW + lock points 0.72 → 1.00 ---- */
    if (t >= 0.70) {
      sashGroup.visible = true;
      const entry = clamp01((t - 0.70) / 0.06);
      sashGroup.position.x = lerp(8, 0, easeOut(entry));
      sashGroup.position.y = 0;
      // Pulse the lock points sequentially during 0.74 → 0.90
      const pulseStart = 0.74, pulseEnd = 0.90;
      const pp = clamp01((t - pulseStart) / (pulseEnd - pulseStart));
      lockPoints.forEach((lp, i) => {
        const phase = clamp01(pp - (i / lockPoints.length) * 0.5) * 2;
        const intensity = Math.max(0, Math.sin(phase * Math.PI));
        lp.material.emissiveIntensity = 0.2 + intensity * 1.6;
        // cam outward pop
        const pop = intensity * 0.25;
        if (lp.userData.basePos.x > 0) lp.position.x = lp.userData.basePos.x + pop;
        else if (lp.userData.basePos.x < 0) lp.position.x = lp.userData.basePos.x - pop;
        if (lp.userData.basePos.y > F_H/2 - 0.5) lp.position.y = lp.userData.basePos.y + pop;
        else if (lp.userData.basePos.y < -F_H/2 + 0.5) lp.position.y = lp.userData.basePos.y - pop;
      });
      // Whole sash gentle rotation during pulse
      sashGroup.rotation.y = Math.sin(t * 4.0) * 0.05;
    } else {
      sashGroup.visible = false;
    }

    /* ---- HOTSPOTS: position + visibility ---- */
    const w = canvas.clientWidth, h = canvas.clientHeight;
    hotspots.forEach(hp => {
      const inRange = t >= hp.range[0] && t <= hp.range[1];
      if (!inRange) {
        hp.el.classList.remove('on');
        return;
      }
      // fade in / out edges
      const fadeIn  = clamp01((t - hp.range[0]) / 0.04);
      const fadeOut = clamp01((hp.range[1] - t) / 0.04);
      const op = Math.min(fadeIn, fadeOut);
      const p = projectToScreen(hp.pos(), w, h);
      hp.el.style.transform = `translate(${p.x}px, ${p.y}px)`;
      hp.el.style.opacity = op.toFixed(3);
      hp.el.classList.toggle('on', op > 0.05);
    });

    /* ---- panel copy + rail ---- */
    let stationIdx = 0;
    for (let i = 0; i < STATION_RANGES.length; i++) {
      if (t >= STATION_RANGES[i][0] && t < STATION_RANGES[i][1]) { stationIdx = i; break; }
      if (t >= STATION_RANGES[i][1]) stationIdx = i;
    }
    if (stationLabel) stationLabel.textContent = STATION_NAMES[stationIdx];
    if (chambersOut) chambersOut.textContent = (stationIdx === 5 ? '5' : (stationIdx + 1).toString().padStart(1, '0'));
    if (railFill) railFill.style.transform = `scaleX(${t})`;
    if (panelsRoot) {
      panelsRoot.querySelectorAll('.ap').forEach((el, i) => {
        el.classList.toggle('on', i === stationIdx);
      });
    }
  }

  /* ============================================================
     RAF + scroll wiring
     ============================================================ */
  let needsRender = true;
  function frame() {
    if (inViewSoftly() || needsRender) {
      targetT = progressFromScroll();
      const ease = reduceMotion ? 1 : 0.16;
      renderedT += (targetT - renderedT) * ease;
      if (Math.abs(targetT - renderedT) < 0.0006) renderedT = targetT;
      applyScene(renderedT);
      renderer.render(scene, camera);
      needsRender = false;
    }
    requestAnimationFrame(frame);
  }

  /* ---------- resize ---------- */
  function resize() {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    needsRender = true;
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('scroll', () => { needsRender = true; }, { passive: true });

  /* ---------- rail tick clicks ---------- */
  document.querySelectorAll('#anatomy .ar-tick').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = parseFloat(btn.dataset.target);
      const total = stage.offsetHeight - window.innerHeight;
      const offset = stage.offsetTop;
      window.scrollTo({ top: offset + target * total, behavior: 'smooth' });
    });
  });

  /* ---------- hover on hotspot ⇒ highlight related part (subtle) ---------- */
  hostRoot.addEventListener('mouseenter', (e) => {
    if (!e.target.classList || !e.target.classList.contains('hotspot')) return;
    e.target.classList.add('focus');
  }, true);
  hostRoot.addEventListener('mouseleave', (e) => {
    if (!e.target.classList || !e.target.classList.contains('hotspot')) return;
    e.target.classList.remove('focus');
  }, true);

  /* ---------- kick off ---------- */
  applyScene(0);
  frame();
})();
