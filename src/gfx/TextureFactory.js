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

  // 1. Asphalte de course haute définition avec grain minéral, traces d'usure et vibreurs latéraux
  getRoadTexture() {
    return this.getOrCreate('road_asphalt_hd', (canvas) => {
      canvas.width = 512;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');

      // Fond asphalte bitumineux sombre
      ctx.fillStyle = '#212429';
      ctx.fillRect(0, 0, 512, 1024);

      // Bruit minéral (granulats d'asphalte)
      const imgData = ctx.getImageData(0, 0, 512, 1024);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 22;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise + 2));
      }
      ctx.putImageData(imgData, 0, 0);

      // Bandes de roulement usées par les pneus (traces plus sombres et lisses)
      ctx.fillStyle = 'rgba(15, 17, 21, 0.45)';
      ctx.fillRect(95, 0, 110, 1024);
      ctx.fillRect(305, 0, 110, 1024);

      // Vibreurs de course latéraux bicolores (Rouge vif & Blanc pur) sur les bordures
      const kerbWidth = 32;
      const kerbSegmentH = 64;
      for (let y = 0; y < 1024; y += kerbSegmentH) {
        const isRed = (y / kerbSegmentH) % 2 === 0;
        ctx.fillStyle = isRed ? '#e74c3c' : '#ffffff';
        // Bord gauche
        ctx.fillRect(0, y, kerbWidth, kerbSegmentH);
        // Bord droit
        ctx.fillRect(512 - kerbWidth, y, kerbWidth, kerbSegmentH);

        // Ombrage biseauté du vibreur
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(kerbWidth - 4, y, 4, kerbSegmentH);
        ctx.fillRect(512 - kerbWidth, y, 4, kerbSegmentH);
      }

      // Lignes de séparation de voie blanches continues le long des vibreurs
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(kerbWidth + 4, 0, 6, 1024);
      ctx.fillRect(512 - kerbWidth - 10, 0, 6, 1024);
    });
  }

  // 2. Trottoir en pavés parisiens biseautés avec joints de mortier
  getSidewalkTexture() {
    return this.getOrCreate('sidewalk_cobblestone_hd', (canvas) => {
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#b2bec3';
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

          // Teinte de pavé avec légère variation naturelle
          const brightness = 190 + Math.floor((Math.random() - 0.5) * 35);
          ctx.fillStyle = `rgb(${brightness}, ${brightness - 5}, ${brightness - 12})`;
          ctx.fillRect(x + 2, y + 2, pW - 4, pH - 4);

          // Biseau lumineux (haut/gauche)
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fillRect(x + 2, y + 2, pW - 4, 2);
          ctx.fillRect(x + 2, y + 2, 2, pH - 4);

          // Biseau ombre (bas/droite)
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.fillRect(x + 2, y + pH - 4, pW - 4, 2);
          ctx.fillRect(x + pW - 4, y + 2, 2, pH - 4);
        }
      }
    });
  }

  // 3. Façade Haussmannienne en pierre de taille, corniches et fenêtres rétroéclairées
  getHaussmannFacadeTexture(baseColorHex = '#dfe4ea', roofColorHex = '#576574') {
    const key = `haussmann_${baseColorHex}_${roofColorHex}`;
    return this.getOrCreate(key, (canvas) => {
      canvas.width = 512;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');

      // 1. Fond pierre de taille
      ctx.fillStyle = baseColorHex;
      ctx.fillRect(0, 0, 512, 1024);

      // Lignes de refend horizontales (bossage français)
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.lineWidth = 2;
      for (let y = 0; y < 1024; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(512, y);
        ctx.stroke();
      }

      // 2. Toiture en zinc supérieure
      ctx.fillStyle = roofColorHex;
      ctx.fillRect(0, 0, 512, 180);
      // Lucarnes mansardées
      for (let lx = 60; lx < 512; lx += 130) {
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(lx, 50, 48, 80);
        ctx.fillStyle = '#fffa65';
        ctx.fillRect(lx + 6, 60, 36, 60);
      }

      // Corniche magistrale moulurée sous le toit
      ctx.fillStyle = '#f1f2f6';
      ctx.fillRect(0, 180, 512, 24);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, 204, 512, 8);

      // 3. Étages et fenêtres stylisées
      const floors = [250, 420, 590, 760];
      const winCols = [50, 170, 290, 410];

      floors.forEach((fy, fIdx) => {
        // Balcon filant en fer forgé au 2ème étage (étage noble) et 5ème étage
        const isNoble = (fIdx === 0 || fIdx === 2);
        if (isNoble) {
          ctx.fillStyle = '#2f3542';
          ctx.fillRect(0, fy + 95, 512, 18);
          // Motifs de grille
          ctx.fillStyle = '#1e272e';
          for (let gx = 0; gx < 512; gx += 12) {
            ctx.fillRect(gx, fy + 80, 3, 30);
          }
        }

        winCols.forEach(wx => {
          // Encadrement de fenêtre mouluré
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(wx - 6, fy - 6, 64, 102);

          // Fronton classique au-dessus de la fenêtre
          ctx.beginPath();
          ctx.moveTo(wx - 8, fy - 6);
          ctx.lineTo(wx + 26, fy - 26);
          ctx.lineTo(wx + 60, fy - 6);
          ctx.closePath();
          ctx.fillStyle = '#ced6e0';
          ctx.fill();

          // Vitre (alternance chaleureuse lumière / pénombre)
          const isLit = (wx * fy) % 3 !== 0;
          ctx.fillStyle = isLit ? '#ffeaa7' : '#222f3e';
          ctx.fillRect(wx, fy, 52, 90);

          // Rideaux élégants
          if (isLit) {
            ctx.fillStyle = 'rgba(235, 77, 75, 0.7)';
            ctx.fillRect(wx, fy, 14, 90);
            ctx.fillRect(wx + 38, fy, 14, 90);
          }

          // Croisillons de fenêtres en bois
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(wx + 24, fy, 4, 90);
          ctx.fillRect(wx, fy + 45, 52, 4);
        });
      });

      // 4. Rez-de-chaussée : Vitrine de boutique chaleureuse et porte d'immeuble moulurée (neutre, sans texte figé)
      ctx.fillStyle = '#222f3e';
      ctx.fillRect(0, 890, 512, 134);

      // Pilastres et corniches en bois précieux
      ctx.fillStyle = '#3d261d';
      ctx.fillRect(0, 890, 512, 16);
      ctx.fillRect(0, 890, 24, 134);
      ctx.fillRect(244, 890, 24, 134);
      ctx.fillRect(488, 890, 24, 134);

      // Vitrines éclairées de part et d'autre avec reflet
      ctx.fillStyle = '#ffeaa7';
      ctx.fillRect(32, 915, 202, 95);
      ctx.fillRect(278, 915, 202, 95);

      // Reflets lumineux diagonaux réalistes sur la vitre
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.moveTo(32, 1010);
      ctx.lineTo(92, 1010);
      ctx.lineTo(172, 915);
      ctx.lineTo(112, 915);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(278, 1010);
      ctx.lineTo(338, 1010);
      ctx.lineTo(418, 915);
      ctx.lineTo(358, 915);
      ctx.closePath();
      ctx.fill();

      // Soubassements et moulures
      ctx.fillStyle = '#1e1511';
      ctx.fillRect(32, 1000, 202, 14);
      ctx.fillRect(278, 1000, 202, 14);
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
