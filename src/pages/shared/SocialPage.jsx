import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import * as d3 from 'd3-force-3d';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../../components/ui/Avatar';
import {
  buildAvatarColorMap,
  getAvatarColorToken,
  getInitials
} from '../../utils/avatarHelpers';
import { useNavigate } from 'react-router-dom';
import { socialService } from '../../services/social.service';
import { directMessagesService, getThreadIdForUsers } from '../../services/directMessages.service';
import { canAccessDMs } from '../../utils/dmAccess';
import {
  EMPTY_SOCIAL_CONTACT,
  EMPTY_SOCIAL_CONTACT_VISIBILITY
} from '../../types/social.types';

function normalizeText(value) {
  return String(value || '').trim();
}

function getNodeLabel(node) {
  if (!node) return '';
  return normalizeText(node.displayName) || 'Sin nombre';
}

function extractVisibleContact(contact = {}) {
  return Object.entries(contact || {}).filter(([, value]) => normalizeText(value));
}

function getLinkNodeId(endpoint) {
  if (typeof endpoint === 'string') return endpoint;
  if (endpoint && typeof endpoint === 'object') return endpoint.id || '';
  return '';
}

const SOCIAL_ROLE_LABELS = {
  family: 'Familia',
  child: 'Alumno',
  staff: 'Staff',
  docente: 'Docente',
  tallerista: 'Tallerista',
  coordinacion: 'Coordinación',
  superadmin: 'SuperAdmin',
  facturacion: 'Administración'
};

const NODE_COLOR_TOKENS = {
  family: '--color-success',
  child: '--color-warning',
  staff: '--color-secondary'
};

function getNodeRoleText(node) {
  const roles = Array.isArray(node?.rolesVisual) ? node.rolesVisual : [];
  if (roles.length > 0) {
    return roles.map((role) => SOCIAL_ROLE_LABELS[role] || role).join(' / ');
  }
  const nodeType = String(node?.type || '');
  return SOCIAL_ROLE_LABELS[nodeType] || nodeType;
}

function getNodeFillColor(node, label, colorMap) {
  const tokenByType = NODE_COLOR_TOKENS[node?.type];
  if (tokenByType && colorMap[tokenByType]) {
    return colorMap[tokenByType];
  }
  const token = getAvatarColorToken(label);
  return colorMap[token] || '#2C6B6F';
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value || 0)));
}

function easeOutCubic(value) {
  const safeValue = clamp01(value);
  return 1 - ((1 - safeValue) ** 3);
}

function hashString(value) {
  const text = String(value || '');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getNodeLayoutSeed(node) {
  if (typeof node?.layoutSeed === 'number' && Number.isFinite(node.layoutSeed)) {
    return node.layoutSeed;
  }
  return hashString(node?.id);
}

function makeLinkKey(a, b) {
  return [String(a || ''), String(b || '')].sort().join('::');
}

function getCuratorLayerDelay(layerType) {
  if (layerType === 'child') return 180;
  if (layerType === 'family') return 560;
  if (layerType === 'staff') return 900;
  return 0;
}

function getLayerRevealProgress(layerType, elapsed) {
  return easeOutCubic((elapsed - getCuratorLayerDelay(layerType)) / INITIAL_NODE_REVEAL_DURATION_MS);
}

function darkenHexColor(hex, amount = 0.18) {
  const safeHex = String(hex || '').trim();
  const normalized = safeHex.replace('#', '');
  if (!(normalized.length === 3 || normalized.length === 6)) {
    return safeHex || '#4A8D92';
  }

  const full = normalized.length === 3
    ? normalized.split('').map((ch) => `${ch}${ch}`).join('')
    : normalized;

  const toChannel = (start) => parseInt(full.slice(start, start + 2), 16);
  const clamp = (value) => Math.max(0, Math.min(255, value));
  const factor = Math.max(0, Math.min(0.8, amount));

  const r = clamp(Math.round(toChannel(0) * (1 - factor)));
  const g = clamp(Math.round(toChannel(2) * (1 - factor)));
  const b = clamp(Math.round(toChannel(4) * (1 - factor)));

  const toHex = (value) => value.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function getAmbienteStrokeColor(ambiente, colorMap) {
  const baseCeleste = colorMap['--color-info'] || '#5BA5A8';
  if (ambiente === 'taller1') return baseCeleste;
  if (ambiente === 'taller2') return darkenHexColor(baseCeleste, 0.18);
  return baseCeleste;
}

function toRgba(color, alpha = 1) {
  const safe = String(color || '').trim();
  const a = Math.max(0, Math.min(1, Number(alpha || 0)));
  const hex = safe.replace('#', '');

  if (/^[0-9a-f]{3}$/i.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  if (/^[0-9a-f]{6}$/i.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }

  return `rgba(91, 165, 168, ${a})`;
}

function drawUnifiedSocialBackground(
  ctx,
  globalScale,
  colorMap,
  frameNow = 0,
  ambientRevealProgress = 1,
  activeAmbiente = null
) {
  const leftColor = getAmbienteStrokeColor('taller1', colorMap);
  const rightColor = getAmbienteStrokeColor('taller2', colorMap);
  const coreColor = colorMap['--color-secondary'] || '#7E6B57';
  const scale = Math.max(globalScale, 0.5);
  const reveal = clamp01(ambientRevealProgress);
  const ribbonMainWidth = Math.max(120 / scale, 58);
  const ribbonSoftWidth = Math.max(72 / scale, 34);
  const ringWidth = Math.max(1.8 / scale, 0.9);
  const pulseTime = Number(frameNow || 0) * 0.00108;
  const leftPulse = 0.94 + (Math.sin(pulseTime) * 0.06);
  const rightPulse = 0.94 + (Math.sin(pulseTime + 1.5) * 0.06);
  const leftBoost = activeAmbiente === 'taller1' ? 1.08 : 1;
  const rightBoost = activeAmbiente === 'taller2' ? 1.08 : 1;

  ctx.save();
  ctx.globalAlpha = reveal;

  // Niebla horizontal unificada.
  ctx.save();
  const mist = ctx.createLinearGradient(-520, 20, 520, 20);
  mist.addColorStop(0, toRgba(leftColor, 0.11));
  mist.addColorStop(0.46, 'rgba(255, 255, 255, 0.22)');
  mist.addColorStop(0.54, 'rgba(255, 255, 255, 0.22)');
  mist.addColorStop(1, toRgba(rightColor, 0.11));
  ctx.fillStyle = mist;
  ctx.beginPath();
  ctx.ellipse(0, 26, 520, 220, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();

  // Cinta principal de convergencia.
  ctx.save();
  const ribbonMain = ctx.createLinearGradient(-460, -36, 460, 84);
  ribbonMain.addColorStop(0, toRgba(leftColor, 0.26));
  ribbonMain.addColorStop(0.5, 'rgba(255, 255, 255, 0.30)');
  ribbonMain.addColorStop(1, toRgba(rightColor, 0.26));
  ctx.strokeStyle = ribbonMain;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = ribbonMainWidth;
  ctx.beginPath();
  ctx.moveTo(-430, -26);
  ctx.bezierCurveTo(-230, -154, 176, 132, 430, 12);
  ctx.stroke();
  ctx.restore();

  // Cinta secundaria para sensación orgánica.
  ctx.save();
  const ribbonSoft = ctx.createLinearGradient(-460, 132, 460, -28);
  ribbonSoft.addColorStop(0, toRgba(leftColor, 0.14));
  ribbonSoft.addColorStop(0.5, 'rgba(255, 255, 255, 0.18)');
  ribbonSoft.addColorStop(1, toRgba(rightColor, 0.14));
  ctx.strokeStyle = ribbonSoft;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = ribbonSoftWidth;
  ctx.beginPath();
  ctx.moveTo(-430, 124);
  ctx.bezierCurveTo(-200, 34, 180, -26, 430, 88);
  ctx.stroke();
  ctx.restore();

  // Nucleo central brillante.
  ctx.save();
  const core = ctx.createRadialGradient(0, 24, 14, 0, 24, 196);
  core.addColorStop(0, 'rgba(255, 255, 255, 0.42)');
  core.addColorStop(0.34, toRgba(coreColor, 0.16));
  core.addColorStop(1, toRgba(coreColor, 0));
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.ellipse(0, 24, 222, 166, 0, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();

  // Anillo sutil de cohesion.
  ctx.save();
  const ringGradient = ctx.createLinearGradient(-280, 24, 280, 24);
  ringGradient.addColorStop(0, toRgba(leftColor, 0.26));
  ringGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.34)');
  ringGradient.addColorStop(1, toRgba(rightColor, 0.26));
  ctx.strokeStyle = ringGradient;
  ctx.lineWidth = ringWidth;
  ctx.setLineDash([8 / scale, 10 / scale]);
  ctx.beginPath();
  ctx.ellipse(0, 24, 270, 138, 0, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.restore();

  const drawInstitutionalPulse = (center, color, pulse, boost) => {
    ctx.save();
    const glow = ctx.createRadialGradient(center.x, center.y, 12, center.x, center.y, 170 * pulse * boost);
    glow.addColorStop(0, toRgba(color, 0.14));
    glow.addColorStop(0.45, toRgba(color, 0.07 * boost));
    glow.addColorStop(1, toRgba(color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(center.x, center.y, 176 * pulse * boost, 126 * pulse * boost, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  };

  drawInstitutionalPulse(AMBIENTE_CENTERS.taller1, leftColor, leftPulse, leftBoost);
  drawInstitutionalPulse(AMBIENTE_CENTERS.taller2, rightColor, rightPulse, rightBoost);
  ctx.restore();
}

function drawGhostTrails(ctx, globalScale, trails, frameNow, focusState) {
  const scale = Math.max(globalScale, 0.75);
  (Array.isArray(trails) ? trails : []).forEach((trail) => {
    const age = Number(frameNow || 0) - Number(trail?.createdAt || 0);
    if (age < 0 || age > GHOST_TRAIL_DURATION_MS) return;

    const life = 1 - (age / GHOST_TRAIL_DURATION_MS);
    const emphasis = !focusState?.active
      ? 1
      : focusState.primaryId === trail?.nodeId || focusState.neighborIds?.has(trail?.nodeId)
        ? 1
        : 0.34;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(Number(trail?.x1 || 0), Number(trail?.y1 || 0));
    ctx.lineTo(Number(trail?.x2 || 0), Number(trail?.y2 || 0));
    ctx.lineCap = 'round';
    ctx.strokeStyle = toRgba(trail?.color || '#9CA3AF', (0.08 + (life * 0.18)) * emphasis);
    ctx.lineWidth = Math.max(1.15 / scale, 0.55) * (0.94 + (life * 0.34));
    ctx.stroke();
    ctx.restore();
  });
}

const AMBIENTE_CENTERS = {
  taller1: { x: -320, y: 0, label: 'Taller 1' },
  taller2: { x: 320, y: 0, label: 'Taller 2' }
};
const AMBIENTE_RADIUS = 190;
const STAFF_ANCHOR = { x: 0, y: 200, strength: 0.028 };
const STAFF_ZONE = {
  minRadius: 24,
  maxRadius: 124,
  angleJitter: 0.85,
  radiusJitter: 0.2
};
const CHILD_AMBIENTE_STRENGTH = 0.014;
const SOCIAL_TIDE_STRENGTH = 0.026;
const AMBIENTE_BALANCE_STRENGTH = 0.055;
const ORPHAN_CHILD_DRIFT_STRENGTH = 0.018;
const DRAGGED_STAFF_ATTRACTION_STRENGTH = 0.022;
const SIMULATION_ALPHA_TARGET = 0.008;
const SIMULATION_ALPHA_TARGET_ACTIVE = 0.014;
const SIMULATION_ALPHA_TARGET_INTRO = 0.004;
const NOISE_JITTER = 0.01;
const INITIAL_GRAPH_ENTRANCE_MS = 1680;
const INITIAL_GRAPH_CENTER_DELAY_MS = 180;
const INITIAL_NODE_REVEAL_DURATION_MS = 540;
const FOCUS_AURA_FADE_IN_MS = 320;
const FOCUS_AURA_FADE_OUT_MS = 180;
const GHOST_TRAIL_DURATION_MS = 420;
const CHILD_ZONE = {
  minRadius: 44,
  maxRadius: AMBIENTE_RADIUS - 34
};

function normalizeAmbienteKey(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  const compact = raw.replace(/\s+/g, '');
  if (compact === 'taller1' || compact === 't1' || compact === 'ambiente1') return 'taller1';
  if (compact === 'taller2' || compact === 't2' || compact === 'ambiente2') return 'taller2';
  return null;
}

function buildStaffAnchorTargets(nodes) {
  const staffNodes = (Array.isArray(nodes) ? nodes : [])
    .filter((node) => node?.type === 'staff')
    .sort((a, b) => getNodeLayoutSeed(a) - getNodeLayoutSeed(b));

  const targets = new Map();
  const count = staffNodes.length;
  if (count === 0) return targets;

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const radialSpan = Math.max(12, STAFF_ZONE.maxRadius - STAFF_ZONE.minRadius);

  staffNodes.forEach((node, index) => {
    const ratio = count <= 1 ? 0.2 : index / (count - 1);
    const baseRadius = STAFF_ZONE.minRadius + Math.sqrt(ratio) * radialSpan;
    const seed = Math.floor(getNodeLayoutSeed(node) * 1e9);
    const angleNoise = (((seed % 1000) / 1000) - 0.5) * STAFF_ZONE.angleJitter;
    const radiusNoise = 1 + (((Math.floor(seed / 1000) % 1000) / 1000 - 0.5) * STAFF_ZONE.radiusJitter);
    const angle = index * goldenAngle + angleNoise;
    const radius = Math.max(STAFF_ZONE.minRadius, Math.min(STAFF_ZONE.maxRadius, baseRadius * radiusNoise));

    targets.set(node.id, {
      x: STAFF_ANCHOR.x + Math.cos(angle) * radius,
      y: STAFF_ANCHOR.y + Math.sin(angle) * radius
    });
  });

  return targets;
}

function buildChildZoneTargets(nodes) {
  const grouped = {};
  Object.keys(AMBIENTE_CENTERS).forEach((key) => {
    grouped[key] = [];
  });

  (Array.isArray(nodes) ? nodes : []).forEach((node) => {
    if (node?.type !== 'child') return;
    const ambienteKey = normalizeAmbienteKey(node.ambiente);
    if (!ambienteKey || !grouped[ambienteKey]) return;
    grouped[ambienteKey].push(node);
  });

  const targets = new Map();
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  Object.entries(grouped).forEach(([ambiente, ambienteNodes]) => {
    const center = AMBIENTE_CENTERS[ambiente];
    if (!center || ambienteNodes.length === 0) return;

    const ordered = ambienteNodes
      .slice()
      .sort((a, b) => getNodeLayoutSeed(a) - getNodeLayoutSeed(b));

    const radialSpan = Math.max(24, CHILD_ZONE.maxRadius - CHILD_ZONE.minRadius);
    const ambienteSeed = hashString(ambiente);
    const angleOffset = ((ambienteSeed % 360) / 360) * Math.PI * 2;

    ordered.forEach((node, index) => {
      const ratio = ordered.length <= 1 ? 0.22 : index / (ordered.length - 1);
      const radius = CHILD_ZONE.minRadius + Math.sqrt(ratio) * radialSpan;
      const nodeSeed = getNodeLayoutSeed(node);
      const angleNoise = ((((Math.floor(nodeSeed * 1000) % 1000) / 1000) - 0.5) * 0.18);
      const angle = angleOffset + (index * goldenAngle) + angleNoise;

      targets.set(node.id, {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      });
    });
  });

  return targets;
}

function buildFamilySeedTargets(nodes, links, childZoneTargets) {
  const familyTargets = new Map();
  const childrenByFamily = new Map();
  const familySlotByChild = new Map();

  (Array.isArray(links) ? links : []).forEach((link) => {
    if (link?.type !== 'family-child') return;
    const sourceId = getLinkNodeId(link.source);
    const targetId = getLinkNodeId(link.target);
    const familyId = sourceId.startsWith('family:')
      ? sourceId
      : targetId.startsWith('family:')
        ? targetId
        : '';
    const childId = sourceId.startsWith('child:')
      ? sourceId
      : targetId.startsWith('child:')
        ? targetId
        : '';

    if (!familyId || !childId) return;
    if (!childrenByFamily.has(familyId)) childrenByFamily.set(familyId, []);
    childrenByFamily.get(familyId).push(childId);
  });

  (Array.isArray(nodes) ? nodes : [])
    .filter((node) => node?.type === 'family')
    .sort((a, b) => getNodeLabel(a).localeCompare(getNodeLabel(b), 'es'))
    .forEach((node) => {
      const linkedChildIds = childrenByFamily.get(node.id) || [];
      const primaryChildId = linkedChildIds[0];
      const childTarget = primaryChildId ? childZoneTargets.get(primaryChildId) : null;
      const ambienteCenter = AMBIENTE_CENTERS[normalizeAmbienteKey(node.ambiente)];
      const seed = hashString(node.id);

      if (childTarget) {
        const childSlot = familySlotByChild.get(primaryChildId) || 0;
        familySlotByChild.set(primaryChildId, childSlot + 1);
        const angle = (-Math.PI / 2) + ((childSlot % 3) - 1) * 0.5 + (((seed % 1000) / 1000) - 0.5) * 0.18;
        const radius = 56 + Math.floor(childSlot / 3) * 12;
        familyTargets.set(node.id, {
          x: childTarget.x + Math.cos(angle) * radius,
          y: childTarget.y + Math.sin(angle) * radius
        });
        return;
      }

      if (ambienteCenter) {
        const angle = ((seed % 360) / 360) * Math.PI * 2;
        const radius = 84 + ((Math.floor(seed / 360) % 5) * 10);
        familyTargets.set(node.id, {
          x: ambienteCenter.x + Math.cos(angle) * radius,
          y: ambienteCenter.y + Math.sin(angle) * radius
        });
        return;
      }

      familyTargets.set(node.id, {
        x: ((seed % 120) - 60) * 0.6,
        y: 140 + (((Math.floor(seed / 120) % 120) - 60) * 0.35)
      });
    });

  return familyTargets;
}

function seedGraphLayout(data) {
  const nodes = Array.isArray(data?.nodes)
    ? data.nodes.map((node) => ({
      ...node,
      layoutSeed: Math.random()
    }))
    : [];
  const links = Array.isArray(data?.links) ? data.links.map((link) => ({ ...link })) : [];
  const childZoneTargets = buildChildZoneTargets(nodes);
  const staffTargets = buildStaffAnchorTargets(nodes);
  const familyTargets = buildFamilySeedTargets(nodes, links, childZoneTargets);

  nodes.forEach((node) => {
    const seed = node?.type === 'staff'
      ? Math.floor(getNodeLayoutSeed(node) * 1e9)
      : hashString(node.id);
    const jitterX = (((seed % 1000) / 1000) - 0.5) * (node?.type === 'staff' ? 10 : 16);
    const jitterY = ((((Math.floor(seed / 1000)) % 1000) / 1000) - 0.5) * (node?.type === 'staff' ? 10 : 16);
    const ambienteCenter = AMBIENTE_CENTERS[normalizeAmbienteKey(node?.ambiente)];
    const baseTarget = node?.type === 'child'
      ? childZoneTargets.get(node.id)
      : node?.type === 'staff'
        ? staffTargets.get(node.id)
        : node?.type === 'family'
          ? familyTargets.get(node.id)
          : ambienteCenter || { x: 0, y: 120 };

    node.x = Number(baseTarget?.x || 0) + jitterX;
    node.y = Number(baseTarget?.y || 0) + jitterY;
    node.vx = 0;
    node.vy = 0;
  });

  return { nodes, links };
}

function getInstagramHref(value) {
  const text = normalizeText(value);
  if (!text) return '';
  if (/^https?:\/\//i.test(text)) return text;
  const handle = text.replace(/^@+/, '').replace(/^instagram\.com\//i, '').replace(/^www\.instagram\.com\//i, '');
  return `https://www.instagram.com/${handle}`;
}

function FullscreenIcon({ active = false }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="social-fullscreen-icon"
    >
      {active ? (
        <path
          d="M10 4H4v6M14 4h6v6M10 20H4v-6M14 20h6v-6M9 9L4 4M15 9l5-5M9 15l-5 5M15 15l5 5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5M10 10L4 4M14 10l6-6M10 14l-6 6M14 14l6 6"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function createAmbienteBalanceForce(strength = 1.2, isVisible = () => true) {
  let nodes = [];
  const ambienteKeys = Object.keys(AMBIENTE_CENTERS);

  function force(alpha) {
    const effectiveAlpha = Math.max(Number(alpha || 0), 0.10);
    const aggregates = {};
    ambienteKeys.forEach((key) => {
      aggregates[key] = { x: 0, y: 0, count: 0 };
    });

    nodes.forEach((node) => {
      if (!isVisible(node)) return;
      const key = node?.ambiente;
      if (!aggregates[key]) return;
      aggregates[key].x += Number(node.x || 0);
      aggregates[key].y += Number(node.y || 0);
      aggregates[key].count += 1;
    });

    const offsets = {};
    ambienteKeys.forEach((key) => {
      const aggregate = aggregates[key];
      if (!aggregate || aggregate.count === 0) return;
      const target = AMBIENTE_CENTERS[key];
      const centroidX = aggregate.x / aggregate.count;
      const centroidY = aggregate.y / aggregate.count;
      offsets[key] = {
        vx: (target.x - centroidX) * strength * effectiveAlpha,
        vy: (target.y - centroidY) * strength * effectiveAlpha
      };
    });

    nodes.forEach((node) => {
      if (!isVisible(node)) return;
      const offset = offsets[node?.ambiente];
      if (!offset) return;
      node.vx = Number(node.vx || 0) + offset.vx;
      node.vy = Number(node.vy || 0) + offset.vy;
    });
  }

  force.initialize = (nextNodes) => {
    nodes = Array.isArray(nextNodes) ? nextNodes : [];
  };

  return force;
}

function createOrphanChildDriftForce(
  strength = ORPHAN_CHILD_DRIFT_STRENGTH,
  isVisible = () => true,
  hasFamilyLink = () => false
) {
  let nodes = [];

  function force(alpha) {
    const effectiveAlpha = Math.max(Number(alpha || 0), 0.07);
    const grouped = {};

    nodes.forEach((node) => {
      if (!isVisible(node)) return;
      if (node?.type !== 'child') return;
      if (!AMBIENTE_CENTERS[node.ambiente]) return;

      if (!grouped[node.ambiente]) {
        grouped[node.ambiente] = {
          allX: 0,
          allY: 0,
          allCount: 0,
          linkedX: 0,
          linkedY: 0,
          linkedCount: 0
        };
      }

      const bucket = grouped[node.ambiente];
      bucket.allX += Number(node.x || 0);
      bucket.allY += Number(node.y || 0);
      bucket.allCount += 1;

      if (hasFamilyLink(node.id)) {
        bucket.linkedX += Number(node.x || 0);
        bucket.linkedY += Number(node.y || 0);
        bucket.linkedCount += 1;
      }
    });

    nodes.forEach((node) => {
      if (!isVisible(node)) return;
      if (node?.type !== 'child') return;
      if (hasFamilyLink(node.id)) return;

      const bucket = grouped[node.ambiente];
      if (!bucket || bucket.allCount < 2) return;

      const useLinkedCentroid = bucket.linkedCount > 0;
      const targetX = useLinkedCentroid
        ? bucket.linkedX / bucket.linkedCount
        : bucket.allX / bucket.allCount;
      const targetY = useLinkedCentroid
        ? bucket.linkedY / bucket.linkedCount
        : bucket.allY / bucket.allCount;
      const factor = strength * effectiveAlpha;

      node.vx = Number(node.vx || 0) + (targetX - Number(node.x || 0)) * factor;
      node.vy = Number(node.vy || 0) + (targetY - Number(node.y || 0)) * factor;
    });
  }

  force.initialize = (nextNodes) => {
    nodes = Array.isArray(nextNodes) ? nextNodes : [];
  };

  return force;
}

function createSocialTideForce(
  getTarget = () => null,
  strength = SOCIAL_TIDE_STRENGTH,
  isVisible = () => true
) {
  let nodes = [];
  let phase = 0;

  function force(alpha) {
    phase += 0.018;
    const effectiveAlpha = Math.max(Number(alpha || 0), 0.035);

    nodes.forEach((node) => {
      if (!isVisible(node)) return;
      if (node?.type !== 'child') return;

      const target = typeof getTarget === 'function' ? getTarget(node) : null;
      if (!target) return;

      const dx = Number(target.x || 0) - Number(node.x || 0);
      const dy = Number(target.y || 0) - Number(node.y || 0);
      const distance = Math.hypot(dx, dy) || 1;
      const unitX = dx / distance;
      const unitY = dy / distance;
      const seed = getNodeLayoutSeed(node);
      const phaseOffset = (seed % 1000) * 0.0063;
      const swirl = Math.sin(phase + phaseOffset);
      const secondary = Math.cos((phase * 0.82) + phaseOffset);
      const pullFactor = Math.min(0.055, strength * effectiveAlpha * (0.42 + (Math.min(distance, 220) / 190)));
      const tangentFactor = Math.min(0.018, ((distance / 320) * 0.015)) * effectiveAlpha;

      node.vx = Number(node.vx || 0) + (dx * pullFactor) + (((-unitY * swirl) + (unitX * secondary * 0.35)) * tangentFactor * 18);
      node.vy = Number(node.vy || 0) + (dy * pullFactor) + (((unitX * swirl) + (unitY * secondary * 0.35)) * tangentFactor * 18);
    });
  }

  force.initialize = (nextNodes) => {
    nodes = Array.isArray(nextNodes) ? nextNodes : [];
  };

  return force;
}

function createDraggedStaffAttractionForce(
  getDragState = () => null,
  strength = DRAGGED_STAFF_ATTRACTION_STRENGTH,
  isVisible = () => true
) {
  let nodes = [];

  function force(alpha) {
    const dragState = typeof getDragState === 'function' ? getDragState() : null;
    if (!dragState?.active) return;

    const targetX = Number(dragState.x || 0);
    const targetY = Number(dragState.y || 0);
    const effectiveAlpha = Math.max(Number(alpha || 0), 0.06);

    nodes.forEach((node) => {
      if (!isVisible(node)) return;
      if (node?.type !== 'child') return;

      const dx = targetX - Number(node.x || 0);
      const dy = targetY - Number(node.y || 0);
      const distance = Math.hypot(dx, dy) || 1;
      const distanceFactor = 0.22 + (Math.min(distance, 260) / 260);
      const pullFactor = Math.min(0.028, strength * effectiveAlpha * distanceFactor);

      node.vx = Number(node.vx || 0) + (dx * pullFactor);
      node.vy = Number(node.vy || 0) + (dy * pullFactor);
    });
  }

  force.initialize = (nextNodes) => {
    nodes = Array.isArray(nextNodes) ? nextNodes : [];
  };

  return force;
}

const CONTACT_FIELDS = [
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'email', label: 'Email' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'ocupacion', label: 'Trabajo/Ocupación' },
  { key: 'otros', label: 'Otros' }
];

const INITIAL_GRAPH_FILTERS = {
  showFamilies: true,
  showStudents: true,
  showStaff: true
};

function isNodeVisibleByFilters(node, filters) {
  if (node.type === 'family') return filters.showFamilies;
  if (node.type === 'child') return filters.showStudents;
  if (node.type === 'staff') return filters.showStaff;
  return true;
}

export default function SocialPage() {
  const { user, role, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [dmConfig, setDmConfig] = useState({ enabled: false, pilotFamilyUids: [] });
  const graphRef = useRef(null);
  const cacheRef = useRef({});
  const containerRef = useRef(null);
  const mapCardRef = useRef(null);
  const hiddenNodesDropdownRef = useRef(null);
  const hasInitialAutoCenteredRef = useRef(false);
  const roleTransitionTimerRef = useRef(null);
  const entranceAnimationFrameRef = useRef(null);
  const entranceStartRef = useRef(0);
  const entranceActiveRef = useRef(false);
  const lastNodePositionsRef = useRef(new Map());
  const ghostTrailsRef = useRef([]);
  const ghostTrailsUntilRef = useRef(0);
  const draggedStaffRef = useRef({
    active: false,
    nodeId: '',
    x: 0,
    y: 0
  });
  const focusAuraAnimationFrameRef = useRef(null);
  const focusVisualProgressRef = useRef(0);

  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [hiddenNodeIds, setHiddenNodeIds] = useState([]);
  const [hiddenNodes, setHiddenNodes] = useState([]);
  const [showHiddenNodesDropdown, setShowHiddenNodesDropdown] = useState(false);
  const [selectedHiddenNodeIds, setSelectedHiddenNodeIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [graphFilters, setGraphFilters] = useState(INITIAL_GRAPH_FILTERS);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [focusVisualProgress, setFocusVisualProgress] = useState(0);
  const [imageRenderTick, setImageRenderTick] = useState(0);
  const [myProfile, setMyProfile] = useState({
    photoUrl: '',
    allowMessages: true,
    contact: { ...EMPTY_SOCIAL_CONTACT },
    contactVisibility: { ...EMPTY_SOCIAL_CONTACT_VISIBILITY }
  });
  const [familyChildren, setFamilyChildren] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 560 });
  const [colorMap, setColorMap] = useState(() => buildAvatarColorMap());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [alphaTarget, setAlphaTarget] = useState(SIMULATION_ALPHA_TARGET);
  const [entranceNow, setEntranceNow] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const refreshThemeColors = useCallback(() => {
    setColorMap(buildAvatarColorMap());
  }, []);

  useEffect(() => {
    refreshThemeColors();
    const observer = new MutationObserver(() => refreshThemeColors());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });
    return () => observer.disconnect();
  }, [refreshThemeColors]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    syncPreference();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncPreference);
      return () => mediaQuery.removeEventListener('change', syncPreference);
    }

    mediaQuery.addListener(syncPreference);
    return () => mediaQuery.removeListener(syncPreference);
  }, []);

  const updateDimensions = useCallback(() => {
    const width = containerRef.current?.clientWidth || 800;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
    const fullscreenElement = typeof document !== 'undefined' ? document.fullscreenElement : null;
    const fullscreenActive = Boolean(fullscreenElement && mapCardRef.current === fullscreenElement);

    let nextHeight;
    if (fullscreenActive) {
      // En fullscreen usamos casi todo el alto visible; restamos un margen mínimo
      // para padding/controles, evitando bandas vacías debajo del canvas.
      nextHeight = Math.max(560, viewportHeight - 28);
    } else {
      const desktopHeight = Math.round(viewportHeight * 0.64);
      if (width < 768) {
        nextHeight = Math.max(620, Math.round(width * 1.24), Math.round(viewportHeight * 0.62));
      } else if (width < 900) {
        nextHeight = Math.max(460, Math.round(width * 0.72));
      } else {
        nextHeight = Math.max(560, desktopHeight);
      }
    }

    setDimensions({
      width,
      height: nextHeight
    });
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement;
      const isMapFullscreen = Boolean(fullscreenElement && mapCardRef.current === fullscreenElement);
      setIsFullscreen(isMapFullscreen);
      requestAnimationFrame(() => updateDimensions());
      setTimeout(() => updateDimensions(), 80);
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [updateDimensions]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!hiddenNodesDropdownRef.current?.contains(event.target)) {
        setShowHiddenNodesDropdown(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await socialService.getSocialGraphData();
      setGraphData(seedGraphLayout(data));
      setHiddenNodeIds(Array.isArray(data?.hiddenNodeIds) ? data.hiddenNodeIds : []);
      setHiddenNodes(Array.isArray(data?.hiddenNodes) ? data.hiddenNodes : []);
      setSelectedHiddenNodeIds([]);
    } catch (loadError) {
      setError(loadError.message || 'No se pudo cargar el mapa social');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMyProfile = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const result = await socialService.getMySocialProfile(user.uid);
      if (result.success && result.profile) {
        setMyProfile(result.profile);
      }
    } catch {
      // silent fallback: the profile is optional.
    }
  }, [user?.uid]);

  const loadFamilyChildren = useCallback(async () => {
    if (role !== 'family' || !user?.uid) {
      setFamilyChildren([]);
      return;
    }
    const result = await socialService.getFamilyChildren(user.uid);
    if (result.success) {
      const nextChildren = (result.children || []).sort((a, b) =>
        String(a.nombreCompleto || '').localeCompare(String(b.nombreCompleto || ''), 'es')
      );
      setFamilyChildren(nextChildren);
    }
  }, [role, user?.uid]);

  useEffect(() => {
    void Promise.all([loadGraph(), loadMyProfile(), loadFamilyChildren()]);
    if (role === 'family') {
      directMessagesService.getDMsModuleConfig().then(setDmConfig).catch(() => {});
    }
  }, [loadFamilyChildren, loadGraph, loadMyProfile, role]);

  useEffect(() => {
    const cache = cacheRef.current;
    graphData.nodes.forEach((node) => {
      if (!node.photoUrl || cache[node.id]) return;
      const img = new Image();
      img.src = node.photoUrl;
      img.onload = () => {
        cache[node.id] = img;
        setImageRenderTick((value) => value + 1);
      };
      img.onerror = () => {
        cache[node.id] = null;
        setImageRenderTick((value) => value + 1);
      };
      cache[node.id] = 'loading';
    });
  }, [graphData.nodes]);

  const visibleNodeIds = useMemo(() => {
    const query = normalizeText(search).toLowerCase();
    const roleVisibleNodes = graphData.nodes.filter((node) => isNodeVisibleByFilters(node, graphFilters));
    const roleVisibleSet = new Set(roleVisibleNodes.map((node) => node.id));

    if (!query) {
      return roleVisibleSet;
    }

    const searchedIds = new Set(
      roleVisibleNodes
        .filter((node) => getNodeLabel(node).toLowerCase().includes(query))
        .map((node) => node.id)
    );

    const selectedId = selectedNode?.id;
    if (!selectedId || !searchedIds.has(selectedId)) {
      return searchedIds;
    }

    const expandedIds = new Set(searchedIds);
    graphData.links.forEach((link) => {
      const sourceId = getLinkNodeId(link.source);
      const targetId = getLinkNodeId(link.target);
      if (!roleVisibleSet.has(sourceId) || !roleVisibleSet.has(targetId)) return;
      if (sourceId === selectedId) expandedIds.add(targetId);
      if (targetId === selectedId) expandedIds.add(sourceId);
    });
    return expandedIds;
  }, [graphData.links, graphData.nodes, graphFilters, search, selectedNode?.id]);

  const visibleGraphData = useMemo(() => {
    const nodes = graphData.nodes.filter((node) => visibleNodeIds.has(node.id));
    const links = graphData.links.filter((link) => {
      const sourceId = getLinkNodeId(link.source);
      const targetId = getLinkNodeId(link.target);
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });

    return { nodes, links };
  }, [graphData.links, graphData.nodes, visibleNodeIds]);

  const roleVisibleNodeIds = useMemo(
    () => new Set(
      graphData.nodes
        .filter((node) => isNodeVisibleByFilters(node, graphFilters))
        .map((node) => node.id)
    ),
    [graphData.nodes, graphFilters]
  );

  // Ref para que las closures de D3 lean el valor actual sin disparar el efecto de fuerzas
  const roleVisibleNodeIdsRef = useRef(roleVisibleNodeIds);
  useEffect(() => {
    roleVisibleNodeIdsRef.current = roleVisibleNodeIds;
  }, [roleVisibleNodeIds]);

  const nodesById = useMemo(
    () => new Map(visibleGraphData.nodes.map((node) => [node.id, node])),
    [visibleGraphData.nodes]
  );

  const relatedNodes = useMemo(() => {
    if (!selectedNode) return [];
    const direct = new Set();
    const familyAdjacency = new Map();

    visibleGraphData.links.forEach((link) => {
      const sourceId = getLinkNodeId(link.source);
      const targetId = getLinkNodeId(link.target);
      if (sourceId === selectedNode.id) direct.add(targetId);
      if (targetId === selectedNode.id) direct.add(sourceId);

      if (link?.type === 'family-child') {
        if (!familyAdjacency.has(sourceId)) familyAdjacency.set(sourceId, new Set());
        if (!familyAdjacency.has(targetId)) familyAdjacency.set(targetId, new Set());
        familyAdjacency.get(sourceId).add(targetId);
        familyAdjacency.get(targetId).add(sourceId);
      }
    });

    const expanded = new Set(direct);

    if (selectedNode.type === 'family' || selectedNode.type === 'child') {
      const visited = new Set([selectedNode.id]);
      const queue = [selectedNode.id];

      while (queue.length > 0) {
        const currentId = queue.shift();
        const neighbors = familyAdjacency.get(currentId);
        if (!neighbors) continue;

        neighbors.forEach((neighborId) => {
          if (visited.has(neighborId)) return;
          visited.add(neighborId);
          queue.push(neighborId);
          if (neighborId !== selectedNode.id) expanded.add(neighborId);
        });
      }
    }

    return Array.from(expanded)
      .map((id) => nodesById.get(id))
      .filter(Boolean)
      .sort((a, b) => {
        const aRank = direct.has(a.id) ? 0 : 1;
        const bRank = direct.has(b.id) ? 0 : 1;
        if (aRank !== bRank) return aRank - bRank;
        return getNodeLabel(a).localeCompare(getNodeLabel(b), 'es');
      })
      .slice(0, 20);
  }, [visibleGraphData.links, nodesById, selectedNode]);

  const focusNode = hoveredNode || selectedNode || null;
  const focusNodeId = focusNode?.id || '';
  const focusState = useMemo(() => {
    const neighborIds = new Set();
    const highlightedLinkKeys = new Set();
    const familyAdjacency = new Map();

    if (!focusNodeId) {
      return {
        active: false,
        primaryId: '',
        neighborIds,
        highlightedLinkKeys
      };
    }

    neighborIds.add(focusNodeId);
    visibleGraphData.links.forEach((link) => {
      const sourceId = getLinkNodeId(link.source);
      const targetId = getLinkNodeId(link.target);
      if (link?.type === 'family-child') {
        if (!familyAdjacency.has(sourceId)) familyAdjacency.set(sourceId, new Set());
        if (!familyAdjacency.has(targetId)) familyAdjacency.set(targetId, new Set());
        familyAdjacency.get(sourceId).add(targetId);
        familyAdjacency.get(targetId).add(sourceId);
      }
      if (sourceId !== focusNodeId && targetId !== focusNodeId) return;
      neighborIds.add(sourceId === focusNodeId ? targetId : sourceId);
      highlightedLinkKeys.add(makeLinkKey(sourceId, targetId));
    });

    if (focusNode?.type === 'family' || focusNode?.type === 'child') {
      const visited = new Set([focusNodeId]);
      const queue = [focusNodeId];

      while (queue.length > 0) {
        const currentId = queue.shift();
        const neighbors = familyAdjacency.get(currentId);
        if (!neighbors) continue;

        neighbors.forEach((neighborId) => {
          highlightedLinkKeys.add(makeLinkKey(currentId, neighborId));
          neighborIds.add(neighborId);
          if (visited.has(neighborId)) return;
          visited.add(neighborId);
          queue.push(neighborId);
        });
      }
    }

    return {
      active: true,
      primaryId: focusNodeId,
      neighborIds,
      highlightedLinkKeys
    };
  }, [focusNode?.type, focusNodeId, visibleGraphData.links]);

  const activeAmbienteKey = useMemo(
    () => normalizeAmbienteKey(hoveredNode?.ambiente || selectedNode?.ambiente),
    [hoveredNode?.ambiente, selectedNode?.ambiente]
  );

  useEffect(() => {
    focusVisualProgressRef.current = focusVisualProgress;
  }, [focusVisualProgress]);

  useEffect(() => {
    if (focusAuraAnimationFrameRef.current) {
      cancelAnimationFrame(focusAuraAnimationFrameRef.current);
      focusAuraAnimationFrameRef.current = null;
    }

    const target = focusNodeId ? 1 : 0;
    const startValue = focusVisualProgressRef.current;
    const duration = target > startValue ? FOCUS_AURA_FADE_IN_MS : FOCUS_AURA_FADE_OUT_MS;

    if (Math.abs(target - startValue) < 0.01) {
      focusVisualProgressRef.current = target;
      setFocusVisualProgress(target);
      return undefined;
    }

    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    const tick = (frameNow) => {
      const elapsed = frameNow - startTime;
      const linearProgress = clamp01(elapsed / duration);
      const easedProgress = easeOutCubic(linearProgress);
      const nextValue = startValue + ((target - startValue) * easedProgress);
      focusVisualProgressRef.current = nextValue;
      setFocusVisualProgress(nextValue);
      graphRef.current?.refresh?.();

      if (linearProgress < 1) {
        focusAuraAnimationFrameRef.current = requestAnimationFrame(tick);
      } else {
        focusAuraAnimationFrameRef.current = null;
      }
    };

    focusAuraAnimationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (focusAuraAnimationFrameRef.current) {
        cancelAnimationFrame(focusAuraAnimationFrameRef.current);
        focusAuraAnimationFrameRef.current = null;
      }
    };
  }, [focusNodeId]);

  useEffect(() => {
    if (!selectedNode) return;
    const stillVisible = visibleNodeIds.has(selectedNode.id);
    if (!stillVisible) {
      setSelectedNode(null);
    }
  }, [selectedNode, visibleNodeIds]);

  useEffect(() => {
    if (!hoveredNode) return;
    if (!visibleNodeIds.has(hoveredNode.id)) {
      setHoveredNode(null);
    }
  }, [hoveredNode, visibleNodeIds]);

  const childPhotoLookup = useMemo(() => {
    const map = new Map();
    graphData.nodes.forEach((node) => {
      if (node.type === 'child' && node.childId) {
        map.set(node.childId, node.photoUrl || '');
      }
    });
    return map;
  }, [graphData.nodes]);

  const childHasFamilyLinkMap = useMemo(() => {
    const map = new Map(
      graphData.nodes
        .filter((node) => node?.type === 'child')
        .map((node) => [node.id, false])
    );

    graphData.links.forEach((link) => {
      if (link?.type !== 'family-child') return;
      const sourceId = getLinkNodeId(link.source);
      const targetId = getLinkNodeId(link.target);
      const childId = sourceId.startsWith('child:')
        ? sourceId
        : targetId.startsWith('child:')
          ? targetId
          : '';
      if (!childId || !map.has(childId)) return;
      map.set(childId, true);
    });

    return map;
  }, [graphData.links, graphData.nodes]);

  const childHasFamilyLinkRef = useRef(childHasFamilyLinkMap);
  useEffect(() => {
    childHasFamilyLinkRef.current = childHasFamilyLinkMap;
  }, [childHasFamilyLinkMap]);

  const roleFilterSignature = useMemo(
    () => `${graphFilters.showFamilies ? 1 : 0}${graphFilters.showStudents ? 1 : 0}${graphFilters.showStaff ? 1 : 0}`,
    [graphFilters.showFamilies, graphFilters.showStaff, graphFilters.showStudents]
  );
  const lastRoleFilterSignatureRef = useRef(roleFilterSignature);

  // Fuerzas d3: atraer nodos al centro de su ambiente.
  // Se configuran cuando cambia el dataset base, no en cada toggle de filtros,
  // para evitar saltos bruscos al mostrar/ocultar tipos de nodos.
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;
    const staffTargets = buildStaffAnchorTargets(graphData.nodes);
    const childZoneTargets = buildChildZoneTargets(graphData.nodes);

    // Staff se mueve solo por su ancla dedicada (sin center/link/charge/collision/noise).
    fg.d3Force('center', null);

    const linkForce = fg.d3Force('link');
    if (linkForce && typeof linkForce.distance === 'function' && typeof linkForce.strength === 'function') {
      linkForce
        .distance((link) => (link?.type === 'family-child' ? 14 : 64))
        .strength((link) => {
          const sourceId = getLinkNodeId(link?.source);
          const targetId = getLinkNodeId(link?.target);
          const sourceNode = typeof link?.source === 'object' ? link.source : null;
          const targetNode = typeof link?.target === 'object' ? link.target : null;
          if (
            sourceNode?.type === 'staff' ||
            targetNode?.type === 'staff' ||
            sourceId.startsWith('staff:') ||
            targetId.startsWith('staff:')
          ) return 0;
          const linkVisible = roleVisibleNodeIdsRef.current.has(sourceId) && roleVisibleNodeIdsRef.current.has(targetId);
          if (!linkVisible) return 0.001;
          if (link?.type === 'family-child') return 0.45;
          if (link?.type === 'docente-child' || link?.type === 'tallerista-child') return 0.03;
          return 0.11;
        });
    }

    fg.d3Force('charge', d3.forceManyBody()
      .strength((node) => {
        if (!roleVisibleNodeIdsRef.current.has(node?.id)) return -0.5;
        if (node?.type === 'staff') return 0;
        if (node?.type === 'family') return -8;
        if (node?.type === 'child') return -14;
        return node?.ambiente ? -126 : -155;
      })
      .distanceMax(460));

    fg.d3Force('collision', d3.forceCollide((node) => {
      if (!roleVisibleNodeIdsRef.current.has(node?.id)) return 0;
      if (node?.type === 'staff') return 0;
      return node?.type === 'child' ? 10 : 12;
    }).strength(0.7));

    fg.d3Force('ambienteX', d3.forceX((node) => {
      if (node?.type === 'staff') return staffTargets.get(node.id)?.x ?? STAFF_ANCHOR.x;
      if (node?.type === 'child') return childZoneTargets.get(node.id)?.x ?? 0;
      const center = AMBIENTE_CENTERS[node.ambiente];
      return center ? center.x : 0;
    }).strength((node) => {
      if (!roleVisibleNodeIdsRef.current.has(node?.id)) return 0.002;
      if (node?.type === 'staff') return STAFF_ANCHOR.strength;
      if (node?.type === 'child') return CHILD_AMBIENTE_STRENGTH;
      return node.ambiente ? 0.022 : 0.011;
    }));

    fg.d3Force('ambienteY', d3.forceY((node) => {
      if (node?.type === 'staff') return staffTargets.get(node.id)?.y ?? STAFF_ANCHOR.y;
      if (node?.type === 'child') return childZoneTargets.get(node.id)?.y ?? 0;
      const center = AMBIENTE_CENTERS[node.ambiente];
      return center ? center.y : 280;
    }).strength((node) => {
      if (!roleVisibleNodeIdsRef.current.has(node?.id)) return 0.002;
      if (node?.type === 'staff') return STAFF_ANCHOR.strength;
      if (node?.type === 'child') return CHILD_AMBIENTE_STRENGTH;
      return node.ambiente ? 0.022 : 0.011;
    }));

    // La closure lee el ref en cada tick -> sin jerk al cambiar filtros
    // Staff excluido: no queremos que su ambiente los arrastre a los círculos de taller
    fg.d3Force('ambienteBalance', createAmbienteBalanceForce(AMBIENTE_BALANCE_STRENGTH, (node) =>
      roleVisibleNodeIdsRef.current.has(node?.id) && node?.type === 'child'
    ));

    fg.d3Force('orphanChildDrift', createOrphanChildDriftForce(
      ORPHAN_CHILD_DRIFT_STRENGTH,
      (node) => roleVisibleNodeIdsRef.current.has(node?.id),
      (nodeId) => childHasFamilyLinkRef.current.get(nodeId) === true
    ));

    fg.d3Force('socialTide', createSocialTideForce(
      (node) => childZoneTargets.get(node?.id),
      SOCIAL_TIDE_STRENGTH,
      (node) => roleVisibleNodeIdsRef.current.has(node?.id)
    ));
    fg.d3Force('draggedStaffAttraction', createDraggedStaffAttractionForce(
      () => draggedStaffRef.current,
      DRAGGED_STAFF_ATTRACTION_STRENGTH,
      (node) => roleVisibleNodeIdsRef.current.has(node?.id)
    ));

    // Perturbación mínima continua para evitar que el sistema quede estático en equilibrio
    let noiseNodes = [];
    const noiseForce = () => {
      noiseNodes.forEach((node) => {
        if (!roleVisibleNodeIdsRef.current.has(node?.id)) return;
        if (node?.type === 'staff') return;
        if (entranceActiveRef.current) return;
        node.vx = (node.vx || 0) + (Math.random() - 0.5) * NOISE_JITTER;
        node.vy = (node.vy || 0) + (Math.random() - 0.5) * NOISE_JITTER;
      });
    };
    noiseForce.initialize = (nodes) => { noiseNodes = nodes; };
    fg.d3Force('noise', noiseForce);

  // Solo reconfigura cuando cambia el dataset real, NO en cada toggle de filtros
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphData.links.length, graphData.nodes.length]);

  // Al togglear filtros de rol, reactivamos la simulación una vez
  // para recuperar movimiento sin recalentar en cada búsqueda.
  useEffect(() => {
    if (lastRoleFilterSignatureRef.current === roleFilterSignature) return;
    lastRoleFilterSignatureRef.current = roleFilterSignature;
    if (graphData.nodes.length === 0) return;

    if (roleTransitionTimerRef.current) {
      clearTimeout(roleTransitionTimerRef.current);
    }
    // Impulso suave para absorber cambios de lazos sin latigazo.
    setAlphaTarget(SIMULATION_ALPHA_TARGET_ACTIVE);
    ghostTrailsUntilRef.current = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + GHOST_TRAIL_DURATION_MS;
    roleTransitionTimerRef.current = setTimeout(() => {
      setAlphaTarget(SIMULATION_ALPHA_TARGET);
      roleTransitionTimerRef.current = null;
    }, 500);
  }, [graphData.nodes.length, roleFilterSignature]);

  useEffect(() => () => {
    if (roleTransitionTimerRef.current) {
      clearTimeout(roleTransitionTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (entranceAnimationFrameRef.current) {
      cancelAnimationFrame(entranceAnimationFrameRef.current);
      entranceAnimationFrameRef.current = null;
    }

    if (graphData.nodes.length === 0) {
      entranceStartRef.current = 0;
      entranceActiveRef.current = false;
      setEntranceNow(0);
      return undefined;
    }

    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    entranceStartRef.current = now;
    setEntranceNow(now);

    if (prefersReducedMotion) {
      entranceActiveRef.current = false;
      setAlphaTarget(SIMULATION_ALPHA_TARGET);
      return undefined;
    }

    entranceActiveRef.current = true;
    setAlphaTarget(SIMULATION_ALPHA_TARGET_INTRO);

    const tick = (frameTime) => {
      setEntranceNow(frameTime);
      if (frameTime - entranceStartRef.current >= INITIAL_GRAPH_ENTRANCE_MS) {
        entranceActiveRef.current = false;
        setAlphaTarget(SIMULATION_ALPHA_TARGET);
        entranceAnimationFrameRef.current = null;
        return;
      }
      entranceAnimationFrameRef.current = requestAnimationFrame(tick);
    };

    entranceAnimationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (entranceAnimationFrameRef.current) {
        cancelAnimationFrame(entranceAnimationFrameRef.current);
        entranceAnimationFrameRef.current = null;
      }
      entranceActiveRef.current = false;
    };
  }, [graphData.links.length, graphData.nodes.length, prefersReducedMotion]);

  useEffect(() => {
    hasInitialAutoCenteredRef.current = false;
    lastNodePositionsRef.current = new Map();
    ghostTrailsRef.current = [];
    ghostTrailsUntilRef.current = 0;
    draggedStaffRef.current = {
      active: false,
      nodeId: '',
      x: 0,
      y: 0
    };
    setHoveredNode(null);
  }, [graphData.links.length, graphData.nodes.length]);

  const onNodeClick = useCallback((node) => {
    setHoveredNode(node);
    setSelectedNode((previous) => {
      if (previous?.id === node.id) {
        return null;
      }
      if (graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 680);
        const currentZoom = graphRef.current.zoom();
        if (currentZoom < 1.62) {
          graphRef.current.zoom(1.62, 760);
        }
      }
      return node;
    });
  }, []);

  const onNodeHover = useCallback((node) => {
    setHoveredNode((previous) => {
      const previousId = previous?.id || '';
      const nextId = node?.id || '';
      if (previousId === nextId) return previous;
      return node || null;
    });
  }, []);

  const handleNodeDrag = useCallback((node) => {
    if (node?.type !== 'staff') return;

    draggedStaffRef.current = {
      active: true,
      nodeId: String(node.id || ''),
      x: Number(node.x || 0),
      y: Number(node.y || 0)
    };

    ghostTrailsUntilRef.current = (typeof performance !== 'undefined' ? performance.now() : Date.now()) + GHOST_TRAIL_DURATION_MS;
    // No reheat aquí: mantener alpha natural evita que todos los nodos
    // se lancen de golpe. La fuerza de atracción actúa suave con alpha bajo.
    if (!entranceActiveRef.current) {
      setAlphaTarget(SIMULATION_ALPHA_TARGET_ACTIVE);
    }
  }, []);

  const handleNodeDragEnd = useCallback((node) => {
    if (node?.type !== 'staff') return;

    draggedStaffRef.current = {
      active: false,
      nodeId: '',
      x: 0,
      y: 0
    };

    if (!entranceActiveRef.current) {
      setAlphaTarget(SIMULATION_ALPHA_TARGET);
    }
    if (typeof graphRef.current?.d3ReheatSimulation === 'function') {
      graphRef.current.d3ReheatSimulation();
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadGraph(), loadMyProfile(), loadFamilyChildren()]);
  }, [loadFamilyChildren, loadGraph, loadMyProfile]);

  const showSuccess = useCallback((message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 2600);
  }, []);

  const centerGraph = useCallback((duration = 500, padding = 140) => {
    const fg = graphRef.current;
    if (!fg) return;

    const hasAmbienteNodes = visibleGraphData.nodes.some((node) => Boolean(node.ambiente));
    if (hasAmbienteNodes) {
      fg.zoomToFit(duration, padding, (node) => Boolean(node.ambiente) && visibleNodeIds.has(node.id));
      return;
    }

    fg.zoomToFit(duration, padding, (node) => visibleNodeIds.has(node.id));
  }, [visibleGraphData.nodes, visibleNodeIds]);

  const getResponsiveGraphPadding = useCallback((desktopPadding, mobilePadding) => {
    if (typeof window === 'undefined') return desktopPadding;
    return window.matchMedia('(max-width: 768px)').matches ? mobilePadding : desktopPadding;
  }, []);

  const getInitialGraphPadding = useCallback(() => {
    if (typeof window === 'undefined') {
      return { base: 130, firstPass: 234 };
    }

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    return isMobile
      ? { base: 36, firstPass: 84 }
      : { base: 130, firstPass: 234 };
  }, []);

  useEffect(() => {
    if (loading || hasInitialAutoCenteredRef.current) return;
    if (visibleGraphData.nodes.length === 0) return;

    const { base: padding, firstPass } = getInitialGraphPadding();
    const timers = [];

    if (prefersReducedMotion) {
      timers.push(setTimeout(() => {
        centerGraph(420, padding);
        hasInitialAutoCenteredRef.current = true;
      }, 80));
    } else {
      timers.push(setTimeout(() => {
        centerGraph(0, firstPass);
      }, 40));
      timers.push(setTimeout(() => {
        centerGraph(1700, padding);
        hasInitialAutoCenteredRef.current = true;
      }, INITIAL_GRAPH_CENTER_DELAY_MS));
    }

    return () => timers.forEach((timerId) => clearTimeout(timerId));
  }, [centerGraph, getInitialGraphPadding, loading, prefersReducedMotion, visibleGraphData.nodes.length]);

  useEffect(() => {
    if (!isFullscreen) return;
    const timerId = setTimeout(() => {
      updateDimensions();
      centerGraph(320, 120);
    }, 120);
    return () => clearTimeout(timerId);
  }, [centerGraph, isFullscreen, updateDimensions]);

  const toggleFullscreen = useCallback(async () => {
    const mapCard = mapCardRef.current;
    if (!mapCard || !document.fullscreenEnabled) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await mapCard.requestFullscreen();
      }
    } catch {
      // Ignore user gesture/browser fullscreen errors.
    }
  }, []);

  const toggleGraphFilter = useCallback((filterKey) => {
    setGraphFilters((previous) => ({
      ...previous,
      [filterKey]: !previous[filterKey]
    }));
  }, []);

  const resetGraphFilters = useCallback(() => {
    setGraphFilters(INITIAL_GRAPH_FILTERS);
  }, []);

  const handleShowAllNodes = useCallback(() => {
    setSearch('');
    setHoveredNode(null);
    setSelectedNode(null);
  }, []);

  const handleHideSelectedNode = useCallback(async () => {
    if (!isAdmin || !selectedNode?.id) return;

    const nodeId = selectedNode.id;
    const nodeName = normalizeText(selectedNode.displayName) || 'Perfil';

    setSaving(true);
    setError('');
    try {
      const result = await socialService.hideGraphNode(nodeId);
      if (!result.success) {
        throw new Error(result.error || 'No se pudo ocultar el perfil');
      }

      setSelectedNode(null);
      setHoveredNode(null);
      await refreshAll();
      showSuccess(`${nodeName} ya no se muestra en el grafo`);
    } catch (hideError) {
      setError(hideError.message || 'No se pudo ocultar el perfil');
    } finally {
      setSaving(false);
    }
  }, [isAdmin, refreshAll, selectedNode, showSuccess]);

  const handleShowAllHiddenNodes = useCallback(async () => {
    if (!isAdmin || hiddenNodeIds.length === 0) return;

    setSaving(true);
    setError('');
    try {
      const result = await socialService.showAllGraphNodes();
      if (!result.success) {
        throw new Error(result.error || 'No se pudieron restaurar los perfiles ocultos');
      }

      await refreshAll();
      setShowHiddenNodesDropdown(false);
      showSuccess('Se volvieron a mostrar todos los perfiles ocultos');
    } catch (restoreError) {
      setError(restoreError.message || 'No se pudieron restaurar los perfiles ocultos');
    } finally {
      setSaving(false);
    }
  }, [hiddenNodeIds.length, isAdmin, refreshAll, showSuccess]);

  const handleToggleHiddenNodeSelection = useCallback((nodeId) => {
    setSelectedHiddenNodeIds((previous) => (
      previous.includes(nodeId)
        ? previous.filter((currentId) => currentId !== nodeId)
        : [...previous, nodeId]
    ));
  }, []);

  const handleRestoreSelectedHiddenNodes = useCallback(async () => {
    if (!isAdmin || selectedHiddenNodeIds.length === 0) return;

    setSaving(true);
    setError('');
    try {
      const results = await Promise.all(
        selectedHiddenNodeIds.map((nodeId) => socialService.showGraphNode(nodeId))
      );
      const failed = results.find((result) => !result.success);
      if (failed) {
        throw new Error(failed.error || 'No se pudieron restaurar algunos perfiles ocultos');
      }

      await refreshAll();
      setShowHiddenNodesDropdown(false);
      showSuccess(
        selectedHiddenNodeIds.length === 1
          ? 'Se volvió a mostrar el perfil seleccionado'
          : `Se volvieron a mostrar ${selectedHiddenNodeIds.length} perfiles ocultos`
      );
    } catch (restoreError) {
      setError(restoreError.message || 'No se pudieron restaurar los perfiles ocultos');
    } finally {
      setSaving(false);
    }
  }, [isAdmin, refreshAll, selectedHiddenNodeIds, showSuccess]);

  const handleContactChange = (field, value) => {
    setMyProfile((prev) => ({
      ...prev,
      contact: {
        ...prev.contact,
        [field]: value
      }
    }));
  };

  const handleVisibilityChange = (field, checked) => {
    setMyProfile((prev) => ({
      ...prev,
      contactVisibility: {
        ...prev.contactVisibility,
        [field]: checked
      }
    }));
  };

  const handleAllowMessagesChange = (checked) => {
    setMyProfile((prev) => ({
      ...prev,
      allowMessages: checked
    }));
  };

  const handleSaveMyProfile = async () => {
    if (!user?.uid) return;
    setSaving(true);
    setError('');
    try {
      const saveResult = await socialService.saveMySocialProfile(user.uid, myProfile);
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'No se pudo guardar tu perfil social');
      }
      await refreshAll();
      showSuccess('Perfil social actualizado');
    } catch (saveError) {
      setError(saveError.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadMyPhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user?.uid) return;

    setSaving(true);
    setError('');
    try {
      const uploadResult = await socialService.uploadFamilyProfilePhoto(user.uid, file);
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'No se pudo subir la foto');
      }
      const nextProfile = { ...myProfile, photoUrl: uploadResult.photoUrl };
      const saveResult = await socialService.saveMySocialProfile(user.uid, nextProfile);
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'No se pudo guardar la foto');
      }
      setMyProfile(nextProfile);
      await refreshAll();
      showSuccess('Foto actualizada');
    } catch (uploadError) {
      setError(uploadError.message || 'No se pudo subir la foto');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadChildPhoto = async (childId, event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user?.uid || role !== 'family') return;

    setSaving(true);
    setError('');
    try {
      const uploadResult = await socialService.uploadChildPhoto(childId, user.uid, file);
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'No se pudo subir la foto del alumno');
      }
      const saveResult = await socialService.saveChildSocialPhoto({
        childId,
        familyUid: user.uid,
        photoUrl: uploadResult.photoUrl
      });
      if (!saveResult.success) {
        throw new Error(saveResult.error || 'No se pudo guardar la foto del alumno');
      }
      await refreshAll();
      showSuccess('Foto del alumno actualizada');
    } catch (uploadError) {
      setError(uploadError.message || 'No se pudo actualizar la foto del alumno');
    } finally {
      setSaving(false);
    }
  };

  const linkCanvasObject = useCallback((link, ctx, globalScale) => {
    const sourceId = getLinkNodeId(link.source);
    const targetId = getLinkNodeId(link.target);
    const sourceNode = typeof link.source === 'object' ? link.source : nodesById.get(sourceId);
    const targetNode = typeof link.target === 'object' ? link.target : nodesById.get(targetId);
    if (!sourceNode || !targetNode) return;

    const scale = Math.max(globalScale, 0.75);
    const frameNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const linkKey = makeLinkKey(sourceId, targetId);
    const isHighlighted = focusState.highlightedLinkKeys.has(linkKey);
    const pulse = 0.5 + (0.5 * Math.sin((frameNow * 0.0031) + ((hashString(linkKey) % 1000) * 0.006)));
    const focusFade = focusState.active ? focusVisualProgress : 0;
    const baseAlpha = focusState.active
      ? (
        isHighlighted
          ? 0.11 + (focusFade * (0.1 + (pulse * 0.07)))
          : 0.11 - (focusFade * 0.082)
      )
      : (link?.type === 'family-child' ? 0.2 : 0.11);
    const baseWidth = ((link?.type === 'family-child' ? 1.65 : 1.08) / scale) + (isHighlighted ? ((0.24 + (focusFade * 0.24)) / scale) : 0);
    const highlightColor = colorMap['--color-info'] || '#78AAAF';

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (isHighlighted) {
      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.strokeStyle = toRgba(highlightColor, 0.22 + (pulse * 0.14));
      ctx.lineWidth = baseWidth + (1.8 / scale);
      ctx.shadowBlur = 18 / scale;
      ctx.shadowColor = toRgba(highlightColor, 0.32 + (pulse * 0.18));
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.34 + (pulse * 0.18)})`;
      ctx.lineWidth = baseWidth;
      ctx.shadowBlur = 0;
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(sourceNode.x, sourceNode.y);
      ctx.lineTo(targetNode.x, targetNode.y);
      ctx.strokeStyle = `rgba(156, 163, 175, ${baseAlpha})`;
      ctx.lineWidth = baseWidth;
      ctx.stroke();
    }

    ctx.restore();
  }, [colorMap, focusState, focusVisualProgress, nodesById]);

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const label = getNodeLabel(node);
    const fillColor = getNodeFillColor(node, label, colorMap);
    const isChild = node.type === 'child';
    const baseRadius = isChild ? 17 : 19;
    const cacheItem = cacheRef.current[node.id];
    const hasImage = cacheItem && cacheItem !== 'loading';
    const isSelected = selectedNode?.id === node.id;
    const isHovered = hoveredNode?.id === node.id;
    const isFocusPrimary = focusState.primaryId === node.id;
    const isFocusNeighbor = focusState.active && !isFocusPrimary && focusState.neighborIds.has(node.id);
    const focusFade = focusState.active ? focusVisualProgress : 0;
    const focusOpacity = !focusState.active
      ? 1
      : isFocusPrimary
        ? 1
        : isFocusNeighbor
          ? 1 - (0.06 * focusFade)
          : 1 - (0.78 * focusFade);
    const entranceElapsed = prefersReducedMotion
      ? INITIAL_GRAPH_ENTRANCE_MS
      : Math.max(0, entranceNow - entranceStartRef.current);
    const entranceProgress = prefersReducedMotion
      ? 1
      : getLayerRevealProgress(node?.type, entranceElapsed);
    const radius = baseRadius * (0.9 + (entranceProgress * 0.1));
    const frameNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const pulse = 0.5 + (0.5 * Math.sin((frameNow * 0.003) + ((hashString(node.id) % 1000) * 0.006)));
    const photoBorderColor = hasImage ? fillColor : null;
    const defaultBorderColor = isSelected || isHovered || isFocusPrimary
      ? '#111827'
      : `rgba(255, 255, 255, ${focusState.active && !isFocusNeighbor ? (1 - (0.28 * focusFade)) : 1})`;

    if (entranceProgress <= 0.01) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = (0.14 + (entranceProgress * 0.86)) * focusOpacity;

    if (isFocusPrimary || isFocusNeighbor) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + (isFocusPrimary ? 7.5 : 4.5), 0, 2 * Math.PI, false);
      ctx.closePath();
      ctx.fillStyle = toRgba(
        fillColor,
        (isFocusPrimary ? (0.18 + (pulse * 0.08)) : (0.1 + (pulse * 0.04))) * focusFade
      );
      ctx.shadowBlur = isFocusPrimary ? 22 : 12;
      ctx.shadowColor = toRgba(fillColor, (isFocusPrimary ? 0.35 : 0.18) * focusFade);
      ctx.fill();
      ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    if (hasImage) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
      ctx.closePath();
      ctx.clip();
      // object-fit: cover — recorta centrado sin deformar
      const iw = cacheItem.naturalWidth || cacheItem.width;
      const ih = cacheItem.naturalHeight || cacheItem.height;
      const dSize = radius * 2;
      const scale = Math.max(dSize / iw, dSize / ih);
      const sw = dSize / scale;
      const sh = dSize / scale;
      const sx = (iw - sw) / 2;
      const sy = (ih - sh) / 2;
      ctx.drawImage(cacheItem, sx, sy, sw, sh, node.x - radius, node.y - radius, dSize, dSize);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = `${isChild ? 'bold 12px' : 'bold 13px'} sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(getInitials(label), node.x, node.y + 0.5);
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
    ctx.closePath();
    ctx.lineWidth = hasImage
      ? (isSelected ? 4.4 : isHovered || isFocusPrimary ? 3.6 : 3)
      : (isSelected ? 3 : isHovered || isFocusPrimary ? 2.4 : 1.4);
    ctx.strokeStyle = photoBorderColor
      ? (isSelected || isHovered || isFocusPrimary
        ? darkenHexColor(photoBorderColor, 0.18)
        : photoBorderColor)
      : defaultBorderColor;
    ctx.stroke();

    if ((isSelected || isHovered || isFocusPrimary || isFocusNeighbor || globalScale > 1.25) && entranceProgress > 0.72) {
      const fontSize = 11 / Math.max(globalScale, 1);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = `rgba(17, 24, 39, ${focusState.active && !isFocusPrimary && !isFocusNeighbor ? (0.96 - (0.51 * focusFade)) : 0.96})`;
      ctx.fillText(label, node.x, node.y + radius + 3);
    }
    ctx.restore();
  }, [colorMap, entranceNow, focusState, focusVisualProgress, hoveredNode?.id, imageRenderTick, prefersReducedMotion, selectedNode?.id]);

  const selectedContact = extractVisibleContact(selectedNode?.contact);
  const hiddenNodeEntries = useMemo(
    () => (
      hiddenNodes.length > 0
        ? hiddenNodes
        : hiddenNodeIds.map((nodeId) => ({ id: nodeId, displayName: nodeId, type: '', ambiente: null }))
    ),
    [hiddenNodeIds, hiddenNodes]
  );
  const selectedAmbienteLabel = useMemo(() => {
    const key = normalizeAmbienteKey(selectedNode?.ambiente);
    if (key && AMBIENTE_CENTERS[key]?.label) return AMBIENTE_CENTERS[key].label;
    return normalizeText(selectedNode?.ambiente);
  }, [selectedNode?.ambiente]);
  const contactLabels = useMemo(
    () => Object.fromEntries(CONTACT_FIELDS.map((field) => [field.key, field.label])),
    []
  );
  const canEditFamilyContact = role === 'family';

  return (
    <div className="container page-container social-page">
      <div className="dashboard-header dashboard-header--compact">
        <div>
          <h1 className="dashboard-title">Comunidad Social</h1>
        </div>
      </div>

      {error && <div className="alert alert--error">{error}</div>}
      {success && <div className="alert alert--success">{success}</div>}

      <div className="social-page__layout">
        <section
          ref={mapCardRef}
          className={`card social-map-card ${isFullscreen ? 'is-fullscreen' : ''}`}
        >
          <div className="card__body social-map-card__body">
            <div className="social-map-card__toolbar">
              <input
                type="text"
                className="form-input"
                placeholder="Buscar persona..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              {normalizeText(search) && (
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={handleShowAllNodes}
                >
                  Mostrar todos
                </button>
              )}
              {isAdmin && hiddenNodeEntries.length > 0 && (
                <div ref={hiddenNodesDropdownRef} className="social-hidden-dropdown">
                  <button
                    type="button"
                    className={`btn btn--outline btn--sm ${showHiddenNodesDropdown ? 'is-active' : ''}`}
                    onClick={() => setShowHiddenNodesDropdown((previous) => !previous)}
                    disabled={saving}
                  >
                    Ocultos ({hiddenNodeEntries.length})
                  </button>

                  {showHiddenNodesDropdown && (
                    <div className="social-hidden-dropdown__menu">
                      <div className="social-hidden-dropdown__header">
                        <strong>Perfiles ocultos</strong>
                        <span>{selectedHiddenNodeIds.length} seleccionados</span>
                      </div>

                      <div className="social-hidden-dropdown__actions">
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => setSelectedHiddenNodeIds(hiddenNodeEntries.map((node) => node.id))}
                          disabled={saving}
                        >
                          Seleccionar todos
                        </button>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={() => setSelectedHiddenNodeIds([])}
                          disabled={saving || selectedHiddenNodeIds.length === 0}
                        >
                          Limpiar
                        </button>
                      </div>

                      <div className="social-hidden-dropdown__list">
                        {hiddenNodeEntries.map((node) => (
                          <label key={node.id} className="social-hidden-dropdown__item">
                            <input
                              type="checkbox"
                              checked={selectedHiddenNodeIds.includes(node.id)}
                              onChange={() => handleToggleHiddenNodeSelection(node.id)}
                              disabled={saving}
                            />
                            <div className="social-hidden-dropdown__item-text">
                              <span>{node.displayName || node.id}</span>
                              <small>{getNodeRoleText(node) || 'Perfil oculto'}</small>
                            </div>
                          </label>
                        ))}
                      </div>

                      <div className="social-hidden-dropdown__footer">
                        <button
                          type="button"
                          className="btn btn--primary btn--sm"
                          onClick={handleRestoreSelectedHiddenNodes}
                          disabled={saving || selectedHiddenNodeIds.length === 0}
                        >
                          Mostrar seleccionados
                        </button>
                        <button
                          type="button"
                          className="btn btn--outline btn--sm"
                          onClick={handleShowAllHiddenNodes}
                          disabled={saving}
                        >
                          Mostrar todos
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => centerGraph(500, getResponsiveGraphPadding(140, 48))}
              >
                Centrar
              </button>
              <button
                type="button"
                className="btn btn--outline btn--sm social-fullscreen-btn"
                onClick={toggleFullscreen}
                title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              >
                <FullscreenIcon active={isFullscreen} />
                <span>{isFullscreen ? 'Salir' : 'Pantalla completa'}</span>
              </button>
            </div>
            <div className="social-map-card__canvas" ref={containerRef}>
              <div className="social-filter-bar" role="group" aria-label="Filtros del mapa">
                {[
                  { key: 'showFamilies', label: 'Familias', cls: 'family' },
                  { key: 'showStudents', label: 'Alumnos',  cls: 'child'  },
                  { key: 'showStaff',    label: 'Staff',    cls: 'staff'  },
                ].map(({ key, label, cls }) => (
                  <button
                    key={key}
                    type="button"
                    className={`social-filter-chip social-filter-chip--${cls}${graphFilters[key] ? ' is-active' : ''}`}
                    onClick={() => toggleGraphFilter(key)}
                    aria-pressed={graphFilters[key]}
                  >
                    <span className="social-filter-chip__dot" />
                    <span className="social-filter-chip__label">{label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  className="social-filter-chip social-filter-chip--reset"
                  onClick={resetGraphFilters}
                  title="Restablecer filtros"
                  aria-label="Restablecer filtros"
                >
                  ↺
                </button>
              </div>

              {loading ? (
                <div className="social-map-card__loading">
                  <div className="spinner spinner--lg"></div>
                  <p>Cargando grafo social...</p>
                </div>
              ) : (
                <ForceGraph2D
                  ref={graphRef}
                  width={dimensions.width}
                  height={dimensions.height}
                  graphData={graphData}
                  nodeRelSize={8}
                  d3VelocityDecay={0.24}
                  d3AlphaDecay={0.007}
                  d3AlphaMin={0}
                  d3AlphaTarget={alphaTarget}
                  cooldownTime={Infinity}
                  warmupTicks={90}
                  linkCanvasObjectMode={() => 'replace'}
                  linkColor={() => '#9CA3AF'}
                  linkWidth={(link) => (link.type === 'family-child' ? 1.9 : 1.2)}
                  linkCanvasObject={linkCanvasObject}
                  nodeVisibility={(node) => visibleNodeIds.has(node.id)}
                  linkVisibility={(link) => {
                    const sourceId = getLinkNodeId(link.source);
                    const targetId = getLinkNodeId(link.target);
                    return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
                  }}
                  cooldownTicks={Infinity}
                  onNodeClick={onNodeClick}
                  onNodeHover={onNodeHover}
                  onNodeDrag={handleNodeDrag}
                  onNodeDragEnd={handleNodeDragEnd}
                  onBackgroundClick={() => {
                    setSelectedNode(null);
                    setHoveredNode(null);
                  }}
                  nodeCanvasObject={nodeCanvasObject}
                  onRenderFramePre={(ctx, globalScale) => {
                    const frameNow = typeof performance !== 'undefined' ? performance.now() : Date.now();
                    const entranceElapsed = prefersReducedMotion
                      ? INITIAL_GRAPH_ENTRANCE_MS
                      : Math.max(0, frameNow - entranceStartRef.current);
                    const ambientRevealProgress = prefersReducedMotion
                      ? 1
                      : getLayerRevealProgress('ambiente', entranceElapsed);
                    const nextPositions = new Map();
                    const currentTrails = ghostTrailsRef.current.filter((trail) =>
                      (frameNow - Number(trail?.createdAt || 0)) <= GHOST_TRAIL_DURATION_MS
                    );

                    visibleGraphData.nodes.forEach((node) => {
                      const x = Number(node?.x);
                      const y = Number(node?.y);
                      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
                      const previous = lastNodePositionsRef.current.get(node.id);
                      if (previous && frameNow <= ghostTrailsUntilRef.current) {
                        const moved = Math.hypot(x - previous.x, y - previous.y);
                        if (moved > 4.2) {
                          currentTrails.push({
                            nodeId: node.id,
                            x1: previous.x,
                            y1: previous.y,
                            x2: x,
                            y2: y,
                            createdAt: frameNow,
                            color: getNodeFillColor(node, getNodeLabel(node), colorMap)
                          });
                        }
                      }
                      nextPositions.set(node.id, { x, y });
                    });

                    lastNodePositionsRef.current = nextPositions;
                    ghostTrailsRef.current = currentTrails;

                    drawUnifiedSocialBackground(
                      ctx,
                      globalScale,
                      colorMap,
                      frameNow,
                      ambientRevealProgress,
                      activeAmbienteKey
                    );
                    drawGhostTrails(ctx, globalScale, currentTrails, frameNow, focusState);

                    Object.entries(AMBIENTE_CENTERS).forEach(([ambiente, { x, label }], index) => {
                      const ambienteColor = getAmbienteStrokeColor(ambiente, colorMap);
                      const pulse = 0.94 + (Math.sin((frameNow * 0.00115) + (index * 1.4)) * 0.06);
                      const emphasis = activeAmbienteKey === ambiente ? 1 : 0.82;
                      ctx.save();
                      ctx.globalAlpha = (0.34 + (ambientRevealProgress * 0.58)) * emphasis * pulse;
                      ctx.font = `600 ${21 / Math.max(globalScale, 0.5)}px "Avenir Next", "Montserrat", sans-serif`;
                      ctx.fillStyle = ambienteColor;
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      ctx.fillText(label.toUpperCase(), x, -AMBIENTE_RADIUS - 16 / Math.max(globalScale, 0.5));
                      ctx.restore();
                    });
                  }}
                />
              )}

              {selectedNode && (
                <aside className="social-node-sidebar">
                  <section className="card social-side-panel__card social-node-sidebar__card">
                    <div className="card__body">
                      <div className="social-selected">
                        <button
                          type="button"
                          className="btn btn--outline btn--sm social-node-sidebar__close-btn"
                          onClick={() => setSelectedNode(null)}
                          aria-label="Cerrar perfil"
                        >
                          Cerrar
                        </button>
                        <div className="social-selected__identity">
                          <Avatar
                            name={selectedNode.displayName}
                            photoUrl={selectedNode.photoUrl}
                            size={54}
                          />
                          <div className="social-selected__identity-content">
                            <h4>{selectedNode.displayName}</h4>
                            <div className="social-selected__meta">
                              <p>{getNodeRoleText(selectedNode)}</p>
                              {selectedAmbienteLabel && (
                                <span className="badge badge--primary">{selectedAmbienteLabel}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {role === 'family' &&
                          selectedNode.type === 'family' &&
                          selectedNode.uid &&
                          selectedNode.uid !== user?.uid &&
                          canAccessDMs({ role, uid: user?.uid, config: dmConfig }) && (
                          <div style={{ marginTop: 'var(--spacing-sm)' }}>
                            {selectedNode.allowMessages !== false ? (
                              <button
                                type="button"
                                className="btn btn--primary btn--sm"
                                onClick={() => {
                                  const convId = getThreadIdForUsers(user.uid, selectedNode.uid);
                                  navigate(`/portal/familia/mensajes/${convId}`);
                                }}
                              >
                                Escribir
                              </button>
                            ) : (
                              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', margin: 0 }}>
                                Esta familia no recibe mensajes nuevos.
                              </p>
                            )}
                          </div>
                        )}

                        {isAdmin && (
                          <div className="social-selected__admin-actions">
                            <button
                              type="button"
                              className="btn btn--outline btn--sm"
                              onClick={handleHideSelectedNode}
                              disabled={saving}
                            >
                              Ocultar del grafo
                            </button>
                          </div>
                        )}

                        {selectedContact.length > 0 && (
                          <div className="social-selected__contact">
                            {selectedContact.map(([key, value]) => (
                              <div key={key} className="social-selected__contact-row">
                                <strong>{contactLabels[key] || key}</strong>
                                <div className="social-selected__contact-value">
                                  {key === 'whatsapp' ? (
                                    <a
                                      href={`https://wa.me/54${value.replace(/\D/g, '')}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {value}
                                    </a>
                                  ) : key === 'instagram' ? (
                                    <a
                                      href={getInstagramHref(value)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      {value.startsWith('@') ? value : `@${value.replace(/^@+/, '')}`}
                                    </a>
                                  ) : (
                                    <span>{value}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="social-selected__related">
                          <strong>Conexiones ({relatedNodes.length})</strong>
                          {relatedNodes.length === 0 ? (
                            <p className="muted-text">Sin conexiones visibles.</p>
                          ) : (
                            <ul>
                              {relatedNodes.map((node) => (
                                <li key={node.id}>
                                  <button
                                    type="button"
                                    onClick={() => onNodeClick(node)}
                                    className="link-btn"
                                  >
                                    {node.displayName}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                </aside>
              )}
            </div>
          </div>
        </section>
      </div>

      <div className="social-page__profile-single">
        <section className="card social-side-panel__card social-profile-editor">
          <div className="card__header">
            <h3 className="card__title">Mi perfil social</h3>
          </div>
          <div className="card__body">
            <div className="social-profile-editor__body-grid">

              {/* Columna izquierda: avatar + toggle + fotos */}
              <div className="social-profile-editor__col-left">
                <div className="social-profile-editor__avatar-section">
                  <div className="social-profile-editor__avatar-wrap">
                    <Avatar
                      name={user?.displayName || user?.email || 'Perfil'}
                      photoUrl={myProfile.photoUrl}
                      size={72}
                    />
                    <label className="social-profile-editor__avatar-btn" title="Cambiar foto">
                      ✎
                      <input
                        type="file"
                        accept="image/*"
                        className="social-file-input"
                        onChange={handleUploadMyPhoto}
                        disabled={saving}
                      />
                    </label>
                  </div>
                  <span className="social-profile-editor__avatar-name">
                    {user?.displayName || user?.email}
                  </span>
                </div>

                {canEditFamilyContact && (
                  <div className="social-profile-editor__toggle-row">
                    <div className="social-profile-editor__toggle-text">
                      <span className="social-profile-editor__toggle-label">Mensajes directos</span>
                      <span className="social-profile-editor__toggle-hint">
                        Otras familias pueden escribirte
                      </span>
                    </div>
                    <label className="social-toggle">
                      <input
                        type="checkbox"
                        checked={myProfile.allowMessages !== false}
                        onChange={(event) => handleAllowMessagesChange(event.target.checked)}
                      />
                      <span className="social-toggle__track" />
                    </label>
                  </div>
                )}

                {role === 'family' && (
                  <div className="social-profile-editor__section">
                    <p className="social-profile-editor__section-label">Fotos de alumnos</p>
                    {familyChildren.length === 0 ? (
                      <p className="muted-text">No hay alumnos asociados a tu cuenta.</p>
                    ) : (
                      <div className="social-children">
                        {familyChildren.map((child) => (
                          <div key={child.id} className="social-children__item">
                            <Avatar
                              name={child.nombreCompleto || 'Alumno'}
                              photoUrl={childPhotoLookup.get(child.id)}
                              size={42}
                            />
                            <div className="social-children__meta">
                              <strong>{child.nombreCompleto}</strong>
                              <span>{child.ambiente || 'Sin ambiente'}</span>
                            </div>
                            <label className="btn btn--outline btn--sm">
                              Subir foto
                              <input
                                type="file"
                                accept="image/*"
                                className="social-file-input"
                                onChange={(event) => handleUploadChildPhoto(child.id, event)}
                                disabled={saving}
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Columna derecha: datos de contacto */}
              {canEditFamilyContact && (
                <div className="social-profile-editor__col-right">
                  <div className="social-profile-editor__section">
                    <p className="social-profile-editor__section-label">Datos de contacto</p>
                    <div className="social-profile-editor__fields">
                      {CONTACT_FIELDS.map((field) => (
                        <div key={field.key} className="social-profile-editor__field">
                          <div className="social-profile-editor__field-header">
                            <label className="social-profile-editor__field-label">{field.label}</label>
                            <label className="social-profile-editor__vis-toggle">
                              <input
                                type="checkbox"
                                checked={Boolean(myProfile.contactVisibility?.[field.key])}
                                onChange={(event) => handleVisibilityChange(field.key, event.target.checked)}
                              />
                              <span className="social-profile-editor__vis-track" />
                              <span className="social-profile-editor__vis-label">Visible</span>
                            </label>
                          </div>
                          <input
                            type="text"
                            className="form-input"
                            value={myProfile.contact?.[field.key] || ''}
                            onChange={(event) => handleContactChange(field.key, event.target.value)}
                            placeholder={field.key === 'whatsapp' ? 'Ej: 1122222222' : `Ingresar ${field.label.toLowerCase()}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>

            <button
              type="button"
              className="btn btn--primary social-profile-editor__save"
              onClick={handleSaveMyProfile}
              disabled={saving}
            >
              {saving ? 'Guardando…' : 'Guardar perfil'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
