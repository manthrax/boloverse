/**
 * thrax
 * 5/21/13
 * 9:17 AM
 *
 *
 */
/*
if (typeof define !== 'function') {var define = require('amdefine')(module);}

define([],function(){
*/
function getMeshVertex(mesh,index,vert,normal,uv)
{
    if(vert){
        var vi=index*3;
        var vm=mesh.vertices;
        vert[0]=vm[vi++];
        vert[1]=vm[vi++];
        vert[2]=vm[vi++];
    }
    if(normal){
        vi=index*3;
        var vn=mesh.normals;
        normal[0]=vn[vi++];
        normal[1]=vn[vi++];
        normal[2]=vn[vi++];
    }
    if(uv){
        vi=index*2;
        var vuv=mesh.uvs;
        uv[0]=vuv[vi++];
        uv[1]=vuv[vi++];
    }
}
function createFontFromMesh(mesh){
    var vts=[[0,0,0],[0,0,0],[0,0,0]];
    var centroid=[0,0,0];
    var inds=mesh.indices;
    var gridDimX=0.75;///40;
    var gridDimY=1.4;///20;
    var charMap={};
    //Sort all mesh triangles into a coarse grid, per character
    var maxx=0;
    var maxy=0;
    for(var t=0;t<inds.length;t+=3){
        for(var i=0;i<3;i++)getMeshVertex(mesh,inds[t+i],vts[i]);
        for(i=0;i<3;i++)vec3.add(centroid,vts[i]);
        vec3.scale(centroid,(1.0/3.0));
        console.log(centroid);
        centroid[0]/=gridDimX;
        centroid[1]/=gridDimY;
        var kx=parseInt(Math.abs(centroid[0]));
        var ky=parseInt(Math.abs(centroid[1]));

        var co=[kx*gridDimX,ky*gridDimY,0.0];
        //for(i=0;i<3;i++)vec3.sub(vts[i],co);

        var key=""+kx+","+ky;

        if(maxx<kx)maxx=kx;
        if(maxy<ky)maxy=ky;
        if(!charMap[key])charMap[key]=[inds[t],inds[t+1],inds[t+2]];
        else{for(i=0;i<3;i++)charMap[key].push(inds[t+i]);}


    }
    var cct=0;
    for(var k in charMap){
        console.log(k);
        cct++;
        var idxs=charMap[k];
        var usedVerts={};

   /*     for(i=0;i<idxs.length;i++)
            usedVerts[idxs[i]]=vec3.create()
            setMeshVertex(mesh,inds[t+i],vts[i]);
            */
    }
    console.log("kx:"+maxx+"ky:"+maxy);
    console.log("cct:"+cct);
}

//return
export default{
    createFontFromMesh:createFontFromMesh
}

//});