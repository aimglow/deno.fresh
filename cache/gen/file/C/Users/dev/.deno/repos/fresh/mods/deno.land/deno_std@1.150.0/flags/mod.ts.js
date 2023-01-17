// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
/**
 * CLI flag parser.
 *
 * This module is browser compatible.
 *
 * @module
 */ import { assert } from "../_util/assert.ts";
const { hasOwn  } = Object;
function get(obj, key) {
    if (hasOwn(obj, key)) {
        return obj[key];
    }
}
function getForce(obj, key) {
    const v = get(obj, key);
    assert(v != null);
    return v;
}
function isNumber(x) {
    if (typeof x === "number") return true;
    if (/^0x[0-9a-f]+$/i.test(String(x))) return true;
    return /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(String(x));
}
function hasKey(obj, keys) {
    let o = obj;
    keys.slice(0, -1).forEach((key)=>{
        o = get(o, key) ?? {};
    });
    const key = keys[keys.length - 1];
    return hasOwn(o, key);
}
/** Take a set of command line arguments, optionally with a set of options, and
 * return an object representing the flags found in the passed arguments.
 *
 * By default, any arguments starting with `-` or `--` are considered boolean
 * flags. If the argument name is followed by an equal sign (`=`) it is
 * considered a key-value pair. Any arguments which could not be parsed are
 * available in the `_` property of the returned object.
 *
 * ```ts
 * import { parse } from "./mod.ts";
 * const parsedArgs = parse(Deno.args);
 * ```
 *
 * ```ts
 * import { parse } from "./mod.ts";
 * const parsedArgs = parse(["--foo", "--bar=baz", "--no-qux", "./quux.txt"]);
 * // parsedArgs: { foo: true, bar: "baz", qux: false, _: ["./quux.txt"] }
 * ```
 */ export function parse(args, { "--": doubleDash = false , alias ={} , boolean =false , default: defaults = {} , stopEarly =false , string =[] , collect =[] , negatable =[] , unknown =(i)=>i  } = {}) {
    const flags = {
        bools: {},
        strings: {},
        unknownFn: unknown,
        allBools: false,
        collect: {},
        negatable: {}
    };
    if (boolean !== undefined) {
        if (typeof boolean === "boolean") {
            flags.allBools = !!boolean;
        } else {
            const booleanArgs = typeof boolean === "string" ? [
                boolean
            ] : boolean;
            for (const key of booleanArgs.filter(Boolean)){
                flags.bools[key] = true;
            }
        }
    }
    const aliases = {};
    if (alias !== undefined) {
        for(const key1 in alias){
            const val = getForce(alias, key1);
            if (typeof val === "string") {
                aliases[key1] = [
                    val
                ];
            } else {
                aliases[key1] = val;
            }
            for (const alias1 of getForce(aliases, key1)){
                aliases[alias1] = [
                    key1
                ].concat(aliases[key1].filter((y)=>alias1 !== y));
            }
        }
    }
    if (string !== undefined) {
        const stringArgs = typeof string === "string" ? [
            string
        ] : string;
        for (const key2 of stringArgs.filter(Boolean)){
            flags.strings[key2] = true;
            const alias2 = get(aliases, key2);
            if (alias2) {
                for (const al of alias2){
                    flags.strings[al] = true;
                }
            }
        }
    }
    if (collect !== undefined) {
        const collectArgs = typeof collect === "string" ? [
            collect
        ] : collect;
        for (const key3 of collectArgs.filter(Boolean)){
            flags.collect[key3] = true;
            const alias3 = get(aliases, key3);
            if (alias3) {
                for (const al1 of alias3){
                    flags.collect[al1] = true;
                }
            }
        }
    }
    if (negatable !== undefined) {
        const negatableArgs = typeof negatable === "string" ? [
            negatable
        ] : negatable;
        for (const key4 of negatableArgs.filter(Boolean)){
            flags.negatable[key4] = true;
            const alias4 = get(aliases, key4);
            if (alias4) {
                for (const al2 of alias4){
                    flags.negatable[al2] = true;
                }
            }
        }
    }
    const argv = {
        _: []
    };
    function argDefined(key, arg) {
        return flags.allBools && /^--[^=]+$/.test(arg) || get(flags.bools, key) || !!get(flags.strings, key) || !!get(aliases, key);
    }
    function setKey(obj, name, value, collect = true) {
        let o = obj;
        const keys = name.split(".");
        keys.slice(0, -1).forEach(function(key) {
            if (get(o, key) === undefined) {
                o[key] = {};
            }
            o = get(o, key);
        });
        const key = keys[keys.length - 1];
        const collectable = collect && !!get(flags.collect, name);
        if (!collectable) {
            o[key] = value;
        } else if (get(o, key) === undefined) {
            o[key] = [
                value
            ];
        } else if (Array.isArray(get(o, key))) {
            o[key].push(value);
        } else {
            o[key] = [
                get(o, key),
                value
            ];
        }
    }
    function setArg(key, val, arg = undefined, collect) {
        if (arg && flags.unknownFn && !argDefined(key, arg)) {
            if (flags.unknownFn(arg, key, val) === false) return;
        }
        const value = !get(flags.strings, key) && isNumber(val) ? Number(val) : val;
        setKey(argv, key, value, collect);
        const alias = get(aliases, key);
        if (alias) {
            for (const x of alias){
                setKey(argv, x, value, collect);
            }
        }
    }
    function aliasIsBoolean(key) {
        return getForce(aliases, key).some((x)=>typeof get(flags.bools, x) === "boolean");
    }
    let notFlags = [];
    // all args after "--" are not parsed
    if (args.includes("--")) {
        notFlags = args.slice(args.indexOf("--") + 1);
        args = args.slice(0, args.indexOf("--"));
    }
    for(let i = 0; i < args.length; i++){
        const arg = args[i];
        if (/^--.+=/.test(arg)) {
            const m = arg.match(/^--([^=]+)=(.*)$/s);
            assert(m != null);
            const [, key5, value] = m;
            if (flags.bools[key5]) {
                const booleanValue = value !== "false";
                setArg(key5, booleanValue, arg);
            } else {
                setArg(key5, value, arg);
            }
        } else if (/^--no-.+/.test(arg) && get(flags.negatable, arg.replace(/^--no-/, ""))) {
            const m1 = arg.match(/^--no-(.+)/);
            assert(m1 != null);
            setArg(m1[1], false, arg, false);
        } else if (/^--.+/.test(arg)) {
            const m2 = arg.match(/^--(.+)/);
            assert(m2 != null);
            const [, key6] = m2;
            const next = args[i + 1];
            if (next !== undefined && !/^-/.test(next) && !get(flags.bools, key6) && !flags.allBools && (get(aliases, key6) ? !aliasIsBoolean(key6) : true)) {
                setArg(key6, next, arg);
                i++;
            } else if (/^(true|false)$/.test(next)) {
                setArg(key6, next === "true", arg);
                i++;
            } else {
                setArg(key6, get(flags.strings, key6) ? "" : true, arg);
            }
        } else if (/^-[^-]+/.test(arg)) {
            const letters = arg.slice(1, -1).split("");
            let broken = false;
            for(let j = 0; j < letters.length; j++){
                const next1 = arg.slice(j + 2);
                if (next1 === "-") {
                    setArg(letters[j], next1, arg);
                    continue;
                }
                if (/[A-Za-z]/.test(letters[j]) && /=/.test(next1)) {
                    setArg(letters[j], next1.split(/=(.+)/)[1], arg);
                    broken = true;
                    break;
                }
                if (/[A-Za-z]/.test(letters[j]) && /-?\d+(\.\d*)?(e-?\d+)?$/.test(next1)) {
                    setArg(letters[j], next1, arg);
                    broken = true;
                    break;
                }
                if (letters[j + 1] && letters[j + 1].match(/\W/)) {
                    setArg(letters[j], arg.slice(j + 2), arg);
                    broken = true;
                    break;
                } else {
                    setArg(letters[j], get(flags.strings, letters[j]) ? "" : true, arg);
                }
            }
            const [key7] = arg.slice(-1);
            if (!broken && key7 !== "-") {
                if (args[i + 1] && !/^(-|--)[^-]/.test(args[i + 1]) && !get(flags.bools, key7) && (get(aliases, key7) ? !aliasIsBoolean(key7) : true)) {
                    setArg(key7, args[i + 1], arg);
                    i++;
                } else if (args[i + 1] && /^(true|false)$/.test(args[i + 1])) {
                    setArg(key7, args[i + 1] === "true", arg);
                    i++;
                } else {
                    setArg(key7, get(flags.strings, key7) ? "" : true, arg);
                }
            }
        } else {
            if (!flags.unknownFn || flags.unknownFn(arg) !== false) {
                argv._.push(flags.strings["_"] ?? !isNumber(arg) ? arg : Number(arg));
            }
            if (stopEarly) {
                argv._.push(...args.slice(i + 1));
                break;
            }
        }
    }
    for (const [key8, value1] of Object.entries(defaults)){
        if (!hasKey(argv, key8.split("."))) {
            setKey(argv, key8, value1);
            if (aliases[key8]) {
                for (const x of aliases[key8]){
                    setKey(argv, x, value1);
                }
            }
        }
    }
    for (const key9 of Object.keys(flags.bools)){
        if (!hasKey(argv, key9.split("."))) {
            const value2 = get(flags.collect, key9) ? [] : false;
            setKey(argv, key9, value2, false);
        }
    }
    for (const key10 of Object.keys(flags.strings)){
        if (!hasKey(argv, key10.split(".")) && get(flags.collect, key10)) {
            setKey(argv, key10, [], false);
        }
    }
    if (doubleDash) {
        argv["--"] = [];
        for (const key11 of notFlags){
            argv["--"].push(key11);
        }
    } else {
        for (const key12 of notFlags){
            argv._.push(key12);
        }
    }
    return argv;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovVXNlcnMvZGV2Ly5kZW5vL3JlcG9zL2ZyZXNoL21vZHMvZGVuby5sYW5kL2Rlbm9fc3RkQDEuMTUwLjAvZmxhZ3MvbW9kLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIENvcHlyaWdodCAyMDE4LTIwMjIgdGhlIERlbm8gYXV0aG9ycy4gQWxsIHJpZ2h0cyByZXNlcnZlZC4gTUlUIGxpY2Vuc2UuXG4vKipcbiAqIENMSSBmbGFnIHBhcnNlci5cbiAqXG4gKiBUaGlzIG1vZHVsZSBpcyBicm93c2VyIGNvbXBhdGlibGUuXG4gKlxuICogQG1vZHVsZVxuICovXG5pbXBvcnQgeyBhc3NlcnQgfSBmcm9tIFwiLi4vX3V0aWwvYXNzZXJ0LnRzXCI7XG5cbi8qKiBDb21iaW5lcyByZWN1cnNpdmx5IGFsbCBpbnRlcnNhY3Rpb24gdHlwZXMgYW5kIHJldHVybnMgYSBuZXcgc2luZ2xlIHR5cGUuICovXG50eXBlIElkPFQ+ID0gVCBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHVua25vd24+XG4gID8gVCBleHRlbmRzIGluZmVyIFUgPyB7IFtLIGluIGtleW9mIFVdOiBJZDxVW0tdPiB9IDogbmV2ZXJcbiAgOiBUO1xuXG4vKiogQ29udmVydHMgYW4gdW5pb24gdHlwZSBgQSB8IEIgfCBDYCBpbnRvIGFuIGludGVyc2VjdGlvbiB0eXBlIGBBICYgQiAmIENgLiAqL1xudHlwZSBVbmlvblRvSW50ZXJzZWN0aW9uPFQ+ID1cbiAgKFQgZXh0ZW5kcyB1bmtub3duID8gKGFyZ3M6IFQpID0+IHVua25vd24gOiBuZXZlcikgZXh0ZW5kc1xuICAgIChhcmdzOiBpbmZlciBSKSA9PiB1bmtub3duID8gUiBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHVua25vd24+ID8gUiA6IG5ldmVyXG4gICAgOiBuZXZlcjtcblxudHlwZSBCb29sZWFuVHlwZSA9IGJvb2xlYW4gfCBzdHJpbmcgfCB1bmRlZmluZWQ7XG50eXBlIFN0cmluZ1R5cGUgPSBzdHJpbmcgfCB1bmRlZmluZWQ7XG50eXBlIEFyZ1R5cGUgPSBTdHJpbmdUeXBlIHwgQm9vbGVhblR5cGU7XG5cbnR5cGUgQ29sbGVjdGFibGUgPSBzdHJpbmcgfCB1bmRlZmluZWQ7XG50eXBlIE5lZ2F0YWJsZSA9IHN0cmluZyB8IHVuZGVmaW5lZDtcblxudHlwZSBVc2VUeXBlczxcbiAgQiBleHRlbmRzIEJvb2xlYW5UeXBlLFxuICBTIGV4dGVuZHMgU3RyaW5nVHlwZSxcbiAgQyBleHRlbmRzIENvbGxlY3RhYmxlLFxuPiA9IHVuZGVmaW5lZCBleHRlbmRzIChcbiAgJiAoZmFsc2UgZXh0ZW5kcyBCID8gdW5kZWZpbmVkIDogQilcbiAgJiBDXG4gICYgU1xuKSA/IGZhbHNlXG4gIDogdHJ1ZTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgcmVjb3JkIHdpdGggYWxsIGF2YWlsYWJsZSBmbGFncyB3aXRoIHRoZSBjb3JyZXNwb25kaW5nIHR5cGUgYW5kXG4gKiBkZWZhdWx0IHR5cGUuXG4gKi9cbnR5cGUgVmFsdWVzPFxuICBCIGV4dGVuZHMgQm9vbGVhblR5cGUsXG4gIFMgZXh0ZW5kcyBTdHJpbmdUeXBlLFxuICBDIGV4dGVuZHMgQ29sbGVjdGFibGUsXG4gIE4gZXh0ZW5kcyBOZWdhdGFibGUsXG4gIEQgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZCxcbiAgQSBleHRlbmRzIEFsaWFzZXMgfCB1bmRlZmluZWQsXG4+ID0gVXNlVHlwZXM8QiwgUywgQz4gZXh0ZW5kcyB0cnVlID8gXG4gICAgJiBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPlxuICAgICYgQWRkQWxpYXNlczxcbiAgICAgIFNwcmVhZERlZmF1bHRzPFxuICAgICAgICAmIENvbGxlY3RWYWx1ZXM8Uywgc3RyaW5nLCBDLCBOPlxuICAgICAgICAmIFJlY3Vyc2l2ZVJlcXVpcmVkPENvbGxlY3RWYWx1ZXM8QiwgYm9vbGVhbiwgQz4+XG4gICAgICAgICYgQ29sbGVjdFVua25vd25WYWx1ZXM8QiwgUywgQywgTj4sXG4gICAgICAgIERlZG90UmVjb3JkPEQ+XG4gICAgICA+LFxuICAgICAgQVxuICAgID5cbiAgOiAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xuXG50eXBlIEFsaWFzZXM8VCA9IHN0cmluZywgViBleHRlbmRzIHN0cmluZyA9IHN0cmluZz4gPSBQYXJ0aWFsPFxuICBSZWNvcmQ8RXh0cmFjdDxULCBzdHJpbmc+LCBWIHwgUmVhZG9ubHlBcnJheTxWPj5cbj47XG5cbnR5cGUgQWRkQWxpYXNlczxcbiAgVCxcbiAgQSBleHRlbmRzIEFsaWFzZXMgfCB1bmRlZmluZWQsXG4+ID0geyBbSyBpbiBrZXlvZiBUIGFzIEFsaWFzTmFtZTxLLCBBPl06IFRbS10gfTtcblxudHlwZSBBbGlhc05hbWU8XG4gIEssXG4gIEEgZXh0ZW5kcyBBbGlhc2VzIHwgdW5kZWZpbmVkLFxuPiA9IEsgZXh0ZW5kcyBrZXlvZiBBXG4gID8gc3RyaW5nIGV4dGVuZHMgQVtLXSA/IEsgOiBBW0tdIGV4dGVuZHMgc3RyaW5nID8gSyB8IEFbS10gOiBLXG4gIDogSztcblxuLyoqXG4gKiBTcHJlYWRzIGFsbCBkZWZhdWx0IHZhbHVlcyBvZiBSZWNvcmQgYERgIGludG8gUmVjb3JkIGBBYFxuICogYW5kIG1ha2VzIGRlZmF1bHQgdmFsdWVzIHJlcXVpcmVkLlxuICpcbiAqICoqRXhhbXBsZToqKlxuICogYFNwcmVhZFZhbHVlczx7IGZvbz86IGJvb2xlYW4sIGJhcj86IG51bWJlciB9LCB7IGZvbzogbnVtYmVyIH0+YFxuICpcbiAqICoqUmVzdWx0OioqIGB7IGZvbzogYm9vbGFuIHwgbnVtYmVyLCBiYXI/OiBudW1iZXIgfWBcbiAqL1xudHlwZSBTcHJlYWREZWZhdWx0czxBLCBEPiA9IEQgZXh0ZW5kcyB1bmRlZmluZWQgPyBBXG4gIDogQSBleHRlbmRzIFJlY29yZDxzdHJpbmcsIHVua25vd24+ID8gXG4gICAgICAmIE9taXQ8QSwga2V5b2YgRD5cbiAgICAgICYge1xuICAgICAgICBbSyBpbiBrZXlvZiBEXTogSyBleHRlbmRzIGtleW9mIEFcbiAgICAgICAgICA/IChBW0tdICYgRFtLXSB8IERbS10pIGV4dGVuZHMgUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbiAgICAgICAgICAgID8gTm9uTnVsbGFibGU8U3ByZWFkRGVmYXVsdHM8QVtLXSwgRFtLXT4+XG4gICAgICAgICAgOiBEW0tdIHwgTm9uTnVsbGFibGU8QVtLXT5cbiAgICAgICAgICA6IHVua25vd247XG4gICAgICB9XG4gIDogbmV2ZXI7XG5cbi8qKlxuICogRGVmaW5lcyB0aGUgUmVjb3JkIGZvciB0aGUgYGRlZmF1bHRgIG9wdGlvbiB0byBhZGRcbiAqIGF1dG8gc3VnZ2VzdGlvbiBzdXBwb3J0IGZvciBJREUncy5cbiAqL1xudHlwZSBEZWZhdWx0czxCIGV4dGVuZHMgQm9vbGVhblR5cGUsIFMgZXh0ZW5kcyBTdHJpbmdUeXBlPiA9IElkPFxuICBVbmlvblRvSW50ZXJzZWN0aW9uPFxuICAgICYgUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbiAgICAvLyBEZWRvdHRlZCBhdXRvIHN1Z2dlc3Rpb25zOiB7IGZvbzogeyBiYXI6IHVua25vd24gfSB9XG4gICAgJiBNYXBUeXBlczxTLCB1bmtub3duPlxuICAgICYgTWFwVHlwZXM8QiwgdW5rbm93bj5cbiAgICAvLyBGbGF0IGF1dG8gc3VnZ2VzdGlvbnM6IHsgXCJmb28uYmFyXCI6IHVua25vd24gfVxuICAgICYgTWFwRGVmYXVsdHM8Qj5cbiAgICAmIE1hcERlZmF1bHRzPFM+XG4gID5cbj47XG5cbnR5cGUgTWFwRGVmYXVsdHM8VCBleHRlbmRzIEFyZ1R5cGU+ID0gUGFydGlhbDxcbiAgUmVjb3JkPFQgZXh0ZW5kcyBzdHJpbmcgPyBUIDogc3RyaW5nLCB1bmtub3duPlxuPjtcblxudHlwZSBSZWN1cnNpdmVSZXF1aXJlZDxUPiA9IFQgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA/IHtcbiAgICBbSyBpbiBrZXlvZiBUXS0/OiBSZWN1cnNpdmVSZXF1aXJlZDxUW0tdPjtcbiAgfVxuICA6IFQ7XG5cbi8qKiBTYW1lIGFzIGBNYXBUeXBlc2AgYnV0IGFsc28gc3VwcG9ydHMgY29sbGVjdGFibGUgb3B0aW9ucy4gKi9cbnR5cGUgQ29sbGVjdFZhbHVlczxcbiAgVCBleHRlbmRzIEFyZ1R5cGUsXG4gIFYsXG4gIEMgZXh0ZW5kcyBDb2xsZWN0YWJsZSxcbiAgTiBleHRlbmRzIE5lZ2F0YWJsZSA9IHVuZGVmaW5lZCxcbj4gPSBVbmlvblRvSW50ZXJzZWN0aW9uPFxuICBDIGV4dGVuZHMgc3RyaW5nID8gXG4gICAgICAmIE1hcFR5cGVzPEV4Y2x1ZGU8VCwgQz4sIFYsIE4+XG4gICAgICAmIChUIGV4dGVuZHMgdW5kZWZpbmVkID8gUmVjb3JkPG5ldmVyLCBuZXZlcj4gOiBSZWN1cnNpdmVSZXF1aXJlZDxcbiAgICAgICAgTWFwVHlwZXM8RXh0cmFjdDxDLCBUPiwgQXJyYXk8Vj4sIE4+XG4gICAgICA+KVxuICAgIDogTWFwVHlwZXM8VCwgViwgTj5cbj47XG5cbi8qKiBTYW1lIGFzIGBSZWNvcmRgIGJ1dCBhbHNvIHN1cHBvcnRzIGRvdHRlZCBhbmQgbmVnYXRhYmxlIG9wdGlvbnMuICovXG50eXBlIE1hcFR5cGVzPFQgZXh0ZW5kcyBBcmdUeXBlLCBWLCBOIGV4dGVuZHMgTmVnYXRhYmxlID0gdW5kZWZpbmVkPiA9XG4gIHVuZGVmaW5lZCBleHRlbmRzIFQgPyBSZWNvcmQ8bmV2ZXIsIG5ldmVyPlxuICAgIDogVCBleHRlbmRzIGAke2luZmVyIE5hbWV9LiR7aW5mZXIgUmVzdH1gID8ge1xuICAgICAgICBbSyBpbiBOYW1lXT86IE1hcFR5cGVzPFxuICAgICAgICAgIFJlc3QsXG4gICAgICAgICAgVixcbiAgICAgICAgICBOIGV4dGVuZHMgYCR7TmFtZX0uJHtpbmZlciBOZWdhdGV9YCA/IE5lZ2F0ZSA6IHVuZGVmaW5lZFxuICAgICAgICA+O1xuICAgICAgfVxuICAgIDogVCBleHRlbmRzIHN0cmluZyA/IFBhcnRpYWw8UmVjb3JkPFQsIE4gZXh0ZW5kcyBUID8gViB8IGZhbHNlIDogVj4+XG4gICAgOiBSZWNvcmQ8bmV2ZXIsIG5ldmVyPjtcblxudHlwZSBDb2xsZWN0VW5rbm93blZhbHVlczxcbiAgQiBleHRlbmRzIEJvb2xlYW5UeXBlLFxuICBTIGV4dGVuZHMgU3RyaW5nVHlwZSxcbiAgQyBleHRlbmRzIENvbGxlY3RhYmxlLFxuICBOIGV4dGVuZHMgTmVnYXRhYmxlLFxuPiA9IEIgJiBTIGV4dGVuZHMgQyA/IFJlY29yZDxuZXZlciwgbmV2ZXI+XG4gIDogRGVkb3RSZWNvcmQ8XG4gICAgLy8gVW5rbm93biBjb2xsZWN0YWJsZSAmIG5vbi1uZWdhdGFibGUgYXJncy5cbiAgICAmIFJlY29yZDxcbiAgICAgIEV4Y2x1ZGU8XG4gICAgICAgIEV4dHJhY3Q8RXhjbHVkZTxDLCBOPiwgc3RyaW5nPixcbiAgICAgICAgRXh0cmFjdDxTIHwgQiwgc3RyaW5nPlxuICAgICAgPixcbiAgICAgIEFycmF5PHVua25vd24+XG4gICAgPlxuICAgIC8vIFVua25vd24gY29sbGVjdGFibGUgJiBuZWdhdGFibGUgYXJncy5cbiAgICAmIFJlY29yZDxcbiAgICAgIEV4Y2x1ZGU8XG4gICAgICAgIEV4dHJhY3Q8RXh0cmFjdDxDLCBOPiwgc3RyaW5nPixcbiAgICAgICAgRXh0cmFjdDxTIHwgQiwgc3RyaW5nPlxuICAgICAgPixcbiAgICAgIEFycmF5PHVua25vd24+IHwgZmFsc2VcbiAgICA+XG4gID47XG5cbi8qKiBDb252ZXJ0cyBgeyBcImZvby5iYXIuYmF6XCI6IHVua25vd24gfWAgaW50byBgeyBmb286IHsgYmFyOiB7IGJhejogdW5rbm93biB9IH0gfWAuICovXG50eXBlIERlZG90UmVjb3JkPFQ+ID0gUmVjb3JkPHN0cmluZywgdW5rbm93bj4gZXh0ZW5kcyBUID8gVFxuICA6IFQgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA/IFVuaW9uVG9JbnRlcnNlY3Rpb248XG4gICAgICBWYWx1ZU9mPFxuICAgICAgICB7IFtLIGluIGtleW9mIFRdOiBLIGV4dGVuZHMgc3RyaW5nID8gRGVkb3Q8SywgVFtLXT4gOiBuZXZlciB9XG4gICAgICA+XG4gICAgPlxuICA6IFQ7XG5cbnR5cGUgRGVkb3Q8VCBleHRlbmRzIHN0cmluZywgVj4gPSBUIGV4dGVuZHMgYCR7aW5mZXIgTmFtZX0uJHtpbmZlciBSZXN0fWBcbiAgPyB7IFtLIGluIE5hbWVdOiBEZWRvdDxSZXN0LCBWPiB9XG4gIDogeyBbSyBpbiBUXTogViB9O1xuXG50eXBlIFZhbHVlT2Y8VD4gPSBUW2tleW9mIFRdO1xuXG4vKiogVGhlIHZhbHVlIHJldHVybmVkIGZyb20gYHBhcnNlYC4gKi9cbmV4cG9ydCB0eXBlIEFyZ3M8XG4gIC8vIGRlbm8tbGludC1pZ25vcmUgbm8tZXhwbGljaXQtYW55XG4gIEEgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiA9IFJlY29yZDxzdHJpbmcsIGFueT4sXG4gIEREIGV4dGVuZHMgYm9vbGVhbiB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZCxcbj4gPSBJZDxcbiAgJiBBXG4gICYge1xuICAgIC8qKiBDb250YWlucyBhbGwgdGhlIGFyZ3VtZW50cyB0aGF0IGRpZG4ndCBoYXZlIGFuIG9wdGlvbiBhc3NvY2lhdGVkIHdpdGhcbiAgICAgKiB0aGVtLiAqL1xuICAgIF86IEFycmF5PHN0cmluZyB8IG51bWJlcj47XG4gIH1cbiAgJiAoYm9vbGVhbiBleHRlbmRzIEREID8gRG91YmxlRGFzaFxuICAgIDogdHJ1ZSBleHRlbmRzIEREID8gUmVxdWlyZWQ8RG91YmxlRGFzaD5cbiAgICA6IFJlY29yZDxuZXZlciwgbmV2ZXI+KVxuPjtcblxudHlwZSBEb3VibGVEYXNoID0ge1xuICAvKiogQ29udGFpbnMgYWxsIHRoZSBhcmd1bWVudHMgdGhhdCBhcHBlYXIgYWZ0ZXIgdGhlIGRvdWJsZSBkYXNoOiBcIi0tXCIuICovXG4gIFwiLS1cIj86IEFycmF5PHN0cmluZz47XG59O1xuXG4vKiogVGhlIG9wdGlvbnMgZm9yIHRoZSBgcGFyc2VgIGNhbGwuICovXG5leHBvcnQgaW50ZXJmYWNlIFBhcnNlT3B0aW9uczxcbiAgQiBleHRlbmRzIEJvb2xlYW5UeXBlID0gQm9vbGVhblR5cGUsXG4gIFMgZXh0ZW5kcyBTdHJpbmdUeXBlID0gU3RyaW5nVHlwZSxcbiAgQyBleHRlbmRzIENvbGxlY3RhYmxlID0gQ29sbGVjdGFibGUsXG4gIE4gZXh0ZW5kcyBOZWdhdGFibGUgPSBOZWdhdGFibGUsXG4gIEQgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZCA9XG4gICAgfCBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPlxuICAgIHwgdW5kZWZpbmVkLFxuICBBIGV4dGVuZHMgQWxpYXNlczxzdHJpbmcsIHN0cmluZz4gfCB1bmRlZmluZWQgPVxuICAgIHwgQWxpYXNlczxzdHJpbmcsIHN0cmluZz5cbiAgICB8IHVuZGVmaW5lZCxcbiAgREQgZXh0ZW5kcyBib29sZWFuIHwgdW5kZWZpbmVkID0gYm9vbGVhbiB8IHVuZGVmaW5lZCxcbj4ge1xuICAvKiogV2hlbiBgdHJ1ZWAsIHBvcHVsYXRlIHRoZSByZXN1bHQgYF9gIHdpdGggZXZlcnl0aGluZyBiZWZvcmUgdGhlIGAtLWAgYW5kXG4gICAqIHRoZSByZXN1bHQgYFsnLS0nXWAgd2l0aCBldmVyeXRoaW5nIGFmdGVyIHRoZSBgLS1gLiBIZXJlJ3MgYW4gZXhhbXBsZTpcbiAgICpcbiAgICogYGBgdHNcbiAgICogLy8gJCBkZW5vIHJ1biBleGFtcGxlLnRzIC0tIGEgYXJnMVxuICAgKiBpbXBvcnQgeyBwYXJzZSB9IGZyb20gXCIuL21vZC50c1wiO1xuICAgKiBjb25zb2xlLmRpcihwYXJzZShEZW5vLmFyZ3MsIHsgXCItLVwiOiBmYWxzZSB9KSk7XG4gICAqIC8vIG91dHB1dDogeyBfOiBbIFwiYVwiLCBcImFyZzFcIiBdIH1cbiAgICogY29uc29sZS5kaXIocGFyc2UoRGVuby5hcmdzLCB7IFwiLS1cIjogdHJ1ZSB9KSk7XG4gICAqIC8vIG91dHB1dDogeyBfOiBbXSwgLS06IFsgXCJhXCIsIFwiYXJnMVwiIF0gfVxuICAgKiBgYGBcbiAgICpcbiAgICogRGVmYXVsdHMgdG8gYGZhbHNlYC5cbiAgICovXG4gIFwiLS1cIj86IEREO1xuXG4gIC8qKiBBbiBvYmplY3QgbWFwcGluZyBzdHJpbmcgbmFtZXMgdG8gc3RyaW5ncyBvciBhcnJheXMgb2Ygc3RyaW5nIGFyZ3VtZW50XG4gICAqIG5hbWVzIHRvIHVzZSBhcyBhbGlhc2VzLiAqL1xuICBhbGlhcz86IEE7XG5cbiAgLyoqIEEgYm9vbGVhbiwgc3RyaW5nIG9yIGFycmF5IG9mIHN0cmluZ3MgdG8gYWx3YXlzIHRyZWF0IGFzIGJvb2xlYW5zLiBJZlxuICAgKiBgdHJ1ZWAgd2lsbCB0cmVhdCBhbGwgZG91YmxlIGh5cGhlbmF0ZWQgYXJndW1lbnRzIHdpdGhvdXQgZXF1YWwgc2lnbnMgYXNcbiAgICogYGJvb2xlYW5gIChlLmcuIGFmZmVjdHMgYC0tZm9vYCwgbm90IGAtZmAgb3IgYC0tZm9vPWJhcmApICovXG4gIGJvb2xlYW4/OiBCIHwgUmVhZG9ubHlBcnJheTxFeHRyYWN0PEIsIHN0cmluZz4+O1xuXG4gIC8qKiBBbiBvYmplY3QgbWFwcGluZyBzdHJpbmcgYXJndW1lbnQgbmFtZXMgdG8gZGVmYXVsdCB2YWx1ZXMuICovXG4gIGRlZmF1bHQ/OiBEICYgRGVmYXVsdHM8QiwgUz47XG5cbiAgLyoqIFdoZW4gYHRydWVgLCBwb3B1bGF0ZSB0aGUgcmVzdWx0IGBfYCB3aXRoIGV2ZXJ5dGhpbmcgYWZ0ZXIgdGhlIGZpcnN0XG4gICAqIG5vbi1vcHRpb24uICovXG4gIHN0b3BFYXJseT86IGJvb2xlYW47XG5cbiAgLyoqIEEgc3RyaW5nIG9yIGFycmF5IG9mIHN0cmluZ3MgYXJndW1lbnQgbmFtZXMgdG8gYWx3YXlzIHRyZWF0IGFzIHN0cmluZ3MuICovXG4gIHN0cmluZz86IFMgfCBSZWFkb25seUFycmF5PEV4dHJhY3Q8Uywgc3RyaW5nPj47XG5cbiAgLyoqIEEgc3RyaW5nIG9yIGFycmF5IG9mIHN0cmluZ3MgYXJndW1lbnQgbmFtZXMgdG8gYWx3YXlzIHRyZWF0IGFzIGFycmF5cy5cbiAgICogQ29sbGVjdGFibGUgb3B0aW9ucyBjYW4gYmUgdXNlZCBtdWx0aXBsZSB0aW1lcy4gQWxsIHZhbHVlcyB3aWxsIGJlXG4gICAqIGNvbGxlY3RlZCBpbnRvIG9uZSBhcnJheS4gSWYgYSBub24tY29sbGVjdGFibGUgb3B0aW9uIGlzIHVzZWQgbXVsdGlwbGVcbiAgICogdGltZXMsIHRoZSBsYXN0IHZhbHVlIGlzIHVzZWQuICovXG4gIGNvbGxlY3Q/OiBDIHwgUmVhZG9ubHlBcnJheTxFeHRyYWN0PEMsIHN0cmluZz4+O1xuXG4gIC8qKiBBIHN0cmluZyBvciBhcnJheSBvZiBzdHJpbmdzIGFyZ3VtZW50IG5hbWVzIHdoaWNoIGNhbiBiZSBuZWdhdGVkXG4gICAqIGJ5IHByZWZpeGluZyB0aGVtIHdpdGggYC0tbm8tYCwgbGlrZSBgLS1uby1jb25maWdgLiAqL1xuICBuZWdhdGFibGU/OiBOIHwgUmVhZG9ubHlBcnJheTxFeHRyYWN0PE4sIHN0cmluZz4+O1xuXG4gIC8qKiBBIGZ1bmN0aW9uIHdoaWNoIGlzIGludm9rZWQgd2l0aCBhIGNvbW1hbmQgbGluZSBwYXJhbWV0ZXIgbm90IGRlZmluZWQgaW5cbiAgICogdGhlIGBvcHRpb25zYCBjb25maWd1cmF0aW9uIG9iamVjdC4gSWYgdGhlIGZ1bmN0aW9uIHJldHVybnMgYGZhbHNlYCwgdGhlXG4gICAqIHVua25vd24gb3B0aW9uIGlzIG5vdCBhZGRlZCB0byBgcGFyc2VkQXJnc2AuICovXG4gIHVua25vd24/OiAoYXJnOiBzdHJpbmcsIGtleT86IHN0cmluZywgdmFsdWU/OiB1bmtub3duKSA9PiB1bmtub3duO1xufVxuXG5pbnRlcmZhY2UgRmxhZ3Mge1xuICBib29sczogUmVjb3JkPHN0cmluZywgYm9vbGVhbj47XG4gIHN0cmluZ3M6IFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+O1xuICBjb2xsZWN0OiBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPjtcbiAgbmVnYXRhYmxlOiBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPjtcbiAgdW5rbm93bkZuOiAoYXJnOiBzdHJpbmcsIGtleT86IHN0cmluZywgdmFsdWU/OiB1bmtub3duKSA9PiB1bmtub3duO1xuICBhbGxCb29sczogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIE5lc3RlZE1hcHBpbmcge1xuICBba2V5OiBzdHJpbmddOiBOZXN0ZWRNYXBwaW5nIHwgdW5rbm93bjtcbn1cblxuY29uc3QgeyBoYXNPd24gfSA9IE9iamVjdDtcblxuZnVuY3Rpb24gZ2V0PFQ+KG9iajogUmVjb3JkPHN0cmluZywgVD4sIGtleTogc3RyaW5nKTogVCB8IHVuZGVmaW5lZCB7XG4gIGlmIChoYXNPd24ob2JqLCBrZXkpKSB7XG4gICAgcmV0dXJuIG9ialtrZXldO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEZvcmNlPFQ+KG9iajogUmVjb3JkPHN0cmluZywgVD4sIGtleTogc3RyaW5nKTogVCB7XG4gIGNvbnN0IHYgPSBnZXQob2JqLCBrZXkpO1xuICBhc3NlcnQodiAhPSBudWxsKTtcbiAgcmV0dXJuIHY7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKHg6IHVua25vd24pOiBib29sZWFuIHtcbiAgaWYgKHR5cGVvZiB4ID09PSBcIm51bWJlclwiKSByZXR1cm4gdHJ1ZTtcbiAgaWYgKC9eMHhbMC05YS1mXSskL2kudGVzdChTdHJpbmcoeCkpKSByZXR1cm4gdHJ1ZTtcbiAgcmV0dXJuIC9eWy0rXT8oPzpcXGQrKD86XFwuXFxkKik/fFxcLlxcZCspKGVbLStdP1xcZCspPyQvLnRlc3QoU3RyaW5nKHgpKTtcbn1cblxuZnVuY3Rpb24gaGFzS2V5KG9iajogTmVzdGVkTWFwcGluZywga2V5czogc3RyaW5nW10pOiBib29sZWFuIHtcbiAgbGV0IG8gPSBvYmo7XG4gIGtleXMuc2xpY2UoMCwgLTEpLmZvckVhY2goKGtleSkgPT4ge1xuICAgIG8gPSAoZ2V0KG8sIGtleSkgPz8ge30pIGFzIE5lc3RlZE1hcHBpbmc7XG4gIH0pO1xuXG4gIGNvbnN0IGtleSA9IGtleXNba2V5cy5sZW5ndGggLSAxXTtcbiAgcmV0dXJuIGhhc093bihvLCBrZXkpO1xufVxuXG4vKiogVGFrZSBhIHNldCBvZiBjb21tYW5kIGxpbmUgYXJndW1lbnRzLCBvcHRpb25hbGx5IHdpdGggYSBzZXQgb2Ygb3B0aW9ucywgYW5kXG4gKiByZXR1cm4gYW4gb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgZmxhZ3MgZm91bmQgaW4gdGhlIHBhc3NlZCBhcmd1bWVudHMuXG4gKlxuICogQnkgZGVmYXVsdCwgYW55IGFyZ3VtZW50cyBzdGFydGluZyB3aXRoIGAtYCBvciBgLS1gIGFyZSBjb25zaWRlcmVkIGJvb2xlYW5cbiAqIGZsYWdzLiBJZiB0aGUgYXJndW1lbnQgbmFtZSBpcyBmb2xsb3dlZCBieSBhbiBlcXVhbCBzaWduIChgPWApIGl0IGlzXG4gKiBjb25zaWRlcmVkIGEga2V5LXZhbHVlIHBhaXIuIEFueSBhcmd1bWVudHMgd2hpY2ggY291bGQgbm90IGJlIHBhcnNlZCBhcmVcbiAqIGF2YWlsYWJsZSBpbiB0aGUgYF9gIHByb3BlcnR5IG9mIHRoZSByZXR1cm5lZCBvYmplY3QuXG4gKlxuICogYGBgdHNcbiAqIGltcG9ydCB7IHBhcnNlIH0gZnJvbSBcIi4vbW9kLnRzXCI7XG4gKiBjb25zdCBwYXJzZWRBcmdzID0gcGFyc2UoRGVuby5hcmdzKTtcbiAqIGBgYFxuICpcbiAqIGBgYHRzXG4gKiBpbXBvcnQgeyBwYXJzZSB9IGZyb20gXCIuL21vZC50c1wiO1xuICogY29uc3QgcGFyc2VkQXJncyA9IHBhcnNlKFtcIi0tZm9vXCIsIFwiLS1iYXI9YmF6XCIsIFwiLS1uby1xdXhcIiwgXCIuL3F1dXgudHh0XCJdKTtcbiAqIC8vIHBhcnNlZEFyZ3M6IHsgZm9vOiB0cnVlLCBiYXI6IFwiYmF6XCIsIHF1eDogZmFsc2UsIF86IFtcIi4vcXV1eC50eHRcIl0gfVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZTxcbiAgViBleHRlbmRzIFZhbHVlczxCLCBTLCBDLCBOLCBELCBBPixcbiAgREQgZXh0ZW5kcyBib29sZWFuIHwgdW5kZWZpbmVkID0gdW5kZWZpbmVkLFxuICBCIGV4dGVuZHMgQm9vbGVhblR5cGUgPSB1bmRlZmluZWQsXG4gIFMgZXh0ZW5kcyBTdHJpbmdUeXBlID0gdW5kZWZpbmVkLFxuICBDIGV4dGVuZHMgQ29sbGVjdGFibGUgPSB1bmRlZmluZWQsXG4gIE4gZXh0ZW5kcyBOZWdhdGFibGUgPSB1bmRlZmluZWQsXG4gIEQgZXh0ZW5kcyBSZWNvcmQ8c3RyaW5nLCB1bmtub3duPiB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZCxcbiAgQSBleHRlbmRzIEFsaWFzZXM8QUssIEFWPiB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZCxcbiAgQUsgZXh0ZW5kcyBzdHJpbmcgPSBzdHJpbmcsXG4gIEFWIGV4dGVuZHMgc3RyaW5nID0gc3RyaW5nLFxuPihcbiAgYXJnczogc3RyaW5nW10sXG4gIHtcbiAgICBcIi0tXCI6IGRvdWJsZURhc2ggPSBmYWxzZSxcbiAgICBhbGlhcyA9IHt9IGFzIE5vbk51bGxhYmxlPEE+LFxuICAgIGJvb2xlYW4gPSBmYWxzZSxcbiAgICBkZWZhdWx0OiBkZWZhdWx0cyA9IHt9IGFzIEQgJiBEZWZhdWx0czxCLCBTPixcbiAgICBzdG9wRWFybHkgPSBmYWxzZSxcbiAgICBzdHJpbmcgPSBbXSxcbiAgICBjb2xsZWN0ID0gW10sXG4gICAgbmVnYXRhYmxlID0gW10sXG4gICAgdW5rbm93biA9IChpOiBzdHJpbmcpOiB1bmtub3duID0+IGksXG4gIH06IFBhcnNlT3B0aW9uczxCLCBTLCBDLCBOLCBELCBBLCBERD4gPSB7fSxcbik6IEFyZ3M8ViwgREQ+IHtcbiAgY29uc3QgZmxhZ3M6IEZsYWdzID0ge1xuICAgIGJvb2xzOiB7fSxcbiAgICBzdHJpbmdzOiB7fSxcbiAgICB1bmtub3duRm46IHVua25vd24sXG4gICAgYWxsQm9vbHM6IGZhbHNlLFxuICAgIGNvbGxlY3Q6IHt9LFxuICAgIG5lZ2F0YWJsZToge30sXG4gIH07XG5cbiAgaWYgKGJvb2xlYW4gIT09IHVuZGVmaW5lZCkge1xuICAgIGlmICh0eXBlb2YgYm9vbGVhbiA9PT0gXCJib29sZWFuXCIpIHtcbiAgICAgIGZsYWdzLmFsbEJvb2xzID0gISFib29sZWFuO1xuICAgIH0gZWxzZSB7XG4gICAgICBjb25zdCBib29sZWFuQXJnczogUmVhZG9ubHlBcnJheTxzdHJpbmc+ID0gdHlwZW9mIGJvb2xlYW4gPT09IFwic3RyaW5nXCJcbiAgICAgICAgPyBbYm9vbGVhbl1cbiAgICAgICAgOiBib29sZWFuO1xuXG4gICAgICBmb3IgKGNvbnN0IGtleSBvZiBib29sZWFuQXJncy5maWx0ZXIoQm9vbGVhbikpIHtcbiAgICAgICAgZmxhZ3MuYm9vbHNba2V5XSA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY29uc3QgYWxpYXNlczogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+ID0ge307XG4gIGlmIChhbGlhcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZm9yIChjb25zdCBrZXkgaW4gYWxpYXMpIHtcbiAgICAgIGNvbnN0IHZhbCA9IGdldEZvcmNlKGFsaWFzLCBrZXkpO1xuICAgICAgaWYgKHR5cGVvZiB2YWwgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgICAgYWxpYXNlc1trZXldID0gW3ZhbF07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBhbGlhc2VzW2tleV0gPSB2YWwgYXMgQXJyYXk8c3RyaW5nPjtcbiAgICAgIH1cbiAgICAgIGZvciAoY29uc3QgYWxpYXMgb2YgZ2V0Rm9yY2UoYWxpYXNlcywga2V5KSkge1xuICAgICAgICBhbGlhc2VzW2FsaWFzXSA9IFtrZXldLmNvbmNhdChhbGlhc2VzW2tleV0uZmlsdGVyKCh5KSA9PiBhbGlhcyAhPT0geSkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGlmIChzdHJpbmcgIT09IHVuZGVmaW5lZCkge1xuICAgIGNvbnN0IHN0cmluZ0FyZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPiA9IHR5cGVvZiBzdHJpbmcgPT09IFwic3RyaW5nXCJcbiAgICAgID8gW3N0cmluZ11cbiAgICAgIDogc3RyaW5nO1xuXG4gICAgZm9yIChjb25zdCBrZXkgb2Ygc3RyaW5nQXJncy5maWx0ZXIoQm9vbGVhbikpIHtcbiAgICAgIGZsYWdzLnN0cmluZ3Nba2V5XSA9IHRydWU7XG4gICAgICBjb25zdCBhbGlhcyA9IGdldChhbGlhc2VzLCBrZXkpO1xuICAgICAgaWYgKGFsaWFzKSB7XG4gICAgICAgIGZvciAoY29uc3QgYWwgb2YgYWxpYXMpIHtcbiAgICAgICAgICBmbGFncy5zdHJpbmdzW2FsXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBpZiAoY29sbGVjdCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgY29sbGVjdEFyZ3M6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPiA9IHR5cGVvZiBjb2xsZWN0ID09PSBcInN0cmluZ1wiXG4gICAgICA/IFtjb2xsZWN0XVxuICAgICAgOiBjb2xsZWN0O1xuXG4gICAgZm9yIChjb25zdCBrZXkgb2YgY29sbGVjdEFyZ3MuZmlsdGVyKEJvb2xlYW4pKSB7XG4gICAgICBmbGFncy5jb2xsZWN0W2tleV0gPSB0cnVlO1xuICAgICAgY29uc3QgYWxpYXMgPSBnZXQoYWxpYXNlcywga2V5KTtcbiAgICAgIGlmIChhbGlhcykge1xuICAgICAgICBmb3IgKGNvbnN0IGFsIG9mIGFsaWFzKSB7XG4gICAgICAgICAgZmxhZ3MuY29sbGVjdFthbF0gPSB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgaWYgKG5lZ2F0YWJsZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgbmVnYXRhYmxlQXJnczogUmVhZG9ubHlBcnJheTxzdHJpbmc+ID0gdHlwZW9mIG5lZ2F0YWJsZSA9PT0gXCJzdHJpbmdcIlxuICAgICAgPyBbbmVnYXRhYmxlXVxuICAgICAgOiBuZWdhdGFibGU7XG5cbiAgICBmb3IgKGNvbnN0IGtleSBvZiBuZWdhdGFibGVBcmdzLmZpbHRlcihCb29sZWFuKSkge1xuICAgICAgZmxhZ3MubmVnYXRhYmxlW2tleV0gPSB0cnVlO1xuICAgICAgY29uc3QgYWxpYXMgPSBnZXQoYWxpYXNlcywga2V5KTtcbiAgICAgIGlmIChhbGlhcykge1xuICAgICAgICBmb3IgKGNvbnN0IGFsIG9mIGFsaWFzKSB7XG4gICAgICAgICAgZmxhZ3MubmVnYXRhYmxlW2FsXSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBjb25zdCBhcmd2OiBBcmdzID0geyBfOiBbXSB9O1xuXG4gIGZ1bmN0aW9uIGFyZ0RlZmluZWQoa2V5OiBzdHJpbmcsIGFyZzogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuIChcbiAgICAgIChmbGFncy5hbGxCb29scyAmJiAvXi0tW149XSskLy50ZXN0KGFyZykpIHx8XG4gICAgICBnZXQoZmxhZ3MuYm9vbHMsIGtleSkgfHxcbiAgICAgICEhZ2V0KGZsYWdzLnN0cmluZ3MsIGtleSkgfHxcbiAgICAgICEhZ2V0KGFsaWFzZXMsIGtleSlcbiAgICApO1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0S2V5KFxuICAgIG9iajogTmVzdGVkTWFwcGluZyxcbiAgICBuYW1lOiBzdHJpbmcsXG4gICAgdmFsdWU6IHVua25vd24sXG4gICAgY29sbGVjdCA9IHRydWUsXG4gICk6IHZvaWQge1xuICAgIGxldCBvID0gb2JqO1xuICAgIGNvbnN0IGtleXMgPSBuYW1lLnNwbGl0KFwiLlwiKTtcbiAgICBrZXlzLnNsaWNlKDAsIC0xKS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpOiB2b2lkIHtcbiAgICAgIGlmIChnZXQobywga2V5KSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG9ba2V5XSA9IHt9O1xuICAgICAgfVxuICAgICAgbyA9IGdldChvLCBrZXkpIGFzIE5lc3RlZE1hcHBpbmc7XG4gICAgfSk7XG5cbiAgICBjb25zdCBrZXkgPSBrZXlzW2tleXMubGVuZ3RoIC0gMV07XG4gICAgY29uc3QgY29sbGVjdGFibGUgPSBjb2xsZWN0ICYmICEhZ2V0KGZsYWdzLmNvbGxlY3QsIG5hbWUpO1xuXG4gICAgaWYgKCFjb2xsZWN0YWJsZSkge1xuICAgICAgb1trZXldID0gdmFsdWU7XG4gICAgfSBlbHNlIGlmIChnZXQobywga2V5KSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBvW2tleV0gPSBbdmFsdWVdO1xuICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShnZXQobywga2V5KSkpIHtcbiAgICAgIChvW2tleV0gYXMgdW5rbm93bltdKS5wdXNoKHZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb1trZXldID0gW2dldChvLCBrZXkpLCB2YWx1ZV07XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2V0QXJnKFxuICAgIGtleTogc3RyaW5nLFxuICAgIHZhbDogdW5rbm93bixcbiAgICBhcmc6IHN0cmluZyB8IHVuZGVmaW5lZCA9IHVuZGVmaW5lZCxcbiAgICBjb2xsZWN0PzogYm9vbGVhbixcbiAgKTogdm9pZCB7XG4gICAgaWYgKGFyZyAmJiBmbGFncy51bmtub3duRm4gJiYgIWFyZ0RlZmluZWQoa2V5LCBhcmcpKSB7XG4gICAgICBpZiAoZmxhZ3MudW5rbm93bkZuKGFyZywga2V5LCB2YWwpID09PSBmYWxzZSkgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHZhbHVlID0gIWdldChmbGFncy5zdHJpbmdzLCBrZXkpICYmIGlzTnVtYmVyKHZhbCkgPyBOdW1iZXIodmFsKSA6IHZhbDtcbiAgICBzZXRLZXkoYXJndiwga2V5LCB2YWx1ZSwgY29sbGVjdCk7XG5cbiAgICBjb25zdCBhbGlhcyA9IGdldChhbGlhc2VzLCBrZXkpO1xuICAgIGlmIChhbGlhcykge1xuICAgICAgZm9yIChjb25zdCB4IG9mIGFsaWFzKSB7XG4gICAgICAgIHNldEtleShhcmd2LCB4LCB2YWx1ZSwgY29sbGVjdCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gYWxpYXNJc0Jvb2xlYW4oa2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gZ2V0Rm9yY2UoYWxpYXNlcywga2V5KS5zb21lKFxuICAgICAgKHgpID0+IHR5cGVvZiBnZXQoZmxhZ3MuYm9vbHMsIHgpID09PSBcImJvb2xlYW5cIixcbiAgICApO1xuICB9XG5cbiAgbGV0IG5vdEZsYWdzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIC8vIGFsbCBhcmdzIGFmdGVyIFwiLS1cIiBhcmUgbm90IHBhcnNlZFxuICBpZiAoYXJncy5pbmNsdWRlcyhcIi0tXCIpKSB7XG4gICAgbm90RmxhZ3MgPSBhcmdzLnNsaWNlKGFyZ3MuaW5kZXhPZihcIi0tXCIpICsgMSk7XG4gICAgYXJncyA9IGFyZ3Muc2xpY2UoMCwgYXJncy5pbmRleE9mKFwiLS1cIikpO1xuICB9XG5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgYXJnID0gYXJnc1tpXTtcblxuICAgIGlmICgvXi0tLis9Ly50ZXN0KGFyZykpIHtcbiAgICAgIGNvbnN0IG0gPSBhcmcubWF0Y2goL14tLShbXj1dKyk9KC4qKSQvcyk7XG4gICAgICBhc3NlcnQobSAhPSBudWxsKTtcbiAgICAgIGNvbnN0IFssIGtleSwgdmFsdWVdID0gbTtcblxuICAgICAgaWYgKGZsYWdzLmJvb2xzW2tleV0pIHtcbiAgICAgICAgY29uc3QgYm9vbGVhblZhbHVlID0gdmFsdWUgIT09IFwiZmFsc2VcIjtcbiAgICAgICAgc2V0QXJnKGtleSwgYm9vbGVhblZhbHVlLCBhcmcpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc2V0QXJnKGtleSwgdmFsdWUsIGFyZyk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChcbiAgICAgIC9eLS1uby0uKy8udGVzdChhcmcpICYmIGdldChmbGFncy5uZWdhdGFibGUsIGFyZy5yZXBsYWNlKC9eLS1uby0vLCBcIlwiKSlcbiAgICApIHtcbiAgICAgIGNvbnN0IG0gPSBhcmcubWF0Y2goL14tLW5vLSguKykvKTtcbiAgICAgIGFzc2VydChtICE9IG51bGwpO1xuICAgICAgc2V0QXJnKG1bMV0sIGZhbHNlLCBhcmcsIGZhbHNlKTtcbiAgICB9IGVsc2UgaWYgKC9eLS0uKy8udGVzdChhcmcpKSB7XG4gICAgICBjb25zdCBtID0gYXJnLm1hdGNoKC9eLS0oLispLyk7XG4gICAgICBhc3NlcnQobSAhPSBudWxsKTtcbiAgICAgIGNvbnN0IFssIGtleV0gPSBtO1xuICAgICAgY29uc3QgbmV4dCA9IGFyZ3NbaSArIDFdO1xuICAgICAgaWYgKFxuICAgICAgICBuZXh0ICE9PSB1bmRlZmluZWQgJiZcbiAgICAgICAgIS9eLS8udGVzdChuZXh0KSAmJlxuICAgICAgICAhZ2V0KGZsYWdzLmJvb2xzLCBrZXkpICYmXG4gICAgICAgICFmbGFncy5hbGxCb29scyAmJlxuICAgICAgICAoZ2V0KGFsaWFzZXMsIGtleSkgPyAhYWxpYXNJc0Jvb2xlYW4oa2V5KSA6IHRydWUpXG4gICAgICApIHtcbiAgICAgICAgc2V0QXJnKGtleSwgbmV4dCwgYXJnKTtcbiAgICAgICAgaSsrO1xuICAgICAgfSBlbHNlIGlmICgvXih0cnVlfGZhbHNlKSQvLnRlc3QobmV4dCkpIHtcbiAgICAgICAgc2V0QXJnKGtleSwgbmV4dCA9PT0gXCJ0cnVlXCIsIGFyZyk7XG4gICAgICAgIGkrKztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHNldEFyZyhrZXksIGdldChmbGFncy5zdHJpbmdzLCBrZXkpID8gXCJcIiA6IHRydWUsIGFyZyk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICgvXi1bXi1dKy8udGVzdChhcmcpKSB7XG4gICAgICBjb25zdCBsZXR0ZXJzID0gYXJnLnNsaWNlKDEsIC0xKS5zcGxpdChcIlwiKTtcblxuICAgICAgbGV0IGJyb2tlbiA9IGZhbHNlO1xuICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBsZXR0ZXJzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgIGNvbnN0IG5leHQgPSBhcmcuc2xpY2UoaiArIDIpO1xuXG4gICAgICAgIGlmIChuZXh0ID09PSBcIi1cIikge1xuICAgICAgICAgIHNldEFyZyhsZXR0ZXJzW2pdLCBuZXh0LCBhcmcpO1xuICAgICAgICAgIGNvbnRpbnVlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKC9bQS1aYS16XS8udGVzdChsZXR0ZXJzW2pdKSAmJiAvPS8udGVzdChuZXh0KSkge1xuICAgICAgICAgIHNldEFyZyhsZXR0ZXJzW2pdLCBuZXh0LnNwbGl0KC89KC4rKS8pWzFdLCBhcmcpO1xuICAgICAgICAgIGJyb2tlbiA9IHRydWU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoXG4gICAgICAgICAgL1tBLVphLXpdLy50ZXN0KGxldHRlcnNbal0pICYmXG4gICAgICAgICAgLy0/XFxkKyhcXC5cXGQqKT8oZS0/XFxkKyk/JC8udGVzdChuZXh0KVxuICAgICAgICApIHtcbiAgICAgICAgICBzZXRBcmcobGV0dGVyc1tqXSwgbmV4dCwgYXJnKTtcbiAgICAgICAgICBicm9rZW4gPSB0cnVlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxldHRlcnNbaiArIDFdICYmIGxldHRlcnNbaiArIDFdLm1hdGNoKC9cXFcvKSkge1xuICAgICAgICAgIHNldEFyZyhsZXR0ZXJzW2pdLCBhcmcuc2xpY2UoaiArIDIpLCBhcmcpO1xuICAgICAgICAgIGJyb2tlbiA9IHRydWU7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2V0QXJnKGxldHRlcnNbal0sIGdldChmbGFncy5zdHJpbmdzLCBsZXR0ZXJzW2pdKSA/IFwiXCIgOiB0cnVlLCBhcmcpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IFtrZXldID0gYXJnLnNsaWNlKC0xKTtcbiAgICAgIGlmICghYnJva2VuICYmIGtleSAhPT0gXCItXCIpIHtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGFyZ3NbaSArIDFdICYmXG4gICAgICAgICAgIS9eKC18LS0pW14tXS8udGVzdChhcmdzW2kgKyAxXSkgJiZcbiAgICAgICAgICAhZ2V0KGZsYWdzLmJvb2xzLCBrZXkpICYmXG4gICAgICAgICAgKGdldChhbGlhc2VzLCBrZXkpID8gIWFsaWFzSXNCb29sZWFuKGtleSkgOiB0cnVlKVxuICAgICAgICApIHtcbiAgICAgICAgICBzZXRBcmcoa2V5LCBhcmdzW2kgKyAxXSwgYXJnKTtcbiAgICAgICAgICBpKys7XG4gICAgICAgIH0gZWxzZSBpZiAoYXJnc1tpICsgMV0gJiYgL14odHJ1ZXxmYWxzZSkkLy50ZXN0KGFyZ3NbaSArIDFdKSkge1xuICAgICAgICAgIHNldEFyZyhrZXksIGFyZ3NbaSArIDFdID09PSBcInRydWVcIiwgYXJnKTtcbiAgICAgICAgICBpKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2V0QXJnKGtleSwgZ2V0KGZsYWdzLnN0cmluZ3MsIGtleSkgPyBcIlwiIDogdHJ1ZSwgYXJnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWZsYWdzLnVua25vd25GbiB8fCBmbGFncy51bmtub3duRm4oYXJnKSAhPT0gZmFsc2UpIHtcbiAgICAgICAgYXJndi5fLnB1c2goZmxhZ3Muc3RyaW5nc1tcIl9cIl0gPz8gIWlzTnVtYmVyKGFyZykgPyBhcmcgOiBOdW1iZXIoYXJnKSk7XG4gICAgICB9XG4gICAgICBpZiAoc3RvcEVhcmx5KSB7XG4gICAgICAgIGFyZ3YuXy5wdXNoKC4uLmFyZ3Muc2xpY2UoaSArIDEpKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yIChjb25zdCBba2V5LCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoZGVmYXVsdHMpKSB7XG4gICAgaWYgKCFoYXNLZXkoYXJndiwga2V5LnNwbGl0KFwiLlwiKSkpIHtcbiAgICAgIHNldEtleShhcmd2LCBrZXksIHZhbHVlKTtcblxuICAgICAgaWYgKGFsaWFzZXNba2V5XSkge1xuICAgICAgICBmb3IgKGNvbnN0IHggb2YgYWxpYXNlc1trZXldKSB7XG4gICAgICAgICAgc2V0S2V5KGFyZ3YsIHgsIHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGZsYWdzLmJvb2xzKSkge1xuICAgIGlmICghaGFzS2V5KGFyZ3YsIGtleS5zcGxpdChcIi5cIikpKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IGdldChmbGFncy5jb2xsZWN0LCBrZXkpID8gW10gOiBmYWxzZTtcbiAgICAgIHNldEtleShcbiAgICAgICAgYXJndixcbiAgICAgICAga2V5LFxuICAgICAgICB2YWx1ZSxcbiAgICAgICAgZmFsc2UsXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGZsYWdzLnN0cmluZ3MpKSB7XG4gICAgaWYgKCFoYXNLZXkoYXJndiwga2V5LnNwbGl0KFwiLlwiKSkgJiYgZ2V0KGZsYWdzLmNvbGxlY3QsIGtleSkpIHtcbiAgICAgIHNldEtleShcbiAgICAgICAgYXJndixcbiAgICAgICAga2V5LFxuICAgICAgICBbXSxcbiAgICAgICAgZmFsc2UsXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIGlmIChkb3VibGVEYXNoKSB7XG4gICAgYXJndltcIi0tXCJdID0gW107XG4gICAgZm9yIChjb25zdCBrZXkgb2Ygbm90RmxhZ3MpIHtcbiAgICAgIGFyZ3ZbXCItLVwiXS5wdXNoKGtleSk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3Qga2V5IG9mIG5vdEZsYWdzKSB7XG4gICAgICBhcmd2Ll8ucHVzaChrZXkpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBhcmd2IGFzIEFyZ3M8ViwgREQ+O1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLDBFQUEwRTtBQUMxRTs7Ozs7O0NBTUMsR0FDRCxTQUFTLE1BQU0sUUFBUSxxQkFBcUI7QUE4UjVDLE1BQU0sRUFBRSxPQUFNLEVBQUUs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