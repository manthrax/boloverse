

let prefix=`
uniform sampler2D uTextures[12];

vec4 lookupTileTexture( int idx , vec2 uv){
    if(idx==0) return texture(uTextures[0],uv);
    else if(idx==1)return texture(uTextures[1],uv);
    else if(idx==2)return texture(uTextures[2],uv);
    else if(idx==3)return texture(uTextures[3],uv);
    else if(idx==4)return texture(uTextures[4],uv);
    else if(idx==5)return texture(uTextures[5],uv);
    else if(idx==6)return texture(uTextures[6],uv);
    else if(idx==7)return texture(uTextures[7],uv);
    else if(idx==8)return texture(uTextures[8],uv);
    else if(idx==9)return texture(uTextures[9],uv);
    else if(idx==10)return texture(uTextures[10],uv);
    else if(idx==11)return texture(uTextures[11],uv);//dafuuuuuuuuk
}
`

let fragshader=`
#ifdef USE_MAP

//gl_FragColor*=vec4(0.1,0.25,1.,1.);

vec2 pd = vec2(.5/256.,0.);

vec2 uv = vMapUv;// * 128.;

vec2 tuv = vMapUv * 64.;

vec4 xx = lookupTileTexture(int((texture(map,uv+pd.xy).a*256.)+.5),tuv);
vec4 xy = lookupTileTexture(int((texture(map,uv+pd.xx).a*256.)+.5),tuv);
vec4 yx = lookupTileTexture(int((texture(map,uv+pd.yx).a*256.)+.5),tuv);
vec4 idx = lookupTileTexture(int((texture(map,uv     ).a*256.)+.5),tuv);
vec2 flt = uv/pd.x;


//flt = smoothstep(.2,.8,flt-floor(flt));

vec2 fflt = floor(flt);
flt = smoothstep(fflt-.1,fflt+1.1,flt);

//flt = step(fflt+.5,flt);

//flt = fract(flt);
//flt = clamp(flt-floor(flt)-.01,0.,1.);


vec4 fx = mix(idx,xx,flt.x);
vec4 fy = mix(yx,xy,flt.x);

gl_FragColor = mix(fx,fy,flt.y);

//vec4 blend = texture(uTextures[8],uv);
//gl_FragColor = lookupTileTexture(idx,uv);
//gl_FragColor = lookupTileTexture(idx,uv);
//gl_FragColor = sampledDiffuseColor;
//gl_FragColor.r = 1.;
//}
#endif

`
let urls=`alpine_cliff_b.png
alpine_cliff_c.png
alpine_cliff_snow.png
alpine_grass.png
alpine_grass_rocky.png
desert_plants_b.png
desert_sand_dunes_100.png
river_water.png
ocean_water.jpg
asphalt.jpg
blendmap3.jpg`.split('\n')


let texbindings = {
    Building: "alpine_grass_rocky",
    Crater: "alpine_cliff_b",
    Forest: "alpine_grass",
    Grass: "alpine_grass",
    Ocean: "river_water",
    River: "ocean_water",
    RiverWithBoat: "river_water",
    Road: "asphalt",
    Rubble: "desert_plants_b",
    ShotBuilding: "alpine_grass_rocky",
    Swamp: "alpine_grass_rocky_snow"
}
let texidmap={}
//alpine_cliff_a_norm.png
//desert_plants_b_norm.png 
//  desert_sand_dunes_100_norm.png





    let maptiles;
let textures;
let mapshader
let plane;
let uniforms;
let meshes={}
let cmap = {
    Building:{color: "#d5d5a5",height:25},
    Crater: {color: "#e94b20"},
    Forest: {color: "#13dd13"},
    Grass: {color: "#3ff31d"},
    Ocean: {color: "#372ef9"},
    River: {color: "#40b6b6"},
    RiverWithBoat: {color: "#209696"},
    Road: {color: "#404040"},
    Rubble: {color: "#202000"},
    ShotBuilding: {color: "#d5cfe5"},
    Swamp: {color: "#2faf29"}
}
let cid;
export default function bolomapshader({THREE,scene,gltfLoader}){


    this.init=async ()=>{


        if(textures)return;
        textures = [];
        let loader = new THREE.TextureLoader();
        for(let i=0;i<urls.length;i++){
            let url = urls[i]
            let tex = await loader.loadAsync('./assets/textures/'+url)
            textures.push(tex );
            tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
            tex.colorSpace = 'srgb'
            let tm = url.slice(0,url.lastIndexOf('.'))
            texidmap[tm]=i;
        }
        for(let k in texbindings)
            texbindings[k]=texidmap[texbindings[k]];
        mapshader = new THREE.MeshStandardMaterial();
        mapshader.onBeforeCompile = (shader,renderer)=>{
            uniforms = shader.uniforms;
            shader.uniforms.uTextures={
                value:textures
            }
            shader.fragmentShader = shader.fragmentShader.replace('#include <common>',`
                #include <common>
                ${prefix}`)
            shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>',`
                #include <dithering_fragment>
                ${fragshader}
                //`)
        }
        let sz = 1280;
        let csz = 1280/256;
        plane = new THREE.Mesh(new THREE.PlaneGeometry(sz,sz,16,16),mapshader)
        plane.geometry.rotateX(Math.PI*-.5)
        plane.geometry.translate(-.25*csz,0.25,.25*csz);
        
       // cid = Object.keys(cmap);
        //cid.forEach((k,i)=>cmap[k]=i);


        maptiles = await gltfLoader.loadAsync('./assets/meshes/maptiles.glb')

        maptiles.scene.traverse((o)=>{
            if(o.isMesh){
                let m = o;
                //m.geometry.rotateX(-Math.PI*.5)
                let scl = .5;
                m.geometry.scale(scl,scl,scl)
                meshes[m.name]=m;
            }
        })
    }
    this.create=(map)=>{
        let canvas = document.createElement('canvas')
        let ctx = canvas.getContext('2d')
        canvas.width=canvas.height = 256;
        ctx.fillStyle='lightblue'
        ctx.fillRect(0,0,256,256);
        let id = ctx.getImageData(0,0,256,256);
        let dv = new DataView(id.data.buffer);
        
        map.map.forEach((me,mi)=>dv.setUint32(mi*4,texbindings[me[0].name],false))
        
        ctx.putImageData(id,0,0);
        let ctex = new THREE.CanvasTexture(canvas);
        ctex.flipY = false;
        ctex.minFilter = ctex.magFilter = THREE.NearestFilter;
        mapshader.map = ctex;
        scene.add(plane)
    }

    this.createInstances=(map)=>{
        
        let m = map.map;
        let ilist = []
        let gen=(type,x,y,ang)=>ilist.push({type,x,y,ang})
        let mxy=(x,y)=>m[(y*256)+x]
        for(let i=0;i<(256*256);i++){
            let x=i%256;
            let y=(i/256)|0;
            if((!x)||(!y)||(x==255)||(y==255)) continue
            let ttype=mxy(x,y)[0].name;
            if(ttype=='Ocean')continue;
            let nbs = [mxy(x,y-1),mxy(x+1,y),mxy(x,y+1),mxy(x-1,y)]
            let diffct=nbs.filter(n=>ttype!=n[0].name).length;
            let diffs=nbs.map(n=>ttype!=n[0].name);

            if(diffct==4){
                gen('circle',x,y)
            }
            if(diffct==3){
                let ang=1;
                if(!diffs[1])ang=2
                if(!diffs[2])ang=3
                if(!diffs[3])ang=0
                gen('cap',x,y,ang)
            }if(diffct==2){
                if((diffs[0]&&diffs[2])||(diffs[1]&&diffs[3]))
                    gen('fill',x,y)    //Filled
                else{
                    let ang = 2;
                    if(diffs[0]&&diffs[1])ang=3;
                    if(diffs[1]&&diffs[2])ang=0;
                    if(diffs[2]&&diffs[3])ang=1;
                        
                    gen('corner',x,y,ang)  //Corner  
                }
            }
            if(diffct==1)
                gen('fill',x,y)
            if(diffct==0)
                gen('fill',x,y)
        }
        let cts={}
        ilist.forEach(g=>(cts[g.type]&&cts[g.type].push(g)) || (cts[g.type]=[g]))
        for(let k in cts)
            cts[k]={items:cts[k],instances:new THREE.InstancedMesh(meshes[k].geometry,meshes[k].material,cts[k].length)}
        let mat = new THREE.Matrix4();
        let rot = new THREE.Matrix4();
        let col = new THREE.Color()
        for(let k in cts){
            let {items,instances}=cts[k]
            scene.add(instances);
            instances.scale.multiplyScalar(5)
            instances.position.x-=128*5;
            instances.position.z+=128*5;
            items.forEach((e,i)=>{
                let tile = mxy(e.x,e.y);
                mat.makeTranslation(e.x,0,-e.y);
                let cm = cmap[tile[0].name]
                if(cm.height)
                    mat.scale(new THREE.Vector3(1,25,1))
                col.set(cm.color)
                if(e.ang){
                    rot.makeRotationY(Math.PI*.5*e.ang);
                    mat.multiplyMatrices(mat,rot);
                }
                instances.setMatrixAt(i,mat)
                instances.setColorAt(i,col)
            })
            instances.instanceMatrix.needsUpdate=true;
            instances.instanceColor.needsUpdate=true;
        }
        console.log(cts);
    }
}