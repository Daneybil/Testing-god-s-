/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Play, Pause, Save, Download, Trash2, Layers, 
  Image as ImageIcon, Mic, Music, Type, Settings, 
  Undo, Redo, ChevronLeft, Ghost, Scissors, Zap, Clock, Layout
} from 'lucide-react';
import * as anime from 'animejs';
import { useDropzone } from 'react-dropzone';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Project, Layer, PREBUILT_ASSETS, LayerType } from './types';
import { saveProject, getProjects, deleteProject } from './db';
import { voiceCloner } from './voice';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const SidebarTab = ({ icon: Icon, active, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "group relative flex h-12 w-12 items-center justify-center rounded-xl transition-all",
      active ? "bg-cyan-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]" : "text-white/20 hover:bg-white/5 hover:text-white"
    )}
  >
    <Icon className="h-6 w-6" />
  </button>
);

const AssetCard = ({ asset, onAdd }: any) => (
  <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-white/5 p-2 transition-all hover:border-cyan-500/30">
    <img src={asset.src} alt={asset.name} className="h-24 w-full rounded-lg object-cover" />
    <div className="mt-2 flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">{asset.name}</span>
      <button 
        onClick={() => onAdd(asset)}
        className="rounded-lg bg-cyan-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  </div>
);

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState<'assets' | 'layers' | 'voice' | 'settings'>('assets');
  const [zoom, setZoom] = useState(1);
  const [voiceText, setVoiceText] = useState('');
  
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProjects();
    voiceCloner.init();
  }, []);

  const loadProjects = async () => {
    const p = await getProjects();
    setProjects(p);
  };

  const createNewProject = () => {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Ghost Animation',
      lastModified: Date.now(),
      layers: [],
      duration: 10,
    };
    setCurrentProject(newProject);
  };

  const handleSave = async () => {
    if (!currentProject) return;
    await saveProject(currentProject);
    await loadProjects();
  };

  const addLayer = (type: LayerType, data: any) => {
    if (!currentProject) return;
    const newLayer: Layer = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      name: data.name || `New ${type}`,
      startTime: 0,
      duration: 5,
      properties: { x: 50, y: 50, scale: 1, rotation: 0, opacity: 1, src: data.src, content: data.content },
      keyframes: [],
    };
    setCurrentProject({ ...currentProject, layers: [...currentProject.layers, newLayer] });
  };

  const timelineWidth = useMemo(() => (currentProject?.duration || 10) * 100 * zoom, [currentProject?.duration, zoom]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const time = (x / timelineWidth) * (currentProject?.duration || 10);
    setCurrentTime(Math.max(0, Math.min(time, currentProject?.duration || 10)));
  };

  if (!currentProject) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#050505] p-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="mb-8 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              <Ghost className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="mb-4 font-display text-5xl font-black tracking-tighter text-white uppercase md:text-7xl">
            AI GHOST <span className="cyber-text">ANIMATOR</span>
          </h1>
          <p className="mb-12 text-lg text-white/40">Professional standalone animation suite.</p>
          <div className="grid gap-6 md:grid-cols-2">
            <button onClick={createNewProject} className="flex flex-col items-center gap-4 rounded-3xl border border-cyan-500/20 bg-cyan-500/5 p-8 transition-all hover:border-cyan-500/50 hover:bg-cyan-500/10">
              <Plus className="h-8 w-8 text-cyan-400" />
              <div className="text-left"><p className="font-bold text-white">New Project</p></div>
            </button>
            <div className="flex flex-col gap-4 rounded-3xl border border-white/5 bg-white/5 p-8">
              <p className="text-left text-xs font-bold uppercase tracking-widest text-white/40">Recent</p>
              {projects.map(p => (
                <div key={p.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                  <span className="text-sm">{p.name}</span>
                  <button onClick={() => setCurrentProject(p)} className="text-cyan-400"><Play className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#050505] text-white">
      <header className="flex h-16 items-center justify-between border-b border-white/5 bg-black/40 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentProject(null)} className="text-white/40 hover:text-white"><ChevronLeft className="h-5 w-5" /></button>
          <div className="flex items-center gap-2">
            <Ghost className="h-5 w-5 text-cyan-400" />
            <input value={currentProject.name} onChange={(e) => setCurrentProject({ ...currentProject, name: e.target.value })} className="bg-transparent font-display text-sm font-bold uppercase outline-none focus:text-cyan-400" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold hover:bg-white/20"><Save className="h-3 w-3" /> Save</button>
          <button className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]"><Download className="h-3 w-3" /> Export</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-16 flex-col items-center gap-6 border-r border-white/5 bg-black/60 py-6">
          <SidebarTab icon={Layout} active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} />
          <SidebarTab icon={Layers} active={activeTab === 'layers'} onClick={() => setActiveTab('layers')} />
          <SidebarTab icon={Mic} active={activeTab === 'voice'} onClick={() => setActiveTab('voice')} />
          <SidebarTab icon={Settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>

        <div className="w-80 border-r border-white/5 bg-black/40 p-6 overflow-y-auto">
          {activeTab === 'assets' && (
            <div className="space-y-8">
              <section>
                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Characters</h3>
                <div className="grid grid-cols-2 gap-3">{PREBUILT_ASSETS.characters.map(a => <AssetCard key={a.id} asset={a} onAdd={() => addLayer('character', a)} />)}</div>
              </section>
              <section>
                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Backgrounds</h3>
                <div className="grid grid-cols-2 gap-3">{PREBUILT_ASSETS.backgrounds.map(a => <AssetCard key={a.id} asset={a} onAdd={() => addLayer('background', a)} />)}</div>
              </section>
            </div>
          )}
          {activeTab === 'layers' && (
            <div className="space-y-4">
              <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Layers</h3>
              {currentProject.layers.map(layer => (
                <div key={layer.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
                  <span className="text-sm">{layer.name}</span>
                  <button onClick={() => setCurrentProject({ ...currentProject, layers: currentProject.layers.filter(l => l.id !== layer.id) })} className="text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'voice' && (
            <div className="space-y-6">
              <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Voice Cloning</h3>
              <textarea value={voiceText} onChange={(e) => setVoiceText(e.target.value)} placeholder="Script..." className="h-32 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-cyan-500/50" />
              <button onClick={() => voiceCloner.speak(voiceText)} className="w-full rounded-xl bg-cyan-500 py-3 text-xs font-bold">Generate</button>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-hidden bg-[#0a0a0a]">
          <div className="relative flex flex-1 items-center justify-center p-12">
            <div className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
              {currentProject.layers.map(layer => (
                <div key={layer.id} style={{ position: 'absolute', left: `${layer.properties.x}%`, top: `${layer.properties.y}%`, transform: `translate(-50%, -50%) scale(${layer.properties.scale}) rotate(${layer.properties.rotation}deg)`, opacity: layer.properties.opacity, width: layer.type === 'background' ? '100%' : 'auto', height: layer.type === 'background' ? '100%' : 'auto', zIndex: layer.type === 'background' ? 0 : 10 }}>
                  {layer.properties.src && <img src={layer.properties.src} alt={layer.name} className="h-full w-full object-cover" />}
                </div>
              ))}
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-4 rounded-full bg-black/60 px-6 py-2 backdrop-blur-md">
                <button onClick={() => setIsPlaying(!isPlaying)} className="text-white">{isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</button>
                <span className="font-mono text-[10px] text-white/60">{currentTime.toFixed(2)}s / {currentProject.duration}s</span>
              </div>
            </div>
          </div>

          <div className="h-64 border-t border-white/5 bg-black/60 overflow-hidden flex flex-col">
            <div className="flex h-10 items-center justify-between border-b border-white/5 px-6">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Timeline</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}><Scissors className="h-3 w-3 text-white/20" /></button>
                <button onClick={() => setZoom(Math.min(2, zoom + 0.1))}><Plus className="h-3 w-3 text-white/20" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-x-auto p-6 relative" ref={timelineRef} onClick={handleTimelineClick}>
              <div style={{ width: timelineWidth, position: 'relative', height: '100%' }}>
                {currentProject.layers.map(layer => (
                  <div key={layer.id} className="relative h-8 w-full rounded-lg bg-white/5 mb-2">
                    <div className="absolute h-full rounded-lg bg-cyan-500/40 border border-cyan-500/50" style={{ left: `${(layer.startTime / currentProject.duration) * 100}%`, width: `${(layer.duration / currentProject.duration) * 100}%` }}>
                      <span className="ml-2 flex h-full items-center text-[8px] font-bold">{layer.name}</span>
                    </div>
                  </div>
                ))}
                <div className="absolute top-0 h-full w-px bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.5)]" style={{ left: `${(currentTime / currentProject.duration) * 100}%` }}>
                  <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-cyan-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
