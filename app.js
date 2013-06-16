var express = require('express'),
    sio = require('socket.io'),
    os=require('os'),
    moment=require('moment'),
    util=require('util'),
    colors=require('colors'),
    http = require('http');

var define = require('amdefine')(module);

//global.io=sio;

function createBoloServer(){
    var server={};
    // Simulator gorp start
    var BOOT_SIMULATOR=true;
    if(!BOOT_SIMULATOR)return;
    var fs = require('fs');
    eval(fs.readFileSync('./web/js/util/gl-matrix.js')+'');
    // Connect to server
    var cio = global.io = require('socket.io-client');

    var  bolosim = require('./web/js/bolosim');
    var timing={time:0};
    var messaging = require('./web/js/util/messaging');

    server.simulator=bolosim;
    server.timing=timing;
    server.messaging=messaging;

    //Stub out the messages that the headless client will ignore...
    messaging.listen("playPositionalSound2d",function(){});
    messaging.listen("updatePlayerHUD",function(){});
    messaging.listen("baseTaken",function(){});
    messaging.listen("activateBaseHUD",function(){});
    messaging.listen("deactivateBaseHUD",function(){});
    messaging.listen("activatePillHUD",function(){});
    messaging.listen("deactivatePillHUD",function(){});

    messaging.listen("getClientDisplay",function(msg,param){
        console.log("GetClientDisplay called...");
        param.display={
            alphaKeyPressed:function(kc){return false;},
            alphaKeyDown:function(kc){return false;},
            keyCodeDown:function(kc){return false;}
        };
    });

    messaging.listen("networkConnectedToServer",function(){
        bolosim.initSim();
        var tickInterval=parseInt(1000/60);
        function gameLoop(){
            setTimeout(gameLoop,tickInterval);
            global.messaging=server.messaging;
            bolosim.headlessUpdateWorld(timing);
            timing.time+=tickInterval;
        }
        setTimeout(gameLoop,tickInterval);
    });
    bolosim.network.connectToServer();  //Fire this bitch up
    return server;
}
// Simulator gorp end


var app = express();
var httpServer = http.createServer(app);

app.use(express.static(__dirname+"/web"));
app.use(express.compress());

var port = 3000;

util.puts(' x x x '.green);
util.puts(' welcome to '.blue + 'BOLO '.red + 'v0.1.9.666.x'.yellow);
util.puts(' server time: '.blue + moment().format('Y-m-d h:i:s').green);
util.puts(' x x x '.green);
util.puts('    happy hunting');


var g_logLevel = 2;
var g_logColors=[''.blue,''.red,''.yellow];
var log = function(msg,level){
    if(!level)level=0;
    if(level<=g_logLevel)
    {
        util.puts( g_logColors[level] + 'app:'+''.yellow + msg);
    }
    //console.log(msg);
};

httpServer.listen(port);

var hio = sio.listen(httpServer);

hio.set('log level',0);

var clients={};
var players={};
var rooms={};

var joinRequests={};
var playerSockets={};

var occupiedFixtures={};
var fixtures=[];

// info @ recovery.us --- Modem #:001e69b4679a --- Comcast: 8155200014720926

var modifiedCells={}

var mapIndex=0;

//hio.sockets.on('message', function (msg) {
	//console.log('Message Received: ', msg);
//    socket.broadcast.emit('message', msg);
//});



function sanitize(val){
    return val.replace(/[^a-z 0-9]+/gi,'');
}

function addRoom(name){
    return rooms[sanitize(name)]={
        spectators: {},
        players:    {}
    }
}

function addPlayer(socket){
    playerSockets[socket.id]=socket;
    return {    //Add the player to the world
        id:socket.id,
        nick:"anonymous",
        spectating:true,
        chat:""
    }
}


function addClient(sockId){
    return clients[sockId]={
    }
}

console.log("started!");
var g_gameHost=null;

hio.sockets.on('connection', function (socket) {

    var address = socket.handshake.address;
    log("New connection from " + address.address + ":" + address.port + " sid:"+socket.id);

    var client=addClient(socket.id);

    log("clients:"+JSON.stringify(clients));

  //  socket.on('join', function (data) {
    var player=addPlayer(socket);
    
    players[socket.id]=player;
    var i=0;
    for( var k in players)  //Renumber the players
        players[k].index=i++;
    log("players:"+JSON.stringify(players));

    socket.emit('welcome',socket.id); //Send the joining players id
    
    hio.sockets.emit("players",players); //Broadcast the new player list

    socket.on('nick', function (nnick) {    //Change user nickname
        players[socket.id].nick = sanitize(nnick);
        hio.sockets.emit('player',players[socket.id]); //Broadcast the changed player nick..
        log("nick:"+nnick);
    });

    socket.on('host', function(){

        if(!g_gameHost){
            g_gameHost=socket.id;
            log("host:"+g_gameHost);
        }else{
            log("attempt to become HOST:"+socket.id);
        }
        socket.emit('host',g_gameHost);
    });
    
    socket.on('ai', function (cmd) {    //Broadcast ai path change
        socket.broadcast.emit('ai',cmd);
        log("ai:"+cmd,2);
    });
    
    socket.on('video', function (data) {
	    //console.log('Got data:'+socket.id);
        socket.broadcast.emit('video', {data:data,id:socket.id});    //Forward video packets...
    });
    
    socket.on('sim', function (msg) {//This is the primary state message that gets sent for realtime sync
        //console.log('Message Received: ', msg);
        var plr=players[socket.id];
        if(plr.avatar){
            var pav=fixtures[plr.avatar];
            if(pav)
                pav.lastState=msg;
        }
        socket.broadcast.emit('sim', {data:msg,id:socket.id});   //Forward chat/game data
        log("sim:"+msg,3);
    });
    
    socket.on('chat', function (msg) {
        //console.log('Message Received: ', msg);
        socket.broadcast.emit('chat', {message:msg,id:socket.id});   //Forward chat/game data
    });
    
    var arrayContains = function(arr,val) {
        return (arr.indexOf(val)==-1)?false:true;
    };

    var arrayRemove = function(arr,args) {
        var what, a = args, L = a.length, ax;
        while (L && this.length) {
            what = a[--L];
            while ((ax = this.indexOf(what)) !== -1) {
                this.splice(ax, 1);
            }
        }
        return this;
    };
    
    socket.on('room', function (data) {
        var plr=players[socket.id];
        if(rooms[data.room]){
            socket.broadcast.to(data.room).emit(data.command,data);
        }else{
            console.log("Player:"+plr.nick+" sent to invalid room...");
        }
    });
    
    socket.on('god', function(data){
        log("Got god command from host:"+data,2);
        hio.sockets.emit('god',data);
    });
    
    socket.on('joinrequest', function(playerId){
        var plr=players[socket.id];
        var plr2=players[playerId];

        log("Got join request from "+plr.nick+" to "+plr2.nick+" "+playerId);
        if(joinRequests[playerId]){
            if(arrayContains(oinRequests[playerId],plr.id)==false)
                joinRequests[playerId].push(plr.id);
        }else{
            joinRequests[playerId]=[plr.id];
        }
    });
    
    socket.on('joinaccept', function(playerId){
        var plr=players[socket.id];
        var plr2=players[playerId];
        log("Got join accept from "+plr.nick+" to "+plr2.nick+" "+playerId);
        if(arrayContains(joinRequests[plr.id],playerId))
        {   //Set up game
            arrayRemove(joinRequests[plr.id],playerId);
            log("Setting up game between "+plr.nick+" and "+plr2.nick+"");
            var room=""+socket.id+playerId;
            addRoom(room);
            socket.join(room);//Join both players into the room that is the combination of thier names..
            
            var sock2=playerSockets[playerId];
            sock2.join(room);
            
            socket.broadcast.to(room).emit("join",room);
            
        }else{
            console.log("Player "+plr.nick+" attempted to accept unrequested game...");
        }
    });
    
    socket.on('control', function (fixtureId) {//This is called to request control of a different game object...
        var plr=players[socket.id];
        if(plr.avatar && plr.spectating==false){    //If we are controlling something already...
            delete occupiedFixtures[plr.avatar]; //Disengage from it..
        }
        plr.avatar=fixtureId;   //Set our new avatar target
        if(occupiedFixtures[fixtureId] && occupiedFixtures[fixtureId]!=socket.id)    //If it is currently controlled..
            plr.spectating=true;
        else{
            plr.spectating=false;
            occupiedFixtures[fixtureId]=socket.id;  //Take control of the fixture
            if(!fixtures[fixtureId])
                fixtures[fixtureId]={
                    
                };
        }
        var state={id:plr.id,spectating:plr.spectating,avatar:plr.avatar};
        hio.sockets.emit('playerState',{id:plr.id,spectating:plr.spectating,avatar:plr.avatar});   //Send the player state change to everyone.

        log("control plr:"+plr+" fix:"+fixtureId);
    });
    
    socket.on('disconnect', function (data) {//Called when client disconnects

        log("Client disconnect from " + address.address + ":" + address.port + " sid:"+socket.id);
        log("Disconnect data:" + data);
        var plyr=players[socket.id];
        if(plyr.avatar && occupiedFixtures[plyr.avatar]==socket.id){//plyr.spectating==false){    //If we are controlling something already...
            delete occupiedFixtures[plyr.avatar]; //Disengage from it..
        }

        delete clients[socket.id];
        delete players[socket.id];
        delete playerSockets[socket.id];
        var i=0;
        for( var k in players) players[k].index=i++;  //Reindex the players
        log("players:"+JSON.stringify(clients));
        log("occupiedFixtures:"+JSON.stringify(occupiedFixtures));

        hio.sockets.emit('players',players); //Broadcast the new player list
        
        if(socket.id == g_gameHost){        //Host has left the game...
            var pkeys=Object.keys(players);
            if(pkeys.length===0){
                g_gameHost=null;
            }else{
                g_gameHost=players[pkeys[0]].id;    //Pick a new host..
                hio.sockets.emit('host',g_gameHost); //Broadcast the new host
            }
        }
    });
});

var testGame=createBoloServer();