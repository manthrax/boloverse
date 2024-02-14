let handlers = {};
function removeListener(msg, handler) {}
function listen(msg, handler) {
    if (!handlers[msg]) handlers[msg] = [handler];
    else handlers[msg].push(handler);
}

function send(msg, param) {
    let hands = handlers[msg];
    if (!hands) {
        console.log("unhandled:" + msg);
        return;
    }
    //console.log("sending:"+msg);
    for (let h = 0; h < hands.length; h++) hands[h](msg, param);
}

export default {
    listen: listen,
    send: send,
};
