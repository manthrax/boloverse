
require(["util/domReady!", // Waits for page load
        "display",
        "js/util/messaging.js",
        "util/gl-util",
        "js/boloworld.js",
        "js/bolosim.js",
        "js/hexmap.js",
        "js/meshes/testmesh.js",
        "js/util/gl-matrix.js",
    ], function(doc, display,messaging,glUtil,boloworld,bolosim,hexmap,meshes) { //bolomap,textures
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
                var comps=gobj.components;
                display.setWorld(gobj.matrix);
                
                var c=gobj.meshRenderer;
                if(c)display.renderComponent(gobj,c,c.shader);
                /*
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
    
    display.renderFrame=function(gl,timing){

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        boloworld.update(gl,display,timing,updateSim);
        
        display.startRendering();
        display.renderActiveShaders();
        gl.disable(gl.CULL_FACE);
        gl.disable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
       // gl.blendFunc(gl.ONE,gl.ONE);
        display.renderActiveShaders(1);
        gl.disable(gl.BLEND);
        gl.enable(gl.CULL_FACE);
        gl.enable(gl.DEPTH_TEST);
        display.finishRendering();
    }
    
    glUtil.startRenderLoop(gl, canvas, function(gl, timing) {
        fpsCounter.innerHTML = timing.framesPerSecond;		
        //gl.clearColor(1.0, 0.0, 0.1, 1.0);
        
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
