define([
],function(){
    function computeTextureSize(elemCount){
        var sqdim=parseInt(Math.sqrt(elemCount)+0.0001);
        var tst=1;
        while(tst<sqdim)tst*=2;
        return tst;
    }
    var createSystem=function(maxParticles){
        return{
            freeParticles:0,
            usedParticles:-1,
            positionCache:new Float32Array(maxParticles*4),
            velocityCache:new Float32Array(maxParticles*4),
            cacheDim:computeTextureSize(maxParticles),
            positionTextures:[],
            velocityTextures:[]
        };

    };
    return{

    }
});
