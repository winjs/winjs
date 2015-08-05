(function (root, factory) {  // Universal Module Definition (https://github.com/umdjs/umd)
    if (typeof exports === 'object') {
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        define(factory);
    } else {
        root.Map = factory();
  }
}(this, function () {

function Map() {
}
Map.prototype.put = function(key, val) {
    this['$' + key] = val;
};
Map.prototype.get = function(key) {
    return this['$' + key];
};
Map.prototype.has = function(key) {
    return this.hasOwnProperty('$' + key);
};
Map.prototype.remove = function(key) {
    delete this['$' + key];
};
Map.prototype.forEach = function(callback) {
    for (var k in this) {
        if (!this.hasOwnProperty(k)) {
            continue;
        }
        callback(k.substring(1), this[k]);
    }
};
Map.prototype.map = function(callback) {
    var result = new Map;
    for (var k in this) {
        if (!this.hasOwnProperty(k)) {
            continue;
        }
        result[k] = callback(k.substring(1), this[k]);
    }
    return result
}
Map.prototype.mapUpdate = function(callback) {
    for (var k in this) {
        if (!this.hasOwnProperty(k)) {
            continue;
        }
        this[k] = callback(k.substring(1), this[k]);
    }
}
Map.prototype.mapv = function(callback) {
    var result = new Map;
    for (var k in this) {
        if (!this.hasOwnProperty(k)) {
            continue;
        }
        result[k] = callback(this[k]);
    }
    return result
}
Map.prototype.some = function(callback) {
    for (var k in this) {
        if (!this.hasOwnProperty(k)) {
            continue;
        }
        var x = callback(k.substring(1), this[k])
        if (x) {
            return x
        }
    }
    return null
};
Map.prototype.find = Map.prototype.some
Map.prototype.all = function(callback) {
    for (var k in this) {
        if (!this.hasOwnProperty(k)) {
            continue;
        }
        if (!callback(k.substring(1), this[k])) {
            return false
        }
    }
    return true
};
Map.prototype.clone = function() {
    var result = new Map
    for (var k in this) {
        if (!this.hasOwnProperty(k)) {
            continue;
        }
        result[k] = this[k]
    }
    return result
}
Map.prototype.size = function() {
    var x = 0
    for (var k in this) {
        if (!this.hasOwnProperty(k))
            continue;
        x++;
    }
    return x;
}
Map.prototype.json = function() {
    var result = {}
    for (var k in this) {
        if (!this.hasOwnProperty(k))
            continue;
        var key = k.substring(1)
        result[key] = this[k]
    }
    return result;
}
Map.prototype.keys = function() {
    var result = []
    for (var k in this) {
        if (!this.hasOwnProperty(k))
            continue;
        var k = k.substring(1)
        result.push(k)
    }
    return result
}

// Specialized methods
Map.prototype.push = function(key, val) {
    key = '$' + key
    if (!this[key]) {
        this[key] = [];
    }
    this[key].push(val);
};
Map.prototype.increment = function(key, val) {
    key = '$' + key
    if (!this[key]) {
        this[key] = 0;
    }
    if (typeof val === 'undefined')
        val = 1;
    this[key] += val;
};
Map.groupBy = function(list, item2key) {
    if (typeof item2key === 'string') {
        var prty = item2key;
        item2key = function(item) {
             return item[prty];
        };
    }
    var map = new Map;
    for (var i=0; i<list.length; i++) {
        map.push(item2key(list[i]), list[i]);
    }
    return map;
};

return Map

})); // end of UMD