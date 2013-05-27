
require(["util/domReady!", // Waits for page load
        "display",
        "js/util/messaging.js",
        "util/gl-util",
        "js/boloworld.js",
        "js/bolosim.js",
        "js/hexmap.js",
    "js/meshes/testmesh.js",
    "camera",
    "js/util/gl-matrix.js",
    ], function(doc, display,messaging,glUtil,boloworld,bolosim,hexmap,meshes,cameraModule) { //bolomap,textures
    "use strict";
    // Create gl context and start the render loop 
    var canvas = document.getElementById("canvas");
    var frame = document.getElementById("display-frame");
    var fpsCounter = document.getElementById("fps");
    var gl = glUtil.getContext(canvas);


    var display = new display.display(gl, canvas);

    if(!gl) {
        // Replace the canvas with a message that instructs them on how to get a WebGL enabled browser
        glUtil.showGLFailed(frame); 
        return;
    }

    // If we don't set this here, the rendering will be skewed
//    canvas.width = canvas.offsetWidth;
//    canvas.height = canvas.offsetHeight;
    display.resize(gl, canvas);

    boloworld.initWorld();
    
    boloworld.makeScene();
    
    bolosim.initSim();


    function onLoad(){
    }
    onLoad();

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
        display.camera.update();
    }

    display.radarRTT = display.initRTT(gl,512,512);

    display.radarRTT.texture.bindToUnit = boloworld.bindToUnit;

    display.debugTexShader=null;
    display.debugTexObject=null;

    display.getDebugTexShader = function(){
        if(this.debugTexShader==null){
            this.debugTexShader = boloworld.getShader("debugSwatch");
            this.debugTexShader.passIndex=3;
            this.debugTexShader.dontCull=true;
        }
        return this.debugTexShader;
    }

    display.getDebugTexObject = function (){
        if(this.debugTexObject==null){

            this.debugTexObject= boloworld.addObject("quad1x1",undefined,this.getDebugTexShader(),this.radarRTT.texture);
            var bscl=0.13;
            var bpos=5.0;
            this.debugTexObject.scale = [bscl,bscl,bscl];
            this.debugTexObject.alpha = 0.0;
            this.debugTexObject.pos=[-bpos,bpos,0.0];
            this.debugTexObject.active=true;
            this.debugTexObject.dontDestroy=true;
            this.debugTexObject.destroy = function(){
                alert("debugTexObject destroyed!");
            }
        }
        return this.debugTextObject;
    }
//    debugTextObject.pos=vec3.create();//[sfrnd(1),sfrnd(1),sfrnd(0)]);
//    debugTextObject.update=function(){console.log("updating");}


    display.getDebugTexObject();


    display.radarCamera = new cameraModule.ModelCamera();
    display.radarCamera.distance = 100;//80
    display.radarCamera.orbitY=0;
    display.radarCamera.orbitX = 4.5;
//    this.orbitY = 6.0;
    display.radarCamera.setCenter([0, 0, 1]);

    display.renderFrame=function(gl,timing){

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    //Clear window framebuffer

        this.radarRTT.bindRTTForRendering(gl);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);    //Clear RTT buffer


        boloworld.update(gl,display,timing,updateSim);

        this.startRendering(this.radarCamera);
        this.setOrthoViewport(gl,canvas,display.radarRTT.frameBuffer.width,display.radarRTT.frameBuffer.height);
        this.renderActiveShaders();  //Pass 0 Render solid geometry to deferred buffer
        display.setScreenViewport(gl,canvas);

        this.unbindRTT(gl);


        var renderFullRes=true;
        var renderRTTView=true;

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
        if(renderRTTView)this.renderActiveShaders(3);
        gl.disable(gl.BLEND);

        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);

        this.finishRendering();

    };
    
    glUtil.startRenderLoop(gl, canvas, function(gl, timing) {
        fpsCounter.innerHTML = ""+timing.framesPerSecond+":"+((boloworld.objects.iterCount>0)?boloworld.objects.updateSum/boloworld.objects.iterCount:0);
        //gl.clearColor(1.0, 0.0, 0.1, 1.0);
        boloworld.objects.iterCount=boloworld.objects.updateSum=0;
        display.renderLoop(gl, timing);
    });
	
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
	
	
});
