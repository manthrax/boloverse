
define([
    "camera",
    "display",
    "world",
    "util/gl-util"
    ],
function(camera, display,world, glUtil) {
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
    gl.clearColor(0.0,0.0,0.0,1.0);
    display.resize(gl, canvas);

    function sfrnd(rng){
        return ((Math.random()*rng)-(rng*0.5));
    }
    display.createFrameRenderer = function(gl,timing){
        return {
            gl:gl,
            timing:timing,
            update:function (gobj){	//render
                //console.log("rendering.");
                
                for(var ci in gobj.components){
                    var c=gobj.components[ci];
                    if(c.type=="meshRenderer")
                        display.renderComponent(gobj,c,c.shader);
                }
                /*
                var comps=gobj.components;
                display.setWorld(gobj.matrix);
             //  var c=gobj.meshRenderer;
             //    if(c)display.renderComponent(gobj,c,c.shader);
             */
            }
        }
    }
    
    function updateSim(){
    //    bolosim.updateSim();
        display.camera.update();
    }
    
    display.renderFrame=function(gl,timing){

        alert("Should override display.renderframe!");
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        world.update(gl,display,timing,updateSim);
        
        display.startRendering();
        display.renderActiveShaders();
        display.finishRendering();
    }
    
    glUtil.startRenderLoop(gl, canvas, function(gl, timing) {
        if(fpsCounter)
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
    
    