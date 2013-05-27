
define([
    "camera",
    "util/gl-util",
    "js/util/gl-matrix.js" //    "js/bolomap.js"
    ], function(camera, glUtil) {
        "use strict";

        var vaoExtension=null;

        function v3cp(to,from){
            if(!to)return [0,0,0];
            if(!from)return [to[0],to[1],to[2]];
            to[0]=from[0];
            to[1]=from[1];
            to[2]=from[2];
            return to;
        }
        function nv3(){return v3cp();}

        var v3t0=nv3();
        var v3t1=nv3();
        var v3t2=nv3();
        var v3t3=nv3();
        var v3t4=nv3();
        var v3t5=nv3();
        var v3t6=nv3();
        var v3t7=nv3();
        var v3t8=nv3();
        var v3t9=nv3();
	
        // pre-allocate a bunch of arrays
        var orthoWorld = new Float32Array(16);
        var orthoView = new Float32Array(16);
        var orthoProjection = new Float32Array(16);

        var orthoWorldInverse = new Float32Array(16);
        var orthoViewProjection = new Float32Array(16);
        var orthoWorldViewProjection = new Float32Array(16);

        var orthoViewInverse = new Float32Array(16);
        var orthoProjectionInverse = new Float32Array(16);
        var orthoViewProjectionInverse = new Float32Array(16);
        var orthoWorldInverseTranspose = new Float32Array(16);

        var screenToRT=new Float32Array(2);
        var world = new Float32Array(16);
        var view = new Float32Array(16);
        var projection = new Float32Array(16);
        var cameraMatrix = new Float32Array(16);
        var frustumFarCorners = new Float32Array(16);

        var viewProjection = new Float32Array(16);
        var worldViewProjection = new Float32Array(16);
        var worldViewProjectionInverse = new Float32Array(16);

        var viewInverse = new Float32Array(16);
        var projectionInverse = new Float32Array(16);
        var viewProjectionInverse = new Float32Array(16);
        var worldInverse = new Float32Array(16);
        var worldInverseTranspose = new Float32Array(16);
        var viewInverseTranspose = new Float32Array(16);
        
        var aspectRatio=1.0;
        var _display;
        
        var display = function (gl, canvas) {
            vaoExtension = (
              gl.getExtension('OES_vertex_array_object') ||
              gl.getExtension('MOZ_OES_vertex_array_object') ||
              gl.getExtension('WEBKIT_OES_vertex_array_object')
            );/*
            vaoExtension = gl.getExtension("OES_vertex_array_object");
            if(!vaoExtension)
                vaoExtension = gl.getExtension("MOZ_OES_vertex_array_object");*/
            
            if(!vaoExtension)
                alert("OES_vertex_array_object is not supported!");
            _display=this;
            //this.camera = new camera.FlyingCamera(canvas);
            this.cameraModule=camera;
            this.camera = new camera.ModelCamera();
            this.camera.addMouseControls(canvas);
            this.camera.distance = 2;//80
            this.camera.setCenter([0, 0, 1]);

		
            this.fov = 45;
            this.gl = gl;
            this.nearDepth=0.1;
            this.farDepth=200.0;
            canvas.gl = gl;
            
            display.prototype.fov=this.fov;
            display.prototype.aspectRatio=canvas.width/canvas.height;
            mat4.perspective(this.fov, display.prototype.aspectRatio , this.nearDepth, this.farDepth, projection);

            gl.clearColor(0.5, 0.6, 0.9, 0.0);
            gl.clearDepth(1.0);
            gl.enable(gl.DEPTH_TEST);
            gl.disable(gl.BLEND);
            gl.cullFace(gl.BACK);
            gl.enable(gl.CULL_FACE);
            // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	   
            loadSession();
        };
	
        display.prototype.aspectRatio=aspectRatio;
        display.prototype.world=world;
        display.prototype.view=view;
        display.prototype.projection=projection;
        display.prototype.viewProjectionInverse=viewProjectionInverse;
        display.prototype.worldInverseTranspose=worldInverseTranspose;
        display.prototype.worldViewProjection=worldViewProjection;
	
        display.prototype.seconds=0.0;

        display.prototype.setOrthoViewport = function (gl, canvas, width,height) {

            gl.viewport(0, 0, width, height);
            display.prototype.aspectRatio=width/height;
            mat4.perspective(0, display.prototype.aspectRatio , _display.nearDepth, _display.farDepth, projection);
        };

        display.prototype.setScreenViewport = function (gl, canvas) {
            gl.viewport(0, 0, canvas.width, canvas.height);
            display.prototype.aspectRatio=canvas.width/canvas.height;
            mat4.perspective(this.fov, display.prototype.aspectRatio , _display.nearDepth, _display.farDepth, projection);

        };
        display.prototype.resize = function (gl, canvas) {
            
            if (canvas.width != window.innerWidth ||
              canvas.height != window.innerHeight) {
              // Change the size of the canvas to match the size it's being displayed
              canvas.width = window.innerWidth;
              canvas.height = window.innerHeight;
            }
            this.setScreenViewport(gl,canvas);
        };
        
        var tmpRay={d:[0,0,0],o:[0,0,0]};
        var v4t0=[0,0,0,0];
        display.prototype.computePickRay=function(sx,sy,outRay){
            if(!outRay)outRay=tmpRay;
            v4t0[0]=sx*2/canvas.width-1;
            v4t0[1]=1-sy*2/canvas.height;
            v4t0[2]=0;
            v4t0[3]=1;
            mat4.multiplyVec4(viewProjectionInverse,v4t0);
            vec3.scale(v4t0,1.0/v4t0[3]);
            var cameraPos=mat4.getRowV3(viewInverse, 3, outRay.o);
            vec3.subtract(v4t0,cameraPos,outRay.d);
            vec3.normalize(outRay.d);
            return outRay;
        }
        window.onresize=function(){
            display.prototype.resize(canvas.gl,canvas);
        }
        
        window.loadSession=function(){
            var state=localStorage.state;
            if(!state)
                return;
            state = JSON.parse(state);
            v3cp(_display.camera._position , state.cameraPosition);
            v3cp(_display.camera._angles , state.cameraAngles);
      //      _display.camera.orbitX = state.orbitX;
      //      _display.camera.orbitY = state.orbitY;
        }
        
        window.saveSession=function(){
            console.log('display app closed.');
            if(!_display)
                return;
            var state={
                cameraPosition:v3cp(_display.camera._position),
                cameraAngles:v3cp(_display.camera._angles),
                orbitX:_display.camera.orbitX,
                orbitY:_display.camera.orbitY
            }
            localStorage.state=JSON.stringify(state);
        }
        
        function orthoLookAt(at,from,up,rng,dpth){
            mat4.translation(orthoWorld, [0,0,0]);
            mat4.inverse(world,orthoWorldInverse);
            mat4.transpose(orthoWorldInverse,orthoWorldInverseTranspose);
            var cw=0.5;//canvas.clientWidth*0.5;
            var ch=0.5;//canvas.clientHeight*0.5;
            if(rng)cw=ch=rng;
            mat4.ortho(orthoProjection, -cw,cw,-ch,ch, 0.0, dpth?dpth:g_FarZ);
            mat4.lookAt( orthoView, at, from, up);
            mat4.inverse(orthoViewInverse, orthoView);
            mat4.inverse(orthoProjectionInverse, orthoProjection);
            mat4.multiply(orthoView, orthoProjection, orthoViewProjection);
            mat4.inverse(orthoViewProjectionInverse, orthoViewProjection);
            mat4.multiply(orthoWorld, orthoViewProjection, orthoWorldViewProjection);
        }
        
        function setViewProjection(view,projection){
            mat4.set(view,_display.view);
            mat4.set(projection,_display.projection);
            mat4.inverse(view,viewInverse);
            mat4.transpose(viewInverse,viewInverseTranspose);
            mat4.inverse(projection,projectionInverse);
            mat4.multiply(projection, view, viewProjection);
            mat4.inverse( viewProjection,viewProjectionInverse);
		
            //Compute frustum
            /*
            fast.matrix4.getAxis(v3t3, viewInverse, 0); // x
            fast.matrix4.getAxis(v3t4, viewInverse, 1); // y;
            fast.matrix4.getAxis(v3t5, viewInverse, 2); // z;
            fast.matrix4.getAxis(v3t6, viewInverse, 3); // z;


            matrixSetRowVector3(cameraMatrix,0,v3t3)
            matrixSetRowVector3(cameraMatrix,1,v3t4)
            matrixSetRowVector3(cameraMatrix,2,v3t5)
            matrixSetRowVector3(cameraMatrix,3,g_eyePosition);
            cameraMatrix[15]=1.0;
            */
            //mat4.transpose(viewInverse,cameraMatrix);
            
            mat4.getRowV3(viewInverse, 0,v3t3); // x
            mat4.getRowV3(viewInverse, 1,v3t4 ); // y;
            mat4.getRowV3(viewInverse, 2,v3t5 ); // z;
            mat4.getRowV3(viewInverse, 3,v3t6 ); // t;
	
        }

        function setWorld(nworld){
            mat4.set(nworld,world);
            mat4.inverse(world,worldInverse);
            mat4.transpose(worldInverse,worldInverseTranspose);
            mat4.multiply(viewProjection, world, worldViewProjection);
        //    mat4.inverse(worldViewProjection,worldViewProjectionInverse);
        }
        
        display.prototype.makePlaneBatch=function(r,z){
            var planeData=_display.geomBatch(
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
            return planeData;
        }

        display.prototype.makePlaneSpriteBatch=function(r,z){
            var planeData=_display.geomBatch(
                [-r,-r,0.0,
                r,-r,0.0,
                r, r,0.0,
                -r, r,0.0],
                [0,1,2, 2,3,0],
                [0,0,-1,
                0,0,-1,
                0,0,-1,
                0,0,-1],
                [-z,-z, z,-z, z,z, -z,z]);
            return planeData;
        }

        display.prototype.instanceMesh = function(mesh,onto,mat){
            var vbase=onto.vertices.length;
            onto.vertices = onto.vertices.concat(mesh.vertices);
            var vend=onto.vertices.length;
            onto.normals = onto.normals.concat(mesh.normals);
            onto.uvs = onto.uvs.concat(mesh.uvs);
            var ibase=onto.indices.length;
            onto.indices = onto.indices.concat(mesh.indices);
            var iend=onto.indices.length;
            var vtop=vbase/3;
            for(var t=ibase;t<iend;t++){
                onto.indices[t]+=vtop;
            }//451 2058
            if(mat)
            for(var t=vbase;t<vend;t+=3){
                for(var i=0;i<3;i++)
                    v3t0[i]=onto.vertices[t+i];
                //var vt=onto.vertices.slice(t,t+3);
                mat4.multiplyVec3(mat,v3t0);
                for(i=0;i<3;i++)onto.vertices[t+i]=v3t0[i];
            }
        }

        display.prototype.geomBatch = function(v,i,n,u){
            return {
                vertices:v?v:[],
                indices:i?i:[],
                normals:n?n:[],
                uvs:u?u:[]
            }
        }
        display.prototype.setWorld=setWorld;
        display.prototype.setViewProjection=setViewProjection;
	
        display.renderFrame=function(gl,timing){
            alert("Display:renderFrame is not overridden!");
		
        }
	
        display.prototype.renderLoop = function (gl, timing) {
            //        gl.clearColor(0.0, 0.0, 0.1, 1.0);
            display.prototype.seconds = timing.time/1000.0;
            //     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);		
            this.renderFrame(gl,timing);
        }
	
	
        function newBuffer(gl,type,data){
            var buf=gl.createBuffer();
            gl.bindBuffer(type, buf);
            gl.bufferData(type,data,gl.STATIC_DRAW);
            return buf;
        }
	
        function bindVAABuffer(gl,buf,attrib,ecount,stride){
            gl.enableVertexAttribArray(attrib);
            gl.bindBuffer(gl.ARRAY_BUFFER,buf);
            gl.vertexAttribPointer(attrib, ecount, gl.FLOAT, false, stride,0);
        }

        var	renderedShaders=[];
        var renderedShaderTop=0;
        display.prototype.renderActiveShaders=function(passIndex){
            for(var t=0;t<renderedShaderTop;t++){
                var shd=renderedShaders[t];
                if(shd.passIndex==passIndex)shd.render();
            }
        };
	
        var frustumCenter=[0,0,0];
        
        display.prototype.startRendering=function(viewCamera){
            var camera=viewCamera?viewCamera:this.camera;
            vec3.scale(camera._center,-1.0,frustumCenter);
            mat4.getColV3(camera._viewMat,2,v3t0);
            vec3.scale(v3t0,this.farDepth/-2,v3t0);
            vec3.add(v3t0,frustumCenter,frustumCenter);
            setViewProjection(camera.getViewMat(),projection);
        };

        display.prototype.finishRendering=function(){
            for(var t=0;t<renderedShaderTop;t++){
                var shd=renderedShaders[t];
                shd.displayTop=0;
            }
            renderedShaderTop=0;
        };

        display.prototype.renderComponent=function(object,component,shader){
            if(!shader.dontCull){
                var dist=this.farDepth*1.0; //rough distance culling...
                var dx=object.matrix[12]-frustumCenter[0];//+_display.camera._center[0];
                var dy=object.matrix[13]-frustumCenter[1];//+_display.camera._center[1];
                var dz=object.matrix[14]-frustumCenter[2];//+_display.camera._center[1];
                if((dx*dx)+(dy*dy)+(dz*dz)>(dist*dist))
                    return;
            }
            if(shader.displayTop==0){
                if(renderedShaders.length==renderedShaderTop)
                    renderedShaders.push(shader);
                else
                    renderedShaders[renderedShaderTop]=shader;
                renderedShaderTop++;
            }
            shader.addToDisplayList(object,component);
        };


        var bindRTTForRendering=function(gl){
            //Bind the buffers for rendering>..
            gl.bindFramebuffer(gl.FRAMEBUFFER,this.frameBuffer);
            if(this.depthBuffer)gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
            if(this.depthBuffer)gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.depthBuffer);
        };

        display.prototype.unbindRTT=function(gl){
            //Unbind everything
            gl.bindTexture(gl.TEXTURE_2D, null);
            gl.bindRenderbuffer(gl.RENDERBUFFER, null);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        };

        display.prototype.initRTT=function(gl,width,height,noDepth){
            //Create the FBO
            var rtn={};
            var rttFrameBuffer = rtn.frameBuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER,rttFrameBuffer);
            rttFrameBuffer.width=width?width:256;
            rttFrameBuffer.height=height?height:256;

            //Create the color output texture
            var rttTexture = rtn.texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D,rttTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);//LINEAR);//LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);//LINEAR_MIPMAP_NEAREST);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, rttFrameBuffer.width, rttFrameBuffer.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            //gl.generateMipmap(gl.TEXTURE_2D);

            if(!noDepth){
                //Create the depth output buffer
                var rttDepthBuffer =  rtn.depthBuffer = gl.createRenderbuffer();
                gl.bindRenderbuffer(gl.RENDERBUFFER, rttDepthBuffer);
                gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, rttFrameBuffer.width, rttFrameBuffer.height);
            }

            rtn.bindRTTForRendering = bindRTTForRendering;

            this.unbindRTT(gl);
            return rtn;
        };

        display.prototype.updateMeshAOs=function(gl,mesh,shader,vaos){
            for(var vi=0;vi<vaos.length;vi++){
                vaoExtension.bindVertexArrayOES(vaos[vi]);
                if(mesh.vertices)
                    bindVAABuffer(gl,mesh.vertices,shader.attribLoc.position,3,12);
                if(mesh.normals)
                    bindVAABuffer(gl,mesh.normals,shader.attribLoc.normal,3,12);
                if(mesh.uvs)
                    bindVAABuffer(gl,mesh.uvs,shader.attribLoc.texCoord,2,8);
                if(mesh.faceGroups){
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.faceGroups[vi]);
                }else if(mesh.indices)
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.indices);
            }
            vaoExtension.bindVertexArrayOES(null);            
        };
        
        display.prototype.buildMeshAOs=function(gl,mesh,shader){
            if(mesh.faceGroups){
                var gpct=0;
                var gpmsk=mesh.faceGroups;
                var vaos=[];
                while(gpmsk){gpmsk<<=1;gpct++;vaos.push(vaoExtension.createVertexArrayOES());}

            }else
                vaos=[vaoExtension.createVertexArrayOES()];
            this.updateMeshAOs(gl,mesh,shader,vaos);
            return vaos;
        };
	
        display.prototype.meshRenderer=function(gl,mesh,shader){
            var disp=this;
            var meshRend = {
                type:"meshRenderer",
                vaos:this.buildMeshAOs(gl,mesh,shader),
                mesh:mesh,
                shader:shader,
                updateMesh:function()
                {
                    disp.updateMeshAOs(gl,this.mesh,this.shader,this.vaos);
                },
                    
                render:function(go){
                    
                    vaoExtension.bindVertexArrayOES(this.vaos[0]);
					
                    disp.setWorld(go.matrix);
                    //Bind our uniforms...
                    var uniforms=this.shader.uniform;
                    var shader=this.shader;
                    for(var u in uniforms){
			
                        if(go[u]!=undefined){
                            shader.setUniform(u,go[u]);
                        }else if(display.prototype[u]!=undefined){
                            shader.setUniform(u,display.prototype[u]);				
                        }else if(this[u]!=undefined){
                            shader.setUniform(u,this[u]);
                        }else if(shader[u]!=undefined){
                            shader.setUniform(u,shader[u]);
                        }else{
                            console.log("Shader:"+shader.name+" Uniform:"+u+" is undefined.");
                            debugger;
                        }
                    }
                    //Render our submeshes...
				
                    gl.drawElements(gl.TRIANGLES,this.mesh.elemCount*3,gl.UNSIGNED_SHORT,0);
                    //this.renderComponent(go,this,shader);
                    vaoExtension.bindVertexArrayOES(null);
                }
            };
		
            return meshRend;
        };
	
        display.prototype.destroyMesh=function(gl,m){
            if(m.vertices)gl.deleteBuffer(m.vertices);
            if(m.normals)gl.deleteBuffer(m.normals);
            if(m.uvs)gl.deleteBuffer(m.uvs);
            if(m.indices)gl.deleteBuffer(m.indices);
        };
        
        display.prototype.mesh=function(gl,vertices,indices,normals,uvs){
            var m = {};
            if(vertices)m.vertices=newBuffer(gl,gl.ARRAY_BUFFER,new Float32Array(vertices));
            if(normals)m.normals=newBuffer(gl,gl.ARRAY_BUFFER,new Float32Array(normals));
            if(uvs)m.uvs=newBuffer(gl,gl.ARRAY_BUFFER,new Float32Array(uvs));
            if(indices){
                m.indices=newBuffer(gl,gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices));
                m.elemCount=indices.length/3;
            }
            return m;
        };
        
        display.prototype.alphaKeyDown = function(k){
            if(this.cameraModule.KeyboardState._pressedKeys[k.charCodeAt(0)])
                return true;
            return false;
        };
    
        display.prototype.alphaKeyPressed = function(k){
            var ck=k.charCodeAt(0);
            if(this.cameraModule.KeyboardState._pressedKeys[ck]&&
               (!this.cameraModule.KeyboardState._debounceKeys[ck])){
                    this.cameraModule.KeyboardState._debounceKeys[ck]=true;
                    return true;
            }
            return false;
        };

        display.prototype.keyCodeDown = function(kc){
            if(this.cameraModule.KeyboardState._pressedKeys[kc])
                return true;
            return false;
        };
        
        return {
            display: display,
            getDisplay: function(){return _display;},
            cameraMatrix: cameraMatrix,
            view: view,
            viewInverse: viewInverse
        };
    });




	/*

	tdl.models.Model.prototype.applyUniforms_ = function(opt_uniforms) {
	  if (opt_uniforms) {
		var program = this.program;
		for (var uniform in opt_uniforms) {
		  program.setUniform(uniform, opt_uniforms[uniform]);
		}
	  }
	};
*/
	/**
	 * Sets up the shared parts of drawing this model. Uses the
	 * program, binds the buffers, sets the textures.
	 *
	 * @param {!Object.<string, *>} opt_uniforms An object of names to
	 *     values to set on this models uniforms.
	 * @param {!Object.<string, *>} opt_textures An object of names to
	 *     textures to set on this models uniforms.
	 */
	 /*
	tdl.models.Model.prototype.drawPrep = function() {
	  var program = this.program;
	  var buffers = this.buffers;
	  var textures = this.textures;

	  program.use();
	  for (var buffer in buffers) {
		var b = buffers[buffer];
		if (buffer == 'indices') {
		  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b.buffer());
		} else {
		  var attrib = program.attrib[buffer];
		  if (attrib) {
			attrib(b);
		  }
		}
	  }

	  this.applyUniforms_(textures);
	  for (var ii = 0; ii < arguments.length; ++ii) {
		this.applyUniforms_(arguments[ii]);
	  }
	};
*/
	/**
	 * Draws this model.
	 *
	 * After calling tdl.models.Model.drawPrep you can call this
	 * function multiple times to draw this model.
	 *
	 * @param {!Object.<string, *>} opt_uniforms An object of names to
	 *     values to set on this models uniforms.
	 * @param {!Object.<string, *>} opt_textures An object of names to
	 *     textures to set on this models uniforms.
	 */
	 /*
	tdl.models.Model.prototype.draw = function() {
	  for (var ii = 0; ii < arguments.length; ++ii) {
		this.applyUniforms_(arguments[ii]);
	  }

	  var buffers = this.buffers;
	  gl.drawElements(
		  this.mode, buffers.indices.totalComponents(), gl.UNSIGNED_SHORT, 0);
	};
*/