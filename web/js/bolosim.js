define([
    "display",
    "js/util/messaging.js",
    "js/bolomap.js",
    "js/boloworld.js",
    "js/meshes/testmesh.js",
    "js/util/audio.js",
    "js/network.js",
    "js/brain.js",
    "js/util/gl-matrix.js"
],

    function (displayModule, messaging, bolomap, boloworld, meshes, audio, network, brain) {

        function nv3() {return [0, 0, 0];}

        var v3t0 = nv3();
        var v3t1 = nv3();
        var v3t2 = nv3();
        var v3t3 = nv3();
        var v3t4 = nv3();
        var v3t5 = nv3();
        var v3t6 = nv3();
        var v3t7 = nv3();
        var v3t8 = nv3();
        var v3t9 = nv3();
        var explosionMesh;
        var explosionRenderer;
        var crosshairSprite;
        var cursorSprite;
        var display;
        var gl;
        var currentMap = null;
        var playerList = [];
        var aiList = [];
        var playersByObjectId = {};
        var playersByNetworkId = {};
        var localPlayer = null;
        var NEUTRAL_TEAM_ID = 8;

        var ticketBleed = 0.1;
        var teamTickets = {0: 50, 1: 50};

        var tileData = {
            "Building": {mesh: meshes.building, speed: 0.0},
            "River": {mesh: meshes.river, speed: 0.3},
            "Swamp": {mesh: meshes.swamp, speed: 0.5},
            "Crater": {mesh: meshes.grass, speed: 0.8},
            "Road": {mesh: meshes.road, speed: 1.0},
            "Forest": {mesh: meshes.forest, speed: 0.8},
            "Rubble": {mesh: meshes.crater, speed: 0.4},
            "Grass": {mesh: meshes.grass, speed: 0.8},
            "ShotBuilding": {mesh: meshes.buildingd2, speed: 0.0},
            "RiverWithBoat": {mesh: meshes.river, speed: 1.0},
            "Ocean": {mesh: meshes.ocean, speed: 0.25},
        }

        for (var v in meshes) {
            meshes[v].name = v;
        }
        var dirLUT = {
            0: ["", 0],
            1: ["0", 2],
            2: ["0", 3],
            4: ["0", 0],
            8: ["0", 1],

            3: ["01", 3],
            6: ["01", 0],
            12: ["01", 1],
            9: ["01", 2],

            5: ["02", 0],
            10: ["02", 1],

            7: ["012", 0],
            14: ["012", 1],
            13: ["012", 2],
            11: ["012", 3],

            15: ["0123", 0],
        }

        var pilotRad = boloworld.worldMeter * 2;
        var pilotSpeed = 0.21;

        var toolReqs = {
            harvest: ["Forest"],
            road: ["Grass", "Swamp", "River", "Rubble"],
            building: ["Grass", "Swamp", "River", "Road"],
            pillbox: ["Grass", "Swamp"],
            mine: ["Grass", "Swamp", "Rubble", "Road"]
        }
        var roadWoodCost = 2;
        var buildingWoodCost = 2;
        var currentTool = "harvest";


        var groundPlane = {o: [0, 0, 0], d: [0, 0, 1]};

        var accel = 0.1;
        var rspeed = 0.03;

        var tankRad = 4.0 * boloworld.worldMeter;

        var barShells = document.getElementById("statColor_shells");
        var barMines = document.getElementById("statColor_mines");
        var barArmor = document.getElementById("statColor_armor");
        var barWood = document.getElementById("statColor_wood");
        var ticketsDisplay = document.getElementById("ticketDisplay");

        var healCounter = 0.0;
        var healRate = 10.0;
        var damageCounter = 0.0;
        var damageRate = 3.0;
        var hudUpdateCounter = 0;
        var syncCountdown = 0;
        var mouseWasDown = false;

        network.on("god", godCommand);

        var playerControls = {
            up: 1,
            down: 2,
            left: 4,
            right: 8,
            fire: 16,
            hack: 32,
            harvest: 64,
            road: 128,
            building: 256,
            pillbox: 512,
            mine: 1024
        };

        function generateTileMesh(mat, mx, my, rand) {
            var cell = boloworld.getCell(mx, my);
            var tid = cell[0].name;
            var mesh = tileData[tid].mesh;
            var directional = false;
            var meshBase = "";
            if (tid == "Road") {
                // instanceMesh(meshes.crater,mat,batch);
                directional = true;
                meshBase = "road";
            } else if (tid == "River") {
                directional = true;
                meshBase = "river";
            } else if (tid == "Building") {
                directional = true;
                meshBase = "building";
            }
            if (directional) {
                var dbits = boloworld.getNeighborsOfName(mx, my, tid);
                if (tid == "River") {
                    dbits |= boloworld.getNeighborsOfName(mx, my, "Ocean");
                }
                var tdata = dirLUT[dbits];
                var meshName = meshBase + tdata[0];
                if (tid == "Building") {
                    if (tdata[0] != "02")meshName = "building";
                    if (cell[0].hp < 255) {
                        meshName = "buildingd" + parseInt((3 - (cell[0].hp * 2 / 255)));
                    }
                }
                else if (tid == "River" && tdata[0] == "0123")meshName = "river";
                else if (tid == "Road" && tdata[0] == "0123")meshName = "road";
                mesh = meshes[meshName];
                mat4.rotateZ(mat, tdata[1] * Math.PI * 0.5);
            } else {
                mat4.rotateZ(mat, parseInt(rand * 3.99) * Math.PI * 0.5);
            }
            if (!mesh) {
                console.log("Mesh:" + meshName + " not found.");
                debugger;
            }
            return mesh;
        }

        function v3set(v, vx, vy, vz) {
            v[0] = vx;
            v[1] = vy;
            v[2] = vz;
        }

        function moveObject(obj, dx, dy, dz, rad, passableFunc, collisionFunc) {
            var pmat = obj.matrix;
            var newX = pmat[12] + dx;
            var newY = pmat[13] + dy;
            var collisions;

            if (rad) {
                var colCount;
                if ((colCount = boloworld.radiusPassable(obj, newX, newY, rad, passableFunc)) != 0) {  //Can't move both xy'
                    if ((colCount = boloworld.radiusPassable(obj, newX, pmat[13], rad, passableFunc)) == 0) {//Can move x
                        newY = pmat[13];
                    } else if ((colCount = boloworld.radiusPassable(obj, pmat[12], newY, rad, passableFunc)) == 0) {//Can move y
                        newX = pmat[12];
                    } else {              //Can't move
                        newX = pmat[12];
                        newY = pmat[13];
                    }
                    if (collisionFunc) {
                        var collisions = boloworld.getCollisionResult();
                        for (var t = 0; t < colCount; t++) {
                            collisionFunc(obj, collisions[t]);
                        }
                    }
                }
            } else {
                var colCell;
                if (passableFunc(obj, colCell = boloworld.getCellAtWorld(newX, newY)) == false) {
                    var badCell = colCell;
                    var badX = newX;
                    var badY = newY;

                    if (collisionFunc) {
                        var collisions = boloworld.getCollisionResult();
                        var c = collisions[0];
                        v3set(v3t0, badX, badY, 0);
                        boloworld.worldToCellCoord(v3t0, c[0]);
                        c[1][0] = badX;
                        c[1][1] = badY;
                        c[2] = badCell;
                        collisionFunc(obj, c);
                    }

                    if (passableFunc(obj, colCell = boloworld.getCellAtWorld(newX, pmat[13]))) {//Can move x
                        newY = pmat[13];
                    } else if (passableFunc(obj, colCell = boloworld.getCellAtWorld(pmat[12], newY))) {//Can move y
                        newX = pmat[12];
                    } else {              //Can't move
                        newX = pmat[12];
                        newY = pmat[13];
                    }
                }
            }
            pmat[12] = newX;
            pmat[13] = newY;

            if (obj.cell)
                boloworld.moveTileObject(obj, obj.matrix[12], obj.matrix[13], 0.0);

        }

        function playSound(obj, name, volume) {
            mat4.getRowV3(obj.matrix, 3, v3t0);
            audio.playPositional2d(name, v3t0, volume);
        }

        function dealDamageToMap(proj, collision) {
            var c = collision[0];
            var cell = collision[2];
            var c0 = cell[0];
            var cellDirty = false;
            var shellExploded = false;
            if ((c0.name == "Building" || c0.name == "ShotBuilding") && c0.hp > 0) { //Damage buildigns..
                if (c0.hp == 255) {
                    //First modification, so make a copy..
                    c0 = cell[0] = {
                        name: "Building",
                        c: ":",
                        hp: 255 - parseInt(255 / 6)
                    }
                } else {
                    c0.hp -= parseInt(255 / 6);
                }
                playSound(proj, "shot_building_far");
                cellDirty = true;
                shellExploded = true;
            } else {
                for (var t = 1; t < cell.length; t++) {
                    var obj = cell[t];
                    if (obj == proj.shooter)//Dont allow bullets to hit thier shooter
                    {
                        t++;
                        continue;
                    }


                    if (!obj.hp)obj.hp = 255;
                    obj.hp -= 25;

                    if (obj.name == "tank") {//Hit enemy tank
                        playSound(proj, "hit_tank_self");
                        obj.recoil = [proj.velocity[0], proj.velocity[1], proj.velocity[2]];
                        if (cell[0].name == "Ocean") {
                            obj.hp = 0;   //Die when shot on ocean
                        }
                    }
                    if (obj.hp <= 0) {
                        obj.hp = 0;
                        obj.active = false; //Destroy objects on the tile..
                        boloworld.removeTileObject(obj);

                        if (obj.boat) {
                            boloworld.removeTileObject(obj.boat);
                            delete obj.boat;
                        }
                        if (cell[0].name != "River" && cell[0].name != "Ocean") {
                            cell[0] = {name: "Rubble", hp: 255};
                            cellDirty = true;
                        } else {

                            playSound(obj, "bubbles");
                        }

                        if (obj.name == "tank") {    //Tank destroyed...
                            playSound(obj, "big_explosion_near");
                        } else if (obj.name == "turret") {//Turret destroyed...
                            var deadTurret = boloworld.addObject("turretd2", [obj.matrix[12], obj.matrix[13], obj.matrix[14]]);
                            deadTurret.name = "deadTurret";
                            deadTurret.hp = 255;
                            boloworld.addObjectToGrid(deadTurret);
                            deadTurret.pillboxNumber = obj.pillboxNumber;
                            var cb = document.getElementById("cbox_" + deadTurret.pillboxNumber);
                            cb.style["background-color"] = "gray";
                            cb.style["background-color"] = (this.team == 0) ? "red" : "blue";

                            playSound(obj, "big_explosion_far");
                        }
                        //console.log(obj.name+" destroyed.");
                        //cell.length=1;

                    } else
                        t++;
                    shellExploded = true;
                }

                if (cell.length == 1 && c0.name != "River" && c0.name != "Ocean") {
                    cell[0] = {name: (c0.name == "Forest") ? "Grass" : "Rubble", hp: 255}
                    playSound(proj, "shot_tree_far");
                    cellDirty = true;
                    shellExploded = true;
                }
            }
            if (cellDirty == true)
                boloworld.rebuildRegionAtTile(c[0], c[1]);
            return shellExploded;
        }

        function projectileCollision(proj, collision) {
            //Shell already exploding so bail

            if (dealDamageToMap(proj, collision) == true) {
                proj.life = 0;
                proj.velocity[0] = proj.velocity[1] = 0.0;
            }
        }

        function projectilePassable(obj, tile) {
            //if(tile.length>1)return false;
            if (tile[0].name == "Building")return false;
            if (tile[0].name == "ShotBuilding")return false;
            if (tile[0].name == "Forest")return false;
            if (tile.length > 1 && (tile[1].name == "turret" || tile[1].name == "tank")) {
                if (tile.length == 2 && obj.shooter == tile[1])
                    return true;
//            if(tile[1].team==obj.shooter.team)        //TEam damage
//                return true;
                return false;
            }
            return true;
        }

        function projectileUpdate() {

            moveObject(this, this.velocity[0], this.velocity[1], this.velocity[2], undefined, projectilePassable, projectileCollision);
            //this.matrix[12]+=this.velocity[0];
            //this.matrix[13]+=this.velocity[1];
            this.life--;
            if (this.life <= 0) {
                this.active = false; //Die.
                addExplosionNearObject(this);
                playSound(this, "shooting_near");
            }
//        else{
            //  if(this.life==45){
            //      this.removeComponent(this.meshRenderer);
            //      this.addComponent('meshRenderer',explosionRenderer);
            //  }
//        }
//            this.velocity[0]*=0.95;
//            this.velocity[1]*=0.95;
//        }
        }

        function fireProjectile(shooter) {
            var bullet = boloworld.addObject("bullet", [shooter.matrix[12], shooter.matrix[13], 0.0]);
            bullet.shooter = shooter;
            bullet.update = projectileUpdate;
            bullet.life = 55;
            mat4.getRowV3(shooter.matrix, 1, v3t0);

            bullet.velocity = vec3.scale(v3t0, 0.75 * boloworld.worldMeter, [0, 0, 0]);
            mat4.set(shooter.matrix, bullet.matrix);

            vec3.scale(v3t0, boloworld.worldMeter * 3.0, v3t0);
            bullet.matrix[12] += v3t0[0];
            bullet.matrix[13] += v3t0[1];
            playSound(shooter, "shooting_self");
        }


        function alphaKeyPressed(ak) {return display.alphaKeyPressed(ak);}

        function alphaKeyDown(ak) {return display.alphaKeyDown(ak);}

        function keyCodeDown(kk) {return display.keyCodeDown(kk);}


        function playerTilePassable(obj, tile) {
            if (tile[0].name == "Building" || tile[0].name == "ShotBuilding")
                return false;
            return true;
        }

        function rayPlaneIntersect(ro, rd, po, pd, out) {
            var vdd = vec3.dot(rd, pd);
            if (vd > 0.0)return false;
            vec3.subtract(po, ro, v3t0);
            var vd = vec3.dot(v3t0, pd);
            vec3.scale(rd, vd / vdd, v3t0);
            vec3.add(v3t0, ro, out);
            return true;
        }


        function pilotTilePassable(obj, tile) {
            //if(tile.length>1)return false;
            if (tile[0].name == "Building" ||
                tile[0].name == "ShotBuilding" ||
                tile[0].name == "River" ||
                tile[0].name == "Ocean") {
                if (tile == obj.targetCell)
                    return true;
                return false;
            }

            return true;
        }

        function doPilotAction() {

        }

        function validPilotTarget(tank, currentTool, cell) {
            var validTarget = false;
            var reqs = toolReqs[currentTool];
            if (!reqs)return false;
            var valid = false;
            for (var i = 0; i < reqs.length; i++)if (cell[0].name == reqs[i])valid = true;
            if (currentTool == "road" && tank.invWood < roadWoodCost)return false;
            if (currentTool == "building" && tank.invWood < buildingWoodCost)return false;
            if (currentTool == "pillbox" && tank.invTurrets.length == 0)return false;
            return valid;
        }


        function updatePilot() {
            if (!this.velocity)
                this.velocity = [0, 0, 0];
            this.velocity[0] = this.matrix[12];
            this.velocity[1] = this.matrix[13];
            if (this.returning) {
                mat4.getRowV3(this.tank.matrix, 3, v3t0);
                vec3.subtract(this.velocity, v3t0);
            } else
                vec3.subtract(this.velocity, this.target);
            var dist = vec3.length(this.velocity);

            if (dist < pilotSpeed) {
                if (!this.returning) {
                    //Made it to target...
                    var tileDirty = false;
                    if (validPilotTarget(this.tank, currentTool, this.cell)) {
                        if (currentTool == "harvest") {
                            this.cell[0] = {name: "Grass", hp: 255};
                            this.wood = 16;   //Harvest tree.. turn it to grass...
                            tileDirty = true;
                            playSound(this, "farming_tree_near");
                        } else if (currentTool == "road") {
                            if (this.tank.invWood > roadWoodCost) {
                                this.cell[0] = {name: "Road", hp: 255};
                                tileDirty = true;
                                this.tank.invWood -= roadWoodCost;
                                playSound(this, "man_building_near");
                            }
                        } else if (currentTool == "building") {
                            if (this.tank.invWood > buildingWoodCost) {
                                this.cell[0] = {name: "Building", hp: 255};
                                tileDirty = true;
                                this.tank.invWood -= buildingWoodCost;
                                playSound(this, "man_building_near");
                            }
                        } else if (currentTool == "pillbox") {
                            if (this.tank.invTurrets.length > 0) {
                                var turret = boloworld.addObject("turret", [this.matrix[12], this.matrix[13], this.matrix[14]]);
                                turret.name = "turret";
                                turret.hp = 255;
                                turret.update = updatePillbox;
                                turret.team = this.team;
                                boloworld.addObjectToGrid(turret);
                                turret.pillboxNumber = this.tank.invTurrets.pop();
                                playSound(this, "man_building_near");

                                var cb = document.getElementById("cbox_" + turret.pillboxNumber);
                                cb.style["background-color"] = (this.team == 0) ? "red" : "blue";

                            }
                        } else if (currentTool == "mine") {
                            if (this.tank.invMines > 0 && (this.cell.length == 2)) {
                                mat4.getRowV3(this.matrix, 3, v3t0);
                                var mine = boloworld.addObject("mine", v3t0);
                                mine.name = "mine";
                                mine.hp = 255;
                                //mine.update=updatePillbox;
                                boloworld.addObjectToGrid(mine);
                                playSound(this, "man_lay_mine_near");
                                this.tank.invMines--;
                            }
                        }
                    } else {
                        //invalid target..
                        audio.play("bubbles");
                    }
                    if (tileDirty) {
                        var cc = boloworld.worldToCellCoord(this.target);
                        for (var tx = cc[0] - 1; tx < cc[0] + 1; tx++)
                            for (var ty = cc[1] - 1; ty < cc[1] + 1; ty++)
                                boloworld.rebuildRegionAtTile(tx, ty); //Rebuild the world region containing the tile
                    }
                    this.returning = true;
                } else {
                    //Made it back...
                    if (this.wood) {
                        this.tank.invWood += this.wood;  //Give wood to the tank...
                        if (this.tank.invWood > 255)
                            this.tank.invWood = 255;
                    }
                    this.tank.pilot = null;
                    this.tank.pilotIndicator.active = false;
                    this.tank.pilotIndicator = null;
                    this.active = false;
                    boloworld.removeTileObject(this);

                }
            }
            else {
                vec3.scale(this.velocity, pilotSpeed / -dist);
                mat4.getRowV3(this.matrix, 3, v3t0);
                moveObject(this, this.velocity[0], this.velocity[1], 0.0, pilotRad, pilotTilePassable);
                mat4.getRowV3(this.matrix, 3, v3t1);
                vec3.subtract(v3t0, v3t1);
                if (vec3.dot(v3t0, v3t0) < (0.01 * 0.01)) {
                    //Pilot is BLOCKED.
                    if (!this.returning)
                        this.returning = true;
                    else {
                        //Blocked from returning...
                    }
                }
            }
        }

        var explosionShader;
        function getExplosionShader(){
            if (!explosionShader)
                explosionShader = boloworld.getShader("explosion");
            return explosionShader;
        }


        function updateExplosion() {
            if (this.countdown-- < 0)
                this.active = false;
            this.scale *= 1.25;
            this.alpha += 0.01;
        }


        function addExplosionNearObject(obj) {
            var bpos = mat4.getRowV3(obj.matrix, 3, v3t7);
            var exp = boloworld.addObject("explosion", v3t7, getExplosionShader());
            exp.update = updateExplosion;
            exp.countdown = 20;
            exp.scale = 0.01;
            exp.alpha = 0;
        }


        function triggerAdjacentMines(mine, collision) {
            var cell = collision[2];
            if (cell.length > 1 && cell[1].name == "mine" && (cell[1].fuse == undefined)) {
                cell[1].fuse = 15;
                cell[1].update = updateMine;
                dealDamageToMap(mine, collision);
            }
        }

        function iterateNeighbors(obj, radius, fn) {
            var nmct = boloworld.getCellsInRadius(obj, obj.matrix[12], obj.matrix[13], radius);
            var collisions = boloworld.getCollisionResult();
            for (var cr = 0; cr < nmct; cr++) {
                fn(this, collisions[cr]);
            }
        }

        function updateMine() {
            if (this.fuse-- < 0) {
                this.active = false;
                this.cell[0] = {name: "Rubble", hp: 255};
                boloworld.removeTileObject(this);
                playSound(this, "big_explosion_far");
                mat4.getRowV3(this.matrix, 3, v3t0);
                var cc = boloworld.worldToCellCoord(v3t0);
                boloworld.rebuildRegionAtTile(cc[0], cc[1]);
                addExplosionNearObject(this);
                iterateNeighbors(this, boloworld.tileDim * 1.5, triggerAdjacentMines);
            }
        }

        function updatePlayerHUD(p) {
            barShells.style.width = "" + parseInt(p.invShells * 100.0 / 40.0) + "px";
            barMines.style.width = "" + parseInt(p.invMines * 100.0 / 40.0) + "px";
            barArmor.style.width = "" + parseInt(p.hp * 100.0 / 255.0) + "px";
            barWood.style.width = "" + parseInt(p.invWood * 100.0 / 255.0) + "px";

            var str = "TICKETS:";

            var liveTeams=0;
            for (var i in teamTickets) {
                if(teamTickets[i]>0)liveTeams++;
            }
            var nlive=0;
            var livep=0;
            if(liveTeams>1){
                for (i in teamTickets) {
                    for (var b =0;b<currentMap.bases.length;b++) {
                        var base = currentMap.bases[b];
                        if (base.body.team != i && base.body.team != NEUTRAL_TEAM_ID)teamTickets[i] -= ticketBleed;
                    }
                    if(teamTickets[i]<0){
                        teamTickets[i]=0;
                    }else{
                        livep=i;
                        nlive++;
                    }
                    str += " " + i + ":" + parseInt(teamTickets[i]);
                }
                if(nlive==1&&liveTeams>1){
                    //Victory
                    messaging.send("team_won",livep);
                }
                ticketsDisplay.innerHTML = str;
            }

        }

        function changeMap(name) {
            currentMap = boloworld.loadMapByName(name);
            display.camera.zoomToPause();
            buildMapObjects();
        }

        var aiIndexBase = 0;

        function godCommand(msg) {
            console.log("Got god command:" + msg);
            var cmd = msg.split('~');
            if (cmd[0] == "changeMap") {
                changeMap(cmd[1]);

            } else if (cmd[0] == "startGame") {
                spawnPlayers();
            } else if (cmd[0] == "addAI") {
                var ai = addAI();
                ai.aiIndex = aiIndexBase++;
                ai.aiModule = cmd[1];
                ai.team = parseInt(cmd[2]);
            } else if (cmd[0] == "host") {
                if (cmd[1] == network.g_networkId) {
                    network.g_isHost = true;
                } else {
                    network.g_isHost = false;
                }
            }
        }

        function invokeGod(msg) {
            console.log("god:" + msg);
            if (network.connected()) {
                network.emit('god', msg);
            } else {
                godCommand(msg);
            }

        }

        function invokeHost(msg) {
            console.log("god:" + msg);
            if (network.connected()) {
                network.emit('god', msg);
            } else {
                godCommand(msg);
            }
        }

        network.onSim = function (cmd) {
            for (var t = 0; t < cmd.length;) {
                if (cmd[t] == 'sync') {
                    console.log('got sync' + cmd.join());
                    t++;
                    var id = cmd[t++];
                    var plyr = playersByNetworkId[id];
                    if (!plyr) {
                        console.log("Invalid player sync!" + id);

                    } else {
                        var go = plyr.avatar;
                        if (go) {
                            for (var i = 12; i < 15; i++)go.matrix[i] = parseFloat(cmd[t++]);
                            go.angle = parseFloat(cmd[t++]);
                            boloworld.moveTileObject(go, go.matrix[12], go.matrix[13], go.matrix[14])
                        } else
                            t += 4;
                    }
                } else if (cmd[t] == 'ctrl') {
                    console.log('got ctrl' + cmd.join());
                    t++;
                    var id = cmd[t++];
                    var plyr = playersByNetworkId[id];
                    if (!plyr) {
                        console.log("Invalid player ctrl!" + id);
                        t++;
                    } else {
                        var go = plyr.avatar;
                        if (go) {
                            go.controls = parseInt(cmd[t++]);
                        }
                    }
                } else {
                    console.log("Invalid sim packet!" + cmd.join());
                    return;

                }
            }
        }
        function selectToolControl(name) {
            selectTool(name);
            return playerControls[name];
        }

        function getCurrentControls() {
            var controls = 0;
            if (alphaKeyPressed('1'))controls |= selectToolControl("harvest");
            if (alphaKeyPressed('2'))controls |= selectToolControl("road");
            if (alphaKeyPressed('3'))controls |= selectToolControl("building");
            if (alphaKeyPressed('4'))controls |= selectToolControl("pillbox");
            if (alphaKeyPressed('5'))controls |= selectToolControl("mine");
            if (alphaKeyDown('W') || keyCodeDown(38))controls |= playerControls.up;
            if (alphaKeyDown('S') || keyCodeDown(40))controls |= playerControls.down;
            if (alphaKeyDown('A') || keyCodeDown(37))controls |= playerControls.left;
            if (alphaKeyDown('D') || keyCodeDown(39))controls |= playerControls.right;
            if (alphaKeyDown('H'))controls |= playerControls.hack;
            if (alphaKeyDown(' '))controls |= playerControls.fire;
            return controls;
        }

        function createSyncPacket() {
            var sync = 'sync~' + network.g_networkId;
            for (var t = 12; t < 15; t++)sync += '~' + this.matrix[t];
            sync += '~' + this.angle;
            return sync;
        }

        function createCtrlPacket() {
            return 'ctrl~' + network.g_networkId + "~" + this.controls;
        }

        function updateLocalPlayer() {

            if (network.connected()) {
                if (syncCountdown-- < 0) {
                    network.emit('sim', createSyncPacket.call(this));
                    syncCountdown = 120;
                }
            }

            if ((hudUpdateCounter++ % 30) == 0)
                updatePlayerHUD(this);
            //boloworld.getRegionCoordAtWorld(mat[12],mat[13]);

            var lastControls = this.controls;
            //AWSD movement
            //Arrow key movement
            var controls = getCurrentControls();
            if (lastControls != controls) {
                //Send controls changed message           
                this.controls = controls;
                network.emit('sim', createCtrlPacket.call(this));
            }

            var pmat = this.matrix;
            display.camera.setCenter(this.camTarget);

            if (!crosshairSprite)
                crosshairSprite = boloworld.addObject("crosshair", [pmat[12], pmat[13], 0.0]);

            var cmat = crosshairSprite.matrix;
            mat4.set(pmat, cmat);
            var cursRad = 7 * boloworld.tileDim;//worldMeter;
            cmat[12] += pmat[4] * cursRad;
            cmat[13] += pmat[5] * cursRad;


            var dcam = display.camera;
            //console.log(dcam.mouseX+","+dcam.mouseY);
            var ray = display.computePickRay(dcam.mouseX, dcam.mouseY);

            if (!cursorSprite)
                cursorSprite = boloworld.addObject("cursor", ray.o);//[pmat[12],pmat[13],0.0]);        
            var cmat = cursorSprite.matrix;

            //vec3.add(ray.o,vec3.scale(ray.d,15.0,v3t0),v3t0);
            //mat4.setRowV3(cmat,3,v3t0);


            //mat4.scale(cmat,15.0);
            var gotValidCursor = false;
            if (rayPlaneIntersect(ray.o, ray.d, groundPlane.o, groundPlane.d, v3t0)) {
                //v3t0[1]-=15;
                boloworld.worldToCellCoord(v3t0, v3t1)
                boloworld.cellCoordToWorld(v3t1, v3t0);
                mat4.setRowV3(cmat, 3, v3t0);
                gotValidCursor = true;
            }
            //vec3.add(ray.o,vec3.scale(ray.d,15.0));
            //mat4.setRowV3(cmat,3,ray.o);


            if (display.camera.mouseButtonsDown == 8) {//&1!=0){
                if (mouseWasDown == false) {
                    mouseWasDown = true;
                    if (!this.pilot) {
                        //Attempt deploy pilot
                        var targetValid = true;
                        if (gotValidCursor == false)
                            targetValid = false;
                        else if (this.cell[0].name == "River" || this.cell[0].name == "Ocean")
                            targetValid = false;

                        var targ = [v3t0[0], v3t0[1], v3t0[2]];
                        var targCell = boloworld.getCellAtWorld(v3t0[0], v3t0[1]);

                        if (validPilotTarget(this, currentTool, targCell) == false) {
                            targetValid = false;
                            //invalid target..
                            audio.play("bubbles");
                        }
                        else if (targetValid == true) {
                            //Deploy pilot
                            var p = this.pilot = boloworld.addObject("pilot", [this.matrix[12], this.matrix[13], 0.0]);
                            var pio = this.pilotIndicator = boloworld.addObject("pilotDir", [this.matrix[12], this.matrix[13], 0.0]);
                            p.update = updatePilot;
                            p.tank = this;
                            p.team = this.team;
                            p.name = "pilot";
                            p.start = [this.matrix[12], this.matrix[13], 0.0];
                            p.target = targ;
                            p.targetCell = targCell;
                            p.targetNormal = vec3.subtract(p.target, p.start, v3t0);
                            var d = p.targetDist = vec3.length(v3t0);
                            p.targetNormal = [v3t0[0] / d, v3t0[1] / d, v3t0[2] / d];
                            boloworld.addObjectToGrid(p);
                        }
                    }
                }
            } else
                mouseWasDown = false;

        }

        function baseHealPlayer(b, p) {

        }

//25th United Airlines UA 900.. 
        function updatePlayer() {

            if (localPlayer && localPlayer.avatar == this)
                updateLocalPlayer.call(this);

            var controls = this.controls;
            if (controls & playerControls.harvest) {currentTool = "harvest";}
            if (controls & playerControls.road) {currentTool = "road";}
            if (controls & playerControls.building) {currentTool = "building";}
            if (controls & playerControls.pillbox) {currentTool = "pillbox";}
            if (controls & playerControls.mine) {currentTool = "mine";}
            if (controls & playerControls.up)this.speed += accel;
            if (controls & playerControls.down)this.speed -= accel;
            if (controls & playerControls.left)this.angle += rspeed;
            if (controls & playerControls.right)this.angle -= rspeed;
            if (controls & playerControls.hack) {
                this.invMines = 40;
                this.invShells = 40;
                this.hp = 255;
                pilotSpeed = 0.7;
            }
            //Tank Firing
            if (controls & playerControls.fire)this.firing = true;
            else this.firing = false;


            var impulseVel = 0.0;
            var mat = this.matrix;

            if (this.speed < 0.0)this.speed = 0;
            else if (this.speed > 1.0)this.speed = 1.0;
//  Handle tank movement
            var msin = Math.sin(this.angle);
            var mcos = Math.cos(this.angle);

            var groundSpeed = this.speed * boloworld.worldMeter * 0.25;

            var ppos = mat4.getRowV3(this.matrix, 3, v3t6);

            var curCell = this.cell;

            if (curCell.length > 1) {
                if (curCell[1].name == "base") {
                    base = curCell[1];
                    if (base.team == this.team) {//At friendly base
                        //Heal at base
                        healCounter += healRate / 60.0;
                        var healAmt = parseInt(healCounter);
                        healCounter -= healAmt;
                        if (this.invShells < 40 && base.shells > 0) {
                            if (healAmt > base.shells)healAmt = base.shells;
                            this.invShells += healAmt;
                            base.shells -= healAmt;
                            if (this.invShells > 40)this.invShells = 40;
                        } else if (this.invMines < 40 && base.mines > 0) {
                            if (healAmt > base.mines)healAmt = base.mines;
                            this.invMines += healAmt;
                            base.mines -= healAmt;
                            if (this.invMines > 40)this.invMines = 40;
                        } else if (this.hp < 255 && base.armor > 0) {
                            if (healAmt > base.armor)healAmt = base.armor;
                            this.hp += healAmt;
                            base.armor -= healAmt;
                            if (this.hp > 255)this.hp = 255;
                        } else
                            healCounter = 0.0;
                    }
                } else if (curCell[1].name == "mine") {
                    //Trigger mines
                    var mine = curCell[1];
                    iterateNeighbors(mine, boloworld.tileDim * 0.5, triggerAdjacentMines);
                }
            }
            var boatSpeed = 0.75;
            if (!this.boat) {
                if (curCell[0].name == "River" || curCell[0].name == "Ocean") {
                    for (var t = 1; t < curCell.length; t++) {
                        if (curCell[t].name == "boat") {
                            this.boat = curCell[t];
                        }
                    }
                }
                if (!this.boat) {
                    groundSpeed *= tileData[curCell[0].name].speed;
                }
            }
            if (this.boat) {
                if (curCell[0].name == "River" || curCell[0].name == "Ocean") {
                    groundSpeed *= boatSpeed;

                    boloworld.moveTileObject(this.boat, this.matrix[12], this.matrix[13], 0.0);

                    mat4.set(this.matrix, this.boat.matrix);
                } else {
                    if (this.speed > 0.9) {
                        //Disembark...
                        delete this.boat;
                    } else {
                        //Clamp to boat position
                        this.matrix[12] = this.boat.matrix[12];
                        this.matrix[13] = this.boat.matrix[13];
                    }
                }
            } else {
                if (!this.lastCell)this.lastCell = curCell;

                if (this.lastCell != curCell) {
                    //Moved into a new cel..
                    this.lastCell = curCell;
                    if (curCell.length > 2) {
                        for (var t = 1; t < curCell.length;) {
                            if (curCell[t].name == "deadTurret") {
                                var dtur = curCell[t];
                                dtur.active = false;
                                boloworld.removeTileObject(dtur);
                                this.invTurrets.push(dtur.pillboxNumber);
                                playSound(this, "farming_tree_near");
                            } else if (curCell[t].name == "base") {
                                //Entered base cell .. on base...
                                base = curCell[t];
                                if (base.team != this.team) {//Unclaimed base, create a new instance
                                    base.team = this.team;
                                    var bpos = mat4.getRowV3(base.matrix, 3, v3t7);
                                    if (base.flare)
                                        base.flare.active = false;
                                    base.flare = boloworld.addObject((this.team == 0) ? "flareRed" : "flareBlue", bpos);
                                    playSound(this, "man_dying_far");

                                    var cb = document.getElementById("basebox_" + base.baseNumber);
                                    cb.style["background-color"] = (this.team == 0) ? "red" : "blue";
                                }
                                t++;
                            } else
                                t++;
                        }
                    }
                }
            }

            var dx = (-msin * groundSpeed);
            var dy = (mcos * groundSpeed);

            if (this.recoil) {
                dx += this.recoil[0];
                dy += this.recoil[1];
                vec3.scale(this.recoil, 0.9);
            }
            moveObject(this, dx, dy, 0.0, tankRad, playerTilePassable);

            var pmat = this.matrix;
            mat4.getRowV3(pmat, 3, this.camTarget);
            mat4.identity(pmat);
            mat4.translate(pmat, this.camTarget);
            mat4.rotateZ(pmat, this.angle)

            vec3.scale(this.camTarget, -1.0);   //Flip the coordinate so its in camera space..
            this.camTarget[2] -= 2.0;


            if (!this.boat && (this.cell[0].name == "Ocean" || this.cell[0].name == "River")) {
                //Take water damage to shells and ammo
                damageCounter += damageRate / 60.0;
                var damageAmt = parseInt(damageCounter);
                damageCounter -= damageAmt;
                this.invShells -= damageAmt;
                this.invMines -= damageAmt;
                if (this.invShells < 0)this.invShells = 0;
                if (this.invMines < 0)this.invMines = 0;
                if (damageAmt > 0) {
                    //playSound(this,"bubbles");
                }
            }


            if (this.firing) {
                if ((!this.fireCooldown || (this.fireCooldown < 0)) && this.invShells > 0) {
                    this.fireCooldown = 15;
                    this.invShells--;
                    fireProjectile(this);
                } else {
                    this.fireCooldown--;
                }
            } else if (this.fireCooldown) {
                this.fireCooldown--;
            }
            if (this.pilotIndicator) {
                mat4.set(this.matrix, this.pilotIndicator.matrix);
                mat4.clearRotation(this.pilotIndicator.matrix);
                var ang = angleToTarget(this, this.pilot);
                mat4.rotateZ(this.pilotIndicator.matrix, ang);
            }
        }

        var sounds = [
            "big_explosion_far",
            "big_explosion_near",
            "bubbles",
            "farming_tree_far",
            "farming_tree_near",
            "hit_tank_far",
            "hit_tank_near",
            "hit_tank_self",
            "man_building_far",
            "man_building_near",
            "man_dying_far",
            "man_dying_near",
            "man_lay_mine_near",
            "mine_explosion_far",
            "mine_explosion_near",
            "shooting_far",
            "shooting_near",
            "shooting_self",
            "shot_building_far",
            "shot_building_near",
            "shot_tree_far",
            "shot_tree_near",
            "tank_sinking_far",
            "tank_sinking_near"
        ];


        function simUIMessage(msg) {
            currentTool = msg;
            audio.play("man_lay_mine_near");
        }

        function initSim() {

            window.simUIMessage = simUIMessage;

            display = displayModule.getDisplay();
            gl = display.gl;
            explosionMesh = display.mesh(gl, meshes.explosion)
            explosionRenderer = boloworld.createSingleMeshRenderer("explosion");

            boloworld.setTileMeshGenerator(generateTileMesh);


            var loadRequests = {};
            for (var si in sounds)
                loadRequests[sounds[si]] = {file: sounds[si]};
            audio.loadSounds("js/sounds/", loadRequests);
            audio.startSoundsLoading();

            startGame("Spay Anything", 1, 2);

        }


        function startGame(map, aiCount0, aiCount1) {

            invokeGod("host~" + network.g_networkId);

            invokeGod("changeMap~" + map);
            invokeGod("startGame");
            if (aiCount0)
                for (var t = 0; t < aiCount0; t++)
                    invokeGod("addAI~ai0~" + 0);
            if (aiCount1)
                for (var t = 0; t < aiCount1; t++)
                    invokeGod("addAI~ai0~" + 1)
        }


        var cameraPos = [0, 0, 0];

        function sfrnd(rng){
            return ((Math.random()*rng)-(rng*0.5));
        }

        function updateSim() {

            if (alphaKeyPressed('6')) {
                startGame("Spay Anything", 1, 2);
            }
            if (alphaKeyPressed('7')) {
                startGame("Empty Carcass", 15, 16);
            }
            if (alphaKeyPressed('8')) {
                invokeGod("addAI" + "~" + "ai0~0")
            }

            if (alphaKeyPressed('9')) {
                var map = bolomap.getRandomMapName();
                invokeGod("changeMap" + "~" + map);
            }
            if (alphaKeyPressed('0')) {
                invokeGod("startGame");
            }

            if (alphaKeyPressed('Y')) {
                messaging.send("team_won",0);
            }

            audio.harvestDeadSounds();
            mat4.getRowV3(displayModule.viewInverse, 3, cameraPos);
            audio.setListenerParams(cameraPos);

            updatePlayers();

            updateAIs();
        }

        function randElem(arr) {
            return arr[parseInt(Math.random() * arr.length * 0.999)];
        }

        function randElemIndex(arr) {
            return parseInt(Math.random() * arr.length * 0.999);
        }


        function updateList(listObj, nextField, updateFn) {
            var prv = null;
            for (var p = listObj.list; p != null;) {
                if (p.active == false) {
                    if (prv == null)listObj.list = p[nextField];
                    prv[nextField] = p[nextField];
                } else {
                    updateFn(p);
                    prv = p;
                    p = p[nextField];
                }
            }
        }

        function cellIsPillboxTarget(obj, cell) {
            for (var t = 1; t < cell.length; t++) {
                if (cell[t].name == "tank" && obj.team != cell[t].team) {
                    return false;
                }
            }
            return true;
            //     if(cell.length>1 && cell[1].name!="turret" && cell[1].name!="base" && cell[1].name!="boat")
            //       return false;
            //   return true;
        }

        function angleBetweenPoints(pa, pb) {
            vec3.subtract(pa, pb, v3t2);
            vec3.normalize(v3t2);
            return Math.atan2(v3t2[1], v3t2[0]) + (Math.PI * 0.5);
        }

        function angleToTarget(shooter, target) {
            return angleBetweenPoints(mat4.getRowV3(shooter.matrix, 3, v3t0), mat4.getRowV3(target.matrix, 3, v3t1));
        }

        function updatePillbox() {
            var p = this;
            if (!p.birth) {
                p.birth = boloworld.simTime();
                p.counter = 0;
            }
            if ((p.counter++ % 32) == (p.id % 32)) {
                var targCt = boloworld.getCellsInRadius(p, p.matrix[12], p.matrix[13], 7 * boloworld.tileDim, cellIsPillboxTarget);
                if (targCt > 0) {
                    var cres = boloworld.getCollisionResult();
                    for (var t = 0; t < targCt; t++) {
                        var cr = cres[t];
                        //console.log("cres:"+cr[2][1].name+" t:"+cr[0][0]+","+cr[0][1]+".");
                        if (cr[2][1].name == "tank") {
                            var angle = angleToTarget(p, cr[2][1]);
                            mat4.clearRotation(p.matrix);
                            mat4.rotateZ(p.matrix, angle);
                            fireProjectile(p);
                            break;
                        }
                    }
                }
            }
        }

        function buildMapObjects() {
            currentMap = bolomap.getCurrentMap();
            if (!currentMap)return;
            for (var i in currentMap.bases) {
                var tbase = currentMap.bases[i];
                var base = boloworld.addTileObject("base", tbase.x, tbase.y);
                var bbox = document.getElementById("basebox_" + i);
                bbox.style["background-color"] = "#bb9878";
                base.baseNumber = i;
                base.armor = tbase.armor;
                base.shells = tbase.shells;
                base.mines = tbase.mines;
                base.team = NEUTRAL_TEAM_ID;
                tbase.body = base;
            }

            for (i = currentMap.bases.length; i < 21; i++) {
                var bbox = document.getElementById("basebox_" + i);
                bbox.style.display = "none";
            }

            for (var i in currentMap.pillboxes) {
                var pill = currentMap.pillboxes[i];
                var pObj = boloworld.addTileObject("turret", pill.x, pill.y);
                var bbox = document.getElementById("cbox_" + i);
                pObj.pillboxNumber = i;
                pObj.team = NEUTRAL_TEAM_ID;
                bbox.style["background-color"] = "#14751c";
                pObj.update = updatePillbox;
            }


            for (i = currentMap.pillboxes.length; i < 21; i++) {
                var bbox = document.getElementById("cbox_" + i);
                bbox.style.display = "none";
            }


            for (var i in currentMap.starts) {
                var start = currentMap.starts[i];
                //addTileObject("boat",start.x,start.y);
            }
        }

        function spawnPlayer(p) {
            var spawnpt = randElem(currentMap.starts);
            p.avatar = boloworld.addTileObject(p.team ? "tankB" : "tankA", spawnpt.x, spawnpt.y)
            p.avatar.name = "tank";
            p.avatar.currentTool = "harvest";
            p.avatar.boat = boloworld.addTileObject("boat", spawnpt.x, spawnpt.y);
            p.avatar.invWood = 0;
            p.avatar.invShells = 40;
            p.avatar.invMines = 40;
            p.avatar.invTurrets = [];
            p.avatar.hp = 255;
            p.avatar.player = p;
            p.avatar.camTarget = [0, 0, 0];
            p.avatar.angle = 0;
            p.avatar.speed = 0;
            p.avatar.controls = 0;
            p.avatar.team = p.team;
            p.avatar.update = updatePlayer;
            p.avatar.angle = angleBetweenPoints(mat4.getRowV3(p.avatar.matrix, 3, v3t0), [55.0, 0, 0]);
            playersByObjectId[p.avatar.id] = p;

            if (p.aiModule) {
                p.avatar.addComponent("brain", new brain.Brain(bsim, p, p.aiModule));
            }
        }

        function addAI() {
            var newPlayer = {
                name: "tron",
                avatar: null,
                respawnCountdown: 1,
                controlBits: 0,
                team: 0
            };
            var p = newPlayer;
            aiList.push(p);
            return newPlayer;
        }

        function addPlayer() {
            var newPlayer = {
                name: "tron",
                avatar: null,
                respawnCountdown: 1,
                controlBits: 0,
                team: 0
            };
            var p = newPlayer;
            playerList.push(p);
            return newPlayer;
        }

        function releaseGameObjects(olist) {
            for (var p in olist) {
                if (olist[p].avatar) {
                    var pav = olist[p].avatar;
                    pav.active = false;
                    if (pav.boat)
                        pav.boat.active = false;
                }
            }
        }

        function spawnAIs() {
            releaseGameObjects(aiList);
        }

        function spawnPlayers() {
            //Destroy existing players
            releaseGameObjects(playerList);
            //Build new player objects for each multiplayer networked game client
            playerList = [];
            playersByObjectId = {};
            playersByNetworkId = {};
            var plist = network.g_playerList;
            for (var p in plist) {
                var np = addPlayer();
                playersByNetworkId[p] = np;
                np.networkId = p;
                if (p == network.g_networkId)
                    localPlayer = np;
            }
            if (network.connected() == false) { //no network, so Create a local player for singleplayer game...
                var np = addPlayer();
                playersByNetworkId[-1] = np;
                np.networkId = -1;
                localPlayer = np;
            }
        }

        function updateAIs() {
            updatePlayerList(aiList);
        }

        function updatePlayers() {
            updatePlayerList(playerList);
        }

        function updatePlayerList(plist) {
            for (var p in plist) {
                var np = plist[p];
                if (np.avatar) {
                    if (np.avatar.active == false) {
                        np.respawnCountdown = 60 * 3;
                        delete playersByObjectId[np.avatar.id];
                        np.avatar = null;
                        if (np == localPlayer) {
                            boloworld.localPlayerDied();
                        }
                    }
                } else {
                    if (np.respawnCountdown > 0) {
                        np.respawnCountdown--;
                        if (np.respawnCountdown == 0) {
                            spawnPlayer(np);
                            if (np == localPlayer) {
                                display.camera.setCenter(np.avatar.camTarget);
                                boloworld.localPlayerSpawned();
                            }
                        }
                    }
                }
            }
        }

        bsim =
        {
            initSim: initSim,
            updateSim: updateSim,
            playerControls: playerControls,
            randElem: randElem,
            world: boloworld,
            angleBetweenPoints: angleBetweenPoints,
        }

        return bsim;

    });