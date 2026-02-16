import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const DiscoDetectiveGame = () => {
  const containerRef = useRef(null);
  const [gameState, setGameState] = useState('intro'); // intro, playing
  const [titleText, setTitleText] = useState('');
  const [dialogue, setDialogue] = useState(null);
  const [playerPos, setPlayerPos] = useState({ x: 8, z: 8 });
  const [isStanding, setIsStanding] = useState(false);
  
  const fullTitle = "Nightclub interior.  Little Italy.  Summer 1979.  11:54 PM.";

  useEffect(() => {
    if (gameState === 'intro') {
      let index = 0;
      const interval = setInterval(() => {
        if (index < fullTitle.length) {
          setTitleText(fullTitle.slice(0, index + 1));
          index++;
        } else {
          clearInterval(interval);
          setTimeout(() => setGameState('playing'), 1500);
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing' || !containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    scene.fog = new THREE.Fog(0x0a0a0a, 15, 35);

    const camera = new THREE.PerspectiveCamera(
      50,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 18, 22);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x331111, 0.3);
    scene.add(ambientLight);

    // Colored cabaret lights above dance floor
    const spotLights = [
      { color: 0xff0066, pos: [-6, 8, -6], target: [-6, 0, -6] },
      { color: 0x00ffff, pos: [-3, 8, -6], target: [-3, 0, -6] },
      { color: 0xffff00, pos: [-6, 8, -3], target: [-6, 0, -3] },
      { color: 0x0066ff, pos: [-3, 8, -3], target: [-3, 0, -3] },
    ];

    spotLights.forEach(light => {
      const spotLight = new THREE.SpotLight(light.color, 2, 20, Math.PI / 6, 0.5);
      spotLight.position.set(...light.pos);
      spotLight.target.position.set(...light.target);
      spotLight.castShadow = true;
      scene.add(spotLight);
      scene.add(spotLight.target);
    });

    // Warm overhead lights for tables area
    const tableLight = new THREE.PointLight(0xff8833, 1, 15);
    tableLight.position.set(4, 6, 2);
    scene.add(tableLight);

    // Floor
    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a0a0a,
      roughness: 0.8 
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.01;
    floor.receiveShadow = true;
    scene.add(floor);

    // Dance floor (top left area) - blinking tiles
    const danceFloorTiles = [];
    const tileColors = [0xff0000, 0x0000ff, 0xffff00, 0xffffff];
    for (let x = 0; x < 4; x++) {
      for (let z = 0; z < 4; z++) {
        const tileGeometry = new THREE.BoxGeometry(1.8, 0.15, 1.8);
        const tileMaterial = new THREE.MeshStandardMaterial({
          color: tileColors[(x + z) % 4],
          emissive: tileColors[(x + z) % 4],
          emissiveIntensity: 0.5,
          metalness: 0.3,
          roughness: 0.4
        });
        const tile = new THREE.Mesh(tileGeometry, tileMaterial);
        tile.position.set(-7.5 + x * 2, 0, -7.5 + z * 2);
        tile.castShadow = true;
        tile.receiveShadow = true;
        scene.add(tile);
        danceFloorTiles.push({ mesh: tile, phase: Math.random() * Math.PI * 2 });
      }
    }

    // Platform for tables (right side)
    const platformGeometry = new THREE.BoxGeometry(8, 0.3, 10);
    const platformMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a1515,
      roughness: 0.9 
    });
    const platform = new THREE.Mesh(platformGeometry, platformMaterial);
    platform.position.set(5, 0.15, 0);
    platform.receiveShadow = true;
    scene.add(platform);

    // Red carpet on platform
    const carpetGeometry = new THREE.PlaneGeometry(7.5, 9.5);
    const carpetMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8b0000,
      roughness: 0.95 
    });
    const carpet = new THREE.Mesh(carpetGeometry, carpetMaterial);
    carpet.rotation.x = -Math.PI / 2;
    carpet.position.set(5, 0.31, 0);
    carpet.receiveShadow = true;
    scene.add(carpet);

    // Tables with couples
    const tables = [
      { pos: [4, 0.3, -3], isPlayer: false },
      { pos: [4, 0.3, 0], isPlayer: false },
      { pos: [4, 0.3, 3], isPlayer: false },
      { pos: [7, 0.3, 6], isPlayer: true }, // Player's table (back right)
    ];

    tables.forEach((tableData) => {
      // Table
      const tableTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.8, 0.8, 0.05, 16),
        new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 0.5 })
      );
      tableTop.position.set(tableData.pos[0], tableData.pos[1] + 0.7, tableData.pos[2]);
      tableTop.castShadow = true;
      scene.add(tableTop);

      // Red tablecloth
      const tablecloth = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.7, 0.7, 16),
        new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.8 })
      );
      tablecloth.position.set(tableData.pos[0], tableData.pos[1] + 0.35, tableData.pos[2]);
      scene.add(tablecloth);

      // Drinks
      const wineGlass = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.04, 0.2, 8),
        new THREE.MeshStandardMaterial({ 
          color: 0xffffff, 
          transparent: true, 
          opacity: 0.3,
          metalness: 0.8
        })
      );
      wineGlass.position.set(tableData.pos[0] - 0.3, tableData.pos[1] + 0.85, tableData.pos[2] + 0.2);
      scene.add(wineGlass);

      const whiskey = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 0.12, 8),
        new THREE.MeshStandardMaterial({ 
          color: 0x8b4513, 
          transparent: true, 
          opacity: 0.6 
        })
      );
      whiskey.position.set(tableData.pos[0] + 0.3, tableData.pos[1] + 0.82, tableData.pos[2] - 0.2);
      scene.add(whiskey);

      // NPCs - stylized characters
      if (!tableData.isPlayer) {
        // Lady
        const ladyBody = new THREE.Mesh(
          new THREE.CylinderGeometry(0.15, 0.25, 0.8, 8),
          new THREE.MeshStandardMaterial({ 
            color: [0xff1493, 0x9400d3, 0x00ced1][Math.floor(Math.random() * 3)],
            metalness: 0.3
          })
        );
        ladyBody.position.set(tableData.pos[0] - 0.5, tableData.pos[1] + 0.7, tableData.pos[2]);
        ladyBody.castShadow = true;
        scene.add(ladyBody);

        const ladyHead = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xffdbac })
        );
        ladyHead.position.set(tableData.pos[0] - 0.5, tableData.pos[1] + 1.25, tableData.pos[2]);
        ladyHead.castShadow = true;
        scene.add(ladyHead);

        // Man
        const manColors = [0x000000, 0x4169e1, 0x8b0000];
        const manColor = manColors[Math.floor(Math.random() * 3)];
        const manBody = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.22, 0.9, 8),
          new THREE.MeshStandardMaterial({ color: manColor })
        );
        manBody.position.set(tableData.pos[0] + 0.5, tableData.pos[1] + 0.75, tableData.pos[2]);
        manBody.castShadow = true;
        scene.add(manBody);

        const manHead = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xffdbac })
        );
        manHead.position.set(tableData.pos[0] + 0.5, tableData.pos[1] + 1.3, tableData.pos[2]);
        manHead.castShadow = true;
        scene.add(manHead);
      }
    });

    // Player character (initially at table)
    const playerGeometry = new THREE.CapsuleGeometry(0.2, 0.6, 8, 16);
    const playerMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a2a,
      metalness: 0.2,
      roughness: 0.8
    });
    const player = new THREE.Mesh(playerGeometry, playerMaterial);
    player.position.set(8, 0.7, 8);
    player.castShadow = true;
    scene.add(player);

    const playerHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffdbac })
    );
    playerHead.position.set(8, 1.15, 8);
    playerHead.castShadow = true;
    scene.add(playerHead);

    // Date character
    const dateBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.25, 0.8, 8),
      new THREE.MeshStandardMaterial({ color: 0xff69b4, metalness: 0.3 })
    );
    dateBody.position.set(6.5, 0.7, 7.5);
    dateBody.castShadow = true;
    scene.add(dateBody);

    const dateHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffdbac })
    );
    dateHead.position.set(6.5, 1.25, 7.5);
    dateHead.castShadow = true;
    scene.add(dateHead);

    // Bathroom area guy (top area)
    const bathroomGuy = new THREE.Group();
    const guyBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.22, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: 0x000000 }) // Leather jacket
    );
    guyBody.castShadow = true;
    bathroomGuy.add(guyBody);

    const guyHead = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffdbac })
    );
    guyHead.position.y = 0.55;
    guyHead.castShadow = true;
    bathroomGuy.add(guyHead);

    // Sunglasses
    const sunglasses = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, 0.05, 0.15),
      new THREE.MeshStandardMaterial({ color: 0xff8800, metalness: 0.9 })
    );
    sunglasses.position.set(0, 0.55, 0.12);
    bathroomGuy.add(sunglasses);

    bathroomGuy.position.set(-1, 0.75, -8);
    scene.add(bathroomGuy);

    // Smoke particles
    const smokeParticles = [];
    const smokeGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const smokeMaterial = new THREE.MeshBasicMaterial({
      color: 0xaaaaaa,
      transparent: true,
      opacity: 0.15
    });

    for (let i = 0; i < 40; i++) {
      const smoke = new THREE.Mesh(smokeGeometry, smokeMaterial.clone());
      smoke.position.set(
        -6 + Math.random() * 4,
        Math.random() * 3,
        -6 + Math.random() * 4
      );
      scene.add(smoke);
      smokeParticles.push({
        mesh: smoke,
        velocity: { x: (Math.random() - 0.5) * 0.02, y: Math.random() * 0.01, z: (Math.random() - 0.5) * 0.02 }
      });
    }

    // Bar (bottom left)
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(3, 1.2, 1),
      new THREE.MeshStandardMaterial({ color: 0x4a2511, roughness: 0.6 })
    );
    bar.position.set(-7, 0.6, 8);
    bar.castShadow = true;
    scene.add(bar);

    // Walls to frame the space
    const wallMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a0505,
      roughness: 0.95
    });

    const backWall = new THREE.Mesh(
      new THREE.BoxGeometry(30, 5, 0.5),
      wallMaterial
    );
    backWall.position.set(0, 2.5, -10);
    backWall.receiveShadow = true;
    scene.add(backWall);

    const rightWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 5, 30),
      wallMaterial
    );
    rightWall.position.set(10, 2.5, 0);
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Input handling
    const keys = { w: false, a: false, s: false, d: false, a_button: false, b_button: false };

    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') keys.w = true;
      if (key === 'a' || key === 'arrowleft') keys.a = true;
      if (key === 's' || key === 'arrowdown') keys.s = true;
      if (key === 'd' || key === 'arrowright') keys.d = true;
      if (key === 'e' || key === 'enter') keys.a_button = true;
      if (key === ' ' || key === 'shift') keys.b_button = true;
    };

    const handleKeyUp = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') keys.w = false;
      if (key === 'a' || key === 'arrowleft') keys.a = false;
      if (key === 's' || key === 'arrowdown') keys.s = false;
      if (key === 'd' || key === 'arrowright') keys.d = false;
      if (key === 'e' || key === 'enter') keys.a_button = false;
      if (key === ' ' || key === 'shift') keys.b_button = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Game loop
    const clock = new THREE.Clock();
    let standing = false;
    let currentPlayerPos = { x: 8, z: 8 };

    const animate = () => {
      requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Dance floor tile animation
      danceFloorTiles.forEach((tile, index) => {
        const intensity = 0.3 + Math.sin(time * 2 + tile.phase) * 0.3;
        tile.mesh.material.emissiveIntensity = Math.max(0.1, intensity);
      });

      // Smoke animation
      smokeParticles.forEach(particle => {
        particle.mesh.position.x += particle.velocity.x;
        particle.mesh.position.y += particle.velocity.y;
        particle.mesh.position.z += particle.velocity.z;

        if (particle.mesh.position.y > 4) {
          particle.mesh.position.y = 0;
          particle.mesh.position.x = -6 + Math.random() * 4;
          particle.mesh.position.z = -6 + Math.random() * 4;
        }
      });

      // Player interaction logic
      const atTable = Math.abs(currentPlayerPos.x - 8) < 1 && Math.abs(currentPlayerPos.z - 8) < 1;
      const nearBathroomGuy = Math.abs(currentPlayerPos.x - (-1)) < 1 && Math.abs(currentPlayerPos.z - (-8)) < 1.5;

      if (keys.a_button) {
        keys.a_button = false;
        if (atTable && !standing) {
          setDialogue("I love this song!");
          setTimeout(() => setDialogue(null), 2000);
        }
      }

      if (keys.b_button) {
        keys.b_button = false;
        if (atTable && !standing) {
          standing = true;
          setIsStanding(true);
        } else if (nearBathroomGuy && standing) {
          setDialogue("...");
          setTimeout(() => setDialogue(null), 2000);
        }
      }

      // Movement when standing
      if (standing) {
        const speed = 0.1;
        let dx = 0, dz = 0;

        if (keys.w) dz -= speed;
        if (keys.s) dz += speed;
        if (keys.a) dx -= speed;
        if (keys.d) dx += speed;

        if (dx !== 0 || dz !== 0) {
          const newX = currentPlayerPos.x + dx;
          const newZ = currentPlayerPos.z + dz;

          // Boundary checking
          if (newX > -9 && newX < 9 && newZ > -9 && newZ < 9) {
            currentPlayerPos.x = newX;
            currentPlayerPos.z = newZ;
            player.position.x = newX;
            player.position.z = newZ;
            playerHead.position.x = newX;
            playerHead.position.z = newZ;
            setPlayerPos({ x: newX, z: newZ });
          }
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [gameState]);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      margin: 0, 
      padding: 0, 
      overflow: 'hidden',
      background: '#000',
      fontFamily: "'Courier New', monospace"
    }}>
      {gameState === 'intro' && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          color: '#fff',
          fontSize: '28px',
          padding: '40px',
          textAlign: 'center',
          letterSpacing: '2px',
          animation: 'fadeIn 1s ease-in',
          zIndex: 1000
        }}>
          <div style={{
            maxWidth: '800px',
            borderLeft: '3px solid #ff8800',
            paddingLeft: '30px'
          }}>
            {titleText}
            <span style={{
              animation: 'blink 1s infinite',
              marginLeft: '4px'
            }}>_</span>
          </div>
        </div>
      )}

      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {gameState === 'playing' && (
        <>
          {/* HUD */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            color: '#ff8800',
            fontSize: '14px',
            textShadow: '0 0 10px rgba(255, 136, 0, 0.8), 2px 2px 4px rgba(0,0,0,0.8)',
            letterSpacing: '1px',
            lineHeight: '1.6',
            background: 'rgba(0,0,0,0.6)',
            padding: '15px 20px',
            borderLeft: '3px solid #ff8800',
            backdropFilter: 'blur(5px)'
          }}>
            <div style={{ fontSize: '18px', marginBottom: '10px', fontWeight: 'bold' }}>
              NIGHTCLUB • LITTLE ITALY
            </div>
            <div style={{ fontSize: '12px', opacity: 0.8 }}>
              SUMMER 1979 • 11:54 PM
            </div>
          </div>

          {/* Controls */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            color: '#ff8800',
            fontSize: '13px',
            textAlign: 'right',
            background: 'rgba(0,0,0,0.7)',
            padding: '15px 20px',
            borderRight: '3px solid #ff8800',
            backdropFilter: 'blur(5px)',
            lineHeight: '1.8'
          }}>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ opacity: 0.6 }}>MOVE:</span> WASD / ARROWS
            </div>
            <div style={{ marginBottom: '8px' }}>
              <span style={{ opacity: 0.6 }}>INTERACT:</span> E / ENTER
            </div>
            <div>
              <span style={{ opacity: 0.6 }}>ACTION:</span> SPACE / SHIFT
            </div>
          </div>

          {/* Status */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            color: isStanding ? '#00ff00' : '#ff8800',
            fontSize: '12px',
            background: 'rgba(0,0,0,0.7)',
            padding: '10px 15px',
            borderRight: '3px solid ' + (isStanding ? '#00ff00' : '#ff8800'),
            backdropFilter: 'blur(5px)'
          }}>
            {isStanding ? 'STANDING' : 'SEATED'}
          </div>

          {/* Dialogue box */}
          {dialogue && (
            <div style={{
              position: 'absolute',
              bottom: '100px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0, 0, 0, 0.9)',
              color: '#fff',
              padding: '20px 40px',
              fontSize: '18px',
              borderTop: '2px solid #ff8800',
              borderBottom: '2px solid #ff8800',
              minWidth: '400px',
              textAlign: 'center',
              letterSpacing: '1px',
              animation: 'slideUp 0.3s ease-out',
              backdropFilter: 'blur(10px)'
            }}>
              {dialogue}
            </div>
          )}

          {/* Film grain overlay */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            background: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'6.5\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
            opacity: 0.08,
            mixBlendMode: 'overlay'
          }} />

          {/* Vignette */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            background: 'radial-gradient(circle, transparent 40%, rgba(0,0,0,0.6) 100%)'
          }} />
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
        @keyframes slideUp {
          from { 
            transform: translateX(-50%) translateY(20px);
            opacity: 0;
          }
          to { 
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
      `}</style>
    </div>
  );
};

export default DiscoDetectiveGame;
