/* Copyright 2011 - Michael A. Schlachter - please contact me if you want to use this code! */

import messaging from "./messaging.js";
let loggingEnabled = false;
let soundDisabled = true;
let audibleRadius = 200;
let g_globalSoundVolume = 0.01;

let audibleRadius2 = audibleRadius * audibleRadius;

let files = [],
    endEvents = [],
    loadedEvent = null,
    playing = {},
    soundLoadedCount = 0,
    soundLoadRequests = 0,
    soundEvents = null,
    soundsLoaded = false,
    freeChannels = {},
    playingCount = 0,
    cachedCount = 0,
    chanBaseId = 1,
    emitters = [],
    listenerPosition = [0, 0, 0],
    v3_min_len = 0.00001;

function calcPositionalVolume2d(pos) {
    let dx = pos[0] - listenerPosition[0];
    let dy = pos[1] - listenerPosition[1];
    dx *= dx;
    dy *= dy;
    let vd2 = dx + dy;
    if (vd2 > audibleRadius2) return 0.0;
    if (vd2 < v3_min_len) return 1.0;
    return 1.0 - Math.sqrt(vd2) / audibleRadius;
}

function playPositional2d(name, position, vol, caller, cleanup) {
    let tvol = calcPositionalVolume2d(position);
    if (tvol > 0.0) {
        return play(name, tvol * (vol ? vol : 1.0), caller, cleanup);
    }
    return 0;
}
let g_soundFalloff = [1, 0.5, 0.25, 0.1, 0.01, 0.0, 0.0];

function calcPositionalVolume3d(targ, radius) {
    let rsqr = radius;
    v3subv(v3t0, targ, listenerPosition);
    let dist = v3len(v3t0);
    if (dist > rsqr) return 0.0;
    let idx = (dist * (g_soundFalloff.length - 1) * 0.999) / rsqr;
    let rnd = parseInt(idx);
    let frac = idx - rnd;
    let vol =
        g_soundFalloff[rnd] * (1.0 - frac) + g_soundFalloff[rnd + 1] * frac;
    return vol;
}

function playPositional3d(name, position, vol, radius, caller, cleanup) {
    let tvol = calcPositionalVolume3d(position, radius);
    if (tvol > 0.0) {
        return audio.play(name, tvol * vol, caller, cleanup);
    }
    return 0;
}
// generate audio data of a sine wave
function setListenerParams(position) {
    for (let i = 0; i < 3; i++) listenerPosition[i] = position[i];
    for (let e = 0; e < emitters.length; e++) {
        emitters[e].update();
    }
    //this.playing
}
// convert integer to binary

function i2b(b, i) {
    //with (String)
    switch (b) {
        case 16:
            return String.fromCharCode(i & 255, (i >> 8) & 255);
        case 32:
            return String.fromCharCode(
                i & 255,
                (i >> 8) & 255,
                (i >> 16) & 255,
                (i >> 24) & 255
            );
    }
    return 0;
}

function sineWave(freq, len, rate, vol) {
    let I = len * rate;
    let p = 0;
    let s = (2 * Math.PI * freq) / rate;
    let w = "";
    let sin = Math.sin;
    let chr = String.fromCharCode;
    for (let i = 0; i < I; i++) {
        v = sin(p) * vol;
        p += s;
        w += chr(v & 255, (v >> 8) & 255);
    }
    return w;
}
function playTone(frequency, seconds, _volume, _func) {
    //document.getElementById('console').innerHTML = Math.round(frequency)+' Hz for '+seconds+' seconds\n'+document.getElementById('console').innerHTML;
    let samplerate = 2000;
    let volume = 32767 * (_volume ? _volume : 1.0);
    let player = document.createElement("audio");
    if (_func == undefined) _func = sineWave;
    let wave = _func(frequency, seconds, samplerate, volume);
    let format =
        "fmt " +
        i2b(32, 16) +
        i2b(16, 1) +
        i2b(16, 1) +
        i2b(32, samplerate) +
        i2b(32, 2 * samplerate) +
        i2b(16, 2) +
        i2b(16, 16);
    let content = "data" + i2b(32, 2 * wave.length) + wave;
    let header = "RIFF" + i2b(32, format.length + content.length + 20) + "WAVE";
    player.src =
        "data:audio/wav;base64," + escape(btoa(header + format + content));
    player.play();
    return player;
}

function waitSoundsLoaded() {
    if (soundLoadedCount != soundLoadRequests)
        setTimeout(waitSoundsLoaded, 1000);
    else {
        soundsLoaded = true;
        messaging.send("allSoundsLoaded");
    }
}
function loadedPercentage() {
    if (soundLoadRequests == soundLoadedCount) return 100.0;
    return (soundLoadedCount * 100.0) / soundLoadRequests;
}
function allSoundsLoaded() {
    return soundsLoaded;
}
function load(name, path, cb) {
    if (loggingEnabled == true) console.log("Loading sound:" + name);
    let f = (files[name] = document.createElement("audio"));
    f.setAttribute("preload", "true");
    f.setAttribute("autobuffer", "true");
    f.setAttribute("src", path);
    f.setAttribute("loop", "true");
    loadedEvent = function (event) {
        soundLoadedCB(event, name, cb);
    };
    let errorEvent = function (event) {
        f.setAttribute("src", "./assets/default.ogg");
        f.load();
        console.log("Couldn't load sound:" + name + " : " + path);
        //soundLoadedCount++;
    };
    f.addEventListener("canplaythrough", loadedEvent, true);
    f.addEventListener("error", errorEvent, true);
    //soundLoadedCount=soundLoadRequests;
    f.load();
    f.pause();
}
function addEmitter(gsound, eposition) {
    let em = {
        sound: gsound,
        active: false,
        playing: false,
        countdown: 0,
        channel: 0,
        position: eposition,
        radius: 0,
        stop: function () {
            if (this.playing) {
                //console.log("Stopping");
                this.playing = false;
                audio.stop(this.channel);
            }
            this.active = false;
            this.channel = 0;
        },
        soundDone: function () {
            this.playing = false;
            this.channel = 0;
            this.active = false;
        },
        update: function () {
            let tvol =
                calcPositionalVolume3d(this.position, this.radius) *
                this.volume;
            if (this.playing) {
                //Adjust playing sound volume
                if (tvol > 0.0) {
                    let snd = audio.getChannelSound(this.channel);
                    if (snd) {
                        snd.volume = tvol;
                    }
                } else {
                    this.stop();
                }
            } else if (this.active) {
                if (tvol > 0.0) {
                    //Start playing sound volume
                    this.channel = audio.play(
                        this.name,
                        tvol,
                        this,
                        this.soundDone,
                        this.loop
                    );
                    this.playing = true;
                }
            }
        },
        emit: function (name, vol, loop, radius) {
            this.radius = radius;
            this.volume = vol;
            this.name = name;
            this.loop = loop;

            let tvol = calcPositionalVolume3d(this.position, this.radius);
            if (tvol > 0.0) {
                this.channel = audio.play(
                    name,
                    tvol * vol,
                    this,
                    this.soundDone,
                    this.loop
                );
                this.playing = true;
            }
            this.active = true;
        },
    };
    emitters.push(em);
    return em;
}

function loadSoundsFN(arr) {
    if (arr.length === 0) {
        return;
    } else {
        let x = arr.pop();
        load(x[0], x[1], function () {
            loadSoundsFN(arr);
        });
    }
}

function startSoundsLoading() {
    if (loggingEnabled == true)
        console.log("Starting sound load of:" + soundEvents);
    loadSoundsFN(soundEvents);
    waitSoundsLoaded();
}
function loadSounds(root, earr) {
    //let ext = Modernizr.audio.ogg ? '.ogg' : '.mp3';
    let ext = ".ogg";
    let arr = [];
    for (let key in earr) {
        let elm = earr[key]; //Paul Headhunter: 6082037473
        let fn = elm.file;
        if (fn.indexOf(".") < 0) fn += ext;
        arr.push([key, root + fn]);
    }
    soundEvents = arr;
    soundLoadRequests = soundEvents.length;
    soundLoadedCount = 0;
}
function soundLoadedCB(event, name, callback) {
    //if (event.loaded === event.total &&
    if (typeof callback === "function") {
        if (loggingEnabled == true) console.log("Loaded sound:" + name);
        files[name].removeEventListener("canplaythrough", loadedEvent, true);
        soundLoadedCount++;
        callback();
    }
}
function status() {
    let str = "Sounds Playing:" + playingCount + " cached:" + cachedCount;
    return str;
}
function stopSounds() {
    for (let i in playing) {
        playing[i].pause();
        freeSound(playing[i]);
    }
    playingCount = 0;
    playing = {};
}

function stop(sndID) {
    if (sndID) {
        let snd = playing[sndID];
        snd.endTime = 0;
        snd.loop = false;
        if (snd.doneCbfn) {
            snd.doneCbfn(snd.caller, snd);
            delete snd["doneCbfn"];
            delete snd["caller"];
        }
    }
}
function harvestDeadSounds() {
    if (playingCount == 0) return;
    let soundTime = new Date();
    let tm = soundTime.getTime();
    let nplaying = {};
    let npct = 0;
    for (let i in playing) {
        let snd = playing[i];
        if (snd.endTime >= tm) {
            nplaying[i] = snd;
            npct++;
        } else {
            if (snd.loop == true) {
                snd.pause();
                snd.currentTime = 0.0;
                snd.play();
                //console.log("rst:"+playing[i].name+" at "+tm);
                nplaying[i] = snd;
                snd.endTime = tm + snd.tmDuration;
                npct++;
            } else {
                //console.log("Harvesting snd:"+playing[i].name+" at "+tm);
                freeSound(snd);
                if (snd.doneCbfn) {
                    snd.doneCbfn(snd.caller, snd);
                    delete snd["doneCbfn"];
                }
            }
        }
    }
    playing = nplaying;
    playingCount = npct;
}
/*
    function ended(name,snd) {
        let i, tmp = [], found = false;
        snd.removeEventListener("ended", endEvents[snd], true);
		delete playing[i];
		playingCount--;
		freeSound(snd);
		log("sound:"+snd+" ended");
    };
	*/
function getChannelSound(chan) {
    return playing[chan];
}
function getPlayer() {
    let elm = document.createElement("audio");
    elm.channelIndex = chanBaseId++;
    return elm;
}
function freeSound(snd) {
    if (freeChannels[snd.src]) freeChannels[snd.src].push(snd);
    else freeChannels[snd.src] = [snd];
    snd.pause();
    if (snd.currentTime) snd.currentTime = 0.0;
    cachedCount++;
}

function play(name, vol, caller, doneCbfn, loop) {
    if (soundDisabled || playingCount > 4) return null;

    let rsrc = files[name];
    if (rsrc == undefined) {
        console.log("Sound:" + name + " is undefined.");
        return;
    }
    let svol = g_globalSoundVolume * (vol != undefined ? parseFloat(vol) : 1.0);
    if (svol < 0.0001) return null;
    let snd;
    if (freeChannels[rsrc.src]) {
        snd = freeChannels[rsrc.src].pop();
        if (freeChannels[rsrc.src].length == 0) delete freeChannels[rsrc.src];
        cachedCount--;
    } else {
        snd = getPlayer();
        snd.src = rsrc.src;
    }
    snd.loop = loop == undefined ? false : loop;
    snd.caller = caller;
    snd.doneCbfn = doneCbfn;
    let soundTime = new Date();
    let tm = soundTime.getTime();
    //console.log("Playing snd:"+name+" at "+tm+" duration:"+rsrc.duration);
    snd.name = name;
    //snd.tmDuration=(1000*rsrc.duration)-500;
    snd.tmDuration = 1000 * rsrc.duration;
    if (snd.tmDuration < 1) snd.tmDuration = 1;
    snd.endTime = tm + snd.tmDuration;
    snd.volume = svol;
    playing[snd.channelIndex] = snd;
    playingCount++;
    /*    endEvents[snd]=function() { ended(name,snd); };
		try{
			snd.addEventListener("ended", endEvents[snd], true);
        }
		catch(e){
			console.log(e);
		}
	*/
    //snd.volume=1.0;
	try{
    snd.play();
		
	}
	catch{
		console.log("Sound:"+name+" error!");		
	}
    //snd.currentTime=0.0;
    //		console.log("Sound:"+name+" started.");
    return snd.channelIndex;
}

function pause() {
    for (let i in playing) {
        i.pause();
    }
}

function resume() {
    for (let i in playing) {
        i.play();
    }
}
function globalVolume(vol) {
    if (vol) g_globalSoundVolume = vol;
    return g_globalSoundVolume;
}
//return
export default {
    globalVolume: globalVolume,
    loadedPercentage: loadedPercentage,
    setListenerParams: setListenerParams,
    addEmitter: addEmitter,
    stopSounds: stopSounds,
    allSoundsLoaded: allSoundsLoaded,
    startSoundsLoading: startSoundsLoading,
    loadSounds: loadSounds,
    play: play,
    getChannelSound: getChannelSound,
    stop: stop,
    pause: pause,
    resume: resume,
    status: status,
    playTone: playTone,
    harvestDeadSounds: harvestDeadSounds,
    playPositional2d: playPositional2d,
    calcPositionalVolume2d: calcPositionalVolume2d,
    playPositional3d: playPositional3d,
    calcPositionalVolume3d: calcPositionalVolume3d,
    set enabled(enable) {
        return (soundDisabled = !enable);
    },
    get enabled() {
        return !soundDisabled;
    },
};
