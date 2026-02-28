export interface Project {
  id: string;
  name: string;
  lastModified: number;
  layers: Layer[];
  duration: number; // in seconds
  fps: number;
}

export type LayerType = 'image' | 'character' | 'background' | 'audio' | 'text' | 'shape';

export interface Layer {
  id: string;
  type: LayerType;
  name: string;
  startTime: number;
  duration: number;
  zIndex: number;
  properties: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
    src?: string;
    content?: string;
    color?: string;
    fontSize?: number;
    fontFamily?: string;
    volume?: number;
  };
  keyframes: Keyframe[];
}

export interface Keyframe {
  time: number;
  properties: Partial<Layer['properties']>;
}

export const PREBUILT_ASSETS = {
  characters: [
    { id: 'god-1', name: 'Zeus', src: 'https://picsum.photos/seed/zeus/400/400' },
    { id: 'god-2', name: 'Athena', src: 'https://picsum.photos/seed/athena/400/400' },
    { id: 'god-3', name: 'Ares', src: 'https://picsum.photos/seed/ares/400/400' },
    { id: 'god-4', name: 'Hera', src: 'https://picsum.photos/seed/hera/400/400' },
    { id: 'god-5', name: 'Poseidon', src: 'https://picsum.photos/seed/poseidon/400/400' },
  ],
  backgrounds: [
    { id: 'bg-olympus', name: 'Mount Olympus', src: 'https://picsum.photos/seed/olympus/1920/1080' },
    { id: 'bg-temple', name: 'Ancient Temple', src: 'https://picsum.photos/seed/temple/1920/1080' },
    { id: 'bg-nebula', name: 'Cosmic Nebula', src: 'https://picsum.photos/seed/nebula/1920/1080' },
    { id: 'bg-cyber-temple', name: 'Cyber Temple', src: 'https://picsum.photos/seed/cybertemple/1920/1080' },
  ],
  props: [
    { id: 'prop-bolt', name: 'Lightning Bolt', src: 'https://picsum.photos/seed/bolt/200/200' },
    { id: 'prop-shield', name: 'Aegis Shield', src: 'https://picsum.photos/seed/shield/200/200' },
    { id: 'prop-trident', name: 'Trident', src: 'https://picsum.photos/seed/trident/200/200' },
  ]
};
