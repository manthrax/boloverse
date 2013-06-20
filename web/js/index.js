
require(["util/domReady!", // Waits for page load
        "util/gl-util",
        "display",
        "camera",
        "js/util/messaging.js",
        "js/boloclient.js",
        "js/boloworld.js",
        "js/bolosim.js",
        "js/meshes/testmesh.js",
        "hexmap"
    ], function(
    doc,
    glUtil,
    display,
    cameraModule,
    messaging,
    boloclient,
    boloworld,
    bolosim,
    meshes,
    hexmap
    ) { //bolomap,textures
    "use strict";
    // Create gl context and start the render loop 
    var canvas = document.getElementById("canvas");
    var frame = document.getElementById("display-frame");
    var fpsCounter = document.getElementById("fps");
    var gl = glUtil.getContext(canvas);

    var deferredRender=true;
    var accumRender=false;

    if(!gl) {
        // Replace the canvas with a message that instructs them on how to get a WebGL enabled browser
        glUtil.showGLFailed(frame); 
        return;
    }

    var display = new display.display(gl, canvas);


    // If we don't set this here, the rendering will be skewed
//    canvas.width = canvas.offsetWidth;
//    canvas.height = canvas.offsetHeight;
    display.resize(gl, canvas);



    display.createFrameRenderer = function(gl,timing){
        return {
            gl:gl,
            timing:timing,
            update:function (gobj){	//render
                //console.log("rendering.");
                
                var c=gobj.meshRenderer;
                if(c)display.renderComponent(gobj,c,c.shader);
                /*
                 var comps=gobj.components;
                 display.setWorld(gobj.matrix);
                for(var i=0;i<comps.length;i++){
                    var c=comps[i];
                    display.renderComponent(gobj,c,c.shader);
                }*/
            }
        }
    }
    
    function updateSim(){
        bolosim.updateSim();
        boloclient.updateSim();
        display.camera.update();
    }


    display.getDebugTexShader = function(){
        if(this.debugTexShader==null){
            this.debugTexShader = boloworld.getShader("debugSwatch");
            this.debugTexShader.passIndex=3;
            this.debugTexShader.dontCull=true;
        }
        return this.debugTexShader;
    };

    display.getDeferredShader = function(){
        if(this.deferredTexShader==null){
            this.deferredTexShader = boloworld.getShader("deferred");
            this.deferredTexShader.passIndex=4;
            this.deferredTexShader.dontCull=true;
        }
        return this.deferredTexShader;
    };

    display.createQuadObject = function (bscl,bpx,bpy,shader,srcTex){
        var dbto= boloworld.addObject("quad1x1",undefined,shader,srcTex);
        dbto.scale = [bscl,bscl,bscl];
        dbto.alpha = 0.0;
        dbto.pos=[bpx,bpy,0.0];
        dbto.active=true;
        dbto.dontDestroy=true;
        dbto.destroy = function(){
            alert("debugTexObject destroyed!");
        };
        return dbto;
    };
    display.getDebugTexObject = function (){
        if(this.debugTexObject==null){
            this.debugTexObject=this.createQuadObject(0.13,-5,5,this.getDebugTexShader(),this.radarRTT.texture);
        }
        return this.debugTextObject;
    }
//    debugTextObject.pos=vec3.create();//[sfrnd(1),sfrnd(1),sfrnd(0)]);
//    debugTextObject.update=function(){console.log("updating");}

    function bootGame(){
        var radarDim=512;
        var rttDim=1024;
        display.radarRTT = display.initRTT(gl,radarDim,radarDim);
        display.radarRTT.texture.bindToUnit = boloworld.bindToUnit;

        display.deferredRTT = display.initRTT(gl,rttDim,rttDim);
        display.deferredRTT.texture.bindToUnit = boloworld.bindToUnit;

        display.accumRTT = display.initRTT(gl,rttDim,rttDim);
        display.accumRTT.texture.bindToUnit = boloworld.bindToUnit;

        display.pingRTT=display.deferredRTT;
        display.pongRTT=display.accumRTT;

        display.debugTexShader=null;
        display.deferredTexShader=null;
        display.debugTexObject=null;
        display.deferredRendererTexObject=null;


        boloworld.initWorld();
        boloworld.makeScene();
        messaging.send("initSim");


        display.getDebugTexObject();

        display.deferredRendererTexObject=display.createQuadObject(0.4,0,0,display.getDeferredShader(),display.deferredRTT.texture);

        display.deferredRendererTexObject.blurFactor=1.0;
        display.deferredRendererTexObject.chromabFactor=1.0;
        display.deferredRendererTexObject.gainFactor=1.0;
        display.deferredRendererTexObject.warpFactor=1.0;

        messaging.listen("shdrActivate",function(msg,param){deferredRender=param;console.log("Activate:"+param);});
        messaging.listen("shdrV1",function(msg,param){display.deferredRendererTexObject.blurFactor=parseFloat(param);console.log("sv1:"+param);});
        messaging.listen("shdrV2",function(msg,param){display.deferredRendererTexObject.chromabFactor=parseFloat(param);console.log("sv2:"+param);});
        messaging.listen("shdrV3",function(msg,param){display.deferredRendererTexObject.gainFactor=parseFloat(param);console.log("sv3:"+param);});
        messaging.listen("shdrV4",function(msg,param){display.deferredRendererTexObject.warpFactor=parseFloat(param);console.log("sv4:"+param);});



        display.radarCamera = new cameraModule.ModelCamera();
        display.radarCamera.distance = 100;//80
        display.radarCamera.orbitY=0;
        display.radarCamera.orbitX = 4.5;
//    this.orbitY = 6.0;
        display.radarCamera.setCenter([0, 0, 1]);



        glUtil.startRenderLoop(gl, canvas, function(gl, timing) {
            fpsCounter.innerHTML = "hz:"+timing.framesPerSecond+"<br/>o:"+(((boloworld.objects.iterCount>0)?boloworld.objects.updateSum/boloworld.objects.iterCount:0))+"<br/>m:"+display.renderedMeshes+"<br/>t:"+display.renderedTriangles;
            //gl.clearColor(1.0, 0.0, 0.1, 1.0);
            boloworld.objects.iterCount=0;
            boloworld.objects.updateSum=0;
            display.renderedTriangles=0;
            display.renderedMeshes=0;
            display.renderLoop(gl, timing);
        });
    }


    display.renderFrame=function(gl,timing){

        boloworld.update(gl,display,timing,updateSim);

        var renderRadar = true;

        if(renderRadar){
            this.radarRTT.bindRTTForRendering(gl);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    //Clear RTT buffer
            this.startRendering(this.radarCamera);
            this.setOrthoViewport(gl,canvas,display.radarRTT.frameBuffer.width,display.radarRTT.frameBuffer.height);
            this.renderActiveShaders();  //Pass 0 Render solid geometry to deferred buffer
            display.setScreenViewport(gl,canvas);
            this.unbindRTT(gl);
        }

        var renderFullRes=true;


        messaging.listen("localPlayerDamaged",function(msg,param){

            if(typeof(TWEEN)=='object'){ // No tweening on Node
                var fuzzTween=new TWEEN.Tween(deferredRender);
                zoomTween.to({scale:0.08,alpha:1.0},1000.0).onComplete(function(c,v){
                    //this.active=false;
                }).easing(TWEEN.Easing.Quadratic.In).start();
            }
        });

        var renderRTTRadarView=renderRadar;

        if(deferredRender){
            this.pingRTT.bindRTTForRendering(gl);
            if(accumRender){
                var sv=this.pongRTT;
                this.pongRTT=this.pingRTT;
                this.pingRTT=sv;
            }
        }
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    //Clear window framebuffer

        this.startRendering();
        if(renderFullRes)this.renderActiveShaders();  //Pass 0 Render solid geometry
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE,gl.ONE);                                                    //gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        gl.cullFace(gl.FRONT);
        if(renderFullRes)this.renderActiveShaders(1); //Pass 1.. render ADDITIVE blend stuff backfaces
        gl.cullFace(gl.BACK);
        if(renderFullRes)this.renderActiveShaders(1); //Pass 1.. render ADDITIVE blend stuff frontfaces
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);


        gl.blendFunc(gl.SRC_COLOR,gl.ONE_MINUS_SRC_ALPHA);// Pass 2.. render alpha blended/alpha test geometry / no culling... UI Layer
        if(renderFullRes)this.renderActiveShaders(2);
        //gl.disable(gl.BLEND);

        // render debug textures...
        gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        if(renderRTTRadarView)this.renderActiveShaders(3);



        if(deferredRender){
            this.unbindRTT(gl);

           // gl.flush();
            display.deferredRendererTexObject.diffuseSampler = this.pingRTT.texture;
            display.deferredRendererTexObject.accumSampler = this.pongRTT.texture;

            this.renderActiveShaders(4);    //Render the deferred quad renderer to the screen

        }

        gl.disable(gl.BLEND);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        this.finishRendering();
    };

    function fullscreenchange() {
        if(document.webkitIsFullScreen || document.mozFullScreen) {
            canvas.width = screen.width;
            canvas.height = screen.height;
        } else {
            canvas.width = canvasOriginalWidth;
            canvas.height = canvasOriginalHeight;
        }
        display.resize(gl, canvas);
    }

    frame.addEventListener("webkitfullscreenchange", fullscreenchange, false);
    frame.addEventListener("mozfullscreenchange", fullscreenchange, false);

    function setStatus(str){
        document.getElementById('logoBox').innerHTML = "BOLO | UNIVERSE : " + str;
    }
    messaging.listen("networkConnectedToServer",function(){
        setStatus("Connected. Loading...");
        bootGame();
    });

    messaging.listen("networkConnectionFailed",function(){
        setStatus("CONNECT TO SERVER FAILED.");
    });
    setStatus("Connecting to server...");
    network.connectToServer();

});
