
define([
    "display",
    "util/gl-util",
    "util/util",
    "programs",
    "js/bolomap.js",
    "js/meshes/galaxymesh.js",
    "js/util/gl-matrix.js"
    ], 
    function(displayModule,glUtil,util,programs,bolomap,meshes) {//display, 
        var currentMap=null;//bolomap.loadRandomMap();
        var GameObject=function(){
            var go={
                id:objIdBase++,
                matrix:mat4.identity(mat4.create()),
                components:[],
                removeComponent: function(comp){
                    this.components.splice(this.components.indexOf(comp),1);
                    delete this[name];
                },
                addComponent: function(name,comp){
                    this[name]=comp;
                    this.components.push(comp);
                }
            }
            return go;
        }
        var objIdBase=0;
        var objects = util.ObjectPool(GameObject);
        var frameRenderer=null;
        var worldMeter=1.0;
        var worldMeter2=worldMeter*worldMeter;
        
        
        var mapOrigin=[128,128];
        
        var regionCellRad=5;
        var regionCellDim=regionCellRad*2;
        var regionGridRad=parseInt(256/regionCellDim);
        var regionGridDim=regionGridRad*2;
        //var regionGrid=[regionGridDim*regionGridDim];
        var regionGrid=new Array(regionGridDim*regionGridDim);
        
        
        var tileDim = worldMeter*5;
        var tileDim2 = tileDim*tileDim;
        var tileRad = tileDim/2.0;
        
        var updateGameObject={
            update:function(go){
                if(go.update)go.update();
                for(var ck in go.components){
                    var c=go.components[ck];
                    if(c.update)
                        c.update(go);
                }
            }
        }
        
        var simTime;
        var simFPS = 1000.0/60;
        var minFPS = 1000.0/15;
        
        function update(gl,display,timing,simUpdate){
            if(frameRenderer==null)
                frameRenderer=display.createFrameRenderer(gl,timing);
        
            if(!simTime){
                simTime=timing.time;                
            }
            
            
            if(timing.time-simTime>minFPS){
                simTime=timing.time-1000.0/simFPS;
            }
            while(simTime<timing.time){
                objects.iterateActive(updateGameObject);
                simUpdate();
                simTime+=simFPS;
            }
            
            objects.iterateActive(frameRenderer);

            
            if(currentMap!=null)updateRegions();

        }
        
        
        
        function getNeighborsOfName(mx,my,name){
            var dbits=0;
            if(getCell(mx,my-1)[0].name==name)dbits|=1;
            if(getCell(mx+1,my)[0].name==name)dbits|=2;
            if(getCell(mx,my+1)[0].name==name)dbits|=4;
            if(getCell(mx-1,my)[0].name==name)dbits|=8;
            return dbits;
        }
        var v2t0=[0,0]
        function worldToCellCoord(fa,outxy){
            if(!outxy)outxy=v2t0;
            outxy[0]=parseInt(Math.floor((fa[0]+tileRad)/tileDim));
            outxy[1]=parseInt(Math.floor((fa[1]+tileRad)/tileDim));
            return outxy;
        }
        function getCellAtWorld(fx,fy){
            var ix=parseInt(Math.floor((fx+tileRad)/tileDim));
            var iy=parseInt(Math.floor((fy+tileRad)/tileDim));
            return getCell(ix,iy);
        }
        
    

        function cellCoordToWorld(cc,out){
            out[0]=cc[0]*tileDim;
            out[1]=cc[1]*tileDim;
 //           if(x<0)out[0]+=tileRad;
 //           else if(x>0)out[0]-=tileRad;
        }
        
        var colPVS=[];
        /*
        function getCellRegion(fx,fy,rad,out){
            var minx=parseInt(Math.floor((fx+tileRad-rad)/tileDim));
            var miny=parseInt(Math.floor((fy+tileRad-rad)/tileDim));
            var maxx=parseInt(Math.floor((fx+tileRad+rad)/tileDim));
            var maxy=parseInt(Math.floor((fy+tileRad+rad)/tileDim));
            var i=0;
            for(var y=miny;y<maxy;y++){
                for(var x=minx;x<maxx;x++){
                    out[i++]=getCell(x,y);
                }
            }
            return i;
        }
        */
       
       
        function defaultCellPassable(tile){
            //if(tile[0].name=="Building")return false;
            return false;
        }
        
        function getCellsInRadius(obj,fx,fy,rad,passableFunc,out){
            if(!passableFunc)passableFunc=defaultCellPassable;
            if(!out)out=colPVS;
            var minx=parseInt(Math.floor((fx+tileDim-rad)/tileDim));
            var miny=parseInt(Math.floor((fy+tileDim-rad)/tileDim));
            var maxx=parseInt(Math.floor((fx+tileDim+rad)/tileDim));
            var maxy=parseInt(Math.floor((fy+tileDim+rad)/tileDim));
            if(maxx==minx)maxx++;
            if(maxy==miny)maxy++;
            var ncells=(maxy-miny)*(maxx-minx);
            if(out.length<ncells){
                out.length=ncells;//=new Array(ncells);
                for(var i=0;i<ncells;i++){
                    out[i]=[[0,0],[0.0,0.0,0.0],null];
                }
            }
            i=0;
            for(var y=miny;y<maxy;y++){
                for(var x=minx;x<maxx;x++){
                    var cell=getCell(x,y);
                    if(passableFunc(obj,cell)==false){
                        var c=out[i++];
                        c[0][0]=x;
                        c[0][1]=y;
                        cellCoordToWorld(c[0],c[1]);
                        c[2]=cell;
                    }
                }
            }
            return i;
        }
        
        
        function getCollisionResult(){
            return colPVS;
        }
        
        function radiusPassable(obj,fx,fy,radius,passableFunc){
            return getCellsInRadius(obj,fx,fy,radius,passableFunc);
        }
    
        
        
        
        var gl=null;
        var display=null;
        var tileDiffuse=null;
        var tileShader=null;
        
        function getShader(baseName){
            var shdr=programs.createProgramFromTags(gl,baseName+'VS',baseName+'FS');
            return shdr;
        }
        
        function bindToUnit(unit){
            if(!this.loaded)
                return;
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, this);
        }
        
        function loadTexture(name){
            var tileTex=glUtil.loadTexture(gl,name,function(glTex){
/*                objects.iterateActive({
                    tex:tileTex,
                    update:function(obj){
                        obj.diffuseSampler=tileTex;
                    }
                });
                */
               tileTex.loaded=true;
            });
            tileTex.bindToUnit=bindToUnit;
            return tileTex;
        }
        
        function initWorld(){
            display = displayModule.getDisplay();
            gl = display.gl;
            var makeMeSick=false;
            if(makeMeSick)
                tileShader=getShader("wind");
            else
                tileShader=getShader("TND");
            
            tileDiffuse=loadTexture("galaxy.png");
        
        }

        var meshList=[]
        for(var me in meshes)
            meshList.push(me);
        var generateTileMesh=function(mat,mx,my,rand){
            return meshes["ocean"];
        }
        function setTileMeshGenerator(tmgfn){
            generateTileMesh=tmgfn;
        }
        function patchIsEmpty(mox,moy,patchRad){
            for(var x=-patchRad;x<patchRad;x++){
                for(var y=-patchRad;y<patchRad;y++){
                    var cell=getCell(mox+x,moy+y);
                    if(cell[0].name!="Ocean")
                        return false;
                }
            }
            return true;
        }
        function buildPatch(mox,moy,patchRad)
        {
            Math.seedrandom(""+(mox+(moy*256)));
            var batch=display.geomBatch();
            var meshGen=generateTileMesh;
            for(var x=-patchRad;x<patchRad;x++){
                for(var y=-patchRad;y<patchRad;y++){
                    var mat=mat4.identity(mat4.create());
                    mat4.translate(mat,[x*tileDim,y*tileDim,0.0]);
                    var mx=x+mox;
                    var my=y+moy;
                    mesh=meshGen(mat,mx,my,Math.random());
                    var scl=tileRad;
                    mat4.scale(mat,[scl,scl,scl]);
                    display.instanceMesh(mesh,batch,mat);
                }
            }
            Math.seedrandom();
            return batch;
        }

        //var tileTexture=textures.get(gl,"tiles.png");
        //var skyTexture=textures.get(gl,"tiles.png");

        function makeUniquePatchMesh(x,y,patchRad){
            var batch=buildPatch(x,y,patchRad);
            var mesh=display.mesh(gl,
                batch.vertices,
                batch.indices,
                batch.normals,
                batch.uvs);
            return mesh;
        }
        var emptyPatchMesh;
        function makePatchMesh(x,y,patchRad){
            if(patchIsEmpty(x,y,patchRad)){ //Reuse empty ocean mesh
                if(!emptyPatchMesh)
                    emptyPatchMesh=makeUniquePatchMesh(x,y,patchRad);
                return emptyPatchMesh;    
            }
            return makeUniquePatchMesh(x,y,patchRad);
        }
        
        function updateRegionPatchObject(patch,x,y,patchRad){
            var mesh=makePatchMesh(x,y,patchRad);
            display.destroyMesh(gl,patch.meshRenderer.mesh);
            patch.meshRenderer.mesh = mesh;
            patch.meshRenderer.updateMesh(patch);
        }
        
        function setObjectMesh(obj,mesh,shader,diffuseSampler){
            var meshRenderer = display.meshRenderer(gl,mesh,shader?shader:tileShader);
            obj.addComponent('meshRenderer',meshRenderer);
            meshRenderer.diffuseSampler=diffuseSampler?diffuseSampler:tileDiffuse;
            obj.dirty=false;
            return meshRenderer;
        }
        
        function buildRegionPatchObject(x,y,patchRad){
            var mesh=makePatchMesh(x,y,patchRad);
            var meshRenderer = display.meshRenderer(gl,mesh,tileShader);
            
            var obj=objects.allocate();
            obj.addComponent('meshRenderer',meshRenderer);
            meshRenderer.diffuseSampler=tileDiffuse;
            obj.dirty=false;
            mat4.identity(obj.matrix);
            //mat4.scale(obj.matrix,[sfrnd(10),sfrnd(10),sfrnd(10)]);
            mat4.translate(obj.matrix,[x*tileDim,y*tileDim,0.0]);
            return obj;
        }
        var tmat=mat4.identity(mat4.create());
        function createSingleMeshRenderer(meshName){
            var batch=display.geomBatch();
            
            mat4.identity(tmat);    
            var scl=tileRad;
            mat4.scale(tmat,[scl,scl,scl]);
            
            display.instanceMesh(meshes[meshName],batch,tmat);
            var mesh=display.mesh(gl,
                batch.vertices,
                batch.indices,
                batch.normals,
                batch.uvs);
            var meshRenderer = display.meshRenderer(gl,mesh,tileShader);
            return meshRenderer;
        }
        function addObjectToGrid(obj){
            obj.cellCoord=worldToCellCoord([obj.matrix[12],obj.matrix[13]],[0,0]);
            obj.cell=getCell(obj.cellCoord[0],obj.cellCoord[1]);
            obj.cell.push(obj);
        }
        function getCellIndex(x,y){
            x+=mapOrigin[0];
            y+=mapOrigin[1];
            if(x<0)x=0;
            else if(x>255)x=255;
            if(y<0)y=0;
            else if(y>255)y=255;
            return x+(y*256);
        }
        
        function loadMapByName(mapName){
            document.getElementById('logoBox').innerHTML="BOLO | UNIVERSE : "+mapName;
            
            objects.iterateActive({update:function(go){go.active=false;}});
            for(var r in regionGrid)regionGrid[r]=null;
            regionBuildTop=0;
            currentMap=bolomap.loadMapByName(mapName);
            makeScene();
            return currentMap;
        }

        function loadRandomMap(){
            return loadMapByName(bolomap.getRandomMapName());
        }

        function getMap(){
            return currentMap;
        }
        
        function getCell(x,y){
            return currentMap.map[getCellIndex(x,y)];
        }

        function setCell(x,y,arr){
            currentMap.map[getCellIndex(x,y)]=arr;
        }
        function addTileObject(meshName,x,y){
            if(x.length){//X is passed as a vector, so treat as world space coordinate..
                var pos=x;
                worldToCellCoord(pos,v3t0);
                x=v3t0[0];
                y=v3t0[1];
            }
            x-=mapOrigin[0];
            y-=mapOrigin[1];
            var obj=addObject(meshName,[x*tileDim,y*tileDim,0.0]);
            obj.name=meshName;
            addObjectToGrid(obj);
            //obj.cell=getCell(x,y);
            //obj.cell.push(obj);
            return obj;
        }
        
        function newObject(position){
            var obj=objects.allocate();
            
            mat4.identity(obj.matrix);
            if(position)mat4.translate(obj.matrix,position);
        }
        
        function addObject(meshName,position,shader,diffuse){
            var obj=objects.allocate();
            
            if(meshName){
                var batch=display.geomBatch();
                mat4.identity(obj.matrix);    
                var scl=tileRad;
                mat4.scale(obj.matrix,[scl,scl,scl]);

                display.instanceMesh(meshes[meshName],batch,obj.matrix);
                var mesh=display.mesh(gl,
                    batch.vertices,
                    batch.indices,
                    batch.normals,
                    batch.uvs);

                var meshRenderer = display.meshRenderer(gl,mesh,shader?shader:tileShader);

                obj.addComponent('meshRenderer',meshRenderer);
                meshRenderer.diffuseSampler=diffuse?diffuse:tileDiffuse;
            }
            mat4.identity(obj.matrix);
            mat4.translate(obj.matrix,position);
            return obj;
        }
        function removeTileObject(obj){
            if(obj.cell){
                obj.cell.splice(obj.cell.indexOf(obj),1);
                obj.cell=null;
            }
        }
        
        var v3t0=[0,0,0];
        function moveTileObject(obj,fx,fy,fz){
            v3t0[0]=fx;
            v3t0[1]=fy;
            var cc=worldToCellCoord(v3t0);
            var cell=getCell(cc[0],cc[1]);
            var ci=cell.indexOf(obj);
            if(ci>=0)return;    //Haven't changed cells
            if(obj.cell)
                obj.cell.splice(obj.cell.indexOf(obj),1);
            cell.push(obj);
            obj.cell=cell;
            obj.cellCoord[0]=cc[0];
            obj.cellCoord[1]=cc[1];
        }
        
        
        var regionBuildQueue=[];
        var regionBuildTop=0;
        function updateRegions(meshGenerator){
            var maxUpdateCount=1;
            while(regionBuildTop>0 && (maxUpdateCount-->0)){
                regionBuildTop--;
                var e=regionBuildQueue[regionBuildTop];
                var x=e[0];
                var y=e[1];
                var ri=x+regionGridRad+((y+regionGridRad)*regionGridDim);
                var region=regionGrid[ri];
                if(!region || region==null){
                    region=buildRegionPatchObject(x*regionCellDim,y*regionCellDim,regionCellRad,meshGenerator);
                    regionGrid[ri]=region;
                }else{
                    updateRegionPatchObject(region,x*regionCellDim,y*regionCellDim,regionCellRad,meshGenerator);
                }
                region.dirty=false;
            }
        }
        
        var tmpCoord=[0,0];
        function getRegionCoordAtTile(fx,fy){
            var rx=parseInt(Math.floor((fx+regionCellRad)/regionCellDim))+regionGridRad;
            var ry=parseInt(Math.floor((fy+regionCellRad)/regionCellDim))+regionGridRad;
            tmpCoord[0]=rx;
            tmpCoord[1]=ry;
            //console.log("rxy:"+rx+","+ry);
            return tmpCoord;
        }
        function rebuildRegionAtTile(fx,fy){
            var rc=getRegionCoordAtTile(fx,fy);
            var ri=rc[0]+(rc[1]*regionGridDim);
            var region = regionGrid[ri];
//            if(region!=null){
//                if(region.needsRebuilding)                  
//                region.active=false;
//                regionGrid[ri]=null;
//                var bq=regionBuildQueue[regionBuildTop++];
//                bq[0]=rc[0]-regionGridRad;
//                bq[1]=rc[1]-regionGridRad;
//            }
            if(!region||(region&&region.dirty==false)){
                if(region)region.dirty=true;
                var bq=regionBuildQueue[regionBuildTop++];
                bq[0]=rc[0]-regionGridRad;
                bq[1]=rc[1]-regionGridRad;
            }

        }
        
        function makeScene(){//display

            //	for(var t=0;t<640;t++){
            //		genSquare(sfrnd(10),sfrnd(10),sfrnd(10),sfrnd(Math.PI),sfrnd(Math.PI));
            //	}
            //var gl=display.gl;
            
            var patchRad=regionGridRad;
            var rgnRad=regionCellRad;
            
            regionBuildQueue=[];
            regionBuildTop=0;
            for(var rad=patchRad;rad>=1;rad--){
                for(var x=-rad;x<=rad;x++){
                    regionBuildQueue.push([x,-rad]);
                    regionBuildQueue.push([x, rad]);
                    regionBuildTop+=2;
                }
                for(var y=(-rad)+1;y<rad;y++){
                    regionBuildQueue.push([-rad,y]);
                    regionBuildQueue.push([ rad,y]);
                    regionBuildTop+=2;
                }
            }
            regionBuildQueue.push([0,0]);
            regionBuildTop++;
            
/*
            for(var x=-patchRad;x<patchRad;x++)
            for(var y=-patchRad;y<patchRad;y++){
                regionBuildQueue.push([x,y]);
                regionBuildTop++;
            }
*/
        }
        function localPlayerDied(){        
            display.camera.zoomToPause();
        }
        function localPlayerSpawned(){
            display.camera.zoomToGame();
        }
        function getObject(id){
            return objects.byId[id];
        }
        return{
            makeScene: makeScene,
            update: update,
            getCellAtWorld: getCellAtWorld,
            getNeighborsOfName: getNeighborsOfName,
            setCell: setCell,
            getCell: getCell,
            
            radiusPassable: radiusPassable,
            getCellsInRadius: getCellsInRadius,
            getCollisionResult: getCollisionResult,
            cellCoordToWorld: cellCoordToWorld,
            worldToCellCoord: worldToCellCoord,
            addTileObject: addTileObject,
            moveTileObject: moveTileObject,
            removeTileObject: removeTileObject,
            addObjectToGrid: addObjectToGrid,
            addObject: addObject,
            initWorld: initWorld,
            worldMeter: worldMeter,
            worldMeter2: worldMeter2,
            tileDim: tileDim,
            tileDim2: tileDim2,
            getShader: getShader,
            //tileData: tileData,
            tileShader: tileShader,
            createSingleMeshRenderer: createSingleMeshRenderer,
            rebuildRegionAtTile:rebuildRegionAtTile,
            getRegionCoordAtTile:getRegionCoordAtTile,
            setTileMeshGenerator:setTileMeshGenerator,
            simTime:function(){return simTime;},
            localPlayerDied: localPlayerDied,
            localPlayerSpawned: localPlayerSpawned,
            getObject: getObject,
            loadRandomMap:loadRandomMap,
            loadMapByName:loadMapByName,
            getMap:getMap,
            mapOrigin:mapOrigin,
            loadTexture:loadTexture,
            newObject:newObject,
            setObjectMesh:setObjectMesh,
            meshes:meshes
        }
    }
    );