import camera from "./camera.js"

import*as THREE from "three"
let {Scene, WebGLRenderer, PerspectiveCamera, Mesh, BufferGeometry, CircleGeometry, BoxGeometry, MeshBasicMaterial, Vector3, AnimationMixer, Object3D, TextureLoader, Sprite, SpriteMaterial, RepeatWrapping, } = THREE;
import {OrbitControls} from "three/addons/controls/OrbitControls.js"

let renderer;

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

var v3t0 = nv3();
var v3t1 = nv3();
var v3t2 = nv3();
var v3t3 = nv3();
var v3t4 = nv3();
var v3t5 = nv3();
var v3t6 = nv3();
var v3t7 = nv3();
var v3t8 = nv3();
var v3t9 = nv3();

var projection = new Float32Array(16);
var viewInverse = new Float32Array(16);
var viewProjectionInverse = new Float32Array(16);
var displayDefaults = function() {
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

let scene;
let orbitControls;
function display() {
    displayDefaults.call(this);
    renderer = new WebGLRenderer({
        canvas
    })
    renderer.setClearColor(0x905040)
    scene = new THREE.Scene();
    scene.add(this.camera.perspectiveCamera)

	this.camera.perspectiveCamera.position.set(20, 20, 20);
	this.camera.perspectiveCamera.lookAt(scene.position);
	this.camera.perspectiveCamera.updateMatrix();

let dirLight = new THREE.DirectionalLight();
	scene.add(dirLight);
	dirLight.position.set(0,0,10)
	
	orbitControls = new OrbitControls(this.camera.perspectiveCamera,renderer.domElement)
    displayModule._display = this
    this.resize = (gl,canvas)=>{
        renderer.setSize(canvas.width, canvas.height, false);
    }
    function meshRenderer(mesh, shader) {
        this.mesh = mesh;
        this.shader = shader;
        this.updateMesh = ()=>{
        }
        this.render = ()=>{
        }
    }
    this.meshRenderer = (gl,mesh,shader)=>new meshRenderer(mesh,shader);
    this.destroyMesh = (gl,mesh)=>{
        if (!mesh.parent) {
            debugger ;
        }
        scene.remove(mesh);
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
    var ck = k.charCodeAt(0);
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
    var cw = 0.5;
    //canvas.clientWidth*0.5;
    var ch = 0.5;
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

function setViewProjection(view, projection) {
    if (!_display.view) {
        return;
        let ma = _display.camera.perspectiveCamera.matrix.elements;
        for (let i = 0; i < 16; i++)
            ma[i] = view[i];

        _display.camera.perspectiveCamera.updateMatrixWorld(true);
        return;
    }

    mat4.set(view, _display.view);
    mat4.set(projection, _display.projection);
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
var frustumCenter = [0, 0, 0];
display.prototype.startRendering = function(viewCamera) {
    var camera = viewCamera ? viewCamera : this.camera;
    vec3.scale(camera._center, -1.0, frustumCenter);
    mat4.getColV3(camera._viewMat, 2, v3t0);
    vec3.scale(v3t0, this.farDepth / -2, v3t0);
    vec3.add(v3t0, frustumCenter, frustumCenter);
    setViewProjection(camera.getViewMat(), projection);
}
;

var renderedShaders = [];
var renderedShaderTop = 0;
display.prototype.renderActiveShaders = function(passIndex) {
	orbitControls.update()
    renderer.render(scene, this.camera.perspectiveCamera)
    for (var t = 0; t < renderedShaderTop; t++) {
        var shd = renderedShaders[t];
        if (shd.passIndex == passIndex)
            shd.render();
    }
}
;

display.prototype.finishRendering = function() {
    for (var t = 0; t < renderedShaderTop; t++) {
        var shd = renderedShaders[t];
        shd.displayTop = 0;
    }
    renderedShaderTop = 0;
}
;

var tmpRay = {
    d: [0, 0, 0],
    o: [0, 0, 0]
};
var v4t0 = [0, 0, 0, 0];
display.prototype.computePickRay = function(sx, sy, outRay) {
    if (!outRay)
        outRay = tmpRay;
    v4t0[0] = sx * 2 / canvas.width - 1;
    v4t0[1] = 1 - sy * 2 / canvas.height;
    v4t0[2] = 0;
    v4t0[3] = 1;
    mat4.multiplyVec4(viewProjectionInverse, v4t0);
    vec3.scale(v4t0, 1.0 / v4t0[3]);
    var cameraPos = mat4.getRowV3(viewInverse, 3, outRay.o);
    vec3.subtract(v4t0, cameraPos, outRay.d);
    vec3.normalize(outRay.d);
    return outRay;
}

display.prototype.instanceMesh = function(mesh, onto, mat) {
    var vbase = onto.vertices.length;
    onto.vertices = onto.vertices.concat(mesh.vertices);
    var vend = onto.vertices.length;
    onto.normals = onto.normals.concat(mesh.normals);
    onto.uvs = onto.uvs.concat(mesh.uvs);
    var ibase = onto.indices.length;
    onto.indices = onto.indices.concat(mesh.indices);
    var iend = onto.indices.length;
    var vtop = vbase / 3;
    for (var t = ibase; t < iend; t++) {
        onto.indices[t] += vtop;
    }
    //451 2058
    if (mat)
        for (var t = vbase; t < vend; t += 3) {
            for (var i = 0; i < 3; i++)
                v3t0[i] = onto.vertices[t + i];
            //var vt=onto.vertices.slice(t,t+3);
            mat4.multiplyVec3(mat, v3t0);
            for (i = 0; i < 3; i++)
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
    //	var m = ;
    //if(vertices)m.vertices=newBuffer(gl,gl.ARRAY_BUFFER,new Float32Array(vertices));
    //if(normals)m.normals=newBuffer(gl,gl.ARRAY_BUFFER,new Float32Array(normals));
    //if(uvs)m.uvs=newBuffer(gl,gl.ARRAY_BUFFER,new Float32Array(uvs));
    let g = new THREE.BufferGeometry();
    if (vertices)
        g.setAttribute('position', new THREE.Float32BufferAttribute(vertices,3));
    if (normals)
        g.setAttribute('normal', new THREE.Float32BufferAttribute(normals,3));
    if (uvs)
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs,2));

    if (indices) {
        g.setIndex(indices);
        //		m.indices=newBuffer(gl,gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices));
        g.elemCount = indices.length / 3;
    }
    let mesh = new THREE.Mesh(g,defMat)
    scene.add(mesh)
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
