SCRIPT='TNDVS';

attribute vec4 position;
attribute vec3 normal;
attribute vec2 texCoord;

uniform mat4 worldViewProjection;
uniform mat4 world;
uniform mat4 view;
uniform mat4 projection;
uniform mat4 worldInverse;
uniform mat4 viewInverse;
uniform mat4 worldInverseTranspose;

varying vec4 v_position;
varying vec2 v_texCoord;
varying vec3 v_normal;

varying float atmosBlend;
void main() {
    v_texCoord = texCoord;
    v_position = worldViewProjection * position;

    v_normal =  (worldInverseTranspose * vec4(normal, 0)).xyz;
    gl_Position = v_position;// worldViewProjection * position;

    atmosBlend=1.0-(clamp((v_position.z-100.0),0.0,100.0) / 100.0);
}

SCRIPT='TNDFS';

//#ifdef GL_ES
precision mediump float;
//#endif

uniform sampler2D diffuseSampler;
varying vec3 v_normal;
varying vec4 v_position;
varying vec2 v_texCoord;
varying float atmosBlend;

//uniform float farDepth;
//
void main() {
    vec4 diffuse = texture2D(diffuseSampler, v_texCoord);
    if(diffuse.a<0.5)
        discard;
    //vec3 normal = normalize(v_normal);tmosB
    //((v_normal+1.0)*0.5)*0.1*atmosBlend*v_normal.z;//diffuse.rgb;//abs(v_normal);//vec3(1.0,0,0);////
    gl_FragColor.rgb = ((diffuse.rgb * atmosBlend * v_normal.z)+((1.0-atmosBlend)*vec3(0.5, 0.6, 0.9)));//v_normal;//diffuse*normal.y;

    //gl_FragColor.rgb = diffuse.rgb*v_normal.z;


//    gl_FragColor.a=1.0;
}

SCRIPT='UnitVS';

attribute vec4 position;
attribute vec3 normal;
attribute vec2 texCoord;

uniform mat4 worldViewProjection;
uniform mat4 world;
uniform mat4 view;
uniform mat4 projection;
uniform mat4 worldInverse;
uniform mat4 viewInverse;
uniform mat4 worldInverseTranspose;
uniform vec4 tint;

varying vec4 v_position;
varying vec2 v_texCoord;
varying vec3 v_normal;
varying vec4 v_tint;
varying float atmosBlend;

void main() {
    v_texCoord = texCoord;
    v_position = worldViewProjection * position;

    v_normal =  (worldInverseTranspose * vec4(normal, 0)).xyz;
    gl_Position = v_position;// worldViewProjection * position;

    atmosBlend=1.0-(clamp((v_position.z-100.0),0.0,100.0) / 100.0);
    v_tint = tint;
}

SCRIPT='UnitFS';

//#ifdef GL_ES
precision mediump float;
//#endif

uniform sampler2D diffuseSampler;
varying vec3 v_normal;
varying vec4 v_position;
varying vec4 v_tint;
varying vec2 v_texCoord;
varying float atmosBlend;

//uniform float farDepth;
//
void main() {
    vec4 diffuse = texture2D(diffuseSampler, v_texCoord);
    if(diffuse.a<0.5)
        discard;
    //vec3 normal = normalize(v_normal);tmosB
    //((v_normal+1.0)*0.5)*0.1*atmosBlend*v_normal.z;//diffuse.rgb;//abs(v_normal);//vec3(1.0,0,0);////
    gl_FragColor.rgb = ((diffuse.rgb * atmosBlend * v_normal.z)+((1.0-atmosBlend)*vec3(0.5, 0.6, 0.9)));//v_normal;//diffuse*normal.y;

    gl_FragColor += v_tint;
    //gl_FragColor.rgb = diffuse.rgb*v_normal.z;


//    gl_FragColor.a=1.0;
}

SCRIPT='explosionVS';
attribute vec4 position;
attribute vec3 normal;
attribute vec2 texCoord;
uniform mat4 worldInverseTranspose;
uniform mat4 worldViewProjection;
uniform float scale;

varying vec4 v_position;
varying vec2 v_texCoord;
varying vec3 v_normal;

void main() {
    v_texCoord = texCoord;
    v_position = position;
    v_normal =  (worldInverseTranspose * vec4(normal, 0)).xyz;
    gl_Position = worldViewProjection * vec4((position.xyz*scale*2.0),1.0);
}

SCRIPT='explosionFS';

//#ifdef GL_ES
precision mediump float;
//#endif

uniform sampler2D diffuseSampler;
varying vec3 v_normal;
varying vec4 v_position;
varying vec2 v_texCoord;
uniform float alpha;

void main() {
    vec4 diffuse = texture2D(diffuseSampler, v_texCoord);
    gl_FragColor.rgb = diffuse.rgb;//v_normal;//diffuse*normal.y;
    gl_FragColor.a=alpha;

    if(diffuse.g>0.5)
        discard;
}

SCRIPT='hudVS';
attribute vec4 position;
attribute vec3 normal;
attribute vec2 texCoord;
uniform mat4 worldInverseTranspose;
uniform mat4 worldViewProjection;
uniform float scale;
uniform float aspectRatio;
uniform vec3 pos;
varying vec4 v_position;
varying vec2 v_texCoord;
varying vec3 v_normal;

void main() {
    v_texCoord = texCoord;
    v_position = position;
    v_normal =  normal;
    gl_Position = vec4((pos+v_position.xyz)*scale,1);//worldViewProjection * vec4((position.xyz*scale*2.0),1.0);
    gl_Position.y*=aspectRatio;
}

SCRIPT='hudFS';

//#ifdef GL_ES
precision mediump float;
//#endif

uniform sampler2D diffuseSampler;
varying vec3 v_normal;
varying vec4 v_position;
varying vec2 v_texCoord;
uniform float alpha;

void main() {
    vec4 diffuse = texture2D(diffuseSampler, v_texCoord);
    gl_FragColor.rgb = diffuse.rgb;//v_normal;//diffuse*normal.y;
    gl_FragColor.a=(1.0-diffuse.r);
}

SCRIPT='windVS';

LINK='noise3D';

attribute vec4 position;
attribute vec3 normal;
attribute vec2 texCoord;

uniform mat4 worldViewProjection;
uniform mat4 world;
uniform mat4 view;
uniform mat4 projection;
uniform mat4 worldInverse;
uniform mat4 viewInverse;
uniform mat4 worldInverseTranspose;
uniform float seconds;

varying vec4 v_position;
varying vec2 v_texCoord;
varying vec3 v_normal;

void main() {
    v_texCoord = texCoord;
    v_position = position;
    v_normal =  (worldInverseTranspose * vec4(normal, 0)).xyz;
	
    gl_Position = worldViewProjection * position;
	
	vec3 wpos=(world*position).xyz*0.02;
	wpos.y+=seconds*1.5;
	float nv=snoise(wpos);
	//if(nv>0.5)nv*=2.0;
	gl_Position.y += nv*10.0;
}

SCRIPT='windFS';

//float rand(vec2 co){
//    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
//}

//#ifdef GL_ES
precision mediump float;
//#endif

uniform sampler2D diffuseSampler;
varying vec3 v_normal;
varying vec4 v_position;
varying vec2 v_texCoord;

void main() {
    vec4 diffuse = texture2D(diffuseSampler, v_texCoord);
    vec3 normal = normalize(v_normal);
    gl_FragColor.rbg = diffuse.rbg;//v_normal;//diffuse*normal.y;
}

SCRIPT='additiveSpriteVS';

LINK='noise3D';

attribute vec4 position;
attribute vec3 normal;
attribute vec2 texCoord;

uniform mat4 worldViewProjection;
uniform mat4 world;
uniform mat4 view;
uniform mat4 projection;
uniform mat4 worldInverse;
uniform mat4 viewInverse;
uniform mat4 worldInverseTranspose;
uniform float seconds;
uniform float aspectRatio;

//varying vec4 v_position;
varying vec2 v_texCoord;
varying vec3 v_normal;
varying vec3 v_color;
uniform float spriteAlpha;
varying float v_spriteAlpha;
//vec3    colors[4];//=vec3[4](vec3(1,1,1),vec3(1,1,1),vec3(1,1,1),vec3(1,1,1));

void main() {
    //mat4 iview=inverse(view);
    v_texCoord = texCoord;
    vec4 v_position = position;
    
    v_normal =  (worldInverseTranspose * vec4(normal, 0)).xyz;

    float abv=abs(v_position.x);
    float cfrac=mod((abv*1000.0),4.0);
    float cfrac2=mod((abv*1230.0),1.0);
    
    v_position = worldViewProjection * v_position;
    v_position.xyz+=vec3(1,0,0)*((v_texCoord.x-0.5)*1.0);
    v_position.xyz+=vec3(0,aspectRatio,0)*((v_texCoord.y-0.5)*1.0);
    v_texCoord.x=v_texCoord.x<0.0?0.0:1.0;
    v_texCoord.y=v_texCoord.y<0.0?0.0:1.0;
    
    
    v_color=(cfrac>3.0)?vec3(1,1,1):(cfrac>2.0)?vec3(0.3,0.3,1.0):vec3(0.8,0.8,0.2);

    v_spriteAlpha=spriteAlpha*((cfrac2*0.9)+0.1);
 
 //v_color=vec3(1,1,1);
    
 //   v_position.x+=;
//    v_position.z+=(texCoord.y-0.5)*3.0;
    gl_Position = v_position;

//	vec3 wpos=(world*position).xyz*0.02;
//	wpos.y+=seconds*1.5;
//	float nv=snoise(wpos);
	//if(nv>0.5)nv*=2.0;
//	gl_Position.y += nv*10.0;
}

SCRIPT='additiveSpriteFS';

//float rand(vec2 co){
//    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
//}

//#ifdef GL_ES
precision mediump float;
//#endif

uniform sampler2D diffuseSampler;
varying vec3 v_normal;
//varying vec4 v_position;
varying vec2 v_texCoord;
varying vec3 v_color;
//uniform float spriteAlpha;
varying float v_spriteAlpha;

void main() {
    vec4 diffuse = texture2D(diffuseSampler, v_texCoord);
    vec3 normal = normalize(v_normal);
    gl_FragColor.rbg = (diffuse.rbg*v_spriteAlpha)*v_color.rbg;//*-normal.z;//*normal.z;//;//diffuse.rbg;//vec3(0.2,0.2,0.2);// v_normal;//
}
SCRIPT='debugSwatchVS';

attribute vec4 position;
attribute vec3 normal;
attribute vec2 texCoord;

varying vec4 v_position;
varying vec2 v_texCoord;
varying vec3 v_normal;

//uniform sampler2D diffuseSampler;
uniform vec3 scale;
uniform float aspectRatio;
uniform vec3 pos;

void main() {

    v_texCoord = texCoord;
    v_position = position;
    v_position.w=1.0;
    v_normal =  normal;

    //vec4 diffuse = texture2D(diffuseSampler, v_texCoord);
    //if(diffuse.a<1.0)
    //    v_position.y = v_position.y*0.1;

    gl_Position = vec4(
        (pos.x+v_position.x)*scale.x,// /aspectRatio))*scale.x),
        (pos.y+v_position.y)*scale.y,//*aspectRatio,
        (pos.z+v_position.z)*scale.z,
        1);//worldViewProjection * vec4((position.xyz*scale*2.0),1.0);
    //gl_Position.y*=aspectRatio;
}


SCRIPT='debugSwatchFS';

//#ifdef GL_ES
precision mediump float;
//#endif

uniform sampler2D diffuseSampler;
varying vec3 v_normal;
varying vec4 v_position;
varying vec2 v_texCoord;

void main() {
    vec4 diffuse = texture2D(diffuseSampler, v_texCoord);
    diffuse.a=5.0-(length(v_texCoord-vec2(0.5,0.5))*10.0);
    gl_FragColor = diffuse;//vec4(1,0,0,1);//
}

SCRIPT='endScripts';

