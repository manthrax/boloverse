
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



    var hudShader;
    function getHUDShader(){
        if (!hudShader)
            hudShader = boloworld.getShader("hud");
        return hudShader;
    }

    function showWinMessage(winTeam){
        //var exp=boloworld.addMeshObject(hexmap.buildSphere(),undefined,getHUDShader());
        //mat4.scale(mo.matrix, [20,20,20]);

        var exp = boloworld.addObject((winTeam==0)?"Font":"Font001",undefined,getHUDShader());
        //mat4.translate(exp.matrix,[sfrnd(1),sfrnd(1),sfrnd(0)]);
        exp.scale = 0.01;
        exp.alpha = 0.0;
        exp.pos=vec3.create();//[sfrnd(1),sfrnd(1),sfrnd(0)]);

        var zoomTween=new TWEEN.Tween(exp);
        zoomTween.to({scale:0.07,alpha:1.0},3000.0).onComplete(function(c,v){
            //this.active=false;
        }).easing(TWEEN.Easing.Quadratic.InOut).start();

        exp.update=function(){
            //console.log("updating");
            //this.scale+=0.01;
        }
    }

    function onMessage(msg,param){
        if(msg=="team_won"){
            showWinMessage(param);
        }
        if(msg=="team_lost"){
            showWinMessage(param);
        }
    }



    function onLoad(){
        messaging.listen("team_won",onMessage);
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
