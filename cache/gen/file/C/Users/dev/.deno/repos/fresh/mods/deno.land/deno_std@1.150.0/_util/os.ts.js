// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
// This module is browser compatible.
export const osType = (()=>{
    // deno-lint-ignore no-explicit-any
    const { Deno  } = globalThis;
    if (typeof Deno?.build?.os === "string") {
        return Deno.build.os;
    }
    // deno-lint-ignore no-explicit-any
    const { navigator  } = globalThis;
    if (navigator?.appVersion?.includes?.("Win")) {
        return "windows";
    }
    return "linux";
})();
export const isWindows = osType === "windows";
export const isLinux = osType === "linux";
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovVXNlcnMvZGV2Ly5kZW5vL3JlcG9zL2ZyZXNoL21vZHMvZGVuby5sYW5kL2Rlbm9fc3RkQDEuMTUwLjAvX3V0aWwvb3MudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMiB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbi8vIFRoaXMgbW9kdWxlIGlzIGJyb3dzZXIgY29tcGF0aWJsZS5cblxuZXhwb3J0IHR5cGUgT1NUeXBlID0gXCJ3aW5kb3dzXCIgfCBcImxpbnV4XCIgfCBcImRhcndpblwiO1xuXG5leHBvcnQgY29uc3Qgb3NUeXBlOiBPU1R5cGUgPSAoKCkgPT4ge1xuICAvLyBkZW5vLWxpbnQtaWdub3JlIG5vLWV4cGxpY2l0LWFueVxuICBjb25zdCB7IERlbm8gfSA9IGdsb2JhbFRoaXMgYXMgYW55O1xuICBpZiAodHlwZW9mIERlbm8/LmJ1aWxkPy5vcyA9PT0gXCJzdHJpbmdcIikge1xuICAgIHJldHVybiBEZW5vLmJ1aWxkLm9zO1xuICB9XG5cbiAgLy8gZGVuby1saW50LWlnbm9yZSBuby1leHBsaWNpdC1hbnlcbiAgY29uc3QgeyBuYXZpZ2F0b3IgfSA9IGdsb2JhbFRoaXMgYXMgYW55O1xuICBpZiAobmF2aWdhdG9yPy5hcHBWZXJzaW9uPy5pbmNsdWRlcz8uKFwiV2luXCIpKSB7XG4gICAgcmV0dXJuIFwid2luZG93c1wiO1xuICB9XG5cbiAgcmV0dXJuIFwibGludXhcIjtcbn0pKCk7XG5cbmV4cG9ydCBjb25zdCBpc1dpbmRvd3MgPSBvc1R5cGUgPT09IFwid2luZG93c1wiO1xuZXhwb3J0IGNvbnN0IGlzTGludXggPSBvc1R5cGUgPT09IFwibGludXhcIjtcbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUscUNBQXFDO0FBSXJDLE9BQU8sTUFBTSxTQUFpQixDQUFDLElBQU07SUFDbkMsbUNBQW1DO0lBQ25DLE1BQU0sRUFBRSxLQUFJLEVBQUUsR0FBRztJQUNqQixJQUFJLE9BQU8sTUFBTSxPQUFPLE9BQU8sVUFBVTtRQUN2QyxPQUFPLEtBQUssS0FBSyxDQUFDLEVBQUU7SUFDdEIsQ0FBQztJQUVELG1DQUFtQztJQUNuQyxNQUFNLEVBQUUsVUFBUyxFQUFFLEdBQUc7SUFDdEIsSUFBSSxXQUFXLFlBQVksV0FBVyxRQUFRO1FBQzVDLE9BQU87SUFDVCxDQUFDO0lBRUQsT0FBTztBQUNULENBQUMsSUFBSTtBQUVMLE9BQU8sTUFBTSxZQUFZLFdBQVcsVUFBVTtBQUM5QyxPQUFPLE1BQU0sVUFBVSxXQUFXLFFBQVEifQ==