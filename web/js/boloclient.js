/**
 * thrax
 * 6/5/13
 * 8:06 AM
 *
 *
 */

import displayModule from "./display.js";

import messaging from "./util/messaging.js";
import bolomap from "./bolomap.js";
import bolosim from "./bolosim.js";
import boloworld from "./boloworld.js";
import meshes from "./meshes/testmesh.js";
import audio from "./util/audio.js";
import network from "./network.js";

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
    "tank_sinking_near",
    "bolospawn1.mp3",
    "bolotrack.mp3",
    "spawn_1.mp3",
    "win",
    "lostbase",
    "takebase",
    "blip",
    "intro",
];

messaging.listen("getClientDisplay", function (msg, param) {
    param.display = displayModule.getDisplay();
});

messaging.listen("mapLoading", function (msg, mapName) {
    document.getElementById("logoBox").innerHTML =
        "BOLO | UNIVERSE : " + mapName;
});

window.gameMessage = messaging.send;
window.getMapNames = bolomap.getMapNames;
window.loadMap = bolomap.loadMapByName;

var tileMeshNames = {
    Building: "building",
    River: "river",
    Swamp: "swamp",
    Crater: "grass",
    Road: "road",
    Forest: "forest",
    Rubble: "crater",
    Grass: "grass",
    ShotBuilding: "buildingd2",
    RiverWithBoat: "river",
    Ocean: "ocean",
};

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
};

function generateTileMesh(mat, mx, my, rand) {
    var cell = boloworld.getCell(mx, my);
    var tid = cell[0].name;
    var mesh = meshes[tileMeshNames[tid]];
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
            if (tdata[0] != "02") meshName = "building";
            if (cell[0].hp < 255) {
                meshName = "buildingd" + parseInt(3 - (cell[0].hp * 2) / 255);
            }
        } else if (tid == "River" && tdata[0] == "0123") meshName = "river";
        else if (tid == "Road" && tdata[0] == "0123") meshName = "road";
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
messaging.listen("baseTaken", function (msg, params) {
    var cb = document.getElementById("basebox_" + params.baseNumber);
    cb.style["background-color"] = params.team == 0 ? "red" : "blue";
    audio.play(params.team == 0 ? "takebase" : "lostbase");
});

messaging.listen("deactivateBaseHUD", function (msg, id) {
    var bbox = document.getElementById("basebox_" + id);
    bbox.style.display = "none";
});

messaging.listen("activateBaseHUD", function (msg, id) {
    var bbox = document.getElementById("basebox_" + id);
    bbox.style["background-color"] = "#bb9878";
});

messaging.listen("deactivatePillHUD", function (msg, id) {
    var bbox = document.getElementById("cbox_" + id);
    bbox.style.display = "none";
});

messaging.listen("activatePillHUD", function (msg, id) {
    var bbox = document.getElementById("cbox_" + id);
    bbox.style["background-color"] = "#14751c";
});

messaging.listen("turretDestroyed", function (msg, param) {
    var cb = document.getElementById("cbox_" + param.turret.pillboxNumber);
    cb.style["background-color"] = "gray";
    //cb.style["background-color"] = (param.player.team == 0) ? "red" : "blue";
});

messaging.listen("turretDeployed", function (msg, param) {
    var cb = document.getElementById("cbox_" + param.turret.pillboxNumber);
    cb.style["background-color"] = param.player.team == 0 ? "red" : "blue";
});

messaging.listen("initSim", function () {
    //var explosionMesh;
    //var explosionRenderer;
    //explosionMesh = display.mesh(gl, meshes.explosion)
    //explosionRenderer = boloworld.createSingleMeshRenderer("explosion");

    console.log("Client boot...");

    //Build the map load menu html
    var mapNames = getMapNames();
    var str = "";
    for (var t = 0; t < mapNames.length; t++)
        str +=
            "<option value='" + mapNames[t] + "'>" + mapNames[t] + "</option>";
    document.getElementById("maps").innerHTML = str;

    var loadRequests = {};
    for (var si in sounds) loadRequests[sounds[si]] = { file: sounds[si] };
    audio.loadSounds("js/sounds/", loadRequests);
    audio.startSoundsLoading();

    messaging.listen("playSound", function (msg, snd) {
        audio.play(snd);
    });

    messaging.listen("playPositionalSound2d", function (msg, params) {
        audio.playPositional2d(params.name, params.position, params.volume);
    });

    messaging.listen("allSoundsLoaded", function (msg, snd) {
        let firstClick = (e) => {
            document.removeEventListener("pointerdown", firstClick);

            audio.enabled = true;
            //audio.play("intro");
            audio.play("bolotrack.mp3");
            //messaging.send("playSound","bolotrack.mp3");
        };
        document.addEventListener("pointerdown", firstClick);
    });

    boloworld.setTileMeshGenerator(generateTileMesh);
});

var barShells = document.getElementById("statColor_shells");
var barMines = document.getElementById("statColor_mines");
var barArmor = document.getElementById("statColor_armor");
var barWood = document.getElementById("statColor_wood");
var ticketsDisplay = document.getElementById("ticketDisplay");

messaging.listen("updatePlayerHUD", function (msg, p) {
    var str = "TICKETS:";
    barShells.style.width = "" + parseInt((p.invShells * 100.0) / 40.0) + "px";
    barMines.style.width = "" + parseInt((p.invMines * 100.0) / 40.0) + "px";
    barArmor.style.width = "" + parseInt((p.hp * 100.0) / 255.0) + "px";
    barWood.style.width = "" + parseInt((p.invWood * 100.0) / 255.0) + "px";
    var liveTeams = 0;
    var tickets = bolosim.teamTickets;
    for (var i in tickets) {
        if (tickets[i] > 0) liveTeams++;
    }
    if (liveTeams > 0) {
        for (i in tickets) {
            str += " " + i + ":" + parseInt(tickets[i]);
        }
        ticketsDisplay.innerHTML = str;
    }
});

var cameraPos = [0, 0, 0];

function updateSim() {
    audio.harvestDeadSounds();
    mat4.getRowV3(displayModule.viewInverse, 3, cameraPos);
    audio.setListenerParams(cameraPos);
}
export default {
    updateSim: updateSim,
};
