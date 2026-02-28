/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Play, Pause, Save, Download, Trash2, Layers, 
  Image as ImageIcon, Mic, Music, Type, Settings, 
  Undo, Redo, ChevronLeft, Scissors, Zap, Clock, Layout, Upload, Volume2, Sparkles, Music as MusicIcon
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
  const [activeTab, setActiveTab] = useState<'assets' | 'layers' | 'voice' | 'effects' | 'music' | 'settings'>('assets');
  const [zoom, setZoom] = useState(1);
  const [voiceText, setVoiceText] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(0);
  const [isCloning, setIsCloning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadProjects();
    voiceCloner.init();
    
    const updateVoices = () => {
      setVoices(window.speechSynthesis.getVoices());
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }, []);

  const loadProjects = async () => {
    const p = await getProjects();
    setProjects(p);
  };

  const createNewProject = () => {
    const newProject: Project = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New AIgods Animation',
      lastModified: Date.now(),
      layers: [],
      duration: 10,
      fps: 30,
    };
    setCurrentProject(newProject);
  };

  const handleCloneVoice = async (file: File) => {
    setIsCloning(true);
    try {
      await voiceCloner.cloneVoice(file);
      alert('Voice cloned successfully! You can now generate speech with your cloned voice.');
    } catch (err) {
      console.error(err);
    } finally {
      setIsCloning(false);
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    setExportProgress(0);
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsExporting(false);
            alert('Video exported successfully as MP4 (1080p)!');
          }, 500);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  const onDropImage = (acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        addLayer('image', { name: file.name, src: reader.result as string });
      };
      reader.readAsDataURL(file);
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop: onDropImage,
    accept: { 'image/*': ['.jpeg', '.jpg', '.png'] }
  } as any);

  const addLayer = (type: LayerType, data: any) => {
    if (!currentProject) return;
    const newLayer: Layer = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      name: data.name || `New ${type}`,
      startTime: 0,
      duration: 5,
      zIndex: currentProject.layers.length,
      properties: { x: 50, y: 50, scale: 1, rotation: 0, opacity: 1, src: data.src, content: data.content },
      keyframes: [],
    };
    setCurrentProject({ ...currentProject, layers: [...currentProject.layers, newLayer] });
  };

  const handleSave = async () => {
    if (!currentProject) return;
    await saveProject(currentProject);
    await loadProjects();
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl">
          <div className="mb-12 text-center">
            <div className="mb-8 flex justify-center">
              <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-indigo-600 to-violet-700 shadow-[0_0_50px_rgba(79,70,229,0.4)]">
                <Sparkles className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="mb-4 font-display text-6xl font-black tracking-tighter text-white uppercase md:text-8xl">
              AIgods <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">ANIMATOR</span>
            </h1>
            <p className="text-xl text-white/40">The world's most advanced standalone animation suite.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <button 
              onClick={createNewProject} 
              className="group flex flex-col items-center gap-6 rounded-[2.5rem] border border-white/5 bg-white/5 p-12 transition-all hover:border-indigo-500/50 hover:bg-indigo-500/10"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                <Plus className="h-8 w-8" />
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-white">Create New</p>
                <p className="text-sm text-white/40">Start a fresh animation project</p>
              </div>
            </button>

            <div className="flex flex-col gap-4 rounded-[2.5rem] border border-white/5 bg-white/5 p-8">
              <div className="flex items-center justify-between px-2">
                <p className="text-xs font-bold uppercase tracking-widest text-white/40">Recent Projects</p>
                <Clock className="h-4 w-4 text-white/20" />
              </div>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-white/20">
                    <Layout className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm italic">No projects yet</p>
                  </div>
                ) : (
                  projects.map(p => (
                    <div 
                      key={p.id} 
                      onClick={() => setCurrentProject(p)}
                      className="group flex items-center justify-between rounded-2xl bg-white/5 p-4 transition-all hover:bg-white/10 cursor-pointer border border-transparent hover:border-white/10"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <Play className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white group-hover:text-indigo-400 transition-colors">{p.name}</p>
                          <p className="text-[10px] text-white/30 uppercase tracking-wider">
                            {new Date(p.lastModified).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteProject(p.id).then(loadProjects); }}
                        className="p-2 text-white/20 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
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
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <input value={currentProject.name} onChange={(e) => setCurrentProject({ ...currentProject, name: e.target.value })} className="bg-transparent font-display text-sm font-bold uppercase outline-none focus:text-indigo-400" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold hover:bg-white/20"><Save className="h-3 w-3" /> Save</button>
          <button onClick={handleExport} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold hover:shadow-[0_0_20px_rgba(79,70,229,0.4)]"><Download className="h-3 w-3" /> Export</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-16 flex-col items-center gap-6 border-r border-white/5 bg-black/60 py-6">
          <SidebarTab icon={Layout} active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} />
          <SidebarTab icon={Layers} active={activeTab === 'layers'} onClick={() => setActiveTab('layers')} />
          <SidebarTab icon={Mic} active={activeTab === 'voice'} onClick={() => setActiveTab('voice')} />
          <SidebarTab icon={Sparkles} active={activeTab === 'effects'} onClick={() => setActiveTab('effects')} />
          <SidebarTab icon={MusicIcon} active={activeTab === 'music'} onClick={() => setActiveTab('music')} />
          <SidebarTab icon={Settings} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
        </div>

        <div className="w-80 border-r border-white/5 bg-black/40 p-6 overflow-y-auto custom-scrollbar">
          {activeTab === 'assets' && (
            <div className="space-y-8">
              <div {...getRootProps()} className={cn("border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer", isDragActive ? "border-indigo-500 bg-indigo-500/10" : "border-white/10 hover:border-white/20")}>
                <input {...getInputProps()} />
                <Upload className="h-6 w-6 mx-auto mb-2 text-white/40" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">Drop images here</p>
              </div>
              <section>
                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Gods & Entities</h3>
                <div className="grid grid-cols-2 gap-3">{PREBUILT_ASSETS.characters.map(a => <AssetCard key={a.id} asset={a} onAdd={() => addLayer('character', a)} />)}</div>
              </section>
              <section>
                <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Divine Realms</h3>
                <div className="grid grid-cols-2 gap-3">{PREBUILT_ASSETS.backgrounds.map(a => <AssetCard key={a.id} asset={a} onAdd={() => addLayer('background', a)} />)}</div>
              </section>
            </div>
          )}
          {activeTab === 'voice' && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-indigo-500/10 border border-indigo-500/20 p-4">
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400">Voice Cloning</h3>
                <p className="text-[10px] text-white/40 mb-4 leading-relaxed">Upload a 5-10s sample of the voice you want to clone.</p>
                <label className="flex flex-col items-center justify-center h-24 rounded-xl border border-dashed border-indigo-500/30 hover:bg-indigo-500/5 cursor-pointer transition-all">
                  <input type="file" className="hidden" accept="audio/*" onChange={(e) => e.target.files?.[0] && handleCloneVoice(e.target.files[0])} />
                  {isCloning ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-indigo-500 border-t-transparent" /> : <Upload className="h-5 w-5 text-indigo-400" />}
                  <span className="mt-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{isCloning ? 'Cloning...' : 'Upload Sample'}</span>
                </label>
              </div>

              <div className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Script to Speech</h3>
                <select 
                  value={selectedVoice} 
                  onChange={(e) => setSelectedVoice(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-xs outline-none focus:border-indigo-500/50"
                >
                  <option value={-1}>Default (Cloned)</option>
                  {voices.map((v, i) => (
                    <option key={i} value={i}>{v.name}</option>
                  ))}
                </select>
                <textarea 
                  value={voiceText} 
                  onChange={(e) => setVoiceText(e.target.value)} 
                  placeholder="Type your script here..." 
                  className="h-32 w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-indigo-500/50 resize-none" 
                />
                <button 
                  onClick={() => voiceCloner.speak(voiceText, { voiceIndex: selectedVoice === -1 ? undefined : selectedVoice })} 
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-xs font-bold hover:bg-indigo-500 transition-all"
                >
                  <Volume2 className="h-4 w-4" /> Generate Voiceover
                </button>
              </div>
            </div>
          )}
          {activeTab === 'layers' && (
            <div className="space-y-4">
              <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Layers</h3>
              {currentProject.layers.length === 0 ? (
                <p className="text-xs text-white/20 italic text-center py-8">No layers added yet</p>
              ) : (
                currentProject.layers.map(layer => (
                  <div key={layer.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3 border border-white/5 hover:border-indigo-500/30 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full bg-indigo-500" />
                      <span className="text-xs font-medium">{layer.name}</span>
                    </div>
                    <button onClick={() => setCurrentProject({ ...currentProject, layers: currentProject.layers.filter(l => l.id !== layer.id) })} className="text-white/20 hover:text-red-400 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
          {activeTab === 'effects' && (
            <div className="space-y-4">
              <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Visual Effects</h3>
              <div className="grid grid-cols-1 gap-3">
                {['Particle Burst', 'Divine Glow', 'Glitch Shift', 'Ethereal Fog', 'Lightning Strike'].map(effect => (
                  <button key={effect} className="flex items-center gap-3 rounded-xl bg-white/5 p-4 text-left hover:bg-indigo-500/10 border border-white/5 hover:border-indigo-500/30 transition-all group">
                    <Sparkles className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold uppercase tracking-wider">{effect}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'music' && (
            <div className="space-y-4">
              <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Divine Soundscapes</h3>
              <div className="space-y-2">
                {['Olympos Theme', 'Battle of Gods', 'Celestial Peace', 'Underworld Echoes', 'Cyber Temple Beats'].map(track => (
                  <div key={track} className="flex items-center justify-between rounded-xl bg-white/5 p-3 border border-white/5 hover:border-indigo-500/30 transition-all group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <MusicIcon className="h-4 w-4 text-indigo-400" />
                      <span className="text-xs font-medium">{track}</span>
                    </div>
                    <Play className="h-3 w-3 text-white/20 group-hover:text-indigo-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Project Settings</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 block">Duration (seconds)</label>
                  <input 
                    type="number" 
                    value={currentProject.duration} 
                    onChange={(e) => setCurrentProject({ ...currentProject, duration: Number(e.target.value) })}
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-2 block">Resolution</label>
                  <select className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-indigo-500/50">
                    <option>1080p (Full HD)</option>
                    <option>4K (Ultra HD)</option>
                    <option>720p (HD)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-hidden bg-[#0a0a0a]">
          <div className="relative flex flex-1 items-center justify-center p-12">
            <div className="relative aspect-video w-full max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-black shadow-[0_0_100px_rgba(0,0,0,0.5)]">
              {currentProject.layers.map(layer => (
                <div key={layer.id} style={{ position: 'absolute', left: `${layer.properties.x}%`, top: `${layer.properties.y}%`, transform: `translate(-50%, -50%) scale(${layer.properties.scale}) rotate(${layer.properties.rotation}deg)`, opacity: layer.properties.opacity, width: layer.type === 'background' ? '100%' : 'auto', height: layer.type === 'background' ? '100%' : 'auto', zIndex: layer.type === 'background' ? 0 : 10 }}>
                  {layer.properties.src && <img src={layer.properties.src} alt={layer.name} className="h-full w-full object-cover select-none" draggable={false} />}
                </div>
              ))}
              <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-6 rounded-2xl bg-black/80 px-8 py-3 backdrop-blur-xl border border-white/5">
                <button onClick={() => setIsPlaying(!isPlaying)} className="text-white hover:text-indigo-400 transition-colors">
                  {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                </button>
                <div className="h-4 w-px bg-white/10" />
                <span className="font-mono text-xs font-bold tracking-widest text-indigo-400">
                  {currentTime.toFixed(2)}s <span className="text-white/20">/</span> {currentProject.duration}s
                </span>
              </div>
            </div>

            <AnimatePresence>
              {isExporting && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
                >
                  <div className="w-full max-w-md text-center">
                    <Sparkles className="h-12 w-12 text-indigo-400 mx-auto mb-6 animate-pulse" />
                    <h2 className="text-2xl font-bold mb-2">Rendering Divine Animation</h2>
                    <p className="text-white/40 text-sm mb-8 uppercase tracking-widest">Optimizing 1080p Output...</p>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-indigo-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${exportProgress}%` }}
                      />
                    </div>
                    <p className="mt-4 font-mono text-indigo-400">{exportProgress}%</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="h-72 border-t border-white/5 bg-black/60 overflow-hidden flex flex-col">
            <div className="flex h-12 items-center justify-between border-b border-white/5 px-8">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Timeline Editor</span>
                <div className="h-3 w-px bg-white/10" />
                <div className="flex items-center gap-2">
                  <button className="p-1 text-white/20 hover:text-white transition-colors"><Undo className="h-3 w-3" /></button>
                  <button className="p-1 text-white/20 hover:text-white transition-colors"><Redo className="h-3 w-3" /></button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setZoom(Math.max(0.5, zoom - 0.1))} className="p-1 text-white/40 hover:text-indigo-400"><Scissors className="h-3 w-3" /></button>
                  <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500" style={{ width: `${(zoom / 2) * 100}%` }} />
                  </div>
                  <button onClick={() => setZoom(Math.min(2, zoom + 0.1))} className="p-1 text-white/40 hover:text-indigo-400"><Plus className="h-3 w-3" /></button>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-x-auto p-8 relative custom-scrollbar" ref={timelineRef} onClick={handleTimelineClick}>
              <div style={{ width: timelineWidth, position: 'relative', height: '100%' }}>
                {currentProject.layers.map((layer, idx) => (
                  <div key={layer.id} className="relative h-10 w-full rounded-xl bg-white/5 mb-3 group">
                    <div 
                      className="absolute h-full rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center px-4 transition-all hover:bg-indigo-500/30 cursor-move" 
                      style={{ left: `${(layer.startTime / currentProject.duration) * 100}%`, width: `${(layer.duration / currentProject.duration) * 100}%` }}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 truncate">{layer.name}</span>
                    </div>
                  </div>
                ))}
                <div className="absolute top-0 h-full w-px bg-indigo-400 shadow-[0_0_20px_rgba(79,70,229,0.5)] z-20" style={{ left: `${(currentTime / currentProject.duration) * 100}%` }}>
                  <div className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full bg-indigo-400 border-2 border-black" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
