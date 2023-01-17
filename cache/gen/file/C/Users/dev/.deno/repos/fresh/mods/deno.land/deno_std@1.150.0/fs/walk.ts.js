// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
// Documentation and interface for walk were adapted from Go
// https://golang.org/pkg/path/filepath/#Walk
// Copyright 2009 The Go Authors. All rights reserved. BSD license.
import { assert } from "../_util/assert.ts";
import { join, normalize } from "../path/mod.ts";
import { createWalkEntry, createWalkEntrySync } from "./_util.ts";
function include(path, exts, match, skip) {
    if (exts && !exts.some((ext)=>path.endsWith(ext))) {
        return false;
    }
    if (match && !match.some((pattern)=>!!path.match(pattern))) {
        return false;
    }
    if (skip && skip.some((pattern)=>!!path.match(pattern))) {
        return false;
    }
    return true;
}
function wrapErrorWithRootPath(err, root) {
    if (err instanceof Error && "root" in err) return err;
    const e = new Error();
    e.root = root;
    e.message = err instanceof Error ? `${err.message} for path "${root}"` : `[non-error thrown] for path "${root}"`;
    e.stack = err instanceof Error ? err.stack : undefined;
    e.cause = err instanceof Error ? err.cause : undefined;
    return e;
}
/** Walks the file tree rooted at root, yielding each file or directory in the
 * tree filtered according to the given options. The files are walked in lexical
 * order, which makes the output deterministic but means that for very large
 * directories walk() can be inefficient.
 *
 * Options:
 * - maxDepth?: number = Infinity;
 * - includeFiles?: boolean = true;
 * - includeDirs?: boolean = true;
 * - followSymlinks?: boolean = false;
 * - exts?: string[];
 * - match?: RegExp[];
 * - skip?: RegExp[];
 *
 * ```ts
 *       import { walk } from "./walk.ts";
 *       import { assert } from "../testing/asserts.ts";
 *
 *       for await (const entry of walk(".")) {
 *         console.log(entry.path);
 *         assert(entry.isFile);
 *       }
 * ```
 */ export async function* walk(root, { maxDepth =Infinity , includeFiles =true , includeDirs =true , followSymlinks =false , exts =undefined , match =undefined , skip =undefined  } = {}) {
    if (maxDepth < 0) {
        return;
    }
    if (includeDirs && include(root, exts, match, skip)) {
        yield await createWalkEntry(root);
    }
    if (maxDepth < 1 || !include(root, undefined, undefined, skip)) {
        return;
    }
    try {
        for await (const entry of Deno.readDir(root)){
            assert(entry.name != null);
            let path = join(root, entry.name);
            let { isSymlink , isDirectory  } = entry;
            if (isSymlink) {
                if (!followSymlinks) continue;
                path = await Deno.realPath(path);
                // Caveat emptor: don't assume |path| is not a symlink. realpath()
                // resolves symlinks but another process can replace the file system
                // entity with a different type of entity before we call lstat().
                ({ isSymlink , isDirectory  } = await Deno.lstat(path));
            }
            if (isSymlink || isDirectory) {
                yield* walk(path, {
                    maxDepth: maxDepth - 1,
                    includeFiles,
                    includeDirs,
                    followSymlinks,
                    exts,
                    match,
                    skip
                });
            } else if (includeFiles && include(path, exts, match, skip)) {
                yield {
                    path,
                    ...entry
                };
            }
        }
    } catch (err) {
        throw wrapErrorWithRootPath(err, normalize(root));
    }
}
/** Same as walk() but uses synchronous ops */ export function* walkSync(root, { maxDepth =Infinity , includeFiles =true , includeDirs =true , followSymlinks =false , exts =undefined , match =undefined , skip =undefined  } = {}) {
    if (maxDepth < 0) {
        return;
    }
    if (includeDirs && include(root, exts, match, skip)) {
        yield createWalkEntrySync(root);
    }
    if (maxDepth < 1 || !include(root, undefined, undefined, skip)) {
        return;
    }
    let entries;
    try {
        entries = Deno.readDirSync(root);
    } catch (err) {
        throw wrapErrorWithRootPath(err, normalize(root));
    }
    for (const entry of entries){
        assert(entry.name != null);
        let path = join(root, entry.name);
        let { isSymlink , isDirectory  } = entry;
        if (isSymlink) {
            if (!followSymlinks) continue;
            path = Deno.realPathSync(path);
            // Caveat emptor: don't assume |path| is not a symlink. realpath()
            // resolves symlinks but another process can replace the file system
            // entity with a different type of entity before we call lstat().
            ({ isSymlink , isDirectory  } = Deno.lstatSync(path));
        }
        if (isSymlink || isDirectory) {
            yield* walkSync(path, {
                maxDepth: maxDepth - 1,
                includeFiles,
                includeDirs,
                followSymlinks,
                exts,
                match,
                skip
            });
        } else if (includeFiles && include(path, exts, match, skip)) {
            yield {
                path,
                ...entry
            };
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovVXNlcnMvZGV2Ly5kZW5vL3JlcG9zL2ZyZXNoL21vZHMvZGVuby5sYW5kL2Rlbm9fc3RkQDEuMTUwLjAvZnMvd2Fsay50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIyIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuLy8gRG9jdW1lbnRhdGlvbiBhbmQgaW50ZXJmYWNlIGZvciB3YWxrIHdlcmUgYWRhcHRlZCBmcm9tIEdvXG4vLyBodHRwczovL2dvbGFuZy5vcmcvcGtnL3BhdGgvZmlsZXBhdGgvI1dhbGtcbi8vIENvcHlyaWdodCAyMDA5IFRoZSBHbyBBdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBCU0QgbGljZW5zZS5cbmltcG9ydCB7IGFzc2VydCB9IGZyb20gXCIuLi9fdXRpbC9hc3NlcnQudHNcIjtcbmltcG9ydCB7IGpvaW4sIG5vcm1hbGl6ZSB9IGZyb20gXCIuLi9wYXRoL21vZC50c1wiO1xuaW1wb3J0IHsgY3JlYXRlV2Fsa0VudHJ5LCBjcmVhdGVXYWxrRW50cnlTeW5jLCBXYWxrRW50cnkgfSBmcm9tIFwiLi9fdXRpbC50c1wiO1xuXG5mdW5jdGlvbiBpbmNsdWRlKFxuICBwYXRoOiBzdHJpbmcsXG4gIGV4dHM/OiBzdHJpbmdbXSxcbiAgbWF0Y2g/OiBSZWdFeHBbXSxcbiAgc2tpcD86IFJlZ0V4cFtdLFxuKTogYm9vbGVhbiB7XG4gIGlmIChleHRzICYmICFleHRzLnNvbWUoKGV4dCk6IGJvb2xlYW4gPT4gcGF0aC5lbmRzV2l0aChleHQpKSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAobWF0Y2ggJiYgIW1hdGNoLnNvbWUoKHBhdHRlcm4pOiBib29sZWFuID0+ICEhcGF0aC5tYXRjaChwYXR0ZXJuKSkpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKHNraXAgJiYgc2tpcC5zb21lKChwYXR0ZXJuKTogYm9vbGVhbiA9PiAhIXBhdGgubWF0Y2gocGF0dGVybikpKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG5mdW5jdGlvbiB3cmFwRXJyb3JXaXRoUm9vdFBhdGgoZXJyOiB1bmtub3duLCByb290OiBzdHJpbmcpIHtcbiAgaWYgKGVyciBpbnN0YW5jZW9mIEVycm9yICYmIFwicm9vdFwiIGluIGVycikgcmV0dXJuIGVycjtcbiAgY29uc3QgZSA9IG5ldyBFcnJvcigpIGFzIEVycm9yICYgeyByb290OiBzdHJpbmcgfTtcbiAgZS5yb290ID0gcm9vdDtcbiAgZS5tZXNzYWdlID0gZXJyIGluc3RhbmNlb2YgRXJyb3JcbiAgICA/IGAke2Vyci5tZXNzYWdlfSBmb3IgcGF0aCBcIiR7cm9vdH1cImBcbiAgICA6IGBbbm9uLWVycm9yIHRocm93bl0gZm9yIHBhdGggXCIke3Jvb3R9XCJgO1xuICBlLnN0YWNrID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIuc3RhY2sgOiB1bmRlZmluZWQ7XG4gIGUuY2F1c2UgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5jYXVzZSA6IHVuZGVmaW5lZDtcbiAgcmV0dXJuIGU7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2Fsa09wdGlvbnMge1xuICBtYXhEZXB0aD86IG51bWJlcjtcbiAgaW5jbHVkZUZpbGVzPzogYm9vbGVhbjtcbiAgaW5jbHVkZURpcnM/OiBib29sZWFuO1xuICBmb2xsb3dTeW1saW5rcz86IGJvb2xlYW47XG4gIGV4dHM/OiBzdHJpbmdbXTtcbiAgbWF0Y2g/OiBSZWdFeHBbXTtcbiAgc2tpcD86IFJlZ0V4cFtdO1xufVxuZXhwb3J0IHR5cGUgeyBXYWxrRW50cnkgfTtcblxuLyoqIFdhbGtzIHRoZSBmaWxlIHRyZWUgcm9vdGVkIGF0IHJvb3QsIHlpZWxkaW5nIGVhY2ggZmlsZSBvciBkaXJlY3RvcnkgaW4gdGhlXG4gKiB0cmVlIGZpbHRlcmVkIGFjY29yZGluZyB0byB0aGUgZ2l2ZW4gb3B0aW9ucy4gVGhlIGZpbGVzIGFyZSB3YWxrZWQgaW4gbGV4aWNhbFxuICogb3JkZXIsIHdoaWNoIG1ha2VzIHRoZSBvdXRwdXQgZGV0ZXJtaW5pc3RpYyBidXQgbWVhbnMgdGhhdCBmb3IgdmVyeSBsYXJnZVxuICogZGlyZWN0b3JpZXMgd2FsaygpIGNhbiBiZSBpbmVmZmljaWVudC5cbiAqXG4gKiBPcHRpb25zOlxuICogLSBtYXhEZXB0aD86IG51bWJlciA9IEluZmluaXR5O1xuICogLSBpbmNsdWRlRmlsZXM/OiBib29sZWFuID0gdHJ1ZTtcbiAqIC0gaW5jbHVkZURpcnM/OiBib29sZWFuID0gdHJ1ZTtcbiAqIC0gZm9sbG93U3ltbGlua3M/OiBib29sZWFuID0gZmFsc2U7XG4gKiAtIGV4dHM/OiBzdHJpbmdbXTtcbiAqIC0gbWF0Y2g/OiBSZWdFeHBbXTtcbiAqIC0gc2tpcD86IFJlZ0V4cFtdO1xuICpcbiAqIGBgYHRzXG4gKiAgICAgICBpbXBvcnQgeyB3YWxrIH0gZnJvbSBcIi4vd2Fsay50c1wiO1xuICogICAgICAgaW1wb3J0IHsgYXNzZXJ0IH0gZnJvbSBcIi4uL3Rlc3RpbmcvYXNzZXJ0cy50c1wiO1xuICpcbiAqICAgICAgIGZvciBhd2FpdCAoY29uc3QgZW50cnkgb2Ygd2FsayhcIi5cIikpIHtcbiAqICAgICAgICAgY29uc29sZS5sb2coZW50cnkucGF0aCk7XG4gKiAgICAgICAgIGFzc2VydChlbnRyeS5pc0ZpbGUpO1xuICogICAgICAgfVxuICogYGBgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiogd2FsayhcbiAgcm9vdDogc3RyaW5nLFxuICB7XG4gICAgbWF4RGVwdGggPSBJbmZpbml0eSxcbiAgICBpbmNsdWRlRmlsZXMgPSB0cnVlLFxuICAgIGluY2x1ZGVEaXJzID0gdHJ1ZSxcbiAgICBmb2xsb3dTeW1saW5rcyA9IGZhbHNlLFxuICAgIGV4dHMgPSB1bmRlZmluZWQsXG4gICAgbWF0Y2ggPSB1bmRlZmluZWQsXG4gICAgc2tpcCA9IHVuZGVmaW5lZCxcbiAgfTogV2Fsa09wdGlvbnMgPSB7fSxcbik6IEFzeW5jSXRlcmFibGVJdGVyYXRvcjxXYWxrRW50cnk+IHtcbiAgaWYgKG1heERlcHRoIDwgMCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoaW5jbHVkZURpcnMgJiYgaW5jbHVkZShyb290LCBleHRzLCBtYXRjaCwgc2tpcCkpIHtcbiAgICB5aWVsZCBhd2FpdCBjcmVhdGVXYWxrRW50cnkocm9vdCk7XG4gIH1cbiAgaWYgKG1heERlcHRoIDwgMSB8fCAhaW5jbHVkZShyb290LCB1bmRlZmluZWQsIHVuZGVmaW5lZCwgc2tpcCkpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdHJ5IHtcbiAgICBmb3IgYXdhaXQgKGNvbnN0IGVudHJ5IG9mIERlbm8ucmVhZERpcihyb290KSkge1xuICAgICAgYXNzZXJ0KGVudHJ5Lm5hbWUgIT0gbnVsbCk7XG4gICAgICBsZXQgcGF0aCA9IGpvaW4ocm9vdCwgZW50cnkubmFtZSk7XG5cbiAgICAgIGxldCB7IGlzU3ltbGluaywgaXNEaXJlY3RvcnkgfSA9IGVudHJ5O1xuXG4gICAgICBpZiAoaXNTeW1saW5rKSB7XG4gICAgICAgIGlmICghZm9sbG93U3ltbGlua3MpIGNvbnRpbnVlO1xuICAgICAgICBwYXRoID0gYXdhaXQgRGVuby5yZWFsUGF0aChwYXRoKTtcbiAgICAgICAgLy8gQ2F2ZWF0IGVtcHRvcjogZG9uJ3QgYXNzdW1lIHxwYXRofCBpcyBub3QgYSBzeW1saW5rLiByZWFscGF0aCgpXG4gICAgICAgIC8vIHJlc29sdmVzIHN5bWxpbmtzIGJ1dCBhbm90aGVyIHByb2Nlc3MgY2FuIHJlcGxhY2UgdGhlIGZpbGUgc3lzdGVtXG4gICAgICAgIC8vIGVudGl0eSB3aXRoIGEgZGlmZmVyZW50IHR5cGUgb2YgZW50aXR5IGJlZm9yZSB3ZSBjYWxsIGxzdGF0KCkuXG4gICAgICAgICh7IGlzU3ltbGluaywgaXNEaXJlY3RvcnkgfSA9IGF3YWl0IERlbm8ubHN0YXQocGF0aCkpO1xuICAgICAgfVxuXG4gICAgICBpZiAoaXNTeW1saW5rIHx8IGlzRGlyZWN0b3J5KSB7XG4gICAgICAgIHlpZWxkKiB3YWxrKHBhdGgsIHtcbiAgICAgICAgICBtYXhEZXB0aDogbWF4RGVwdGggLSAxLFxuICAgICAgICAgIGluY2x1ZGVGaWxlcyxcbiAgICAgICAgICBpbmNsdWRlRGlycyxcbiAgICAgICAgICBmb2xsb3dTeW1saW5rcyxcbiAgICAgICAgICBleHRzLFxuICAgICAgICAgIG1hdGNoLFxuICAgICAgICAgIHNraXAsXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIGlmIChpbmNsdWRlRmlsZXMgJiYgaW5jbHVkZShwYXRoLCBleHRzLCBtYXRjaCwgc2tpcCkpIHtcbiAgICAgICAgeWllbGQgeyBwYXRoLCAuLi5lbnRyeSB9O1xuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgdGhyb3cgd3JhcEVycm9yV2l0aFJvb3RQYXRoKGVyciwgbm9ybWFsaXplKHJvb3QpKTtcbiAgfVxufVxuXG4vKiogU2FtZSBhcyB3YWxrKCkgYnV0IHVzZXMgc3luY2hyb25vdXMgb3BzICovXG5leHBvcnQgZnVuY3Rpb24qIHdhbGtTeW5jKFxuICByb290OiBzdHJpbmcsXG4gIHtcbiAgICBtYXhEZXB0aCA9IEluZmluaXR5LFxuICAgIGluY2x1ZGVGaWxlcyA9IHRydWUsXG4gICAgaW5jbHVkZURpcnMgPSB0cnVlLFxuICAgIGZvbGxvd1N5bWxpbmtzID0gZmFsc2UsXG4gICAgZXh0cyA9IHVuZGVmaW5lZCxcbiAgICBtYXRjaCA9IHVuZGVmaW5lZCxcbiAgICBza2lwID0gdW5kZWZpbmVkLFxuICB9OiBXYWxrT3B0aW9ucyA9IHt9LFxuKTogSXRlcmFibGVJdGVyYXRvcjxXYWxrRW50cnk+IHtcbiAgaWYgKG1heERlcHRoIDwgMCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoaW5jbHVkZURpcnMgJiYgaW5jbHVkZShyb290LCBleHRzLCBtYXRjaCwgc2tpcCkpIHtcbiAgICB5aWVsZCBjcmVhdGVXYWxrRW50cnlTeW5jKHJvb3QpO1xuICB9XG4gIGlmIChtYXhEZXB0aCA8IDEgfHwgIWluY2x1ZGUocm9vdCwgdW5kZWZpbmVkLCB1bmRlZmluZWQsIHNraXApKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGxldCBlbnRyaWVzO1xuICB0cnkge1xuICAgIGVudHJpZXMgPSBEZW5vLnJlYWREaXJTeW5jKHJvb3QpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICB0aHJvdyB3cmFwRXJyb3JXaXRoUm9vdFBhdGgoZXJyLCBub3JtYWxpemUocm9vdCkpO1xuICB9XG4gIGZvciAoY29uc3QgZW50cnkgb2YgZW50cmllcykge1xuICAgIGFzc2VydChlbnRyeS5uYW1lICE9IG51bGwpO1xuICAgIGxldCBwYXRoID0gam9pbihyb290LCBlbnRyeS5uYW1lKTtcblxuICAgIGxldCB7IGlzU3ltbGluaywgaXNEaXJlY3RvcnkgfSA9IGVudHJ5O1xuXG4gICAgaWYgKGlzU3ltbGluaykge1xuICAgICAgaWYgKCFmb2xsb3dTeW1saW5rcykgY29udGludWU7XG4gICAgICBwYXRoID0gRGVuby5yZWFsUGF0aFN5bmMocGF0aCk7XG4gICAgICAvLyBDYXZlYXQgZW1wdG9yOiBkb24ndCBhc3N1bWUgfHBhdGh8IGlzIG5vdCBhIHN5bWxpbmsuIHJlYWxwYXRoKClcbiAgICAgIC8vIHJlc29sdmVzIHN5bWxpbmtzIGJ1dCBhbm90aGVyIHByb2Nlc3MgY2FuIHJlcGxhY2UgdGhlIGZpbGUgc3lzdGVtXG4gICAgICAvLyBlbnRpdHkgd2l0aCBhIGRpZmZlcmVudCB0eXBlIG9mIGVudGl0eSBiZWZvcmUgd2UgY2FsbCBsc3RhdCgpLlxuICAgICAgKHsgaXNTeW1saW5rLCBpc0RpcmVjdG9yeSB9ID0gRGVuby5sc3RhdFN5bmMocGF0aCkpO1xuICAgIH1cblxuICAgIGlmIChpc1N5bWxpbmsgfHwgaXNEaXJlY3RvcnkpIHtcbiAgICAgIHlpZWxkKiB3YWxrU3luYyhwYXRoLCB7XG4gICAgICAgIG1heERlcHRoOiBtYXhEZXB0aCAtIDEsXG4gICAgICAgIGluY2x1ZGVGaWxlcyxcbiAgICAgICAgaW5jbHVkZURpcnMsXG4gICAgICAgIGZvbGxvd1N5bWxpbmtzLFxuICAgICAgICBleHRzLFxuICAgICAgICBtYXRjaCxcbiAgICAgICAgc2tpcCxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSBpZiAoaW5jbHVkZUZpbGVzICYmIGluY2x1ZGUocGF0aCwgZXh0cywgbWF0Y2gsIHNraXApKSB7XG4gICAgICB5aWVsZCB7IHBhdGgsIC4uLmVudHJ5IH07XG4gICAgfVxuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLDREQUE0RDtBQUM1RCw2Q0FBNkM7QUFDN0MsbUVBQW1FO0FBQ25FLFNBQVMsTUFBTSxRQUFRLHFCQUFxQjtBQUM1QyxTQUFTLElBQUksRUFBRSxTQUFTLFFBQVEsaUJBQWlCO0FBQ2pELFNBQVMsZUFBZSxFQUFFLG1CQUFtQixRQUFtQixhQUFhO0FBRTdFLFNBQVMsUUFDUCxJQUFZLEVBQ1osSUFBZSxFQUNmLEtBQWdCLEVBQ2hCLElBQWUsRUFDTjtJQUNULElBQUksUUFBUSxDQUFDLEtBQUssSUFBSSxDQUFDLENBQUMsTUFBaUIsS0FBSyxRQUFRLENBQUMsT0FBTztRQUM1RCxPQUFPLEtBQUs7SUFDZCxDQUFDO0lBQ0QsSUFBSSxTQUFTLENBQUMsTUFBTSxJQUFJLENBQUMsQ0FBQyxVQUFxQixDQUFDLENBQUMsS0FBSyxLQUFLLENBQUMsV0FBVztRQUNyRSxPQUFPLEtBQUs7SUFDZCxDQUFDO0lBQ0QsSUFBSSxRQUFRLEtBQUssSUFBSSxDQUFDLENBQUMsVUFBcUIsQ0FBQyxDQUFDLEtBQUssS0FBSyxDQUFDLFdBQVc7UUFDbEUsT0FBTyxLQUFLO0lBQ2QsQ0FBQztJQUNELE9BQU8sSUFBSTtBQUNiO0FBRUEsU0FBUyxzQkFBc0IsR0FBWSxFQUFFLElBQVksRUFBRTtJQUN6RCxJQUFJLGVBQWUsU0FBUyxVQUFVLEtBQUssT0FBTztJQUNsRCxNQUFNLElBQUksSUFBSTtJQUNkLEVBQUUsSUFBSSxHQUFH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