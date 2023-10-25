// Import libraries
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { Rhino3dmLoader } from 'three/addons/loaders/3DMLoader.js'

// declare variables to store scene, camera, and renderer
let scene, camera, renderer

const slider = document.querySelector('.vertical-slider');
slider.setAttribute("min", 0);
slider.setAttribute("max", 8); // Since there are 9 meshes, the index will be 0 to 8
slider.addEventListener('input', updateMeshVisibility);



// set up the loader
const size = new THREE.Vector3();
const center = new THREE.Vector3();
const box = new THREE.Box3();
const loader = new Rhino3dmLoader()
loader.setLibraryPath( 'https://cdn.jsdelivr.net/npm/rhino3dm@7.11.1/' )

let controls; // Declare controls in the global scope
// load multiple models
// create an array of model names
const models = ['model/2_1_Valley_Y_House.3dm']
for ( let i = 0; i < models.length; i ++ ) {

    load( models[ i ] )

}
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
    loader.load(model, function(object) {
        object.name = model; // Set the name of the loaded object
        scene.add(object);

        // Call fitCameraToSelection after adding the object to the scene.
        fitCameraToSelection(camera, controls, [object]);
        updateMeshVisibility();
    });
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
    // Get the value of the slider
    const value = parseInt(slider.value || "0", 10); // Default to "0" if no value

    // Loop through all loaded models
    for (let model of models) {
        // Loop through all children of the model
        scene.traverse(child => {
            // Assuming the children are all meshes and are direct children of the model
            if (child instanceof THREE.Mesh) {
                if (child.parent.name === model) { // This is to ensure that we're only checking direct children of our model
                    // Hide all meshes
                    child.visible = false;
                }
            }
        });
        
        // Get the model object from the scene by its name
        const modelObject = scene.getObjectByName(model);

        // Show only the desired mesh
        if (modelObject && modelObject.children[value]) {
            modelObject.children[value].visible = true;
        }
    }
}