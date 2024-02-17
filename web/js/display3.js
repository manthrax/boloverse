
import {vec3,mat4} from "./util/gl-matrix.js"
import camera from "./camera.js"

import*as THREE from "three"
let {Scene, WebGLRenderer, PerspectiveCamera, Mesh, BufferGeometry, CircleGeometry, BoxGeometry, MeshBasicMaterial, Vector3, AnimationMixer, Object3D, TextureLoader, Sprite, SpriteMaterial, RepeatWrapping, } = THREE;
import {OrbitControls} from "three/addons/controls/OrbitControls.js"

let renderer;
let root;
let scene;
let orbitControls;

let _display;

function v3cp(to, from) {
    if (!to)
        return [0, 0, 0];
    if (!from)
        return [to[0], to[1], to[2]];
    to[0] = from[0];
    to[1] = from[1];
    to[2] = from[2];
    return to;
}
function nv3() {
    return v3cp();
}

let v3t0 = nv3();
let v3t1 = nv3();
let v3t2 = nv3();
let v3t3 = nv3();
let v3t4 = nv3();
let v3t5 = nv3();
let v3t6 = nv3();
let v3t7 = nv3();
let v3t8 = nv3();
let v3t9 = nv3();

let projection = new Float32Array(16);
let projectionInverse = new Float32Array(16);
let viewInverse = new Float32Array(16);
let viewProjection = new Float32Array(16);
let viewProjectionInverse = new Float32Array(16);
let viewInverseTranspose = new Float32Array(16);
let displayDefaults = function() {
    this.cameraModule = camera;
    this.camera = new camera.ModelCamera();

    this.camera.addMouseControls(canvas);
    this.camera.distance = 2;
    //80
    this.camera.setCenter([0, 0, 1]);

    this.renderedMeshes = 0;
    this.renderedTriangles = 0;
    this.fov = 45;
    this.nearDepth = 0.1;
    this.farDepth = 200.0;
    display.prototype.fov = this.fov;
    display.prototype.aspectRatio = canvas.width / canvas.height;
    mat4.perspective(this.fov, display.prototype.aspectRatio, this.nearDepth, this.farDepth, projection);
};


function display() {
    displayDefaults.call(this);
    renderer = new WebGLRenderer({
		antialias:true,
        canvas
    })
	renderer.outputColorSpace = 'srgb'
    renderer.setClearColor(0x203080)
    scene = new THREE.Scene();
	
	root = new THREE.Group();
	root.rotation.x=-Math.PI*.5;
	root.updateMatrix();
	root.matrixAutoUpdate = false;
    scene.add(this.camera.perspectiveCamera)
	scene.add(root);

	this.camera.perspectiveCamera.position.set(20, 20, 20);
	this.camera.perspectiveCamera.lookAt(root.position);
	this.camera.perspectiveCamera.updateMatrix();

let dirLight = new THREE.DirectionalLight('white',1.);
	scene.add(dirLight);
	dirLight.position.set(0,30,0)
	
	orbitControls = new OrbitControls(this.camera.perspectiveCamera,renderer.domElement)
    displayModule._display = this
    this.resize = (gl,canvas)=>{

		if (canvas.width != window.innerWidth ||
			canvas.height != window.innerHeight) {
		  // Change the size of the canvas to match the size it's being displayed
		  canvas.width = window.innerWidth;
		  canvas.height = window.innerHeight;
		}
		this.camera.perspectiveCamera.aspect = canvas.width/canvas.height;
		this.camera.perspectiveCamera.updateProjectionMatrix();
		
        renderer.setSize(canvas.width, canvas.height, false);
    }
	
	window.onresize=()=>{
		this.resize(canvas.gl,canvas);
	}

    function meshRenderer(mesh, shader) {
        this.mesh = mesh;
        this.shader = shader;
        this.updateMesh = (patch)=>{
			let m = patch.matrix;
			let a = this.mesh.matrix.elements;
			for(let i=0;i<16;i++)a[i]=m[i]
        }
		this.destroy=function(){
			if(this.mesh)
				if(this.mesh.parent)this.mesh.parent.remove(this.mesh)
			delete this.mesh;
		}
        this.render=function(){
        }
    }
    this.meshRenderer = (gl,mesh,shader)=>new meshRenderer(mesh,shader);
    this.destroyMesh = (gl,mesh)=>{
        if (!mesh.parent) {
            console.log('Bad destroyMesh:',mesh.geometry.vertices) ;
			return;
            debugger ;
        }
        root.remove(mesh);
        //debugger
    }
    this.createFrameRenderer = ()=>{//createFrameRenderer
    }
    this.renderComponent = (gobj,meshRenderer,shader)=>{
        //console.log('rc')
        let e0 = meshRenderer.mesh.matrix.elements;
        for (let i = 0; i < 16; i++)
            e0[i] = gobj.matrix[i];

        meshRenderer.mesh.updateMatrixWorld();
    }

    this.renderLoop = (gl,timing)=>{
        display.prototype.seconds = timing.time / 1000.0;
        //     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);		
        this.renderFrame(gl, timing);
    }
    this.initRTT = (gl,width,height)=>{
        return new THREE.WebGLRenderTarget(width,height)
    }
    _display = this;
}

display.prototype.alphaKeyDown = function(k) {
    if (this.cameraModule.KeyboardState._pressedKeys[k.charCodeAt(0)])
        return true;
    return false;
}
;

display.prototype.alphaKeyPressed = function(k) {
    let ck = k.charCodeAt(0);
    if (this.cameraModule.KeyboardState._pressedKeys[ck] && (!this.cameraModule.KeyboardState._debounceKeys[ck])) {
        this.cameraModule.KeyboardState._debounceKeys[ck] = true;
        return true;
    }
    return false;
}
;

display.prototype.keyCodeDown = function(kc) {
    if (this.cameraModule.KeyboardState._pressedKeys[kc])
        return true;
    return false;
}
;

function orthoLookAt(at, from, up, rng, dpth) {
    mat4.translation(orthoWorld, [0, 0, 0]);
    mat4.inverse(world, orthoWorldInverse);
    mat4.transpose(orthoWorldInverse, orthoWorldInverseTranspose);
    let cw = 0.5;
    //canvas.clientWidth*0.5;
    let ch = 0.5;
    //canvas.clientHeight*0.5;
    if (rng)
        cw = ch = rng;
    mat4.ortho(orthoProjection, -cw, cw, -ch, ch, 0.0, dpth ? dpth : g_FarZ);
    mat4.lookAt(orthoView, at, from, up);
    mat4.inverse(orthoViewInverse, orthoView);
    mat4.inverse(orthoProjectionInverse, orthoProjection);
    mat4.multiply(orthoView, orthoProjection, orthoViewProjection);
    mat4.inverse(orthoViewProjectionInverse, orthoViewProjection);
    mat4.multiply(orthoWorld, orthoViewProjection, orthoWorldViewProjection);
}

function setViewProjection(camera, projection) {
	let view = camera.getViewMat()
    //if (!_display.view)
	{
        //return;
		/*
		root.attach(cam);
        let ma = cam.matrix.elements;
        for (let i = 0; i < 16; i++)
            ma[i] = view[i];
		cam.matrix.decompose(cam.position,cam.quaternion,cam.scale)
		scene.attach(cam);
        orbitControls.target.set(0,0,-1).applyQuaternion(cam.quaternion).add(cam.position);
		*/
		let cam = _display.camera.perspectiveCamera;
		let cent=camera.getCenter();
		cam.position.sub(orbitControls.target)
		 root.localToWorld(orbitControls.target.set(...cent).multiplyScalar(-1));
		cam.position.add(orbitControls.target)
		//.applyQuaternion(cam.quaternion).add(cam.position);
		
		//_display.camera.perspectiveCamera.updateMatrixWorld(true);
        //return;
    }

    //mat4.set(view, _display.view);
    //mat4.set(projection, _display.projection);
    mat4.inverse(view, viewInverse);
    mat4.transpose(viewInverse, viewInverseTranspose);
    mat4.inverse(projection, projectionInverse);
    mat4.multiply(projection, view, viewProjection);
    mat4.inverse(viewProjection, viewProjectionInverse);

    //Compute frustum
    /*
	fast.matrix4.getAxis(v3t3, viewInverse, 0); // x
	fast.matrix4.getAxis(v3t4, viewInverse, 1); // y;
	fast.matrix4.getAxis(v3t5, viewInverse, 2); // z;
	fast.matrix4.getAxis(v3t6, viewInverse, 3); // z;


	matrixSetRowVector3(cameraMatrix,0,v3t3)
	matrixSetRowVector3(cameraMatrix,1,v3t4)
	matrixSetRowVector3(cameraMatrix,2,v3t5)
	matrixSetRowVector3(cameraMatrix,3,g_eyePosition);
	cameraMatrix[15]=1.0;
	*/
    //mat4.transpose(viewInverse,cameraMatrix);

    mat4.getRowV3(viewInverse, 0, v3t3);
    // x
    mat4.getRowV3(viewInverse, 1, v3t4);
    // y;
    mat4.getRowV3(viewInverse, 2, v3t5);
    // z;
    mat4.getRowV3(viewInverse, 3, v3t6);
    // t;

}
let frustumCenter = [0, 0, 0];
display.prototype.startRendering = function(viewCamera) {
    let camera = viewCamera ? viewCamera : this.camera;
    vec3.scale(camera._center, -1.0, frustumCenter);
    mat4.getColV3(camera._viewMat, 2, v3t0);
    vec3.scale(v3t0, this.farDepth / -2, v3t0);
    vec3.add(v3t0, frustumCenter, frustumCenter);
    setViewProjection(camera, projection);
}
;

let renderedShaders = [];
let renderedShaderTop = 0;
display.prototype.renderActiveShaders = function(passIndex) {
	orbitControls.update()
    renderer.render(scene, this.camera.perspectiveCamera)
    for (let t = 0; t < renderedShaderTop; t++) {
        let shd = renderedShaders[t];
        if (shd.passIndex == passIndex)
            shd.render();
    }
}
;

display.prototype.finishRendering = function() {
    for (let t = 0; t < renderedShaderTop; t++) {
        let shd = renderedShaders[t];
        shd.displayTop = 0;
    }
    renderedShaderTop = 0;
}
;

let tmpRay = {
    d: [0, 0, 0],
    o: [0, 0, 0]
};
let v4t0 = [0, 0, 0, 0];
//let tv0 = new THREE.Vector3();


let raycaster=new THREE.Raycaster()
let tv0 = new THREE.Vector3();
display.prototype.computePickRay = function(sx, sy, outRay) {
    if (!outRay)
        outRay = tmpRay;

	tv0.set(sx * 2 / canvas.width - 1,1 - sy * 2 / canvas.height,0);
    /*
	v4t0[0] = sx * 2 / canvas.width - 1;
    v4t0[1] = 1 - sy * 2 / canvas.height;
    v4t0[2] = 0;
    v4t0[3] = 1;
    mat4.multiplyVec4(viewProjectionInverse, v4t0);
    vec3.scale(v4t0, 1.0 / v4t0[3]);
    let cameraPos = mat4.getRowV3(viewInverse, 3, outRay.o);
    vec3.subtract(v4t0, cameraPos, outRay.d);
    vec3.normalize(outRay.d);
	*/
	raycaster.setFromCamera(tv0, this.camera.perspectiveCamera );

	let ro=raycaster.ray.origin;
	let rd = raycaster.ray.direction
	root.worldToLocal(ro)
	root.worldToLocal(rd)
	outRay.o=[ro.x,ro.y,ro.z]
	outRay.d=[rd.x,rd.y,rd.z]
    return outRay;
}

display.prototype.instanceMesh = function(mesh, onto, mat) {
    let vbase = onto.vertices.length;
    onto.vertices = onto.vertices.concat(mesh.vertices);
    let vend = onto.vertices.length;
    onto.normals = onto.normals.concat(mesh.normals);
    onto.uvs = onto.uvs.concat(mesh.uvs);
    let ibase = onto.indices.length;
    onto.indices = onto.indices.concat(mesh.indices);
    let iend = onto.indices.length;
    let vtop = vbase / 3;
    for (let t = ibase; t < iend; t++) {
        onto.indices[t] += vtop;
    }
    //451 2058
    if (mat)
        for (let t = vbase; t < vend; t += 3) {
            for (let i = 0; i < 3; i++)
                v3t0[i] = onto.vertices[t + i];
            //let vt=onto.vertices.slice(t,t+3);
            mat4.multiplyVec3(mat, v3t0);
            for (let i = 0; i < 3; i++)
                onto.vertices[t + i] = v3t0[i];
        }
}
display.prototype.geomBatch = function(v, i, n, u) {
    return {
        vertices: v ? v : [],
        indices: i ? i : [],
        normals: n ? n : [],
        uvs: u ? u : []
    }
}

let defMat = new THREE.MeshStandardMaterial();

display.prototype.mesh = function(gl, vertices, indices, normals, uvs) {

    let g = new THREE.BufferGeometry();
    if (vertices)
        g.setAttribute('position', new THREE.Float32BufferAttribute(vertices,3));
    if (normals)
        g.setAttribute('normal', new THREE.Float32BufferAttribute(normals,3));
    if (uvs)
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2));

    if (indices) {
        g.setIndex(indices);
        g.elemCount = indices.length / 3;
    }
    let mesh = new THREE.Mesh(g,defMat)
    root.add(mesh)
    mesh.matrixAutoUpdate = false;
    return mesh;
}

let displayModule = {
    display,
    //	display: display,
    //	displayDefaults:displayDefaults,
    getDisplay: function() {
        return _display;
    },
    //	cameraMatrix: cameraMatrix,
    //	view: view,
    viewInverse,
    projection
};

export default displayModule;
