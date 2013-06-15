if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define([
    "./util/messaging.js",
    "./util/astar.js",
    "./util/priorityQueue.js"
], function (messaging) {
    var v3t0=[0,0,0];
    var v3t1=[0,0,0];
    var v3t2=[0,0,0];
    var world;
    var sim;
    var playerControls;
    var terrainWeights={
        "Building":10.8,
        "ShotBuilding":9.8,
        "Ocean":3.9,
        "River":2.8,
        "Rubble":1.5,
        "Forest":0.1,
        "Grass":0.11,
        "Road":0.01
    };
//        sim.invokeGod("repath")i
    var brainsById={};
    messaging.listen("networkConnectedToServer",function(){

        console.log("AI installing network listeners..");
        network.on("ai",function(cmd){

            if(!network.g_isHost){
                var brain=brainsById[cmd[0]];
                if(brain)
                    brain.pathFind(cmd[1],cmd[2],cmd[3],cmd[4]);
            }
        });
    });


    function Brain(bsim,player,module){
        sim=bsim;
        world=bsim.nodeImpassible;
        playerControls=sim.playerControls;
        
        this.pathFinder=new PathFinder(function worldAdaptor(tx,ty){
            var cell=world.getCell(tx,ty);
//            if(cell[0].name=="Building"||cell[0].name=="ShotBuilding")
//                return 1;
            return 0;
        },256,256,1.0);
        
        this.pathFinder.gCost=function(sx,sy,ex,ey){
            var dc;
            if (sx === ex || sy === ey) {
                dc=this.CARDINAL_COST;
            } else {
                dc=this.DIAGNOL_COST;
            }
            //return dc;
            var cell=world.getCell(ex,ey);
            var weight=terrainWeights[cell[0].name];
            if(weight)return dc*weight;
            return dc;
        };
        this.brainId=player.aiIndex;
        brainsById[this.brainId]=this;
        this.path=[];
        this.pathRetryCountdown=1+parseInt(Math.random()*200);
        this.pathIndex=0;
        this.pathPoint=[0,0,0];
        this.cursorPathIndex=0;
        this.cursorPathPoint=[0,0,0];
        this.player=player;
        this.progress=1.0;
        this.lastDist2=0.0;
        
        this.cursorSprite=world.addObject("cursor",v3t0);
        player.avatar.cursorSprite=this.cursorSprite;
        player.avatar.destroy=function(){
            this.cursorSprite.active=false;
            delete this.cursorSprite;
        };
        
       
        this.pathPtCtr=0;
        this.getPathPoint=function(idx,outPt){
            var ppt=this.path[idx];
            v3t0[0]=ppt.x;
            v3t0[1]=ppt.y;
            world.cellCoordToWorld(v3t0,outPt);
        };
        
        this.rotateToward=function(obj,targetPt){
            mat4.getRowV3(obj.matrix, 3, v3t0);
            var targAng=sim.angleBetweenPoints(targetPt,v3t0)+Math.PI;
            var dang=obj.angle-targAng;
            obj.controls=0;
   //         if(dang<-1.5)obj.controls|=playerControls.left;
   //         else if(dang>1.5)obj.controls|=playerControls.right;
            obj.angle=targAng;                
         //   if(this.pathRetryCountdown--<0){
         //       this.pathRetryCountdown=50;
         //       obj.matrix[12]=this.pathPoint[0];
         //       obj.matrix[13]=this.pathPoint[1];
         //       world.moveTileObject(obj,obj.matrix[12],obj.matrix[13],0.0);
         //       mat4.getRowV3(obj.matrix, 3, v3t0);
         //       obj.controls|=playerControls.up;
         //   }
            return dang;
        };
        
        this.followPath=function(obj){
            var dang = this.rotateToward(obj,this.pathPoint);

            if(obj.hp<100)
                obj.controls|=playerControls.fire;
            if(Math.abs(dang)<1.0)
                obj.controls|=playerControls.up;
            else
                obj.controls|=playerControls.down;
            
            vec3.subtract(v3t0,this.pathPoint);
            var targDist2=vec3.dot(v3t0,v3t0);
            if(targDist2<(world.tileDim2*0.3)){
                this.pathIndex++;
                this.progress=1.0;
                if(this.pathIndex>=this.path.length){
                    //Target aquired.
                    this.path.length=0;
                }else{
                    this.getPathPoint(this.pathIndex,this.pathPoint);
                }
                if(this.cursorSprite){
                    this.cursorPathIndex=this.pathIndex;
                    mat4.setRowV3(this.cursorSprite.matrix,3,this.pathPoint);
                }
            }else{

                if(this.cursorSprite){

                    this.cursorPathIndex++;
                    if(this.cursorPathIndex>=this.path.length)this.cursorPathIndex=this.pathIndex;
                    this.getPathPoint(this.cursorPathIndex,this.cursorPathPoint);
                    mat4.setRowV3(this.cursorSprite.matrix,3,this.cursorPathPoint);
                }



                if(targDist2>=(this.lastDist2*0.95)){  //Check for making progress
                    this.progress*=0.97;//Not making progress..
                    this.controls=playerControls.down;
                }else{
                    this.progress+=0.02;//Making progress..
                    if(this.progress>1.0)
                        this.progress=1.0;
                }
                this.lastDist2=targDist2;
            }
            if(this.progress<0.001){
                //Not making progress on path...
                this.path.length=0;
                this.pathRetryCountdown=180;
                console.log("blocked.. repathing.");
            }
            if(this.path.length==0){
                obj.controls=playerControls.down;
            }
        }
        
        this.update=function(obj){
            if(this.path.length){
                this.followPath(obj);
            }else{
                //obj.controls|=playerControls.down;
                //sif((this.path==null||this.path.length==0)&&
                if(this.pathRetryCountdown--<0){   //Find path
                    this.pathRetryCountdown=200;    //ATtempt a new path every 200 frames...

                    if(network.g_isHost){
                        this.determineTarget(obj);
                        if(this.path.length>1){
                            if(network.connected()){
                                var pl=this.path.length-1;
                                network.emit("ai",[this.brainId,this.path[0].x,this.path[0].y,this.path[pl].x,this.path[pl].y]);
                            }
                        }else{
                            //No good path...
                            this.pathRetryCountdown=(60*5)+(Math.random()*(60*5));
                            this.noGoodPath=true;
                        }
                    }
                }
            }
        }
        
        this.pathFind = function(fx,fy,tx,ty){
            this.path=this.pathFinder.getPath(fx,fy,tx,ty);
            if(!this.path)this.path=[];
            this.pathIndex=0;
            if(this.path.length){
                this.getPathPoint(0,this.pathPoint);
                if(this.cursorSprite)mat4.setRowV3(this.cursorSprite.matrix,3,this.pathPoint);
                if(this.player.avatar!=null)
                    mat4.setRowV3(this.player.avatar.matrix,3,this.pathPoint);
            }
        };

        this.determineRandomTarget=function(obj){
            if(!this.pathFind(obj.cellCoord[0],
                obj.cellCoord[1],
                obj.cellCoord[0]+parseInt(Math.random()*16)-8,
                obj.cellCoord[1]+parseInt(Math.random()*16)-8)){
            }
            this.determineTarget = this.determineRandomBaseTarget;
        };
        this.determineBestTarget=function(obj){
            var queue=new PriorityQueue();
            var map=world.getMap();
            var mo=world.mapOrigin;
            var base;//sim.randElem(map.bases);    //Pick a random base to go to...
            
            
            for(var b = 0,bl=map.bases.length;b<bl;b++){
                var base=map.bases[b];
                var prior=0.0;
                if(base.body.team!=obj.team){
                    if(obj.hp>127)
                        prior=100.0;
                    else
                        prior=0.0;
                }else{
                    if(obj.hp<127)
                        prior=100.0;
                }
                if(base.body.team==sim.NEUTRAL_TEAM_ID)
                   base.body.team=1000.0;
               
                var bx=(base.x-mo[0])-obj.cellCoord[0];
                var by=(base.y-mo[1])-obj.cellCoord[1];
                var bdist2=(bx*bx)+(by*by);
                if(bdist2<1.0)prior=0;
                else prior /= bdist2;
                queue.push(base,prior);
            }
            base=queue.top();
            if(this.currentTarget){
                if(this.currentTarget==base){
                    if(queue.length>1){base = queue[(gueue.length-1)-parseInt(Math.random()*(queue.length/3))];}
                }
            }
            this.currentTarget=base;
            if(this.currentTarget){
                if(!this.pathFind(obj.cellCoord[0],obj.cellCoord[1],base.x-mo[0],base.y-mo[1])){
                    //this.currentTarget=null;
                    this.determineTarget = this.determineRandomTarget;
                }
            }else{
                console.log("No valid target bases found.");
            }
        };
        
        this.determineRandomBaseTarget=function(obj){
            var map=world.getMap();
            var mo=world.mapOrigin;
            var base=sim.randElem(map.bases);    //Pick a random base to go to...
            this.path=this.pathFinder.getPath(obj.cellCoord[0],obj.cellCoord[1],base.x-mo[0],base.y-mo[1]);
            if(!this.path)this.path=[];                    
            this.pathIndex=0;
            this.cursorPathIndex=0;
            if(this.path.length){
                this.getPathPoint(0,this.pathPoint);
                if(this.cursorSprite)mat4.setRowV3(this.cursorSprite.matrix,3,this.pathPoint);
            }
            this.determineTarget=this.determineBestTarget;
        };
        this.determineTarget=this.determineBestTarget;
    }
    
    
    return{
        Brain:Brain
    }
});
