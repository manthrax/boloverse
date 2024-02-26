import bolomap from "./bolomap.js"

let ctx = displaycanvas.getContext('2d')
let cmap = {
    Building: "#d5d5a5",
    Crater: "#e94b20",
    Forest: "#13dd13",
    Grass: "#3ff31d",
    Ocean: "#372ef9",
    River: "#40b6b6",
    RiverWithBoat: "#209696",
    Road: "#404040",
    Rubble: "#202000",
    ShotBuilding: "#ffff00",
    //d5cfe5",
    Swamp: "#2faf29"
}
let rnd = (rng)=>(Math.random() * rng) | 0
let pe = displaycanvas.parentElement;
pe.style.position = 'absolute'
pe.style.left = '0px'
pe.style.top = '0px'
pe.style.width = '100%'
pe.style.height = '100%'
pe.style.overflow = 'scroll';
document.body.style.overflow = 'hidden';
mapselect.style.zIndex = 1;
let csz = 32;
let csz2 = csz / 2;
let x = 0;
let y = 0;
let histo = {}
let {max, min} = Math;
//let neighbors;
let map
let loadMap = (name)=>{
    map = bolomap.loadMapByName(name);
    paintMap(csz)
}

let paintMap = (csz)=>{

    let neighbors = (x,y)=>{
        let nx = min(255, max(0, x - 1));
        let ny = min(255, max(0, y - 1));
        let px = min(255, max(0, x + 1));
        let py = min(255, max(0, y + 1));
        let nb = []
        for (let cy = ny; cy <= py; cy++) {
            for (let cx = nx; cx <= px; cx++) {
                //if (!((cx == x) && (cy == y))) 
                {
                    nb.push(map.map[(cy * 256) + cx])
                }
            }
        }
        return nb;
    }
    displaycanvas.width = 256 * csz;
    displaycanvas.height = 256 * csz;
    let {width, height} = displaycanvas;
    csz2 = csz / 2;
    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, width, height)
    let sp = map.starts[0];

    mapcontainer.scrollTo(sp.x * csz, (255 - sp.y) * csz);

    ctx.fillStyle = 'black'
    ctx.fillRect(0, 0, width, height)

    x = 0;
    y = 0;
    map.map.forEach((e,i)=>{
        let rx = x * csz;
        let ry = y * csz;
        e.forEach((ee,ei)=>{

            let c = cmap[ee.name] || (cmap[ee.name] = `rgb(${rnd(256)},${rnd(256)},${rnd(256)})`)
            histo[ee.name] = histo[ee.name] ? (histo[ee.name] + 1) : 1;
            ctx.fillStyle = c;
            cmap[ee.name] = ctx.fillStyle;
            //ctx.fillRect(rx, height - ry, csz, csz);

            //mapstr+=e[0].c;
            if (ei > 0) {// ctx.fillStyle = 'green'
            }

        }
        )

        let shapeMap = {
            corner: Number('0b11100000'),
            edge: Number('0b01110000'),
            endpt: Number('0b10000000'),
        }
        let rgn = neighbors(x, y);
        let ring = [rgn[1], rgn[2], rgn[5], rgn[8], rgn[7], rgn[6]]
        let ax = (x * csz) + (csz * .5)
        let ay = (height - (y * csz)) + (csz * .5)

        let deg360 = Math.PI * 2;
        let deg180 = Math.PI;
        let deg90 = Math.PI * .5;
        let deg45 = Math.PI * .25;
        let nrad = (csz * .5);

        let fg
        let bg;
        let dir = false;

        let arc90 = (idx=0)=>{
            idx = (idx + 2) & 3;
            ctx.arc(ax, ay, nrad, idx * deg90, (idx + 1) * deg90, dir);
            if (idx == 0) {
                ctx.lineTo(ax - csz2, ay + csz2);
                ctx.lineTo(ax - csz2, ay - csz2);
                ctx.lineTo(ax + csz2, ay - csz2);
            }
            if (idx == 1) {
                ctx.lineTo(ax - csz2, ay - csz2);
                ctx.lineTo(ax + csz2, ay - csz2);
                ctx.lineTo(ax + csz2, ay + csz2);
            }
            if (idx == 2) {
                ctx.lineTo(ax + csz2, ay - csz2);
                ctx.lineTo(ax + csz2, ay + csz2);
                ctx.lineTo(ax - csz2, ay + csz2);
            }
            if (idx == 3) {
                ctx.lineTo(ax + csz2, ay + csz2);
                ctx.lineTo(ax - csz2, ay + csz2);
                ctx.lineTo(ax - csz2, ay - csz2);
            }
        }
        let arc180 = (idx)=>{
            idx = idx & 3;
            ctx.arc(ax, ay, nrad, idx * deg90, (idx + 2) * deg90, dir);
            if (idx == 0) {
                ctx.lineTo(ax - csz2, ay - csz2);
                ctx.lineTo(ax + csz2, ay - csz2);
            }
            if (idx == 1) {
                ctx.lineTo(ax + csz2, ay - csz2);
                ctx.lineTo(ax + csz2, ay + csz2);
            }
            if (idx == 2) {
                ctx.lineTo(ax + csz2, ay + csz2);
                ctx.lineTo(ax - csz2, ay + csz2);
            }
            if (idx == 3) {
                ctx.lineTo(ax - csz2, ay + csz2);
                ctx.lineTo(ax - csz2, ay - csz2);
            }
        }

        if (rgn.length != 9) {
            ctx.fillRect(rx, height - ry, csz, csz)
        } else {
            fg = cmap[rgn[4][0].name]
            bg = 'red';

            let nb = [rgn[1], rgn[5], rgn[7], rgn[3]];
            let nbits = 0;
            if (nb[0][0].name == e[0].name)
                nbits |= 1;
            if (nb[1][0].name == e[0].name)
                nbits |= 2;
            if (nb[2][0].name == e[0].name)
                nbits |= 4;
            if (nb[3][0].name == e[0].name)
                nbits |= 8;
            let nnb = nb.filter(ee=>ee[0].name != e[0].name);
            ctx.fillStyle = fg;
            //if(false)ctx.fillRect(rx , height - ry, csz, csz); else 

            ctx.beginPath();

            //if(nnb.length)
            //    bg=cmap[nnb[0][0].name];

            if (nnb.length == 4) {
                ctx.arc(ax, ay, nrad, 0, deg360, false);
                bg = cmap[nnb[0][0].name];
            } else if (nnb.length == 3) {
                // U
                if (nbits == 1) {
                    arc180(2);
                    bg = cmap[nb[2][0].name]
                } else if (nbits == 2) {
                    arc180(1);
                    bg = cmap[nb[3][0].name]
                } else if (nbits == 4) {
                    arc180(0);
                    bg = cmap[nb[0][0].name]
                } else if (nbits == 8) {
                    arc180(3);
                    bg = cmap[nb[1][0].name]
                } else
                    ctx.rect(rx, height - ry, csz, csz)

            } else if (nnb.length == 2) {

                //Corner
                if (nbits == 3) {
                    arc90(0);
                    bg = cmap[rgn[6][0].name]
                } else if (nbits == 6) {
                    arc90(3);
                    bg = cmap[rgn[0][0].name]
                } else if (nbits == 12) {
                    arc90(2);
                    bg = cmap[rgn[2][0].name]
                } else if (nbits == 9) {
                    arc90(1);
                    bg = cmap[rgn[8][0].name]
                } else if ((nbits == 5) || (nbits == 10))
                    ctx.rect(rx, height - ry, csz, csz)

            } else {
                ctx.rect(rx, height - ry, csz, csz)
            }
            ctx.closePath();
            ctx.fillStyle = bg;
            // 'black'//bg;
            ctx.fillRect(rx, height - ry, csz, csz);
            ctx.fillStyle = fg;
            ctx.fill();
        }

        if (((i / 256) | 0) != (((i + 1) / 256) | 0)) {
            x = 0;
            y++;
        } else
            x++;
    }
    )
    
    //console.log(histo)
}

export {paintMap,loadMap}