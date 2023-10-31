import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
//import { Water } from 'three/addons/objects/Water.js';
//import { Sky } from 'three/addons/objects/Sky.js';
import { Lut } from 'three/addons/math/Lut.js';
import './main.css';

const container = document.getElementById( 'container' );

const scene = new THREE.Scene();

let uiScene, lut, orthoCamera;


const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.set( 50, 50, 50 );

scene.background = new THREE.Color( 0xf0f0f0 );

let group;

let sprite;

let raycaster, intersects;
let pointer, INTERSECTED;
//let water,sun;

raycaster = new THREE.Raycaster();
pointer = new THREE.Vector2();

//

// Create a tooltip div
const tooltip = document.createElement('div');
tooltip.className = 'tooltip';
tooltip.style.display = 'none';
document.body.appendChild(tooltip);

//

const renderer = new THREE.WebGLRenderer( { antialias: true });
renderer.autoClear = false;
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );
container.appendChild( renderer.domElement );

// Water

const waterGeometry = new THREE.PlaneGeometry( 100, 100 );
waterGeometry.rotateX(-Math.PI * 0.5); 

const waterMaterial = new THREE.MeshBasicMaterial( {color: 0x05C3DD, side: THREE.DoubleSide,transparent:true,opacity:0.5 });
const waterplane = new THREE.Mesh( waterGeometry, waterMaterial );

waterplane.name = "waterplane";
waterplane.visible = false;

scene.add( waterplane );

// mudline

const mudlineGeometry = new THREE.PlaneGeometry( 100, 100 );
mudlineGeometry.rotateX(-Math.PI * 0.5); 

const mudlineMaterial = new THREE.MeshBasicMaterial( {color: 0xC4A484, side: THREE.DoubleSide,transparent:true,opacity:0.5 });
const mudlineplane = new THREE.Mesh(mudlineGeometry, mudlineMaterial );

mudlineplane.name = "mudlineplane";
mudlineplane.visible = false;

scene.add( mudlineplane );


//

const controls = new OrbitControls( camera, renderer.domElement );

controls.listenToKeyEvents( window ); // optional
controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
controls.dampingFactor = 0.05;

controls.screenSpacePanning = true;

controls.minDistance = 10;
controls.maxDistance = 5000;

controls.maxPolarAngle = Math.PI / 2;

// create the group that will contain the meshes

group = new THREE.Group();

scene.add( group );


// lights

const dirLight1 = new THREE.DirectionalLight( 0xffffff, 3 );
dirLight1.position.set( 1, 1, 1 );
scene.add( dirLight1 );

const dirLight2 = new THREE.DirectionalLight( 0x002288, 3 );
dirLight2.position.set( - 1, - 1, - 1 );
scene.add( dirLight2 );

const ambientLight = new THREE.AmbientLight( 0x555555 );
scene.add( ambientLight );

// GUI

const gui = new GUI();

const myControls = {showSea: false,
showMudline:false,
showContour: false,
mudline:-55};

const folderSky = gui.addFolder( 'Sea and mudline' );
folderSky.add(myControls,'showSea').name('Show sea').onChange(updateSea);
folderSky.add(myControls,'showMudline').name('Show mudline').onChange(updateSea);
folderSky.add(myControls,'mudline').name('Mudline level').onChange(updateSea);

const propControls = {OD:0,Thk:0,Contour:false,ContourVal:'OD',ContourCol:'rainbow'};

const folderProps = gui.addFolder('Properties');
folderProps.add(propControls,'OD').name("Outer diameter").listen();
folderProps.add(propControls,'Thk').name("Thickness").listen();
folderProps.add(propControls,'Contour').name("Contour").onChange(updateContour);
folderProps.add(propControls,'ContourVal',['OD','ID','Thk']).name("Contour value").onChange(updateContour);
//folderProps.add(propControls,'ContourCol',['rainbow','cooltowarm']).name("Colourmap").onChange(updateContour);

//

// contour sprite

uiScene = new THREE.Scene();

lut = new Lut();

orthoCamera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 1, 2 );
orthoCamera.position.set( 0.9, 0, 1 );

sprite = new THREE.Sprite(
    new THREE.SpriteMaterial( {
        map: new THREE.CanvasTexture( lut.createCanvas() )
    } ) 
);

sprite.material.map.colorSpace = THREE.SRGBColorSpace;
//sprite.material.color.setColorName("red");
sprite.scale.x = 0.0125;
uiScene.add(sprite);
//uiScene.add(orthoCamera);

lut.setColorMap( 'rainbow');

lut.setMax( 2000 );
lut.setMin( 0 );

const map = sprite.material.map;
lut.updateCanvas( map.image );
map.needsUpdate = true;

// create the text of the legend as sprites
sprite.visible = false;


//
let tooltipTimeout;
// Function to show the tooltip
function showTooltip(event, content) {

    const meshWorldPosition = event.geometry.boundingSphere.center; //new THREE.Vector3();
    //event.getWorldPosition(meshWorldPosition);

    // Project the world position to screen coordinates
    const screenPosition = meshWorldPosition.clone().project(camera);

    // Get the absolute clientX and clientY
    const absoluteX = (screenPosition.x + 1) / 2 * window.innerWidth + 5;
    const absoluteY = (-screenPosition.y + 1) / 2 * window.innerHeight;
    //console.log("x = " +absoluteX.toFixed(2).toString() + " - y = " + absoluteY.toFixed(2).toString());

    tooltip.textContent = content;
    tooltip.style.left = absoluteX + 'px';
    tooltip.style.top = absoluteY + 'px';
    tooltip.style.display = 'block';

}

// Function to hide the tooltip
function hideTooltip() {

    tooltip.style.display = 'none';
}


function hasSelectorText(rule){
    return rule.selectorText !== undefined;
}

// Function to check if a stylesheet has a rule for a specific ID
function hasRuleForId(stylesheet, id) {
  for (let i = 0; i < stylesheet.cssRules.length; i++) {
    const rule = stylesheet.cssRules[i];
    
    // Check if the rule's selectorText contains the specific ID
    if (rule.selectorText && rule.selectorText.includes(`#${id}`)) {
      return true;
    }
  }
  
  return false;
}

function getStyleSheet(){


    for (let i = 0; i < document.styleSheets.length; i++) {
        const stylesheet = document.styleSheets[i];
        if (hasRuleForId(stylesheet,"keyoverlaystylesheetmarker"))
        {
            return stylesheet;
        }
        /*const href = stylesheet.href;

        if (href && href.includes('main.css')) {
            return stylesheet;
        }
        */
    }

    return null; // Return null if no matching stylesheet is found
}


function deleteLegendDivs(){
    const divsToDelete = document.querySelectorAll(".overlay");
    divsToDelete.forEach(function(div){
        div.parentNode.removeChild(div);
    });

}

function legendText(lowVal,highVal)
{
    // first find the style sheet we want

    // clear existing css rules for overlay
    let styleSheet = getStyleSheet(); //document.styleSheets[0];
    for (let i = styleSheet.cssRules.length-1; i>=0; i--)
    {
        // check there is a selector text for the rule to compure
        if (hasSelectorText(styleSheet.cssRules[i])){
            if (styleSheet.cssRules[i].selectorText.substring(0,8) === "#overlay"){
                styleSheet.deleteRule(i);
            }
        }
    }

    // clear the existing divs for the overlay
    deleteLegendDivs();

    // number of annotations on the legend
    let nvals = 8;

    // set the % abs position of the top and bottom legend text
    let topPos = 27;
    let bottomPos = 78;
    let cPos;

    for  (let i = 1; i<= nvals; i++){
        // add the styles
        cPos = topPos+(bottomPos-topPos)/(nvals-1) * (i-1);
        console.log(cPos);
        styleSheet.insertRule("#overlay" + i.toFixed(0).toString() + "{top: " + cPos.toFixed(3).toString() + "%;}")

        // create the divs
        const newDiv = document.createElement("div");
        newDiv.className = "overlay";
        newDiv.id = "overlay" + i.toFixed(0).toString();
        

        // add the text t the div
        let cval;
        if (i == 1)
        {
            cval = highVal;
        }
        else if(i == nvals)
        {
            cval = lowVal;
        }
        else
        {
            cval = (highVal-(highVal-lowVal)/(nvals)*i);
        }

        newDiv.innerHTML = (cval*1000).toFixed(0).toString() + " mm";
        
        // add the div
        document.body.appendChild(newDiv);
    }

}

/*
function clearLegend()
{
    var divs = document.querySelectorAll('.overlay'); // Get all divs with the specified class
    for (var i = 0; i < divs.length; i++) {
      divs[i].innerHTML = ''; // Clear the innerHTML of each div
    }
}
*/

window.addEventListener( 'resize', onWindowResize );
document.addEventListener( 'pointermove', onPointerMove );

animate();

function updateContour()
{

    if (propControls.Contour == true)
    {
        // update the lut colourmap
        lut.setColorMap( propControls.ContourCol);
        sprite.map = new THREE.CanvasTexture( lut.createCanvas());

        let limits = maxmins()
    
        let mymax,mymin;

        if (propControls.ContourVal=="Thk"){
            mymax = limits.maxThk;
            mymin = limits.minThk;
        }
        else if (propControls.ContourVal=="OD")
        {
            mymax = limits.maxOD;
            mymin = limits.minOD;
        }
        else{
            mymax = limits.maxID;
            mymin = limits.minID;
        }

        lut.setMin(mymin);
        lut.setMax(mymax);
        legendText(mymin,mymax);
        
        group.children.forEach((mesh) => {
            if (mesh instanceof THREE.Mesh)
            {
                let colVal;
                let myval;
                if (propControls.ContourVal == "Thk"){
                    myval = mesh.userData.thk;
                }
                else if (propControls.ContourVal == "OD")
                {
                    myval = mesh.userData.od;
                }
                else
                {
                    myval = mesh.userData.id;
                }
                colVal = (myval-mymin/(mymax-mymin));
                //mesh.material.color.set(colourScale((mesh.userData.thk-limits.minThk)/(limits.maxThk-limits.minThk)));

                let mycol;
                mycol = lut.getColor(myval);

                mesh.material.color.set(mycol);
                mesh.userData.lastCol = mycol;
                mesh.colorsNeedUpdate = true;
            }
        }
        )
        
        
        sprite.visible = true;
        
        //map.needsUpdate = true;

    }
    else
    {
        group.children.forEach((mesh) => {
            if (mesh instanceof THREE.Mesh)
            {
                mesh.material.color.setHex (0xF7B500);
                let lastCol = new THREE.Color().setHex(0xF7B500);
                mesh.userData.lastCol = lastCol;
                mesh.colorsNeedUpdate = true;
            }
        }
        );
        sprite.visible = false;
        //clearLegend();
        deleteLegendDivs();
    }
}

function maxmins()
{
    let maxThk = 0;
    let minThk = 999999;
    let maxOD = 0;
    let minOD = 999999;
    let maxID = 0;
    let minID = 999999;

    group.children.forEach((mesh) => {
        if (mesh instanceof THREE.Mesh)
        {
            if (mesh.userData.thk> maxThk)
            {
                maxThk = mesh.userData.thk;
            }
            if (mesh.userData.thk< minThk)
            {
                minThk = mesh.userData.thk;
            }

            if (mesh.userData.od> maxOD)
            {
                maxOD = mesh.userData.od;
            }
            if (mesh.userData.od< minOD)
            {
                minOD = mesh.userData.od;
            }

            if (mesh.userData.id> maxID)
            {
                maxID = mesh.userData.id;
            }
            if (mesh.userData.id< minID)
            {
                minID = mesh.userData.id;
            }
        }
    });

    return {maxThk: maxThk,minThk:minThk,maxOD:maxOD,minOD:minOD,maxID:maxID,minID:minID};
}


function updateSea(){
    if (myControls.showSea == false)
    {
        //console.log("false");
        scene.getObjectByName("waterplane").visible = false;
    }
    else
    {
        //console.log("true");
        scene.getObjectByName("waterplane").visible = true;
    }

    if (myControls.showMudline == false)
    {
        //console.log("false");
        scene.getObjectByName("mudlineplane").visible = false;
        
    }
    else
    {
        //console.log("true");
        scene.getObjectByName("mudlineplane").visible = true;
        scene.getObjectByName("mudlineplane").position.y = myControls.mudline;
    }
}

function animate() {
	requestAnimationFrame( animate );

	//cube.rotation.x += 0.01;
	//cube.rotation.y += 0.01;
    controls.update(); // only required if controls.enableDamping = true, or if controls.autoRotate = true

    render();
	renderer.render( scene, camera );
    renderer.render( uiScene, orthoCamera );
}

function render()
{
    raycaster.setFromCamera( pointer, camera );

    //const geometry = group.geometry;
    //const attributes = geometry.attributes;


    intersects = raycaster.intersectObject( group );

    if ( intersects.length > 0 ) {
        //console.log("hit");

        if ( INTERSECTED != intersects[0].object.uuid ) {

            // reset the colour
            if (INTERSECTED != null){
                INTERSECTED.material.color.set( INTERSECTED.userData.lastCol);
            }

            intersects[0].object.material.color.setHex('0xFF69B4'); //setColorName("red");
            
            propControls.OD = intersects[0].object.userData.od;
            propControls.Thk = intersects[0].object.userData.thk;

            INTERSECTED = intersects[0].object;

            showTooltip(INTERSECTED, 'OD = ' + (INTERSECTED.userData.od*1000).toFixed(0).toString() + ' mm\nID = '+ (INTERSECTED.userData.id*1000).toFixed(0).toString() +' mm\nThk = ' + (INTERSECTED.userData.thk*1000).toFixed(0).toString() + " mm");

        }


    } else if ( INTERSECTED !== null ) {

        //intersects[0].object.material.color.setColorName("grey");
        if (INTERSECTED != undefined){
            INTERSECTED.material.color.set( INTERSECTED.userData.lastCol);
        }
        INTERSECTED = null;
        hideTooltip();


    } 

    //renderer.clear();
    renderer.render( scene, camera );
    renderer.render( uiScene, orthoCamera );
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function onPointerMove( event ) {

    var rect = renderer.domElement.getBoundingClientRect();
    pointer.x = ( ( event.clientX - rect.left ) / ( rect.right - rect.left ) ) * 2 - 1;
    pointer.y = - ( ( event.clientY - rect.top ) / ( rect.bottom - rect.top) ) * 2 + 1;

    //pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    //pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

}

// Function to remove all meshes from the scene
function removeAllMeshes(object) {
    for (let i = object.children.length - 1; i >= 0; i--) {
        if(object.children[i].type === "Mesh")
            scene.remove(scene.children[i]);
        if(object.children[i].type=== "Group")
            removeAllMeshes(object.children[i]);
    }
}

function updateFromFile(filename){
    // read the file in to a JSON dict
    const reader = new FileReader();

    reader.onload = function (e) {
        const fileContent = e.target.result;
        try {
            const jsonData = JSON.parse(fileContent);
            console.log('Read JSON file:', jsonData);
            drawFromJson(jsonData);
        } catch (error) {
            console.error('Error parsing JSON:', error);
        }
    };

    reader.readAsText(filename);
}

document.getElementById('fileInput').addEventListener('change', function () {
    const fileInput = this;
    let lastModifiedTime = null;

    if (fileInput.files.length > 0) {
        const selectedFile = fileInput.files[0];
        lastModifiedTime = selectedFile.lastModified;

        console.log(lastModifiedTime);

        // read the file in to a JSOn dict
        updateFromFile(selectedFile);

        // Watch for changes in the selected file
        /*
        watchFile(selectedFile, function (content) {
            console.log("change");
            // do something with the contents
            // Call the function to remove all meshes
            //removeAllMeshes(scene);
            //updateFromFile(selectedFile);
            //draw();
        });
        */
    } else {

    }

    function watchFile(file, callback) {
        const checkInterval = 1000; // Check for changes every 1 second

        function checkFile() {
            fetch(file)
                .then((response) => response.blob())
                .then((blob) => {
                    if (blob.lastModified !== lastModifiedTime) {
                        // File has changed
                        lastModifiedTime = blob.lastModified;
                        const reader = new FileReader();
                        reader.onload = function () {
                            const content = reader.result;
                            callback(content);
                        };
                        reader.readAsText(blob);
                    }
                })
                .catch((error) => {
                    console.error('Error checking file:', error);
                });
        }

        // Periodically check the file for changes
        setInterval(checkFile, checkInterval);
    }
});

function drawFromJson(jsonData)
{

    for (const m in jsonData.members)
    {

        // loop through memebrs
        for (const e in jsonData.members[m].elements)
        {
            // loop through elements in member
            //console.log('e:', e);
            var start = [parseFloat(jsonData.members[m].elements[e].node_A['x']),parseFloat(jsonData.members[m].elements[e].node_A['y']),parseFloat(jsonData.members[m].elements[e].node_A['z'])];
            var end = [parseFloat(jsonData.members[m].elements[e].node_B['x']),parseFloat(jsonData.members[m].elements[e].node_B['y']),parseFloat(jsonData.members[m].elements[e].node_B['z'])];
            var dia_A = parseFloat(jsonData.members[m].elements[e].section.dia_A);
            var thk_A = parseFloat(jsonData.members[m].elements[e].section.thk_A);

            if (jsonData.members[m].elements[e].section.type === 'CylindricalHS')
            {
                group.add(pipe(start,end,dia_A,thk_A));
                //scene.add(pipe(start,end,dia_A,thk_A));
            }
            else{
                var dia_B = parseFloat(jsonData.members[m].elements[e].section.dia_B);
                var thk_B = parseFloat(jsonData.members[m].elements[e].section.thk_B);
                group.add(conic(start,end,dia_A,dia_B,thk_A,thk_B))
                //scene.add(conic(start,end,dia_A,dia_B,thk_A,thk_B));
                
            }

        }

    }

}

function pipe(start,end,diameter,thickness){
    
    let origin = [0,0];
    //let length = distanceBetweenPoints(start,end);

    const shape = new THREE.Shape()
        .moveTo( origin[0], origin[1] )
        .absarc( origin[0], origin[1], diameter/2, 0, Math.PI * 2, false );

    const hole = new THREE.Path()
        .moveTo( origin[0], origin[1] )
        .absarc( origin[0], origin[1], diameter/2-thickness, 0, Math.PI * 2, true );

        shape.holes.push( hole );
        
    let path = [
        new THREE.Vector3(start[0],start[2],start[1]),
        new THREE.Vector3(end[0],end[2],end[1])
    ];

    const extrudeSettings = {
        bevelEnabled: true, 
        bevelSegments: 0, 
        steps: 1, 
        bevelSize: 0, 
        bevelThickness: 0,
        extrudePath: new THREE.CatmullRomCurve3(path)
    };

    let color = new THREE.Color().setHex(0xF7B500);

    let geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    let mesh = new THREE.Mesh( geometry, new THREE.MeshPhongMaterial( { color: color } ) );

    // add some user data attributes
    let metaData = {od:diameter,thk:thickness,mg:1,lastCol:color,id:(diameter-2*thickness).valueOf()};
    mesh.userData = metaData;

    return mesh;
}

function conic(start,end,start_dia,end_dia,start_thk,end_thk)
{

    let startPoint = new THREE.Vector3(start[0],start[2],start[1]);
    let endPoint = new THREE.Vector3(end[0],end[2],end[1]);

    // stick has length equal to distance between endpoints
    const distance = startPoint.distanceTo(endPoint);

    let geometry = new THREE.CylinderGeometry(end_dia/2,start_dia/2,distance,32,true)

    // stick endpoints define the axis of stick alignment
    const { x:ax, y:ay, z:az } = startPoint
    const { x:bx, y:by, z:bz } = endPoint
    const stickAxis = new THREE.Vector3(bx-ax, by-ay, bz-az).normalize()

    // Use quaternion to rotate cylinder from default to target orientation
    const quaternion = new THREE.Quaternion()
    const cylinderUpAxis = new THREE.Vector3( 0, 1, 0 )
    quaternion.setFromUnitVectors(cylinderUpAxis, stickAxis)
    geometry.applyQuaternion(quaternion)

    // Translate oriented stick to location between endpoints
    geometry.translate((bx+ax)/2, (by+ay)/2, (bz+az)/2)


    let color = new THREE.Color().setHex(0xF7B500);

    let mesh = new THREE.Mesh( geometry, new THREE.MeshPhongMaterial( { color: color } ) );

    let metaData = {od:start_dia,thk:start_thk,mg:1,lastCol: color,id:(start_dia-2*start_thk).valueOf()};
    mesh.userData = metaData;

    return mesh;
}
