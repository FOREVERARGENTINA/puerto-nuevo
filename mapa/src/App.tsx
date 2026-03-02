/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';
import { motion, AnimatePresence } from 'motion/react';
import * as d3 from 'd3-force-3d';
import { 
  Search, 
  User, 
  Users, 
  GraduationCap, 
  X, 
  Maximize2, 
  Phone, 
  Mail, 
  ChevronRight,
  Info,
  School
} from 'lucide-react';
import { mockData } from './data';
import { Person, Role, Relationship, Classroom } from './types';

// --- Constants ---

const ROLE_COLORS: Record<Role, string> = {
  docente: '#A5D8FF', // Pastel Blue
  padre: '#B2F2BB',   // Pastel Green
  alumno: '#FFEC99',  // Pastel Amber
};

const ROLE_LABELS: Record<Role, string> = {
  docente: 'Docente',
  padre: 'Padre',
  alumno: 'Alumno',
};

const CLASSROOM_CENTERS: Record<Classroom, { x: number, y: number }> = {
  'Taller 1': { x: -250, y: 0 },
  'Taller 2': { x: 250, y: 0 },
};

export default function App() {
  const fgRef = useRef<ForceGraphMethods>();
  const [selectedNode, setSelectedNode] = useState<Person | null>(null);
  const [hoverNode, setHoverNode] = useState<Person | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(['docente', 'padre', 'alumno']);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [imgCache, setImgCache] = useState<Record<string, HTMLImageElement>>({});

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Pre-load images
  useEffect(() => {
    mockData.nodes.forEach(node => {
      if (!imgCache[node.id]) {
        const img = new Image();
        img.src = node.photo;
        img.onload = () => {
          setImgCache(prev => ({ ...prev, [node.id]: img }));
        };
      }
    });
  }, []);

  // Filter data
  const filteredData = useMemo(() => {
    let nodes = mockData.nodes;
    
    if (selectedRoles.length < 3) {
      nodes = nodes.filter(n => n.roles.some(r => selectedRoles.includes(r)));
    }
    
    if (searchQuery) {
      nodes = nodes.filter(n => n.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    const nodeIds = new Set(nodes.map(n => n.id));
    const links = mockData.links.filter(l => 
      nodeIds.has(typeof l.source === 'string' ? l.source : (l.source as any).id) && 
      nodeIds.has(typeof l.target === 'string' ? l.target : (l.target as any).id)
    );

    return { nodes, links };
  }, [searchQuery, selectedRoles]);

  // Effect A: Structural forces – reheat solo cuando cambian nodos/links
  useEffect(() => {
    if (!fgRef.current) return;
    const fg = fgRef.current;

    fg.d3Force('classroomX', d3.forceX((d: any) => {
      const isStudent = d.roles.includes('alumno');
      const isTeacher = d.roles.includes('docente');
      if ((isStudent || isTeacher) && d.classroom) {
        return CLASSROOM_CENTERS[d.classroom as Classroom].x;
      }
      return 0;
    }).strength((d: any) => {
      const isStudent = d.roles.includes('alumno');
      const isTeacher = d.roles.includes('docente');
      return (isStudent || isTeacher) ? 0.01 : 0.002;
    }));

    fg.d3Force('classroomY', d3.forceY((d: any) => {
      const isStudent = d.roles.includes('alumno');
      const isTeacher = d.roles.includes('docente');
      if ((isStudent || isTeacher) && d.classroom) {
        return CLASSROOM_CENTERS[d.classroom as Classroom].y;
      }
      return 0;
    }).strength((d: any) => {
      const isStudent = d.roles.includes('alumno');
      const isTeacher = d.roles.includes('docente');
      return (isStudent || isTeacher) ? 0.01 : 0.002;
    }));

    // Menos repulsión en padres/alumnos para que el núcleo familiar quede compacto
    fg.d3Force('charge', d3.forceManyBody().strength((d: any) => {
      if (d.roles.includes('padre')) return -15;
      if (d.roles.includes('alumno')) return -20;
      return -30;
    }));

    // Distancia de link: familia muy cerca
    fg.d3Force('link')?.distance((link: any) => {
      if (link.type === 'padre-hijo') return 35;
      if (link.type === 'docente-alumno') return 65;
      return 80;
    });

    fg.d3ReheatSimulation();
  }, [filteredData]);

  // Effect B: Fuerza de link – sin reheat para evitar el tirón brusco
  useEffect(() => {
    if (!fgRef.current) return;
    const fg = fgRef.current;
    const isDocenteActive = selectedRoles.includes('docente');

    fg.d3Force('link')?.strength((link: any) => {
      const source = link.source as any;
      const target = link.target as any;
      if (source.classroom && target.classroom && source.classroom !== target.classroom) {
        return 0.001;
      }
      if (isDocenteActive && link.type === 'docente-alumno') return 0.4;
      if (link.type === 'padre-hijo') return 0.3;
      return 0.05;
    });
  }, [selectedRoles, filteredData]);

  const handleNodeClick = useCallback((node: any) => {
    setSelectedNode(node as Person);
    fgRef.current?.centerAt(node.x, node.y, 400);
    fgRef.current?.zoom(2, 400);
  }, []);

  const handleCenter = () => {
    fgRef.current?.zoomToFit(400, 100);
  };

  const getRelatedNodes = (personId: string) => {
    const relatedIds = new Set<string>();
    mockData.links.forEach(link => {
      const sourceId = typeof link.source === 'string' ? link.source : (link.source as any).id;
      const targetId = typeof link.target === 'string' ? link.target : (link.target as any).id;
      
      if (sourceId === personId) relatedIds.add(targetId);
      if (targetId === personId) relatedIds.add(sourceId);
    });
    return mockData.nodes.filter(n => relatedIds.has(n.id));
  };

  return (
    <div className="relative w-full h-screen bg-[#0f172a] overflow-hidden font-sans text-slate-200">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-radial-gradient from-slate-800 to-[#0f172a] opacity-50 pointer-events-none" />

      {/* Header / Controls */}
      <div className="absolute top-6 left-6 z-20 flex flex-col gap-4 w-80">
        <div className="bg-slate-900/60 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/10">
          <h1 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
            <Users className="w-6 h-6 text-blue-400" />
            Mapa Vivo del Campus
          </h1>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text"
              placeholder="Buscar persona..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-white/5 rounded-xl focus:ring-2 focus:ring-blue-500/50 transition-all outline-none text-sm text-white placeholder:text-slate-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedRoles(['docente', 'padre', 'alumno'])}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedRoles.length === 3 
                  ? 'bg-white text-slate-900 shadow-lg' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Todos
            </button>
            {(['docente', 'padre', 'alumno'] as Role[]).map((role) => (
              <button
                key={role}
                onClick={() => {
                  if (selectedRoles.includes(role)) {
                    if (selectedRoles.length > 1) {
                      setSelectedRoles(selectedRoles.filter(r => r !== role));
                    }
                  } else {
                    setSelectedRoles([...selectedRoles, role]);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedRoles.includes(role) && selectedRoles.length < 3
                    ? 'bg-white text-slate-900 shadow-lg' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {ROLE_LABELS[role]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleCenter}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 backdrop-blur-xl rounded-xl shadow-lg border border-white/10 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-all"
          >
            <Maximize2 className="w-4 h-4" />
            Re-centrar Grafo
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-6 left-6 z-20 bg-slate-900/60 backdrop-blur-xl p-4 rounded-2xl shadow-xl border border-white/10">
        <div className="flex flex-col gap-2">
          {Object.entries(ROLE_COLORS).map(([role, color]) => (
            <div key={role} className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-xs font-medium text-slate-400">{ROLE_LABELS[role as Role]}</span>
            </div>
          ))}
          <div className="h-px bg-white/5 my-1" />
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full border border-dashed border-slate-600" />
            <span className="text-xs font-medium text-slate-400">Área de Aula</span>
          </div>
        </div>
      </div>

      {/* Graph Canvas */}
      <div className="w-full h-full cursor-grab active:cursor-grabbing">
        <ForceGraph2D
          ref={fgRef}
          graphData={filteredData}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor="transparent"
          nodeRelSize={8}
          onRenderFramePre={(ctx, globalScale) => {
            // Draw Classroom Areas in background
            Object.entries(CLASSROOM_CENTERS).forEach(([name, center]) => {
              ctx.save();
              ctx.beginPath();
              ctx.arc(center.x, center.y, 180, 0, 2 * Math.PI);
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
              ctx.setLineDash([10, 5]);
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
              
              // Draw Label
              ctx.font = `${24 / globalScale}px Inter`;
              ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
              ctx.textAlign = 'center';
              ctx.fillText(name.toUpperCase(), center.x, center.y - 200);
              ctx.restore();
            });
          }}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const size = 10;
            const label = node.name;
            const fontSize = 12 / globalScale;
            
            // Primary color from first role
            const primaryRole = node.roles[0];
            const color = ROLE_COLORS[primaryRole as Role] || '#ccc';
            
            // Draw circle background/border
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
            ctx.fillStyle = color;
            ctx.fill();

            // If multiple roles, draw a secondary ring or arc
            if (node.roles.length > 1) {
              const secondaryColor = ROLE_COLORS[node.roles[1] as Role];
              ctx.beginPath();
              ctx.arc(node.x, node.y, size, -Math.PI / 2, Math.PI / 2, false);
              ctx.lineTo(node.x, node.y);
              ctx.fillStyle = secondaryColor;
              ctx.fill();
            }

            // Draw image if cached
            const img = imgCache[node.id];
            if (img) {
              ctx.save();
              ctx.beginPath();
              ctx.arc(node.x, node.y, size - 1.5, 0, 2 * Math.PI, false);
              ctx.clip();
              ctx.drawImage(img, node.x - size, node.y - size, size * 2, size * 2);
              ctx.restore();
            }

            // Highlight if hovered or selected
            if (hoverNode?.id === node.id || selectedNode?.id === node.id) {
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
              
              ctx.beginPath();
              ctx.arc(node.x, node.y, size + 2, 0, 2 * Math.PI, false);
              ctx.strokeStyle = color;
              ctx.lineWidth = 1 / globalScale;
              ctx.stroke();
            }

            // Draw label
            ctx.font = `${fontSize}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fillText(label, node.x, node.y + size + 8);

            // Draw classroom badge if student
            if (node.roles.includes('alumno') && node.classroom) {
              ctx.font = `bold ${8 / globalScale}px Inter`;
              ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
              ctx.fillText(node.classroom === 'Taller 1' ? 'T1' : 'T2', node.x, node.y);
            }
          }}
          linkColor={() => 'rgba(255, 255, 255, 0.1)'}
          linkWidth={1.5}
          onNodeClick={handleNodeClick}
          onNodeHover={(node) => setHoverNode(node as Person)}
          cooldownTicks={400}
          d3AlphaDecay={0.01}
          d3VelocityDecay={0.3}
        />
      </div>

      {/* Profile Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 h-full w-96 bg-slate-900/90 backdrop-blur-2xl shadow-2xl z-30 border-l border-white/10 flex flex-col text-slate-200"
          >
            <div className="p-6 flex-1 overflow-y-auto">
              <button 
                onClick={() => setSelectedNode(null)}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-all"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>

              <div className="flex flex-col items-center text-center mt-8 mb-8">
                <div className="relative">
                  <img 
                    src={selectedNode.photo} 
                    alt={selectedNode.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-slate-800 shadow-2xl"
                    referrerPolicy="no-referrer"
                  />
                  <div 
                    className="absolute bottom-1 right-1 w-8 h-8 rounded-full border-4 border-slate-800 shadow-md flex items-center justify-center"
                    style={{ backgroundColor: ROLE_COLORS[selectedNode.roles[0]] }}
                  >
                    {selectedNode.roles.includes('docente') && <GraduationCap className="w-4 h-4 text-slate-900" />}
                    {!selectedNode.roles.includes('docente') && selectedNode.roles.includes('padre') && <Users className="w-4 h-4 text-slate-900" />}
                    {!selectedNode.roles.includes('docente') && !selectedNode.roles.includes('padre') && selectedNode.roles.includes('alumno') && <User className="w-4 h-4 text-slate-900" />}
                  </div>
                </div>
                <h2 className="text-2xl font-bold mt-4 text-white">{selectedNode.name}</h2>
                <div className="flex flex-col items-center gap-2 mt-2">
                  <div className="flex gap-1">
                    {selectedNode.roles.map(role => (
                      <span 
                        key={role}
                        className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-slate-900"
                        style={{ backgroundColor: ROLE_COLORS[role] }}
                      >
                        {ROLE_LABELS[role]}
                      </span>
                    ))}
                  </div>
                  {selectedNode.classroom && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 bg-white/5 px-2 py-1 rounded-md">
                      <School className="w-3 h-3" />
                      {selectedNode.classroom}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Contacto
                  </h3>
                  {selectedNode.phone && (
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                      <Phone className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium">{selectedNode.phone}</span>
                    </div>
                  )}
                  {selectedNode.email && (
                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                      <Mail className="w-4 h-4 text-slate-500" />
                      <span className="text-sm font-medium">{selectedNode.email}</span>
                    </div>
                  )}
                  {!selectedNode.phone && !selectedNode.email && (
                    <p className="text-sm text-slate-500 italic">No hay información de contacto disponible.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Relaciones</h3>
                  <div className="space-y-2">
                    {getRelatedNodes(selectedNode.id).map((related) => (
                      <button
                        key={related.id}
                        onClick={() => handleNodeClick(related)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-all group border border-transparent hover:border-white/5"
                      >
                        <img 
                          src={related.photo} 
                          alt={related.name}
                          className="w-10 h-10 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="flex-1 text-left">
                          <p className="text-sm font-semibold text-white">{related.name}</p>
                          <p className="text-xs text-slate-500">{related.roles.map(r => ROLE_LABELS[r]).join(', ')}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-white/5 bg-black/20">
              <p className="text-[10px] text-slate-600 text-center uppercase tracking-widest font-bold">
                Campus Vivo • Sistema de Gestión Social
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
