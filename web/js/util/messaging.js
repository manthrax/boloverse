
if (typeof define !== 'function') {
    console.log("Loading messaging as node module!");
}else{
    console.log("Loading messaging as client module!");
}

if (typeof define !== 'function') {
    var define = require('amdefine')(module);
}

define( function() {
    var handlers={};
    function removeListener(msg,handler){

    }
    function listen(msg,handler){
        if(!handlers[msg])handlers[msg]=[handler];
        else handlers[msg].push(handler);
    }

    function send(msg,param){
        var hands=handlers[msg];
        if(!hands){
            console.log("unhandled:"+msg);
            return;
        }
        //console.log("sending:"+msg);
        for(var h =0;h< hands.length;h++)hands[h](msg,param);
    }

    return {
        listen:listen,
        send:send
    }
});
