import  {paintMap,loadMap} from "./mapcanvas.js"
//paintMap();

/*
    let mapstr = ''
    map.map.forEach((e,i)=>{
      mapstr+=e[0].c;
      if(((i/256)|0)!=(((i+1)/256)|0))mapstr+='\n'
    })
    console.log(mapstr)*/

loadMap('BadgerCentral')

//console.log(bolomap)

import bolomap from "./bolomap.js"
let csz = 16;
bolomap.getMapNames().forEach(mn=>{
    let option = document.createElement('option')
    option.innerText = option.value = mn;
    mapselect.appendChild(option)
}
)
mapselect.oninput = (v)=>loadMap(v.target.value)

//let map = bolomap.loadRandomMap();
let {min,max}=Math;
window.addEventListener('keydown', (e)=>{
    if (e.code == 'Equal')
        csz *= 2;
    else if (e.code == 'Minus')
        csz /= 2;
    csz = min(32, max(1, csz));
    paintMap(csz);
}
)
