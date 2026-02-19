import * as THREE from 'three';

// Colors per die type
const DIE_COLORS = {
  d4:  0xe74c3c,
  d6:  0x3498db,
  d8:  0x2ecc71,
  d10: 0xe67e22,
  d12: 0x9b59b6,
  d20: 0xf1c40f,
};

// Face-to-value maps: index in geometry faces -> die value
// These map the "up-facing" geometry face index to the number shown
export const FACE_VALUE_MAPS = {
  d4:  [1, 2, 3, 4],
  d6:  [1, 6, 2, 5, 3, 4],
  d8:  [1, 8, 2, 7, 3, 6, 4, 5],
  d10: [1, 10, 2, 9, 3, 8, 4, 7, 5, 6],
  d12: [1, 12, 2, 11, 3, 10, 4, 9, 5, 8, 6, 7],
  d20: [1,20,2,19,3,18,4,17,5,16,6,15,7,14,8,13,9,12,10,11],
};

// Create material for a die
function createDieMaterial(dieType) {
  const color = DIE_COLORS[dieType] || 0x3498db;
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.3,
    metalness: 0.1,
    emissive: color,
    emissiveIntensity: 0.08,
  });
}

// Create number textures for die faces
function createFaceTexture(number, dieType) {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, size, size);

  // Draw number
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${size * 0.5}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(number), size / 2, size / 2);

  // Underline 6 and 9 to distinguish them
  if (number === 6 || number === 9) {
    ctx.fillRect(size * 0.3, size * 0.78, size * 0.4, size * 0.04);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// Create a d6 mesh with numbered faces
function createD6(value) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  // d6 face order in BoxGeometry: +x, -x, +y, -y, +z, -z
  // Standard die: opposite faces sum to 7
  // +x=1, -x=6, +y=2, -y=5, +z=3, -z=4
  const faceValues = [1, 6, 2, 5, 3, 4];

  const materials = faceValues.map(num => {
    const mat = createDieMaterial('d6');
    const tex = createFaceTexture(num, 'd6');
    mat.map = tex;
    mat.transparent = true;
    return mat;
  });

  const mesh = new THREE.Mesh(geometry, materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// Create a d4 (tetrahedron)
function createD4(value) {
  const geometry = new THREE.TetrahedronGeometry(0.7);
  const mat = createDieMaterial('d4');
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = true;
  return mesh;
}

// Create a d8 (octahedron)
function createD8(value) {
  const geometry = new THREE.OctahedronGeometry(0.65);
  const mat = createDieMaterial('d8');
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = true;
  return mesh;
}

// Create a d10 (pentagonal trapezohedron approximation)
function createD10(value) {
  // Use a slightly squished dodecahedron as visual approximation
  const geometry = new THREE.DodecahedronGeometry(0.6, 0);
  geometry.scale(1, 1.3, 1);
  const mat = createDieMaterial('d10');
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = true;
  return mesh;
}

// Create a d12 (dodecahedron)
function createD12(value) {
  const geometry = new THREE.DodecahedronGeometry(0.6);
  const mat = createDieMaterial('d12');
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = true;
  return mesh;
}

// Create a d20 (icosahedron)
function createD20(value) {
  const geometry = new THREE.IcosahedronGeometry(0.65);
  const mat = createDieMaterial('d20');
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = true;
  return mesh;
}

const CREATORS = { d4: createD4, d6: createD6, d8: createD8, d10: createD10, d12: createD12, d20: createD20 };

// Main export: create a 3D die mesh by type
export function createDieMesh(dieType) {
  const creator = CREATORS[dieType] || createD6;
  return creator();
}

// Get the face normals for a die type so we can detect which face is up
export function getFaceNormals(mesh) {
  const geometry = mesh.geometry;
  const normals = [];
  const position = geometry.getAttribute('position');
  const index = geometry.getIndex();

  if (!index) return normals;

  // Compute face normals from triangles
  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const cb = new THREE.Vector3();
  const ab = new THREE.Vector3();

  for (let i = 0; i < index.count; i += 3) {
    vA.fromBufferAttribute(position, index.getX(i));
    vB.fromBufferAttribute(position, index.getX(i + 1));
    vC.fromBufferAttribute(position, index.getX(i + 2));

    cb.subVectors(vC, vB);
    ab.subVectors(vA, vB);
    cb.cross(ab).normalize();

    normals.push(cb.clone());
  }

  return normals;
}
