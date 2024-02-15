function buildTexture() {}

function polar(u, v) {
    let m = mat4.identity(mat4.create());
    let vv = [0, 0, 1];
    mat4.rotateX(m, u);
    mat4.rotateZ(m, v);
    mat4.multiplyVec3(m, vv, vv);
    return vv;
}

function buildSphere() {
    let sa = Math.PI * 3.0;
    let s2a = Math.PI * 6.0;
    let vts = [
        polar(0, 0),
        polar(sa, 0),
        polar(sa, sa),
        polar(sa, sa * 2),
        polar(sa, sa * 3),
        polar(sa, sa * 4),
        polar(sa, sa * 5),
        polar(sa * 2.0, s2a),
        polar(sa * 2.0, s2a + sa),
        polar(sa * 2.0, s2a + sa * 2),
        polar(sa * 2.0, s2a + sa * 3),
        polar(sa * 2.0, s2a + sa * 4),
        polar(sa * 2.0, s2a + sa * 5),
        polar(sa * 3.0, 0),
    ];

    let ta = 200;
    let t2a = 100;
    let ty = 200;
    let tuv = [
        [ta, 0],
        [ta + ta, 0],
        [ta + ta * 2, 0],
        [ta + ta * 3, 0],
        [ta + ta * 4, 0],
        [ta + ta * 5, 0],

        [0, ty],
        [ty, ty],
        [ty * 2, ty],
        [ty * 3, ty],
        [ty * 4, ty],
        [ty * 5, ty],

        [t2a, ty],
        [t2a + ty, ty],
        [t2a + ty * 2, ty],
        [t2a + ty * 3, ty],
        [t2a + ty * 4, ty],
        [t2a + ty * 5, ty],
        [t2a + ty * 6, ty],

        [ta, 0],
        [ta + ta, 0],
        [ta + ta * 2, 0],
        [ta + ta * 3, 0],
        [ta + ta * 4, 0],
        [ta + ta * 5, 0],
    ];

    let vis = [
        0, 2, 1, 0, 3, 2, 0, 4, 3, 0, 5, 4, 0, 6, 5, 0, 1, 6, 1, 7, 12, 2, 8, 7,
        3, 9, 8, 4, 10, 9, 5, 10, 9, 6, 1, 9, 7, 8, 13, 8, 9, 13, 9, 10, 13, 10,
        11, 13, 11, 12, 13, 12, 7, 13,
    ];
    let tuvi = [
        0, 7, 6, 1, 8, 7, 2, 9, 8, 3, 10, 9, 4, 11, 10, 5, 6, 11, 6, 7, 12, 7,
        8, 13, 8, 9, 14, 9, 10, 15, 10, 11, 16, 11, 0, 17, 0, 7, 6, 1, 8, 7, 2,
        9, 8, 3, 10, 9, 4, 11, 10, 5, 6, 11,
    ];

    let verts = [];
    let norms = [];
    for (let vii = 0; vii < vis.length; vii++) {
        verts = verts.concat(vts[vis[vii]]);
        norms = norms.concat(vts[vis[vii]]);
    }
    let uvs = [];
    for (vii = 0; vii < tuvi.length; vii++) uvs = verts.concat(tuv[tuvi[vii]]);
    let inds = [];
    for (let t = 0; t < vis.length; t++) {
        inds = inds.concat([t]);
    }

    let display = displayModule.getDisplay();
    let gl = display.gl;

    let batch = display.geomBatch(verts, inds, norms, uvs);
    return batch;
    /*                [-r,-r,z,
                r,-r,z,
                r, r,z,
                -r, r,z],
                [0,1,2, 2,3,0],
                [0,0,-1,
                0,0,-1,
                0,0,-1,
                0,0,-1],
                [0,0, 1,0, 1,1, 0,1]);
 */
}

export default {
    buildTexture: buildTexture,
    buildSphere: buildSphere,
};
