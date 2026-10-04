import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { Rhino3dmLoader } from 'three/addons/loaders/3DMLoader.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';

const $ = selector => document.querySelector(selector);
const viewport = $('#viewport');
const slider = $('.model-slider');
const names = ['Y House', 'Valley', 'Depot', 'Coral Tower', 'Markthal', 'Mirador', 'Balancing Barn', 'Nieuw Bergen', 'The Couch'];
let selectedLeft = 4, selectedRight = 5, currentModel, contextModel;
let requestId = 0, contextRequestId = 0, messageTimer, mode = 'orbit';
let variants = [];
THREE.Object3D.DefaultUp.set(0, 0, 1);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#f3f2ee');
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100000);
camera.position.set(-300, -400, 280);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.setAttribute('aria-label', 'White clay architectural study. Drag to orbit and scroll to zoom.');
viewport.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
const transform = new TransformControls(camera, renderer.domElement);
transform.setSize(0.75);
transform.addEventListener('dragging-changed', event => { controls.enabled = !event.value; });
scene.add(transform);
scene.add(new THREE.HemisphereLight(0xffffff, 0xb3b0a6, 0.65));
const key = new THREE.DirectionalLight(0xfffaf2, 1.7);
key.position.set(-300, -200, 500);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.bias = -0.0002;
key.shadow.normalBias = 0.15;
scene.add(key, key.target);
const fill = new THREE.DirectionalLight(0xffffff, 0.55);
fill.position.set(300, 150, 100);
scene.add(fill);
const clay = new THREE.MeshStandardMaterial({ color: '#c9c4b9', roughness: 0.95, metalness: 0, side: THREE.DoubleSide });
const contextClay = new THREE.MeshStandardMaterial({ color: '#e7e5df', roughness: 1, metalness: 0, side: THREE.DoubleSide });
const loader = new Rhino3dmLoader();
loader.setLibraryPath('https://cdn.jsdelivr.net/npm/rhino3dm@7.11.1/');
loader.setWorkerLimit(2);

function showMessage(text) {
  clearTimeout(messageTimer);
  $('#message').textContent = text;
  $('#message').hidden = false;
  messageTimer = setTimeout(() => { $('#message').hidden = true; }, 5000);
}
function disposeObject(object) {
  if (!object) return;
  object.traverse(child => {
    child.geometry?.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach(material => {
      if (!material || material === clay || material === contextClay) return;
      Object.values(material).forEach(value => { if (value?.isTexture) value.dispose(); });
      material.dispose();
    });
  });
}
function applyClay(object, material) {
  object.traverse(child => {
    if (child.isMesh) {
      const old = Array.isArray(child.material) ? child.material : [child.material];
      old.forEach(item => {
        if (!item) return;
        Object.values(item).forEach(value => { if (value?.isTexture) value.dispose(); });
        item.dispose();
      });
      child.material = material;
      child.castShadow = true;
      child.receiveShadow = true;
    } else if (child.isLine || child.isPoints) child.visible = false;
  });
}
function resize() {
  const width = viewport.clientWidth, height = viewport.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}
new ResizeObserver(resize).observe(viewport);
resize();
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

function fitView() {
  if (!currentModel) return;
  currentModel.updateMatrixWorld(true);
  const box = new THREE.Box3();
  currentModel.traverse(child => { if (child.isMesh && child.visible) box.expandByObject(child); });
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.length() / 2, 1);
  key.position.copy(center).add(new THREE.Vector3(-radius * 2, -radius, radius * 4));
  key.target.position.copy(center);
  const shadowCamera = key.shadow.camera;
  shadowCamera.left = shadowCamera.bottom = -radius * 3;
  shadowCamera.right = shadowCamera.top = radius * 3;
  shadowCamera.near = 0.1;
  shadowCamera.far = radius * 12;
  shadowCamera.updateProjectionMatrix();
  const vertical = THREE.MathUtils.degToRad(camera.fov / 2);
  const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
  const fitMargin = window.matchMedia('(max-width: 700px)').matches ? 1.05 : 1.7;
  const distance = radius / Math.sin(Math.min(vertical, horizontal)) * fitMargin;
  const direction = camera.position.clone().sub(controls.target).normalize();
  controls.target.copy(center);
  camera.position.copy(center).addScaledVector(direction, distance);
  camera.near = Math.max(distance / 1000, 0.01);
  camera.far = distance * 100;
  camera.updateProjectionMatrix();
  controls.maxDistance = distance * 10;
  controls.update();
}
function setMode(next) {
  mode = next;
  transform.detach();
  if (mode !== 'orbit' && currentModel) {
    transform.setMode(mode);
    transform.attach(currentModel);
  }
  document.querySelectorAll('.touch-btn').forEach(button => {
    const active = button.dataset.mode === mode;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
function updateVariant() {
  const index = Number(slider.value) - 1;
  variants.forEach((mesh, i) => { mesh.visible = i === index; });
  $('#mix-value').textContent = `${String(index + 1).padStart(2, '0')} / ${String(variants.length).padStart(2, '0')}`;
  slider.setAttribute('aria-valuetext', `Study ${index + 1} of ${variants.length}`);
}
function updateSelection() {
  ['left', 'right'].forEach((side, i) => {
    document.querySelectorAll(`.${side}-ribbon .ribbon-item`).forEach(button => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.index) === (i ? selectedRight : selectedLeft)));
    });
  });
  $('#form-a').textContent = names[selectedLeft];
  $('#form-b').textContent = names[selectedRight];
}
function loadPair(left, right) {
  if (left === right) { showMessage('Choose two different forms to explore a mix.'); return; }
  const id = ++requestId;
  $('#loader').hidden = false;
  slider.disabled = true;
  $('.download-btn').disabled = true;
  loader.load(`Models/${left}${right}.3dm`, object => {
    if (id !== requestId) { disposeObject(object); return; }
    const meshes = [];
    object.traverse(child => { if (child.isMesh) meshes.push(child); });
    if (!meshes.length) { disposeObject(object); finishLoad('This study contains no meshes.'); return; }
    transform.detach();
    if (currentModel) { scene.remove(currentModel); disposeObject(currentModel); }
    applyClay(object, clay);
    currentModel = object;
    currentModel.name = `${left}${right}`;
    scene.add(object);
    selectedLeft = left;
    selectedRight = right;
    variants = meshes;
    slider.max = variants.length;
    slider.value = Math.min(Number(slider.value), variants.length);
    updateSelection();
    updateVariant();
    setMode(mode);
    fitView();
    finishLoad();
  }, undefined, () => {
    if (id === requestId) finishLoad('Could not load this mix. Check your connection and try again.');
  });
}
function finishLoad(error) {
  $('#loader').hidden = true;
  slider.disabled = !currentModel;
  $('.download-btn').disabled = !currentModel;
  if (error) showMessage(error);
}
function replaceContext(object) {
  applyClay(object, contextClay);
  if (contextModel) { scene.remove(contextModel); disposeObject(contextModel); }
  contextModel = object;
  contextModel.visible = $('.context-btn').getAttribute('aria-pressed') === 'true';
  scene.add(object);
}
const defaultContextRequest = contextRequestId;
loader.load('assets/ctxt_model_simple.3dm', object => {
  if (defaultContextRequest !== contextRequestId) { disposeObject(object); return; }
  replaceContext(object);
}, undefined, () => { if (!contextRequestId) showMessage('The context could not load. You can still explore the forms.'); });

for (const side of ['left', 'right']) {
  document.querySelectorAll(`.${side}-ribbon .ribbon-item`).forEach(button => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.index);
      loadPair(side === 'left' ? index : selectedLeft, side === 'right' ? index : selectedRight);
    });
  });
}
slider.addEventListener('input', updateVariant);
function setSearchOpen(open) {
  $('.top-bar').classList.toggle('search-open', open);
  $('.search-toggle').setAttribute('aria-expanded', String(open));
  if (open) $('.search-input').focus();
}
$('.search-toggle').addEventListener('click', () => {
  setSearchOpen($('.search-toggle').getAttribute('aria-expanded') !== 'true');
});
$('.search-input').addEventListener('keydown', event => {
  if (event.key === 'Escape' || event.key === 'Enter') {
    setSearchOpen(false);
    $('.search-toggle').focus();
  }
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('.top-bar')) setSearchOpen(false);
});
$('.search-input').addEventListener('input', event => {
  const query = event.target.value.trim().toLowerCase();
  document.querySelectorAll('.model-library').forEach(library => {
    let count = 0;
    library.querySelectorAll('.ribbon-item').forEach(button => {
      button.hidden = !names[Number(button.dataset.index)].toLowerCase().includes(query);
      if (!button.hidden) count++;
    });
    library.querySelector('.empty-search').hidden = count > 0;
  });
});
$('.fit-btn').addEventListener('click', fitView);
$('.context-btn').addEventListener('click', () => {
  const visible = $('.context-btn').getAttribute('aria-pressed') !== 'true';
  $('.context-btn').setAttribute('aria-pressed', String(visible));
  $('.context-btn').textContent = visible ? 'Context on' : 'Context off';
  if (contextModel) contextModel.visible = visible;
});
$('.upload-btn').addEventListener('click', () => $('#context-file').click());
$('#context-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.3dm')) { showMessage('Choose a Rhino .3dm file.'); return; }
  const id = ++contextRequestId;
  $('.upload-btn').disabled = true;
  $('.upload-btn').textContent = 'Importing…';
  try {
    const buffer = await file.arrayBuffer();
    const object = await new Promise((resolve, reject) => loader.parse(buffer, resolve, reject));
    if (id !== contextRequestId) { disposeObject(object); return; }
    replaceContext(object);
    showMessage(`Context imported: ${file.name}`);
  } catch { showMessage('Could not read this Rhino file. Try a mesh-based .3dm file.'); }
  finally {
    $('.upload-btn').disabled = false;
    $('.upload-btn').textContent = '+ Context';
    event.target.value = '';
  }
});
$('.download-btn').addEventListener('click', () => {
  const mesh = variants[Number(slider.value) - 1];
  if (!mesh) return;
  currentModel.updateMatrixWorld(true);
  const text = new OBJExporter().parse(mesh);
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `latent-${currentModel.name}-study-${slider.value}.obj`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  showMessage('Your architectural study has been exported.');
});
document.querySelectorAll('.touch-btn').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
window.addEventListener('keydown', event => {
  if (event.target.matches('input, textarea') || event.ctrlKey || event.metaKey || event.altKey || $('.intro-panel').open) return;
  const key = event.key.toLowerCase();
  if (key === '/') { event.preventDefault(); setSearchOpen(true); }
  const modes = { m: 'translate', s: 'scale', r: 'rotate', escape: 'orbit' };
  if (modes[key]) setMode(modes[key]);
});
$('.help-btn').addEventListener('click', () => $('.intro-panel').showModal());
$('.close-intro').addEventListener('click', () => $('.intro-panel').close());
$('.start-btn').addEventListener('click', () => $('.intro-panel').close());
loadPair(4, 5);
