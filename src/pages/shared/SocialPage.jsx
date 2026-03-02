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
import { socialService } from '../../services/social.service';
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

function drawUnifiedSocialBackground(ctx, globalScale, colorMap) {
  const leftColor = getAmbienteStrokeColor('taller1', colorMap);
  const rightColor = getAmbienteStrokeColor('taller2', colorMap);
  const coreColor = colorMap['--color-secondary'] || '#7E6B57';
  const scale = Math.max(globalScale, 0.5);
  const ribbonMainWidth = Math.max(120 / scale, 58);
  const ribbonSoftWidth = Math.max(72 / scale, 34);
  const ringWidth = Math.max(1.8 / scale, 0.9);

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
}

const AMBIENTE_CENTERS = {
  taller1: { x: -320, y: 0, label: 'Taller 1' },
  taller2: { x: 320, y: 0, label: 'Taller 2' }
};
const AMBIENTE_RADIUS = 190;
const STAFF_ANCHOR = { x: 0, y: 200, strength: 0.08 };
const STAFF_ZONE = {
  minRadius: 24,
  maxRadius: 124,
  angleJitter: 0.85,
  radiusJitter: 0.2
};
const CHILD_AMBIENTE_STRENGTH = 0.06;
const AMBIENTE_BALANCE_STRENGTH = 0.3;
const ORPHAN_CHILD_DRIFT_STRENGTH = 0.05;
const SIMULATION_ALPHA_TARGET = 0.008;
const SIMULATION_ALPHA_TARGET_ACTIVE = 0.018;
const NOISE_JITTER = 0.01;
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
    .sort((a, b) => getNodeLabel(a).localeCompare(getNodeLabel(b), 'es'));

  const targets = new Map();
  const count = staffNodes.length;
  if (count === 0) return targets;

  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const radialSpan = Math.max(12, STAFF_ZONE.maxRadius - STAFF_ZONE.minRadius);
  const hashString = (value) => {
    const text = String(value || '');
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  };

  staffNodes.forEach((node, index) => {
    const ratio = count <= 1 ? 0.2 : index / (count - 1);
    const baseRadius = STAFF_ZONE.minRadius + Math.sqrt(ratio) * radialSpan;
    const seed = hashString(node.id);
    const angleNoise = ((seed % 1000) / 1000 - 0.5) * STAFF_ZONE.angleJitter;
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
      .sort((a, b) => getNodeLabel(a).localeCompare(getNodeLabel(b), 'es'));

    const radialSpan = Math.max(24, CHILD_ZONE.maxRadius - CHILD_ZONE.minRadius);

    ordered.forEach((node, index) => {
      const ratio = ordered.length <= 1 ? 0.22 : index / (ordered.length - 1);
      const radius = CHILD_ZONE.minRadius + Math.sqrt(ratio) * radialSpan;
      const angle = index * goldenAngle;

      targets.set(node.id, {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius
      });
    });
  });

  return targets;
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
  const graphRef = useRef(null);
  const cacheRef = useRef({});
  const containerRef = useRef(null);
  const mapCardRef = useRef(null);
  const hasInitialAutoCenteredRef = useRef(false);
  const roleTransitionTimerRef = useRef(null);

  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [graphFilters, setGraphFilters] = useState(INITIAL_GRAPH_FILTERS);
  const [selectedNode, setSelectedNode] = useState(null);
  const [imageRenderTick, setImageRenderTick] = useState(0);
  const [myProfile, setMyProfile] = useState({
    photoUrl: '',
    contact: { ...EMPTY_SOCIAL_CONTACT },
    contactVisibility: { ...EMPTY_SOCIAL_CONTACT_VISIBILITY }
  });
  const [familyChildren, setFamilyChildren] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 800, height: 560 });
  const [colorMap, setColorMap] = useState(() => buildAvatarColorMap());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [alphaTarget, setAlphaTarget] = useState(SIMULATION_ALPHA_TARGET);

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

  const updateDimensions = useCallback(() => {
    const width = containerRef.current?.clientWidth || 800;
    const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
    const fullscreenElement = typeof document !== 'undefined' ? document.fullscreenElement : null;
    const fullscreenActive = Boolean(fullscreenElement && mapCardRef.current === fullscreenElement);

    let nextHeight;
    if (fullscreenActive) {
      // En fullscreen usamos casi todo el alto visible; restamos un margen mÃ­nimo
      // para padding/controles, evitando bandas vacÃ­as debajo del canvas.
      nextHeight = Math.max(560, viewportHeight - 28);
    } else {
      const desktopHeight = Math.round(viewportHeight * 0.64);
      nextHeight = width < 900
        ? Math.max(460, Math.round(width * 0.72))
        : Math.max(560, desktopHeight);
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

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await socialService.getSocialGraphData();
      setGraphData(data);
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
  }, [loadFamilyChildren, loadGraph, loadMyProfile]);

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
    return new Set(
      graphData.nodes
      .filter((node) => isNodeVisibleByFilters(node, graphFilters))
      .filter((node) => {
        if (!query) return true;
        return getNodeLabel(node).toLowerCase().includes(query);
      })
      .map((node) => node.id)
    );
  }, [graphData.nodes, graphFilters, search]);

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

  useEffect(() => {
    if (!selectedNode) return;
    const stillVisible = visibleNodeIds.has(selectedNode.id);
    if (!stillVisible) {
      setSelectedNode(null);
    }
  }, [selectedNode, visibleNodeIds]);

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
      return node.ambiente ? 0.06 : 0.03;
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
      return node.ambiente ? 0.06 : 0.03;
    }));

    // La closure lee el ref en cada tick → sin jerk al cambiar filtros
    // Staff excluido: no queremos que su ambiente los arrastre a los círculos de taller
    fg.d3Force('ambienteBalance', createAmbienteBalanceForce(AMBIENTE_BALANCE_STRENGTH, (node) =>
      roleVisibleNodeIdsRef.current.has(node?.id) && node?.type === 'child'
    ));

    fg.d3Force('orphanChildDrift', createOrphanChildDriftForce(
      ORPHAN_CHILD_DRIFT_STRENGTH,
      (node) => roleVisibleNodeIdsRef.current.has(node?.id),
      (nodeId) => childHasFamilyLinkRef.current.get(nodeId) === true
    ));

    // Perturbación mínima continua para evitar que el sistema quede estático en equilibrio
    let noiseNodes = [];
    const noiseForce = () => {
      noiseNodes.forEach((node) => {
        if (!roleVisibleNodeIdsRef.current.has(node?.id)) return;
        if (node?.type === 'staff') return;
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
    hasInitialAutoCenteredRef.current = false;
  }, [graphData.links.length, graphData.nodes.length]);

  const onNodeClick = useCallback((node) => {
    setSelectedNode((previous) => {
      if (previous?.id === node.id) {
        return null;
      }
      if (graphRef.current) {
        graphRef.current.centerAt(node.x, node.y, 450);
        graphRef.current.zoom(1.65, 400);
      }
      return node;
    });
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

  useEffect(() => {
    if (loading || hasInitialAutoCenteredRef.current) return;
    if (visibleGraphData.nodes.length === 0) return;

    const timerId = setTimeout(() => {
      centerGraph(420, 130);
      hasInitialAutoCenteredRef.current = true;
    }, 80);

    return () => clearTimeout(timerId);
  }, [centerGraph, loading, visibleGraphData.nodes.length]);

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

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const label = getNodeLabel(node);
    const fillColor = getNodeFillColor(node, label, colorMap);
    const isChild = node.type === 'child';
    const radius = isChild ? 17 : 19;
    const cacheItem = cacheRef.current[node.id];
    const hasImage = cacheItem && cacheItem !== 'loading';
    const isSelected = selectedNode?.id === node.id;

    ctx.save();
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
      ctx.drawImage(cacheItem, node.x - radius, node.y - radius, radius * 2, radius * 2);
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
    ctx.lineWidth = isSelected ? 3 : 1.5;
    ctx.strokeStyle = isSelected ? '#111827' : '#ffffff';
    ctx.stroke();

    if (isSelected || globalScale > 1.25) {
      const fontSize = 11 / Math.max(globalScale, 1);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#111827';
      ctx.fillText(label, node.x, node.y + radius + 3);
    }
    ctx.restore();
  }, [colorMap, imageRenderTick, selectedNode?.id]);

  const panelTitle = isAdmin ? 'Vista previa del módulo Social' : 'Comunidad Social';
  const selectedContact = extractVisibleContact(selectedNode?.contact);
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
          <h1 className="dashboard-title">Social</h1>
          <p className="dashboard-subtitle">{panelTitle}</p>
        </div>
        <div className="social-page__meta">
          <span className="badge badge--info">{graphData.nodes.length} nodos</span>
          <span className="badge badge--secondary">{graphData.links.length} vínculos</span>
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
              <button
                type="button"
                className="btn btn--outline btn--sm"
                onClick={() => centerGraph(500, 140)}
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
              <aside className="card social-filters-card social-filters-card--overlay">
                <div className="card__header">
                  <h3 className="card__title">Filtros</h3>
                </div>
                <div className="card__body social-filters-card__body">
                  <div className="social-filters__group">
                    <label className={`social-filters__option ${graphFilters.showFamilies ? '' : 'is-muted'}`}>
                      <span className="social-filters__label">
                        <span className="social-filter-dot social-filter-dot--family"></span>
                        Familias
                      </span>
                      <input
                        type="checkbox"
                        checked={graphFilters.showFamilies}
                        onChange={() => toggleGraphFilter('showFamilies')}
                      />
                    </label>
                    <label className={`social-filters__option ${graphFilters.showStudents ? '' : 'is-muted'}`}>
                      <span className="social-filters__label">
                        <span className="social-filter-dot social-filter-dot--child"></span>
                        Alumnos
                      </span>
                      <input
                        type="checkbox"
                        checked={graphFilters.showStudents}
                        onChange={() => toggleGraphFilter('showStudents')}
                      />
                    </label>
                    <label className={`social-filters__option ${graphFilters.showStaff ? '' : 'is-muted'}`}>
                      <span className="social-filters__label">
                        <span className="social-filter-dot social-filter-dot--staff"></span>
                        Staff
                      </span>
                      <input
                        type="checkbox"
                        checked={graphFilters.showStaff}
                        onChange={() => toggleGraphFilter('showStaff')}
                      />
                    </label>
                  </div>

                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={resetGraphFilters}
                  >
                    Restablecer
                  </button>
                </div>
              </aside>

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
                  d3VelocityDecay={0.15}
                  d3AlphaDecay={0.01}
                  d3AlphaMin={0}
                  d3AlphaTarget={alphaTarget}
                  cooldownTime={Infinity}
                  linkColor={() => '#9CA3AF'}
                  linkWidth={(link) => (link.type === 'family-child' ? 1.9 : 1.2)}
                  nodeVisibility={(node) => visibleNodeIds.has(node.id)}
                  linkVisibility={(link) => {
                    const sourceId = getLinkNodeId(link.source);
                    const targetId = getLinkNodeId(link.target);
                    return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
                  }}
                  cooldownTicks={Infinity}
                  onNodeClick={onNodeClick}
                  onBackgroundClick={() => setSelectedNode(null)}
                  nodeCanvasObject={nodeCanvasObject}
                  onRenderFramePre={(ctx, globalScale) => {
                    drawUnifiedSocialBackground(ctx, globalScale, colorMap);
                    Object.entries(AMBIENTE_CENTERS).forEach(([ambiente, { x, label }]) => {
                      const ambienteColor = getAmbienteStrokeColor(ambiente, colorMap);
                      ctx.save();
                      ctx.globalAlpha = 0.92;
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
                    <div className="card__header social-node-sidebar__header">
                      <h3 className="card__title">Perfil seleccionado</h3>
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => setSelectedNode(null)}
                      >
                        Cerrar
                      </button>
                    </div>
                    <div className="card__body">
                      <div className="social-selected">
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

                        {selectedContact.length > 0 && (
                          <div className="social-selected__contact">
                            {selectedContact.map(([key, value]) => (
                              <div key={key} className="social-selected__contact-row">
                                <strong>{contactLabels[key] || key}</strong>
                                <span>{value}</span>
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

      <div className="social-page__profile-grid">
          <section className="card social-side-panel__card">
            <div className="card__header">
              <h3 className="card__title">Mi perfil social</h3>
            </div>
            <div className="card__body">
              <div className="social-editor__avatar">
                <Avatar
                  name={user?.displayName || user?.email || 'Perfil'}
                  photoUrl={myProfile.photoUrl}
                  size={56}
                />
                <label className="btn btn--outline btn--sm">
                  Cambiar foto
                  <input
                    type="file"
                    accept="image/*"
                    className="social-file-input"
                    onChange={handleUploadMyPhoto}
                    disabled={saving}
                  />
                </label>
              </div>

              {canEditFamilyContact && (
                <div className="social-editor__contact">
                  {CONTACT_FIELDS.map((field) => (
                    <div key={field.key} className="social-editor__field">
                      <label>{field.label}</label>
                      <input
                        type="text"
                        className="form-input"
                        value={myProfile.contact?.[field.key] || ''}
                        onChange={(event) => handleContactChange(field.key, event.target.value)}
                        placeholder={`Ingresar ${field.label.toLowerCase()}`}
                      />
                      <label className="social-editor__visibility">
                        <input
                          type="checkbox"
                          checked={Boolean(myProfile.contactVisibility?.[field.key])}
                          onChange={(event) => handleVisibilityChange(field.key, event.target.checked)}
                        />
                        Mostrar en Social
                      </label>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSaveMyProfile}
                disabled={saving}
              >
                Guardar perfil
              </button>
            </div>
          </section>

          {role === 'family' && (
            <section className="card social-side-panel__card">
              <div className="card__header">
                <h3 className="card__title">Fotos de alumnos</h3>
              </div>
              <div className="card__body">
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
                          Subir
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
            </section>
          )}
      </div>
    </div>
  );
}
