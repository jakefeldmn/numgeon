import * as CANNON from 'cannon-es';

const SETTLED_THRESHOLD = 0.05;
const SETTLED_FRAMES = 30;

export class DicePhysicsWorld {
  constructor() {
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -30, 0) });
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 10;
    this.world.allowSleep = true;

    this.diceBodies = [];
    this.settledCounts = [];

    this._createWalls();
  }

  _createWalls() {
    const floorMat = new CANNON.Material('floor');
    const diceMat = new CANNON.Material('dice');

    this.world.addContactMaterial(new CANNON.ContactMaterial(floorMat, diceMat, {
      friction: 0.4,
      restitution: 0.35,
    }));

    this.diceMaterial = diceMat;

    // Floor
    const floor = new CANNON.Body({
      mass: 0,
      shape: new CANNON.Plane(),
      material: floorMat,
    });
    floor.quaternion.setFromEulerAngles(-Math.PI / 2, 0, 0);
    floor.position.set(0, -1.5, 0);
    this.world.addBody(floor);

    // Walls to keep dice contained
    const wallPositions = [
      { pos: [4, 0, 0], rot: [0, 0, Math.PI / 2] },
      { pos: [-4, 0, 0], rot: [0, 0, -Math.PI / 2] },
      { pos: [0, 0, 3], rot: [Math.PI / 2, 0, 0] },
      { pos: [0, 0, -3], rot: [-Math.PI / 2, 0, 0] },
    ];

    for (const w of wallPositions) {
      const wall = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: floorMat });
      wall.position.set(...w.pos);
      wall.quaternion.setFromEulerAngles(...w.rot);
      this.world.addBody(wall);
    }
  }

  addDie(dieType, index, totalDice) {
    // Shape approximation based on die type
    let shape;
    const radius = 0.5;
    switch (dieType) {
      case 'd4':
        shape = new CANNON.Sphere(0.42);
        break;
      case 'd6':
        shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        break;
      case 'd8':
        shape = new CANNON.Sphere(0.45);
        break;
      case 'd10':
        shape = new CANNON.Sphere(0.45);
        break;
      case 'd12':
        shape = new CANNON.Sphere(0.48);
        break;
      case 'd20':
        shape = new CANNON.Sphere(0.5);
        break;
      default:
        shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
    }

    const body = new CANNON.Body({
      mass: 1,
      shape,
      material: this.diceMaterial,
      linearDamping: 0.3,
      angularDamping: 0.3,
    });

    // Spread dice out horizontally
    const spacing = 1.5;
    const totalWidth = (totalDice - 1) * spacing;
    const startX = -totalWidth / 2;
    body.position.set(
      startX + index * spacing,
      3 + Math.random() * 2,
      (Math.random() - 0.5) * 2
    );

    // Random initial velocity and spin
    body.velocity.set(
      (Math.random() - 0.5) * 4,
      -2 - Math.random() * 3,
      (Math.random() - 0.5) * 4
    );
    body.angularVelocity.set(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20
    );

    this.world.addBody(body);
    this.diceBodies.push(body);
    this.settledCounts.push(0);

    return body;
  }

  step(dt) {
    this.world.step(1 / 60, dt, 3);

    // Check if each die has settled
    for (let i = 0; i < this.diceBodies.length; i++) {
      const body = this.diceBodies[i];
      const speed = body.velocity.length() + body.angularVelocity.length();
      if (speed < SETTLED_THRESHOLD) {
        this.settledCounts[i]++;
      } else {
        this.settledCounts[i] = 0;
      }
    }
  }

  allSettled() {
    return this.diceBodies.length > 0 &&
      this.settledCounts.every(c => c >= SETTLED_FRAMES);
  }

  getBodyState(index) {
    const body = this.diceBodies[index];
    if (!body) return null;
    return {
      position: { x: body.position.x, y: body.position.y, z: body.position.z },
      quaternion: { x: body.quaternion.x, y: body.quaternion.y, z: body.quaternion.z, w: body.quaternion.w },
    };
  }

  dispose() {
    // Remove all bodies
    for (const body of this.diceBodies) {
      this.world.removeBody(body);
    }
    this.diceBodies = [];
    this.settledCounts = [];
  }
}
