
import messaging from "./util/messaging.js"
let isNode = (typeof window === 'undefined');

/*********** NETWORKING *********/
function networkObject(){
    let self;
    return self={
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
        self.iosocket.emit('joinaccept',playerId);
    }
    else if(item==1)//request game
    {
        self.iosocket.emit('joinrequest',playerId);
    }
},

rebuildPlayerListUI:function ()
{
    if(typeof(document)!='object')return;   //No document on Node
    let elem=document.getElementById("playerListElems");
    if(!elem)return;
    let str="<list>";
    for(let key in this.g_playerList){
        let p=this.g_playerList[key];
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
        self.iosocket.emit('nick',event.target.value);
        localStorage.nick=event.target.value;
    }
},

outgoingChatKeyPress:function (event){
    if(event.which == 13) {
        event.preventDefault();
        //doPreventDefault(event);

        self.iosocket.emit('chat',self.outgoingChatElem.value);

        let ourPlayer=self.g_playerList[self.g_networkId];
                
        if(ourPlayer){
            ourPlayer.chat=self.outgoingChatElem.value;
            self.incomingChatElem.innerHTML+='<li>'+ourPlayer.nick+":"+self.outgoingChatElem.value+'</li>';
        }else{
            self.incomingChatElem.innerHTML+='<li>Not connected:'+self.outgoingChatElem.value+'</li>';
        }
        self.outgoingChatElem.value='';
        self.outgoingChatElem.blur();
        
        if(self.g_remoteVideoEnabled==true){
            setTimeout(new function(){
                renderPlayerImage(ourPlayer,getPlayerImageBuffer(ourPlayer.id));
                updateDynamicTexture();
                },1000);
        }
    }
    return self;
},


networkAttachClientListeners:function (){
    let self=this;
    if(typeof(document)=='object'){
        this.incomingChatElem=document.getElementById('incomingChatMessages');
        this.outgoingChatElem=document.getElementById('outgoingChatMessage');
        this.outgoingNickField=document.getElementById('outgoingNickField');
        if(this.incomingChatElem)
            this.incomingChatElem.innerHTML+='<li>Connected</li>';
    }
    this.iosocket.on('addroom')
    this.iosocket.on('disconnect', function() {
        if(this.incomingChatElem)
            this.incomingChatElem.innerHTML+='<li>Disconnected</li>';}
    );
    this.iosocket.on('welcome', function(data) {
        console.log("got welcome");
        self.g_networkId = data;


        messaging.send("networkConnectedToServer");

        //Send our default nick
        if(typeof(localstorage)=='object'){ //No localstorage on Node
            if(localStorage.nick){
                self.iosocket.emit('nick',localStorage.nick);
            }
        }
        if(self.g_targetFixture!=null)
            self.iosocket.emit('control',self.g_targetFixture.id);    //Attempt to take control of our targeted fixture
    });
    this.iosocket.on('chat', function(msg) {
        let player=self.g_playerList[msg.id];
        if(player){
            player.chat=msg.message;
            if(self.incomingChatElem)self.incomingChatElem.innerHTML+='<li>'+player.nick+":"+player.chat+'</li>';
        }
    });
    this.iosocket.on('player', function(playerData) {
        let player=self.g_playerList[playerData.id]=playerData;
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
checkConnectionSucceeded:function(){
    if(self.g_networkId==null){
        if(self.iosocket)   //We did get a socket, but the server didn't resppond in time... so discoonect...
        {
            //io.disconnect(self.iosocket);
            //io.close(self.iosocket);
            self.iosocket.disconnect();
            self.iosocket=null;
            console.log("Dangling socket on failed connect...");
        }
        messaging.send("networkConnectionFailed");
    }
},
connectToGameServer:function ()
{
    if(this.iosocket)return undefined; //Already connected...
    if(isNode){
        //Node
        this.iosocket = io.connect("127.0.0.1:3000");//:3001");
    }else
        this.iosocket = io.connect("/");//:3001");
    setTimeout(this.checkConnectionSucceeded,60000);  //Check for connection failure after 2 seconds...
    return this.iosocket;
},

sendFixtureToServer:function (fix){
    let msg='sync~'+fix.id;
    for(let bid in fix.bodies){
        let bod=fix.bodies[bid];
        msg+='~'+bod.position[0]+'~'+bod.position[1]+'~'+bod.position[2]+
             '~'+bod.linearVelocity[0]+'~'+bod.linearVelocity[1]+'~'+bod.linearVelocity[2];
    }
    this.iosocket.emit('sim',msg);
},
sendControlsToServer:function (fix){
    let msg='ctrl~'+fix.id;
    let controls=fix.controls;
    for(let i in controls.inputs)
        msg+='~'+controls.inputs[i];
    for(let ca in controls.active)
        for(let a in controls.active[ca])
            msg+='~'+controls.active[ca][a];
    msg+='~'+controls.flipOver;
    this.iosocket.emit('sim',msg);
},
parseBool:function (str) {
  return /^y|yes|ok|true$/i.test(str);
},
recvSimFromServer:function (msg){
    let cmd=msg.data.split('~');
    if(this.onSim){this.onSim(cmd);return;}
    if(!this.g_fixtures)return;
    let idx=0;
    while(idx<cmd.length){
        let remaining=cmd.length-idx;
        let c=cmd[idx];
        if(c=='sync'){
            let objID=cmd[++idx];
            idx++;
            let fix=this.g_fixtures.byId[objID];
            if(remaining<(fix.bodies.length*6)+2){//cmd + objID + 16 flt
                this.badPacketCount++;
                break;
            }
            try{
                for(let bid in fix.bodies){
                    let bod=fix.bodies[bid];
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
            let controls=fix.controls;
            for(let i in controls.inputs){
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
    
    this.iosocket=this.connectToGameServer();
    let self=this;
    this.iosocket.on('connect', function () {
        self.networkAttachClientListeners();
        self.iosocket.on('sim', function(data) {
            self.recvSimFromServer(data);
        });
        if(self.videoStreamHandler)self.iosocket.on('video', self.videoStreamHandler);
        self.iosocket.on('playerState', function(state) {
            let plr=self.g_playerList[state.id];
            for(let k in state)plr[k]=state[k];
        });
        self.iosocket.on('chat', function(msg) {
            if(this.g_remoteVideoEnabled){
                let player=self.g_playerList[msg.id];
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
    emit:function(msg,data){this.iosocket.emit(msg,data);},
    connectToServer: function(){
        this.initNetwork();
 /*       if(!isNode){
        }else{
            this.iosocket={
                on:function(msg,fn){
                    console.log("network attempt to listen:"+msg);
                }
            }
        }
 */
    }
}
}

//function
let network;
if(typeof network !== "object"){
    network=networkObject();
}
if(typeof window == "object"){
    if(!window.network){
        window.network=network;
    }
}


//return
  export default  network;

/*{
};*/

//});
