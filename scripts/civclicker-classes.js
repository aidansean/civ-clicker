/*global
copyProps, curCiv, isValid, civData
*/

function VersionData(major, minor, sub, mod) {
    "use strict";
    this.major = major;
    this.minor = minor;
    this.sub = sub;
    this.mod = mod;
}
VersionData.prototype.toNumber = function () {
    "use strict";
    return this.major * 1000 + this.minor + this.sub / 1000;
};
VersionData.prototype.toString = function () {
    "use strict";
    return String(this.major) + "." + String(this.minor) + "." + String(this.sub) + String(this.mod);
};

// Waiting: Create a mechanism to automate the creation of a class hierarchy,
// specifying base class, shared props, instance props.
function CivObj(props, asProto) {
    "use strict";
    if (!(this instanceof CivObj)) {
        return new CivObj(props);
    } // Prevent accidental namespace pollution
    //xxx Should these just be taken off the prototype's property names?
    var names = [
        "id", "name", "subType", "owned", "prereqs", "require", "salable", "vulnerable", "effectText",
        "prestige", "initOwned", "init", "reset", "limit", "hasVariableCost"
    ];
    if (asProto) {
        names = null;
    }
    Object.call(this, props);
    copyProps(this, props, names, true);
    return this;
}

// Common Properties: id, name, owned, prereqs, require, effectText,
//xxx Waiting: Add save/load methods.
CivObj.prototype = {
    constructor: CivObj,
    subType: "normal",
    get data() {
        "use strict";
        return curCiv[this.id];
    },
    set data(value) {
        "use strict";
        curCiv[this.id] = value;
    },
    get owned() {
        "use strict";
        return this.data.owned;
    },
    set owned(value) {
        "use strict";
        this.data.owned = value;
    },
    prereqs: {},
    require: {}, // Default to free.  If this is undefined, makes the item unpurchaseable
    salable: false,
    vulnerable: true,
    effectText: "",
    prestige: false,
    initOwned: 0,  // Override this to undefined to inhibit initialization.  Also determines the type of the 'owned' property.
    init: function (fullInit) {
        "use strict";
        if (fullInit === undefined) {
            fullInit = true;
        }
        if (fullInit || !this.prestige) {
            this.data = {};
            if (this.initOwned !== undefined) { this.owned = this.initOwned; }
        }
        return true;
    },
    reset: function () {
        "use strict";
        return this.init(false);
    }, // Default reset behavior is to re-init non-prestige items.
    get limit() {
        "use strict";
        var result = null;
        if (typeof this.initOwned === "number") {
            result = Infinity;
        } else {
            if (typeof this.initOwned === "boolean") {
                result = true;
            } else {
                result = 0;
            }
        }
        return result;
    }, // true (1) for booleans, 0 otherwise.
    set limit(value) {
        "use strict";
        var get_limit = true;
        if (get_limit) {
            return this.limit;
        }
        return value;
    }, // Only here for JSLint.
    //xxx This is a hack; it assumes that any CivObj with a getter for its
    // 'require' has a variable cost.  Which is currently true, but might not
    // always be.
    hasVariableCost: function () {
        "use strict";
        var i,
            requireDesc = Object.getOwnPropertyDescriptor(this, "require");
        if (!requireDesc) {
            return false;
        } // Unpurchaseable
        if (requireDesc.get !== undefined) {
            return true;
        }
        // If our requirements contain a function, assume variable.
        for (i in this.require) {
            if (typeof this.require[i] === "function") {
                return true;
            }
        }
        return false;
    },

    // Return the name for the given quantity of this object.
    // Specific 'singular' and 'plural' used if present and appropriate,
    // otherwise returns 'name'.
    getQtyName: function (qty) {
        "use strict";
        if (qty === 1 && this.singular) {
            return this.singular;
        }
        if (typeof qty === "number" && this.plural) {
            return this.plural;
        }
        return this.name || this.singular || "(UNNAMED)";
    }
};

function Resource(props) {// props is an object containing the desired properties.
    "use strict";
    if (!(this instanceof Resource)) {
        return new Resource(props);
    } // Prevent accidental namespace pollution
    CivObj.call(this, props);
    copyProps(this, props, null, true);
    // Occasional Properties: increment, specialChance, net
    return this;
}
Resource.prototype = new CivObj({
    constructor: Resource,
    type: "resource",
    // 'net' accessor always exists, even if the underlying value is undefined for most resources.
    get net() {
        "use strict";
        if (typeof this.data.net !== "number") {
            console.warn(".net not a number");
            return 0;
        }
        return this.data.net;
    },
    set net(value) {
        "use strict";
        this.data.net = value;
    },
    increment: 0,
    specialChance: 0,
    specialMaterial: "",
    activity: "gathering" //I18N
}, true);

function Building(props) {// props is an object containing the desired properties.
    "use strict";
    if (!(this instanceof Building)) {
        return new Building(props);
    } // Prevent accidental namespace pollution
    CivObj.call(this, props);
    copyProps(this, props, null, true);
    // Occasional Properties: subType, efficiency, devotion
    // plural should get moved during I18N.
    return this;
}
// Common Properties: type="building",customQtyId
Building.prototype = new CivObj({
    constructor: Building,
    type: "building",
    alignment: "player",
    place: "home",
    get vulnerable() {
        "use strict";
        return this.subType !== "altar";
    }, // Altars can't be sacked.
    set vulnerable(value) {
        "use strict";
        var get_limit = true;
        if (get_limit) {
            return this.vulnerable;
        }
        return value;
    }, // Only here for JSLint.
    customQtyId: "buildingCustomQty"
}, true);

function Upgrade(props) {// props is an object containing the desired properties.
    "use strict";
    if (!(this instanceof Upgrade)) {
        return new Upgrade(props);
    } // Prevent accidental namespace pollution
    CivObj.call(this, props);
    copyProps(this, props, null, true);
    // Occasional Properties: subType, efficiency, extraText, onGain
    if (this.subType === "prayer") {
        this.initOwned = undefined;
    } // Prayers don't get initial values.
    if (this.subType === "pantheon") {
        this.prestige = true;
    } // Pantheon upgrades are not lost on reset.
    return this;
}
// Common Properties: type="upgrade"
Upgrade.prototype = new CivObj({
    constructor: Upgrade,
    type: "upgrade",
    initOwned: false,
    vulnerable: false,
    get limit() {
        "use strict";
        return 1;
    }, // Can't re-buy these.
    set limit(value) {
        "use strict";
        var get_limit = true;
        if (get_limit) {
            return this.limit;
        }
        return value;
    } // Only here for JSLint.
}, true);

function Unit(props) {// props is an object containing the desired properties.
    "use strict";
    if (!(this instanceof Unit)) {
        return new Unit(props);
    } // Prevent accidental namespace pollution
    CivObj.call(this, props);
    copyProps(this, props, null, true);
    // Occasional Properties: singular, plural, subType, prereqs, require, effectText, alignment,
    // source, efficiency_base, efficiency, onWin, lootFatigue, killFatigue, killExhaustion, species
    // place, ill
    return this;
}
// Common Properties: type="unit"
Unit.prototype = new CivObj({
    constructor: Unit,
    type: "unit",
    salable: true,
    get customQtyId() {
        "use strict";
        return this.place + "CustomQty";
    },
    set customQtyId(value) {
        "use strict";
        var get_limit = true;
        if (get_limit) {
            return this.customQtyId;
        }
        return value;
    }, // Only here for JSLint.
    alignment: "player", // Also: "enemy"
    species: "human", // Also:  "animal", "mechanical", "undead"
    place: "home", // Also:  "party"
    combatType: "",  // Default noncombatant.  Also "infantry","cavalry","animal"
    onWin: function () {
        "use strict";
        return;
    }, // Do nothing.
    get vulnerable() {
        "use strict";
        return ((this.place === "home") && (this.alignment === "player") && (this.subType === "normal"));
    },
    set vulnerable(value) {
        "use strict";
        var get_limit = true;
        if (get_limit) {
            return this.vulnerable;
        }
        return value;
    }, // Only here for JSLint.
    get isPopulation () {
        "use strict";
        if (this.alignment !== "player") {
            return false;
        }
        if (this.subType === "special" || this.species === "mechanical") {
            return false;
        }
        return true;
    },
    set isPopulation (value) {
        "use strict";
        var get_limit = true;
        if (get_limit) {
            return this.isPopulation;
        }
        return value;
    },
    init: function (fullInit) {
        "use strict";
        CivObj.prototype.init.call(this, fullInit);
        // Right now, only vulnerable human units can get sick.
        if (this.vulnerable && (this.species === "human")) {
            this.illObj = { owned: 0 };
        }
        return true;
    },
    //xxx Right now, ill numbers are being stored as a separate structure inside curCiv.
    // It would probably be better to make it an actual 'ill' property of the Unit.
    // That will require migration code.
    get illObj() {
        "use strict";
        return curCiv[this.id + "Ill"];
    },
    set illObj(value) {
        "use strict";
        curCiv[this.id + "Ill"] = value;
    },
    get ill() {
        "use strict";
        var result;
        if (isValid(this.illObj)) {
            result = this.illObj.owned;
        }
        return result;
    },
    set ill(value) {
        "use strict";
        if (isValid(this.illObj)) {
            this.illObj.owned = value;
        }
    },
    get partyObj() {
        "use strict";
        return civData[this.id + "Party"];
    },
    set partyObj(value) {
        "use strict";
        var get_limit = true;
        if (get_limit) {
            return this.partyObj;
        }
        return value;
    }, // Only here for JSLint.
    get party() {
        "use strict";
        var result;
        if (isValid(this.partyObj)) {
            result = this.partyObj.owned;
        }
        return result;
    },
    set party(value) {
        "use strict";
        if (isValid(this.partyObj)) {
            this.partyObj.owned = value;
        }
    },
    // Is this unit just some other sort of unit in a different place (but in the same limit pool)?
    isDest: function () {
        "use strict";
        return (this.source !== undefined) && (civData[this.source].partyObj === this);
    },
    get limit() {
        "use strict";
        var result = Object.getOwnPropertyDescriptor(CivObj.prototype, "limit").get.call(this);
        if (this.isDest()) {
            result = civData[this.source].limit;
        }
        return result;
    },
    set limit(value) {
        "use strict";
        var get_limit = true;
        if (get_limit) {
            return this.limit;
        }
        return value;
    }, // Only here for JSLint.

    // The total quantity of this unit, regardless of status or place.
    get total() {
        "use strict";
        var result = (this.owned + (this.ill || 0) + (this.party || 0));
        if (this.isDest()) {
            result = civData[this.source].total;
        }
        return result;
    },
    set total(value) {
        "use strict";
        var get_limit = true;
        if (get_limit) {
            return this.total;
        }
        return value;
    } // Only here for JSLint.
}, true);

function Achievement(props) {// props is an object containing the desired properties.
    "use strict";
    if (!(this instanceof Achievement)) {
        // Prevent accidental namespace pollution
        return new Achievement(props);
    }
    CivObj.call(this, props);
    copyProps(this, props, null, true);
    // Occasional Properties: test
    return this;
}
// Common Properties: type="achievement"
Achievement.prototype = new CivObj({
    constructor: Achievement,
    type: "achievement",
    initOwned: false,
    prestige : true, // Achievements are not lost on reset.
    vulnerable : false,
    get limit() {
        "use strict";
        return 1;
    }, // Can't re-buy these.
    set limit(value) {
        "use strict";
        var get_limit = true;
        if (get_limit) {
            return this.limit;
        }
        return value;
    } // Only here for JSLint.
}, true);
