// Copyright Isaac Z. Schlueter and Contributors. All rights reserved. ISC license.
// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
/**
 * The semantic version parser.
 *
 * This module is browser compatible.
 *
 * @module
 */ // Note: this is the semver.org version of the spec that it implements
// Not necessarily the package version of this code.
export const SEMVER_SPEC_VERSION = "2.0.0";
const MAX_LENGTH = 256;
// The actual regexps
const re = [];
const src = [];
let R = 0;
// The following Regular Expressions can be used for tokenizing,
// validating, and parsing SemVer version strings.
// ## Numeric Identifier
// A single `0`, or a non-zero digit followed by zero or more digits.
const NUMERICIDENTIFIER = R++;
src[NUMERICIDENTIFIER] = "0|[1-9]\\d*";
// ## Non-numeric Identifier
// Zero or more digits, followed by a letter or hyphen, and then zero or
// more letters, digits, or hyphens.
const NONNUMERICIDENTIFIER = R++;
src[NONNUMERICIDENTIFIER] = "\\d*[a-zA-Z-][a-zA-Z0-9-]*";
// ## Main Version
// Three dot-separated numeric identifiers.
const MAINVERSION = R++;
const nid = src[NUMERICIDENTIFIER];
src[MAINVERSION] = `(${nid})\\.(${nid})\\.(${nid})`;
// ## Pre-release Version Identifier
// A numeric identifier, or a non-numeric identifier.
const PRERELEASEIDENTIFIER = R++;
src[PRERELEASEIDENTIFIER] = "(?:" + src[NUMERICIDENTIFIER] + "|" + src[NONNUMERICIDENTIFIER] + ")";
// ## Pre-release Version
// Hyphen, followed by one or more dot-separated pre-release version
// identifiers.
const PRERELEASE = R++;
src[PRERELEASE] = "(?:-(" + src[PRERELEASEIDENTIFIER] + "(?:\\." + src[PRERELEASEIDENTIFIER] + ")*))";
// ## Build Metadata Identifier
// Any combination of digits, letters, or hyphens.
const BUILDIDENTIFIER = R++;
src[BUILDIDENTIFIER] = "[0-9A-Za-z-]+";
// ## Build Metadata
// Plus sign, followed by one or more period-separated build metadata
// identifiers.
const BUILD = R++;
src[BUILD] = "(?:\\+(" + src[BUILDIDENTIFIER] + "(?:\\." + src[BUILDIDENTIFIER] + ")*))";
// ## Full Version String
// A main version, followed optionally by a pre-release version and
// build metadata.
// Note that the only major, minor, patch, and pre-release sections of
// the version string are capturing groups.  The build metadata is not a
// capturing group, because it should not ever be used in version
// comparison.
const FULL = R++;
const FULLPLAIN = "v?" + src[MAINVERSION] + src[PRERELEASE] + "?" + src[BUILD] + "?";
src[FULL] = "^" + FULLPLAIN + "$";
const GTLT = R++;
src[GTLT] = "((?:<|>)?=?)";
// Something like "2.*" or "1.2.x".
// Note that "x.x" is a valid xRange identifer, meaning "any version"
// Only the first item is strictly required.
const XRANGEIDENTIFIER = R++;
src[XRANGEIDENTIFIER] = src[NUMERICIDENTIFIER] + "|x|X|\\*";
const XRANGEPLAIN = R++;
src[XRANGEPLAIN] = "[v=\\s]*(" + src[XRANGEIDENTIFIER] + ")" + "(?:\\.(" + src[XRANGEIDENTIFIER] + ")" + "(?:\\.(" + src[XRANGEIDENTIFIER] + ")" + "(?:" + src[PRERELEASE] + ")?" + src[BUILD] + "?" + ")?)?";
const XRANGE = R++;
src[XRANGE] = "^" + src[GTLT] + "\\s*" + src[XRANGEPLAIN] + "$";
// Tilde ranges.
// Meaning is "reasonably at or greater than"
const LONETILDE = R++;
src[LONETILDE] = "(?:~>?)";
const TILDE = R++;
src[TILDE] = "^" + src[LONETILDE] + src[XRANGEPLAIN] + "$";
// Caret ranges.
// Meaning is "at least and backwards compatible with"
const LONECARET = R++;
src[LONECARET] = "(?:\\^)";
const CARET = R++;
src[CARET] = "^" + src[LONECARET] + src[XRANGEPLAIN] + "$";
// A simple gt/lt/eq thing, or just "" to indicate "any version"
const COMPARATOR = R++;
src[COMPARATOR] = "^" + src[GTLT] + "\\s*(" + FULLPLAIN + ")$|^$";
// Something like `1.2.3 - 1.2.4`
const HYPHENRANGE = R++;
src[HYPHENRANGE] = "^\\s*(" + src[XRANGEPLAIN] + ")" + "\\s+-\\s+" + "(" + src[XRANGEPLAIN] + ")" + "\\s*$";
// Star ranges basically just allow anything at all.
const STAR = R++;
src[STAR] = "(<|>)?=?\\s*\\*";
// Compile to actual regexp objects.
// All are flag-free, unless they were created above with a flag.
for(let i = 0; i < R; i++){
    if (!re[i]) {
        re[i] = new RegExp(src[i]);
    }
}
export function parse(version, options) {
    if (typeof options !== "object") {
        options = {
            includePrerelease: false
        };
    }
    if (version instanceof SemVer) {
        return version;
    }
    if (typeof version !== "string") {
        return null;
    }
    if (version.length > MAX_LENGTH) {
        return null;
    }
    const r = re[FULL];
    if (!r.test(version)) {
        return null;
    }
    try {
        return new SemVer(version, options);
    } catch  {
        return null;
    }
}
export function valid(version, options) {
    if (version === null) return null;
    const v = parse(version, options);
    return v ? v.version : null;
}
export class SemVer {
    raw;
    options;
    major;
    minor;
    patch;
    version;
    build;
    prerelease;
    constructor(version, options){
        if (typeof options !== "object") {
            options = {
                includePrerelease: false
            };
        }
        if (version instanceof SemVer) {
            version = version.version;
        } else if (typeof version !== "string") {
            throw new TypeError("Invalid Version: " + version);
        }
        if (version.length > MAX_LENGTH) {
            throw new TypeError("version is longer than " + MAX_LENGTH + " characters");
        }
        if (!(this instanceof SemVer)) {
            return new SemVer(version, options);
        }
        this.options = options;
        const m = version.trim().match(re[FULL]);
        if (!m) {
            throw new TypeError("Invalid Version: " + version);
        }
        this.raw = version;
        // these are actually numbers
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > Number.MAX_SAFE_INTEGER || this.major < 0) {
            throw new TypeError("Invalid major version");
        }
        if (this.minor > Number.MAX_SAFE_INTEGER || this.minor < 0) {
            throw new TypeError("Invalid minor version");
        }
        if (this.patch > Number.MAX_SAFE_INTEGER || this.patch < 0) {
            throw new TypeError("Invalid patch version");
        }
        // numberify any prerelease numeric ids
        if (!m[4]) {
            this.prerelease = [];
        } else {
            this.prerelease = m[4].split(".").map((id)=>{
                if (/^[0-9]+$/.test(id)) {
                    const num = +id;
                    if (num >= 0 && num < Number.MAX_SAFE_INTEGER) {
                        return num;
                    }
                }
                return id;
            });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
    }
    format() {
        this.version = this.major + "." + this.minor + "." + this.patch;
        if (this.prerelease.length) {
            this.version += "-" + this.prerelease.join(".");
        }
        return this.version;
    }
    compare(other) {
        if (!(other instanceof SemVer)) {
            other = new SemVer(other, this.options);
        }
        return this.compareMain(other) || this.comparePre(other);
    }
    compareMain(other) {
        if (!(other instanceof SemVer)) {
            other = new SemVer(other, this.options);
        }
        return compareIdentifiers(this.major, other.major) || compareIdentifiers(this.minor, other.minor) || compareIdentifiers(this.patch, other.patch);
    }
    comparePre(other) {
        if (!(other instanceof SemVer)) {
            other = new SemVer(other, this.options);
        }
        // NOT having a prerelease is > having one
        if (this.prerelease.length && !other.prerelease.length) {
            return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
            return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
            return 0;
        }
        let i = 0;
        do {
            const a = this.prerelease[i];
            const b = other.prerelease[i];
            if (a === undefined && b === undefined) {
                return 0;
            } else if (b === undefined) {
                return 1;
            } else if (a === undefined) {
                return -1;
            } else if (a === b) {
                continue;
            } else {
                return compareIdentifiers(a, b);
            }
        }while (++i)
        return 1;
    }
    compareBuild(other) {
        if (!(other instanceof SemVer)) {
            other = new SemVer(other, this.options);
        }
        let i = 0;
        do {
            const a = this.build[i];
            const b = other.build[i];
            if (a === undefined && b === undefined) {
                return 0;
            } else if (b === undefined) {
                return 1;
            } else if (a === undefined) {
                return -1;
            } else if (a === b) {
                continue;
            } else {
                return compareIdentifiers(a, b);
            }
        }while (++i)
        return 1;
    }
    inc(release, identifier) {
        switch(release){
            case "premajor":
                this.prerelease.length = 0;
                this.patch = 0;
                this.minor = 0;
                this.major++;
                this.inc("pre", identifier);
                break;
            case "preminor":
                this.prerelease.length = 0;
                this.patch = 0;
                this.minor++;
                this.inc("pre", identifier);
                break;
            case "prepatch":
                // If this is already a prerelease, it will bump to the next version
                // drop any prereleases that might already exist, since they are not
                // relevant at this point.
                this.prerelease.length = 0;
                this.inc("patch", identifier);
                this.inc("pre", identifier);
                break;
            // If the input is a non-prerelease version, this acts the same as
            // prepatch.
            case "prerelease":
                if (this.prerelease.length === 0) {
                    this.inc("patch", identifier);
                }
                this.inc("pre", identifier);
                break;
            case "major":
                // If this is a pre-major version, bump up to the same major version.
                // Otherwise increment major.
                // 1.0.0-5 bumps to 1.0.0
                // 1.1.0 bumps to 2.0.0
                if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
                    this.major++;
                }
                this.minor = 0;
                this.patch = 0;
                this.prerelease = [];
                break;
            case "minor":
                // If this is a pre-minor version, bump up to the same minor version.
                // Otherwise increment minor.
                // 1.2.0-5 bumps to 1.2.0
                // 1.2.1 bumps to 1.3.0
                if (this.patch !== 0 || this.prerelease.length === 0) {
                    this.minor++;
                }
                this.patch = 0;
                this.prerelease = [];
                break;
            case "patch":
                // If this is not a pre-release version, it will increment the patch.
                // If it is a pre-release it will bump up to the same patch version.
                // 1.2.0-5 patches to 1.2.0
                // 1.2.0 patches to 1.2.1
                if (this.prerelease.length === 0) {
                    this.patch++;
                }
                this.prerelease = [];
                break;
            // This probably shouldn't be used publicly.
            // 1.0.0 "pre" would become 1.0.0-0 which is the wrong direction.
            case "pre":
                if (this.prerelease.length === 0) {
                    this.prerelease = [
                        0
                    ];
                } else {
                    let i = this.prerelease.length;
                    while(--i >= 0){
                        if (typeof this.prerelease[i] === "number") {
                            // deno-fmt-ignore
                            this.prerelease[i]++;
                            i = -2;
                        }
                    }
                    if (i === -1) {
                        // didn't increment anything
                        this.prerelease.push(0);
                    }
                }
                if (identifier) {
                    // 1.2.0-beta.1 bumps to 1.2.0-beta.2,
                    // 1.2.0-beta.fooblz or 1.2.0-beta bumps to 1.2.0-beta.0
                    if (this.prerelease[0] === identifier) {
                        if (isNaN(this.prerelease[1])) {
                            this.prerelease = [
                                identifier,
                                0
                            ];
                        }
                    } else {
                        this.prerelease = [
                            identifier,
                            0
                        ];
                    }
                }
                break;
            default:
                throw new Error("invalid increment argument: " + release);
        }
        this.format();
        this.raw = this.version;
        return this;
    }
    toString() {
        return this.version;
    }
}
/**
 * Return the version incremented by the release type (major, minor, patch, or prerelease), or null if it's not valid.
 */ export function inc(version, release, options, identifier) {
    if (typeof options === "string") {
        identifier = options;
        options = undefined;
    }
    try {
        return new SemVer(version, options).inc(release, identifier).version;
    } catch  {
        return null;
    }
}
export function diff(version1, version2, options) {
    if (eq(version1, version2, options)) {
        return null;
    } else {
        const v1 = parse(version1);
        const v2 = parse(version2);
        let prefix = "";
        let defaultResult = null;
        if (v1 && v2) {
            if (v1.prerelease.length || v2.prerelease.length) {
                prefix = "pre";
                defaultResult = "prerelease";
            }
            for(const key in v1){
                if (key === "major" || key === "minor" || key === "patch") {
                    if (v1[key] !== v2[key]) {
                        return prefix + key;
                    }
                }
            }
        }
        return defaultResult; // may be undefined
    }
}
const numeric = /^[0-9]+$/;
export function compareIdentifiers(a, b) {
    const anum = numeric.test(a);
    const bnum = numeric.test(b);
    if (a === null || b === null) throw "Comparison against null invalid";
    if (anum && bnum) {
        a = +a;
        b = +b;
    }
    return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
}
export function rcompareIdentifiers(a, b) {
    return compareIdentifiers(b, a);
}
/**
 * Return the major version number.
 */ export function major(v, options) {
    return new SemVer(v, options).major;
}
/**
 * Return the minor version number.
 */ export function minor(v, options) {
    return new SemVer(v, options).minor;
}
/**
 * Return the patch version number.
 */ export function patch(v, options) {
    return new SemVer(v, options).patch;
}
export function compare(v1, v2, options) {
    return new SemVer(v1, options).compare(new SemVer(v2, options));
}
export function compareBuild(a, b, options) {
    const versionA = new SemVer(a, options);
    const versionB = new SemVer(b, options);
    return versionA.compare(versionB) || versionA.compareBuild(versionB);
}
export function rcompare(v1, v2, options) {
    return compare(v2, v1, options);
}
export function sort(list, options) {
    return list.sort((a, b)=>{
        return compareBuild(a, b, options);
    });
}
export function rsort(list, options) {
    return list.sort((a, b)=>{
        return compareBuild(b, a, options);
    });
}
export function gt(v1, v2, options) {
    return compare(v1, v2, options) > 0;
}
export function lt(v1, v2, options) {
    return compare(v1, v2, options) < 0;
}
export function eq(v1, v2, options) {
    return compare(v1, v2, options) === 0;
}
export function neq(v1, v2, options) {
    return compare(v1, v2, options) !== 0;
}
export function gte(v1, v2, options) {
    return compare(v1, v2, options) >= 0;
}
export function lte(v1, v2, options) {
    return compare(v1, v2, options) <= 0;
}
export function cmp(v1, operator, v2, options) {
    switch(operator){
        case "===":
            if (typeof v1 === "object") v1 = v1.version;
            if (typeof v2 === "object") v2 = v2.version;
            return v1 === v2;
        case "!==":
            if (typeof v1 === "object") v1 = v1.version;
            if (typeof v2 === "object") v2 = v2.version;
            return v1 !== v2;
        case "":
        case "=":
        case "==":
            return eq(v1, v2, options);
        case "!=":
            return neq(v1, v2, options);
        case ">":
            return gt(v1, v2, options);
        case ">=":
            return gte(v1, v2, options);
        case "<":
            return lt(v1, v2, options);
        case "<=":
            return lte(v1, v2, options);
        default:
            throw new TypeError("Invalid operator: " + operator);
    }
}
const ANY = {};
export class Comparator {
    semver;
    operator;
    value;
    options;
    constructor(comp, options){
        if (typeof options !== "object") {
            options = {
                includePrerelease: false
            };
        }
        if (comp instanceof Comparator) {
            return comp;
        }
        if (!(this instanceof Comparator)) {
            return new Comparator(comp, options);
        }
        this.options = options;
        this.parse(comp);
        if (this.semver === ANY) {
            this.value = "";
        } else {
            this.value = this.operator + this.semver.version;
        }
    }
    parse(comp) {
        const r = re[COMPARATOR];
        const m = comp.match(r);
        if (!m) {
            throw new TypeError("Invalid comparator: " + comp);
        }
        const m1 = m[1];
        this.operator = m1 !== undefined ? m1 : "";
        if (this.operator === "=") {
            this.operator = "";
        }
        // if it literally is just '>' or '' then allow anything.
        if (!m[2]) {
            this.semver = ANY;
        } else {
            this.semver = new SemVer(m[2], this.options);
        }
    }
    test(version) {
        if (this.semver === ANY || version === ANY) {
            return true;
        }
        if (typeof version === "string") {
            version = new SemVer(version, this.options);
        }
        return cmp(version, this.operator, this.semver, this.options);
    }
    intersects(comp, options) {
        if (!(comp instanceof Comparator)) {
            throw new TypeError("a Comparator is required");
        }
        if (typeof options !== "object") {
            options = {
                includePrerelease: false
            };
        }
        let rangeTmp;
        if (this.operator === "") {
            if (this.value === "") {
                return true;
            }
            rangeTmp = new Range(comp.value, options);
            return satisfies(this.value, rangeTmp, options);
        } else if (comp.operator === "") {
            if (comp.value === "") {
                return true;
            }
            rangeTmp = new Range(this.value, options);
            return satisfies(comp.semver, rangeTmp, options);
        }
        const sameDirectionIncreasing = (this.operator === ">=" || this.operator === ">") && (comp.operator === ">=" || comp.operator === ">");
        const sameDirectionDecreasing = (this.operator === "<=" || this.operator === "<") && (comp.operator === "<=" || comp.operator === "<");
        const sameSemVer = this.semver.version === comp.semver.version;
        const differentDirectionsInclusive = (this.operator === ">=" || this.operator === "<=") && (comp.operator === ">=" || comp.operator === "<=");
        const oppositeDirectionsLessThan = cmp(this.semver, "<", comp.semver, options) && (this.operator === ">=" || this.operator === ">") && (comp.operator === "<=" || comp.operator === "<");
        const oppositeDirectionsGreaterThan = cmp(this.semver, ">", comp.semver, options) && (this.operator === "<=" || this.operator === "<") && (comp.operator === ">=" || comp.operator === ">");
        return sameDirectionIncreasing || sameDirectionDecreasing || sameSemVer && differentDirectionsInclusive || oppositeDirectionsLessThan || oppositeDirectionsGreaterThan;
    }
    toString() {
        return this.value;
    }
}
export class Range {
    range;
    raw;
    options;
    includePrerelease;
    set;
    constructor(range, options){
        if (typeof options !== "object") {
            options = {
                includePrerelease: false
            };
        }
        if (range instanceof Range) {
            if (range.includePrerelease === !!options.includePrerelease) {
                return range;
            } else {
                return new Range(range.raw, options);
            }
        }
        if (range instanceof Comparator) {
            return new Range(range.value, options);
        }
        if (!(this instanceof Range)) {
            return new Range(range, options);
        }
        this.options = options;
        this.includePrerelease = !!options.includePrerelease;
        // First, split based on boolean or ||
        this.raw = range;
        this.set = range.split(/\s*\|\|\s*/).map((range)=>this.parseRange(range.trim())).filter((c)=>{
            // throw out any that are not relevant for whatever reason
            return c.length;
        });
        if (!this.set.length) {
            throw new TypeError("Invalid SemVer Range: " + range);
        }
        this.format();
    }
    format() {
        this.range = this.set.map((comps)=>comps.join(" ").trim()).join("||").trim();
        return this.range;
    }
    parseRange(range) {
        range = range.trim();
        // `1.2.3 - 1.2.4` => `>=1.2.3 <=1.2.4`
        const hr = re[HYPHENRANGE];
        range = range.replace(hr, hyphenReplace);
        // normalize spaces
        range = range.split(/\s+/).join(" ");
        // At this point, the range is completely trimmed and
        // ready to be split into comparators.
        const set = range.split(" ").map((comp)=>parseComparator(comp, this.options)).join(" ").split(/\s+/);
        return set.map((comp)=>new Comparator(comp, this.options));
    }
    test(version) {
        if (typeof version === "string") {
            version = new SemVer(version, this.options);
        }
        for(let i = 0; i < this.set.length; i++){
            if (testSet(this.set[i], version, this.options)) {
                return true;
            }
        }
        return false;
    }
    intersects(range, options) {
        if (!(range instanceof Range)) {
            throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators)=>{
            return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators)=>{
                return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator)=>{
                    return rangeComparators.every((rangeComparator)=>{
                        return thisComparator.intersects(rangeComparator, options);
                    });
                });
            });
        });
    }
    toString() {
        return this.range;
    }
}
function testSet(set, version, options) {
    for(let i = 0; i < set.length; i++){
        if (!set[i].test(version)) {
            return false;
        }
    }
    if (version.prerelease.length && !options.includePrerelease) {
        // Find the set of versions that are allowed to have prereleases
        // For example, ^1.2.3-pr.1 desugars to >=1.2.3-pr.1 <2.0.0
        // That should allow `1.2.3-pr.2` to pass.
        // However, `1.2.4-alpha.notready` should NOT be allowed,
        // even though it's within the range set by the comparators.
        for(let i1 = 0; i1 < set.length; i1++){
            if (set[i1].semver === ANY) {
                continue;
            }
            if (set[i1].semver.prerelease.length > 0) {
                const allowed = set[i1].semver;
                if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
                    return true;
                }
            }
        }
        // Version has a -pre, but it's not one of the ones we like.
        return false;
    }
    return true;
}
// take a set of comparators and determine whether there
// exists a version which can satisfy it
function isSatisfiable(comparators, options) {
    let result = true;
    const remainingComparators = comparators.slice();
    let testComparator = remainingComparators.pop();
    while(result && remainingComparators.length){
        result = remainingComparators.every((otherComparator)=>{
            return testComparator?.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
    }
    return result;
}
// Mostly just for testing and legacy API reasons
export function toComparators(range, options) {
    return new Range(range, options).set.map((comp)=>{
        return comp.map((c)=>c.value).join(" ").trim().split(" ");
    });
}
// comprised of xranges, tildes, stars, and gtlt's at this point.
// already replaced the hyphen ranges
// turn into a set of JUST comparators.
function parseComparator(comp, options) {
    comp = replaceCarets(comp, options);
    comp = replaceTildes(comp, options);
    comp = replaceXRanges(comp, options);
    comp = replaceStars(comp, options);
    return comp;
}
function isX(id) {
    return !id || id.toLowerCase() === "x" || id === "*";
}
// ~, ~> --> * (any, kinda silly)
// ~2, ~2.x, ~2.x.x, ~>2, ~>2.x ~>2.x.x --> >=2.0.0 <3.0.0
// ~2.0, ~2.0.x, ~>2.0, ~>2.0.x --> >=2.0.0 <2.1.0
// ~1.2, ~1.2.x, ~>1.2, ~>1.2.x --> >=1.2.0 <1.3.0
// ~1.2.3, ~>1.2.3 --> >=1.2.3 <1.3.0
// ~1.2.0, ~>1.2.0 --> >=1.2.0 <1.3.0
function replaceTildes(comp, options) {
    return comp.trim().split(/\s+/).map((comp)=>replaceTilde(comp, options)).join(" ");
}
function replaceTilde(comp, _options) {
    const r = re[TILDE];
    return comp.replace(r, (_, M, m, p, pr)=>{
        let ret;
        if (isX(M)) {
            ret = "";
        } else if (isX(m)) {
            ret = ">=" + M + ".0.0 <" + (+M + 1) + ".0.0";
        } else if (isX(p)) {
            // ~1.2 == >=1.2.0 <1.3.0
            ret = ">=" + M + "." + m + ".0 <" + M + "." + (+m + 1) + ".0";
        } else if (pr) {
            ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + M + "." + (+m + 1) + ".0";
        } else {
            // ~1.2.3 == >=1.2.3 <1.3.0
            ret = ">=" + M + "." + m + "." + p + " <" + M + "." + (+m + 1) + ".0";
        }
        return ret;
    });
}
// ^ --> * (any, kinda silly)
// ^2, ^2.x, ^2.x.x --> >=2.0.0 <3.0.0
// ^2.0, ^2.0.x --> >=2.0.0 <3.0.0
// ^1.2, ^1.2.x --> >=1.2.0 <2.0.0
// ^1.2.3 --> >=1.2.3 <2.0.0
// ^1.2.0 --> >=1.2.0 <2.0.0
function replaceCarets(comp, options) {
    return comp.trim().split(/\s+/).map((comp)=>replaceCaret(comp, options)).join(" ");
}
function replaceCaret(comp, _options) {
    const r = re[CARET];
    return comp.replace(r, (_, M, m, p, pr)=>{
        let ret;
        if (isX(M)) {
            ret = "";
        } else if (isX(m)) {
            ret = ">=" + M + ".0.0 <" + (+M + 1) + ".0.0";
        } else if (isX(p)) {
            if (M === "0") {
                ret = ">=" + M + "." + m + ".0 <" + M + "." + (+m + 1) + ".0";
            } else {
                ret = ">=" + M + "." + m + ".0 <" + (+M + 1) + ".0.0";
            }
        } else if (pr) {
            if (M === "0") {
                if (m === "0") {
                    ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + M + "." + m + "." + (+p + 1);
                } else {
                    ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + M + "." + (+m + 1) + ".0";
                }
            } else {
                ret = ">=" + M + "." + m + "." + p + "-" + pr + " <" + (+M + 1) + ".0.0";
            }
        } else {
            if (M === "0") {
                if (m === "0") {
                    ret = ">=" + M + "." + m + "." + p + " <" + M + "." + m + "." + (+p + 1);
                } else {
                    ret = ">=" + M + "." + m + "." + p + " <" + M + "." + (+m + 1) + ".0";
                }
            } else {
                ret = ">=" + M + "." + m + "." + p + " <" + (+M + 1) + ".0.0";
            }
        }
        return ret;
    });
}
function replaceXRanges(comp, options) {
    return comp.split(/\s+/).map((comp)=>replaceXRange(comp, options)).join(" ");
}
function replaceXRange(comp, _options) {
    comp = comp.trim();
    const r = re[XRANGE];
    return comp.replace(r, (ret, gtlt, M, m, p, _pr)=>{
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
            gtlt = "";
        }
        if (xM) {
            if (gtlt === ">" || gtlt === "<") {
                // nothing is allowed
                ret = "<0.0.0";
            } else {
                // nothing is forbidden
                ret = "*";
            }
        } else if (gtlt && anyX) {
            // we know patch is an x, because we have any x at all.
            // replace X with 0
            if (xm) {
                m = 0;
            }
            p = 0;
            if (gtlt === ">") {
                // >1 => >=2.0.0
                // >1.2 => >=1.3.0
                // >1.2.3 => >= 1.2.4
                gtlt = ">=";
                if (xm) {
                    M = +M + 1;
                    m = 0;
                    p = 0;
                } else {
                    m = +m + 1;
                    p = 0;
                }
            } else if (gtlt === "<=") {
                // <=0.7.x is actually <0.8.0, since any 0.7.x should
                // pass.  Similarly, <=7.x is actually <8.0.0, etc.
                gtlt = "<";
                if (xm) {
                    M = +M + 1;
                } else {
                    m = +m + 1;
                }
            }
            ret = gtlt + M + "." + m + "." + p;
        } else if (xm) {
            ret = ">=" + M + ".0.0 <" + (+M + 1) + ".0.0";
        } else if (xp) {
            ret = ">=" + M + "." + m + ".0 <" + M + "." + (+m + 1) + ".0";
        }
        return ret;
    });
}
// Because * is AND-ed with everything else in the comparator,
// and '' means "any version", just remove the *s entirely.
function replaceStars(comp, _options) {
    return comp.trim().replace(re[STAR], "");
}
// This function is passed to string.replace(re[HYPHENRANGE])
// M, m, patch, prerelease, build
// 1.2 - 3.4.5 => >=1.2.0 <=3.4.5
// 1.2.3 - 3.4 => >=1.2.0 <3.5.0 Any 3.4.x will do
// 1.2 - 3.4 => >=1.2.0 <3.5.0
function hyphenReplace(_$0, from, fM, fm, fp, _fpr, _fb, to, tM, tm, tp, tpr, _tb) {
    if (isX(fM)) {
        from = "";
    } else if (isX(fm)) {
        from = ">=" + fM + ".0.0";
    } else if (isX(fp)) {
        from = ">=" + fM + "." + fm + ".0";
    } else {
        from = ">=" + from;
    }
    if (isX(tM)) {
        to = "";
    } else if (isX(tm)) {
        to = "<" + (+tM + 1) + ".0.0";
    } else if (isX(tp)) {
        to = "<" + tM + "." + (+tm + 1) + ".0";
    } else if (tpr) {
        to = "<=" + tM + "." + tm + "." + tp + "-" + tpr;
    } else {
        to = "<=" + to;
    }
    return (from + " " + to).trim();
}
export function satisfies(version, range, options) {
    try {
        range = new Range(range, options);
    } catch  {
        return false;
    }
    return range.test(version);
}
export function maxSatisfying(versions, range, options) {
    //todo
    let max = null;
    let maxSV = null;
    let rangeObj;
    try {
        rangeObj = new Range(range, options);
    } catch  {
        return null;
    }
    versions.forEach((v)=>{
        if (rangeObj.test(v)) {
            // satisfies(v, range, options)
            if (!max || maxSV && maxSV.compare(v) === -1) {
                // compare(max, v, true)
                max = v;
                maxSV = new SemVer(max, options);
            }
        }
    });
    return max;
}
export function minSatisfying(versions, range, options) {
    //todo
    let min = null;
    let minSV = null;
    let rangeObj;
    try {
        rangeObj = new Range(range, options);
    } catch  {
        return null;
    }
    versions.forEach((v)=>{
        if (rangeObj.test(v)) {
            // satisfies(v, range, options)
            if (!min || minSV.compare(v) === 1) {
                // compare(min, v, true)
                min = v;
                minSV = new SemVer(min, options);
            }
        }
    });
    return min;
}
export function minVersion(range, options) {
    range = new Range(range, options);
    let minver = new SemVer("0.0.0");
    if (range.test(minver)) {
        return minver;
    }
    minver = new SemVer("0.0.0-0");
    if (range.test(minver)) {
        return minver;
    }
    minver = null;
    for(let i = 0; i < range.set.length; ++i){
        const comparators = range.set[i];
        comparators.forEach((comparator)=>{
            // Clone to avoid manipulating the comparator's semver object.
            const compver = new SemVer(comparator.semver.version);
            switch(comparator.operator){
                case ">":
                    if (compver.prerelease.length === 0) {
                        compver.patch++;
                    } else {
                        compver.prerelease.push(0);
                    }
                    compver.raw = compver.format();
                /* fallthrough */ case "":
                case ">=":
                    if (!minver || gt(minver, compver)) {
                        minver = compver;
                    }
                    break;
                case "<":
                case "<=":
                    break;
                /* istanbul ignore next */ default:
                    throw new Error("Unexpected operation: " + comparator.operator);
            }
        });
    }
    if (minver && range.test(minver)) {
        return minver;
    }
    return null;
}
export function validRange(range, options) {
    try {
        if (range === null) return null;
        // Return '*' instead of '' so that truthiness works.
        // This will throw if it's invalid anyway
        return new Range(range, options).range || "*";
    } catch  {
        return null;
    }
}
/**
 * Return true if version is less than all the versions possible in the range.
 */ export function ltr(version, range, options) {
    return outside(version, range, "<", options);
}
/**
 * Return true if version is greater than all the versions possible in the range.
 */ export function gtr(version, range, options) {
    return outside(version, range, ">", options);
}
/**
 * Return true if the version is outside the bounds of the range in either the high or low direction.
 * The hilo argument must be either the string '>' or '<'. (This is the function called by gtr and ltr.)
 */ export function outside(version, range, hilo, options) {
    version = new SemVer(version, options);
    range = new Range(range, options);
    let gtfn;
    let ltefn;
    let ltfn;
    let comp;
    let ecomp;
    switch(hilo){
        case ">":
            gtfn = gt;
            ltefn = lte;
            ltfn = lt;
            comp = ">";
            ecomp = ">=";
            break;
        case "<":
            gtfn = lt;
            ltefn = gte;
            ltfn = gt;
            comp = "<";
            ecomp = "<=";
            break;
        default:
            throw new TypeError('Must provide a hilo val of "<" or ">"');
    }
    // If it satisifes the range it is not outside
    if (satisfies(version, range, options)) {
        return false;
    }
    // From now on, variable terms are as if we're in "gtr" mode.
    // but note that everything is flipped for the "ltr" function.
    for(let i = 0; i < range.set.length; ++i){
        const comparators = range.set[i];
        let high = null;
        let low = null;
        for (let comparator of comparators){
            if (comparator.semver === ANY) {
                comparator = new Comparator(">=0.0.0");
            }
            high = high || comparator;
            low = low || comparator;
            if (gtfn(comparator.semver, high.semver, options)) {
                high = comparator;
            } else if (ltfn(comparator.semver, low.semver, options)) {
                low = comparator;
            }
        }
        if (high === null || low === null) return true;
        // If the edge version comparator has a operator then our version
        // isn't outside it
        if (high.operator === comp || high.operator === ecomp) {
            return false;
        }
        // If the lowest version comparator has an operator and our version
        // is less than it then it isn't higher than the range
        if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
            return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
            return false;
        }
    }
    return true;
}
export function prerelease(version, options) {
    const parsed = parse(version, options);
    return parsed && parsed.prerelease.length ? parsed.prerelease : null;
}
/**
 * Return true if any of the ranges comparators intersect
 */ export function intersects(range1, range2, options) {
    range1 = new Range(range1, options);
    range2 = new Range(range2, options);
    return range1.intersects(range2);
}
export default SemVer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovVXNlcnMvZGV2Ly5kZW5vL3JlcG9zL2ZyZXNoL21vZHMvZGVuby5sYW5kL2Rlbm9fc3RkQDEuMTUwLjAvc2VtdmVyL21vZC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgSXNhYWMgWi4gU2NobHVldGVyIGFuZCBDb250cmlidXRvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIElTQyBsaWNlbnNlLlxuLy8gQ29weXJpZ2h0IDIwMTgtMjAyMiB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cblxuLyoqXG4gKiBUaGUgc2VtYW50aWMgdmVyc2lvbiBwYXJzZXIuXG4gKlxuICogVGhpcyBtb2R1bGUgaXMgYnJvd3NlciBjb21wYXRpYmxlLlxuICpcbiAqIEBtb2R1bGVcbiAqL1xuXG5leHBvcnQgdHlwZSBSZWxlYXNlVHlwZSA9XG4gIHwgXCJwcmVcIlxuICB8IFwibWFqb3JcIlxuICB8IFwicHJlbWFqb3JcIlxuICB8IFwibWlub3JcIlxuICB8IFwicHJlbWlub3JcIlxuICB8IFwicGF0Y2hcIlxuICB8IFwicHJlcGF0Y2hcIlxuICB8IFwicHJlcmVsZWFzZVwiO1xuXG5leHBvcnQgdHlwZSBPcGVyYXRvciA9XG4gIHwgXCI9PT1cIlxuICB8IFwiIT09XCJcbiAgfCBcIlwiXG4gIHwgXCI9XCJcbiAgfCBcIj09XCJcbiAgfCBcIiE9XCJcbiAgfCBcIj5cIlxuICB8IFwiPj1cIlxuICB8IFwiPFwiXG4gIHwgXCI8PVwiO1xuXG5leHBvcnQgaW50ZXJmYWNlIE9wdGlvbnMge1xuICBpbmNsdWRlUHJlcmVsZWFzZT86IGJvb2xlYW47XG59XG5cbi8vIE5vdGU6IHRoaXMgaXMgdGhlIHNlbXZlci5vcmcgdmVyc2lvbiBvZiB0aGUgc3BlYyB0aGF0IGl0IGltcGxlbWVudHNcbi8vIE5vdCBuZWNlc3NhcmlseSB0aGUgcGFja2FnZSB2ZXJzaW9uIG9mIHRoaXMgY29kZS5cbmV4cG9ydCBjb25zdCBTRU1WRVJfU1BFQ19WRVJTSU9OID0gXCIyLjAuMFwiO1xuXG5jb25zdCBNQVhfTEVOR1RIID0gMjU2O1xuXG4vLyBUaGUgYWN0dWFsIHJlZ2V4cHNcbmNvbnN0IHJlOiBSZWdFeHBbXSA9IFtdO1xuY29uc3Qgc3JjOiBzdHJpbmdbXSA9IFtdO1xubGV0IFIgPSAwO1xuXG4vLyBUaGUgZm9sbG93aW5nIFJlZ3VsYXIgRXhwcmVzc2lvbnMgY2FuIGJlIHVzZWQgZm9yIHRva2VuaXppbmcsXG4vLyB2YWxpZGF0aW5nLCBhbmQgcGFyc2luZyBTZW1WZXIgdmVyc2lvbiBzdHJpbmdzLlxuXG4vLyAjIyBOdW1lcmljIElkZW50aWZpZXJcbi8vIEEgc2luZ2xlIGAwYCwgb3IgYSBub24temVybyBkaWdpdCBmb2xsb3dlZCBieSB6ZXJvIG9yIG1vcmUgZGlnaXRzLlxuXG5jb25zdCBOVU1FUklDSURFTlRJRklFUjogbnVtYmVyID0gUisrO1xuc3JjW05VTUVSSUNJREVOVElGSUVSXSA9IFwiMHxbMS05XVxcXFxkKlwiO1xuXG4vLyAjIyBOb24tbnVtZXJpYyBJZGVudGlmaWVyXG4vLyBaZXJvIG9yIG1vcmUgZGlnaXRzLCBmb2xsb3dlZCBieSBhIGxldHRlciBvciBoeXBoZW4sIGFuZCB0aGVuIHplcm8gb3Jcbi8vIG1vcmUgbGV0dGVycywgZGlnaXRzLCBvciBoeXBoZW5zLlxuXG5jb25zdCBOT05OVU1FUklDSURFTlRJRklFUjogbnVtYmVyID0gUisrO1xuc3JjW05PTk5VTUVSSUNJREVOVElGSUVSXSA9IFwiXFxcXGQqW2EtekEtWi1dW2EtekEtWjAtOS1dKlwiO1xuXG4vLyAjIyBNYWluIFZlcnNpb25cbi8vIFRocmVlIGRvdC1zZXBhcmF0ZWQgbnVtZXJpYyBpZGVudGlmaWVycy5cblxuY29uc3QgTUFJTlZFUlNJT046IG51bWJlciA9IFIrKztcbmNvbnN0IG5pZCA9IHNyY1tOVU1FUklDSURFTlRJRklFUl07XG5zcmNbTUFJTlZFUlNJT05dID0gYCgke25pZH0pXFxcXC4oJHtuaWR9KVxcXFwuKCR7bmlkfSlgO1xuXG4vLyAjIyBQcmUtcmVsZWFzZSBWZXJzaW9uIElkZW50aWZpZXJcbi8vIEEgbnVtZXJpYyBpZGVudGlmaWVyLCBvciBhIG5vbi1udW1lcmljIGlkZW50aWZpZXIuXG5cbmNvbnN0IFBSRVJFTEVBU0VJREVOVElGSUVSOiBudW1iZXIgPSBSKys7XG5zcmNbUFJFUkVMRUFTRUlERU5USUZJRVJdID0gXCIoPzpcIiArIHNyY1tOVU1FUklDSURFTlRJRklFUl0gKyBcInxcIiArXG4gIHNyY1tOT05OVU1FUklDSURFTlRJRklFUl0gKyBcIilcIjtcblxuLy8gIyMgUHJlLXJlbGVhc2UgVmVyc2lvblxuLy8gSHlwaGVuLCBmb2xsb3dlZCBieSBvbmUgb3IgbW9yZSBkb3Qtc2VwYXJhdGVkIHByZS1yZWxlYXNlIHZlcnNpb25cbi8vIGlkZW50aWZpZXJzLlxuXG5jb25zdCBQUkVSRUxFQVNFOiBudW1iZXIgPSBSKys7XG5zcmNbUFJFUkVMRUFTRV0gPSBcIig/Oi0oXCIgK1xuICBzcmNbUFJFUkVMRUFTRUlERU5USUZJRVJdICtcbiAgXCIoPzpcXFxcLlwiICtcbiAgc3JjW1BSRVJFTEVBU0VJREVOVElGSUVSXSArXG4gIFwiKSopKVwiO1xuXG4vLyAjIyBCdWlsZCBNZXRhZGF0YSBJZGVudGlmaWVyXG4vLyBBbnkgY29tYmluYXRpb24gb2YgZGlnaXRzLCBsZXR0ZXJzLCBvciBoeXBoZW5zLlxuXG5jb25zdCBCVUlMRElERU5USUZJRVI6IG51bWJlciA9IFIrKztcbnNyY1tCVUlMRElERU5USUZJRVJdID0gXCJbMC05QS1aYS16LV0rXCI7XG5cbi8vICMjIEJ1aWxkIE1ldGFkYXRhXG4vLyBQbHVzIHNpZ24sIGZvbGxvd2VkIGJ5IG9uZSBvciBtb3JlIHBlcmlvZC1zZXBhcmF0ZWQgYnVpbGQgbWV0YWRhdGFcbi8vIGlkZW50aWZpZXJzLlxuXG5jb25zdCBCVUlMRDogbnVtYmVyID0gUisrO1xuc3JjW0JVSUxEXSA9IFwiKD86XFxcXCsoXCIgKyBzcmNbQlVJTERJREVOVElGSUVSXSArIFwiKD86XFxcXC5cIiArXG4gIHNyY1tCVUlMRElERU5USUZJRVJdICsgXCIpKikpXCI7XG5cbi8vICMjIEZ1bGwgVmVyc2lvbiBTdHJpbmdcbi8vIEEgbWFpbiB2ZXJzaW9uLCBmb2xsb3dlZCBvcHRpb25hbGx5IGJ5IGEgcHJlLXJlbGVhc2UgdmVyc2lvbiBhbmRcbi8vIGJ1aWxkIG1ldGFkYXRhLlxuXG4vLyBOb3RlIHRoYXQgdGhlIG9ubHkgbWFqb3IsIG1pbm9yLCBwYXRjaCwgYW5kIHByZS1yZWxlYXNlIHNlY3Rpb25zIG9mXG4vLyB0aGUgdmVyc2lvbiBzdHJpbmcgYXJlIGNhcHR1cmluZyBncm91cHMuICBUaGUgYnVpbGQgbWV0YWRhdGEgaXMgbm90IGFcbi8vIGNhcHR1cmluZyBncm91cCwgYmVjYXVzZSBpdCBzaG91bGQgbm90IGV2ZXIgYmUgdXNlZCBpbiB2ZXJzaW9uXG4vLyBjb21wYXJpc29uLlxuXG5jb25zdCBGVUxMOiBudW1iZXIgPSBSKys7XG5jb25zdCBGVUxMUExBSU4gPSBcInY/XCIgKyBzcmNbTUFJTlZFUlNJT05dICsgc3JjW1BSRVJFTEVBU0VdICsgXCI/XCIgKyBzcmNbQlVJTERdICtcbiAgXCI/XCI7XG5cbnNyY1tGVUxMXSA9IFwiXlwiICsgRlVMTFBMQUlOICsgXCIkXCI7XG5cbmNvbnN0IEdUTFQ6IG51bWJlciA9IFIrKztcbnNyY1tHVExUXSA9IFwiKCg/Ojx8Pik/PT8pXCI7XG5cbi8vIFNvbWV0aGluZyBsaWtlIFwiMi4qXCIgb3IgXCIxLjIueFwiLlxuLy8gTm90ZSB0aGF0IFwieC54XCIgaXMgYSB2YWxpZCB4UmFuZ2UgaWRlbnRpZmVyLCBtZWFuaW5nIFwiYW55IHZlcnNpb25cIlxuLy8gT25seSB0aGUgZmlyc3QgaXRlbSBpcyBzdHJpY3RseSByZXF1aXJlZC5cbmNvbnN0IFhSQU5HRUlERU5USUZJRVI6IG51bWJlciA9IFIrKztcbnNyY1tYUkFOR0VJREVOVElGSUVSXSA9IHNyY1tOVU1FUklDSURFTlRJRklFUl0gKyBcInx4fFh8XFxcXCpcIjtcblxuY29uc3QgWFJBTkdFUExBSU46IG51bWJlciA9IFIrKztcbnNyY1tYUkFOR0VQTEFJTl0gPSBcIlt2PVxcXFxzXSooXCIgK1xuICBzcmNbWFJBTkdFSURFTlRJRklFUl0gK1xuICBcIilcIiArXG4gIFwiKD86XFxcXC4oXCIgK1xuICBzcmNbWFJBTkdFSURFTlRJRklFUl0gK1xuICBcIilcIiArXG4gIFwiKD86XFxcXC4oXCIgK1xuICBzcmNbWFJBTkdFSURFTlRJRklFUl0gK1xuICBcIilcIiArXG4gIFwiKD86XCIgK1xuICBzcmNbUFJFUkVMRUFTRV0gK1xuICBcIik/XCIgK1xuICBzcmNbQlVJTERdICtcbiAgXCI/XCIgK1xuICBcIik/KT9cIjtcblxuY29uc3QgWFJBTkdFOiBudW1iZXIgPSBSKys7XG5zcmNbWFJBTkdFXSA9IFwiXlwiICsgc3JjW0dUTFRdICsgXCJcXFxccypcIiArIHNyY1tYUkFOR0VQTEFJTl0gKyBcIiRcIjtcblxuLy8gVGlsZGUgcmFuZ2VzLlxuLy8gTWVhbmluZyBpcyBcInJlYXNvbmFibHkgYXQgb3IgZ3JlYXRlciB0aGFuXCJcbmNvbnN0IExPTkVUSUxERTogbnVtYmVyID0gUisrO1xuc3JjW0xPTkVUSUxERV0gPSBcIig/On4+PylcIjtcblxuY29uc3QgVElMREU6IG51bWJlciA9IFIrKztcbnNyY1tUSUxERV0gPSBcIl5cIiArIHNyY1tMT05FVElMREVdICsgc3JjW1hSQU5HRVBMQUlOXSArIFwiJFwiO1xuXG4vLyBDYXJldCByYW5nZXMuXG4vLyBNZWFuaW5nIGlzIFwiYXQgbGVhc3QgYW5kIGJhY2t3YXJkcyBjb21wYXRpYmxlIHdpdGhcIlxuY29uc3QgTE9ORUNBUkVUOiBudW1iZXIgPSBSKys7XG5zcmNbTE9ORUNBUkVUXSA9IFwiKD86XFxcXF4pXCI7XG5cbmNvbnN0IENBUkVUOiBudW1iZXIgPSBSKys7XG5zcmNbQ0FSRVRdID0gXCJeXCIgKyBzcmNbTE9ORUNBUkVUXSArIHNyY1tYUkFOR0VQTEFJTl0gKyBcIiRcIjtcblxuLy8gQSBzaW1wbGUgZ3QvbHQvZXEgdGhpbmcsIG9yIGp1c3QgXCJcIiB0byBpbmRpY2F0ZSBcImFueSB2ZXJzaW9uXCJcbmNvbnN0IENPTVBBUkFUT1I6IG51bWJlciA9IFIrKztcbnNyY1tDT01QQVJBVE9SXSA9IFwiXlwiICsgc3JjW0dUTFRdICsgXCJcXFxccyooXCIgKyBGVUxMUExBSU4gKyBcIikkfF4kXCI7XG5cbi8vIFNvbWV0aGluZyBsaWtlIGAxLjIuMyAtIDEuMi40YFxuY29uc3QgSFlQSEVOUkFOR0U6IG51bWJlciA9IFIrKztcbnNyY1tIWVBIRU5SQU5HRV0gPSBcIl5cXFxccyooXCIgK1xuICBzcmNbWFJBTkdFUExBSU5dICtcbiAgXCIpXCIgK1xuICBcIlxcXFxzKy1cXFxccytcIiArXG4gIFwiKFwiICtcbiAgc3JjW1hSQU5HRVBMQUlOXSArXG4gIFwiKVwiICtcbiAgXCJcXFxccyokXCI7XG5cbi8vIFN0YXIgcmFuZ2VzIGJhc2ljYWxseSBqdXN0IGFsbG93IGFueXRoaW5nIGF0IGFsbC5cbmNvbnN0IFNUQVI6IG51bWJlciA9IFIrKztcbnNyY1tTVEFSXSA9IFwiKDx8Pik/PT9cXFxccypcXFxcKlwiO1xuXG4vLyBDb21waWxlIHRvIGFjdHVhbCByZWdleHAgb2JqZWN0cy5cbi8vIEFsbCBhcmUgZmxhZy1mcmVlLCB1bmxlc3MgdGhleSB3ZXJlIGNyZWF0ZWQgYWJvdmUgd2l0aCBhIGZsYWcuXG5mb3IgKGxldCBpID0gMDsgaSA8IFI7IGkrKykge1xuICBpZiAoIXJlW2ldKSB7XG4gICAgcmVbaV0gPSBuZXcgUmVnRXhwKHNyY1tpXSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlKFxuICB2ZXJzaW9uOiBzdHJpbmcgfCBTZW1WZXIgfCBudWxsLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IFNlbVZlciB8IG51bGwge1xuICBpZiAodHlwZW9mIG9wdGlvbnMgIT09IFwib2JqZWN0XCIpIHtcbiAgICBvcHRpb25zID0ge1xuICAgICAgaW5jbHVkZVByZXJlbGVhc2U6IGZhbHNlLFxuICAgIH07XG4gIH1cblxuICBpZiAodmVyc2lvbiBpbnN0YW5jZW9mIFNlbVZlcikge1xuICAgIHJldHVybiB2ZXJzaW9uO1xuICB9XG5cbiAgaWYgKHR5cGVvZiB2ZXJzaW9uICE9PSBcInN0cmluZ1wiKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBpZiAodmVyc2lvbi5sZW5ndGggPiBNQVhfTEVOR1RIKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICBjb25zdCByOiBSZWdFeHAgPSByZVtGVUxMXTtcbiAgaWYgKCFyLnRlc3QodmVyc2lvbikpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHRyeSB7XG4gICAgcmV0dXJuIG5ldyBTZW1WZXIodmVyc2lvbiwgb3B0aW9ucyk7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZChcbiAgdmVyc2lvbjogc3RyaW5nIHwgU2VtVmVyIHwgbnVsbCxcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHZlcnNpb24gPT09IG51bGwpIHJldHVybiBudWxsO1xuICBjb25zdCB2OiBTZW1WZXIgfCBudWxsID0gcGFyc2UodmVyc2lvbiwgb3B0aW9ucyk7XG4gIHJldHVybiB2ID8gdi52ZXJzaW9uIDogbnVsbDtcbn1cblxuZXhwb3J0IGNsYXNzIFNlbVZlciB7XG4gIHJhdyE6IHN0cmluZztcbiAgb3B0aW9ucyE6IE9wdGlvbnM7XG5cbiAgbWFqb3IhOiBudW1iZXI7XG4gIG1pbm9yITogbnVtYmVyO1xuICBwYXRjaCE6IG51bWJlcjtcbiAgdmVyc2lvbiE6IHN0cmluZztcbiAgYnVpbGQhOiBSZWFkb25seUFycmF5PHN0cmluZz47XG4gIHByZXJlbGVhc2UhOiBBcnJheTxzdHJpbmcgfCBudW1iZXI+O1xuXG4gIGNvbnN0cnVjdG9yKHZlcnNpb246IHN0cmluZyB8IFNlbVZlciwgb3B0aW9ucz86IE9wdGlvbnMpIHtcbiAgICBpZiAodHlwZW9mIG9wdGlvbnMgIT09IFwib2JqZWN0XCIpIHtcbiAgICAgIG9wdGlvbnMgPSB7XG4gICAgICAgIGluY2x1ZGVQcmVyZWxlYXNlOiBmYWxzZSxcbiAgICAgIH07XG4gICAgfVxuICAgIGlmICh2ZXJzaW9uIGluc3RhbmNlb2YgU2VtVmVyKSB7XG4gICAgICB2ZXJzaW9uID0gdmVyc2lvbi52ZXJzaW9uO1xuICAgIH0gZWxzZSBpZiAodHlwZW9mIHZlcnNpb24gIT09IFwic3RyaW5nXCIpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIFZlcnNpb246IFwiICsgdmVyc2lvbik7XG4gICAgfVxuXG4gICAgaWYgKHZlcnNpb24ubGVuZ3RoID4gTUFYX0xFTkdUSCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgXCJ2ZXJzaW9uIGlzIGxvbmdlciB0aGFuIFwiICsgTUFYX0xFTkdUSCArIFwiIGNoYXJhY3RlcnNcIixcbiAgICAgICk7XG4gICAgfVxuXG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFNlbVZlcikpIHtcbiAgICAgIHJldHVybiBuZXcgU2VtVmVyKHZlcnNpb24sIG9wdGlvbnMpO1xuICAgIH1cblxuICAgIHRoaXMub3B0aW9ucyA9IG9wdGlvbnM7XG5cbiAgICBjb25zdCBtID0gdmVyc2lvbi50cmltKCkubWF0Y2gocmVbRlVMTF0pO1xuXG4gICAgaWYgKCFtKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBWZXJzaW9uOiBcIiArIHZlcnNpb24pO1xuICAgIH1cblxuICAgIHRoaXMucmF3ID0gdmVyc2lvbjtcblxuICAgIC8vIHRoZXNlIGFyZSBhY3R1YWxseSBudW1iZXJzXG4gICAgdGhpcy5tYWpvciA9ICttWzFdO1xuICAgIHRoaXMubWlub3IgPSArbVsyXTtcbiAgICB0aGlzLnBhdGNoID0gK21bM107XG5cbiAgICBpZiAodGhpcy5tYWpvciA+IE51bWJlci5NQVhfU0FGRV9JTlRFR0VSIHx8IHRoaXMubWFqb3IgPCAwKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBtYWpvciB2ZXJzaW9uXCIpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLm1pbm9yID4gTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIgfHwgdGhpcy5taW5vciA8IDApIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIG1pbm9yIHZlcnNpb25cIik7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMucGF0Y2ggPiBOdW1iZXIuTUFYX1NBRkVfSU5URUdFUiB8fCB0aGlzLnBhdGNoIDwgMCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkludmFsaWQgcGF0Y2ggdmVyc2lvblwiKTtcbiAgICB9XG5cbiAgICAvLyBudW1iZXJpZnkgYW55IHByZXJlbGVhc2UgbnVtZXJpYyBpZHNcbiAgICBpZiAoIW1bNF0pIHtcbiAgICAgIHRoaXMucHJlcmVsZWFzZSA9IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnByZXJlbGVhc2UgPSBtWzRdLnNwbGl0KFwiLlwiKS5tYXAoKGlkOiBzdHJpbmcpID0+IHtcbiAgICAgICAgaWYgKC9eWzAtOV0rJC8udGVzdChpZCkpIHtcbiAgICAgICAgICBjb25zdCBudW06IG51bWJlciA9ICtpZDtcbiAgICAgICAgICBpZiAobnVtID49IDAgJiYgbnVtIDwgTnVtYmVyLk1BWF9TQUZFX0lOVEVHRVIpIHtcbiAgICAgICAgICAgIHJldHVybiBudW07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBpZDtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHRoaXMuYnVpbGQgPSBtWzVdID8gbVs1XS5zcGxpdChcIi5cIikgOiBbXTtcbiAgICB0aGlzLmZvcm1hdCgpO1xuICB9XG5cbiAgZm9ybWF0KCk6IHN0cmluZyB7XG4gICAgdGhpcy52ZXJzaW9uID0gdGhpcy5tYWpvciArIFwiLlwiICsgdGhpcy5taW5vciArIFwiLlwiICsgdGhpcy5wYXRjaDtcbiAgICBpZiAodGhpcy5wcmVyZWxlYXNlLmxlbmd0aCkge1xuICAgICAgdGhpcy52ZXJzaW9uICs9IFwiLVwiICsgdGhpcy5wcmVyZWxlYXNlLmpvaW4oXCIuXCIpO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy52ZXJzaW9uO1xuICB9XG5cbiAgY29tcGFyZShvdGhlcjogc3RyaW5nIHwgU2VtVmVyKTogMSB8IDAgfCAtMSB7XG4gICAgaWYgKCEob3RoZXIgaW5zdGFuY2VvZiBTZW1WZXIpKSB7XG4gICAgICBvdGhlciA9IG5ldyBTZW1WZXIob3RoZXIsIHRoaXMub3B0aW9ucyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXMuY29tcGFyZU1haW4ob3RoZXIpIHx8IHRoaXMuY29tcGFyZVByZShvdGhlcik7XG4gIH1cblxuICBjb21wYXJlTWFpbihvdGhlcjogc3RyaW5nIHwgU2VtVmVyKTogMSB8IDAgfCAtMSB7XG4gICAgaWYgKCEob3RoZXIgaW5zdGFuY2VvZiBTZW1WZXIpKSB7XG4gICAgICBvdGhlciA9IG5ldyBTZW1WZXIob3RoZXIsIHRoaXMub3B0aW9ucyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIChcbiAgICAgIGNvbXBhcmVJZGVudGlmaWVycyh0aGlzLm1ham9yLCBvdGhlci5tYWpvcikgfHxcbiAgICAgIGNvbXBhcmVJZGVudGlmaWVycyh0aGlzLm1pbm9yLCBvdGhlci5taW5vcikgfHxcbiAgICAgIGNvbXBhcmVJZGVudGlmaWVycyh0aGlzLnBhdGNoLCBvdGhlci5wYXRjaClcbiAgICApO1xuICB9XG5cbiAgY29tcGFyZVByZShvdGhlcjogc3RyaW5nIHwgU2VtVmVyKTogMSB8IDAgfCAtMSB7XG4gICAgaWYgKCEob3RoZXIgaW5zdGFuY2VvZiBTZW1WZXIpKSB7XG4gICAgICBvdGhlciA9IG5ldyBTZW1WZXIob3RoZXIsIHRoaXMub3B0aW9ucyk7XG4gICAgfVxuXG4gICAgLy8gTk9UIGhhdmluZyBhIHByZXJlbGVhc2UgaXMgPiBoYXZpbmcgb25lXG4gICAgaWYgKHRoaXMucHJlcmVsZWFzZS5sZW5ndGggJiYgIW90aGVyLnByZXJlbGVhc2UubGVuZ3RoKSB7XG4gICAgICByZXR1cm4gLTE7XG4gICAgfSBlbHNlIGlmICghdGhpcy5wcmVyZWxlYXNlLmxlbmd0aCAmJiBvdGhlci5wcmVyZWxlYXNlLmxlbmd0aCkge1xuICAgICAgcmV0dXJuIDE7XG4gICAgfSBlbHNlIGlmICghdGhpcy5wcmVyZWxlYXNlLmxlbmd0aCAmJiAhb3RoZXIucHJlcmVsZWFzZS5sZW5ndGgpIHtcbiAgICAgIHJldHVybiAwO1xuICAgIH1cblxuICAgIGxldCBpID0gMDtcbiAgICBkbyB7XG4gICAgICBjb25zdCBhOiBzdHJpbmcgfCBudW1iZXIgPSB0aGlzLnByZXJlbGVhc2VbaV07XG4gICAgICBjb25zdCBiOiBzdHJpbmcgfCBudW1iZXIgPSBvdGhlci5wcmVyZWxlYXNlW2ldO1xuICAgICAgaWYgKGEgPT09IHVuZGVmaW5lZCAmJiBiID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIDA7XG4gICAgICB9IGVsc2UgaWYgKGIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH0gZWxzZSBpZiAoYSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiAtMTtcbiAgICAgIH0gZWxzZSBpZiAoYSA9PT0gYikge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBjb21wYXJlSWRlbnRpZmllcnMoYSwgYik7XG4gICAgICB9XG4gICAgfSB3aGlsZSAoKytpKTtcbiAgICByZXR1cm4gMTtcbiAgfVxuXG4gIGNvbXBhcmVCdWlsZChvdGhlcjogc3RyaW5nIHwgU2VtVmVyKTogMSB8IDAgfCAtMSB7XG4gICAgaWYgKCEob3RoZXIgaW5zdGFuY2VvZiBTZW1WZXIpKSB7XG4gICAgICBvdGhlciA9IG5ldyBTZW1WZXIob3RoZXIsIHRoaXMub3B0aW9ucyk7XG4gICAgfVxuXG4gICAgbGV0IGkgPSAwO1xuICAgIGRvIHtcbiAgICAgIGNvbnN0IGE6IHN0cmluZyA9IHRoaXMuYnVpbGRbaV07XG4gICAgICBjb25zdCBiOiBzdHJpbmcgPSBvdGhlci5idWlsZFtpXTtcbiAgICAgIGlmIChhID09PSB1bmRlZmluZWQgJiYgYiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHJldHVybiAwO1xuICAgICAgfSBlbHNlIGlmIChiID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9IGVsc2UgaWYgKGEgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICByZXR1cm4gLTE7XG4gICAgICB9IGVsc2UgaWYgKGEgPT09IGIpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gY29tcGFyZUlkZW50aWZpZXJzKGEsIGIpO1xuICAgICAgfVxuICAgIH0gd2hpbGUgKCsraSk7XG4gICAgcmV0dXJuIDE7XG4gIH1cblxuICBpbmMocmVsZWFzZTogUmVsZWFzZVR5cGUsIGlkZW50aWZpZXI/OiBzdHJpbmcpOiBTZW1WZXIge1xuICAgIHN3aXRjaCAocmVsZWFzZSkge1xuICAgICAgY2FzZSBcInByZW1ham9yXCI6XG4gICAgICAgIHRoaXMucHJlcmVsZWFzZS5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLnBhdGNoID0gMDtcbiAgICAgICAgdGhpcy5taW5vciA9IDA7XG4gICAgICAgIHRoaXMubWFqb3IrKztcbiAgICAgICAgdGhpcy5pbmMoXCJwcmVcIiwgaWRlbnRpZmllcik7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcInByZW1pbm9yXCI6XG4gICAgICAgIHRoaXMucHJlcmVsZWFzZS5sZW5ndGggPSAwO1xuICAgICAgICB0aGlzLnBhdGNoID0gMDtcbiAgICAgICAgdGhpcy5taW5vcisrO1xuICAgICAgICB0aGlzLmluYyhcInByZVwiLCBpZGVudGlmaWVyKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwicHJlcGF0Y2hcIjpcbiAgICAgICAgLy8gSWYgdGhpcyBpcyBhbHJlYWR5IGEgcHJlcmVsZWFzZSwgaXQgd2lsbCBidW1wIHRvIHRoZSBuZXh0IHZlcnNpb25cbiAgICAgICAgLy8gZHJvcCBhbnkgcHJlcmVsZWFzZXMgdGhhdCBtaWdodCBhbHJlYWR5IGV4aXN0LCBzaW5jZSB0aGV5IGFyZSBub3RcbiAgICAgICAgLy8gcmVsZXZhbnQgYXQgdGhpcyBwb2ludC5cbiAgICAgICAgdGhpcy5wcmVyZWxlYXNlLmxlbmd0aCA9IDA7XG4gICAgICAgIHRoaXMuaW5jKFwicGF0Y2hcIiwgaWRlbnRpZmllcik7XG4gICAgICAgIHRoaXMuaW5jKFwicHJlXCIsIGlkZW50aWZpZXIpO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIElmIHRoZSBpbnB1dCBpcyBhIG5vbi1wcmVyZWxlYXNlIHZlcnNpb24sIHRoaXMgYWN0cyB0aGUgc2FtZSBhc1xuICAgICAgLy8gcHJlcGF0Y2guXG4gICAgICBjYXNlIFwicHJlcmVsZWFzZVwiOlxuICAgICAgICBpZiAodGhpcy5wcmVyZWxlYXNlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMuaW5jKFwicGF0Y2hcIiwgaWRlbnRpZmllcik7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5pbmMoXCJwcmVcIiwgaWRlbnRpZmllcik7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBjYXNlIFwibWFqb3JcIjpcbiAgICAgICAgLy8gSWYgdGhpcyBpcyBhIHByZS1tYWpvciB2ZXJzaW9uLCBidW1wIHVwIHRvIHRoZSBzYW1lIG1ham9yIHZlcnNpb24uXG4gICAgICAgIC8vIE90aGVyd2lzZSBpbmNyZW1lbnQgbWFqb3IuXG4gICAgICAgIC8vIDEuMC4wLTUgYnVtcHMgdG8gMS4wLjBcbiAgICAgICAgLy8gMS4xLjAgYnVtcHMgdG8gMi4wLjBcbiAgICAgICAgaWYgKFxuICAgICAgICAgIHRoaXMubWlub3IgIT09IDAgfHxcbiAgICAgICAgICB0aGlzLnBhdGNoICE9PSAwIHx8XG4gICAgICAgICAgdGhpcy5wcmVyZWxlYXNlLmxlbmd0aCA9PT0gMFxuICAgICAgICApIHtcbiAgICAgICAgICB0aGlzLm1ham9yKys7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5taW5vciA9IDA7XG4gICAgICAgIHRoaXMucGF0Y2ggPSAwO1xuICAgICAgICB0aGlzLnByZXJlbGVhc2UgPSBbXTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIFwibWlub3JcIjpcbiAgICAgICAgLy8gSWYgdGhpcyBpcyBhIHByZS1taW5vciB2ZXJzaW9uLCBidW1wIHVwIHRvIHRoZSBzYW1lIG1pbm9yIHZlcnNpb24uXG4gICAgICAgIC8vIE90aGVyd2lzZSBpbmNyZW1lbnQgbWlub3IuXG4gICAgICAgIC8vIDEuMi4wLTUgYnVtcHMgdG8gMS4yLjBcbiAgICAgICAgLy8gMS4yLjEgYnVtcHMgdG8gMS4zLjBcbiAgICAgICAgaWYgKHRoaXMucGF0Y2ggIT09IDAgfHwgdGhpcy5wcmVyZWxlYXNlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMubWlub3IrKztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnBhdGNoID0gMDtcbiAgICAgICAgdGhpcy5wcmVyZWxlYXNlID0gW107XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSBcInBhdGNoXCI6XG4gICAgICAgIC8vIElmIHRoaXMgaXMgbm90IGEgcHJlLXJlbGVhc2UgdmVyc2lvbiwgaXQgd2lsbCBpbmNyZW1lbnQgdGhlIHBhdGNoLlxuICAgICAgICAvLyBJZiBpdCBpcyBhIHByZS1yZWxlYXNlIGl0IHdpbGwgYnVtcCB1cCB0byB0aGUgc2FtZSBwYXRjaCB2ZXJzaW9uLlxuICAgICAgICAvLyAxLjIuMC01IHBhdGNoZXMgdG8gMS4yLjBcbiAgICAgICAgLy8gMS4yLjAgcGF0Y2hlcyB0byAxLjIuMVxuICAgICAgICBpZiAodGhpcy5wcmVyZWxlYXNlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMucGF0Y2grKztcbiAgICAgICAgfVxuICAgICAgICB0aGlzLnByZXJlbGVhc2UgPSBbXTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBUaGlzIHByb2JhYmx5IHNob3VsZG4ndCBiZSB1c2VkIHB1YmxpY2x5LlxuICAgICAgLy8gMS4wLjAgXCJwcmVcIiB3b3VsZCBiZWNvbWUgMS4wLjAtMCB3aGljaCBpcyB0aGUgd3JvbmcgZGlyZWN0aW9uLlxuICAgICAgY2FzZSBcInByZVwiOlxuICAgICAgICBpZiAodGhpcy5wcmVyZWxlYXNlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHRoaXMucHJlcmVsZWFzZSA9IFswXTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBsZXQgaTogbnVtYmVyID0gdGhpcy5wcmVyZWxlYXNlLmxlbmd0aDtcbiAgICAgICAgICB3aGlsZSAoLS1pID49IDApIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdGhpcy5wcmVyZWxlYXNlW2ldID09PSBcIm51bWJlclwiKSB7XG4gICAgICAgICAgICAgIC8vIGRlbm8tZm10LWlnbm9yZVxuICAgICAgICAgICAgICAodGhpcy5wcmVyZWxlYXNlW2ldIGFzIG51bWJlcikrKztcbiAgICAgICAgICAgICAgaSA9IC0yO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaSA9PT0gLTEpIHtcbiAgICAgICAgICAgIC8vIGRpZG4ndCBpbmNyZW1lbnQgYW55dGhpbmdcbiAgICAgICAgICAgIHRoaXMucHJlcmVsZWFzZS5wdXNoKDApO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBpZiAoaWRlbnRpZmllcikge1xuICAgICAgICAgIC8vIDEuMi4wLWJldGEuMSBidW1wcyB0byAxLjIuMC1iZXRhLjIsXG4gICAgICAgICAgLy8gMS4yLjAtYmV0YS5mb29ibHogb3IgMS4yLjAtYmV0YSBidW1wcyB0byAxLjIuMC1iZXRhLjBcbiAgICAgICAgICBpZiAodGhpcy5wcmVyZWxlYXNlWzBdID09PSBpZGVudGlmaWVyKSB7XG4gICAgICAgICAgICBpZiAoaXNOYU4odGhpcy5wcmVyZWxlYXNlWzFdIGFzIG51bWJlcikpIHtcbiAgICAgICAgICAgICAgdGhpcy5wcmVyZWxlYXNlID0gW2lkZW50aWZpZXIsIDBdO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aGlzLnByZXJlbGVhc2UgPSBbaWRlbnRpZmllciwgMF07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyZWFrO1xuXG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJpbnZhbGlkIGluY3JlbWVudCBhcmd1bWVudDogXCIgKyByZWxlYXNlKTtcbiAgICB9XG4gICAgdGhpcy5mb3JtYXQoKTtcbiAgICB0aGlzLnJhdyA9IHRoaXMudmVyc2lvbjtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMudmVyc2lvbjtcbiAgfVxufVxuXG4vKipcbiAqIFJldHVybiB0aGUgdmVyc2lvbiBpbmNyZW1lbnRlZCBieSB0aGUgcmVsZWFzZSB0eXBlIChtYWpvciwgbWlub3IsIHBhdGNoLCBvciBwcmVyZWxlYXNlKSwgb3IgbnVsbCBpZiBpdCdzIG5vdCB2YWxpZC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluYyhcbiAgdmVyc2lvbjogc3RyaW5nIHwgU2VtVmVyLFxuICByZWxlYXNlOiBSZWxlYXNlVHlwZSxcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4gIGlkZW50aWZpZXI/OiBzdHJpbmcsXG4pOiBzdHJpbmcgfCBudWxsIHtcbiAgaWYgKHR5cGVvZiBvcHRpb25zID09PSBcInN0cmluZ1wiKSB7XG4gICAgaWRlbnRpZmllciA9IG9wdGlvbnM7XG4gICAgb3B0aW9ucyA9IHVuZGVmaW5lZDtcbiAgfVxuICB0cnkge1xuICAgIHJldHVybiBuZXcgU2VtVmVyKHZlcnNpb24sIG9wdGlvbnMpLmluYyhyZWxlYXNlLCBpZGVudGlmaWVyKS52ZXJzaW9uO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZGlmZihcbiAgdmVyc2lvbjE6IHN0cmluZyB8IFNlbVZlcixcbiAgdmVyc2lvbjI6IHN0cmluZyB8IFNlbVZlcixcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBSZWxlYXNlVHlwZSB8IG51bGwge1xuICBpZiAoZXEodmVyc2lvbjEsIHZlcnNpb24yLCBvcHRpb25zKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHYxOiBTZW1WZXIgfCBudWxsID0gcGFyc2UodmVyc2lvbjEpO1xuICAgIGNvbnN0IHYyOiBTZW1WZXIgfCBudWxsID0gcGFyc2UodmVyc2lvbjIpO1xuICAgIGxldCBwcmVmaXggPSBcIlwiO1xuICAgIGxldCBkZWZhdWx0UmVzdWx0OiBSZWxlYXNlVHlwZSB8IG51bGwgPSBudWxsO1xuXG4gICAgaWYgKHYxICYmIHYyKSB7XG4gICAgICBpZiAodjEucHJlcmVsZWFzZS5sZW5ndGggfHwgdjIucHJlcmVsZWFzZS5sZW5ndGgpIHtcbiAgICAgICAgcHJlZml4ID0gXCJwcmVcIjtcbiAgICAgICAgZGVmYXVsdFJlc3VsdCA9IFwicHJlcmVsZWFzZVwiO1xuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IGtleSBpbiB2MSkge1xuICAgICAgICBpZiAoa2V5ID09PSBcIm1ham9yXCIgfHwga2V5ID09PSBcIm1pbm9yXCIgfHwga2V5ID09PSBcInBhdGNoXCIpIHtcbiAgICAgICAgICBpZiAodjFba2V5XSAhPT0gdjJba2V5XSkge1xuICAgICAgICAgICAgcmV0dXJuIChwcmVmaXggKyBrZXkpIGFzIFJlbGVhc2VUeXBlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZGVmYXVsdFJlc3VsdDsgLy8gbWF5IGJlIHVuZGVmaW5lZFxuICB9XG59XG5cbmNvbnN0IG51bWVyaWMgPSAvXlswLTldKyQvO1xuXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZUlkZW50aWZpZXJzKFxuICBhOiBzdHJpbmcgfCBudW1iZXIgfCBudWxsLFxuICBiOiBzdHJpbmcgfCBudW1iZXIgfCBudWxsLFxuKTogMSB8IDAgfCAtMSB7XG4gIGNvbnN0IGFudW06IGJvb2xlYW4gPSBudW1lcmljLnRlc3QoYSBhcyBzdHJpbmcpO1xuICBjb25zdCBibnVtOiBib29sZWFuID0gbnVtZXJpYy50ZXN0KGIgYXMgc3RyaW5nKTtcblxuICBpZiAoYSA9PT0gbnVsbCB8fCBiID09PSBudWxsKSB0aHJvdyBcIkNvbXBhcmlzb24gYWdhaW5zdCBudWxsIGludmFsaWRcIjtcblxuICBpZiAoYW51bSAmJiBibnVtKSB7XG4gICAgYSA9ICthO1xuICAgIGIgPSArYjtcbiAgfVxuXG4gIHJldHVybiBhID09PSBiID8gMCA6IGFudW0gJiYgIWJudW0gPyAtMSA6IGJudW0gJiYgIWFudW0gPyAxIDogYSA8IGIgPyAtMSA6IDE7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByY29tcGFyZUlkZW50aWZpZXJzKFxuICBhOiBzdHJpbmcgfCBudWxsLFxuICBiOiBzdHJpbmcgfCBudWxsLFxuKTogMSB8IDAgfCAtMSB7XG4gIHJldHVybiBjb21wYXJlSWRlbnRpZmllcnMoYiwgYSk7XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSBtYWpvciB2ZXJzaW9uIG51bWJlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1ham9yKFxuICB2OiBzdHJpbmcgfCBTZW1WZXIsXG4gIG9wdGlvbnM/OiBPcHRpb25zLFxuKTogbnVtYmVyIHtcbiAgcmV0dXJuIG5ldyBTZW1WZXIodiwgb3B0aW9ucykubWFqb3I7XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSBtaW5vciB2ZXJzaW9uIG51bWJlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1pbm9yKFxuICB2OiBzdHJpbmcgfCBTZW1WZXIsXG4gIG9wdGlvbnM/OiBPcHRpb25zLFxuKTogbnVtYmVyIHtcbiAgcmV0dXJuIG5ldyBTZW1WZXIodiwgb3B0aW9ucykubWlub3I7XG59XG5cbi8qKlxuICogUmV0dXJuIHRoZSBwYXRjaCB2ZXJzaW9uIG51bWJlci5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhdGNoKFxuICB2OiBzdHJpbmcgfCBTZW1WZXIsXG4gIG9wdGlvbnM/OiBPcHRpb25zLFxuKTogbnVtYmVyIHtcbiAgcmV0dXJuIG5ldyBTZW1WZXIodiwgb3B0aW9ucykucGF0Y2g7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21wYXJlKFxuICB2MTogc3RyaW5nIHwgU2VtVmVyLFxuICB2Mjogc3RyaW5nIHwgU2VtVmVyLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IDEgfCAwIHwgLTEge1xuICByZXR1cm4gbmV3IFNlbVZlcih2MSwgb3B0aW9ucykuY29tcGFyZShuZXcgU2VtVmVyKHYyLCBvcHRpb25zKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21wYXJlQnVpbGQoXG4gIGE6IHN0cmluZyB8IFNlbVZlcixcbiAgYjogc3RyaW5nIHwgU2VtVmVyLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IDEgfCAwIHwgLTEge1xuICBjb25zdCB2ZXJzaW9uQSA9IG5ldyBTZW1WZXIoYSwgb3B0aW9ucyk7XG4gIGNvbnN0IHZlcnNpb25CID0gbmV3IFNlbVZlcihiLCBvcHRpb25zKTtcbiAgcmV0dXJuIHZlcnNpb25BLmNvbXBhcmUodmVyc2lvbkIpIHx8IHZlcnNpb25BLmNvbXBhcmVCdWlsZCh2ZXJzaW9uQik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByY29tcGFyZShcbiAgdjE6IHN0cmluZyB8IFNlbVZlcixcbiAgdjI6IHN0cmluZyB8IFNlbVZlcixcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiAxIHwgMCB8IC0xIHtcbiAgcmV0dXJuIGNvbXBhcmUodjIsIHYxLCBvcHRpb25zKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNvcnQ8VCBleHRlbmRzIHN0cmluZyB8IFNlbVZlcj4oXG4gIGxpc3Q6IFRbXSxcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBUW10ge1xuICByZXR1cm4gbGlzdC5zb3J0KChhLCBiKSA9PiB7XG4gICAgcmV0dXJuIGNvbXBhcmVCdWlsZChhLCBiLCBvcHRpb25zKTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByc29ydDxUIGV4dGVuZHMgc3RyaW5nIHwgU2VtVmVyPihcbiAgbGlzdDogVFtdLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IFRbXSB7XG4gIHJldHVybiBsaXN0LnNvcnQoKGEsIGIpID0+IHtcbiAgICByZXR1cm4gY29tcGFyZUJ1aWxkKGIsIGEsIG9wdGlvbnMpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGd0KFxuICB2MTogc3RyaW5nIHwgU2VtVmVyLFxuICB2Mjogc3RyaW5nIHwgU2VtVmVyLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IGJvb2xlYW4ge1xuICByZXR1cm4gY29tcGFyZSh2MSwgdjIsIG9wdGlvbnMpID4gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGx0KFxuICB2MTogc3RyaW5nIHwgU2VtVmVyLFxuICB2Mjogc3RyaW5nIHwgU2VtVmVyLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IGJvb2xlYW4ge1xuICByZXR1cm4gY29tcGFyZSh2MSwgdjIsIG9wdGlvbnMpIDwgMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGVxKFxuICB2MTogc3RyaW5nIHwgU2VtVmVyLFxuICB2Mjogc3RyaW5nIHwgU2VtVmVyLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IGJvb2xlYW4ge1xuICByZXR1cm4gY29tcGFyZSh2MSwgdjIsIG9wdGlvbnMpID09PSAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbmVxKFxuICB2MTogc3RyaW5nIHwgU2VtVmVyLFxuICB2Mjogc3RyaW5nIHwgU2VtVmVyLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IGJvb2xlYW4ge1xuICByZXR1cm4gY29tcGFyZSh2MSwgdjIsIG9wdGlvbnMpICE9PSAwO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ3RlKFxuICB2MTogc3RyaW5nIHwgU2VtVmVyLFxuICB2Mjogc3RyaW5nIHwgU2VtVmVyLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IGJvb2xlYW4ge1xuICByZXR1cm4gY29tcGFyZSh2MSwgdjIsIG9wdGlvbnMpID49IDA7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsdGUoXG4gIHYxOiBzdHJpbmcgfCBTZW1WZXIsXG4gIHYyOiBzdHJpbmcgfCBTZW1WZXIsXG4gIG9wdGlvbnM/OiBPcHRpb25zLFxuKTogYm9vbGVhbiB7XG4gIHJldHVybiBjb21wYXJlKHYxLCB2Miwgb3B0aW9ucykgPD0gMDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNtcChcbiAgdjE6IHN0cmluZyB8IFNlbVZlcixcbiAgb3BlcmF0b3I6IE9wZXJhdG9yLFxuICB2Mjogc3RyaW5nIHwgU2VtVmVyLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IGJvb2xlYW4ge1xuICBzd2l0Y2ggKG9wZXJhdG9yKSB7XG4gICAgY2FzZSBcIj09PVwiOlxuICAgICAgaWYgKHR5cGVvZiB2MSA9PT0gXCJvYmplY3RcIikgdjEgPSB2MS52ZXJzaW9uO1xuICAgICAgaWYgKHR5cGVvZiB2MiA9PT0gXCJvYmplY3RcIikgdjIgPSB2Mi52ZXJzaW9uO1xuICAgICAgcmV0dXJuIHYxID09PSB2MjtcblxuICAgIGNhc2UgXCIhPT1cIjpcbiAgICAgIGlmICh0eXBlb2YgdjEgPT09IFwib2JqZWN0XCIpIHYxID0gdjEudmVyc2lvbjtcbiAgICAgIGlmICh0eXBlb2YgdjIgPT09IFwib2JqZWN0XCIpIHYyID0gdjIudmVyc2lvbjtcbiAgICAgIHJldHVybiB2MSAhPT0gdjI7XG5cbiAgICBjYXNlIFwiXCI6XG4gICAgY2FzZSBcIj1cIjpcbiAgICBjYXNlIFwiPT1cIjpcbiAgICAgIHJldHVybiBlcSh2MSwgdjIsIG9wdGlvbnMpO1xuXG4gICAgY2FzZSBcIiE9XCI6XG4gICAgICByZXR1cm4gbmVxKHYxLCB2Miwgb3B0aW9ucyk7XG5cbiAgICBjYXNlIFwiPlwiOlxuICAgICAgcmV0dXJuIGd0KHYxLCB2Miwgb3B0aW9ucyk7XG5cbiAgICBjYXNlIFwiPj1cIjpcbiAgICAgIHJldHVybiBndGUodjEsIHYyLCBvcHRpb25zKTtcblxuICAgIGNhc2UgXCI8XCI6XG4gICAgICByZXR1cm4gbHQodjEsIHYyLCBvcHRpb25zKTtcblxuICAgIGNhc2UgXCI8PVwiOlxuICAgICAgcmV0dXJuIGx0ZSh2MSwgdjIsIG9wdGlvbnMpO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIG9wZXJhdG9yOiBcIiArIG9wZXJhdG9yKTtcbiAgfVxufVxuXG5jb25zdCBBTlk6IFNlbVZlciA9IHt9IGFzIFNlbVZlcjtcblxuZXhwb3J0IGNsYXNzIENvbXBhcmF0b3Ige1xuICBzZW12ZXIhOiBTZW1WZXI7XG4gIG9wZXJhdG9yITogXCJcIiB8IFwiPVwiIHwgXCI8XCIgfCBcIj5cIiB8IFwiPD1cIiB8IFwiPj1cIjtcbiAgdmFsdWUhOiBzdHJpbmc7XG4gIG9wdGlvbnMhOiBPcHRpb25zO1xuXG4gIGNvbnN0cnVjdG9yKGNvbXA6IHN0cmluZyB8IENvbXBhcmF0b3IsIG9wdGlvbnM/OiBPcHRpb25zKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zICE9PSBcIm9iamVjdFwiKSB7XG4gICAgICBvcHRpb25zID0ge1xuICAgICAgICBpbmNsdWRlUHJlcmVsZWFzZTogZmFsc2UsXG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmIChjb21wIGluc3RhbmNlb2YgQ29tcGFyYXRvcikge1xuICAgICAgcmV0dXJuIGNvbXA7XG4gICAgfVxuXG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIENvbXBhcmF0b3IpKSB7XG4gICAgICByZXR1cm4gbmV3IENvbXBhcmF0b3IoY29tcCwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLnBhcnNlKGNvbXApO1xuXG4gICAgaWYgKHRoaXMuc2VtdmVyID09PSBBTlkpIHtcbiAgICAgIHRoaXMudmFsdWUgPSBcIlwiO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnZhbHVlID0gdGhpcy5vcGVyYXRvciArIHRoaXMuc2VtdmVyLnZlcnNpb247XG4gICAgfVxuICB9XG5cbiAgcGFyc2UoY29tcDogc3RyaW5nKTogdm9pZCB7XG4gICAgY29uc3QgciA9IHJlW0NPTVBBUkFUT1JdO1xuICAgIGNvbnN0IG0gPSBjb21wLm1hdGNoKHIpO1xuXG4gICAgaWYgKCFtKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiSW52YWxpZCBjb21wYXJhdG9yOiBcIiArIGNvbXApO1xuICAgIH1cblxuICAgIGNvbnN0IG0xID0gbVsxXSBhcyBcIlwiIHwgXCI9XCIgfCBcIjxcIiB8IFwiPlwiIHwgXCI8PVwiIHwgXCI+PVwiO1xuICAgIHRoaXMub3BlcmF0b3IgPSBtMSAhPT0gdW5kZWZpbmVkID8gbTEgOiBcIlwiO1xuXG4gICAgaWYgKHRoaXMub3BlcmF0b3IgPT09IFwiPVwiKSB7XG4gICAgICB0aGlzLm9wZXJhdG9yID0gXCJcIjtcbiAgICB9XG5cbiAgICAvLyBpZiBpdCBsaXRlcmFsbHkgaXMganVzdCAnPicgb3IgJycgdGhlbiBhbGxvdyBhbnl0aGluZy5cbiAgICBpZiAoIW1bMl0pIHtcbiAgICAgIHRoaXMuc2VtdmVyID0gQU5ZO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNlbXZlciA9IG5ldyBTZW1WZXIobVsyXSwgdGhpcy5vcHRpb25zKTtcbiAgICB9XG4gIH1cblxuICB0ZXN0KHZlcnNpb246IHN0cmluZyB8IFNlbVZlcik6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLnNlbXZlciA9PT0gQU5ZIHx8IHZlcnNpb24gPT09IEFOWSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB2ZXJzaW9uID09PSBcInN0cmluZ1wiKSB7XG4gICAgICB2ZXJzaW9uID0gbmV3IFNlbVZlcih2ZXJzaW9uLCB0aGlzLm9wdGlvbnMpO1xuICAgIH1cblxuICAgIHJldHVybiBjbXAodmVyc2lvbiwgdGhpcy5vcGVyYXRvciwgdGhpcy5zZW12ZXIsIHRoaXMub3B0aW9ucyk7XG4gIH1cblxuICBpbnRlcnNlY3RzKGNvbXA6IENvbXBhcmF0b3IsIG9wdGlvbnM/OiBPcHRpb25zKTogYm9vbGVhbiB7XG4gICAgaWYgKCEoY29tcCBpbnN0YW5jZW9mIENvbXBhcmF0b3IpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYSBDb21wYXJhdG9yIGlzIHJlcXVpcmVkXCIpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2Ygb3B0aW9ucyAhPT0gXCJvYmplY3RcIikge1xuICAgICAgb3B0aW9ucyA9IHtcbiAgICAgICAgaW5jbHVkZVByZXJlbGVhc2U6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBsZXQgcmFuZ2VUbXA6IFJhbmdlO1xuXG4gICAgaWYgKHRoaXMub3BlcmF0b3IgPT09IFwiXCIpIHtcbiAgICAgIGlmICh0aGlzLnZhbHVlID09PSBcIlwiKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgcmFuZ2VUbXAgPSBuZXcgUmFuZ2UoY29tcC52YWx1ZSwgb3B0aW9ucyk7XG4gICAgICByZXR1cm4gc2F0aXNmaWVzKHRoaXMudmFsdWUsIHJhbmdlVG1wLCBvcHRpb25zKTtcbiAgICB9IGVsc2UgaWYgKGNvbXAub3BlcmF0b3IgPT09IFwiXCIpIHtcbiAgICAgIGlmIChjb21wLnZhbHVlID09PSBcIlwiKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgICAgcmFuZ2VUbXAgPSBuZXcgUmFuZ2UodGhpcy52YWx1ZSwgb3B0aW9ucyk7XG4gICAgICByZXR1cm4gc2F0aXNmaWVzKGNvbXAuc2VtdmVyLCByYW5nZVRtcCwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc2FtZURpcmVjdGlvbkluY3JlYXNpbmc6IGJvb2xlYW4gPVxuICAgICAgKHRoaXMub3BlcmF0b3IgPT09IFwiPj1cIiB8fCB0aGlzLm9wZXJhdG9yID09PSBcIj5cIikgJiZcbiAgICAgIChjb21wLm9wZXJhdG9yID09PSBcIj49XCIgfHwgY29tcC5vcGVyYXRvciA9PT0gXCI+XCIpO1xuICAgIGNvbnN0IHNhbWVEaXJlY3Rpb25EZWNyZWFzaW5nOiBib29sZWFuID1cbiAgICAgICh0aGlzLm9wZXJhdG9yID09PSBcIjw9XCIgfHwgdGhpcy5vcGVyYXRvciA9PT0gXCI8XCIpICYmXG4gICAgICAoY29tcC5vcGVyYXRvciA9PT0gXCI8PVwiIHx8IGNvbXAub3BlcmF0b3IgPT09IFwiPFwiKTtcbiAgICBjb25zdCBzYW1lU2VtVmVyOiBib29sZWFuID0gdGhpcy5zZW12ZXIudmVyc2lvbiA9PT0gY29tcC5zZW12ZXIudmVyc2lvbjtcbiAgICBjb25zdCBkaWZmZXJlbnREaXJlY3Rpb25zSW5jbHVzaXZlOiBib29sZWFuID1cbiAgICAgICh0aGlzLm9wZXJhdG9yID09PSBcIj49XCIgfHwgdGhpcy5vcGVyYXRvciA9PT0gXCI8PVwiKSAmJlxuICAgICAgKGNvbXAub3BlcmF0b3IgPT09IFwiPj1cIiB8fCBjb21wLm9wZXJhdG9yID09PSBcIjw9XCIpO1xuICAgIGNvbnN0IG9wcG9zaXRlRGlyZWN0aW9uc0xlc3NUaGFuOiBib29sZWFuID1cbiAgICAgIGNtcCh0aGlzLnNlbXZlciwgXCI8XCIsIGNvbXAuc2VtdmVyLCBvcHRpb25zKSAmJlxuICAgICAgKHRoaXMub3BlcmF0b3IgPT09IFwiPj1cIiB8fCB0aGlzLm9wZXJhdG9yID09PSBcIj5cIikgJiZcbiAgICAgIChjb21wLm9wZXJhdG9yID09PSBcIjw9XCIgfHwgY29tcC5vcGVyYXRvciA9PT0gXCI8XCIpO1xuICAgIGNvbnN0IG9wcG9zaXRlRGlyZWN0aW9uc0dyZWF0ZXJUaGFuOiBib29sZWFuID1cbiAgICAgIGNtcCh0aGlzLnNlbXZlciwgXCI+XCIsIGNvbXAuc2VtdmVyLCBvcHRpb25zKSAmJlxuICAgICAgKHRoaXMub3BlcmF0b3IgPT09IFwiPD1cIiB8fCB0aGlzLm9wZXJhdG9yID09PSBcIjxcIikgJiZcbiAgICAgIChjb21wLm9wZXJhdG9yID09PSBcIj49XCIgfHwgY29tcC5vcGVyYXRvciA9PT0gXCI+XCIpO1xuXG4gICAgcmV0dXJuIChcbiAgICAgIHNhbWVEaXJlY3Rpb25JbmNyZWFzaW5nIHx8XG4gICAgICBzYW1lRGlyZWN0aW9uRGVjcmVhc2luZyB8fFxuICAgICAgKHNhbWVTZW1WZXIgJiYgZGlmZmVyZW50RGlyZWN0aW9uc0luY2x1c2l2ZSkgfHxcbiAgICAgIG9wcG9zaXRlRGlyZWN0aW9uc0xlc3NUaGFuIHx8XG4gICAgICBvcHBvc2l0ZURpcmVjdGlvbnNHcmVhdGVyVGhhblxuICAgICk7XG4gIH1cblxuICB0b1N0cmluZygpOiBzdHJpbmcge1xuICAgIHJldHVybiB0aGlzLnZhbHVlO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBSYW5nZSB7XG4gIHJhbmdlITogc3RyaW5nO1xuICByYXchOiBzdHJpbmc7XG4gIG9wdGlvbnMhOiBPcHRpb25zO1xuICBpbmNsdWRlUHJlcmVsZWFzZSE6IGJvb2xlYW47XG4gIHNldCE6IFJlYWRvbmx5QXJyYXk8UmVhZG9ubHlBcnJheTxDb21wYXJhdG9yPj47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgcmFuZ2U6IHN0cmluZyB8IFJhbmdlIHwgQ29tcGFyYXRvcixcbiAgICBvcHRpb25zPzogT3B0aW9ucyxcbiAgKSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zICE9PSBcIm9iamVjdFwiKSB7XG4gICAgICBvcHRpb25zID0ge1xuICAgICAgICBpbmNsdWRlUHJlcmVsZWFzZTogZmFsc2UsXG4gICAgICB9O1xuICAgIH1cblxuICAgIGlmIChyYW5nZSBpbnN0YW5jZW9mIFJhbmdlKSB7XG4gICAgICBpZiAoXG4gICAgICAgIHJhbmdlLmluY2x1ZGVQcmVyZWxlYXNlID09PSAhIW9wdGlvbnMuaW5jbHVkZVByZXJlbGVhc2VcbiAgICAgICkge1xuICAgICAgICByZXR1cm4gcmFuZ2U7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gbmV3IFJhbmdlKHJhbmdlLnJhdywgb3B0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHJhbmdlIGluc3RhbmNlb2YgQ29tcGFyYXRvcikge1xuICAgICAgcmV0dXJuIG5ldyBSYW5nZShyYW5nZS52YWx1ZSwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIFJhbmdlKSkge1xuICAgICAgcmV0dXJuIG5ldyBSYW5nZShyYW5nZSwgb3B0aW9ucyk7XG4gICAgfVxuXG4gICAgdGhpcy5vcHRpb25zID0gb3B0aW9ucztcbiAgICB0aGlzLmluY2x1ZGVQcmVyZWxlYXNlID0gISFvcHRpb25zLmluY2x1ZGVQcmVyZWxlYXNlO1xuXG4gICAgLy8gRmlyc3QsIHNwbGl0IGJhc2VkIG9uIGJvb2xlYW4gb3IgfHxcbiAgICB0aGlzLnJhdyA9IHJhbmdlO1xuICAgIHRoaXMuc2V0ID0gcmFuZ2VcbiAgICAgIC5zcGxpdCgvXFxzKlxcfFxcfFxccyovKVxuICAgICAgLm1hcCgocmFuZ2UpID0+IHRoaXMucGFyc2VSYW5nZShyYW5nZS50cmltKCkpKVxuICAgICAgLmZpbHRlcigoYykgPT4ge1xuICAgICAgICAvLyB0aHJvdyBvdXQgYW55IHRoYXQgYXJlIG5vdCByZWxldmFudCBmb3Igd2hhdGV2ZXIgcmVhc29uXG4gICAgICAgIHJldHVybiBjLmxlbmd0aDtcbiAgICAgIH0pO1xuXG4gICAgaWYgKCF0aGlzLnNldC5sZW5ndGgpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJJbnZhbGlkIFNlbVZlciBSYW5nZTogXCIgKyByYW5nZSk7XG4gICAgfVxuXG4gICAgdGhpcy5mb3JtYXQoKTtcbiAgfVxuXG4gIGZvcm1hdCgpOiBzdHJpbmcge1xuICAgIHRoaXMucmFuZ2UgPSB0aGlzLnNldFxuICAgICAgLm1hcCgoY29tcHMpID0+IGNvbXBzLmpvaW4oXCIgXCIpLnRyaW0oKSlcbiAgICAgIC5qb2luKFwifHxcIilcbiAgICAgIC50cmltKCk7XG4gICAgcmV0dXJuIHRoaXMucmFuZ2U7XG4gIH1cblxuICBwYXJzZVJhbmdlKHJhbmdlOiBzdHJpbmcpOiBSZWFkb25seUFycmF5PENvbXBhcmF0b3I+IHtcbiAgICByYW5nZSA9IHJhbmdlLnRyaW0oKTtcbiAgICAvLyBgMS4yLjMgLSAxLjIuNGAgPT4gYD49MS4yLjMgPD0xLjIuNGBcbiAgICBjb25zdCBocjogUmVnRXhwID0gcmVbSFlQSEVOUkFOR0VdO1xuICAgIHJhbmdlID0gcmFuZ2UucmVwbGFjZShociwgaHlwaGVuUmVwbGFjZSk7XG5cbiAgICAvLyBub3JtYWxpemUgc3BhY2VzXG4gICAgcmFuZ2UgPSByYW5nZS5zcGxpdCgvXFxzKy8pLmpvaW4oXCIgXCIpO1xuXG4gICAgLy8gQXQgdGhpcyBwb2ludCwgdGhlIHJhbmdlIGlzIGNvbXBsZXRlbHkgdHJpbW1lZCBhbmRcbiAgICAvLyByZWFkeSB0byBiZSBzcGxpdCBpbnRvIGNvbXBhcmF0b3JzLlxuXG4gICAgY29uc3Qgc2V0OiBzdHJpbmdbXSA9IHJhbmdlXG4gICAgICAuc3BsaXQoXCIgXCIpXG4gICAgICAubWFwKChjb21wKSA9PiBwYXJzZUNvbXBhcmF0b3IoY29tcCwgdGhpcy5vcHRpb25zKSlcbiAgICAgIC5qb2luKFwiIFwiKVxuICAgICAgLnNwbGl0KC9cXHMrLyk7XG5cbiAgICByZXR1cm4gc2V0Lm1hcCgoY29tcCkgPT4gbmV3IENvbXBhcmF0b3IoY29tcCwgdGhpcy5vcHRpb25zKSk7XG4gIH1cblxuICB0ZXN0KHZlcnNpb246IHN0cmluZyB8IFNlbVZlcik6IGJvb2xlYW4ge1xuICAgIGlmICh0eXBlb2YgdmVyc2lvbiA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgdmVyc2lvbiA9IG5ldyBTZW1WZXIodmVyc2lvbiwgdGhpcy5vcHRpb25zKTtcbiAgICB9XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc2V0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBpZiAodGVzdFNldCh0aGlzLnNldFtpXSwgdmVyc2lvbiwgdGhpcy5vcHRpb25zKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgaW50ZXJzZWN0cyhyYW5nZT86IFJhbmdlLCBvcHRpb25zPzogT3B0aW9ucyk6IGJvb2xlYW4ge1xuICAgIGlmICghKHJhbmdlIGluc3RhbmNlb2YgUmFuZ2UpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYSBSYW5nZSBpcyByZXF1aXJlZFwiKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcy5zZXQuc29tZSgodGhpc0NvbXBhcmF0b3JzKSA9PiB7XG4gICAgICByZXR1cm4gKFxuICAgICAgICBpc1NhdGlzZmlhYmxlKHRoaXNDb21wYXJhdG9ycywgb3B0aW9ucykgJiZcbiAgICAgICAgcmFuZ2Uuc2V0LnNvbWUoKHJhbmdlQ29tcGFyYXRvcnMpID0+IHtcbiAgICAgICAgICByZXR1cm4gKFxuICAgICAgICAgICAgaXNTYXRpc2ZpYWJsZShyYW5nZUNvbXBhcmF0b3JzLCBvcHRpb25zKSAmJlxuICAgICAgICAgICAgdGhpc0NvbXBhcmF0b3JzLmV2ZXJ5KCh0aGlzQ29tcGFyYXRvcikgPT4ge1xuICAgICAgICAgICAgICByZXR1cm4gcmFuZ2VDb21wYXJhdG9ycy5ldmVyeSgocmFuZ2VDb21wYXJhdG9yKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXNDb21wYXJhdG9yLmludGVyc2VjdHMoXG4gICAgICAgICAgICAgICAgICByYW5nZUNvbXBhcmF0b3IsXG4gICAgICAgICAgICAgICAgICBvcHRpb25zLFxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApO1xuICAgICAgICB9KVxuICAgICAgKTtcbiAgICB9KTtcbiAgfVxuXG4gIHRvU3RyaW5nKCk6IHN0cmluZyB7XG4gICAgcmV0dXJuIHRoaXMucmFuZ2U7XG4gIH1cbn1cblxuZnVuY3Rpb24gdGVzdFNldChcbiAgc2V0OiBSZWFkb25seUFycmF5PENvbXBhcmF0b3I+LFxuICB2ZXJzaW9uOiBTZW1WZXIsXG4gIG9wdGlvbnM6IE9wdGlvbnMsXG4pOiBib29sZWFuIHtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzZXQubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoIXNldFtpXS50ZXN0KHZlcnNpb24pKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG5cbiAgaWYgKHZlcnNpb24ucHJlcmVsZWFzZS5sZW5ndGggJiYgIW9wdGlvbnMuaW5jbHVkZVByZXJlbGVhc2UpIHtcbiAgICAvLyBGaW5kIHRoZSBzZXQgb2YgdmVyc2lvbnMgdGhhdCBhcmUgYWxsb3dlZCB0byBoYXZlIHByZXJlbGVhc2VzXG4gICAgLy8gRm9yIGV4YW1wbGUsIF4xLjIuMy1wci4xIGRlc3VnYXJzIHRvID49MS4yLjMtcHIuMSA8Mi4wLjBcbiAgICAvLyBUaGF0IHNob3VsZCBhbGxvdyBgMS4yLjMtcHIuMmAgdG8gcGFzcy5cbiAgICAvLyBIb3dldmVyLCBgMS4yLjQtYWxwaGEubm90cmVhZHlgIHNob3VsZCBOT1QgYmUgYWxsb3dlZCxcbiAgICAvLyBldmVuIHRob3VnaCBpdCdzIHdpdGhpbiB0aGUgcmFuZ2Ugc2V0IGJ5IHRoZSBjb21wYXJhdG9ycy5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHNldC5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHNldFtpXS5zZW12ZXIgPT09IEFOWSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaWYgKHNldFtpXS5zZW12ZXIucHJlcmVsZWFzZS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IGFsbG93ZWQ6IFNlbVZlciA9IHNldFtpXS5zZW12ZXI7XG4gICAgICAgIGlmIChcbiAgICAgICAgICBhbGxvd2VkLm1ham9yID09PSB2ZXJzaW9uLm1ham9yICYmXG4gICAgICAgICAgYWxsb3dlZC5taW5vciA9PT0gdmVyc2lvbi5taW5vciAmJlxuICAgICAgICAgIGFsbG93ZWQucGF0Y2ggPT09IHZlcnNpb24ucGF0Y2hcbiAgICAgICAgKSB7XG4gICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBWZXJzaW9uIGhhcyBhIC1wcmUsIGJ1dCBpdCdzIG5vdCBvbmUgb2YgdGhlIG9uZXMgd2UgbGlrZS5cbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLy8gdGFrZSBhIHNldCBvZiBjb21wYXJhdG9ycyBhbmQgZGV0ZXJtaW5lIHdoZXRoZXIgdGhlcmVcbi8vIGV4aXN0cyBhIHZlcnNpb24gd2hpY2ggY2FuIHNhdGlzZnkgaXRcbmZ1bmN0aW9uIGlzU2F0aXNmaWFibGUoXG4gIGNvbXBhcmF0b3JzOiByZWFkb25seSBDb21wYXJhdG9yW10sXG4gIG9wdGlvbnM/OiBPcHRpb25zLFxuKTogYm9vbGVhbiB7XG4gIGxldCByZXN1bHQgPSB0cnVlO1xuICBjb25zdCByZW1haW5pbmdDb21wYXJhdG9yczogQ29tcGFyYXRvcltdID0gY29tcGFyYXRvcnMuc2xpY2UoKTtcbiAgbGV0IHRlc3RDb21wYXJhdG9yID0gcmVtYWluaW5nQ29tcGFyYXRvcnMucG9wKCk7XG5cbiAgd2hpbGUgKHJlc3VsdCAmJiByZW1haW5pbmdDb21wYXJhdG9ycy5sZW5ndGgpIHtcbiAgICByZXN1bHQgPSByZW1haW5pbmdDb21wYXJhdG9ycy5ldmVyeSgob3RoZXJDb21wYXJhdG9yKSA9PiB7XG4gICAgICByZXR1cm4gdGVzdENvbXBhcmF0b3I/LmludGVyc2VjdHMob3RoZXJDb21wYXJhdG9yLCBvcHRpb25zKTtcbiAgICB9KTtcblxuICAgIHRlc3RDb21wYXJhdG9yID0gcmVtYWluaW5nQ29tcGFyYXRvcnMucG9wKCk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vLyBNb3N0bHkganVzdCBmb3IgdGVzdGluZyBhbmQgbGVnYWN5IEFQSSByZWFzb25zXG5leHBvcnQgZnVuY3Rpb24gdG9Db21wYXJhdG9ycyhcbiAgcmFuZ2U6IHN0cmluZyB8IFJhbmdlLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IHN0cmluZ1tdW10ge1xuICByZXR1cm4gbmV3IFJhbmdlKHJhbmdlLCBvcHRpb25zKS5zZXQubWFwKChjb21wKSA9PiB7XG4gICAgcmV0dXJuIGNvbXBcbiAgICAgIC5tYXAoKGMpID0+IGMudmFsdWUpXG4gICAgICAuam9pbihcIiBcIilcbiAgICAgIC50cmltKClcbiAgICAgIC5zcGxpdChcIiBcIik7XG4gIH0pO1xufVxuXG4vLyBjb21wcmlzZWQgb2YgeHJhbmdlcywgdGlsZGVzLCBzdGFycywgYW5kIGd0bHQncyBhdCB0aGlzIHBvaW50LlxuLy8gYWxyZWFkeSByZXBsYWNlZCB0aGUgaHlwaGVuIHJhbmdlc1xuLy8gdHVybiBpbnRvIGEgc2V0IG9mIEpVU1QgY29tcGFyYXRvcnMuXG5mdW5jdGlvbiBwYXJzZUNvbXBhcmF0b3IoY29tcDogc3RyaW5nLCBvcHRpb25zOiBPcHRpb25zKTogc3RyaW5nIHtcbiAgY29tcCA9IHJlcGxhY2VDYXJldHMoY29tcCwgb3B0aW9ucyk7XG4gIGNvbXAgPSByZXBsYWNlVGlsZGVzKGNvbXAsIG9wdGlvbnMpO1xuICBjb21wID0gcmVwbGFjZVhSYW5nZXMoY29tcCwgb3B0aW9ucyk7XG4gIGNvbXAgPSByZXBsYWNlU3RhcnMoY29tcCwgb3B0aW9ucyk7XG4gIHJldHVybiBjb21wO1xufVxuXG5mdW5jdGlvbiBpc1goaWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICByZXR1cm4gIWlkIHx8IGlkLnRvTG93ZXJDYXNlKCkgPT09IFwieFwiIHx8IGlkID09PSBcIipcIjtcbn1cblxuLy8gfiwgfj4gLS0+ICogKGFueSwga2luZGEgc2lsbHkpXG4vLyB+MiwgfjIueCwgfjIueC54LCB+PjIsIH4+Mi54IH4+Mi54LnggLS0+ID49Mi4wLjAgPDMuMC4wXG4vLyB+Mi4wLCB+Mi4wLngsIH4+Mi4wLCB+PjIuMC54IC0tPiA+PTIuMC4wIDwyLjEuMFxuLy8gfjEuMiwgfjEuMi54LCB+PjEuMiwgfj4xLjIueCAtLT4gPj0xLjIuMCA8MS4zLjBcbi8vIH4xLjIuMywgfj4xLjIuMyAtLT4gPj0xLjIuMyA8MS4zLjBcbi8vIH4xLjIuMCwgfj4xLjIuMCAtLT4gPj0xLjIuMCA8MS4zLjBcbmZ1bmN0aW9uIHJlcGxhY2VUaWxkZXMoY29tcDogc3RyaW5nLCBvcHRpb25zOiBPcHRpb25zKTogc3RyaW5nIHtcbiAgcmV0dXJuIGNvbXBcbiAgICAudHJpbSgpXG4gICAgLnNwbGl0KC9cXHMrLylcbiAgICAubWFwKChjb21wKSA9PiByZXBsYWNlVGlsZGUoY29tcCwgb3B0aW9ucykpXG4gICAgLmpvaW4oXCIgXCIpO1xufVxuXG5mdW5jdGlvbiByZXBsYWNlVGlsZGUoY29tcDogc3RyaW5nLCBfb3B0aW9uczogT3B0aW9ucyk6IHN0cmluZyB7XG4gIGNvbnN0IHI6IFJlZ0V4cCA9IHJlW1RJTERFXTtcbiAgcmV0dXJuIGNvbXAucmVwbGFjZShcbiAgICByLFxuICAgIChfOiBzdHJpbmcsIE06IHN0cmluZywgbTogc3RyaW5nLCBwOiBzdHJpbmcsIHByOiBzdHJpbmcpID0+IHtcbiAgICAgIGxldCByZXQ6IHN0cmluZztcblxuICAgICAgaWYgKGlzWChNKSkge1xuICAgICAgICByZXQgPSBcIlwiO1xuICAgICAgfSBlbHNlIGlmIChpc1gobSkpIHtcbiAgICAgICAgcmV0ID0gXCI+PVwiICsgTSArIFwiLjAuMCA8XCIgKyAoK00gKyAxKSArIFwiLjAuMFwiO1xuICAgICAgfSBlbHNlIGlmIChpc1gocCkpIHtcbiAgICAgICAgLy8gfjEuMiA9PSA+PTEuMi4wIDwxLjMuMFxuICAgICAgICByZXQgPSBcIj49XCIgKyBNICsgXCIuXCIgKyBtICsgXCIuMCA8XCIgKyBNICsgXCIuXCIgKyAoK20gKyAxKSArIFwiLjBcIjtcbiAgICAgIH0gZWxzZSBpZiAocHIpIHtcbiAgICAgICAgcmV0ID0gXCI+PVwiICtcbiAgICAgICAgICBNICtcbiAgICAgICAgICBcIi5cIiArXG4gICAgICAgICAgbSArXG4gICAgICAgICAgXCIuXCIgK1xuICAgICAgICAgIHAgK1xuICAgICAgICAgIFwiLVwiICtcbiAgICAgICAgICBwciArXG4gICAgICAgICAgXCIgPFwiICtcbiAgICAgICAgICBNICtcbiAgICAgICAgICBcIi5cIiArXG4gICAgICAgICAgKCttICsgMSkgK1xuICAgICAgICAgIFwiLjBcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIH4xLjIuMyA9PSA+PTEuMi4zIDwxLjMuMFxuICAgICAgICByZXQgPSBcIj49XCIgKyBNICsgXCIuXCIgKyBtICsgXCIuXCIgKyBwICsgXCIgPFwiICsgTSArIFwiLlwiICsgKCttICsgMSkgKyBcIi4wXCI7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcbiAgKTtcbn1cblxuLy8gXiAtLT4gKiAoYW55LCBraW5kYSBzaWxseSlcbi8vIF4yLCBeMi54LCBeMi54LnggLS0+ID49Mi4wLjAgPDMuMC4wXG4vLyBeMi4wLCBeMi4wLnggLS0+ID49Mi4wLjAgPDMuMC4wXG4vLyBeMS4yLCBeMS4yLnggLS0+ID49MS4yLjAgPDIuMC4wXG4vLyBeMS4yLjMgLS0+ID49MS4yLjMgPDIuMC4wXG4vLyBeMS4yLjAgLS0+ID49MS4yLjAgPDIuMC4wXG5mdW5jdGlvbiByZXBsYWNlQ2FyZXRzKGNvbXA6IHN0cmluZywgb3B0aW9uczogT3B0aW9ucyk6IHN0cmluZyB7XG4gIHJldHVybiBjb21wXG4gICAgLnRyaW0oKVxuICAgIC5zcGxpdCgvXFxzKy8pXG4gICAgLm1hcCgoY29tcCkgPT4gcmVwbGFjZUNhcmV0KGNvbXAsIG9wdGlvbnMpKVxuICAgIC5qb2luKFwiIFwiKTtcbn1cblxuZnVuY3Rpb24gcmVwbGFjZUNhcmV0KGNvbXA6IHN0cmluZywgX29wdGlvbnM6IE9wdGlvbnMpOiBzdHJpbmcge1xuICBjb25zdCByOiBSZWdFeHAgPSByZVtDQVJFVF07XG4gIHJldHVybiBjb21wLnJlcGxhY2UociwgKF86IHN0cmluZywgTSwgbSwgcCwgcHIpID0+IHtcbiAgICBsZXQgcmV0OiBzdHJpbmc7XG5cbiAgICBpZiAoaXNYKE0pKSB7XG4gICAgICByZXQgPSBcIlwiO1xuICAgIH0gZWxzZSBpZiAoaXNYKG0pKSB7XG4gICAgICByZXQgPSBcIj49XCIgKyBNICsgXCIuMC4wIDxcIiArICgrTSArIDEpICsgXCIuMC4wXCI7XG4gICAgfSBlbHNlIGlmIChpc1gocCkpIHtcbiAgICAgIGlmIChNID09PSBcIjBcIikge1xuICAgICAgICByZXQgPSBcIj49XCIgKyBNICsgXCIuXCIgKyBtICsgXCIuMCA8XCIgKyBNICsgXCIuXCIgKyAoK20gKyAxKSArIFwiLjBcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldCA9IFwiPj1cIiArIE0gKyBcIi5cIiArIG0gKyBcIi4wIDxcIiArICgrTSArIDEpICsgXCIuMC4wXCI7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChwcikge1xuICAgICAgaWYgKE0gPT09IFwiMFwiKSB7XG4gICAgICAgIGlmIChtID09PSBcIjBcIikge1xuICAgICAgICAgIHJldCA9IFwiPj1cIiArXG4gICAgICAgICAgICBNICtcbiAgICAgICAgICAgIFwiLlwiICtcbiAgICAgICAgICAgIG0gK1xuICAgICAgICAgICAgXCIuXCIgK1xuICAgICAgICAgICAgcCArXG4gICAgICAgICAgICBcIi1cIiArXG4gICAgICAgICAgICBwciArXG4gICAgICAgICAgICBcIiA8XCIgK1xuICAgICAgICAgICAgTSArXG4gICAgICAgICAgICBcIi5cIiArXG4gICAgICAgICAgICBtICtcbiAgICAgICAgICAgIFwiLlwiICtcbiAgICAgICAgICAgICgrcCArIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldCA9IFwiPj1cIiArXG4gICAgICAgICAgICBNICtcbiAgICAgICAgICAgIFwiLlwiICtcbiAgICAgICAgICAgIG0gK1xuICAgICAgICAgICAgXCIuXCIgK1xuICAgICAgICAgICAgcCArXG4gICAgICAgICAgICBcIi1cIiArXG4gICAgICAgICAgICBwciArXG4gICAgICAgICAgICBcIiA8XCIgK1xuICAgICAgICAgICAgTSArXG4gICAgICAgICAgICBcIi5cIiArXG4gICAgICAgICAgICAoK20gKyAxKSArXG4gICAgICAgICAgICBcIi4wXCI7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldCA9IFwiPj1cIiArIE0gKyBcIi5cIiArIG0gKyBcIi5cIiArIHAgKyBcIi1cIiArIHByICsgXCIgPFwiICsgKCtNICsgMSkgK1xuICAgICAgICAgIFwiLjAuMFwiO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoTSA9PT0gXCIwXCIpIHtcbiAgICAgICAgaWYgKG0gPT09IFwiMFwiKSB7XG4gICAgICAgICAgcmV0ID0gXCI+PVwiICsgTSArIFwiLlwiICsgbSArIFwiLlwiICsgcCArIFwiIDxcIiArIE0gKyBcIi5cIiArIG0gKyBcIi5cIiArXG4gICAgICAgICAgICAoK3AgKyAxKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXQgPSBcIj49XCIgKyBNICsgXCIuXCIgKyBtICsgXCIuXCIgKyBwICsgXCIgPFwiICsgTSArIFwiLlwiICsgKCttICsgMSkgKyBcIi4wXCI7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldCA9IFwiPj1cIiArIE0gKyBcIi5cIiArIG0gKyBcIi5cIiArIHAgKyBcIiA8XCIgKyAoK00gKyAxKSArIFwiLjAuMFwiO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXQ7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiByZXBsYWNlWFJhbmdlcyhjb21wOiBzdHJpbmcsIG9wdGlvbnM6IE9wdGlvbnMpOiBzdHJpbmcge1xuICByZXR1cm4gY29tcFxuICAgIC5zcGxpdCgvXFxzKy8pXG4gICAgLm1hcCgoY29tcCkgPT4gcmVwbGFjZVhSYW5nZShjb21wLCBvcHRpb25zKSlcbiAgICAuam9pbihcIiBcIik7XG59XG5cbmZ1bmN0aW9uIHJlcGxhY2VYUmFuZ2UoY29tcDogc3RyaW5nLCBfb3B0aW9uczogT3B0aW9ucyk6IHN0cmluZyB7XG4gIGNvbXAgPSBjb21wLnRyaW0oKTtcbiAgY29uc3QgcjogUmVnRXhwID0gcmVbWFJBTkdFXTtcbiAgcmV0dXJuIGNvbXAucmVwbGFjZShyLCAocmV0OiBzdHJpbmcsIGd0bHQsIE0sIG0sIHAsIF9wcikgPT4ge1xuICAgIGNvbnN0IHhNOiBib29sZWFuID0gaXNYKE0pO1xuICAgIGNvbnN0IHhtOiBib29sZWFuID0geE0gfHwgaXNYKG0pO1xuICAgIGNvbnN0IHhwOiBib29sZWFuID0geG0gfHwgaXNYKHApO1xuICAgIGNvbnN0IGFueVg6IGJvb2xlYW4gPSB4cDtcblxuICAgIGlmIChndGx0ID09PSBcIj1cIiAmJiBhbnlYKSB7XG4gICAgICBndGx0ID0gXCJcIjtcbiAgICB9XG5cbiAgICBpZiAoeE0pIHtcbiAgICAgIGlmIChndGx0ID09PSBcIj5cIiB8fCBndGx0ID09PSBcIjxcIikge1xuICAgICAgICAvLyBub3RoaW5nIGlzIGFsbG93ZWRcbiAgICAgICAgcmV0ID0gXCI8MC4wLjBcIjtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIG5vdGhpbmcgaXMgZm9yYmlkZGVuXG4gICAgICAgIHJldCA9IFwiKlwiO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoZ3RsdCAmJiBhbnlYKSB7XG4gICAgICAvLyB3ZSBrbm93IHBhdGNoIGlzIGFuIHgsIGJlY2F1c2Ugd2UgaGF2ZSBhbnkgeCBhdCBhbGwuXG4gICAgICAvLyByZXBsYWNlIFggd2l0aCAwXG4gICAgICBpZiAoeG0pIHtcbiAgICAgICAgbSA9IDA7XG4gICAgICB9XG4gICAgICBwID0gMDtcblxuICAgICAgaWYgKGd0bHQgPT09IFwiPlwiKSB7XG4gICAgICAgIC8vID4xID0+ID49Mi4wLjBcbiAgICAgICAgLy8gPjEuMiA9PiA+PTEuMy4wXG4gICAgICAgIC8vID4xLjIuMyA9PiA+PSAxLjIuNFxuICAgICAgICBndGx0ID0gXCI+PVwiO1xuICAgICAgICBpZiAoeG0pIHtcbiAgICAgICAgICBNID0gK00gKyAxO1xuICAgICAgICAgIG0gPSAwO1xuICAgICAgICAgIHAgPSAwO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIG0gPSArbSArIDE7XG4gICAgICAgICAgcCA9IDA7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSBpZiAoZ3RsdCA9PT0gXCI8PVwiKSB7XG4gICAgICAgIC8vIDw9MC43LnggaXMgYWN0dWFsbHkgPDAuOC4wLCBzaW5jZSBhbnkgMC43Lnggc2hvdWxkXG4gICAgICAgIC8vIHBhc3MuICBTaW1pbGFybHksIDw9Ny54IGlzIGFjdHVhbGx5IDw4LjAuMCwgZXRjLlxuICAgICAgICBndGx0ID0gXCI8XCI7XG4gICAgICAgIGlmICh4bSkge1xuICAgICAgICAgIE0gPSArTSArIDE7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgbSA9ICttICsgMTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXQgPSBndGx0ICsgTSArIFwiLlwiICsgbSArIFwiLlwiICsgcDtcbiAgICB9IGVsc2UgaWYgKHhtKSB7XG4gICAgICByZXQgPSBcIj49XCIgKyBNICsgXCIuMC4wIDxcIiArICgrTSArIDEpICsgXCIuMC4wXCI7XG4gICAgfSBlbHNlIGlmICh4cCkge1xuICAgICAgcmV0ID0gXCI+PVwiICsgTSArIFwiLlwiICsgbSArIFwiLjAgPFwiICsgTSArIFwiLlwiICsgKCttICsgMSkgKyBcIi4wXCI7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldDtcbiAgfSk7XG59XG5cbi8vIEJlY2F1c2UgKiBpcyBBTkQtZWQgd2l0aCBldmVyeXRoaW5nIGVsc2UgaW4gdGhlIGNvbXBhcmF0b3IsXG4vLyBhbmQgJycgbWVhbnMgXCJhbnkgdmVyc2lvblwiLCBqdXN0IHJlbW92ZSB0aGUgKnMgZW50aXJlbHkuXG5mdW5jdGlvbiByZXBsYWNlU3RhcnMoY29tcDogc3RyaW5nLCBfb3B0aW9uczogT3B0aW9ucyk6IHN0cmluZyB7XG4gIHJldHVybiBjb21wLnRyaW0oKS5yZXBsYWNlKHJlW1NUQVJdLCBcIlwiKTtcbn1cblxuLy8gVGhpcyBmdW5jdGlvbiBpcyBwYXNzZWQgdG8gc3RyaW5nLnJlcGxhY2UocmVbSFlQSEVOUkFOR0VdKVxuLy8gTSwgbSwgcGF0Y2gsIHByZXJlbGVhc2UsIGJ1aWxkXG4vLyAxLjIgLSAzLjQuNSA9PiA+PTEuMi4wIDw9My40LjVcbi8vIDEuMi4zIC0gMy40ID0+ID49MS4yLjAgPDMuNS4wIEFueSAzLjQueCB3aWxsIGRvXG4vLyAxLjIgLSAzLjQgPT4gPj0xLjIuMCA8My41LjBcbmZ1bmN0aW9uIGh5cGhlblJlcGxhY2UoXG4gIF8kMDogc3RyaW5nLFxuICBmcm9tOiBzdHJpbmcsXG4gIGZNOiBzdHJpbmcsXG4gIGZtOiBzdHJpbmcsXG4gIGZwOiBzdHJpbmcsXG4gIF9mcHI6IHN0cmluZyxcbiAgX2ZiOiBzdHJpbmcsXG4gIHRvOiBzdHJpbmcsXG4gIHRNOiBzdHJpbmcsXG4gIHRtOiBzdHJpbmcsXG4gIHRwOiBzdHJpbmcsXG4gIHRwcjogc3RyaW5nLFxuICBfdGI6IHN0cmluZyxcbikge1xuICBpZiAoaXNYKGZNKSkge1xuICAgIGZyb20gPSBcIlwiO1xuICB9IGVsc2UgaWYgKGlzWChmbSkpIHtcbiAgICBmcm9tID0gXCI+PVwiICsgZk0gKyBcIi4wLjBcIjtcbiAgfSBlbHNlIGlmIChpc1goZnApKSB7XG4gICAgZnJvbSA9IFwiPj1cIiArIGZNICsgXCIuXCIgKyBmbSArIFwiLjBcIjtcbiAgfSBlbHNlIHtcbiAgICBmcm9tID0gXCI+PVwiICsgZnJvbTtcbiAgfVxuXG4gIGlmIChpc1godE0pKSB7XG4gICAgdG8gPSBcIlwiO1xuICB9IGVsc2UgaWYgKGlzWCh0bSkpIHtcbiAgICB0byA9IFwiPFwiICsgKCt0TSArIDEpICsgXCIuMC4wXCI7XG4gIH0gZWxzZSBpZiAoaXNYKHRwKSkge1xuICAgIHRvID0gXCI8XCIgKyB0TSArIFwiLlwiICsgKCt0bSArIDEpICsgXCIuMFwiO1xuICB9IGVsc2UgaWYgKHRwcikge1xuICAgIHRvID0gXCI8PVwiICsgdE0gKyBcIi5cIiArIHRtICsgXCIuXCIgKyB0cCArIFwiLVwiICsgdHByO1xuICB9IGVsc2Uge1xuICAgIHRvID0gXCI8PVwiICsgdG87XG4gIH1cblxuICByZXR1cm4gKGZyb20gKyBcIiBcIiArIHRvKS50cmltKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYXRpc2ZpZXMoXG4gIHZlcnNpb246IHN0cmluZyB8IFNlbVZlcixcbiAgcmFuZ2U6IHN0cmluZyB8IFJhbmdlLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IGJvb2xlYW4ge1xuICB0cnkge1xuICAgIHJhbmdlID0gbmV3IFJhbmdlKHJhbmdlLCBvcHRpb25zKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiByYW5nZS50ZXN0KHZlcnNpb24pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWF4U2F0aXNmeWluZzxUIGV4dGVuZHMgc3RyaW5nIHwgU2VtVmVyPihcbiAgdmVyc2lvbnM6IFJlYWRvbmx5QXJyYXk8VD4sXG4gIHJhbmdlOiBzdHJpbmcgfCBSYW5nZSxcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBUIHwgbnVsbCB7XG4gIC8vdG9kb1xuICBsZXQgbWF4OiBUIHwgU2VtVmVyIHwgbnVsbCA9IG51bGw7XG4gIGxldCBtYXhTVjogU2VtVmVyIHwgbnVsbCA9IG51bGw7XG4gIGxldCByYW5nZU9iajogUmFuZ2U7XG4gIHRyeSB7XG4gICAgcmFuZ2VPYmogPSBuZXcgUmFuZ2UocmFuZ2UsIG9wdGlvbnMpO1xuICB9IGNhdGNoIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICB2ZXJzaW9ucy5mb3JFYWNoKCh2KSA9PiB7XG4gICAgaWYgKHJhbmdlT2JqLnRlc3QodikpIHtcbiAgICAgIC8vIHNhdGlzZmllcyh2LCByYW5nZSwgb3B0aW9ucylcbiAgICAgIGlmICghbWF4IHx8IChtYXhTViAmJiBtYXhTVi5jb21wYXJlKHYpID09PSAtMSkpIHtcbiAgICAgICAgLy8gY29tcGFyZShtYXgsIHYsIHRydWUpXG4gICAgICAgIG1heCA9IHY7XG4gICAgICAgIG1heFNWID0gbmV3IFNlbVZlcihtYXgsIG9wdGlvbnMpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG4gIHJldHVybiBtYXg7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtaW5TYXRpc2Z5aW5nPFQgZXh0ZW5kcyBzdHJpbmcgfCBTZW1WZXI+KFxuICB2ZXJzaW9uczogUmVhZG9ubHlBcnJheTxUPixcbiAgcmFuZ2U6IHN0cmluZyB8IFJhbmdlLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IFQgfCBudWxsIHtcbiAgLy90b2RvXG4gIGxldCBtaW46IHN0cmluZyB8IFNlbVZlciB8IG51bGwgPSBudWxsO1xuICBsZXQgbWluU1Y6IFNlbVZlciB8IG51bGwgPSBudWxsO1xuICBsZXQgcmFuZ2VPYmo6IFJhbmdlO1xuICB0cnkge1xuICAgIHJhbmdlT2JqID0gbmV3IFJhbmdlKHJhbmdlLCBvcHRpb25zKTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgdmVyc2lvbnMuZm9yRWFjaCgodikgPT4ge1xuICAgIGlmIChyYW5nZU9iai50ZXN0KHYpKSB7XG4gICAgICAvLyBzYXRpc2ZpZXModiwgcmFuZ2UsIG9wdGlvbnMpXG4gICAgICBpZiAoIW1pbiB8fCBtaW5TViEuY29tcGFyZSh2KSA9PT0gMSkge1xuICAgICAgICAvLyBjb21wYXJlKG1pbiwgdiwgdHJ1ZSlcbiAgICAgICAgbWluID0gdjtcbiAgICAgICAgbWluU1YgPSBuZXcgU2VtVmVyKG1pbiwgb3B0aW9ucyk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIG1pbjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1pblZlcnNpb24oXG4gIHJhbmdlOiBzdHJpbmcgfCBSYW5nZSxcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBTZW1WZXIgfCBudWxsIHtcbiAgcmFuZ2UgPSBuZXcgUmFuZ2UocmFuZ2UsIG9wdGlvbnMpO1xuXG4gIGxldCBtaW52ZXI6IFNlbVZlciB8IG51bGwgPSBuZXcgU2VtVmVyKFwiMC4wLjBcIik7XG4gIGlmIChyYW5nZS50ZXN0KG1pbnZlcikpIHtcbiAgICByZXR1cm4gbWludmVyO1xuICB9XG5cbiAgbWludmVyID0gbmV3IFNlbVZlcihcIjAuMC4wLTBcIik7XG4gIGlmIChyYW5nZS50ZXN0KG1pbnZlcikpIHtcbiAgICByZXR1cm4gbWludmVyO1xuICB9XG5cbiAgbWludmVyID0gbnVsbDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCByYW5nZS5zZXQubGVuZ3RoOyArK2kpIHtcbiAgICBjb25zdCBjb21wYXJhdG9ycyA9IHJhbmdlLnNldFtpXTtcblxuICAgIGNvbXBhcmF0b3JzLmZvckVhY2goKGNvbXBhcmF0b3IpID0+IHtcbiAgICAgIC8vIENsb25lIHRvIGF2b2lkIG1hbmlwdWxhdGluZyB0aGUgY29tcGFyYXRvcidzIHNlbXZlciBvYmplY3QuXG4gICAgICBjb25zdCBjb21wdmVyID0gbmV3IFNlbVZlcihjb21wYXJhdG9yLnNlbXZlci52ZXJzaW9uKTtcbiAgICAgIHN3aXRjaCAoY29tcGFyYXRvci5vcGVyYXRvcikge1xuICAgICAgICBjYXNlIFwiPlwiOlxuICAgICAgICAgIGlmIChjb21wdmVyLnByZXJlbGVhc2UubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICBjb21wdmVyLnBhdGNoKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbXB2ZXIucHJlcmVsZWFzZS5wdXNoKDApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjb21wdmVyLnJhdyA9IGNvbXB2ZXIuZm9ybWF0KCk7XG4gICAgICAgIC8qIGZhbGx0aHJvdWdoICovXG4gICAgICAgIGNhc2UgXCJcIjpcbiAgICAgICAgY2FzZSBcIj49XCI6XG4gICAgICAgICAgaWYgKCFtaW52ZXIgfHwgZ3QobWludmVyLCBjb21wdmVyKSkge1xuICAgICAgICAgICAgbWludmVyID0gY29tcHZlcjtcbiAgICAgICAgICB9XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgXCI8XCI6XG4gICAgICAgIGNhc2UgXCI8PVwiOlxuICAgICAgICAgIC8qIElnbm9yZSBtYXhpbXVtIHZlcnNpb25zICovXG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8qIGlzdGFuYnVsIGlnbm9yZSBuZXh0ICovXG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVW5leHBlY3RlZCBvcGVyYXRpb246IFwiICsgY29tcGFyYXRvci5vcGVyYXRvcik7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBpZiAobWludmVyICYmIHJhbmdlLnRlc3QobWludmVyKSkge1xuICAgIHJldHVybiBtaW52ZXI7XG4gIH1cblxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkUmFuZ2UoXG4gIHJhbmdlOiBzdHJpbmcgfCBSYW5nZSB8IG51bGwsXG4gIG9wdGlvbnM/OiBPcHRpb25zLFxuKTogc3RyaW5nIHwgbnVsbCB7XG4gIHRyeSB7XG4gICAgaWYgKHJhbmdlID09PSBudWxsKSByZXR1cm4gbnVsbDtcbiAgICAvLyBSZXR1cm4gJyonIGluc3RlYWQgb2YgJycgc28gdGhhdCB0cnV0aGluZXNzIHdvcmtzLlxuICAgIC8vIFRoaXMgd2lsbCB0aHJvdyBpZiBpdCdzIGludmFsaWQgYW55d2F5XG4gICAgcmV0dXJuIG5ldyBSYW5nZShyYW5nZSwgb3B0aW9ucykucmFuZ2UgfHwgXCIqXCI7XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8qKlxuICogUmV0dXJuIHRydWUgaWYgdmVyc2lvbiBpcyBsZXNzIHRoYW4gYWxsIHRoZSB2ZXJzaW9ucyBwb3NzaWJsZSBpbiB0aGUgcmFuZ2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBsdHIoXG4gIHZlcnNpb246IHN0cmluZyB8IFNlbVZlcixcbiAgcmFuZ2U6IHN0cmluZyB8IFJhbmdlLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IGJvb2xlYW4ge1xuICByZXR1cm4gb3V0c2lkZSh2ZXJzaW9uLCByYW5nZSwgXCI8XCIsIG9wdGlvbnMpO1xufVxuXG4vKipcbiAqIFJldHVybiB0cnVlIGlmIHZlcnNpb24gaXMgZ3JlYXRlciB0aGFuIGFsbCB0aGUgdmVyc2lvbnMgcG9zc2libGUgaW4gdGhlIHJhbmdlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ3RyKFxuICB2ZXJzaW9uOiBzdHJpbmcgfCBTZW1WZXIsXG4gIHJhbmdlOiBzdHJpbmcgfCBSYW5nZSxcbiAgb3B0aW9ucz86IE9wdGlvbnMsXG4pOiBib29sZWFuIHtcbiAgcmV0dXJuIG91dHNpZGUodmVyc2lvbiwgcmFuZ2UsIFwiPlwiLCBvcHRpb25zKTtcbn1cblxuLyoqXG4gKiBSZXR1cm4gdHJ1ZSBpZiB0aGUgdmVyc2lvbiBpcyBvdXRzaWRlIHRoZSBib3VuZHMgb2YgdGhlIHJhbmdlIGluIGVpdGhlciB0aGUgaGlnaCBvciBsb3cgZGlyZWN0aW9uLlxuICogVGhlIGhpbG8gYXJndW1lbnQgbXVzdCBiZSBlaXRoZXIgdGhlIHN0cmluZyAnPicgb3IgJzwnLiAoVGhpcyBpcyB0aGUgZnVuY3Rpb24gY2FsbGVkIGJ5IGd0ciBhbmQgbHRyLilcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG91dHNpZGUoXG4gIHZlcnNpb246IHN0cmluZyB8IFNlbVZlcixcbiAgcmFuZ2U6IHN0cmluZyB8IFJhbmdlLFxuICBoaWxvOiBcIj5cIiB8IFwiPFwiLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IGJvb2xlYW4ge1xuICB2ZXJzaW9uID0gbmV3IFNlbVZlcih2ZXJzaW9uLCBvcHRpb25zKTtcbiAgcmFuZ2UgPSBuZXcgUmFuZ2UocmFuZ2UsIG9wdGlvbnMpO1xuXG4gIGxldCBndGZuOiB0eXBlb2YgZ3Q7XG4gIGxldCBsdGVmbjogdHlwZW9mIGx0ZTtcbiAgbGV0IGx0Zm46IHR5cGVvZiBsdDtcbiAgbGV0IGNvbXA6IHN0cmluZztcbiAgbGV0IGVjb21wOiBzdHJpbmc7XG4gIHN3aXRjaCAoaGlsbykge1xuICAgIGNhc2UgXCI+XCI6XG4gICAgICBndGZuID0gZ3Q7XG4gICAgICBsdGVmbiA9IGx0ZTtcbiAgICAgIGx0Zm4gPSBsdDtcbiAgICAgIGNvbXAgPSBcIj5cIjtcbiAgICAgIGVjb21wID0gXCI+PVwiO1xuICAgICAgYnJlYWs7XG4gICAgY2FzZSBcIjxcIjpcbiAgICAgIGd0Zm4gPSBsdDtcbiAgICAgIGx0ZWZuID0gZ3RlO1xuICAgICAgbHRmbiA9IGd0O1xuICAgICAgY29tcCA9IFwiPFwiO1xuICAgICAgZWNvbXAgPSBcIjw9XCI7XG4gICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignTXVzdCBwcm92aWRlIGEgaGlsbyB2YWwgb2YgXCI8XCIgb3IgXCI+XCInKTtcbiAgfVxuXG4gIC8vIElmIGl0IHNhdGlzaWZlcyB0aGUgcmFuZ2UgaXQgaXMgbm90IG91dHNpZGVcbiAgaWYgKHNhdGlzZmllcyh2ZXJzaW9uLCByYW5nZSwgb3B0aW9ucykpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cblxuICAvLyBGcm9tIG5vdyBvbiwgdmFyaWFibGUgdGVybXMgYXJlIGFzIGlmIHdlJ3JlIGluIFwiZ3RyXCIgbW9kZS5cbiAgLy8gYnV0IG5vdGUgdGhhdCBldmVyeXRoaW5nIGlzIGZsaXBwZWQgZm9yIHRoZSBcImx0clwiIGZ1bmN0aW9uLlxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgcmFuZ2Uuc2V0Lmxlbmd0aDsgKytpKSB7XG4gICAgY29uc3QgY29tcGFyYXRvcnM6IHJlYWRvbmx5IENvbXBhcmF0b3JbXSA9IHJhbmdlLnNldFtpXTtcblxuICAgIGxldCBoaWdoOiBDb21wYXJhdG9yIHwgbnVsbCA9IG51bGw7XG4gICAgbGV0IGxvdzogQ29tcGFyYXRvciB8IG51bGwgPSBudWxsO1xuXG4gICAgZm9yIChsZXQgY29tcGFyYXRvciBvZiBjb21wYXJhdG9ycykge1xuICAgICAgaWYgKGNvbXBhcmF0b3Iuc2VtdmVyID09PSBBTlkpIHtcbiAgICAgICAgY29tcGFyYXRvciA9IG5ldyBDb21wYXJhdG9yKFwiPj0wLjAuMFwiKTtcbiAgICAgIH1cbiAgICAgIGhpZ2ggPSBoaWdoIHx8IGNvbXBhcmF0b3I7XG4gICAgICBsb3cgPSBsb3cgfHwgY29tcGFyYXRvcjtcbiAgICAgIGlmIChndGZuKGNvbXBhcmF0b3Iuc2VtdmVyLCBoaWdoLnNlbXZlciwgb3B0aW9ucykpIHtcbiAgICAgICAgaGlnaCA9IGNvbXBhcmF0b3I7XG4gICAgICB9IGVsc2UgaWYgKGx0Zm4oY29tcGFyYXRvci5zZW12ZXIsIGxvdy5zZW12ZXIsIG9wdGlvbnMpKSB7XG4gICAgICAgIGxvdyA9IGNvbXBhcmF0b3I7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGhpZ2ggPT09IG51bGwgfHwgbG93ID09PSBudWxsKSByZXR1cm4gdHJ1ZTtcblxuICAgIC8vIElmIHRoZSBlZGdlIHZlcnNpb24gY29tcGFyYXRvciBoYXMgYSBvcGVyYXRvciB0aGVuIG91ciB2ZXJzaW9uXG4gICAgLy8gaXNuJ3Qgb3V0c2lkZSBpdFxuICAgIGlmIChoaWdoIS5vcGVyYXRvciA9PT0gY29tcCB8fCBoaWdoIS5vcGVyYXRvciA9PT0gZWNvbXApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBJZiB0aGUgbG93ZXN0IHZlcnNpb24gY29tcGFyYXRvciBoYXMgYW4gb3BlcmF0b3IgYW5kIG91ciB2ZXJzaW9uXG4gICAgLy8gaXMgbGVzcyB0aGFuIGl0IHRoZW4gaXQgaXNuJ3QgaGlnaGVyIHRoYW4gdGhlIHJhbmdlXG4gICAgaWYgKFxuICAgICAgKCFsb3chLm9wZXJhdG9yIHx8IGxvdyEub3BlcmF0b3IgPT09IGNvbXApICYmXG4gICAgICBsdGVmbih2ZXJzaW9uLCBsb3chLnNlbXZlcilcbiAgICApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2UgaWYgKGxvdyEub3BlcmF0b3IgPT09IGVjb21wICYmIGx0Zm4odmVyc2lvbiwgbG93IS5zZW12ZXIpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJlcmVsZWFzZShcbiAgdmVyc2lvbjogc3RyaW5nIHwgU2VtVmVyLFxuICBvcHRpb25zPzogT3B0aW9ucyxcbik6IFJlYWRvbmx5QXJyYXk8c3RyaW5nIHwgbnVtYmVyPiB8IG51bGwge1xuICBjb25zdCBwYXJzZWQgPSBwYXJzZSh2ZXJzaW9uLCBvcHRpb25zKTtcbiAgcmV0dXJuIHBhcnNlZCAmJiBwYXJzZWQucHJlcmVsZWFzZS5sZW5ndGggPyBwYXJzZWQucHJlcmVsZWFzZSA6IG51bGw7XG59XG5cbi8qKlxuICogUmV0dXJuIHRydWUgaWYgYW55IG9mIHRoZSByYW5nZXMgY29tcGFyYXRvcnMgaW50ZXJzZWN0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbnRlcnNlY3RzKFxuICByYW5nZTE6IHN0cmluZyB8IFJhbmdlIHwgQ29tcGFyYXRvcixcbiAgcmFuZ2UyOiBzdHJpbmcgfCBSYW5nZSB8IENvbXBhcmF0b3IsXG4gIG9wdGlvbnM/OiBPcHRpb25zLFxuKTogYm9vbGVhbiB7XG4gIHJhbmdlMSA9IG5ldyBSYW5nZShyYW5nZTEsIG9wdGlvbnMpO1xuICByYW5nZTIgPSBuZXcgUmFuZ2UocmFuZ2UyLCBvcHRpb25zKTtcbiAgcmV0dXJuIHJhbmdlMS5pbnRlcnNlY3RzKHJhbmdlMik7XG59XG5cbmV4cG9ydCBkZWZhdWx0IFNlbVZlcjtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxtRkFBbUY7QUFDbkYsMEVBQTBFO0FBRTFFOzs7Ozs7Q0FNQyxHQUVELEFBMEJBLHNFQUFzRTtBQUN0RSxvREFBb0Q7QUFDcEQsT0FBTyxNQUFNLHNCQUFzQixRQUFRO0FBRTNDLE1BQU0sYUFBYTtBQUVuQixxQkFBcUI7QUFDckIsTUFBTSxLQUFlLEVBQUU7QUFD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