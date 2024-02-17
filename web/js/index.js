//import doc from "./util/domReady.js"
import glUtil from "./util/gl-util.js"
import displayModule from "./display3.js"
import cameraModule from "./camera.js"

import messaging from "./util/messaging.js"
import boloclient from "./boloclient.js"
import boloworld from "./boloworld.js"
import bolosim from "./bolosim.js"
import meshes from "../assets/meshes/testmesh.js"
import hexmap from "./hexmap.js"

"use strict";

// Create gl context and start the render loop 

let canvas = document.getElementById("canvas");
let frame = document.getElementById("display-frame");
let fpsCounter = document.getElementById("fps");
let gl;
let display = new displayModule.display(gl,canvas);

// If we don't set this here, the rendering will be skewed

display.resize(gl, canvas);

display.createFrameRenderer = function(gl, timing) {
    return {
        gl: gl,
        timing: timing,
        update: function(gobj) {
            let c = gobj.meshRenderer;
            if (c) display.renderComponent(gobj, c, c.shader);
        }
    }
}

function updateSim() {
    bolosim.updateSim();
    boloclient.updateSim();
    display.camera.update();
}


display.createQuadObject = function(bscl, bpx, bpy, shader, srcTex) {
    let dbto = boloworld.addObject("quad1x1", undefined, shader, srcTex);
    dbto.scale = [bscl, bscl, bscl];
    dbto.alpha = 0.0;
    dbto.pos = [bpx, bpy, 0.0];
    dbto.active = true;
    dbto.dontDestroy = true;
    dbto.destroy = function() {
        alert("createQuadObject destroyed!");
    }
    
    return dbto;
}

function bootGame() {
    let radarDim = 512;
    let rttDim = 1024;

    ///ZOOOM
    let camera = display.camera.perspectiveCamera;
    document.addEventListener('wheel',(e)=>{
        camera.fov += e.movementY*.01;
        camera.updateProjectionMatrix();
    })

    display.radarRTT = display.initRTT(gl, radarDim, radarDim);
    
    boloworld.initWorld();
    boloworld.makeScene();
    messaging.send("initSim");

    display.radarCamera = new cameraModule.ModelCamera();
    display.radarCamera.distance = 100;
    display.radarCamera.orbitY = 0;
    display.radarCamera.orbitX = 4.5;
    
    display.radarCamera.setCenter([0, 0, 1]);

    glUtil.startRenderLoop(gl, canvas, function(gl, timing) {
        fpsCounter.innerHTML = "hz:" + timing.framesPerSecond + "<br/>o:" + (((boloworld.objects.iterCount > 0) ? boloworld.objects.updateSum / boloworld.objects.iterCount : 0)) + "<br/>m:" + display.renderedMeshes + "<br/>t:" + display.renderedTriangles;
        boloworld.objects.iterCount = 0;
        display.renderedTriangles = 0;
        boloworld.objects.updateSum = 0;
        display.renderedMeshes = 0;
        display.renderLoop(gl, timing);
    });
}

display.renderFrame = function(gl, timing) {

    boloworld.update(gl, display, timing, updateSim);

    
    let renderRadar = true;
    if (renderRadar) {

    }
    this.startRendering();
    this.renderActiveShaders();
    this.finishRendering();
}


function fullscreenchange() {
    if (document.webkitIsFullScreen || document.mozFullScreen) {
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

function setStatus(str) {
    document.getElementById('logoBox').innerHTML = "BOLO | UNIVERSE : " + str;
}

messaging.listen("networkConnectedToServer", function() {
    setStatus("Connected. Loading...");
    bootGame();
});

messaging.listen("networkConnectionFailed", function() {
    setStatus("CONNECT TO SERVER FAILED.");
});
setStatus("Connecting to server...");
network.connectToServer();
