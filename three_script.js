// Import libraries
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { Rhino3dmLoader } from 'three/addons/loaders/3DMLoader.js'
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js'

// declare variables to store scene, camera, and renderer
let scene, camera, renderer
let contextModel // persistent background model
let transformControls

const slider = document.querySelector('.model-slider');
slider.setAttribute("min", 1);
slider.setAttribute("max", 9); // Since there are 9 meshes, the index will be 0 to 8
slider.addEventListener('input', updateMeshVisibility);


// set up the loader
const size = new THREE.Vector3();
const center = new THREE.Vector3();
const box = new THREE.Box3();
const loader = new Rhino3dmLoader()
loader.setLibraryPath( 'https://cdn.jsdelivr.net/npm/rhino3dm@7.11.1/' )

let controls; // Declare controls in the global scope

// Selection indices from ribbons => filename Models/AB.3dm (A = left index, B = right index)
let selectedLeftIdx = 0;
let selectedRightIdx = 0;
let currentModelObject = null; // track currently loaded object for slider control
let initialCameraSet = false;

function buildModelPath() {
  // A = first digit, B = second digit. Example top=0 bottom=5 -> 05.3dm
  const a = selectedLeftIdx; // 0-9
  const b = selectedRightIdx; // 0-9
  const file = `${a}${b}.3dm`;
  return `Models/${file}`;
}

function removePreviousModel() {
  if (!currentModelObject) return;
  if(transformControls && transformControls.object===currentModelObject) transformControls.detach();
  scene.remove(currentModelObject);
  currentModelObject = null;
}

function loadSelectedModel() {
  // If both indices are the same, show a quick message and skip loading
  if (selectedLeftIdx === selectedRightIdx) {
    showMessage('Redundant model combination (same indices)');
    return;
  }
  const path = buildModelPath();
  removePreviousModel();
  load(path);
}


// Left ribbon events
document.querySelectorAll('.left-ribbon img').forEach((img, idx) => {
  img.addEventListener('click', () => {
  document.querySelectorAll('.left-ribbon .selected').forEach(el => el.classList.remove('selected'));
    img.classList.add('selected');
  selectedLeftIdx = idx;
    loadSelectedModel();
  });
});

// Right ribbon events
document.querySelectorAll('.right-ribbon img').forEach((img, idx) => {
  img.addEventListener('click', () => {
  document.querySelectorAll('.right-ribbon .selected').forEach(el => el.classList.remove('selected'));
    img.classList.add('selected');
  selectedRightIdx = idx;
    loadSelectedModel();
  });
});

// Preload model 45 (left index 4, right index 5) at startup
// Apply selection classes and load the model before initialization completes
(() => {
  const leftImgs = document.querySelectorAll('.left-ribbon img');
  const rightImgs = document.querySelectorAll('.right-ribbon img');

  // Clear any existing selections just in case
  document.querySelectorAll('.left-ribbon .selected').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll('.right-ribbon .selected').forEach(el => el.classList.remove('selected'));
  // Set indices
  selectedLeftIdx = 4;
  selectedRightIdx = 5;
  // Visual selection
  leftImgs[4].classList.add('selected');
  rightImgs[5].classList.add('selected');
  // Load corresponding model (45.3dm)
  load(buildModelPath());
})();

init()

// hide spinner
animate()

// function to setup the scene, camera, renderer, and load 3d model
function init () {

    // Rhino models are z-up, so set this as the default
    THREE.Object3D.DefaultUp = new THREE.Vector3( 0, 0, 1 )

    // create a scene and a camera
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0.1,0.1,0.1);
    camera = new THREE.PerspectiveCamera( 10, window.innerWidth / window.innerHeight, 0.1, 100000 )
    camera.position.x = -30;
    camera.position.y = -30;
    camera.position.z = 30;

    // create the renderer and add it to the html
    renderer = new THREE.WebGLRenderer( { antialias: true, preserveDrawingBuffer: true } )
    renderer.setSize( window.innerWidth, window.innerHeight )
    document.body.appendChild( renderer.domElement )

    // add some controls to orbit the camera
    controls = new OrbitControls(camera, renderer.domElement);
  transformControls = new TransformControls(camera, renderer.domElement);
  transformControls.addEventListener('dragging-changed', e=> controls.enabled = !e.value );
  scene.add(transformControls);

  loadContextModel()

  const hemi = new THREE.HemisphereLight(0xbfd7ff, 0x3a332c, 2.5);
  scene.add(hemi);
  
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(-30, -25, 40);
  scene.add(key);

}

function loadContextModel(){
  if(contextModel) return;
  loader.load('assets/ctxt_model_simple.3dm', o=>{ 
    contextModel = o; 
    scene.add(o); 
    if(!initialCameraSet){
      const bbox = new THREE.Box3().setFromObject(o);
      const ctr = bbox.getCenter(new THREE.Vector3());
      const size = bbox.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x,size.y,size.z);
      const dist = maxDim * 1.8; // simple framing distance
      controls.target.copy(ctr);
      camera.position.set(ctr.x - dist, ctr.y - dist, ctr.z + dist);
      camera.updateProjectionMatrix();
      controls.update();
      initialCameraSet = true;
    }
  });
}

function load(model) {
  loader.load(
    model,
    function(object) {
      object.name = model; // Set the name of the loaded object
      scene.add(object);
      currentModelObject = object;
      if(transformControls) transformControls.attach(object);
      updateMeshVisibility();
    },
  );
}

// function to continuously render the scene
function animate() {

    requestAnimationFrame( animate )
    renderer.render( scene, camera )

}

function fitCameraToSelection(camera, controls, selection, fitOffset = 1.2) {
    box.makeEmpty();
    for(const object of selection) {
      box.expandByObject(object);
    }
    
    box.getSize(size);
    box.getCenter(center );
    
    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance = maxSize / (2 * Math.atan(Math.PI * camera.fov / 360));
    const fitWidthDistance = fitHeightDistance / camera.aspect;
    const distance = fitOffset * Math.max(fitHeightDistance, fitWidthDistance);
    
    const direction = controls.target.clone()
      .sub(camera.position)
      .normalize()
      .multiplyScalar(distance);
  
    controls.maxDistance = distance * 10;
    controls.target.copy(center);
    
    camera.near = distance / 100;
    camera.far = distance * 100;
    camera.updateProjectionMatrix();
  
    camera.position.copy(controls.target).sub(direction);
    
    controls.update();
  }

  function updateMeshVisibility() {
    if (!currentModelObject) return;
    const value = parseInt(slider.value || '0', 10);

    // Hide all child meshes
    currentModelObject.traverse(child => {
      if (child instanceof THREE.Mesh) child.visible = false;
    });
    // Show selected child if exists
    if (currentModelObject.children[value]) {
      currentModelObject.children[value].visible = true;
    }
  }

  function exportVisibleChildAsOBJ() {
    if (!currentModelObject) { showMessage('No model loaded'); return; }

    let target = null;
    currentModelObject.traverse(c => { if (!target && c.isMesh && c.visible) target = c; });
    if (!target) { showMessage('No visible mesh to export'); return; }

    const exporter = new OBJExporter();
    const objText = exporter.parse(target);
    const blob = new Blob([objText], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);

    const baseName = buildModelPath().split('/').pop().replace('.3dm','');
    const curIdx = parseInt(slider.value || '0', 10);
    const scaled = (curIdx / 10).toFixed(1); // simple value/10

    a.download = `${baseName}_part_${scaled}.obj`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    showMessage(`OBJ exported (${scaled})`);
  }

  // Hook download button (export visible child mesh)
  const dlBtn = document.querySelector('.download-btn');
  if (dlBtn) {
    dlBtn.addEventListener('click', () => exportVisibleChildAsOBJ());
  }

// Hide intro overlay on first click anywhere
const introOverlay = document.querySelector('.intro-overlay');
if (introOverlay) {
  const hideIntro = () => {
    introOverlay.style.display = 'none';
    document.removeEventListener('click', hideIntro, true);
  };
  document.addEventListener('click', hideIntro, true);
}

// Hotkeys: M=move  S=scale  R=rotate
window.addEventListener('keydown', e=>{
  if(!transformControls) return;
  const k = e.key.toLowerCase();
  if(k==='m') transformControls.setMode('translate');
  if(k==='s') transformControls.setMode('scale');
  if(k==='r') transformControls.setMode('rotate');
});

// Touch controls: buttons to toggle transform mode
const touchBar = document.querySelector('.controls-touch');
if (touchBar) {
  const buttons = Array.from(touchBar.querySelectorAll('.touch-btn'));
  const setActive = (mode) => {
    buttons.forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  };
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      if (transformControls) {
        transformControls.setMode(mode);
        setActive(mode);
      }
    }, { passive: true });
  });
  // Default highlight to Move
  setActive('translate');
}