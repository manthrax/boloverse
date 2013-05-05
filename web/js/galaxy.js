
require(["util/domReady!", // Waits for page load
        "display",
        "world",
        "renderLoop",
        "util/gl-util",
        "js/util/gl-matrix.js",
    ], function(doc, displayModule, world, renderLoop, glUtil) { //bolomap,textures
    "use strict";
    
    world.initWorld();
    
    var display=displayModule.getDisplay();
    var gl=display.gl;


    gl.enable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.blendFunc(gl.ONE,gl.ONE);
    gl.depthMask(true);
    
    gl.disable(gl.CULL_FACE);
    
    function buildSpiralArms(batch,buildStep,fuzzMag,sclMag){
        var rmat=new Float32Array(16);
        var bstep=buildStep?buildStep:0.004;
        for(var t=-0.99;t<0.99;t+=bstep){
            var at=(Math.abs(t)+1.0)*1.0;
            var fuzzRad=(fuzzMag?fuzzMag:10.0)/at;

            fuzzRad/=Math.pow(at,4);

    //    fuzzRad=0;

            var sclRad=((Math.random()*(sclMag?sclMag:13.0))-6.1)/Math.pow(at-0.3,4);


            var quad=display.makePlaneSpriteBatch(0.0,sclRad);
            mat4.identity(rmat);

          //  mat4.scale(rmat,[sclRad,sclRad,sclRad]);

            var theta=t*6.1;
            var ctheta=(t<0.0)?theta*-1.0:theta;
            var rad=t*60.1;

            var rang=Math.random()*Math.PI*2.0;


            var rrad=[
                (Math.sin(rang))*fuzzRad,
                (Math.cos(rang))*fuzzRad,
                0.0]
            mat4.translate(rmat,[
                (Math.sin(ctheta)*rad)+rrad[0],
                (Math.cos(ctheta)*rad)+rrad[1],
                (1.0-Math.sin(ctheta*80.0))*0.0]);


            display.instanceMesh(quad,batch,rmat);
        }
    }
    function buildRandomStarVolume(batch,buildStep,fuzzMag,sclMag){
        var rmat=new Float32Array(16);
        for(var t=-0.99;t<0.99;t+=buildStep?buildStep:0.001){
            var sclRad=(Math.random()*sclMag?sclMag:6.0)+0.1;
            var quad=display.makePlaneSpriteBatch(0.0,sclRad);
            mat4.identity(rmat);
            var fuzzRad=fuzzMag?fuzzMag:500.0;
            mat4.translate(rmat,[
                ((Math.random()-0.5)*fuzzRad),
                ((Math.random()-0.5)*fuzzRad),
                ((Math.random()-0.5)*fuzzRad)]);
            //mat4.scale(rmat,[fuzzRad,fuzzRad,fuzzRad]);
            display.instanceMesh(quad,batch,rmat);
        }
    }
    var meshNames=[
        "road",
        "dualSpire",
        "lipstick",
        "spikeTower",
        "munitower",
        "generator",
        "boxy",
        "birdfly"
    ];
    function randElem(arr){
        return arr[parseInt(Math.random()*arr.length*0.999)];
    }
    function randElemIndex(arr){
        return parseInt(Math.random()*arr.length*0.999);
    }
    function buildCity(batch,buildStep,fuzzMag,sclMag){
        var rmat=new Float32Array(16);
        var scl=10.0;
        for(var ty=-10;ty<10;ty++){
        for(var tx=-10;tx<10;tx++){
            
            mat4.identity(rmat);
            mat4.translate(rmat,[
                tx*scl,
                ty*scl,-10.0]);
            var gscl=0.333;
            mat4.scale(rmat,[scl*gscl,scl*gscl,scl*gscl]);
            display.instanceMesh(world.meshes.road,batch,rmat);
            
            var dcent=1.0-(Math.sqrt((tx*tx)+(ty*ty))/8.0);
            mat4.scale(rmat,[1,1,(((Math.random()*0.5)*dcent)+1.0)]);
            if(dcent<0.0)continue;
            var mname=randElem(meshNames);
            if(mname!="road")
                display.instanceMesh(world.meshes[mname],batch,rmat);
        }
        }
    }
    //display.newObject();
    var spriteScaleBase=1.0;
    var batch=display.geomBatch();
    buildRandomStarVolume(batch);//,0.004,500.0,6.0);
    buildSpiralArms(batch,0.004,20.0,8.0*spriteScaleBase);
    var transparentShader=world.getShader("additiveSprite");
    var spriteTexture=world.loadTexture("flare.png");

    var nmesh=display.mesh(gl,batch.vertices,batch.indices,batch.normals,batch.uvs);
    var turret=world.addObject(undefined,[0,0,0],transparentShader,spriteTexture);
    var renderer;
    var renderer=world.setObjectMesh(turret,nmesh,transparentShader,spriteTexture)
    renderer.spriteAlpha=0.99; 

    
    batch=display.geomBatch();
   // buildRandomStarVolume(batch);
    buildSpiralArms(batch,0.004,10.0,10.0*spriteScaleBase);
    
    spriteTexture=world.loadTexture("tb.png");
    nmesh=display.mesh(gl,batch.vertices,batch.indices,batch.normals,batch.uvs);
    renderer=world.setObjectMesh(turret,nmesh,transparentShader,spriteTexture);
    renderer.spriteAlpha=0.1;
    
    
    batch=display.geomBatch();
   // buildRandomStarVolume(batch);
    buildCity(batch);
  //  buildRandomStarVolume(batch);

    spriteTexture=world.loadTexture("tiles.png");
    var tileShader=world.getShader("TND");
    nmesh=display.mesh(gl,batch.vertices,batch.indices,batch.normals,batch.uvs);
    renderer=world.setObjectMesh(turret,nmesh,tileShader,spriteTexture);
    renderer.spriteAlpha=1.0;
    
    //function initApp(){
    //}
    //world.localPlayerDied();
    skipCounter=0;
    var skipCounter=0;
    turret.update=function(go){
        if(!(skipCounter++%(60*10))){
         //   console.log("tick");
            display.camera.zoomToRandomAngle();
        }
        mat4.identity(turret.matrix);
        mat4.rotateZ(turret.matrix, skipCounter*0.0001);
        mat4.rotateX(Math.PI*0.25, skipCounter*0.001);
        mat4.translate(turret.matrix,[ 0,0,-2]);
    }
    //initApp();
    
    console.log("Test");
});
