define(function(){
/*********** NETWORKING *********/
function networkObject(){
    return {
        g_playerList:{},
        g_localPlayer:undefined,
        g_networkId:null,
        iosocket:null,
        networkEventCb:null,
        videoStreamHandler:null,
        g_targetFixture:null,
        g_remoteVideoEnabled:false,
        incomingChatElem:undefined,
        outgoingChatElem:undefined,
        outgoingNickField:undefined,
        badPacketCount:0,
        onSim:null,
 doPlayerAction:function(playerId,item){
    if(item==2)//Accept request
    {
        iosocket.emit('joinaccept',playerId);        
    }
    else if(item==1)//request game
    {
        iosocket.emit('joinrequest',playerId);
    }
},

rebuildPlayerListUI:function ()
{
    var elem=document.getElementById("playerListElems");
    if(!elem)return;
    var str="<list>";
    for(var key in this.g_playerList){
        var p=this.g_playerList[key];
        str+="<li>"+
            ((p==this.g_localPlayer) ? "<input class='uiComponent' value='"+p.nick+"' onkeypress='outgoingNickKeyPress(event)'></input>":p.nick)+
            "<button class='uiComponent' onclick='doPlayerAction(\""+key+"\",1);'>request</button><button class='uiComponent' onclick='doPlayerAction(\""+key+"\",2);'>accept</button></br>";
            //+"</li><select class='uiComponent' onchange='if(this.selectedIndex)doPlayerAction(\""+key+"\",this.selectedIndex);'><option disabled>Actions<option>Request Game</option><option>Accept Request</option></select>\n";
    }
    str+="</list>";
    elem.innerHTML=str;
},

outgoingNickKeyPress:function (event){
    if(event.which == 13) {
        event.preventDefault();
        iosocket.emit('nick',event.target.value);
        localStorage.nick=event.target.value;
    }
},

outgoingChatKeyPress:function (event){
    if(event.which == 13) {
        event.preventDefault();
        //doPreventDefault(event);

        iosocket.emit('chat',outgoingChatElem.value);

        var ourPlayer=g_playerList[g_networkId];
                
        if(ourPlayer){
            ourPlayer.chat=outgoingChatElem.value;
            incomingChatElem.innerHTML+='<li>'+ourPlayer.nick+":"+outgoingChatElem.value+'</li>';
        }else{
            incomingChatElem.innerHTML+='<li>Not connected:'+outgoingChatElem.value+'</li>';                
        }
        outgoingChatElem.value='';
        outgoingChatElem.blur();
        
        if(g_remoteVideoEnabled==true){
            setTimeout(new function(){
                renderPlayerImage(ourPlayer,getPlayerImageBuffer(ourPlayer.id));
                updateDynamicTexture();
                },1000);
        }
    }
},


networkAttachClientListeners:function (){
    var self=this;
    this.incomingChatElem=document.getElementById('incomingChatMessages');
    this.outgoingChatElem=document.getElementById('outgoingChatMessage');
    this.outgoingNickField=document.getElementById('outgoingNickField');
    if(this.incomingChatElem)
        this.incomingChatElem.innerHTML+='<li>Connected</li>';
    this.iosocket.on('addroom')
    this.iosocket.on('disconnect', function() {
        if(this.incomingChatElem)
            this.incomingChatElem.innerHTML+='<li>Disconnected</li>';}
    );
    this.iosocket.on('welcome', function(data) {
        console.log("got welcome");
        self.g_networkId = data;
        
        //Send our default nick
        if(localStorage.nick){
            self.iosocket.emit('nick',localStorage.nick);
        }
        if(self.g_targetFixture!=null)
            self.iosocket.emit('control',self.g_targetFixture.id);    //Attempt to take control of our targeted fixture
    });
    this.iosocket.on('chat', function(msg) {
        var player=self.g_playerList[msg.id];
        if(player){
            player.chat=msg.message;
            if(self.incomingChatElem)self.incomingChatElem.innerHTML+='<li>'+player.nick+":"+player.chat+'</li>';
        }
    });
    this.iosocket.on('player', function(playerData) {
        var player=self.g_playerList[playerData.id]=playerData;
        self.g_localPlayer=self.g_playerList[self.g_networkId];
        self.rebuildPlayerListUI();
    });
    this.iosocket.on('players', function(players) {
        self.g_playerList = players;
        self.g_localPlayer=self.g_playerList[self.g_networkId];
        self.rebuildPlayerListUI();
    });
    
    if(this.outgoingNickField)this.outgoingNickField.onkeypress=this.outgoingNickKeyPress;    
    if(this.outgoingChatElem)this.outgoingChatElem.onkeypress=this.outgoingChatKeyPress;
},

connectToChatServer:function ()
{
    if(this.iosocket)return undefined; //Already connected...
    this.iosocket = io.connect("/");//:3001");
    return this.iosocket;
},
sendFixtureToServer:function (fix){
    var msg='sync~'+fix.id;
    for(var bid in fix.bodies){
        var bod=fix.bodies[bid];
        msg+='~'+bod.position[0]+'~'+bod.position[1]+'~'+bod.position[2]+
             '~'+bod.linearVelocity[0]+'~'+bod.linearVelocity[1]+'~'+bod.linearVelocity[2];
    }
    this.iosocket.emit('sim',msg);
},
sendControlsToServer:function (fix){
    var msg='ctrl~'+fix.id;
    var controls=fix.controls;
    for(var i in controls.inputs)
        msg+='~'+controls.inputs[i];
    for(var ca in controls.active)
        for(var a in controls.active[ca])
            msg+='~'+controls.active[ca][a];
    msg+='~'+controls.flipOver;
    this.iosocket.emit('sim',msg);
},
parseBool:function (str) {
  return /^y|yes|ok|true$/i.test(str);
},
recvSimFromServer:function (msg){
    var cmd=msg.data.split('~');
    if(this.onSim){this.onSim(cmd);return;}
    if(!this.g_fixtures)return;
    var idx=0;
    while(idx<cmd.length){
        var remaining=cmd.length-idx;
        var c=cmd[idx];
        if(c=='sync'){
            var objID=cmd[++idx];
            idx++;
            var fix=this.g_fixtures.byId[objID];
            if(remaining<(fix.bodies.length*6)+2){//cmd + objID + 16 flt
                this.badPacketCount++;
                break;
            }
            try{
                for(var bid in fix.bodies){
                    var bod=fix.bodies[bid];
                    v3set(bod.position,parseFloat(cmd[idx++]),parseFloat(cmd[idx++]),parseFloat(cmd[idx++]));
                    v3set(bod.linearVelocity,parseFloat(cmd[idx++]),parseFloat(cmd[idx++]),parseFloat(cmd[idx++]));
                }
            }catch(e){
                this.badPacketCount++;
                break;
            }
        }else if(c=='ctrl'){
            objID=cmd[++idx];
            idx++;
            fix=this.g_fixtures.byId[objID];
            if(remaining<15){//cmd + objID + 16 flt
                this.badPacketCount++;
                break;
            }
            var controls=fix.controls;
            for(var i in controls.inputs){
                controls.inputs[i]=parseFloat(cmd[idx++]);
            }
            
            for(ci in controls.active){
                for(i in controls.active[ci]){
                    controls.active[ci][i]=parseBool(cmd[idx++]);
                }
            }
            controls.flipOver=parseBool(cmd[idx++]);
        }
        if(idx==cmd.length)
            break;
    }
}
,initNetwork:function (){
    
    this.iosocket=this.connectToChatServer();
    var self=this;
    this.iosocket.on('connect', function () {
        self.networkAttachClientListeners();
        self.iosocket.on('sim', function(data) {
            self.recvSimFromServer(data);
        });
        if(self.videoStreamHandler)self.iosocket.on('video', self.videoStreamHandler);
        self.iosocket.on('playerState', function(state) {
            var plr=self.g_playerList[state.id];
            for(var k in state)plr[k]=state[k];
        });
        self.iosocket.on('chat', function(msg) {
            if(this.g_remoteVideoEnabled){
                var player=self.g_playerList[msg.id];
                if(player){
                    renderPlayerImage(player,getPlayerImageBuffer(player.id));
                    updateDynamicTexture();
                }
            }
        });
    });
},

    connected:function(){return this.g_networkId===null?false:true},
    on:function(msg,fn){this.iosocket.on(msg,fn);},
    emit:function(msg,data){this.iosocket.emit(msg,data);}
}
}

//function 
if(!window.network){
    window.network=networkObject();

    window.network.initNetwork();
}
return window.network;
/*{
};*/

})
