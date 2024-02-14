/**
 * thrax
 * 5/21/13
 * 9:17 AM
 *
 *
 */

function getMeshVertex(mesh,index,vert,normal,uv)
{
    if(vert){
        let vi=index*3;
        let vm=mesh.vertices;
        vert[0]=vm[vi++];
        vert[1]=vm[vi++];
        vert[2]=vm[vi++];
    }
    if(normal){
        vi=index*3;
        let vn=mesh.normals;
        normal[0]=vn[vi++];
        normal[1]=vn[vi++];
        normal[2]=vn[vi++];
    }
    if(uv){
        vi=index*2;
        let vuv=mesh.uvs;
        uv[0]=vuv[vi++];
        uv[1]=vuv[vi++];
    }
}
function createFontFromMesh(mesh){
    let vts=[[0,0,0],[0,0,0],[0,0,0]];
    let centroid=[0,0,0];
    let inds=mesh.indices;
    let gridDimX=0.75;///40;
    let gridDimY=1.4;///20;
    let charMap={};
    //Sort all mesh triangles into a coarse grid, per character
    let maxx=0;
    let maxy=0;
    for(let t=0;t<inds.length;t+=3){
        for(let i=0;i<3;i++)getMeshVertex(mesh,inds[t+i],vts[i]);
        for(i=0;i<3;i++)vec3.add(centroid,vts[i]);
        vec3.scale(centroid,(1.0/3.0));
        console.log(centroid);
        centroid[0]/=gridDimX;
        centroid[1]/=gridDimY;
        let kx=parseInt(Math.abs(centroid[0]));
        let ky=parseInt(Math.abs(centroid[1]));

        let co=[kx*gridDimX,ky*gridDimY,0.0];
        //for(i=0;i<3;i++)vec3.sub(vts[i],co);

        let key=""+kx+","+ky;

        if(maxx<kx)maxx=kx;
        if(maxy<ky)maxy=ky;
        if(!charMap[key])charMap[key]=[inds[t],inds[t+1],inds[t+2]];
        else{for(i=0;i<3;i++)charMap[key].push(inds[t+i]);}


    }
    let cct=0;
    for(let k in charMap){
        console.log(k);
        cct++;
        let idxs=charMap[k];
        let usedVerts={};

   /*     for(i=0;i<idxs.length;i++)
            usedVerts[idxs[i]]=vec3.create()
            setMeshVertex(mesh,inds[t+i],vts[i]);
            */
    }
    console.log("kx:"+maxx+"ky:"+maxy);
    console.log("cct:"+cct);
}

export default{
    createFontFromMesh:createFontFromMesh
}
