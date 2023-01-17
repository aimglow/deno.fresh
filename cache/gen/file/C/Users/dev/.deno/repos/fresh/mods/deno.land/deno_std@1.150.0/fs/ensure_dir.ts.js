// Copyright 2018-2022 the Deno authors. All rights reserved. MIT license.
import { getFileInfoType } from "./_util.ts";
/**
 * Ensures that the directory exists.
 * If the directory structure does not exist, it is created. Like mkdir -p.
 * Requires the `--allow-read` and `--allow-write` flag.
 */ export async function ensureDir(dir) {
    try {
        const fileInfo = await Deno.lstat(dir);
        if (!fileInfo.isDirectory) {
            throw new Error(`Ensure path exists, expected 'dir', got '${getFileInfoType(fileInfo)}'`);
        }
    } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
            // if dir not exists. then create it.
            await Deno.mkdir(dir, {
                recursive: true
            });
            return;
        }
        throw err;
    }
}
/**
 * Ensures that the directory exists.
 * If the directory structure does not exist, it is created. Like mkdir -p.
 * Requires the `--allow-read` and `--allow-write` flag.
 */ export function ensureDirSync(dir) {
    try {
        const fileInfo = Deno.lstatSync(dir);
        if (!fileInfo.isDirectory) {
            throw new Error(`Ensure path exists, expected 'dir', got '${getFileInfoType(fileInfo)}'`);
        }
    } catch (err) {
        if (err instanceof Deno.errors.NotFound) {
            // if dir not exists. then create it.
            Deno.mkdirSync(dir, {
                recursive: true
            });
            return;
        }
        throw err;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovVXNlcnMvZGV2Ly5kZW5vL3JlcG9zL2ZyZXNoL21vZHMvZGVuby5sYW5kL2Rlbm9fc3RkQDEuMTUwLjAvZnMvZW5zdXJlX2Rpci50cyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyBDb3B5cmlnaHQgMjAxOC0yMDIyIHRoZSBEZW5vIGF1dGhvcnMuIEFsbCByaWdodHMgcmVzZXJ2ZWQuIE1JVCBsaWNlbnNlLlxuaW1wb3J0IHsgZ2V0RmlsZUluZm9UeXBlIH0gZnJvbSBcIi4vX3V0aWwudHNcIjtcblxuLyoqXG4gKiBFbnN1cmVzIHRoYXQgdGhlIGRpcmVjdG9yeSBleGlzdHMuXG4gKiBJZiB0aGUgZGlyZWN0b3J5IHN0cnVjdHVyZSBkb2VzIG5vdCBleGlzdCwgaXQgaXMgY3JlYXRlZC4gTGlrZSBta2RpciAtcC5cbiAqIFJlcXVpcmVzIHRoZSBgLS1hbGxvdy1yZWFkYCBhbmQgYC0tYWxsb3ctd3JpdGVgIGZsYWcuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBlbnN1cmVEaXIoZGlyOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBmaWxlSW5mbyA9IGF3YWl0IERlbm8ubHN0YXQoZGlyKTtcbiAgICBpZiAoIWZpbGVJbmZvLmlzRGlyZWN0b3J5KSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBFbnN1cmUgcGF0aCBleGlzdHMsIGV4cGVjdGVkICdkaXInLCBnb3QgJyR7XG4gICAgICAgICAgZ2V0RmlsZUluZm9UeXBlKGZpbGVJbmZvKVxuICAgICAgICB9J2AsXG4gICAgICApO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgaWYgKGVyciBpbnN0YW5jZW9mIERlbm8uZXJyb3JzLk5vdEZvdW5kKSB7XG4gICAgICAvLyBpZiBkaXIgbm90IGV4aXN0cy4gdGhlbiBjcmVhdGUgaXQuXG4gICAgICBhd2FpdCBEZW5vLm1rZGlyKGRpciwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRocm93IGVycjtcbiAgfVxufVxuXG4vKipcbiAqIEVuc3VyZXMgdGhhdCB0aGUgZGlyZWN0b3J5IGV4aXN0cy5cbiAqIElmIHRoZSBkaXJlY3Rvcnkgc3RydWN0dXJlIGRvZXMgbm90IGV4aXN0LCBpdCBpcyBjcmVhdGVkLiBMaWtlIG1rZGlyIC1wLlxuICogUmVxdWlyZXMgdGhlIGAtLWFsbG93LXJlYWRgIGFuZCBgLS1hbGxvdy13cml0ZWAgZmxhZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGVuc3VyZURpclN5bmMoZGlyOiBzdHJpbmcpOiB2b2lkIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBmaWxlSW5mbyA9IERlbm8ubHN0YXRTeW5jKGRpcik7XG4gICAgaWYgKCFmaWxlSW5mby5pc0RpcmVjdG9yeSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICBgRW5zdXJlIHBhdGggZXhpc3RzLCBleHBlY3RlZCAnZGlyJywgZ290ICcke1xuICAgICAgICAgIGdldEZpbGVJbmZvVHlwZShmaWxlSW5mbylcbiAgICAgICAgfSdgLFxuICAgICAgKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGlmIChlcnIgaW5zdGFuY2VvZiBEZW5vLmVycm9ycy5Ob3RGb3VuZCkge1xuICAgICAgLy8gaWYgZGlyIG5vdCBleGlzdHMuIHRoZW4gY3JlYXRlIGl0LlxuICAgICAgRGVuby5ta2RpclN5bmMoZGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhyb3cgZXJyO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEVBQTBFO0FBQzFFLFNBQVMsZUFBZSxRQUFRLGFBQWE7QUFFN0M7Ozs7Q0FJQyxHQUNELE9BQU8sZUFBZSxVQUFVLEdBQVcsRUFBRTtJQUMzQyxJQUFJO1FBQ0YsTUFBTSxXQUFXLE1BQU0sS0FBSyxLQUFLLENBQUM7UUFDbEMsSUFBSSxDQUFDLFNBQVMsV0FBVyxFQUFFO1lBQ3pCLE1BQU0sSUFBSSxNQUNSLENBQUMseUNBQXlDLEVBQ3hDLGdCQUFnQixVQUNqQixDQUFDLENBQUMsRUFDSDtRQUNKLENBQUM7SUFDSCxFQUFFLE9BQU8sS0FBSztRQUNaLElBQUksZUFBZSxLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUU7WUFDdkMscUNBQXFDO1lBQ3JDLE1BQU0sS0FBSyxLQUFLLENBQUMsS0FBSztnQkFBRSxXQUFXLElBQUk7WUFBQztZQUN4QztRQUNGLENBQUM7UUFDRCxNQUFNLElBQUk7SUFDWjtBQUNGLENBQUM7QUFFRDs7OztDQUlDLEdBQ0QsT0FBTyxTQUFTLGNBQWMsR0FBVyxFQUFRO0lBQy9DLElBQUk7UUFDRixNQUFNLFdBQVcsS0FBSyxTQUFTLENBQUM7UUFDaEMsSUFBSSxDQUFDLFNBQVMsV0FBVyxFQUFFO1lBQ3pCLE1BQU0sSUFBSSxNQUNSLENBQUMseUNBQXlDLEVBQ3hDLGdCQUFnQixVQUNqQixDQUFDLENBQUMsRUFDSDtRQUNKLENBQUM7SUFDSCxFQUFFLE9BQU8sS0FBSztRQUNaLElBQUksZUFBZSxLQUFLLE1BQU0sQ0FBQyxRQUFRLEVBQUU7WUFDdkMscUNBQXFDO1lBQ3JDLEtBQUssU0FBUyxDQUFDLEtBQUs7Z0JBQUUsV0FBVyxJQUFJO1lBQUM7WUFDdEM7UUFDRixDQUFDO1FBQ0QsTUFBTSxJQUFJO0lBQ1o7QUFDRixDQUFDIn0=