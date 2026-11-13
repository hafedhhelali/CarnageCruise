/**
 * Carnage Cruise - Usine de Textures Procédurales Haute Définition (TextureFactory)
 * Génère des textures canvas riches, optimisées et mémoïsées pour métamorphoser
 * la qualité visuelle du jeu : asphalte texturé avec vibreurs de course, pavés parisiens,
 * façades haussmanniennes détaillées, devantures de commerces, ombres de contact et peaux cartoon.
 * Architecture Clean Code, Pattern Singleton & Zéro Fuite Mémoire.
 */

import * as THREE from 'three';

class TextureFactoryService {
  constructor() {
    this.cache = new Map();
    this.toonGradient = null;
  }

  // Palette cel-shading 4 bandes partagée par tous les MeshToonMaterial
  // (~1 seul fetch de texture 4x1, coût nul, modelé cartoon concerté)
  getToonGradientMap() {
    if (!this.toonGradient) {
      const data = new Uint8Array([42, 104, 178, 255]);
      const grad = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
      grad.minFilter = THREE.NearestFilter;
      grad.magFilter = THREE.NearestFilter;
      grad.needsUpdate = true;
      this.toonGradient = grad;
    }
    return this.toonGradient;
  }

  // Utilitaire interne de mise en cache
  getOrCreate(key, generatorFn) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    const canvas = document.createElement('canvas');
    generatorFn(canvas);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    // Filtrage anisotrope : l'asphalte, les pavés et les façades restent nets
    // dans les angles rasants propres à la caméra arcade basse (GPU clamp auto)
    texture.anisotropy = 8;
    
    this.cache.set(key, texture);
    return texture;
  }

  // 1. Asphalte urbain Next-Gen haute définition : grain bitumineux profond, traces de roulement,
  // caniveaux en granit biseautés, lignes de rive blanches et plots rétro-réfléchissants LED
  getRoadTexture() {
    return this.getOrCreate('road_asphalt_urban_v2', (canvas) => {
      canvas.width = 512;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');

      // Fond asphalte bitumineux anthracite profond et confortable
      ctx.fillStyle = '#1b1f27';
      ctx.fillRect(0, 0, 512, 1024);

      // Bruit minéral fin (granulats de basalte et quartz)
      const imgData = ctx.getImageData(0, 0, 512, 1024);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 18;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise + 1));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise + 3));
      }
      ctx.putImageData(imgData, 0, 0);

      // Bandes de roulement patinées par le trafic (2 voies principales)
      const laneGradL = ctx.createLinearGradient(60, 0, 220, 0);
      laneGradL.addColorStop(0, 'rgba(10, 13, 18, 0)');
      laneGradL.addColorStop(0.28, 'rgba(10, 13, 18, 0.42)');
      laneGradL.addColorStop(0.5, 'rgba(28, 34, 44, 0.15)');
      laneGradL.addColorStop(0.72, 'rgba(10, 13, 18, 0.42)');
      laneGradL.addColorStop(1, 'rgba(10, 13, 18, 0)');
      ctx.fillStyle = laneGradL;
      ctx.fillRect(60, 0, 160, 1024);

      const laneGradR = ctx.createLinearGradient(292, 0, 452, 0);
      laneGradR.addColorStop(0, 'rgba(10, 13, 18, 0)');
      laneGradR.addColorStop(0.28, 'rgba(10, 13, 18, 0.42)');
      laneGradR.addColorStop(0.5, 'rgba(28, 34, 44, 0.15)');
      laneGradR.addColorStop(0.72, 'rgba(10, 13, 18, 0.42)');
      laneGradR.addColorStop(1, 'rgba(10, 13, 18, 0)');
      ctx.fillStyle = laneGradR;
      ctx.fillRect(292, 0, 160, 1024);

      // Subtiles micro-fissures et raccords de bitume réalistes
      ctx.strokeStyle = 'rgba(10, 12, 16, 0.45)';
      ctx.lineWidth = 1.5;
      for (let c = 0; c < 6; c++) {
        let cx = 80 + (c * 65);
        ctx.beginPath();
        ctx.moveTo(cx, c * 160);
        for (let y = c * 160 + 30; y < c * 160 + 150; y += 30) {
          cx += (Math.random() - 0.5) * 14;
          ctx.lineTo(cx, y);
        }
        ctx.stroke();
      }

      // Caniveaux urbains en dalles de granit gris sombre sur les bords (gauche & droite)
      const gutterW = 24;
      ctx.fillStyle = '#2b313c';
      ctx.fillRect(0, 0, gutterW, 1024);
      ctx.fillRect(512 - gutterW, 0, gutterW, 1024);

      // Joints des dalles de caniveau et grilles d'évacuation pluviale
      ctx.strokeStyle = 'rgba(12, 15, 20, 0.65)';
      ctx.lineWidth = 2;
      for (let y = 0; y < 1024; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(gutterW, y);
        ctx.moveTo(512 - gutterW, y);
        ctx.lineTo(512, y);
        ctx.stroke();

        // Grille d'égout en fonte tous les 288px
        if (y % 288 === 0) {
          ctx.fillStyle = '#12151b';
          ctx.fillRect(3, y + 6, gutterW - 6, 32);
          ctx.fillRect(512 - gutterW + 3, y + 6, gutterW - 6, 32);
          ctx.fillStyle = '#384152';
          for (let gy = y + 10; gy < y + 34; gy += 6) {
            ctx.fillRect(5, gy, gutterW - 10, 2);
            ctx.fillRect(512 - gutterW + 5, gy, gutterW - 10, 2);
          }
        }
      }

      // Lignes de rive latérales blanches/ivoire continues avec liseré réfléchissant
      ctx.fillStyle = 'rgba(232, 238, 245, 0.88)';
      ctx.fillRect(gutterW + 4, 0, 7, 1024);
      ctx.fillRect(512 - gutterW - 11, 0, 7, 1024);

      // Plots rétro-réfléchissants LED cyber-cyan le long des rives
      for (let y = 32; y < 1024; y += 128) {
        ctx.fillStyle = '#00f2fe';
        ctx.fillRect(gutterW + 14, y, 4, 12);
        ctx.fillRect(512 - gutterW - 18, y, 4, 12);
      }
    });
  }

  // 1b. Dalle centrale de grand carrefour urbain (Box-Junction damier jaune/blanc, courbes de braquage & fonte)
  getIntersectionBoxTexture() {
    return this.getOrCreate('intersection_box_hd_v2', (canvas) => {
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      // Fond bitume d'intersection dense
      ctx.fillStyle = '#1d222b';
      ctx.fillRect(0, 0, 512, 512);

      // Grain minéral d'usure
      const imgData = ctx.getImageData(0, 0, 512, 512);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 16;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise + 2));
      }
      ctx.putImageData(imgData, 0, 0);

      // Traces courbes de pneumatiques dans le carrefour
      ctx.strokeStyle = 'rgba(10, 12, 16, 0.35)';
      ctx.lineWidth = 28;
      [[0, 0], [512, 0], [512, 512], [0, 512]].forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 210, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Marquage Box-Junction (Croisillons jaunes ambrés réglementaires au cœur du croisement)
      ctx.save();
      ctx.beginPath();
      ctx.rect(68, 68, 376, 376);
      ctx.clip();

      ctx.strokeStyle = 'rgba(243, 156, 18, 0.52)';
      ctx.lineWidth = 6;
      for (let d = -400; d <= 800; d += 56) {
        ctx.beginPath();
        ctx.moveTo(d, 68);
        ctx.lineTo(d + 376, 444);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(d + 376, 68);
        ctx.lineTo(d, 444);
        ctx.stroke();
      }
      ctx.restore();

      // Cadre périphérique du Box-Junction
      ctx.strokeStyle = 'rgba(243, 156, 18, 0.72)';
      ctx.lineWidth = 8;
      ctx.strokeRect(68, 68, 376, 376);

      // Double plaque d'égout centrale en fonte ciselée
      [196, 316].forEach(mx => {
        ctx.fillStyle = '#2d343e';
        ctx.beginPath();
        ctx.arc(mx, 256, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#11151c';
        ctx.lineWidth = 3;
        ctx.stroke();
      });
    });
  }

  // 1c. Plaque de rue émaillée haute lisibilité avec nom de l'artère
  getStreetPlateTexture(streetName = 'BD SAINT-GERMAIN') {
    const key = `street_plate_${streetName}`;
    return this.getOrCreate(key, (canvas) => {
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');

      // Fond bleu émail parisien profond
      const grad = ctx.createLinearGradient(0, 0, 0, 64);
      grad.addColorStop(0, '#0f2b66');
      grad.addColorStop(1, '#081a42');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 64);

      // Double filet blanc et cyan
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(4, 4, 248, 56);
      ctx.strokeStyle = '#00f2fe';
      ctx.lineWidth = 1;
      ctx.strokeRect(8, 8, 240, 48);

      ctx.fillStyle = '#ffffff';
      const fontSize = streetName.length > 20 ? 13 : (streetName.length > 16 ? 15 : 17);
      ctx.font = `900 ${fontSize}px "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(streetName, 128, 33);
    });
  }

  // 1d. Panneau de virage dynamique à chevrons fluorescents (<<< ou >>>)
  getCurveChevronTexture(dir = 1) {
    const key = `curve_chevron_${dir > 0 ? 'R' : 'L'}`;
    return this.getOrCreate(key, (canvas) => {
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');

      // Fond obsidienne haute visibilité
      ctx.fillStyle = '#0b101d';
      ctx.fillRect(0, 0, 256, 128);

      // Bordure néon or/cyan
      ctx.strokeStyle = '#ffd32a';
      ctx.lineWidth = 6;
      ctx.strokeRect(3, 3, 250, 122);

      // 3 Chevrons directionnels vifs
      ctx.fillStyle = '#ffd32a';
      const positions = [42, 118, 194];
      positions.forEach((px, idx) => {
        ctx.fillStyle = idx === 1 ? '#00f2fe' : '#ffd32a';
        ctx.beginPath();
        if (dir > 0) {
          // Virage à droite (>>>)
          ctx.moveTo(px - 22, 20);
          ctx.lineTo(px + 8, 20);
          ctx.lineTo(px + 34, 64);
          ctx.lineTo(px + 8, 108);
          ctx.lineTo(px - 22, 108);
          ctx.lineTo(px + 4, 64);
        } else {
          // Virage à gauche (<<<)
          ctx.moveTo(px + 22, 20);
          ctx.lineTo(px - 8, 20);
          ctx.lineTo(px - 34, 64);
          ctx.lineTo(px - 8, 108);
          ctx.lineTo(px + 22, 108);
          ctx.lineTo(px - 4, 64);
        }
        ctx.closePath();
        ctx.fill();
      });
    });
  }

  // 2. Trottoir en pavés parisiens biseautés avec joints de mortier
  getSidewalkTexture() {
    return this.getOrCreate('sidewalk_cobblestone_hd', (canvas) => {
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#9aa6b2';
      ctx.fillRect(0, 0, 512, 512);

      const rows = 16;
      const cols = 16;
      const pW = 512 / cols;
      const pH = 512 / rows;

      for (let r = 0; r < rows; r++) {
        const offset = (r % 2) * (pW / 2);
        for (let c = -1; c < cols + 1; c++) {
          const x = c * pW + offset;
          const y = r * pH;

          // Teinte de pavé granit avec variation naturelle douce
          const brightness = 168 + Math.floor((Math.random() - 0.5) * 28);
          ctx.fillStyle = `rgb(${brightness}, ${brightness - 3}, ${brightness - 8})`;
          ctx.fillRect(x + 2, y + 2, pW - 4, pH - 4);

          // Biseau lumineux (haut/gauche)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
          ctx.fillRect(x + 2, y + 2, pW - 4, 2);
          ctx.fillRect(x + 2, y + 2, 2, pH - 4);

          // Biseau ombre (bas/droite)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
          ctx.fillRect(x + 2, y + pH - 4, pW - 4, 2);
          ctx.fillRect(x + pW - 4, y + 2, 2, pH - 4);
        }
      }
    });
  }

  // 3. Façades Architecturales Haute Définition (4 Styles distincts sans toit doublonné dans la texture)
  getHaussmannFacadeTexture(baseColorHex = '#dfe4ea', roofColorHex = '#576574', styleVariant = 0) {
    const key = `facade_v2_${baseColorHex}_${roofColorHex}_${styleVariant % 4}`;
    return this.getOrCreate(key, (canvas) => {
      canvas.width = 512;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      const v = styleVariant % 4;

      // 1. Fond mural selon le style architectural
      ctx.fillStyle = baseColorHex;
      ctx.fillRect(0, 0, 512, 1024);

      if (v === 1) {
        // Style 1 : Immeuble Néo-Moderne & Verre Saphir / Pierre Claire
        const glassGrad = ctx.createLinearGradient(0, 0, 512, 1024);
        glassGrad.addColorStop(0, '#1e293b');
        glassGrad.addColorStop(0.5, '#0f172a');
        glassGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = glassGrad;
        ctx.fillRect(28, 60, 456, 790);

        // Piliers verticaux en pierre de taille
        ctx.fillStyle = baseColorHex;
        [0, 120, 244, 368, 484].forEach(px => ctx.fillRect(px, 0, 28, 880));
        // Bandeaux horizontaux avec liseré LED cyan
        [52, 210, 370, 530, 690, 845].forEach((py, idx) => {
          ctx.fillStyle = baseColorHex;
          ctx.fillRect(0, py, 512, 20);
          if (idx === 0 || idx === 5) {
            ctx.fillStyle = '#00f2fe';
            ctx.fillRect(16, py + 8, 480, 3);
          }
        });

        // Baies vitrées illuminées (bureaux & lofts)
        const floors = [82, 240, 400, 560, 720];
        const cols = [34, 154, 278, 402];
        floors.forEach((fy, fIdx) => {
          cols.forEach((wx, cIdx) => {
            const lit = ((fIdx * 3 + cIdx * 5) % 4) !== 0;
            ctx.fillStyle = lit ? (cIdx % 2 === 0 ? '#ffeaa7' : '#bae6fd') : '#0f172a';
            ctx.fillRect(wx, fy, 78, 118);
            // Reflet oblique
            ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
            ctx.fillRect(wx + 6, fy, 18, 118);
            // Meneaux aluminium
            ctx.strokeStyle = '#64748b';
            ctx.lineWidth = 3;
            ctx.strokeRect(wx, fy, 78, 118);
          });
        });
      } else if (v === 2) {
        // Style 2 : Architecture Patrimoniale Brique & Chaînages d'angle en Pierre
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.14)';
        ctx.lineWidth = 2;
        for (let y = 0; y < 880; y += 24) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(512, y);
          ctx.stroke();
        }
        // Chaînages d'angle en pierre blonde (Quoins)
        ctx.fillStyle = '#f5f6fa';
        for (let y = 40; y < 860; y += 48) {
          const wQ = (y / 48) % 2 === 0 ? 34 : 22;
          ctx.fillRect(0, y, wQ, 22);
          ctx.fillRect(512 - wQ, y, wQ, 22);
        }
      } else {
        // Style 0 & 3 : Pierre de taille Haussmannienne / Art-Déco avec joints de bossage
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.lineWidth = 2;
        for (let y = 0; y < 880; y += 28) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(512, y);
          ctx.stroke();
        }
      }

      // Corniche sommitale moulurée sous la toiture 3D
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, 512, 34);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.fillRect(0, 34, 512, 10);
      // Corbeaux sculptés sous la corniche
      ctx.fillStyle = '#cbd5e1';
      for (let cx = 16; cx < 512; cx += 32) {
        ctx.fillRect(cx, 12, 12, 22);
      }

      // Si Styles 0, 2 ou 3 : 5 niveaux de fenêtres architecturales richement détaillées
      if (v !== 1) {
        const floors = [70, 230, 390, 550, 710];
        const winCols = [46, 166, 286, 406];

        floors.forEach((fy, fIdx) => {
          const isNoble = (fIdx === 1 || fIdx === 3);
          if (isNoble) {
            // Corniche d'étage noble
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(0, fy + 114, 512, 12);
            // Garde-corps en fer forgé ouvragé
            ctx.fillStyle = '#1e272e';
            ctx.fillRect(0, fy + 86, 512, 28);
            ctx.fillStyle = v === 3 ? '#f1c40f' : '#475569';
            for (let gx = 8; gx < 512; gx += 14) {
              ctx.fillRect(gx, fy + 88, 4, 24);
            }
          }

          winCols.forEach((wx, cIdx) => {
            // Encadrement mouluré en pierre blanche
            ctx.fillStyle = '#f8fafc';
            ctx.fillRect(wx - 6, fy - 6, 70, 120);

            if (v === 3) {
              // Arche Art-Déco dorée au sommet
              ctx.fillStyle = '#f59e0b';
              ctx.fillRect(wx - 6, fy - 14, 70, 8);
            } else {
              // Fronton triangulaire classique
              ctx.beginPath();
              ctx.moveTo(wx - 10, fy - 6);
              ctx.lineTo(wx + 29, fy - 24);
              ctx.lineTo(wx + 68, fy - 6);
              ctx.closePath();
              ctx.fillStyle = '#cbd5e1';
              ctx.fill();
            }

            // Volets persiennes latéraux sur le style 2
            if (v === 2) {
              ctx.fillStyle = '#1e372f';
              ctx.fillRect(wx - 16, fy, 10, 110);
              ctx.fillRect(wx + 64, fy, 10, 110);
            }

            // Vitrage intérieur (alternance chaleureuse ambrée / bleu nuit profond)
            const isLit = ((wx + fy + v * 17) % 3) !== 0;
            ctx.fillStyle = isLit ? '#fde68a' : '#1e293b';
            ctx.fillRect(wx, fy, 58, 108);

            if (isLit) {
              // Lustre / halo intérieur et rideaux drapés
              ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
              ctx.fillRect(wx, fy, 14, 108);
              ctx.fillRect(wx + 44, fy, 14, 108);
            }

            // Croisillons de menuiserie
            ctx.fillStyle = '#f1f5f9';
            ctx.fillRect(wx + 27, fy, 4, 108);
            ctx.fillRect(wx, fy + 48, 58, 4);

            // Jardinière fleurie au bord de la fenêtre sur le style 2
            if (v === 2 && fIdx % 2 === 0) {
              ctx.fillStyle = '#c2410c';
              ctx.fillRect(wx + 4, fy + 98, 50, 12);
              ctx.fillStyle = '#ef4444';
              ctx.fillRect(wx + 8, fy + 92, 42, 8);
            }
          });
        });
      }

      // 4. Rez-de-chaussée : Devanture commerciale de prestige & Grande arche d'entrée
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 875, 512, 149);

      // Bandeau de séparation mouluré avec filet lumineux
      ctx.fillStyle = '#334155';
      ctx.fillRect(0, 870, 512, 14);
      ctx.fillStyle = v === 1 ? '#00f2fe' : '#fbbf24';
      ctx.fillRect(0, 882, 512, 3);

      // Pilastres en granit / bronze
      ctx.fillStyle = '#1e293b';
      [0, 238, 484].forEach(px => ctx.fillRect(px, 884, 28, 140));

      // Deux grandes vitrines éclairées chaleureuses
      [34, 272].forEach(sx => {
        const winGrad = ctx.createLinearGradient(sx, 900, sx, 1005);
        winGrad.addColorStop(0, '#fef08a');
        winGrad.addColorStop(1, '#f59e0b');
        ctx.fillStyle = winGrad;
        ctx.fillRect(sx, 900, 198, 104);

        // Silhouettes intérieures de vitrine
        ctx.fillStyle = 'rgba(15, 23, 42, 0.25)';
        ctx.fillRect(sx + 20, 945, 42, 59);
        ctx.fillRect(sx + 85, 935, 55, 69);

        // Reflet diagonal vitré
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.beginPath();
        ctx.moveTo(sx + 15, 1004);
        ctx.lineTo(sx + 65, 1004);
        ctx.lineTo(sx + 135, 900);
        ctx.lineTo(sx + 85, 900);
        ctx.closePath();
        ctx.fill();

        // Soubassement en marbre noir
        ctx.fillStyle = '#090d16';
        ctx.fillRect(sx, 1004, 198, 20);
      });
    });
  }

  // 4. Store banne rayé français pour bistrots et terrasses & Enseignes culturelles authentiques
  getStoreSignTexture(cityId = 'paris', index = 0) {
    const key = `storesign_${cityId}_${index % 10}`;
    return this.getOrCreate(key, (canvas) => {
      canvas.width = 256;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');

      // Identification de la culture régionale pour enseignes réalistes
      const c = (cityId || '').toLowerCase();
      let culture = 'france';
      if (['londres', 'dublin', 'newcastle'].includes(c)) culture = 'uk';
      else if (['reykjavik', 'oslo', 'stockholm', 'copenhague', 'helsinki'].includes(c)) culture = 'nordic';
      else if (['berlin', 'bonn', 'francfort', 'vienne', 'innsbruck', 'geneve', 'zurich'].includes(c)) culture = 'german';
      else if (['amsterdam'].includes(c)) culture = 'dutch';
      else if (['venise', 'milan', 'rome', 'napoli'].includes(c)) culture = 'italy';
      else if (['barcelone', 'saragosse', 'madrid', 'seville', 'lisbonne'].includes(c)) culture = 'iberia';
      else if (['tallinn', 'riga', 'vilnius', 'saint_petersbourg', 'moscou', 'minsk', 'kiev', 'varsovie', 'prague', 'bratislava', 'budapest', 'chisinau', 'bucarest', 'sofia'].includes(c)) culture = 'east';
      else if (['athenes', 'crete', 'nicosie', 'istanbul', 'ljubljana', 'zagreb', 'sarajevo', 'belgrade', 'podgorica', 'tirana', 'skopje'].includes(c)) culture = 'balkans';
      else if (['casablanca', 'alger', 'annaba', 'tunis', 'tripoli', 'benghazi', 'le_caire'].includes(c)) culture = 'north_africa';

      const cultureData = {
        france: {
          palettes: [
            ['#6b1426', '#4a0e1a'], // Bordeaux velours
            ['#1e372f', '#12251f'], // Vert empire bistrot
            ['#102b4e', '#0b1d35'], // Bleu marine République
            ['#4a235a', '#30163b']  // Prune prestige
          ],
          border: '#f1c40f',
          shops: ['BOULANGERIE-PÂTISSERIE', 'PHARMACIE CENTRALE', 'CAFÉ DES ARTISTES', 'BRASSERIE DU BOULEVARD', 'LIBRAIRIE ANCIENNE', 'BOUCHERIE TRADITION', 'CHOCOLATIER ARTISAN', 'FLEURISTE DE SAISON', 'TABAC PRESSE', 'FROMAGERIE DU COEUR']
        },
        uk: {
          palettes: [
            ['#004225', '#002817'], // British Racing Green
            ['#1b2a4a', '#0f172a'], // Royal Navy
            ['#5c1d24', '#3d1217'], // Heritage Crimson
            ['#3e2723', '#271714']  // Victorian Walnut
          ],
          border: '#ffd700',
          shops: ['THE ROYAL OAK PUB', 'QUEEN TEA ROOM', 'VINTAGE BOOKSHOP', 'OLD APOTHECARY', 'FISH & CHIPS', 'GENTLEMAN TAILOR', 'COFFEE ROASTER', 'FLOWER MARKET', 'BAKERY & SCONES', 'ANTIQUE DEALER']
        },
        nordic: {
          palettes: [
            ['#0f4c5c', '#092d37'], // Fjord Teal
            ['#2f3e46', '#1a2327'], // Birch Slate
            ['#b05a2f', '#783c1e'], // Nordic Ochre
            ['#354f52', '#203032']  // Pine Charcoal
          ],
          border: '#e0d5b5',
          shops: ['BAKARÍ & KAFFI', 'KONDITORI CENTRAL', 'APOTEK NORDIC', 'GAMLA BÓKABÚÐ', 'FISKMARKAÐUR', 'KAFFE & KANELBULLAR', 'SMØRREBRØD DELI', 'BLOMSTERHANDEL', 'ROASTERY & BEANS', 'NORDIC KNITS']
        },
        german: {
          palettes: [
            ['#1b3b6f', '#0f2344'], // Bavarian Navy
            ['#204028', '#142719'], // Schwarzwald Green
            ['#3b3028', '#251e19'], // Altstadt Walnut
            ['#7b241c', '#511812']  // Kaiser Ruby
          ],
          border: '#d4af37',
          shops: ['BÄCKEREI & KONDITOREI', 'RATHAUS APOTHEKE', 'GASTHOF ZUM ADLER', 'BUCHHANDLUNG', 'BIERGARTEN TRADITION', 'CAFÉ SACHERTORTE', 'UHRMACHER ATELIER', 'BLUMENHAUS', 'METZGEREI MEISTER', 'RÖSTEREI KAFFEE']
        },
        dutch: {
          palettes: [
            ['#c44512', '#8c2f0a'], // Dutch Amber
            ['#183059', '#0d1c35'], // Delft Blue
            ['#274735', '#172c20']  // Canal Green
          ],
          border: '#f5cd79',
          shops: ['BAKKERIJ DE KROON', 'KOFFIEHUIS CENTRAAL', 'APOTHEEK DE WAAG', 'OUDE BOEKHANDEL', 'BLOEMENMARKT', 'HOLLANDSE KAAS', 'STROOPWAFEL HUIS', 'PANCAKE BAKERY']
        },
        italy: {
          palettes: [
            ['#a03823', '#6f2617'], // Siena Terracotta
            ['#1e4620', '#132c14'], // Tuscan Cypress
            ['#2c2018', '#1a130e'], // Espresso Dark
            ['#1a365d', '#0f2038']  // Azzurro Notte
          ],
          border: '#ffd32a',
          shops: ['TRATTORIA DA MARCO', 'GELATERIA ARTIGIANALE', 'ANTICA FARMACIA', 'ESPRESSO BAR', 'PASTICCERIA SICILIANA', 'PIZZERIA NAPOLETANA', 'ENOTECA & VINI', 'LIBRERIA MODERNA', 'PANIFICIO STORICO', 'CAFFÈ DELLA PIAZZA']
        },
        iberia: {
          palettes: [
            ['#9c2828', '#6b1a1a'], // Sevilla Crimson
            ['#c28414', '#8a5c0b'], // Saffron Ochre
            ['#164478', '#0e2b4d'], // Azulejo Cobalt
            ['#24523b', '#163325']  // Andalusian Olive
          ],
          border: '#f6b93b',
          shops: ['TABERNA DE TAPAS', 'PANADERÍA Y DULCES', 'FARMACIA CENTRAL', 'PASTÉIS TRADICIONAIS', 'BODEGA HISTÓRICA', 'CERVECERÍA ARTESANA', 'CAFÉ CON LECHE', 'FLORISTERÍA DEL SOL', 'JAMONERÍA IBÉRICA', 'CHURRERÍA DE LA VILLA']
        },
        east: {
          palettes: [
            ['#1e3d59', '#112233'], // Danube Deep Blue
            ['#7a2021', '#4d1415'], // Bohemian Garnet
            ['#2b4736', '#18291f'], // Carpathian Pine
            ['#4a3728', '#2e2219']  // Amber Roast
          ],
          border: '#e5b869',
          shops: ['KÁVÁZÓ & CUKRÁSZDA', 'PEKÁRNA TRADICE', 'LÉKÁRNA APOTHEKE', 'PIVOVAR & HOSPODA', 'STARÉ KNIHKUPECTVÍ', 'KAFANA CENTRUM', 'PEKARA CENTRAL', 'APTEKA 24H', 'RESTAURACE U ZLATA', 'PRAŽÍRNA KÁVY']
        },
        balkans: {
          palettes: [
            ['#0d47a1', '#06285c'], // Aegean Cobalt
            ['#b25e15', '#7a3e0b'], // Terracotta Med
            ['#2d4030', '#1b261d']  // Olive Grove
          ],
          border: '#f5cd79',
          shops: ['TAVERNA ACROPOLIS', 'KAFENEIO TRADITION', 'BAKLAVA & KATAIFI', 'LOKANTA & MEZE', 'KAHVEHANE OTTOMAN', 'PEKARA BALKAN', 'FARMACIA AEGEAN', 'GRILL TRADITION', 'OLIVE OIL & WINE', 'CAFE DEL SOL']
        },
        north_africa: {
          palettes: [
            ['#b84a2d', '#7d301c'], // Sahara Terracotta
            ['#0b6e4f', '#064330'], // Emerald Palm
            ['#026873', '#013e45'], // Atlas Turquoise
            ['#8c501e', '#593212']  // Spice Amber
          ],
          border: '#ffd700',
          shops: ['CAFÉ MAURE TRADITION', 'PÂTISSERIE ORIENTALE', 'SOUK DES ÉPICES', 'HERBORISTERIE PHARMACIE', 'SALON DE THÉ À LA MENTHE', 'BOULANGERIE ARTISANALE', 'ARTISANAT DU CUIR', 'HUILES & ESSENCES', 'MARCHÉ DES DATTES', 'COMPTOIR DES SAVEURS']
        }
      };

      const cData = cultureData[culture] || cultureData.france;
      const pal = cData.palettes[index % cData.palettes.length];

      // Dégradé luxueux
      const grad = ctx.createLinearGradient(0, 0, 0, 64);
      grad.addColorStop(0, pal[0]);
      grad.addColorStop(1, pal[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 64);

      // Bordure ornée élégante
      ctx.strokeStyle = cData.border;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(3, 3, 250, 58);
      ctx.lineWidth = 1;
      ctx.strokeRect(6, 6, 244, 52);

      // Nom de boutique avec dimensionnement dynamique de police
      const name = cData.shops[index % cData.shops.length];
      let fontSize = 17;
      if (name.length > 22) fontSize = 13.5;
      else if (name.length > 18) fontSize = 15;
      else if (name.length > 14) fontSize = 16.5;

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${fontSize}px "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillText(name, 128, 32);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    });
  }

  getAwningTexture(primaryColor = '#e74c3c') {
    const key = `awning_${primaryColor}`;
    return this.getOrCreate(key, (canvas) => {
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      const stripeW = 32;
      for (let x = 0; x < 256; x += stripeW) {
        ctx.fillStyle = ((x / stripeW) % 2 === 0) ? primaryColor : '#ffffff';
        ctx.fillRect(x, 0, stripeW, 256);
      }

      // Ombrage de pliures de tissu réaliste
      const grad = ctx.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 256, 256);
    });
  }

  // 5. Disque d'ombre de contact douce au sol (Ground Contact Shadow Decal)
  // Élimine l'effet de flottaison géométrique et ancre solidement motos, piétons et véhicules
  getContactShadowTexture() {
    return this.getOrCreate('contact_shadow_soft', (canvas) => {
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');

      const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.75)');
      grad.addColorStop(0.45, 'rgba(0, 0, 0, 0.45)');
      grad.addColorStop(0.8, 'rgba(0, 0, 0, 0.15)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    });
  }

  // 6. Fibre de carbone haute précision pour bolides de course
  getCarbonFiberTexture() {
    return this.getOrCreate('carbon_fiber_weave', (canvas) => {
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#151515';
      ctx.fillRect(0, 0, 64, 64);

      ctx.fillStyle = '#262626';
      for (let x = 0; x < 64; x += 16) {
        for (let y = 0; y < 64; y += 16) {
          ctx.fillRect(x, y, 8, 8);
          ctx.fillRect(x + 8, y + 8, 8, 8);
        }
      }

      ctx.fillStyle = '#3a3a3a';
      for (let x = 0; x < 64; x += 8) {
        ctx.fillRect(x, x % 16 === 0 ? 0 : 8, 4, 4);
      }
    });
  }

  // 7. Visage cartoon expressif HD (Yeux vivants, pupilles réfléchissantes, joues rosées)
  getCartoonFaceTexture(category = 'man', isPanic = false) {
    const key = `face_${category}_${isPanic ? 'panic' : 'normal'}`;
    return this.getOrCreate(key, (canvas) => {
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');

      // Teint de peau
      ctx.fillStyle = '#ffeaa7';
      ctx.fillRect(0, 0, 256, 256);

      // Joues rosées cartoon
      ctx.fillStyle = 'rgba(255, 107, 129, 0.35)';
      ctx.beginPath();
      ctx.arc(50, 160, 28, 0, Math.PI * 2);
      ctx.arc(206, 160, 28, 0, Math.PI * 2);
      ctx.fill();

      // Yeux cartoon expressifs
      const eyeY = 110;
      const eyeR = isPanic ? 42 : 34;

      // Blanc de l'œil
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(75, eyeY, eyeR, 0, Math.PI * 2);
      ctx.arc(181, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#2d3436';
      ctx.stroke();

      // Pupille noire
      const pupR = isPanic ? 16 : 20;
      ctx.fillStyle = '#111111';
      ctx.beginPath();
      ctx.arc(isPanic ? 70 : 75, eyeY, pupR, 0, Math.PI * 2);
      ctx.arc(isPanic ? 176 : 181, eyeY, pupR, 0, Math.PI * 2);
      ctx.fill();

      // Reflets de lumière dans les yeux
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(isPanic ? 66 : 70, eyeY - 6, 7, 0, Math.PI * 2);
      ctx.arc(isPanic ? 172 : 176, eyeY - 6, 7, 0, Math.PI * 2);
      ctx.arc(isPanic ? 74 : 78, eyeY + 4, 3, 0, Math.PI * 2);
      ctx.arc(isPanic ? 180 : 184, eyeY + 4, 3, 0, Math.PI * 2);
      ctx.fill();

      // Sourcils
      ctx.lineWidth = 7;
      ctx.strokeStyle = '#2f3640';
      ctx.lineCap = 'round';
      ctx.beginPath();
      if (isPanic) {
        // Sourcils relevés au centre (terreur comique)
        ctx.moveTo(40, 68);
        ctx.quadraticCurveTo(80, 48, 110, 62);
        ctx.moveTo(216, 68);
        ctx.quadraticCurveTo(176, 48, 146, 62);
      } else {
        // Sourcils décontractés
        ctx.moveTo(45, 62);
        ctx.quadraticCurveTo(80, 52, 105, 60);
        ctx.moveTo(211, 62);
        ctx.quadraticCurveTo(176, 52, 151, 60);
      }
      ctx.stroke();

      // Bouche
      if (isPanic) {
        // Bouche béante en "O" de cri hystérique
        ctx.fillStyle = '#8b0000';
        ctx.beginPath();
        ctx.ellipse(128, 195, 30, 42, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#2d3436';
        ctx.stroke();
        // Langue rose
        ctx.fillStyle = '#ff6b81';
        ctx.beginPath();
        ctx.arc(128, 222, 16, Math.PI, 0);
        ctx.fill();
      } else {
        // Sourire serein
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#2d3436';
        ctx.beginPath();
        ctx.arc(128, 180, 24, 0.2, Math.PI - 0.2);
        ctx.stroke();
      }
    });
  }

  // Nettoyage complet
  clear() {
    this.cache.forEach(texture => texture.dispose());
    this.cache.clear();
  }
}

export const textureFactory = new TextureFactoryService();
