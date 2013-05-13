
require(["util/domReady!", // Waits for page load
        "display",
        "world",
        "renderLoop",
        "util/gl-util",
        "js/util/gl-matrix.js",
    ], function(doc, displayModule, world, renderLoop, glUtil) { //bolomap,textures
    
    function buildTexture(){
        
    }

    function buildSphere(){
        var batch=display.geomBatch(
                [-r,-r,z,
                r,-r,z,
                r, r,z,
                -r, r,z],
                [0,1,2, 2,3,0],
                [0,0,-1,
                0,0,-1,
                0,0,-1,
                0,0,-1],
                [0,0, 1,0, 1,1, 0,1]);
                
    }
    
    return {
        buildTexture:buildTexture,
        buildSphere:buildSphere
    }    
});