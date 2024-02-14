
import messaging from "./util/messaging.js"
import util from "./util/util.js"
import programs from "./programs.js"
import bolomap from "./bolomap.js"
import   meshes from "./meshes/testmesh.js"
import   fontMesh from "./fontMesh.js"
import "./util/seedrandom.js"

import {vec3,mat4} from "./util/gl-matrix.js"
let glUtil;
if(typeof window==='object') glUtil = (await import("./util/gl-util.js")).default;

//    util.testDLL();

function showWinMessage(winTeam){
    showHudObject((winTeam==0)?"red_victory":"blue_victory");
}

let hudFGObject=null;
let hudShader;

/**
 * @function getHUDShader Returns the shader for Heads up display objects, loading it if necessary.
 * @returns Shader
 */
function getHUDShader(){
    if (!hudShader){
        hudShader = getShader("hud");
        hudShader.passIndex=2;
        hudShader.dontCull=true;
    }
    return hudShader;
}

function hideHudObject(){
    if(typeof(TWEEN)!='object')//No tweens in node
        return;
    let zoomTween=new TWEEN.Tween(getHudObject());
    hudFGObject=null;
    zoomTween.to({scale:1.0,alpha:0.0},1000.0).onComplete(function(c,v){
        this.active=false;
    }).easing(TWEEN.Easing.Quadratic.Out).start();
}
function getHudObject(){
    if(hudFGObject==null)hudFGObject=boloworld.addObject(obj,undefined,getHUDShader());
    return hudFGObject;
}

function showHudObject(obj){
    //let exp=boloworld.addMeshObject(hexmap.buildSphere(),undefined,getHUDShader());
    //mat4.scale(mo.matrix, [20,20,20]);

    if(hudFGObject)hideHudObject();
    let exp = hudFGObject=addObject(obj,undefined,getHUDShader());

    //mat4.translate(exp.matrix,[sfrnd(1),sfrnd(1),sfrnd(0)]);
    exp.scale = 0.01;
    exp.alpha = 0.0;
    exp.pos=vec3.create();//[sfrnd(1),sfrnd(1),sfrnd(0)]);

    if(typeof(TWEEN)=='object'){ // No tweening on Node
        let zoomTween=new TWEEN.Tween(exp);
        zoomTween.to({scale:0.08,alpha:1.0},1000.0).onComplete(function(c,v){
            //this.active=false;
        }).easing(TWEEN.Easing.Quadratic.In).start();
    }
    exp.update=function(){
        //console.log("updating");
        //this.scale+=0.01;
    }
}

function onTeamWon(msg,param){
    if(msg=="team_won"){
        console.log("TEAM WON:"+param);
        showWinMessage(param);
    }
    if(msg=="team_lost"){
        console.log("TEAM LOST:"+param);
        showWinMessage(param);
    }
}


let gamePaused = false;

function onGamePause(){
    gamePaused=true;
    document.getElementById("centerBox").style.display = "BLOCK";
    showHudObject("BOLO");//Font_courier");//
}

function onGameUnpause(){
    gamePaused=false;
    document.getElementById("centerBox").style.display = "NONE";
    hideHudObject();
}

function onGameCamera(){
    gamePaused=(gamePaused!=false)?false:true;
}

function onLoad(){


    messaging.listen("game_pause",onGamePause);
    messaging.listen("game_unpause",onGameUnpause);
    messaging.listen("game_camera",onGameCamera);
    messaging.listen("team_won",onTeamWon);

}
onLoad();

let frameRenderer = null;


let worldMeter = 1.0;
let worldMeter2 = worldMeter * worldMeter;


let mapOrigin = [128, 128];

let regionCellRad = 3;
let regionCellDim = regionCellRad * 2;
let regionGridRad = parseInt(256 / regionCellDim);
let regionGridDim = regionGridRad * 2;
//let regionGrid=[regionGridDim*regionGridDim];
let regionGrid = new Array(regionGridDim * regionGridDim);


let tileDim = worldMeter * 5;
let tileDim2 = tileDim * tileDim;
let tileRad = tileDim / 2.0;

let simTime;
let simFPS = 1000.0 / 60;
let minFPS = 1000.0 / 15;
let currentMap = null;//bolomap.loadRandomMap();

let GameObject = function () {
    let go = {
        id: objIdBase++,
        matrix: mat4.identity(mat4.create()),
        components: [],
        removeComponent: function (comp) {
            this.components.splice(this.components.indexOf(comp), 1);
            delete this[name];
        },
        addComponent: function (name, comp) {
            this[name] = comp;
            this.components.push(comp);
        }
    }
    return go;
}

let objIdBase = 0;
let objects = util.ObjectPool(GameObject);

let updateGameObject = {
    update: function (go) {
        if (go.update)go.update();
        for (let ck in go.components) {
            let c = go.components[ck];
            if (c.update)
                c.update(go);
        }
    }
}

function update(gl, display, timing, simUpdate) {
    if(display!=undefined){
        if (frameRenderer == null )
            frameRenderer = display.createFrameRenderer(gl, timing);
    }
    if (!simTime) {
        simTime = timing.time;
    }


    if (timing.time - simTime > minFPS) {
        simTime = timing.time - 1000.0 / simFPS;
    }
    while (simTime < timing.time) {
        if(gamePaused==false){
            objects.iterCount=0;
            objects.iterSum=0;

            objects.iterateActive(updateGameObject);

        }
        simUpdate();
        simTime += simFPS;
    }

    if(display!=undefined){
        display.renderedTriangles=0;
        display.renderedMeshes=0;
        if (currentMap != null)
            updateRegions();
        if(frameRenderer)
            objects.iterateActive(frameRenderer);
    }
}


function getNeighborsOfName(mx, my, name) {
    let dbits = 0;
    if (getCell(mx, my - 1)[0].name == name)dbits |= 1;
    if (getCell(mx + 1, my)[0].name == name)dbits |= 2;
    if (getCell(mx, my + 1)[0].name == name)dbits |= 4;
    if (getCell(mx - 1, my)[0].name == name)dbits |= 8;
    return dbits;
}

let v2t0 = [0, 0]

function worldToCellCoord(fa, outxy) {
    if (!outxy)outxy = v2t0;
    outxy[0] = parseInt(Math.floor((fa[0] + tileRad) / tileDim));
    outxy[1] = parseInt(Math.floor((fa[1] + tileRad) / tileDim));
    return outxy;
}

function getCellAtWorld(fx, fy) {
    let ix = parseInt(Math.floor((fx + tileRad) / tileDim));
    let iy = parseInt(Math.floor((fy + tileRad) / tileDim));
    return getCell(ix, iy);
}


function cellCoordToWorld(cc, out) {
    out[0] = cc[0] * tileDim;
    out[1] = cc[1] * tileDim;
    //           if(x<0)out[0]+=tileRad;
    //           else if(x>0)out[0]-=tileRad;
}

let colPVS = [];
/*
 function getCellRegion(fx,fy,rad,out){
 let minx=parseInt(Math.floor((fx+tileRad-rad)/tileDim));
 let miny=parseInt(Math.floor((fy+tileRad-rad)/tileDim));
 let maxx=parseInt(Math.floor((fx+tileRad+rad)/tileDim));
 let maxy=parseInt(Math.floor((fy+tileRad+rad)/tileDim));
 let i=0;
 for(let y=miny;y<maxy;y++){
 for(let x=minx;x<maxx;x++){
 out[i++]=getCell(x,y);
 }
 }
 return i;
 }
 */


function defaultCellPassable(tile) {
    //if(tile[0].name=="Building")return false;
    return false;
}

function getCellsInRadius(obj, fx, fy, rad, passableFunc, out) {
    if (!passableFunc)passableFunc = defaultCellPassable;
    if (!out)out = colPVS;
    let minx = parseInt(Math.floor((fx + tileDim - rad) / tileDim));
    let miny = parseInt(Math.floor((fy + tileDim - rad) / tileDim));
    let maxx = parseInt(Math.floor((fx + tileDim + rad) / tileDim));
    let maxy = parseInt(Math.floor((fy + tileDim + rad) / tileDim));
    if (maxx == minx)maxx++;
    if (maxy == miny)maxy++;
    let ncells = (maxy - miny) * (maxx - minx);
    if (out.length < ncells) {
        out.length = ncells;//=new Array(ncells);
        for (let i = 0; i < ncells; i++) {
            out[i] = [
                [0, 0],
                [0.0, 0.0, 0.0],
                null
            ];
        }
    }
    let i = 0;
    for (let y = miny; y < maxy; y++) {
        for (let x = minx; x < maxx; x++) {
            let cell = getCell(x, y);
            if (passableFunc(obj, cell) == false) {
                let c = out[i++];
                c[0][0] = x;
                c[0][1] = y;
                cellCoordToWorld(c[0], c[1]);
                c[2] = cell;
            }
        }
    }
    return i;
}


function getCollisionResult() {
    return colPVS;
}

function radiusPassable(obj, fx, fy, radius, passableFunc) {
    return getCellsInRadius(obj, fx, fy, radius, passableFunc);
}


let gl = null;
let display = null;
let tileDiffuse = null;
let tileShader = null;

let shaderCache={};

let textureCache={};

function getShader(baseName){
    return programs.createProgramFromTags(gl,baseName+'VS',baseName+'FS');
}

function bindToUnit(unit) {

    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this);
//            if(!this.src){
//                console.log("got rtt");
//            }
}

function loadTexture(name) {
//       name = "grid.png";

    let tileTex = glUtil.loadTexture(gl, name, function (glTex) {
        glTex
        glTex.flipY = false;
        
        glTex.bindToUnit = bindToUnit;
        glTex.src=name;
        objects.iterateActive({
            tex: glTex,
            update: function (obj) {
               // if(obj.meshRenderer.mesh.material.map==tileDiffuse)
               //     obj.meshRenderer.mesh.material.map = glTex;
               
                if(obj.diffuseSampler==tileDiffuse)
                    obj.diffuseSampler = tileTex;
            }
        });
        //tileDiffuse = tileTex;
    });
    return tileTex;
}

function initWorld() {
    let cd={display:undefined};
    messaging.send("getClientDisplay",cd);
    display = cd.display;

    //display = displayModule.getDisplay();

    gl = display.gl;
    let makeMeSick = false;
    if (makeMeSick)
        tileShader = getShader("wind");
    else
        tileShader = getShader("TND");

    tileDiffuse = glUtil.createSolidTexture(gl,
        [0,0,0,255,0,255,0,255,0,255,0,255,0,0,0,255],2);
    tileDiffuse.bindToUnit = bindToUnit;

    //let tileTex
    tileDiffuse = loadTexture("./assets/tiles.png");

   // fontMesh.createFontFromMesh(meshes["Font_courier"]);
}

let meshList = [];
for (let me in meshes)
    meshList.push(me);
let generateTileMesh = function (mat, mx, my, rand) {
    return meshes["ocean"];
}

function setTileMeshGenerator(tmgfn) {
    generateTileMesh = tmgfn;
}

function patchIsEmpty(mox, moy, patchRad) {
    for (let x = -patchRad; x < patchRad; x++) {
        for (let y = -patchRad; y < patchRad; y++) {
            let cell = getCell(mox + x, moy + y);
            if (cell[0].name != "Ocean")
                return false;
        }
    }
    return true;
}
//let random = MersenneTwister();
function buildPatch(mox, moy, patchRad) {
    Math.seedrandom("" + (mox + (moy * 256)));
    //random.init_genrand((mox + (moy * 256)));
    let batch = display.geomBatch();
    let meshGen = generateTileMesh;
    for (let x = -patchRad; x < patchRad; x++) {
        for (let y = -patchRad; y < patchRad; y++) {
            let mat = mat4.identity(mat4.create());
            mat4.translate(mat, [x * tileDim, y * tileDim, 0.0]);
            let mx = x + mox;
            let my = y + moy;
            let mesh = meshGen(mat, mx, my, Math.random());
            let scl = tileRad;
            mat4.scale(mat, [scl, scl, scl]);
            display.instanceMesh(mesh, batch, mat);
        }
    }
    //Math.seedrandom();
    return batch;
}

//let tileTexture=textures.get(gl,"tiles.png");
//let skyTexture=textures.get(gl,"tiles.png");

function makeUniquePatchMesh(x, y, patchRad) {
    let batch = buildPatch(x, y, patchRad);
    let mesh = display.mesh(gl,
        batch.vertices,
        batch.indices,
        batch.normals,
        batch.uvs);
    return mesh;
}

let emptyPatchMesh;

function makePatchMesh(x, y, patchRad) {
    if (patchIsEmpty(x, y, patchRad)) { //Reuse empty ocean mesh
        if (!emptyPatchMesh)
            emptyPatchMesh = makeUniquePatchMesh(x, y, patchRad);
        return emptyPatchMesh;
    }
    return makeUniquePatchMesh(x, y, patchRad);
}

function updateRegionPatchObject(patch, x, y, patchRad) {
    let mesh = makePatchMesh(x, y, patchRad);
    display.destroyMesh(gl, patch.meshRenderer.mesh);
    patch.meshRenderer.mesh = mesh;
    patch.meshRenderer.updateMesh(patch);
}

function buildRegionPatchObject(x, y, patchRad) {
    let mesh = makePatchMesh(x, y, patchRad);
    let meshRenderer = display.meshRenderer(gl, mesh, tileShader);

    let obj = objects.allocate();
    obj.addComponent('meshRenderer', meshRenderer);
    obj.diffuseSampler = tileDiffuse;
    mesh.material.map = tileDiffuse;
    obj.dirty = false;
    mat4.identity(obj.matrix);
    //mat4.scale(obj.matrix,[sfrnd(10),sfrnd(10),sfrnd(10)]);
    mat4.translate(obj.matrix, [x * tileDim, y * tileDim, 0.0]);
    return obj;
}

let tmat = new Float32Array(16);//mat4.identity(mat4.create());

function createSingleMeshRenderer(meshName) {
    let batch = display.geomBatch();

    mat4.identity(tmat);
    let scl = tileRad;
    mat4.scale(tmat, [scl, scl, scl]);

    display.instanceMesh(meshes[meshName], batch, tmat);
    let mesh = display.mesh(gl,
        batch.vertices,
        batch.indices,
        batch.normals,
        batch.uvs);
    let meshRenderer = display.meshRenderer(gl, mesh, tileShader);
    return meshRenderer;
}

function addObjectToGrid(obj) {
    obj.cellCoord = worldToCellCoord([obj.matrix[12], obj.matrix[13]], [0, 0]);
    obj.cell = getCell(obj.cellCoord[0], obj.cellCoord[1]);
    obj.cell.push(obj);
}

function getCellIndex(x, y) {
    x += mapOrigin[0];
    y += mapOrigin[1];
    if (x < 0)x = 0;
    else if (x > 255)x = 255;
    if (y < 0)y = 0;
    else if (y > 255)y = 255;
    return x + (y * 256);
}

function loadMapByName(mapName) {
    messaging.send("mapLoading",mapName);

    objects.iterateActive({update: function (go) {if(!go.dontDestroy)go.active = false;}});


    for (let r in regionGrid)regionGrid[r] = null;
    regionBuildTop = 0;
    currentMap = bolomap.loadMapByName(mapName);
    makeScene();
    return currentMap;
}
function loadMapByIndex(index) {
    loadMapByName(bolomap.getMapNames()[index]);
}

function loadRandomMap() {
    return loadMapByName(bolomap.getRandomMapName());
}

function getMap() {
    return currentMap;
}

function getCell(x, y) {
    return currentMap.map[getCellIndex(x, y)];
}

function setCell(x, y, arr) {
    currentMap.map[getCellIndex(x, y)] = arr;
}

function addTileObject(meshName, x, y) {
    if (typeof(x)=='array'){//.length) {//X is passed as a vector, so treat as world space coordinate..
        let pos = x;
        worldToCellCoord(pos, v3t0);
        x = v3t0[0];
        y = v3t0[1];
    }
    x -= mapOrigin[0];
    y -= mapOrigin[1];
    let obj = addObject(meshName, [x * tileDim, y * tileDim, 0.0]);
    obj.name = meshName;
    addObjectToGrid(obj);
    //obj.cell=getCell(x,y);
    //obj.cell.push(obj);
    return obj;
}

function addMeshObject(mesh, position, shader, diffuse) {
    let obj = objects.allocate();
    mat4.identity(obj.matrix);
    let scl = tileRad;
    mat4.scale(obj.matrix, [scl, scl, scl]);

    if(display==null){  //Node
        obj.meshRenderer={};
    }else{
        let batch = display.geomBatch();
        display.instanceMesh(mesh, batch, obj.matrix);

        let dmesh = display.mesh(gl,
            batch.vertices,
            batch.indices,
            batch.normals,
            batch.uvs);
        let meshRenderer = display.meshRenderer(gl, dmesh, shader ? shader : tileShader);

        let a=dmesh.matrix.elements;
        for(let i=0;i<16;i++)
            a[i]=obj.matrix[i];
        
        obj.addComponent('meshRenderer', meshRenderer);
        meshRenderer.mesh.material.map = obj.diffuseSampler = diffuse ? diffuse : tileDiffuse;
    }
    mat4.identity(obj.matrix);
    if (position)mat4.translate(obj.matrix, position);
    return obj;
}

function addObject(meshName, position, shader, diffuse) {
    return addMeshObject(meshes[meshName], position, shader, diffuse);
}

function removeTileObject(obj) {
    if (obj.cell) {
        obj.cell.splice(obj.cell.indexOf(obj), 1);
        obj.cell = null;
    }
}

let v3t0 = [0, 0, 0];

function moveTileObject(obj, fx, fy, fz) {
    v3t0[0] = fx;
    v3t0[1] = fy;
    let cc = worldToCellCoord(v3t0);
    let cell = getCell(cc[0], cc[1]);
    let ci = cell.indexOf(obj);
    if (ci >= 0)return;    //Haven't changed cells
    if (obj.cell)
        obj.cell.splice(obj.cell.indexOf(obj), 1);
    cell.push(obj);
    obj.cell = cell;
    obj.cellCoord[0] = cc[0];
    obj.cellCoord[1] = cc[1];
}


let regionBuildQueue = [];
let regionBuildTop = 0;

function updateRegions(meshGenerator) {
    let maxUpdateCount = 1;
    while (regionBuildTop > 0 && (maxUpdateCount-- > 0)) {
        regionBuildTop--;
        let e = regionBuildQueue[regionBuildTop];
        let x = e[0];
        let y = e[1];
        let ri = x + regionGridRad + ((y + regionGridRad) * regionGridDim);
        let region = regionGrid[ri];
        if (!region || region == null) {
            region = buildRegionPatchObject(x * regionCellDim, y * regionCellDim, regionCellRad, meshGenerator);
            regionGrid[ri] = region;
        } else {
            updateRegionPatchObject(region, x * regionCellDim, y * regionCellDim, regionCellRad, meshGenerator);
        }
        region.dirty = false;
    }
}

let tmpCoord = [0, 0];

function getRegionCoordAtTile(fx, fy) {
    let rx = parseInt(Math.floor((fx + regionCellRad) / regionCellDim)) + regionGridRad;
    let ry = parseInt(Math.floor((fy + regionCellRad) / regionCellDim)) + regionGridRad;
    tmpCoord[0] = rx;
    tmpCoord[1] = ry;
    //console.log("rxy:"+rx+","+ry);
    return tmpCoord;
}

function rebuildRegionAtTile(fx, fy) {
    let rc = getRegionCoordAtTile(fx, fy);
    let ri = rc[0] + (rc[1] * regionGridDim);
    let region = regionGrid[ri];
//            if(region!=null){
//                if(region.needsRebuilding)                  
//                region.active=false;
//                regionGrid[ri]=null;
//                let bq=regionBuildQueue[regionBuildTop++];
//                bq[0]=rc[0]-regionGridRad;
//                bq[1]=rc[1]-regionGridRad;
//            }
    if (!region || (region && region.dirty == false)) {
        if (region){
            region.dirty = true;
            if(regionBuildQueue.length==regionBuildTop)
                regionBuildQueue.push([0,0]);
            let bq = regionBuildQueue[regionBuildTop++];
            bq[0] = rc[0] - regionGridRad;
            bq[1] = rc[1] - regionGridRad;
        }
    }
}

function makeScene() {//display

    //	for(let t=0;t<640;t++){
    //		genSquare(sfrnd(10),sfrnd(10),sfrnd(10),sfrnd(Math.PI),sfrnd(Math.PI));
    //	}
    //let gl=display.gl;

    let patchRad = regionGridRad;
    let rgnRad = regionCellRad;

    regionBuildQueue = [];
    regionBuildTop = 0;


    //Fill the rebuild cache with all tiles
    for (let rad = patchRad; rad >= 1; rad--) {
        for (let x = -rad; x <= rad; x++) {
            regionBuildQueue.push([x, -rad]);
            regionBuildQueue.push([x, rad]);
            regionBuildTop += 2;
        }
        for (let y = (-rad) + 1; y < rad; y++) {
            regionBuildQueue.push([-rad, y]);
            regionBuildQueue.push([ rad, y]);
            regionBuildTop += 2;
        }
    }
    regionBuildQueue.push([0, 0]);
    regionBuildTop++;


    /*
     for(let x=-patchRad;x<patchRad;x++)
     for(let y=-patchRad;y<patchRad;y++){
     regionBuildQueue.push([x,y]);
     regionBuildTop++;
     }
     */
}

function localPlayerDied() {
    //display.camera.zoomToPause();
}

function localPlayerSpawned() {
    //display.camera.zoomToGame();
}

function getObject(id) {
    return objects.byId[id];
}

//return
export default {
    makeScene: makeScene,
    update: update,
    getCellAtWorld: getCellAtWorld,
    getNeighborsOfName: getNeighborsOfName,
    setCell: setCell,
    getCell: getCell,
    objects:objects,
    radiusPassable: radiusPassable,
    getCellsInRadius: getCellsInRadius,
    getCollisionResult: getCollisionResult,
    cellCoordToWorld: cellCoordToWorld,
    worldToCellCoord: worldToCellCoord,
    addTileObject: addTileObject,
    moveTileObject: moveTileObject,
    removeTileObject: removeTileObject,
    addObjectToGrid: addObjectToGrid,
    addMeshObject: addMeshObject,
    addObject: addObject,
    initWorld: initWorld,
    worldMeter: worldMeter,
    worldMeter2: worldMeter2,
    tileDim: tileDim,
    tileDim2: tileDim2,
    getShader: getShader,
    bindToUnit: bindToUnit,
    //tileData: tileData,
    tileShader: tileShader,
    createSingleMeshRenderer: createSingleMeshRenderer,
    rebuildRegionAtTile: rebuildRegionAtTile,
    getRegionCoordAtTile: getRegionCoordAtTile,
    setTileMeshGenerator: setTileMeshGenerator,
    simTime: function () {return simTime;},
    localPlayerDied: localPlayerDied,
    localPlayerSpawned: localPlayerSpawned,
    getObject: getObject,
    loadRandomMap: loadRandomMap,
    loadMapByName: loadMapByName,
    getMap: getMap,
    mapOrigin: mapOrigin
}
