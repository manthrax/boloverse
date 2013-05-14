
define(["util/domReady!", // Waits for page load
        "display",
        "world",
        "renderLoop",
        "util/gl-util",
        "js/util/gl-matrix.js",
    ], function(doc, displayModule, world, renderLoop, glUtil) { //bolomap,textures
    
    function buildTexture(){
        
    }
    
    function polar(u,v){
        var m=mat4.identity(mat4.create());
        var v=[0,0,1];
        mat4.rotateX(m,u);
        mat4.rotateZ(m,v);
        mat4.multiplyVec3(m,v,v);
        return v;
    }
    
    function buildSphere(){
        var sa=Math.PI*3.0;
        var s2a=Math.PI*6.0;
        var v0=polar(0,0);
        var v1=polar(sa,0);
        var v2=polar(sa,sa);
        var v3=polar(sa,sa*2);
        var v4=polar(sa,sa*3);
        var v5=polar(sa,sa*4);
        var v6=polar(sa,sa*5);
        var v7=polar(sa*2.0,s2a);
        var v8=polar(sa*2.0,s2a+sa);
        var v9=polar(sa*2.0,s2a+(sa*2));
        var v10=polar(sa*2.0,s2a+(sa*3));
        var v11=polar(sa*2.0,s2a+(sa*4));
        var v12=polar(sa*2.0,s2a+(sa*5));
        var v13=polar(sa*3.0,0);
        
        var ta=200;
        var t2a=100;
        var t0=[ta,0];
        var t1=[ta+ta,0];
        var t2=[ta+(ta*2),0];
        var t3=[ta+(ta*3),0];
        var t4=[ta+(ta*4),0];
        var t5=[ta+(ta*5),0];
        var ty=200;
        
        var t6=[0,ty];
        var t7=[ty,ty];
        var t8=[ty*2,ty];
        var t9=[ty*3,ty];
        var t10=[ty*4,ty];
        var t11=[ty*5,ty];
        
        var t12=[t2a,ty];
        var t13=[t2a+ty,ty];
        var t14=[t2a+(ty*2),ty];
        var t15=[t2a+(ty*3),ty];
        var t16=[t2a+(ty*4),ty];
        var t17=[t2a+(ty*5),ty];
        var t18=[t2a+(ty*6),ty];

        var t0=[ta,0];
        var t1=[ta+ta,0];
        var t2=[ta+(ta*2),0];
        var t3=[ta+(ta*3),0];
        var t4=[ta+(ta*4),0];
        var t5=[ta+(ta*5),0];
        
        var verts=  v0+v2+v1+   v0+v3+v2+   v0+v4+v3+   v0+v5+v4+       v0+v6+v5+       v0+v1+v6+   
                    v1+v7+v12+  v2+v8+v7+   v3+v9+v8+   v4+v10+v9+      v5+v10+v9+      v6+v10+v9+
                    v7+v8+v13+  v8+v9+v13+  v9+v10+v13+ v10+v11+v13+    v11+v12+v13+    v12+v7+v13;

        var uvs= 
            t0+t7+t6+ t1+t8+t7+ t2+t9+t8+ t3+t10+t9+ t4+t11+t10+ t5+t6+t11+
            t6+t7+t12+ t7+t8+t13+ t8+t9+t14+ t9+t10+t15+ t10+t11+t16+ t11+t0+t17+
            t0+t7+t6+ t1+t8+t7+ t2+t9+t8+ t3+t10+t9+ t4+t11+t10+ t5+t6+t11;
        
        var inds=[];
        var norms=[];
        for(var t=0;t<24*3;t++){inds+=[t];norms+=[verts[t]];}
        
        var display = displayModule.getDisplay();
        var gl = display.gl;

        var batch=display.geomBatch(verts,inds,norms,uvs);
        return batch;
/*                [-r,-r,z,
                r,-r,z,
                r, r,z,
                -r, r,z],
                [0,1,2, 2,3,0],
                [0,0,-1,
                0,0,-1,
                0,0,-1,
                0,0,-1],
                [0,0, 1,0, 1,1, 0,1]);
 */

    }
    
    return {
        buildTexture:buildTexture,
        buildSphere:buildSphere
    }    
});