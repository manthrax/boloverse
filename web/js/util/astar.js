function PathNode(nx, ny, p, ng, nh) {
    this.x = nx != null ? nx : 0;
    this.y = ny != null ? ny : 0;
    this.parent = p; //typeof parent !== "undefined" && parent !== null ? p : null;
    this.g = ng != null ? ng : 0;
    this.h = nh != null ? nh : 0;
    this.f = this.g + this.h;
}

function PathFinder(world, w, h, dscale) {
    this.openlist = [];
    this.closedlist = [];
    this.destination = new PathNode();
    this.MAX_DEPTH = 800;
    this.DIST_SCALE = dscale != null ? dscale : 1;
    this.CARDINAL_COST = 1 * this.DIST_SCALE;
    this.DIAGNOL_COST = Math.sqrt(2) * this.DIST_SCALE;
    this.DIST_FUNC = PathFinder.distFast; //.distOctagonal;
    PathFinder.distNames = [
        "euclidean",
        "squared",
        "manhattan",
        "fast",
        "octagonal",
    ];
    this.nodeImpassible =
        world != null && w != null && h != null ? world : null;
    this.width = w != null ? w : 0;
    this.height = h != null ? h : 0;
}
/*
    PathFinder.prototype.setWorld = function(world, w, h) {
      this.world = (world != null) && (w != null) && (h != null) ? world : null;
      this.width = w != null ? w : 0;
      this.height = h != null ? h : 0;
    };
*/

PathFinder.prototype.validCell = function (x, y) {
    //return x >= 0 && x < this.width && y >= 0 && y < this.height;
    return true;
};

PathFinder.prototype.isDiagnol = function (x1, y1, x2, y2) {
    return Math.abs(y2 - y1) === Math.abs(x2 - x1);
};

PathFinder.prototype.isAdjacent = function (x1, y1, x2, y2) {
    return Math.abs(x1 - x2) === 1 && Math.abs(y1 - y2) === 1;
};

PathFinder.prototype.isNodeAjacent = function (n1, n2) {
    return this.isAdjacent(n1.x, n1.y, n2.x, n2.y);
};

PathFinder.prototype.hasDiagnolBlocker = function (x1, y1, x2, y2) {
    if (this.nodeImpassible == null) {
        return false;
    }
    if (!this.isAdjacent(x1, y1, x2, y2)) {
        return false;
    }
    return this.nodeImpassible(x2, y1) || this.nodeImpassible(x1, y2);
};

PathFinder.prototype.addToOpen = function (node) {
    var n, _i, _j, _len, _len1, _ref, _ref1;
    _ref = this.openlist;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        n = _ref[_i];
        if (n.x === node.x && n.y === node.y) {
            return;
        }
    }
    _ref1 = this.closedlist;
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        n = _ref1[_j];
        if (n.x === node.x && n.y === node.y) {
            return;
        }
    }
    return this.openlist.push(node);
};

PathFinder.prototype.addToClosed = function (node) {
    var n, _i, _len, _ref;
    _ref = this.closedlist;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        n = _ref[_i];
        if (n.x === node.x && n.y === node.y) {
            return;
        }
    }
    this.openlist.splice(this.openlist.indexOf(node), 1);
    return this.closedlist.push(node);
};

PathFinder.prototype.adjacentOpenNodes = function (node) {
    var adjacent, n, _i, _len, _ref;
    adjacent = [];
    _ref = this.openlist;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        n = _ref[_i];
        if (this.isNodeAjacent(n, node)) {
            adjacent.push(n);
        }
    }
    return adjacent;
};

PathFinder.prototype.gCost = function (x1, y1, x2, y2) {
    if (x1 === x2 || y1 === y2) {
        var gcost = this.CARDINAL_COST;
    } else {
        gcost = this.DIAGNOL_COST;
    }
    return gcost;
};

PathFinder.distManhattan = function (fromx, fromy, tox, toy, distScale) {
    var name;
    name = "manhattan";
    distScale = distScale != null ? distScale : 1;
    return (
        (Math.abs(fromx - tox) * distScale + Math.abs(fromy - toy)) * distScale
    );
};

PathFinder.distSq = function (fromx, fromy, tox, toy, distScale) {
    var name;
    name = "squared";
    distScale = distScale != null ? distScale : 1;
    return (Math.pow(fromx - tox, 2) + Math.pow(fromy - toy, 2)) * distScale;
};

PathFinder.dist = function (fromx, fromy, tox, toy, distScale) {
    var name;
    name = "euclidean";
    distScale = distScale != null ? distScale : 1;
    return (
        Math.sqrt(Math.pow(fromx - tox, 2) + Math.pow(fromy - toy, 2)) *
        distScale
    );
};

PathFinder.distFast = function (fromx, fromy, tox, toy, distScale) {
    var approx, dx, dy, max, min, name;
    name = "approximation";
    distScale = distScale != null ? distScale : 1;
    dx = Math.abs(tox - fromx);
    dy = Math.abs(toy - fromy);
    min = Math.min(dx, dy);
    max = Math.max(dx, dy);
    approx = max * 1007 + min * 441;
    if (max < min << 4) {
        approx -= max * 40;
    }
    return ((approx + 512) >> 10) * distScale;
};

PathFinder.distOctagonal = function (fromx, fromy, tox, toy, distScale) {
    var dx, dy, name;
    name = "octagonal";
    distScale = distScale != null ? distScale : 1;
    dx = Math.abs(tox - fromx);
    dy = Math.abs(toy - fromy);
    return (0.941246 * Math.max(dx, dy) + 0.41 * Math.min(dx, dy)) * distScale;
};

PathFinder.prototype.minF = function () {
    var minscore, n, result, _i, _len, _ref;
    minscore = 9999999;
    result = null;
    _ref = this.openlist;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        n = _ref[_i];
        if (n.f < minscore) {
            minscore = n.f;
            result = n;
        }
    }
    return result;
};

PathFinder.prototype.minG = function () {
    var minscore, n, result, _i, _len, _ref;
    minscore = 9999999;
    result = null;
    _ref = this.openlist;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        n = _ref[_i];
        if (n.g < minscore) {
            minscore = n.g;
            result = n;
        }
    }
    return result;
};

PathFinder.prototype.getPath = function (fromx, fromy, tox, toy, func) {
    var finalNode, node, result, slider;
    if (func) {
        this.DIST_FUNC = func;
    }
    if (this.nodeImpassible == null) {
        console.log("no world defined");
        return null;
    }
    if (!(this.validCell(fromx, fromy) && this.validCell(tox, toy))) {
        console.log("start location or end location are not valid cells");
        return null;
    }
    //if (this.world(tox,toy) || (fromx === tox && fromy === toy)) {
    if (fromx === tox && fromy === toy) {
        //console.log('start and end location are the same, or start is blocked');
        return null;
    }
    this.openlist.length = 0;
    this.closedlist.length = 0;
    this.destination.x = tox;
    this.destination.y = toy;
    node = new PathNode(fromx, fromy, null, 0, 0);
    this.openlist.push(node);
    finalNode = this.processNode(node);
    result = [];
    if (finalNode != null) {
        slider = finalNode;
        result.push(slider);
        while (slider.parent != null) {
            slider = slider.parent;
            result.push(slider);
        }
    }
    result.reverse();
    return result;
};

PathFinder.prototype.processNode = function (node, depth) {
    var adjOpenNode,
        gcost,
        hcost,
        i,
        j,
        n,
        _i,
        _j,
        _k,
        _len,
        _ref,
        _ref1,
        _ref2,
        _ref3;
    if (node == null) {
        return null;
    }
    if (depth == null) {
        depth = 0;
    }
    if (depth >= this.MAX_DEPTH) {
        console.log("max depth reached");
        return node;
    }
    if (this.nodeImpassible(node.x, node.y)) {
        console.log("node is blocked");
        return null;
    }
    if (node.x === this.destination.x && node.y === this.destination.y) {
        return node;
    }
    this.addToClosed(node);
    for (
        i = _i = _ref = node.x - 1, _ref1 = node.x + 1;
        _ref <= _ref1 ? _i <= _ref1 : _i >= _ref1;
        i = _ref <= _ref1 ? ++_i : --_i
    ) {
        for (
            j = _j = _ref2 = node.y - 1, _ref3 = node.y + 1;
            _ref2 <= _ref3 ? _j <= _ref3 : _j >= _ref3;
            j = _ref2 <= _ref3 ? ++_j : --_j
        ) {
            if (this.validCell(i, j)) {
                if (
                    this.nodeImpassible(i, j) === 0 &&
                    !this.hasDiagnolBlocker(node.x, node.y, i, j)
                ) {
                    gcost = this.gCost(i, j, node.x, node.y) + node.g;
                    hcost = this.DIST_FUNC(
                        i,
                        j,
                        this.destination.x,
                        this.destination.y,
                        this.DIST_SCALE
                    );
                    this.addToOpen(new PathNode(i, j, node, gcost, hcost));
                }
            }
        }
    }
    adjOpenNode = this.adjacentOpenNodes(node);
    for (_k = 0, _len = adjOpenNode.length; _k < _len; _k++) {
        n = adjOpenNode[_k];
        if (n.g < node.g) {
            n.parent = node;
            n.g = node.g + this.gCost(n.x, n.y, node.x, node.y);
            n.f = n.g + n.h;
        }
    }
    return this.processNode(this.minF(), depth + 1);
};

PathFinder.prototype.debugDraw = function (nodeSize) {
    var distName, n, _i, _j, _len, _len1, _ref, _ref1;
    nodeSize = nodeSize != null ? nodeSize : 20;
    context.fillStyle = "rgba(0, 200, 0, 0.5)";
    _ref = this.openlist;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        n = _ref[_i];
        context.fillRect(n.x * nodeSize, n.y * nodeSize, nodeSize, nodeSize);
    }
    context.fillStyle = "rgba(255, 255, 0, 0.5)";
    _ref1 = this.closedlist;
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        n = _ref1[_j];
        context.fillRect(n.x * nodeSize, n.y * nodeSize, nodeSize, nodeSize);
    }
    context.fillStyle = "rgba(255, 0, 0, 1)";
    context.fillRect(
        this.destination.x * nodeSize,
        this.destination.y * nodeSize,
        nodeSize,
        nodeSize
    );
    if (this.DIST_FUNC === PathFinder.dist) {
        distName = "euclidean";
    } else if (this.DIST_FUNC === PathFinder.distSq) {
        distName = "squared";
    } else if (this.DIST_FUNC === PathFinder.distManhattan) {
        distName = "manhattan";
    } else if (this.DIST_FUNC === PathFinder.distFast) {
        distName = "fast";
    } else if (this.DIST_FUNC === PathFinder.distOctagonal) {
        distName = "octagonal";
    } else {
        distName = "fuck";
    }
    context.fillStyle = "rgba(0, 0, 0, 1)";
    context.font = "14pt Lucida Console";
    context.fillText("Max Depth         : " + this.MAX_DEPTH, 5, 25);
    context.fillText("Cardinal Cost     : " + this.CARDINAL_COST, 5, 50);
    context.fillText("Diagnol Cost      : " + this.DIAGNOL_COST, 5, 75);
    return context.fillText("Distance Function : " + distName, 5, 100);
};

export default PathFinder;
