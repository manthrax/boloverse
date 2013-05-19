
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
        if(!hands)return;
        console.log("sending:"+msg);
        for(var h =0;h< hands.length;h++)hands[h](msg,param);
    }

    return {
        listen:listen,
        send:send
    }
});
