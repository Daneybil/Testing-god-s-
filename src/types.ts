export interface Project {
  id: string;
  name: string;
  lastModified: number;
  layers: Layer[];
  duration: number; // in seconds
}

export type LayerType = 'image' | 'character' | 'background' | 'audio' | 'text';

export interface Layer {
  id: string;
  type: LayerType;
  name: string;
  startTime: number;
  duration: number;
  properties: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
    opacity: number;
    src?: string;
    content?: string;
    color?: string;
  };
  keyframes: Keyframe[];
}

export interface Keyframe {
  time: number;
  properties: Partial<Layer['properties']>;
}

export const PREBUILT_ASSETS = {
  characters: [
    { id: 'ghost-1', name: 'Phantom', src: 'https://picsum.photos/seed/ghost1/200/200' },
    { id: 'ghost-2', name: 'Specter', src: 'https://picsum.photos/seed/ghost2/200/200' },
    { id: 'robot-1', name: 'CyberBot', src: 'https://picsum.photos/seed/robot1/200/200' },
  ],
  backgrounds: [
    { id: 'bg-cyber', name: 'Cyber City', src: 'https://picsum.photos/seed/cybercity/1920/1080' },
    { id: 'bg-void', name: 'The Void', src: 'https://picsum.photos/seed/void/1920/1080' },
  ],
  props: [
    { id: 'prop-fire', name: 'Neon Fire', src: 'https://picsum.photos/seed/fire/100/100' },
    { id: 'prop-glitch', name: 'Glitch Box', src: 'https://picsum.photos/seed/glitch/100/100' },
  ]
};
