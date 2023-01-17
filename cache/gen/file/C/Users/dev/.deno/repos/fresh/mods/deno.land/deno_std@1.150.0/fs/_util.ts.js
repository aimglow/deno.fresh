// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
import * as path from "../path/mod.ts";
import { basename, normalize } from "../path/mod.ts";
/**
 * Test whether or not `dest` is a sub-directory of `src`
 * @param src src file path
 * @param dest dest file path
 * @param sep path separator
 */ export function isSubdir(src, dest, sep = path.sep) {
    if (src === dest) {
        return false;
    }
    const srcArray = src.split(sep);
    const destArray = dest.split(sep);
    return srcArray.every((current, i)=>destArray[i] === current);
}
/**
 * Get a human readable file type string.
 *
 * @param fileInfo A FileInfo describes a file and is returned by `stat`,
 *                 `lstat`
 */ export function getFileInfoType(fileInfo) {
    return fileInfo.isFile ? "file" : fileInfo.isDirectory ? "dir" : fileInfo.isSymlink ? "symlink" : undefined;
}
/** Create WalkEntry for the `path` synchronously */ export function createWalkEntrySync(path) {
    path = normalize(path);
    const name = basename(path);
    const info = Deno.statSync(path);
    return {
        path,
        name,
        isFile: info.isFile,
        isDirectory: info.isDirectory,
        isSymlink: info.isSymlink
    };
}
/** Create WalkEntry for the `path` asynchronously */ export async function createWalkEntry(path) {
    path = normalize(path);
    const name = basename(path);
    const info = await Deno.stat(path);
    return {
        path,
        name,
        isFile: info.isFile,
        isDirectory: info.isDirectory,
        isSymlink: info.isSymlink
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovVXNlcnMvZGV2Ly5kZW5vL3JlcG9zL2ZyZXNoL21vZHMvZGVuby5sYW5kL2Rlbm9fc3RkQDEuMTUwLjAvZnMvX3V0aWwudHMiXSwic291cmNlc0NvbnRlbnQiOlsiLy8gQ29weXJpZ2h0IDIwMTgtMjAyMiB0aGUgRGVubyBhdXRob3JzLiBBbGwgcmlnaHRzIHJlc2VydmVkLiBNSVQgbGljZW5zZS5cbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcIi4uL3BhdGgvbW9kLnRzXCI7XG5pbXBvcnQgeyBiYXNlbmFtZSwgbm9ybWFsaXplIH0gZnJvbSBcIi4uL3BhdGgvbW9kLnRzXCI7XG5cbi8qKlxuICogVGVzdCB3aGV0aGVyIG9yIG5vdCBgZGVzdGAgaXMgYSBzdWItZGlyZWN0b3J5IG9mIGBzcmNgXG4gKiBAcGFyYW0gc3JjIHNyYyBmaWxlIHBhdGhcbiAqIEBwYXJhbSBkZXN0IGRlc3QgZmlsZSBwYXRoXG4gKiBAcGFyYW0gc2VwIHBhdGggc2VwYXJhdG9yXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N1YmRpcihcbiAgc3JjOiBzdHJpbmcsXG4gIGRlc3Q6IHN0cmluZyxcbiAgc2VwOiBzdHJpbmcgPSBwYXRoLnNlcCxcbik6IGJvb2xlYW4ge1xuICBpZiAoc3JjID09PSBkZXN0KSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGNvbnN0IHNyY0FycmF5ID0gc3JjLnNwbGl0KHNlcCk7XG4gIGNvbnN0IGRlc3RBcnJheSA9IGRlc3Quc3BsaXQoc2VwKTtcbiAgcmV0dXJuIHNyY0FycmF5LmV2ZXJ5KChjdXJyZW50LCBpKSA9PiBkZXN0QXJyYXlbaV0gPT09IGN1cnJlbnQpO1xufVxuXG5leHBvcnQgdHlwZSBQYXRoVHlwZSA9IFwiZmlsZVwiIHwgXCJkaXJcIiB8IFwic3ltbGlua1wiO1xuXG4vKipcbiAqIEdldCBhIGh1bWFuIHJlYWRhYmxlIGZpbGUgdHlwZSBzdHJpbmcuXG4gKlxuICogQHBhcmFtIGZpbGVJbmZvIEEgRmlsZUluZm8gZGVzY3JpYmVzIGEgZmlsZSBhbmQgaXMgcmV0dXJuZWQgYnkgYHN0YXRgLFxuICogICAgICAgICAgICAgICAgIGBsc3RhdGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldEZpbGVJbmZvVHlwZShmaWxlSW5mbzogRGVuby5GaWxlSW5mbyk6IFBhdGhUeXBlIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIGZpbGVJbmZvLmlzRmlsZVxuICAgID8gXCJmaWxlXCJcbiAgICA6IGZpbGVJbmZvLmlzRGlyZWN0b3J5XG4gICAgPyBcImRpclwiXG4gICAgOiBmaWxlSW5mby5pc1N5bWxpbmtcbiAgICA/IFwic3ltbGlua1wiXG4gICAgOiB1bmRlZmluZWQ7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV2Fsa0VudHJ5IGV4dGVuZHMgRGVuby5EaXJFbnRyeSB7XG4gIHBhdGg6IHN0cmluZztcbn1cblxuLyoqIENyZWF0ZSBXYWxrRW50cnkgZm9yIHRoZSBgcGF0aGAgc3luY2hyb25vdXNseSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVdhbGtFbnRyeVN5bmMocGF0aDogc3RyaW5nKTogV2Fsa0VudHJ5IHtcbiAgcGF0aCA9IG5vcm1hbGl6ZShwYXRoKTtcbiAgY29uc3QgbmFtZSA9IGJhc2VuYW1lKHBhdGgpO1xuICBjb25zdCBpbmZvID0gRGVuby5zdGF0U3luYyhwYXRoKTtcbiAgcmV0dXJuIHtcbiAgICBwYXRoLFxuICAgIG5hbWUsXG4gICAgaXNGaWxlOiBpbmZvLmlzRmlsZSxcbiAgICBpc0RpcmVjdG9yeTogaW5mby5pc0RpcmVjdG9yeSxcbiAgICBpc1N5bWxpbms6IGluZm8uaXNTeW1saW5rLFxuICB9O1xufVxuXG4vKiogQ3JlYXRlIFdhbGtFbnRyeSBmb3IgdGhlIGBwYXRoYCBhc3luY2hyb25vdXNseSAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVdhbGtFbnRyeShwYXRoOiBzdHJpbmcpOiBQcm9taXNlPFdhbGtFbnRyeT4ge1xuICBwYXRoID0gbm9ybWFsaXplKHBhdGgpO1xuICBjb25zdCBuYW1lID0gYmFzZW5hbWUocGF0aCk7XG4gIGNvbnN0IGluZm8gPSBhd2FpdCBEZW5vLnN0YXQocGF0aCk7XG4gIHJldHVybiB7XG4gICAgcGF0aCxcbiAgICBuYW1lLFxuICAgIGlzRmlsZTogaW5mby5pc0ZpbGUsXG4gICAgaXNEaXJlY3Rvcnk6IGluZm8uaXNEaXJlY3RvcnksXG4gICAgaXNTeW1saW5rOiBpbmZvLmlzU3ltbGluayxcbiAgfTtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSwwRUFBMEU7QUFDMUUsWUFBWSxVQUFVLGlCQUFpQjtBQUN2QyxTQUFTLFFBQVEsRUFBRSxTQUFTLFFBQVEsaUJBQWlCO0FBRXJEOzs7OztDQUtDLEdBQ0QsT0FBTyxTQUFTLFNBQ2QsR0FBVyxFQUNYLElBQVksRUFDWixNQUFjLEtBQUssR0FBRyxFQUNiO0lBQ1QsSUFBSSxRQUFRLE1BQU07UUFDaEIsT0FBTyxLQUFLO0lBQ2QsQ0FBQztJQUNELE1BQU0sV0FBVyxJQUFJLEtBQUssQ0FBQztJQUMzQixNQUFNLFlBQVksS0FBSyxLQUFLLENBQUM7SUFDN0IsT0FBTyxTQUFTLEtBQUssQ0FBQyxDQUFDLFNBQVMsSUFBTSxTQUFTLENBQUMsRUFBRSxLQUFLO0FBQ3pELENBQUM7QUFJRDs7Ozs7Q0FLQyxHQUNELE9BQU8sU0FBUyxnQkFBZ0IsUUFBdUIsRUFBd0I7SUFDN0UsT0FBTyxTQUFTLE1BQU0sR0FDbEIsU0FDQSxTQUFTLFdBQVcsR0FDcEIsUUFDQSxTQUFTLFNBQVMsR0FDbEIsWUFDQSxTQUFTO0FBQ2YsQ0FBQztBQU1ELGtEQUFrRCxHQUNsRCxPQUFPLFNBQVMsb0JBQW9CLElBQVksRUFBYTtJQUMzRCxPQUFPLFVBQVU7SUFDakIsTUFBTSxPQUFPLFNBQVM7SUFDdEIsTUFBTSxPQUFPLEtBQUssUUFBUSxDQUFDO0lBQzNCLE9BQU87UUFDTDtRQUNBO1FBQ0EsUUFBUSxLQUFLLE1BQU07UUFDbkIsYUFBYSxLQUFLLFdBQVc7UUFDN0IsV0FBVyxLQUFLLFNBQVM7SUFDM0I7QUFDRixDQUFDO0FBRUQsbURBQW1ELEdBQ25ELE9BQU8sZUFBZSxnQkFBZ0IsSUFBWSxFQUFzQjtJQUN0RSxPQUFPLFVBQVU7SUFDakIsTUFBTSxPQUFPLFNBQVM7SUFDdEIsTUFBTSxPQUFPLE1BQU0sS0FBSyxJQUFJLENBQUM7SUFDN0IsT0FBTztRQUNMO1FBQ0E7UUFDQSxRQUFRLEtBQUssTUFBTTtRQUNuQixhQUFhLEtBQUssV0FBVztRQUM3QixXQUFXLEtBQUssU0FBUztJQUMzQjtBQUNGLENBQUMifQ==