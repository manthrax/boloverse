define([
    "js/util/gl-matrix.js"
], function () {

    "use strict";

    var KeyboardState={
        _pressedKeys: new Array(128),
        _debounceKeys: new Array(128)
    }
    function addKeyEventHooks(){
        
        // Set up the appropriate event hooks
        window.addEventListener("keydown", function (event) {
            KeyboardState._debounceKeys[event.keyCode] = false;
            KeyboardState._pressedKeys[event.keyCode] = true;
        }, false);

        window.addEventListener("keyup", function (event) {
            KeyboardState._pressedKeys[event.keyCode] = false;
        }, false);
    }
    
    var ModelCamera, FlyingCamera;
    
    /**
     * A ModelDemoCamera is one that always points at a central point and orbits around at a fixed radius
     * This type of camera is good for displaying individual models
     */
    ModelCamera = function (canvas) {
        var self = this, moving = false;
        
        this.lastX=0;
        this.lastY=0;
        this.zoomLevel=0;
        this.mouseX=0;
        this.mouseY=0;
        this.mouseButtonsDown=0;
        this.orbitX = 3.5;
        this.orbitY = 6.0;
        this._distance = 1;
        this._center = vec3.create();
        this._viewMat = mat4.create();
        this._dirty = true;
        this.cameraInTransition=false;
        
        this.zoomTime=2000;
        this.zoomTween=new TWEEN.Tween(this);
        this.spinTween=new TWEEN.Tween(this);

        this.zoomValues=[8.0,30.0,70,100];
       // document.onmousewheel = wheel;
        this.addMouseControls = function(canvas){
            var self=this;
            addKeyEventHooks();
            // Set up the appropriate event hooks
            canvas.addEventListener('mousedown', function (event) {
                self.mouseButtonsDown|=(1<<event.which);
                if (event.which === 1) {
                    moving = true;
                }
                self.lastX = event.pageX;
                self.lastY = event.pageY;
                self.mouseX=event.pageX;
                self.mouseY=event.pageY;
            }, false);

            canvas.addEventListener('mousewheel', function (event) {
                var delta = 0;
                if (!event) event = window.event;
                if (event.wheelDelta) {
                    delta = event.wheelDelta/120;
                    if (window.opera) delta = -delta;
                } else if (event.detail) {
                    delta = -event.detail/3;
                }
                if (delta){
                    self.zoomLevel-=delta;
                    if(self.zoomLevel<0)self.zoomLevel=0;
                    if(self.zoomLevel>3)self.zoomLevel=3;
                    var t = new TWEEN.Tween(self);
                    t.to({distance:self.zoomValues[parseInt(self.zoomLevel)]},160).onUpdate(function(c,v){
                        self._dirty=true;
                        //this.update();
                    }).start();
                }
            });

            function angleClamp(val){
                while (val < 0) {
                    val += Math.PI * 2;
                }
                while (val >= Math.PI * 2) {
                    val -= Math.PI * 2;
                }
                return val;
            }
            canvas.addEventListener('mousemove', function (event) {
                if (moving) {
                    var xDelta = event.pageX  - self.lastX,
                        yDelta = event.pageY  - self.lastY;

                    self.lastX = event.pageX;
                    self.lastY = event.pageY;

                    var nx=self.orbitX;
                    var ny=self.orbitY;
                    ny += xDelta * 0.025;
                    nx += yDelta * 0.025;


                    nx=angleClamp(nx);
                    ny=angleClamp(ny);
                    if(nx<3.3)nx=3.3;
                    if(nx>4.6)nx=4.6;
                    self.orbitX=nx;
                    self.orbitY=ny;
                    self._dirty = true;
                }
                self.mouseX=event.pageX;
                self.mouseY=event.pageY;

            }, false);

            canvas.addEventListener('mouseup', function (event) {
                moving = false;
                self.mouseButtonsDown&=~(1<<event.which);
            }, false);
        }
        return this;
    };

    ModelCamera.prototype.getCenter = function () {
        return this._center;
    };

    ModelCamera.prototype.setCenter = function (value) {
        this._center = value;
        this._dirty = true;
    };

    ModelCamera.prototype.getDistance = function () {
        return this._distance;
    };

    ModelCamera.prototype.setDistance = function (value) {
        this._distance = value;
        this._dirty = true;
    };

    ModelCamera.prototype.getViewMat = function () {
        if (this._dirty) {
            var mv = this._viewMat;
            mat4.identity(mv);
            mat4.translate(mv, [0, 0, -this.distance]);
            mat4.rotateX(mv, this.orbitX + (Math.PI / 2));
            mat4.rotateZ(mv, -this.orbitY);
            mat4.translate(mv, this._center);
            this._dirty = false;
        }

        return this._viewMat;
    };
    
    ModelCamera.prototype.zoomToRandomAngle = function () {
        this.cameraInTransition=true;

        this.saveDistance=this.distance;
        this.saveOrbitX=this.orbitX;
        this.saveOrbitY=this.orbitY;
        this.zoomTween.to({distance:(Math.random()*this.zoomValues[3]*2)+this.zoomValues[0],orbitY:Math.random()*Math.PI*2.0},//,orbitX:Math.random()*Math.PI*1.5},
            this.zoomTime*3.0).onUpdate(function(c,v){
            this._dirty=true;
            //this.update();
        }).easing(TWEEN.Easing.Quadratic.InOut).start();        
    }
    ModelCamera.prototype.zoomToPause = function () {
        
        this.cameraInTransition=true;

        this.saveDistance=this.distance;
        this.saveOrbitX=this.orbitX;
        this.saveOrbitY=this.orbitY;
        
        this.zoomTween.to({distance:this.zoomValues[3]*1.1,orbitY:Math.PI*2.0,orbitX:Math.PI*1.25},this.zoomTime).onUpdate(function(c,v){
            this._dirty=true;
            //this.update();
        }).start();
    };
    
    ModelCamera.prototype.zoomToGame = function () {
        this.distance=this.zoomValues[3];
        
        if(!this.saveDistance){
            this.saveDistance=this.zoomValues[this.zoomLevel];
            this.saveOrbitX=Math.PI;
            this.saveOrbitY=0.0;
        }
        this.zoomTween.to({distance:this.saveDistance,orbitY:this.saveOrbitY,orbitX:this.saveOrbitX},this.zoomTime).onUpdate(function(c,v){
            this._dirty=true;
            //this.update();
        }).onComplete(function(c,v){
            this.cameraInTransition=false;
        }).start();
    };
    
    ModelCamera.prototype.update = function () {
        // Not actually needed here. Just makes switching between camera types easier
        TWEEN.update();
    };

    /**
     * A FlyingDemoCamera allows free motion around the scene using FPS style controls (WASD + mouselook)
     * This type of camera is good for displaying large scenes
     */
    var cursorPos=[0,0];
     function camMouseMove(event) {
        if (moving) {
            var xDelta = event.pageX  - self.lastX,
                yDelta = event.pageY  - self.lastY;

            self.lastX = event.pageX;
            self.lastY = event.pageY;

            var sensitivity=0.005;

            var nx=self._angles[0];
            var ny=self._angles[1];
            ny += xDelta * -sensitivity;
            while (ny < 0) {
                ny += Math.PI * 2.0;
            }
            while (ny >= Math.PI * 2.0) {
                ny -= Math.PI * 2.0;
            }


            nx += yDelta * sensitivity;
            if (nx < -Math.PI * 0.45) {
                nx = -Math.PI * 0.45;
            }
            if (nx > Math.PI * 0.45) {
                nx = Math.PI * 0.45;
            }

            self._angles[0]=nx;
            self._angles[1]=ny;

            self._dirty = true;
        }
        self.mouseX=event.pageX;
        self.mouseY=event.pageY;
    }

    function camMouseDown (event) {
        if (event.which === 1) {
            moving = true;
        }
        self.lastX = event.pageX;
        self.lastY = event.pageY;
        self.mouseX=event.pageX;
        self.mouseY=event.pageY;
    }


    function camMouseUp() {
        moving = false;
    }

    FlyingCamera = function (canvas) {
        var self = this, moving = false;
        this.lastX=0;
        this.lastY=0;
        this.mouseX=0;
        this.mouseY=0;

        this._angles = vec3.create();
        this._position = vec3.create();
        this.speed = 700;
        this._viewMat = mat4.create();
        this._cameraMat = mat4.create();
        this._dirty = true;
        
        this.zoomTime=2000;
        this.zoomTween=new TWEEN.Tween(this);
        this.spinTween=new TWEEN.Tween(this);
        addKeyEventHooks();
        this.attachMouseControls=function(canvas){
            canvas.addEventListener('mousedown',  camMouseDown, false);
            canvas.addEventListener('mousemove',  camMouseMove, false);
            canvas.addEventListener('mouseup',  camMouseUp, false);
        };

        return this;
    };

    FlyingCamera.prototype.getAngles = function () {
        return this._angles;
    };

    FlyingCamera.prototype.setAngles = function (value) {
        this._angles = value;
        this._dirty = true;
    };

    FlyingCamera.prototype.getPosition = function () {
        return this._position;
    };

    FlyingCamera.prototype.setPosition = function (value) {
        this._position = value;
        this._dirty = true;
    };

    FlyingCamera.prototype.getViewMat = function () {
        if (this._dirty) {
            var mv = this._viewMat;
            mat4.identity(mv);
            mat4.rotateX(mv, this._angles[0] - Math.PI / 2.0);
            mat4.rotateZ(mv, this._angles[1] * -1.0);
            mat4.rotateY(mv, this._angles[2]);
            mat4.translate(mv, [-this._position[0], -this._position[1], -this._position[2]]);
            this._dirty = false;
        }

        return this._viewMat;
    };

    FlyingCamera.prototype.update  = function (frameTime) {
        var dir = vec3.create(),
            speed = (this.speed / 1000) * frameTime,
            cam;

        // This is our first person movement code. It's not really pretty, but it works
        if (KeyboardState._pressedKeys['W'.charCodeAt(0)]) {
            dir[1] += speed;
        }
        if (KeyboardState._pressedKeys['S'.charCodeAt(0)]) {
            dir[1] -= speed;
        }
        if (KeyboardState._pressedKeys['A'.charCodeAt(0)]) {
            dir[0] -= speed;
        }
        if (KeyboardState._pressedKeys['D'.charCodeAt(0)]) {
            dir[0] += speed;
        }
        if (KeyboardState._pressedKeys['R'.charCodeAt(0)]) { // 32 Space, moves up
            dir[2] += speed;
        }
        if (KeyboardState._pressedKeys['F'.charCodeAt(0)]) { // 17 Ctrl, moves down
            dir[2] -= speed;
        }

        if (dir[0] !== 0 || dir[1] !== 0 || dir[2] !== 0) {
            cam = this._cameraMat;
            mat4.identity(cam);
            mat4.rotateX(cam, this._angles[0]);
            mat4.rotateZ(cam, this._angles[1]*-1.0);
            mat4.inverse(cam);

            mat4.multiplyVec3(cam, dir);

            // Move the camera in the direction we are facing
            vec3.add(this._position, dir);
            //Clamp to area above ground..
            var groundHeight=62.33;
            if(this._position[2]<groundHeight)this._position[2]=groundHeight;
            this._dirty = true;
        }
    };

    return {
        ModelCamera: ModelCamera,
        FlyingCamera: FlyingCamera,
        KeyboardState: KeyboardState
    };
});