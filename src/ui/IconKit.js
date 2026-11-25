/**
 * Carnage Cruise - Kit d'Icônes Vectorielles SVG (lucide)
 * Remplace les émojis système hétérogènes par des icônes vectorielles nettes et stylisées.
 */

import {
  Camera,
  Crosshair,
  Flame,
  Gamepad2,
  Info,
  MapPin,
  Monitor,
  Music,
  Play,
  RotateCcw,
  Save,
  Settings,
  Shield,
  Smartphone,
  Sparkles,
  Trophy,
  User,
  Volume2,
  VolumeX,
  Wrench,
  Zap
} from 'lucide';

const ICON_DEFS = {
  camera: Camera,
  crosshair: Crosshair,
  flame: Flame,
  gamepad: Gamepad2,
  info: Info,
  mapPin: MapPin,
  monitor: Monitor,
  music: Music,
  play: Play,
  reset: RotateCcw,
  save: Save,
  settings: Settings,
  shield: Shield,
  vibrate: Smartphone,
  sparkles: Sparkles,
  trophy: Trophy,
  user: User,
  volumeOn: Volume2,
  volumeOff: VolumeX,
  wrench: Wrench,
  zap: Zap
};

function attrsToString(attrs = {}) {
  return Object.entries(attrs)
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
    .join(' ');
}

/**
 * Retourne un SVG inline net à partir des tracés vectoriels Lucide.
 */
export function iconSvg(name, size = 16, extraClass = '') {
  const nodes = ICON_DEFS[name];
  if (!nodes) return '';
  const body = nodes
    .map(([tag, attrs]) => `<${tag} ${attrsToString(attrs)} />`)
    .join('');
  return `<svg class="cc-ui-icon ${extraClass}" xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="vertical-align:-0.18em;flex-shrink:0;">${body}</svg>`;
}
