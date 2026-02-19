import * as THREE from 'three';
import { createDieMesh } from './DiceGeometry.js';
import { DicePhysicsWorld } from './DicePhysics.js';

const VALUE_LABEL_Y_OFFSET = 1.2;

export class DiceRenderer {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.physics = null;
    this.diceMeshes = [];
    this.diceData = [];
    this.valueSprites = [];
    this.animating = false;
    this.resolveRoll = null;
    this.animFrameId = null;
    this.disposed = false;
    this.clock = new THREE.Clock();

    this._init();
  }

  _init() {
    const w = this.container.clientWidth || 400;
    const h = this.container.clientHeight || 200;

    // Scene
    this.scene = new THREE.Scene();

    // Camera — top-down angled view of dice tray
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 8, 5);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);

    // Lights
    const ambient = new THREE.AmbientLight(0x404060, 1.5);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(3, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(1024, 1024);
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 25;
    dirLight.shadow.camera.left = -6;
    dirLight.shadow.camera.right = 6;
    dirLight.shadow.camera.top = 6;
    dirLight.shadow.camera.bottom = -6;
    this.scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x6666ff, 0.5);
    rimLight.position.set(-3, 5, -3);
    this.scene.add(rimLight);

    // Floor (shadow receiver, invisible)
    const floorGeo = new THREE.PlaneGeometry(12, 8);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.3 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.5;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Tray surface (subtle)
    const trayGeo = new THREE.PlaneGeometry(10, 6);
    const trayMat = new THREE.MeshStandardMaterial({
      color: 0x12122a,
      roughness: 0.9,
      metalness: 0,
    });
    const tray = new THREE.Mesh(trayGeo, trayMat);
    tray.rotation.x = -Math.PI / 2;
    tray.position.y = -1.49;
    tray.receiveShadow = true;
    this.scene.add(tray);

    // Handle resize
    this._onResize = () => {
      const w = this.container.clientWidth || 400;
      const h = this.container.clientHeight || 200;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', this._onResize);
  }

  // Roll dice with 3D animation, then force-show correct values
  // dicePool: [{ type: 'd6', value: 4, id: 'die-0' }, ...]
  rollDice(dicePool) {
    return new Promise((resolve) => {
      this.resolveRoll = resolve;
      this._clearDice();

      // Create physics world
      this.physics = new DicePhysicsWorld();

      // Create meshes and physics bodies
      this.diceData = dicePool.map((die, i) => {
        const mesh = createDieMesh(die.type);
        this.scene.add(mesh);
        this.diceMeshes.push(mesh);

        const body = this.physics.addDie(die.type, i, dicePool.length);

        // Sync initial position
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);

        return { mesh, body, type: die.type, targetValue: die.value, id: die.id };
      });

      // Start animation
      this.animating = true;
      this.clock.start();
      this._animate();
    });
  }

  _animate() {
    if (this.disposed) return;

    if (!this.animating) {
      this.animFrameId = requestAnimationFrame(() => this._renderFrame());
      return;
    }

    this.animFrameId = requestAnimationFrame(() => this._animate());

    const dt = this.clock.getDelta();
    this.physics.step(dt);

    // Sync meshes to physics bodies
    for (let i = 0; i < this.diceData.length; i++) {
      const { mesh } = this.diceData[i];
      const state = this.physics.getBodyState(i);
      if (state) {
        mesh.position.set(state.position.x, state.position.y, state.position.z);
        mesh.quaternion.set(state.quaternion.x, state.quaternion.y, state.quaternion.z, state.quaternion.w);
      }
    }

    this.renderer.render(this.scene, this.camera);

    // Check if all dice settled
    if (this.physics.allSettled()) {
      this.animating = false;
      this._onSettled();
    }
  }

  _onSettled() {
    // Show floating value labels above each die
    this._showValueLabels();

    // Keep rendering statically
    this._renderFrame();

    // Resolve the promise
    if (this.resolveRoll) {
      const values = this.diceData.map(d => ({
        id: d.id,
        type: d.type,
        value: d.targetValue,
      }));
      this.resolveRoll(values);
      this.resolveRoll = null;
    }
  }

  _showValueLabels() {
    // Remove old labels
    this._clearValueSprites();

    for (const data of this.diceData) {
      const sprite = this._createValueSprite(data.targetValue, data.type);
      sprite.position.copy(data.mesh.position);
      sprite.position.y += VALUE_LABEL_Y_OFFSET;
      this.scene.add(sprite);
      this.valueSprites.push(sprite);
    }
  }

  _createValueSprite(value, dieType) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 128, 64);

    // Background pill
    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.beginPath();
    ctx.roundRect(10, 5, 108, 54, 12);
    ctx.fill();

    // Border
    const colors = {
      d4: '#e74c3c', d6: '#3498db', d8: '#2ecc71',
      d10: '#e67e22', d12: '#9b59b6', d20: '#f1c40f',
    };
    ctx.strokeStyle = colors[dieType] || '#3498db';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(10, 5, 108, 54, 12);
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(value), 64, 34);

    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(1.5, 0.75, 1);
    return sprite;
  }

  _renderFrame() {
    if (this.disposed) return;
    this.renderer.render(this.scene, this.camera);
  }

  // Update which dice are held/used visually
  updateDiceStates(diceStates) {
    // diceStates: [{ id, held, used }]
    for (const ds of diceStates) {
      const data = this.diceData.find(d => d.id === ds.id);
      if (!data) continue;

      if (ds.used) {
        data.mesh.material.opacity = 0.2;
        if (Array.isArray(data.mesh.material)) {
          data.mesh.material.forEach(m => { m.opacity = 0.2; m.transparent = true; });
        } else {
          data.mesh.material.opacity = 0.2;
          data.mesh.material.transparent = true;
        }
      } else if (ds.held) {
        // Gold glow for held dice
        const emissive = 0xffd700;
        if (Array.isArray(data.mesh.material)) {
          data.mesh.material.forEach(m => { m.emissive.setHex(emissive); m.emissiveIntensity = 0.3; });
        } else {
          data.mesh.material.emissive.setHex(emissive);
          data.mesh.material.emissiveIntensity = 0.3;
        }
      }
    }
    this._renderFrame();
  }

  _clearValueSprites() {
    for (const sprite of this.valueSprites) {
      this.scene.remove(sprite);
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    this.valueSprites = [];
  }

  _clearDice() {
    for (const data of this.diceData) {
      this.scene.remove(data.mesh);
      if (Array.isArray(data.mesh.material)) {
        data.mesh.material.forEach(m => { m.map?.dispose(); m.dispose(); });
      } else {
        data.mesh.material.map?.dispose();
        data.mesh.material.dispose();
      }
      data.mesh.geometry.dispose();
    }
    this.diceMeshes = [];
    this.diceData = [];
    this._clearValueSprites();

    if (this.physics) {
      this.physics.dispose();
      this.physics = null;
    }
  }

  dispose() {
    this.disposed = true;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this._clearDice();
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
