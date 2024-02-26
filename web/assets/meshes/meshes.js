import *as THREE from "three"
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js"
let meshes={}


let glb = await (new GLTFLoader()).loadAsync('./assets/meshes/bolo.glb');
glb.scene.traverse(e=>e.isMesh && e.name && (meshes[e.name]=e));
let slice = Array.prototype.slice
for(let k in meshes){
    let a = meshes[k].geometry.attributes
    let i = meshes[k].geometry.index;
    meshes[k]={
        vertices:slice.call(a.position.array),
        normals:slice.call(a.normal.array),
        uvs:slice.call(a.uv.array),
        indices:slice.call(i.array),
    }
}
export default meshes;