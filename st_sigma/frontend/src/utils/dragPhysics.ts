import Graph from 'graphology';

export interface DragPhysicsSettings {
  k_edge: number;
  k_anchor: number;
  k_rep: number;
  collision_radius_ratio: number;
  damping_ratio: number;
  max_velocity_ratio: number;
  rest_velocity_ratio: number;
  dt: number;
  max_frame_time: number;
  active_hops: number;
}

export interface DragPhysicsCallbacks {
  onUpdate?: (movedNodes: string[]) => void;
  onStop?: () => void;
}

export interface DragPhysics {
  begin: (node: string) => void;
  dragTo: (x: number, y: number) => void;
  release: (maxSettleMs: number) => void;
  stop: () => void;
  isActive: () => boolean;
  advance: (seconds: number) => void;
  maxSpeed: () => number;
}

export const DEFAULT_DRAG_PHYSICS_SETTINGS: DragPhysicsSettings = {
  k_edge: 220,
  k_anchor: 60,
  k_rep: 220,
  collision_radius_ratio: 0.45,
  damping_ratio: 0.20,
  max_velocity_ratio: 16,
  rest_velocity_ratio: 0.05,
  dt: 1 / 120,
  max_frame_time: 1 / 20,
  active_hops: 8,
};

const EPSILON = 1e-9;
const GRID_LIMIT = 1_000_000;
const GRID_WIDTH = 2_000_000;
const FADE_FACTOR = 0.85;

const finitePositive = (value: number, fallback: number) => (
  Number.isFinite(value) && value > 0 ? value : fallback
);

const finiteNonNegative = (value: number, fallback: number) => (
  Number.isFinite(value) && value >= 0 ? value : fallback
);

export const createDragPhysics = (
  graph: Graph,
  callbacks: DragPhysicsCallbacks = {},
  overrides: Partial<DragPhysicsSettings> = {},
): DragPhysics => {
  const settings = { ...DEFAULT_DRAG_PHYSICS_SETTINGS, ...overrides };
  settings.k_edge = finiteNonNegative(settings.k_edge, DEFAULT_DRAG_PHYSICS_SETTINGS.k_edge);
  settings.k_anchor = finiteNonNegative(settings.k_anchor, DEFAULT_DRAG_PHYSICS_SETTINGS.k_anchor);
  settings.k_rep = finiteNonNegative(
    settings.k_rep,
    DEFAULT_DRAG_PHYSICS_SETTINGS.k_rep,
  );
  settings.collision_radius_ratio = finitePositive(
    settings.collision_radius_ratio,
    DEFAULT_DRAG_PHYSICS_SETTINGS.collision_radius_ratio,
  );
  settings.damping_ratio = finiteNonNegative(
    settings.damping_ratio,
    DEFAULT_DRAG_PHYSICS_SETTINGS.damping_ratio,
  );
  settings.max_velocity_ratio = finitePositive(
    settings.max_velocity_ratio,
    DEFAULT_DRAG_PHYSICS_SETTINGS.max_velocity_ratio,
  );
  settings.rest_velocity_ratio = finitePositive(
    settings.rest_velocity_ratio,
    DEFAULT_DRAG_PHYSICS_SETTINGS.rest_velocity_ratio,
  );
  settings.dt = finitePositive(settings.dt, DEFAULT_DRAG_PHYSICS_SETTINGS.dt);
  settings.max_frame_time = finitePositive(
    settings.max_frame_time,
    DEFAULT_DRAG_PHYSICS_SETTINGS.max_frame_time,
  );
  settings.active_hops = Math.max(
    0,
    Math.floor(finiteNonNegative(settings.active_hops, DEFAULT_DRAG_PHYSICS_SETTINGS.active_hops)),
  );

  let nodeKeys: string[] = [];
  let nodeIndices = new Map<string, number>();
  let valid = new Uint8Array(0);
  let px = new Float64Array(0);
  let py = new Float64Array(0);
  let vx = new Float64Array(0);
  let vy = new Float64Array(0);
  let fx = new Float64Array(0);
  let fy = new Float64Array(0);
  let anchorX = new Float64Array(0);
  let anchorY = new Float64Array(0);
  let invMass = new Float64Array(0);
  let damping = new Float64Array(0);
  let edgeSource = new Int32Array(0);
  let edgeTarget = new Int32Array(0);
  let edgeRest = new Float64Array(0);
  let next = new Int32Array(0);
  let dirty = new Uint8Array(0);
  let edgeCount = 0;

  const gridHeads = new Map<number, number>();
  let active = false;
  let pinned = -1;
  let cursorX = 0;
  let cursorY = 0;
  let lengthScale = 1;
  let collisionRadius = settings.collision_radius_ratio;
  let maxVelocity = settings.max_velocity_ratio;
  let restVelocity = settings.rest_velocity_ratio;
  let released = false;
  let fading = false;
  let elapsed = 0;
  let settleDeadline = Infinity;
  let restingSteps = 0;
  let frame: number | null = null;
  let lastFrameTime: number | null = null;
  let accumulator = 0;

  const cancelFrame = () => {
    if (frame !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(frame);
    }
    frame = null;
    lastFrameTime = null;
    accumulator = 0;
  };

  const stop = () => {
    const wasActive = active;
    cancelFrame();
    active = false;
    released = false;
    fading = false;
    restingSteps = 0;
    vx.fill(0, 0, nodeKeys.length);
    vy.fill(0, 0, nodeKeys.length);
    if (wasActive) callbacks.onStop?.();
  };

  const writeGraph = () => {
    const movedNodes: string[] = [];
    for (let index = 0; index < nodeKeys.length; index += 1) {
      if (!dirty[index] || !valid[index]) continue;
      dirty[index] = 0;
      if (!Number.isFinite(px[index]) || !Number.isFinite(py[index])) continue;
      const attributes = graph.getNodeAttributes(nodeKeys[index]);
      attributes.x = px[index];
      attributes.y = py[index];
      movedNodes.push(nodeKeys[index]);
    }
    if (movedNodes.length > 0) callbacks.onUpdate?.(movedNodes);
  };

  const calculateForces = () => {
    for (let i = 0; i < nodeKeys.length; i += 1) {
      if (!valid[i]) continue;
      fx[i] = settings.k_anchor * (anchorX[i] - px[i]);
      fy[i] = settings.k_anchor * (anchorY[i] - py[i]);
    }

    for (let edge = 0; edge < edgeCount; edge += 1) {
      const source = edgeSource[edge];
      const target = edgeTarget[edge];
      let dx = px[target] - px[source];
      let dy = py[target] - py[source];
      let distance = Math.sqrt(dx * dx + dy * dy);
      if (!Number.isFinite(distance)) continue;
      if (distance < EPSILON) {
        dx = source < target ? EPSILON : -EPSILON;
        dy = 0;
        distance = EPSILON;
      }
      const magnitude = settings.k_edge * (distance - edgeRest[edge]) / distance;
      const forceX = magnitude * dx;
      const forceY = magnitude * dy;
      fx[source] += forceX;
      fy[source] += forceY;
      fx[target] -= forceX;
      fy[target] -= forceY;
    }

    gridHeads.clear();
    next.fill(-1, 0, nodeKeys.length);
    for (let i = 0; i < nodeKeys.length; i += 1) {
      if (!valid[i]) continue;
      const ix = Math.max(-GRID_LIMIT, Math.min(GRID_LIMIT, Math.floor(px[i] / collisionRadius)));
      const iy = Math.max(-GRID_LIMIT, Math.min(GRID_LIMIT, Math.floor(py[i] / collisionRadius)));
      const key = (ix + GRID_LIMIT) * GRID_WIDTH + (iy + GRID_LIMIT);
      next[i] = gridHeads.get(key) ?? -1;
      gridHeads.set(key, i);
    }

    for (let i = 0; i < nodeKeys.length; i += 1) {
      if (!valid[i]) continue;
      const ix = Math.max(-GRID_LIMIT, Math.min(GRID_LIMIT, Math.floor(px[i] / collisionRadius)));
      const iy = Math.max(-GRID_LIMIT, Math.min(GRID_LIMIT, Math.floor(py[i] / collisionRadius)));
      for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
        const neighborX = ix + offsetX;
        if (neighborX < -GRID_LIMIT || neighborX > GRID_LIMIT) continue;
        for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
          const neighborY = iy + offsetY;
          if (neighborY < -GRID_LIMIT || neighborY > GRID_LIMIT) continue;
          const key = (neighborX + GRID_LIMIT) * GRID_WIDTH + (neighborY + GRID_LIMIT);
          for (let j = gridHeads.get(key) ?? -1; j !== -1; j = next[j]) {
            if (j <= i) continue;
            let dx = px[i] - px[j];
            let dy = py[i] - py[j];
            let distance = Math.sqrt(dx * dx + dy * dy);
            if (distance >= collisionRadius) continue;
            if (distance < EPSILON) {
              dx = i < j ? -EPSILON : EPSILON;
              dy = 0;
              distance = EPSILON;
            }
            const magnitude = settings.k_rep * (collisionRadius - distance) / distance;
            const forceX = magnitude * dx;
            const forceY = magnitude * dy;
            fx[i] += forceX;
            fy[i] += forceY;
            fx[j] -= forceX;
            fy[j] -= forceY;
          }
        }
      }
    }
  };

  const currentMaxSpeed = () => {
    let maximum = 0;
    for (let i = 0; i < nodeKeys.length; i += 1) {
      if (!valid[i] || i === pinned) continue;
      maximum = Math.max(maximum, Math.hypot(vx[i], vy[i]));
    }
    return maximum;
  };

  const step = () => {
    if (!active) return;
    elapsed += settings.dt;
    if (released && elapsed >= settleDeadline) fading = true;

    if (!fading) calculateForces();

    for (let i = 0; i < nodeKeys.length; i += 1) {
      if (!valid[i]) continue;
      if (i === pinned) {
        px[i] = cursorX;
        py[i] = cursorY;
        vx[i] = 0;
        vy[i] = 0;
        continue;
      }

      if (fading) {
        vx[i] *= FADE_FACTOR;
        vy[i] *= FADE_FACTOR;
      } else {
        vx[i] += (fx[i] * invMass[i] - damping[i] * vx[i]) * settings.dt;
        vy[i] += (fy[i] * invMass[i] - damping[i] * vy[i]) * settings.dt;
        const speed = Math.hypot(vx[i], vy[i]);
        if (speed > maxVelocity) {
          const scale = maxVelocity / speed;
          vx[i] *= scale;
          vy[i] *= scale;
        }
      }
      const previousX = px[i];
      const previousY = py[i];
      px[i] += vx[i] * settings.dt;
      py[i] += vy[i] * settings.dt;
      if (px[i] !== previousX || py[i] !== previousY) dirty[i] = 1;
    }
  };

  const evaluateRest = () => {
    if (!released || !active) return;
    if (currentMaxSpeed() < restVelocity) restingSteps += 1;
    else restingSteps = 0;
    if (restingSteps >= 4) stop();
  };

  const runFrame = (timestamp: number) => {
    frame = null;
    if (!active) return;
    if (lastFrameTime === null) lastFrameTime = timestamp;
    const frameSeconds = Math.max(0, Math.min(
      settings.max_frame_time,
      (timestamp - lastFrameTime) / 1000,
    ));
    lastFrameTime = timestamp;
    accumulator += frameSeconds;
    while (active && accumulator >= settings.dt) {
      step();
      accumulator -= settings.dt;
    }
    evaluateRest();
    writeGraph();
    if (active && typeof requestAnimationFrame === 'function') {
      frame = requestAnimationFrame(runFrame);
    }
  };

  const scheduleFrame = () => {
    if (frame === null && typeof requestAnimationFrame === 'function') {
      frame = requestAnimationFrame(runFrame);
    }
  };

  const ensureNodeCapacity = (count: number) => {
    if (px.length >= count) return;
    const capacity = Math.max(count, Math.max(16, px.length * 2));
    valid = new Uint8Array(capacity);
    px = new Float64Array(capacity);
    py = new Float64Array(capacity);
    vx = new Float64Array(capacity);
    vy = new Float64Array(capacity);
    fx = new Float64Array(capacity);
    fy = new Float64Array(capacity);
    anchorX = new Float64Array(capacity);
    anchorY = new Float64Array(capacity);
    invMass = new Float64Array(capacity);
    damping = new Float64Array(capacity);
    next = new Int32Array(capacity);
    dirty = new Uint8Array(capacity);
  };

  const ensureEdgeCapacity = (count: number) => {
    if (edgeSource.length >= count) return;
    const capacity = Math.max(count, Math.max(16, edgeSource.length * 2));
    edgeSource = new Int32Array(capacity);
    edgeTarget = new Int32Array(capacity);
    edgeRest = new Float64Array(capacity);
  };

  const collectActiveNodeKeys = (root: string) => {
    if (!graph.hasNode(root)) return [];
    const seen = new Set<string>([root]);
    let frontier = [root];
    for (let hop = 0; hop < settings.active_hops && frontier.length > 0; hop += 1) {
      const nextFrontier: string[] = [];
      for (const node of frontier) {
        for (const neighbor of graph.neighbors(node)) {
          if (seen.has(neighbor)) continue;
          seen.add(neighbor);
          nextFrontier.push(neighbor);
        }
      }
      frontier = nextFrontier;
    }
    return Array.from(seen);
  };

  const snapshot = (node: string) => {
    nodeKeys = collectActiveNodeKeys(node);
    nodeIndices.clear();
    nodeKeys.forEach((key, index) => nodeIndices.set(key, index));
    const count = nodeKeys.length;
    ensureNodeCapacity(count);
    valid.fill(0, 0, count);
    vx.fill(0, 0, count);
    vy.fill(0, 0, count);
    fx.fill(0, 0, count);
    fy.fill(0, 0, count);
    dirty.fill(0, 0, count);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let validCount = 0;
    nodeKeys.forEach((key, index) => {
      const x = Number(graph.getNodeAttribute(key, 'x'));
      const y = Number(graph.getNodeAttribute(key, 'y'));
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      valid[index] = 1;
      validCount += 1;
      px[index] = x;
      py[index] = y;
      anchorX[index] = x;
      anchorY[index] = y;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    });

    const edges: Array<[number, number, number]> = [];
    graph.forEachEdge((_edge, _attributes, sourceKey, targetKey) => {
      const source = nodeIndices.get(sourceKey);
      const target = nodeIndices.get(targetKey);
      if (
        source === undefined
        || target === undefined
        || source === target
        || !valid[source]
        || !valid[target]
      ) return;
      const restLength = Math.hypot(px[target] - px[source], py[target] - py[source]);
      if (!Number.isFinite(restLength)) return;
      edges.push([source, target, restLength]);
    });
    edgeCount = edges.length;
    ensureEdgeCapacity(edgeCount);
    const restLengths = new Array<number>(edgeCount);
    edges.forEach(([source, target, restLength], index) => {
      edgeSource[index] = source;
      edgeTarget[index] = target;
      edgeRest[index] = restLength;
      restLengths[index] = restLength;
    });

    const sortedLengths = [...restLengths].sort((left, right) => left - right);
    if (sortedLengths.length > 0) {
      const middle = Math.floor(sortedLengths.length / 2);
      lengthScale = sortedLengths.length % 2 === 0
        ? (sortedLengths[middle - 1] + sortedLengths[middle]) / 2
        : sortedLengths[middle];
    } else {
      lengthScale = 0;
    }
    if ((!Number.isFinite(lengthScale) || lengthScale <= EPSILON) && validCount > 0) {
      lengthScale = Math.hypot(maxX - minX, maxY - minY) / Math.sqrt(validCount);
    }
    if (!Number.isFinite(lengthScale) || lengthScale <= EPSILON) lengthScale = 1;
    collisionRadius = settings.collision_radius_ratio * lengthScale;
    maxVelocity = settings.max_velocity_ratio * lengthScale;
    restVelocity = settings.rest_velocity_ratio * lengthScale;

    nodeKeys.forEach((key, index) => {
      if (!valid[index]) return;
      const degree = graph.degree(key);
      const mass = 1 + 0.25 * degree;
      const effectiveStiffness = settings.k_anchor + settings.k_edge * degree;
      invMass[index] = 1 / mass;
      damping[index] = 2 * settings.damping_ratio * Math.sqrt(effectiveStiffness / mass);
    });

    pinned = nodeIndices.get(node) ?? -1;
    if (pinned >= 0 && valid[pinned]) {
      cursorX = px[pinned];
      cursorY = py[pinned];
    } else {
      pinned = -1;
    }
  };

  const begin = (node: string) => {
    stop();
    snapshot(node);
    if (pinned < 0) return;
    active = true;
    released = false;
    fading = false;
    elapsed = 0;
    settleDeadline = Infinity;
    restingSteps = 0;
    scheduleFrame();
  };

  const dragTo = (x: number, y: number) => {
    if (!active || pinned < 0 || !Number.isFinite(x) || !Number.isFinite(y)) return;
    cursorX = x;
    cursorY = y;
    px[pinned] = x;
    py[pinned] = y;
    vx[pinned] = 0;
    vy[pinned] = 0;
    dirty[pinned] = 1;
    // Keep graph reads exact without scheduling a second Sigma reindexation;
    // the rAF loop emits the single batched attribute event for this frame.
    const attributes = graph.getNodeAttributes(nodeKeys[pinned]);
    attributes.x = x;
    attributes.y = y;
  };

  const release = (maxSettleMs: number) => {
    if (!active) return;
    writeGraph();
    released = true;
    settleDeadline = elapsed + Math.max(0, Number.isFinite(maxSettleMs) ? maxSettleMs / 1000 : 0);
    scheduleFrame();
  };

  const advance = (seconds: number) => {
    if (!active || !Number.isFinite(seconds) || seconds <= 0) return;
    const steps = Math.ceil(seconds / settings.dt);
    const restCheckStride = Math.max(1, Math.round((1 / 60) / settings.dt));
    for (let index = 0; index < steps && active; index += 1) {
      step();
      if ((index + 1) % restCheckStride === 0) evaluateRest();
    }
    if (steps % restCheckStride !== 0) evaluateRest();
    writeGraph();
  };

  return {
    begin,
    dragTo,
    release,
    stop,
    isActive: () => active,
    advance,
    maxSpeed: currentMaxSpeed,
  };
};
