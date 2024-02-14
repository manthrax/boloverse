let isNode;
if (typeof window === "undefined") {
    isNode = true;
}

async function loadText(url) {
    const response = await fetch(url);
    return await response.text();
}

let shaderSource, libNoise2D, libNoise3D, libNoise4D;

if (!isNode) {
    shaderSource = await loadText("./js/shaders.glsl");
    libNoise2D = await loadText("./js/shaders/noise2D.glsl");
    libNoise3D = await loadText("./js/shaders/noise3D.glsl");
    libNoise4D = await loadText("./js/shaders/noise4D.glsl");
}

let shaderIncludes = {
    noise2D: libNoise2D,
    noise3D: libNoise3D,
    noise4D: libNoise4D,
};

let programs = {};

//All the programs currently loaded.
programs.programDB = {};
//All the programs currently loaded.
programs.shaderDB = {};

/**
 * Loads a program from script tags.
 * @param {string} vertexShaderId The id of the script tag that contains the
 *     vertex shader source.
 * @param {string} fragmentShaderId The id of the script tag that contains the
 *     fragment shader source.
 * @return {Program} The created program.
 */
programs.loadProgramFromScriptTags = function (
    gl,
    vertexShaderId,
    fragmentShaderId
) {
    let vertElem = document.getElementById(vertexShaderId);
    let fragElem = document.getElementById(fragmentShaderId);
    if (!vertElem) {
        throw "Can't find vertex program tag: " + vertexShaderId;
    }
    if (!fragElem) {
        throw "Can't find fragment program tag: " + fragmentShaderId;
    }
    return loadProgram(
        gl,
        document.getElementById(vertexShaderId).text,
        document.getElementById(fragmentShaderId).text
    );
};

/**
 * Loads a program.
 * @param {string} vertexShader The vertex shader source.
 * @param {string} fragmentShader The fragment shader source.
 * @return {Program} The created program.
 */
programs.loadProgram = function (gl, vertexShader, fragmentShader) {
    let id = vertexShader + fragmentShader;
    let program = this.programDB[id];
    if (program) {
        return program;
    }
    try {
        program = new this.Program(gl, vertexShader, fragmentShader);
    } catch (e) {
        lastError = e;
        return null;
    }
    this.programDB[id] = program;
    return program;
};

/**
 * A object to manage a WebGLProgram.
 * @constructor
 * @param {string} vertexShader The vertex shader source.
 * @param {string} fragmentShader The fragment shader source.
 */
programs.Program = function (gl, vertexShader, fragmentShader) {
    /**
     * Loads a shader.
     * @param {!WebGLContext} gl The WebGLContext to use.
     * @param {string} shaderSource The shader source.
     * @param {number} shaderType The type of shader.
     * @return {!WebGLShader} The created shader.
     */

    let loadShader = function (gl, shaderSource, shaderType) {
        let id = shaderSource + shaderType;
        let dbshader = programs.shaderDB[id];
        if (dbshader) {
            return dbshader;
        }

        // Create the shader object
        let shader = gl.createShader(shaderType);
        let lastError = null;

        //if (shader == null) {         //Dont do this check per mozilla reccomendation..
        //The only time it should happen is on context loss.. which we deal with higher up
        //	throw("*** Error: unable to create shader '"+shaderSource+"'");
        //}

        // Load the shader source
        gl.shaderSource(shader, shaderSource);

        // Compile the shader
        gl.compileShader(shader);

        // Check the compile status
        let compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (!compiled && !gl.isContextLost()) {
            // Something went wrong during compilation; get the error
            lastError = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw "*** Error compiling shader :" + lastError;
        }

        programs.shaderDB[id] = shader;
        return shader;
    };

    /**
     * Loads shaders from script tags, creates a program, attaches the shaders and
     * links.
     * @param {!WebGLContext} gl The WebGLContext to use.
     * @param {string} vertexShader The vertex shader.
     * @param {string} fragmentShader The fragment shader.
     * @return {!WebGLProgram} The created program.
     */
    let loadProgram = function (gl, vertexShader, fragmentShader) {
        let vs;
        let fs;
        let program;
        try {
            vs = loadShader(gl, vertexShader, gl.VERTEX_SHADER);
            fs = loadShader(gl, fragmentShader, gl.FRAGMENT_SHADER);
            program = gl.createProgram();
            gl.attachShader(program, vs);
            gl.attachShader(program, fs);
            linkProgram(gl, program);
        } catch (e) {
            if (vs) {
                gl.deleteShader(vs);
            }
            if (fs) {
                gl.deleteShader(fs);
            }
            if (program) {
                gl.deleteShader(program);
            }
            throw e;
        }
        return program;
    };

    /**
     * Links a WebGL program, throws if there are errors.
     * @param {!WebGLContext} gl The WebGLContext to use.
     * @param {!WebGLProgram} program The WebGLProgram to link.
     */
    let linkProgram = function (gl, program) {
        // Link the program
        gl.linkProgram(program);

        // Check the link status
        let linked = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!linked && !gl.isContextLost()) {
            // something went wrong with the link
            lastError = gl.getProgramInfoLog(program);
            throw "*** Error in program linking:" + lastError;
        }
    };

    // Compile shaders
    let program = loadProgram(gl, vertexShader, fragmentShader);
    if (!program) {
        throw "could not compile program";
    }

    // Look up attribs.
    let attribs = {};
    // Also make a plain table of the locs.
    let attribLocs = {};

    programs.Program.prototype.renderImmediate = function () {
        gl.useProgram(this.program);
    };
    programs.Program.prototype.render = function () {
        gl.useProgram(this.program);
        for (let t = 0; t < this.displayTop; t++) {
            let elem = this.displayList[t];
            elem[1].render(elem[0]);
        }
        //			this.displayTop=0;
    };

    programs.Program.prototype.addToDisplayList = function (object, component) {
        if (this.displayTop == this.displayList.length)
            this.displayList.push([object, component]);
        else {
            let slot = this.displayList[this.displayTop];
            slot[0] = object;
            slot[1] = component;
        }
        this.displayTop++;
    };

    function createAttribSetter(info, index) {
        if (info.size != 1) {
            throw "arrays of attribs not handled";
        }
        return function (b) {
            gl.bindBuffer(gl.ARRAY_BUFFER, b.buffer());
            gl.enableVertexAttribArray(index);
            gl.vertexAttribPointer(
                index,
                b.numComponents(),
                b.type(),
                b.normalize(),
                b.stride(),
                b.offset()
            );
        };
    }
    function endsWith(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }
    let numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
    for (let ii = 0; ii < numAttribs; ++ii) {
        let info = gl.getActiveAttrib(program, ii);
        let name = info.name;
        if (endsWith(name, "[0]")) {
            name = name.substr(0, name.length - 3);
        }
        let index = gl.getAttribLocation(program, info.name);
        attribs[name] = createAttribSetter(info, index);
        attribLocs[name] = index;
    }

    // Look up uniforms
    let numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    let uniforms = {};
    let textureUnit = 0;

    function createUniformSetter(info) {
        let loc = gl.getUniformLocation(program, info.name);
        let type = info.type;
        if (info.size > 1 && endsWith(info.name, "[0]")) {
            // It's an array.
            if (type == gl.FLOAT)
                return function (v) {
                    gl.uniform1fv(loc, v);
                };
            if (type == gl.FLOAT_VEC2)
                return function (v) {
                    gl.uniform2fv(loc, v);
                };
            if (type == gl.FLOAT_VEC3)
                return function (v) {
                    gl.uniform3fv(loc, v);
                };
            if (type == gl.FLOAT_VEC4)
                return function (v) {
                    gl.uniform4fv(loc, v);
                };
            if (type == gl.INT)
                return function (v) {
                    gl.uniform1iv(loc, v);
                };
            if (type == gl.INT_VEC2)
                return function (v) {
                    gl.uniform2iv(loc, v);
                };
            if (type == gl.INT_VEC3)
                return function (v) {
                    gl.uniform3iv(loc, v);
                };
            if (type == gl.INT_VEC4)
                return function (v) {
                    gl.uniform4iv(loc, v);
                };
            if (type == gl.BOOL)
                return function (v) {
                    gl.uniform1iv(loc, v);
                };
            if (type == gl.BOOL_VEC2)
                return function (v) {
                    gl.uniform2iv(loc, v);
                };
            if (type == gl.BOOL_VEC3)
                return function (v) {
                    gl.uniform3iv(loc, v);
                };
            if (type == gl.BOOL_VEC4)
                return function (v) {
                    gl.uniform4iv(loc, v);
                };
            if (type == gl.FLOAT_MAT2)
                return function (v) {
                    gl.uniformMatrix2fv(loc, false, v);
                };
            if (type == gl.FLOAT_MAT3)
                return function (v) {
                    gl.uniformMatrix3fv(loc, false, v);
                };
            if (type == gl.FLOAT_MAT4)
                return function (v) {
                    gl.uniformMatrix4fv(loc, false, v);
                };
            if (type == gl.SAMPLER_2D || type == gl.SAMPLER_CUBE) {
                let units = [];
                for (let ii = 0; ii < info.size; ++ii) {
                    units.push(textureUnit++);
                }
                return (function (units) {
                    return function (v) {
                        gl.uniform1iv(loc, units);
                        v.bindToUnit(units);
                    };
                })(units);
            }
            throw "unknown type: 0x" + type.toString(16);
        } else {
            if (type == gl.FLOAT)
                return function (v) {
                    gl.uniform1f(loc, v);
                };
            if (type == gl.FLOAT_VEC2)
                return function (v) {
                    gl.uniform2fv(loc, v);
                };
            if (type == gl.FLOAT_VEC3)
                return function (v) {
                    gl.uniform3fv(loc, v);
                };
            if (type == gl.FLOAT_VEC4)
                return function (v) {
                    gl.uniform4fv(loc, v);
                };
            if (type == gl.INT)
                return function (v) {
                    gl.uniform1i(loc, v);
                };
            if (type == gl.INT_VEC2)
                return function (v) {
                    gl.uniform2iv(loc, v);
                };
            if (type == gl.INT_VEC3)
                return function (v) {
                    gl.uniform3iv(loc, v);
                };
            if (type == gl.INT_VEC4)
                return function (v) {
                    gl.uniform4iv(loc, v);
                };
            if (type == gl.BOOL)
                return function (v) {
                    gl.uniform1i(loc, v);
                };
            if (type == gl.BOOL_VEC2)
                return function (v) {
                    gl.uniform2iv(loc, v);
                };
            if (type == gl.BOOL_VEC3)
                return function (v) {
                    gl.uniform3iv(loc, v);
                };
            if (type == gl.BOOL_VEC4)
                return function (v) {
                    gl.uniform4iv(loc, v);
                };
            if (type == gl.FLOAT_MAT2)
                return function (v) {
                    gl.uniformMatrix2fv(loc, false, v);
                };
            if (type == gl.FLOAT_MAT3)
                return function (v) {
                    gl.uniformMatrix3fv(loc, false, v);
                };
            if (type == gl.FLOAT_MAT4)
                return function (v) {
                    gl.uniformMatrix4fv(loc, false, v);
                };
            if (type == gl.SAMPLER_2D || type == gl.SAMPLER_CUBE) {
                return (function (unit) {
                    return function (v) {
                        gl.uniform1i(loc, unit);
                        v.bindToUnit(unit);
                    };
                })(textureUnit++);
            }
            throw "unknown type: 0x" + type.toString(16);
        }
    }

    let textures = {};

    for (let ii = 0; ii < numUniforms; ++ii) {
        let info = gl.getActiveUniform(program, ii);
        name = info.name;
        if (endsWith(name, "[0]")) {
            name = name.substr(0, name.length - 3);
        }
        let setter = createUniformSetter(info);
        uniforms[name] = setter;
        if (info.type == gl.SAMPLER_2D || info.type == gl.SAMPLER_CUBE) {
            textures[name] = setter;
        }
    }
    this.textures = textures;
    this.program = program;
    this.attrib = attribs;
    this.attribLoc = attribLocs;
    this.uniform = uniforms;
    this.displayTop = 0;
    this.displayList = [];
};

programs.g_scriptCache = {};

programs.getScriptText = function (tagName) {
    if (Object.keys(this.g_scriptCache).length != 0)
        return this.g_scriptCache[tagName];

    let ctext = null;
    if (shaderSource != null) {
        ctext = shaderSource;
    } else {
        let scriptElem;
        if (typeof document != "function") {
            this.g_scriptCache[tagName] = "";
            return this.g_scriptCache[tagName];
        } else if (
            (scriptElem = document.getElementById("shaderScript")) != null
        ) {
            //Load the scripts from a script element...
            //This is used to embed shaders directly in the root html for the app
            ctext = scriptElem.text;
        } else {
            //Load the scripts from an iframe
            //This is used to load shaders from an iframe in the document, that srces the shader src
            scriptElem = document.getElementById("shaderIFrame");
            ctext = scriptElem.contentWindow.document.body.innerHTML;
        }
    }

    let chunks = ctext.split("SCRIPT='");
    for (let ckey in chunks) {
        let chunk = chunks[ckey];
        let sstart = chunk.indexOf("';");
        let sname = chunk.substring(0, sstart);
        chunk = chunk.substring(sstart + 3);
        if (chunk !== "" && sname !== "") {
            sstart = chunk.indexOf("LINK='");
            if (sstart >= 0) {
                let send = chunk.indexOf("';");
                let lname = chunk.substring(sstart + 6, send);
                chunk =
                    chunk.substring(0, sstart) +
                    shaderIncludes[lname] +
                    chunk.substring(send + 3);
            }

            this.g_scriptCache[sname] = chunk;
        }
    }
    return this.g_scriptCache[tagName];
};

programs.createProgramFromTags = function (gl, vertexTagId, fragmentTagId) {
    if(!gl)return {}
    
    let shdr = this.loadProgram(
        gl,
        this.getScriptText(vertexTagId),
        this.getScriptText(fragmentTagId)
    );
    //document.getElementById(vertexTagId).text, document.getElementById(fragmentTagId).text);
    if (!shdr) {
        shdr = {};
        //alert("Shader error:"+lastError);
    } else {
        shdr.name = vertexTagId + ":" + fragmentTagId;
    }
    return shdr;
};

programs.Program.prototype.use = function () {
    gl.useProgram(this.program);
};

//function dumpValue(msg, name, value) {
//  let str;
//  if (value.length) {
//      str = value[0].toString();
//     for (let ii = 1; ii < value.length; ++ii) {
//       str += "," + value[ii];
//     }
//  } else {
//    str = value.toString();
//  }
//  tdl.log(msg + name + ": " + str);
//}

programs.Program.prototype.setUniform = function (uniform, value) {
    let func = this.uniform[uniform];
    if (func) {
        //dumpValue("SET UNI:", uniform, value);
        func(value);
    }
    let g_debug = false;
    if (g_debug) {
        if (!func) console.log("Unused uniform:" + uniform);
        let error = gl.getError();
        if (error != gl.NO_ERROR && error != gl.CONTEXT_LOST_WEBGL) {
            console.log(
                "uniform:" +
                    uniform +
                    " errored:" +
                    WebGLDebugUtils.glEnumToString(error)
            );
            debugger;
        }
    }
};

export default programs;
