import messaging from "./util/messaging.js"
import bolomap from "./bolomap.js"
import boloworld from "./boloworld.js"
import network from "./network.js"
import brain from "./brain.js"

import {vec3,mat4} from "./util/gl-matrix.js"

if (typeof (global) == 'object') {
    //Node
    global.network = network;
    network.g_isHost = true;
}
function nv3() {
    return [0, 0, 0];
}

let v3t0 = nv3();
let v3t1 = nv3();
let v3t2 = nv3();
let v3t3 = nv3();
let v3t4 = nv3();
let v3t5 = nv3();
let v3t6 = nv3();
let v3t7 = nv3();
let v3t8 = nv3();
let v3t9 = nv3();

let currentMap = null;
let playerList = [];
let aiList = [];
let playersByObjectId = {};
let playersByNetworkId = {};
let localPlayer = null;
let NEUTRAL_TEAM_ID = 8;

let ticketBleed = 0.5;
let startingTickets = 500;
let teamTickets = {
    0: startingTickets,
    1: startingTickets
};

let gamePaused = false;

let tileSpeeds = {
    "Building": 0.0,
    "River": 0.3,
    "Swamp": 0.5,
    "Crater": 0.8,
    "Road": 1.0,
    "Forest": 0.8,
    "Rubble": 0.4,
    "Grass": 0.8,
    "ShotBuilding": 0.0,
    "RiverWithBoat": 1.0,
    "Ocean": 0.25
};

let pilotRad = boloworld.worldMeter * 2;
let pilotSpeed = 0.21;

let toolReqs = {
    harvest: ["Forest"],
    road: ["Grass", "Swamp", "River", "Rubble"],
    building: ["Grass", "Swamp", "River", "Road"],
    pillbox: ["Grass", "Swamp"],
    mine: ["Grass", "Swamp", "Rubble", "Road"]
}
let roadWoodCost = 2;
let buildingWoodCost = 2;
let currentTool = "harvest";

let groundPlane = {
    o: [0, 0, 0],
    d: [0, 0, 1]
};

let accel = 0.1;
let rspeed = 0.03;

let tankRad = 4.0 * boloworld.worldMeter;

let healCounter = 0.0;
let healRate = 10.0;
let damageCounter = 0.0;
let damageRate = 3.0;
let syncCountdown = 0;
let mouseWasDown = false;

let hudUpdateCounter = 0;

let crosshairSprite;
let cursorSprite;
let display;
let dirtyTileCache = {};

messaging.listen("networkConnectedToServer", function() {
    network.on("god", godCommand);
    network.on("host", hostCommand);
});

let playerControls = {
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

function v3set(v, vx, vy, vz) {
    v[0] = vx;
    v[1] = vy;
    v[2] = vz;
}

function moveObject(obj, dx, dy, dz, rad, passableFunc, collisionFunc) {
    let pmat = obj.matrix;
    let newX = pmat[12] + dx;
    let newY = pmat[13] + dy;
    let collisions;

    if (rad) {
        let colCount;
        if ((colCount = boloworld.radiusPassable(obj, newX, newY, rad, passableFunc)) != 0) {
            //Can't move both xy'
            if ((colCount = boloworld.radiusPassable(obj, newX, pmat[13], rad, passableFunc)) == 0) {
                //Can move x
                newY = pmat[13];
            } else if ((colCount = boloworld.radiusPassable(obj, pmat[12], newY, rad, passableFunc)) == 0) {
                //Can move y
                newX = pmat[12];
            } else {
                //Can't move
                newX = pmat[12];
                newY = pmat[13];
            }
            if (collisionFunc) {
                let collisions = boloworld.getCollisionResult();
                for (let t = 0; t < colCount; t++) {
                    collisionFunc(obj, collisions[t]);
                }
            }
        }
    } else {
        let colCell;
        if (passableFunc(obj, colCell = boloworld.getCellAtWorld(newX, newY)) == false) {
            let badCell = colCell;
            let badX = newX;
            let badY = newY;

            if (collisionFunc) {
                let collisions = boloworld.getCollisionResult();
                let c = collisions[0];
                v3set(v3t0, badX, badY, 0);
                boloworld.worldToCellCoord(v3t0, c[0]);
                c[1][0] = badX;
                c[1][1] = badY;
                c[2] = badCell;
                collisionFunc(obj, c);
            }

            if (passableFunc(obj, colCell = boloworld.getCellAtWorld(newX, pmat[13]))) {
                //Can move x
                newY = pmat[13];
            } else if (passableFunc(obj, colCell = boloworld.getCellAtWorld(pmat[12], newY))) {
                //Can move y
                newX = pmat[12];
            } else {
                //Can't move
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

function dealDamageToMapObject(c, cell, c0, proj) {
    let cellDirty = false;
    let shellExploded = false;
    if ((c0.name == "Building" || c0.name == "ShotBuilding") && c0.hp > 0) {
        //Damage buildigns..
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
        for (let t = 1; t < cell.length; t++) {
            let obj = cell[t];
            if (obj == proj.shooter) //Dont allow bullets to hit thier shooter
            {
                t++;
                continue;
            }
            if (obj.name == "base")
                //Don't damage bases!
                continue;

            if (!obj.hp)
                obj.hp = 255;
            obj.hp -= 25;

            if (obj.name == "tank") {
                //Hit enemy tank
                playSound(proj, "hit_tank_self");
                obj.recoil = [proj.velocity[0], proj.velocity[1], proj.velocity[2]];
                if (cell[0].name == "Ocean") {
                    obj.hp = 0;
                    //Die when shot on ocean
                }
            }
            if (obj.hp <= 0) {
                obj.hp = 0;
                obj.active = false;
                //Destroy objects on the tile..
                boloworld.removeTileObject(obj);

                if (obj.boat) {
                    boloworld.removeTileObject(obj.boat);
                    delete obj.boat;
                }
                if (cell[0].name != "River" && cell[0].name != "Ocean") {
                    cell[0] = {
                        name: "Rubble",
                        hp: 255
                    };
                    cellDirty = true;
                } else {

                    playSound(obj, "bubbles");
                }

                if (obj.name == "tank") {
                    //Tank destroyed...
                    playSound(obj, "big_explosion_near");
                } else if (obj.name == "turret") {
                    //Turret destroyed...
                    let deadTurret = boloworld.addObject("turretd2", [obj.matrix[12], obj.matrix[13], obj.matrix[14]]);
                    deadTurret.name = "deadTurret";
                    deadTurret.hp = 255;
                    boloworld.addObjectToGrid(deadTurret);
                    deadTurret.pillboxNumber = obj.pillboxNumber;

                    messaging.send("turretDestroyed", {
                        turret: deadTurret,
                        player: this
                    });

                    playSound(obj, "big_explosion_far");

                }
                //console.log(obj.name+" destroyed.");
                //cell.length=1;

            } else
                t++;
            shellExploded = true;
        }

        if (cell.length == 1 && c0.name != "River" && c0.name != "Ocean") {
            cell[0] = {
                name: (c0.name == "Forest") ? "Grass" : "Rubble",
                hp: 255
            }
            playSound(proj, "shot_tree_far");
            cellDirty = true;
            shellExploded = true;
        }
    }
    if (cellDirty == true) {
        boloworld.rebuildRegionAtTile(c[0], c[1]);
        dirtyTileCache["" + c[0] + "," + c[1]] = cell;
    }
    return shellExploded;
}

function dealDamageToMap(proj, c, cell) {
    //let c = cell.cellCoord;//collision[0];
    //let cell = collision[2];

    for (let t = 0; t < cell.length; t++) {
        let c0 = cell[t];
        if (dealDamageToMapObject(c, cell, cell[t], proj))
            return true;
    }
    return false;
}

function projectileCollision(proj, collision) {
    //Shell already exploding so bail

    if (dealDamageToMap(proj, collision[0], collision[2]) == true) {
        proj.colCellCoord = collision[0];
        proj.colCell = collision[2];

        proj.life = 0;
        proj.velocity[0] = proj.velocity[1] = 0.0;
    }
}

function findObjectInCell(cell, name) {
    for (let y = 0; y < cell.length; y++)
        if (cell[y].name == name)
            return y;
    return -1;
}

function cellContains(cell, name) {
    for (let y = 0; y < cell.length; y++)
        if (cell[y].name == name)
            return true;
    return false;
}

function projectilePassable(obj, tile) {
    //if(tile.length>1)return false;
    if (tile[0].name == "Building")
        return false;
    if (tile[0].name == "ShotBuilding")
        return false;
    if (tile[0].name == "Forest")
        return false;
    if (tile.length > 1 && (cellContains(tile, "turret") || cellContains(tile, "tank") || cellContains(tile, "pilot") || cellContains(tile, "boat"))) {
        if (tile.length == 2 && obj.shooter == tile[1])
            //Dont shoot self...
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
        this.active = false;
        //Die.
        let exp = addExplosionNearObject(this);
        exp.proj = this;
        if (this.colCell) {
            exp.colCell = this.colCell;
            exp.colCellCoord = this.colCellCoord;
            exp.destroy = function() {//   dealDamageToMap(this.proj,this.colCellCoord,this.colCell);
                
            }
            ;
        }
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
    let bullet = boloworld.addObject("bullet", [shooter.matrix[12], shooter.matrix[13], 0.0]);
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

function alphaKeyPressed(ak) {
    return display.alphaKeyPressed(ak);
}

function alphaKeyDown(ak) {
    return display.alphaKeyDown(ak);
}

function keyCodeDown(kk) {
    return display.keyCodeDown(kk);
}

function playerTilePassable(obj, tile) {
    if (tile[0].name == "Building" || tile[0].name == "ShotBuilding")
        return false;
    if (tile.length > 1) {
        //Don't move into other tanks, unless we are already in a cell with other tanks, in which case, go ahead and move out...
        let fidx = findObjectInCell(tile, "tank");
        if (fidx > 0) {
            for (let t = 0; t < tile.length; t++) {//    if(tile[t]==obj)
            //       return true;
            }
            //return false;
        }
    }
    return true;
}

function rayPlaneIntersect(ro, rd, po, pd, out) {
    let vdd = vec3.dot(rd, pd);
    if (vdd >= 0.0)
        return false;
    vec3.subtract(po, ro, v3t0);
    let vd = vec3.dot(v3t0, pd);
    vec3.scale(rd, vd / vdd, v3t0);
    vec3.add(v3t0, ro, out);
    return true;
}

function pilotTilePassable(obj, tile) {
    //if(tile.length>1)return false;
    if (tile[0].name == "Building" || tile[0].name == "ShotBuilding" || tile[0].name == "River" || tile[0].name == "Ocean") {
        if (tile == obj.targetCell)
            return true;
        return false;
    }

    return true;
}

function doPilotAction() {
}

function validPilotTarget(tank, tool, cell) {
    let validTarget = false;
    let reqs = toolReqs[tool];
    if (!reqs)
        return false;
    let valid = false;
    for (let i = 0; i < reqs.length; i++)
        if (cell[0].name == reqs[i])
            valid = true;
    if (tool == "road" && tank.invWood < roadWoodCost)
        return false;
    if (tool == "building" && tank.invWood < buildingWoodCost)
        return false;
    if (tool == "pillbox" && tank.invTurrets.length == 0)
        return false;
    return valid;
}

function setupUnitShader(unit) {
    if (unit.shader) {
        unit.shader = boloworld.getShader("Unit");
    } else if (unit.meshRenderer) {
        unit.meshRenderer.shader = boloworld.getShader("Unit");
    } else {
        console.log("Unit does not have visible shaders!");
    }
    unit.tint = unit.team == 0 ? [0.5, 0, 0, 0] : [0, 0, 0.5, 0];
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
    let dist = vec3.length(this.velocity);

    if (dist < pilotSpeed) {
        if (!this.returning) {
            //Made it to target...
            let tileDirty = false;
            if (validPilotTarget(this.tank, this.currentTool, this.cell)) {
                if (this.currentTool == "harvest") {
                    this.cell[0] = {
                        name: "Grass",
                        hp: 255
                    };
                    this.wood = 16;
                    //Harvest tree.. turn it to grass...
                    tileDirty = true;
                    playSound(this, "farming_tree_near");
                } else if (this.currentTool == "road") {
                    if (this.tank.invWood > roadWoodCost) {
                        this.cell[0] = {
                            name: "Road",
                            hp: 255
                        };
                        tileDirty = true;
                        this.tank.invWood -= roadWoodCost;
                        playSound(this, "man_building_near");
                    }
                } else if (this.currentTool == "building") {
                    if (this.tank.invWood > buildingWoodCost) {
                        this.cell[0] = {
                            name: "Building",
                            hp: 255
                        };
                        tileDirty = true;
                        this.tank.invWood -= buildingWoodCost;
                        playSound(this, "man_building_near");
                    }
                } else if (this.currentTool == "pillbox") {
                    if (this.tank.invTurrets.length > 0) {
                        let turret = boloworld.addObject("turret", [this.matrix[12], this.matrix[13], this.matrix[14]]);
                        turret.name = "turret";
                        turret.hp = 255;
                        turret.update = updatePillbox;
                        turret.team = this.team;
                        boloworld.addObjectToGrid(turret);
                        turret.pillboxNumber = this.tank.invTurrets.pop();
                        playSound(this, "man_building_near");

                        setupUnitShader(turret);

                        messaging.send("turretDeployed", {
                            turret: turret,
                            player: this
                        });

                    }
                } else if (this.currentTool == "mine") {
                    if (this.tank.invMines > 0 && (this.cell.length == 2)) {
                        mat4.getRowV3(this.matrix, 3, v3t0);
                        let mine = boloworld.addObject("mine", v3t0);
                        mine.name = "mine";
                        mine.hp = 255;
                        //mine.update=updatePillbox;
                        boloworld.addObjectToGrid(mine);
                        playSound(this, "man_lay_mine_near");
                        this.tank.invMines--;

                        mine.team = this.team;
                        setupUnitShader(mine);
                    }
                }
            } else {
                //invalid target..
                playUISound("bubbles");
            }
            if (tileDirty) {
                let cc = boloworld.worldToCellCoord(this.target);
                for (let tx = cc[0] - 1; tx < cc[0] + 1; tx++)
                    for (let ty = cc[1] - 1; ty < cc[1] + 1; ty++)
                        boloworld.rebuildRegionAtTile(tx, ty);
                //Rebuild the world region containing the tile
            }
            this.returning = true;
        } else {
            //Made it back...
            if (this.wood) {
                this.tank.invWood += this.wood;
                //Give wood to the tank...
                if (this.tank.invWood > 255)
                    this.tank.invWood = 255;
            }
            this.tank.pilot = null;

            if (this.tank.pilotIndicator) {
                this.tank.pilotIndicator.active = false;
                this.tank.pilotIndicator = null;
            }
            this.active = false;
            boloworld.removeTileObject(this);

        }
    } else {
        vec3.scale(this.velocity, pilotSpeed / -dist);
        mat4.getRowV3(this.matrix, 3, v3t0);
        moveObject(this, this.velocity[0], this.velocity[1], 0.0, pilotRad, pilotTilePassable);
        mat4.getRowV3(this.matrix, 3, v3t1);
        vec3.subtract(v3t0, v3t1);
        if (vec3.dot(v3t0, v3t0) < (0.01 * 0.01)) {
            //Pilot is BLOCKED.
            if (!this.returning)
                this.returning = true;
            else {//Blocked from returning...
            }
        }
    }
}

let explosionShader;
function getExplosionShader() {
    if (!explosionShader) {
        explosionShader = boloworld.getShader("explosion");
        explosionShader.passIndex = 1;
    }
    return explosionShader;
}

function updateExplosion() {
    if (this.countdown-- < 0)
        this.active = false;
    this.scale *= 1.25;
    this.alpha *= 0.95;
}

function addExplosionNearObject(obj) {
    let bpos = mat4.getRowV3(obj.matrix, 3, v3t7);
    let exp = boloworld.addObject("explosion", v3t7, getExplosionShader());
    exp.update = updateExplosion;
    exp.countdown = 20;
    exp.scale = 0.01;
    exp.alpha = 1.0;
    return exp;
}

function triggerAdjacentMines(mine, collision) {
    let cell = collision[2];
    if (cell.length > 1 && cell[1].name == "mine" && (cell[1].fuse == undefined)) {
        cell[1].fuse = 15;
        cell[1].update = updateMine;
        dealDamageToMap(mine, collision[0], collision[2]);
    }
}

function iterateNeighbors(obj, radius, fn) {
    let nmct = boloworld.getCellsInRadius(obj, obj.matrix[12], obj.matrix[13], radius);
    let collisions = boloworld.getCollisionResult();
    for (let cr = 0; cr < nmct; cr++) {
        fn(obj, collisions[cr]);
    }
}

function updateMine() {
    if (this.fuse-- < 0) {
        this.active = false;
        this.cell[0] = {
            name: "Rubble",
            hp: 255
        };
        boloworld.removeTileObject(this);
        playSound(this, "big_explosion_far");
        mat4.getRowV3(this.matrix, 3, v3t0);
        let cc = boloworld.worldToCellCoord(v3t0);
        boloworld.rebuildRegionAtTile(cc[0], cc[1]);
        addExplosionNearObject(this);
        iterateNeighbors(this, boloworld.tileDim * 1.5, triggerAdjacentMines);
    }
}

function updatePlayerHUD(p) {

    let liveTeams = 0;
    for (let i in teamTickets) {
        if (teamTickets[i] > 0)
            liveTeams++;
    }
    let nlive = 0;
    let livep = 0;
    if (liveTeams > 1) {
        for (let i in teamTickets) {
            for (let b = 0; b < currentMap.bases.length; b++) {
                let base = currentMap.bases[b];
                if (base.body.team != i && base.body.team != NEUTRAL_TEAM_ID)
                    teamTickets[i] -= ticketBleed;
            }
            if (teamTickets[i] < 0) {
                teamTickets[i] = 0;
            } else {
                livep = i;
                nlive++;
            }

        }
        if (nlive == 1 && liveTeams > 1) {
            //Victory
            messaging.send("team_won", livep);
            playUISound("win");
        }
    }
    messaging.send("updatePlayerHUD", p);
}

function changeMap(index) {
    //display.camera.zoomToPause();
    dirtyTileCache = {};
    currentMap = boloworld.loadMapByName(bolomap.getMapNames()[index]);
    messaging.send("game_map_changed", 0);
    buildMapObjects();
    for (let i in teamTickets)
        teamTickets[i] = startingTickets;
    //display.camera.zoomToGame();
}

let aiIndexBase = 0;

function godCommand(msg) {
    console.log("Got god command:" + msg);
    let cmd = msg.split('~');
    if (cmd[0] == "changeMap") {
        changeMap(parseInt(cmd[1]));

    } else if (cmd[0] == "startGame") {
        spawnPlayers();
    } else if (cmd[0] == "addAI") {
        let ai = addAI();
        ai.aiIndex = aiIndexBase++;
        ai.aiModule = cmd[1];
        ai.team = parseInt(cmd[2]);
    } else if (cmd[0] == "host") {
        if (cmd[1] == "" + network.g_networkId) {
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
    console.log("requesting host:" + msg);
    if (network.connected()) {
        network.emit('host', msg);
    } else {
        network.g_isHost = true;
        //godCommand(msg);
    }
}

function hostCommand(msg) {
    if (msg != "" + network.g_networkId) {
        console.log("DEFERRING HOST DUTIES");
        network.g_isHost = false;
    } else {
        console.log("I AM HOST");
        network.g_isHost = true;
    }
}

network.onSim = function(cmd) {
    for (let t = 0; t < cmd.length; ) {
        if (cmd[t] == 'sync') {
            console.log('got sync' + cmd.join());
            t++;
            let id = cmd[t++];
            let plyr = playersByNetworkId[id];
            if (!plyr) {
                console.log("Invalid player sync!" + id);
                t += 5;
            } else {
                let go = plyr.avatar;
                if (go) {
                    for (let i = 12; i < 15; i++)
                        go.matrix[i] = parseFloat(cmd[t++]);
                    go.angle = parseFloat(cmd[t++]);
                    go.speed = parseFloat(cmd[t++]);
                    boloworld.moveTileObject(go, go.matrix[12], go.matrix[13], go.matrix[14])
                } else
                    t += 5;
            }
        } else if (cmd[t] == 'ctrl') {
            console.log('got ctrl' + cmd.join());
            t++;
            let id = cmd[t++];
            let plyr = playersByNetworkId[id];
            if (!plyr) {
                console.log("Invalid player ctrl!" + id);
                t += 2;
            } else {
                let go = plyr.avatar;
                if (go) {
                    go.controls = parseInt(cmd[t++]);
                }
            }
        } else if (cmd[t] == 'tool') {
            t++;
            let id = cmd[t++];
            let plyr = playersByNetworkId[id];

            let tool = cmd[t++];
            if (!plyr) {
                console.log("Invalid player tool!" + id);
                t++;
            } else {
                let go = plyr.avatar;
                if (go) {
                    let targ = [parseFloat(cmd[t++]), parseFloat(cmd[t++]), 0.0];
                    deployPilot.call(plyr.avatar, targ, tool);
                }
            }
        } else if (cmd[t] == 'baseTaken') {
            console.log('got baseTaken' + cmd.join());
            t++;
            let ccoord = [parseInt(cmd[t++]), parseInt(cmd[t++])];
            let cteam = parseInt(cmd[t++]);
            let cell = boloworld.getCell(ccoord[0], ccoord[1]);

            for (let tc = 1; tc < cell.length; tc++) {
                if (cell[tc].name == "base") {
                    takeBase(cell[tc], cteam);
                }
            }
        } else if (cmd[t] == 'setTickets') {
            t++;
            let tickval = [parseInt(cmd[t++])];
            messaging.send('setTickets', parseInt(tickval));
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
    let controls = 0;
    if (alphaKeyPressed('1'))
        controls |= selectToolControl("harvest");
    if (alphaKeyPressed('2'))
        controls |= selectToolControl("road");
    if (alphaKeyPressed('3'))
        controls |= selectToolControl("building");
    if (alphaKeyPressed('4'))
        controls |= selectToolControl("pillbox");
    if (alphaKeyPressed('5'))
        controls |= selectToolControl("mine");
    if (alphaKeyDown('W') || keyCodeDown(38))
        controls |= playerControls.up;
    if (alphaKeyDown('S') || keyCodeDown(40))
        controls |= playerControls.down;
    if (alphaKeyDown('A') || keyCodeDown(37))
        controls |= playerControls.left;
    if (alphaKeyDown('D') || keyCodeDown(39))
        controls |= playerControls.right;
    if (alphaKeyDown('H'))
        controls |= playerControls.hack;
    if (alphaKeyDown(' '))
        controls |= playerControls.fire;
    return controls;
}

function createSyncPacket() {
    let sync = 'sync~' + network.g_networkId;
    for (let t = 12; t < 15; t++)
        sync += '~' + this.matrix[t];
    sync += '~' + this.angle;
    sync += '~' + this.speed;
    return sync;
}

function createCtrlPacket() {
    return 'ctrl~' + network.g_networkId + "~" + this.controls;
}
let lastSyncPacket = "";

function deployPilot(targ, tool) {
    //Deploy pilot

    let targCell = boloworld.getCellAtWorld(targ[0], targ[1]);
    let p = this.pilot = boloworld.addObject("pilot", [this.matrix[12], this.matrix[13], 0.0]);
    let pio = this.pilotIndicator = boloworld.addObject("pilotDir", [this.matrix[12], this.matrix[13], 0.0]);
    p.update = updatePilot;
    p.tank = this;
    p.team = this.team;
    p.name = "pilot";
    p.hp = 1;
    p.start = [this.matrix[12], this.matrix[13], 0.0];
    p.target = targ;
    p.targetCell = targCell;
    p.targetNormal = vec3.subtract(p.target, p.start, v3t0);
    p.currentTool = tool;
    let d = p.targetDist = vec3.length(v3t0);
    p.targetNormal = [v3t0[0] / d, v3t0[1] / d, v3t0[2] / d];
    boloworld.addObjectToGrid(p);
    p.destroy = function() {
        this.tank.pilot = null;
        if (this.tank.pilotIndicator) {
            this.tank.pilotIndicator.active = false;
            this.tank.pilotIndicator = null;
        }
        this.tank = null;
    }
}

function updateLocalPlayer() {

    if (network.connected()) {
        if (syncCountdown-- < 0) {
            let packet = createSyncPacket.call(this);
            if (lastSyncPacket !== packet) {
                network.emit('sim', createSyncPacket.call(this));
                lastSyncPacket = packet
            }
            syncCountdown = 120;
        }
    }

    //boloworld.getRegionCoordAtWorld(mat[12],mat[13]);

    let lastControls = this.controls;
    //AWSD movement
    //Arrow key movement
    let controls = getCurrentControls();
    if (lastControls != controls) {
        //Send controls changed message
        this.controls = controls;
        network.emit('sim', createCtrlPacket.call(this));
    }

    if ((hudUpdateCounter++ % 30) == 0)
        updatePlayerHUD(this);

    if (display.camera == undefined)
        //Node
        return;

    let pmat = this.matrix;
    display.camera.setCenter(this.camTarget);

    if (display.radarCamera)
        display.radarCamera.setCenter(this.camTarget);

    if (!crosshairSprite) {
        crosshairSprite = boloworld.addObject("crosshair", [pmat[12], pmat[13], 0.0]);
        crosshairSprite.destroy = function() {
            crosshairSprite = null;
        }
    }
    let cmat = crosshairSprite.matrix;
    mat4.set(pmat, cmat);
    let cursRad = 7 * boloworld.tileDim;
    //worldMeter;
    cmat[12] += pmat[4] * cursRad;
    cmat[13] += pmat[5] * cursRad;

    let dcam = display.camera;
    //console.log(dcam.mouseX+","+dcam.mouseY);
    let ray = display.computePickRay(dcam.mouseX, dcam.mouseY);

    if (!cursorSprite) {
        cursorSprite = boloworld.addObject("cursor", ray.o);
        //[pmat[12],pmat[13],0.0]);
        cursorSprite.destroy = function() {
            cursorSprite = null;
        }
    }
    cmat = cursorSprite.matrix;

    //vec3.add(ray.o,vec3.scale(ray.d,15.0,v3t0),v3t0);
    //mat4.setRowV3(cmat,3,v3t0);

    //mat4.scale(cmat,15.0);
    let gotValidCursor = false;
    if (rayPlaneIntersect(ray.o, ray.d, groundPlane.o, groundPlane.d, v3t0)) {
        //v3t0[1]-=15;
        boloworld.worldToCellCoord(v3t0, v3t1)
        boloworld.cellCoordToWorld(v3t1, v3t0);
        mat4.setRowV3(cmat, 3, v3t0);
        gotValidCursor = true;
    }
    //vec3.add(ray.o,vec3.scale(ray.d,15.0));
    //mat4.setRowV3(cmat,3,ray.o);

    if (display.camera.mouseButtonsDown == 8) {
        //&1!=0){
        if (mouseWasDown == false) {
            mouseWasDown = true;
            if (!this.pilot) {
                //Attempt deploy pilot
                let targetValid = true;
                if (gotValidCursor == false)
                    targetValid = false;
                else if (this.cell[0].name == "River" || this.cell[0].name == "Ocean")
                    targetValid = false;

                let targ = [v3t0[0], v3t0[1], v3t0[2]];
                let targCell = boloworld.getCellAtWorld(targ[0], targ[1]);
                if (!targCell) {

                    playUISound("bubbles");
                    targetValid = false;
                    return
                }

                if (validPilotTarget(this, currentTool, targCell) == false) {
                    targetValid = false;
                    //invalid target..
                    playUISound("bubbles");
                } else if (targetValid == true) {
                    if (network.connected() == true) {
                        network.emit("sim", "tool~" + network.g_networkId + "~" + currentTool + "~" + targ[0] + "~" + targ[1]);
                        deployPilot.call(this, targ, currentTool);
                    } else {
                        deployPilot.call(this, targ, currentTool);
                    }
                }
            }
        }
    } else
        mouseWasDown = false;

}

function baseHealPlayer(b, p) {
}
function takeBase(base, team) {
    base.team = team;
    let bpos = mat4.getRowV3(base.matrix, 3, v3t7);
    if (base.flare)
        base.flare.active = false;
    base.flare = boloworld.addObject((team == 0) ? "flareRed" : "flareBlue", bpos);

    messaging.send("baseTaken", {
        baseNumber: base.baseNumber,
        team: team
    });
}

//25th United Airlines UA 900.. 
function updatePlayer() {
    let moving;
    let movingForward;
    let controls = this.controls;
    if(this.speed>0) movingForward = true;
    if(controls&(playerControls.up|playerControls.down|playerControls.left|playerControls.right)) moving = true;
    if (localPlayer && localPlayer.avatar == this)
        updateLocalPlayer.call(this);

    if (controls & playerControls.harvest) {
        currentTool = "harvest";
    }
    if (controls & playerControls.road) {
        currentTool = "road";
    }
    if (controls & playerControls.building) {
        currentTool = "building";
    }
    if (controls & playerControls.pillbox) {
        currentTool = "pillbox";
    }
    if (controls & playerControls.mine) {
        currentTool = "mine";
    }
    if (controls & playerControls.up)
        this.speed += accel;
    if (controls & playerControls.down)
        this.speed -= accel;
    if (controls & playerControls.left)
        this.angle += rspeed;
    if (controls & playerControls.right)
        this.angle -= rspeed;
    if (controls & playerControls.hack) {
        this.invMines = 40;
        this.invShells = 40;
        this.hp = 255;
        pilotSpeed = 0.7;
    }
    //Tank Firing
    if (controls & playerControls.fire)
        this.firing = true;
    else
        this.firing = false;

    let impulseVel = 0.0;
    let mat = this.matrix;

    if (this.speed < 0){
        if(movingForward){
            this.speed = 0;
            controls &= ~playerControls.down;
        }else if(this.speed<-0.25)
            this.speed = -0.25;
    }else if (this.speed > 1.0)
        this.speed = 1.0;
    if(!moving)
        this.speed *= .95
    //  Handle tank movement
    let msin = Math.sin(this.angle);
    let mcos = Math.cos(this.angle);

    let groundSpeed = this.speed * boloworld.worldMeter * 0.25;

    let ppos = mat4.getRowV3(this.matrix, 3, v3t6);

    let curCell = this.cell;

    if (curCell.length > 1) {
        if (curCell[1].name == "base") {
            let base = curCell[1];
            if (base.team == this.team) {
                //At friendly base
                //Heal at base
                healCounter += healRate / 60.0;
                let healAmt = parseInt(healCounter);
                healCounter -= healAmt;
                if (this.invShells < 40 && base.shells > 0) {
                    if (healAmt > base.shells)
                        healAmt = base.shells;
                    this.invShells += healAmt;
                    base.shells -= healAmt;
                    if (this.invShells > 40)
                        this.invShells = 40;
                } else if (this.invMines < 40 && base.mines > 0) {
                    if (healAmt > base.mines)
                        healAmt = base.mines;
                    this.invMines += healAmt;
                    base.mines -= healAmt;
                    if (this.invMines > 40)
                        this.invMines = 40;
                } else if (this.hp < 255 && base.armor > 0) {
                    healAmt = healAmt * 4;
                    //4x heal
                    if (healAmt > base.armor)
                        healAmt = base.armor;
                    this.hp += healAmt;
                    base.armor -= healAmt;
                    if (this.hp > 255)
                        this.hp = 255;
                } else
                    healCounter = 0.0;
            }
        } else if (curCell[1].name == "mine") {
            //Trigger mines
            let mine = curCell[1];
            iterateNeighbors(mine, boloworld.tileDim * 0.5, triggerAdjacentMines);
        }
    }
    let boatSpeed = 0.75;
    if (!this.boat) {
        if (curCell[0].name == "River" || curCell[0].name == "Ocean") {
            for (let t = 1; t < curCell.length; t++) {
                if (curCell[t].name == "boat") {
                    this.boat = curCell[t];
                }
            }
        }
        if (!this.boat) {
            groundSpeed *= tileSpeeds[curCell[0].name];
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
        if (!this.lastCell)
            this.lastCell = curCell;

        if (this.lastCell != curCell) {
            //Moved into a new cel..
            this.lastCell = curCell;
            if (curCell.length > 2) {
                for (let t = 1; t < curCell.length; ) {
                    if (curCell[t].name == "deadTurret") {
                        let dtur = curCell[t];
                        dtur.active = false;
                        boloworld.removeTileObject(dtur);
                        this.invTurrets.push(dtur.pillboxNumber);
                        playSound(this, "farming_tree_near");
                    } else if (curCell[t].name == "base") {
                        //Entered base cell .. on base...
                        let base = curCell[t];

                        if (base.team != this.team) {
                            //Unclaimed base, create a new instance
                            if (network.connected()) {
                                if (network.g_isHost == true) {
                                    network.emit("sim", "baseTaken~" + base.cellCoord[0] + "~" + base.cellCoord[1] + "~" + this.team);
                                    takeBase(base, this.team);
                                }
                            } else
                                takeBase(base, this.team);
                        }
                        t++;
                    } else
                        t++;
                }
            }
        }
    }

    let dx = (-msin * groundSpeed);
    let dy = (mcos * groundSpeed);

    if (this.recoil) {
        dx += this.recoil[0];
        dy += this.recoil[1];
        vec3.scale(this.recoil, 0.9);
    }
    moveObject(this, dx, dy, 0.0, tankRad, playerTilePassable);

    let pmat = this.matrix;
    mat4.getRowV3(pmat, 3, this.camTarget);
    mat4.identity(pmat);
    mat4.translate(pmat, this.camTarget);
    mat4.rotateZ(pmat, this.angle)

    vec3.scale(this.camTarget, -1.0);
    //Flip the coordinate so its in camera space..
    this.camTarget[2] -= 2.0;

    if (!this.boat && (this.cell[0].name == "Ocean" || this.cell[0].name == "River")) {
        //Take water damage to shells and ammo
        damageCounter += damageRate / 60.0;
        let damageAmt = parseInt(damageCounter);
        damageCounter -= damageAmt;
        this.invShells -= damageAmt;
        this.invMines -= damageAmt;
        if (this.invShells < 0)
            this.invShells = 0;
        if (this.invMines < 0)
            this.invMines = 0;
        if (damageAmt > 0) {//playSound(this,"bubbles");
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
        let ang = angleToTarget(this, this.pilot);
        mat4.rotateZ(this.pilotIndicator.matrix, ang);
    }
}

function playSound(obj, name, volume) {
    mat4.getRowV3(obj.matrix, 3, v3t0);
    messaging.send("playPositionalSound2d", {
        name: name,
        position: v3t0,
        volume: volume
    });
}

function playUISound(snd) {
    messaging.send("playSound", snd);
}

messaging.listen("toolSelected", function(msg, tool) {
    currentTool = tool;
    playUISound("man_lay_mine_near");
});

function initSim() {
    let cd = {
        display: undefined
    };
    messaging.send("getClientDisplay", cd);
    display = cd.display;

    //DEFAULT MAP
    //Central Map
    //World

    startGame(bolomap.getMapIndex("Central Map"), 1, 1);
}

messaging.listen("initSim", initSim);

function startGame(map, aiCount0, aiCount1) {

    //invokeGod("host~" + network.g_networkId);
    invokeHost(network.g_networkId);

    invokeGod("changeMap~" + map);
    invokeGod("startGame");

    //return;

    if (aiCount0)
        for (let t = 0; t < aiCount0; t++)
            invokeGod("addAI~ai0~" + 0);
    if (aiCount1)
        for (let t = 0; t < aiCount1; t++)
            invokeGod("addAI~ai0~" + 1)
}

function sfrnd(rng) {
    return ((Math.random() * rng) - (rng * 0.5));
}

messaging.listen("setTickets", function(msg, val) {
    startingTickets = val;
    teamTickets = {
        0: startingTickets,
        1: startingTickets
    };
    if (network.connected() && network.g_isHost) {
        network.emit("sim", "setTickets~" + startingTickets);
    }
});

messaging.listen("loadDefaultMap", function() {
    startGame("Spay Anything", 1, 2);
});

messaging.listen("loadStressTest", function() {
    startGame(bolomap.getMapIndex("Empty Carcass"), 61, 62);
});
messaging.listen("addAI", function() {
    invokeGod("addAI" + "~" + "ai0~1");
});

messaging.listen("loadRandomMap", function() {
    let map = bolomap.getRandomMapIndex();
    invokeGod("changeMap" + "~" + map);
});

messaging.listen("changeMap", function(msg, map) {
    invokeGod("changeMap" + "~" + map);
});

messaging.listen("startGame", function() {
    if (alphaKeyPressed('0')) {
        invokeGod("startGame");
    }
});

messaging.listen("togglePause", function() {
    if (gamePaused == false) {
        gamePaused = true;
        messaging.send("game_pause", 0);
        display.camera.zoomToPause();
    } else {
        gamePaused = false;
        messaging.send("game_unpause", 0);
        display.camera.zoomToGame();
    }
});

messaging.listen("testHUD", function() {
    messaging.send("team_won", 0);
});
messaging.listen("nextCamera", function() {
    messaging.send("game_camera", 0);
});
let keyEventMap = {
    /*
             '6':function(){messaging.send("loadDefault");},
             '7':function(){messaging.send("loadStressTest");},
             '8':function(){messaging.send("addAI");},
             '9':function(){messaging.send("loadRandomMap");},
             '0':function(){messaging.send("startGame");},
             'C':function(){messaging.send("nextCamera");},
             'Y':function(){messaging.send("testHUD");}
             */
    'P': function() {
        messaging.send("togglePause");
    },
};
function updateSim() {
    for (let k in keyEventMap) {
        if (alphaKeyPressed(k))
            keyEventMap[k]();
    }

    if (alphaKeyPressed('Y')) {
        messaging.send("team_won", 0);
    }

    updatePlayers();

    updateAIs();
}

function headlessUpdateWorld(timing) {
    boloworld.update(undefined, undefined, timing, updateSim);
}

function randElem(arr) {
    return arr[parseInt(Math.random() * arr.length * 0.999)];
}

function randElemIndex(arr) {
    return parseInt(Math.random() * arr.length * 0.999);
}

function cellIsPillboxTarget(obj, cell) {
    for (let t = 1; t < cell.length; t++) {
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
    let p = this;
    if (!p.birth) {
        p.birth = boloworld.simTime();
        p.counter = 0;
    }
    if ((p.counter++ % 32) == (p.id % 32)) {
        let targCt = boloworld.getCellsInRadius(p, p.matrix[12], p.matrix[13], 7 * boloworld.tileDim, cellIsPillboxTarget);
        if (targCt > 0) {
            let cres = boloworld.getCollisionResult();
            for (let t = 0; t < targCt; t++) {
                let cr = cres[t];
                //console.log("cres:"+cr[2][1].name+" t:"+cr[0][0]+","+cr[0][1]+".");
                if (cellContains(cr[2], "tank")) {
                    let angle = angleToTarget(p, cr[2][1]);
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
    if (!currentMap)
        return;
    for (let i = 0, il = currentMap.bases.length; i < il; i++) {
        let tbase = currentMap.bases[i];
        let base = boloworld.addTileObject("base", tbase.x, tbase.y);

        messaging.send("activateBaseHUD", i);
        base.baseNumber = i;
        base.armor = tbase.armor;
        base.shells = tbase.shells;
        base.mines = tbase.mines;
        base.team = NEUTRAL_TEAM_ID;
        tbase.body = base;
    }

    for (let i = currentMap.bases.length; i < 21; i++) {
        messaging.send("deactivateBaseHUD", i);
    }

    for (let i in currentMap.pillboxes) {
        let pill = currentMap.pillboxes[i];
        let pObj = boloworld.addTileObject("turret", pill.x, pill.y);

        messaging.send("activatePillHUD", i);
        pObj.pillboxNumber = i;
        pObj.team = NEUTRAL_TEAM_ID;
        pObj.update = updatePillbox;
    }

    for (let i = currentMap.pillboxes.length; i < 21; i++) {
        messaging.send("deactivatePillHUD", i);
    }

    for (let i in currentMap.starts) {
        let start = currentMap.starts[i];
        //addTileObject("boat",start.x,start.y);
    }
}

function spawnPlayer(p) {
    let spawnpt = randElem(currentMap.starts);
    //B A
    p.avatar = boloworld.addTileObject(p.team ? "tankC" : "tankC", spawnpt.x, spawnpt.y);
    p.avatar.meshRenderer.shader = boloworld.getShader("Unit");
    p.avatar.name = "tank";
    p.avatar.currentTool = "harvest";
    p.avatar.boat = boloworld.addTileObject("boat", spawnpt.x, spawnpt.y);
    p.avatar.boat.hp = 1;
    p.avatar.boat.owner = p;

    //Only retain 2 boats per player
    if (!p.boats) {
        //Keep a list of player boats
        p.boats = [p.avatar.boat];
    } else {
        if (p.boats.length > 1) {
            p.boats[0].active = false;
            p.boats.splice(0, 1);
            //Ditch earliest boat...
        }
        p.boats.push(p.avatar.boat);
        //Add new boat to list
    }

    p.avatar.boat.destroy = function() {
        if (this.owner.avatar)
            this.owner.avatar.boat = null;
        this.owner.boats.splice(this.owner.boats.indexOf(this), 1);
        //Remove the boat from the players boat list...
    }
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
        p.avatar.addComponent("brain", new brain.Brain(bsim,p,p.aiModule));
    }

    setupUnitShader(p.avatar);
}

function addAI() {
    let newPlayer = {
        name: "tron",
        avatar: null,
        respawnCountdown: 1,
        controlBits: 0,
        team: 0
    };
    let p = newPlayer;
    aiList.push(p);
    return newPlayer;
}

function addPlayer() {
    let newPlayer = {
        name: "tron",
        avatar: null,
        respawnCountdown: 1,
        controlBits: 0,
        team: 0
    };
    let p = newPlayer;
    playerList.push(p);
    return newPlayer;
}

function releaseGameObjects(olist) {
    for (let p in olist) {
        if (olist[p].avatar) {
            let pav = olist[p].avatar;
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
    let plist = network.g_playerList;
    for (let p in plist) {
        let np = addPlayer();
        playersByNetworkId[p] = np;
        np.networkId = p;
        if (p == network.g_networkId)
            localPlayer = np;
    }
    if (network.connected() == false) {
        //no network, so Create a local player for singleplayer game...
        let np = addPlayer();
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
    for (let p in plist) {
        let np = plist[p];
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
                        if (typeof (display.camera) == 'object')
                            display.camera.setCenter(np.avatar.camTarget);
                        boloworld.localPlayerSpawned();
                    }
                }
            }
        }
    }
}

let bsim = {
    initSim: initSim,
    updateSim: updateSim,
    headlessUpdateWorld: headlessUpdateWorld,
    playerControls: playerControls,
    randElem: randElem,
    nodeImpassible: boloworld,
    angleBetweenPoints: angleBetweenPoints,
    teamTickets: teamTickets,
    network: network
}
export default bsim;
