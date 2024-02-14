import camera from "./camera.js"

import *as THREE from "three"
let {
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  Mesh,
  BufferGeometry,
  CircleGeometry,
  BoxGeometry,
  MeshBasicMaterial,
  Vector3,
  AnimationMixer,
  Object3D,
  TextureLoader,
  Sprite,
  SpriteMaterial,
  RepeatWrapping,
} = THREE;

let renderer;


let _display;


var projection = new Float32Array(16);
var viewInverse = new Float32Array(16);
var viewProjectionInverse = new Float32Array(16);
var displayDefaults = function(){
	this.cameraModule=camera;
	this.camera = new camera.ModelCamera();
	this.camera.addMouseControls(canvas);
	this.camera.distance = 2;//80
	this.camera.setCenter([0, 0, 1]);

	this.renderedMeshes=0;
	this.renderedTriangles=0;
	this.fov = 45;
	this.nearDepth=0.1;
	this.farDepth=200.0;
	display.prototype.fov=this.fov;
	display.prototype.aspectRatio=canvas.width/canvas.height;
	mat4.perspective(this.fov, display.prototype.aspectRatio , this.nearDepth, this.farDepth, projection);
};

function display(){
	displayDefaults.call(this);
   renderer  = new WebGLRenderer()
   displayModule._display = this
    this.resize = (gl, canvas)=>{
        renderer.setSize(canvas.width,canvas.height,false);
    }
    this.geomBatch=()=>{return {}};
    this.instanceMesh=()=>{return {}};
    this.mesh=()=>{return {}};
	function meshRenderer(){
		this.updateMesh=()=>{
			
		}
	}
    this.meshRenderer = ()=>new meshRenderer();
this.destroyMesh=(mesh)=>{
	
}
    this.createFrameRenderer=()=>{
        //createFrameRenderer
    }
    this.renderComponent=(gobj,meshRenderer,shader)=>{
        //console.log('rc')
    }
    
    this.renderLoop=(gl, timing)=>{
        display.prototype.seconds = timing.time/1000.0;
//     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);		
        this.renderFrame(gl,timing);
    }
    this.initRTT=(gl,width,height)=>{
        return new THREE.WebGLRenderTarget(width,height)
    }
    _display = this;
}

display.prototype.alphaKeyDown = function(k){
	if(this.cameraModule.KeyboardState._pressedKeys[k.charCodeAt(0)])
		return true;
	return false;
};

display.prototype.alphaKeyPressed = function(k){
	var ck=k.charCodeAt(0);
	if(this.cameraModule.KeyboardState._pressedKeys[ck]&&
	   (!this.cameraModule.KeyboardState._debounceKeys[ck])){
			this.cameraModule.KeyboardState._debounceKeys[ck]=true;
			return true;
	}
	return false;
};

display.prototype.keyCodeDown = function(kc){
	if(this.cameraModule.KeyboardState._pressedKeys[kc])
		return true;
	return false;
};

var tmpRay={d:[0,0,0],o:[0,0,0]};
var v4t0=[0,0,0,0];
display.prototype.computePickRay=function(sx,sy,outRay){
	if(!outRay)outRay=tmpRay;
	v4t0[0]=sx*2/canvas.width-1;
	v4t0[1]=1-sy*2/canvas.height;
	v4t0[2]=0;
	v4t0[3]=1;
	mat4.multiplyVec4(viewProjectionInverse,v4t0);
	vec3.scale(v4t0,1.0/v4t0[3]);
	var cameraPos=mat4.getRowV3(viewInverse, 3, outRay.o);
	vec3.subtract(v4t0,cameraPos,outRay.d);
	vec3.normalize(outRay.d);
	return outRay;
}
let displayModule = {
    display,
//	display: display,
//	displayDefaults:displayDefaults,
	getDisplay: function(){return _display;},
//	cameraMatrix: cameraMatrix,
//	view: view,
	viewInverse,
    projection
};

export default displayModule;
