// Import libraries
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Rhino3dmLoader } from 'three/addons/loaders/3DMLoader.js'
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js'

// declare variables to store scene, camera, and renderer
let scene, camera, renderer

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

function buildModelPath() {
  // A = first digit, B = second digit. Example top=0 bottom=5 -> 05.3dm
  const a = selectedLeftIdx; // 0-9
  const b = selectedRightIdx; // 0-9
  const file = `${a}${b}.3dm`;
  return `Models/${file}`;
}

function removePreviousModel() {
  if (!currentModelObject) return;
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

// call functions
init()

// hide spinner
animate()

// function to setup the scene, camera, renderer, and load 3d model
function init () {

    // Rhino models are z-up, so set this as the default
    THREE.Object3D.DefaultUp = new THREE.Vector3( 0, 0, 1 )

    // create a scene and a camera

    scene = new THREE.Scene()
    scene.background = new THREE.Color(0.03,0.03,0.03)
    camera = new THREE.PerspectiveCamera( 10, window.innerWidth / window.innerHeight, 0.1, 1000 )
    camera.position.x = -30;
    camera.position.y = -30;
    camera.position.z = 30;

    // create the renderer and add it to the html
    renderer = new THREE.WebGLRenderer( { antialias: true, preserveDrawingBuffer: true } )
    renderer.setSize( window.innerWidth, window.innerHeight )
    document.body.appendChild( renderer.domElement )

    // add some controls to orbit the camera
    controls = new OrbitControls(camera, renderer.domElement);

    // add a directional light
    const directionalLight = new THREE.DirectionalLight( 0xffffff )
    directionalLight.intensity = 2
    directionalLight.position.set(-1, -1, 1);

    scene.add( directionalLight )

    const ambientLight = new THREE.AmbientLight();
    scene.add(ambientLight);

}

function load(model) {
  loader.load(
    model,
    function(object) {
      object.name = model; // Set the name of the loaded object
      scene.add(object);
      currentModelObject = object;
      fitCameraToSelection(camera, controls, [object]);
      updateMeshVisibility();
    },
    undefined,
    function(err) {
      console.error(`Failed to load ${model}`, err);
    }
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