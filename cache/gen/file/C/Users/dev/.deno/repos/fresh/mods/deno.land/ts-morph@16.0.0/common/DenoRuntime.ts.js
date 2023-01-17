import { ensureDir, ensureDirSync } from "https://deno.land/std@0.140.0/fs/ensure_dir.ts";
import { expandGlob, expandGlobSync } from "https://deno.land/std@0.140.0/fs/expand_glob.ts";
import * as stdPath from "https://deno.land/std@0.140.0/path/mod.ts";
export class DenoRuntime {
    fs = new DenoRuntimeFileSystem();
    path = new DenoRuntimePath();
    getEnvVar(name) {
        return Deno.env.get(name);
    }
    getEndOfLine() {
        return Deno.build.os === "windows" ? "\r\n" : "\n";
    }
    getPathMatchesPattern(path, pattern) {
        return stdPath.globToRegExp(pattern, {
            extended: true,
            globstar: true,
            os: "linux"
        }).test(path);
    }
}
class DenoRuntimePath {
    join(...paths) {
        return stdPath.join(...paths);
    }
    normalize(path) {
        return stdPath.normalize(path);
    }
    relative(from, to) {
        return stdPath.relative(from, to);
    }
}
class DenoRuntimeFileSystem {
    delete(path) {
        return Deno.remove(path, {
            recursive: true
        });
    }
    deleteSync(path) {
        Deno.removeSync(path, {
            recursive: true
        });
    }
    readDirSync(dirPath) {
        return Array.from(Deno.readDirSync(dirPath));
    }
    readFile(filePath, _encoding = "utf-8") {
        return Deno.readTextFile(filePath);
    }
    readFileSync(filePath, _encoding = "utf-8") {
        return Deno.readTextFileSync(filePath);
    }
    writeFile(filePath, fileText) {
        return Deno.writeTextFile(filePath, fileText);
    }
    writeFileSync(filePath, fileText) {
        return Deno.writeTextFileSync(filePath, fileText);
    }
    async mkdir(dirPath) {
        await ensureDir(dirPath);
    }
    mkdirSync(dirPath) {
        ensureDirSync(dirPath);
    }
    move(srcPath, destPath) {
        return Deno.rename(srcPath, destPath);
    }
    moveSync(srcPath, destPath) {
        Deno.renameSync(srcPath, destPath);
    }
    copy(srcPath, destPath) {
        return Deno.copyFile(srcPath, destPath);
    }
    copySync(srcPath, destPath) {
        return Deno.copyFileSync(srcPath, destPath);
    }
    async stat(filePath) {
        const stat = await Deno.stat(filePath);
        return this._toStat(stat);
    }
    statSync(path) {
        const stat = Deno.statSync(path);
        return this._toStat(stat);
    }
    _toStat(stat) {
        return {
            isFile () {
                return stat.isFile;
            },
            isDirectory () {
                return stat.isDirectory;
            }
        };
    }
    realpathSync(path) {
        return Deno.realPathSync(path);
    }
    getCurrentDirectory() {
        return Deno.cwd();
    }
    async glob(patterns) {
        const { excludePatterns , pattern  } = globPatternsToPattern(patterns);
        const result = [];
        const globEntries = expandGlob(pattern, {
            root: this.getCurrentDirectory(),
            extended: true,
            globstar: true,
            exclude: excludePatterns
        });
        for await (const globEntry of globEntries){
            if (globEntry.isFile) result.push(globEntry.path);
        }
        return result;
    }
    globSync(patterns) {
        const { excludePatterns , pattern  } = globPatternsToPattern(patterns);
        const result = [];
        const globEntries = expandGlobSync(pattern, {
            root: this.getCurrentDirectory(),
            extended: true,
            globstar: true,
            exclude: excludePatterns
        });
        for (const globEntry of globEntries){
            if (globEntry.isFile) result.push(globEntry.path);
        }
        return result;
    }
    isCaseSensitive() {
        const platform = Deno.build.os;
        return platform !== "windows" && platform !== "darwin";
    }
}
function globPatternsToPattern(patterns) {
    const excludePatterns = [];
    const includePatterns = [];
    for (const pattern of patterns){
        if (isNegatedGlob(pattern)) excludePatterns.push(pattern);
        else includePatterns.push(pattern);
    }
    return {
        excludePatterns,
        pattern: includePatterns.length === 0 ? "." : includePatterns.length === 1 ? includePatterns[0] : `{${includePatterns.join(",")}}`
    };
    function isNegatedGlob(glob) {
        // https://github.com/micromatch/is-negated-glob/blob/master/index.js
        return glob[0] === "!" && glob[1] !== "(";
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImZpbGU6Ly8vQzovVXNlcnMvZGV2Ly5kZW5vL3JlcG9zL2ZyZXNoL21vZHMvZGVuby5sYW5kL3RzLW1vcnBoQDE2LjAuMC9jb21tb24vRGVub1J1bnRpbWUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgZW5zdXJlRGlyLCBlbnN1cmVEaXJTeW5jIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE0MC4wL2ZzL2Vuc3VyZV9kaXIudHNcIjtcbmltcG9ydCB7IGV4cGFuZEdsb2IsIGV4cGFuZEdsb2JTeW5jIH0gZnJvbSBcImh0dHBzOi8vZGVuby5sYW5kL3N0ZEAwLjE0MC4wL2ZzL2V4cGFuZF9nbG9iLnRzXCI7XG5pbXBvcnQgKiBhcyBzdGRQYXRoIGZyb20gXCJodHRwczovL2Rlbm8ubGFuZC9zdGRAMC4xNDAuMC9wYXRoL21vZC50c1wiO1xuXG5leHBvcnQgY2xhc3MgRGVub1J1bnRpbWUge1xuICBmcyA9IG5ldyBEZW5vUnVudGltZUZpbGVTeXN0ZW0oKTtcbiAgcGF0aCA9IG5ldyBEZW5vUnVudGltZVBhdGgoKTtcblxuICBnZXRFbnZWYXIobmFtZTogc3RyaW5nKSB7XG4gICAgcmV0dXJuIERlbm8uZW52LmdldChuYW1lKTtcbiAgfVxuXG4gIGdldEVuZE9mTGluZSgpIHtcbiAgICByZXR1cm4gRGVuby5idWlsZC5vcyA9PT0gXCJ3aW5kb3dzXCIgPyBcIlxcclxcblwiIDogXCJcXG5cIjtcbiAgfVxuXG4gIGdldFBhdGhNYXRjaGVzUGF0dGVybihwYXRoOiBzdHJpbmcsIHBhdHRlcm46IHN0cmluZykge1xuICAgIHJldHVybiBzdGRQYXRoLmdsb2JUb1JlZ0V4cChwYXR0ZXJuLCB7XG4gICAgICBleHRlbmRlZDogdHJ1ZSxcbiAgICAgIGdsb2JzdGFyOiB0cnVlLFxuICAgICAgb3M6IFwibGludXhcIiwgLy8gdXNlIHRoZSBzYW1lIGJlaGF2aW91ciBhY3Jvc3MgYWxsIG9wZXJhdGluZyBzeXN0ZW1zXG4gICAgfSkudGVzdChwYXRoKTtcbiAgfVxufVxuXG5jbGFzcyBEZW5vUnVudGltZVBhdGgge1xuICBqb2luKC4uLnBhdGhzOiBzdHJpbmdbXSkge1xuICAgIHJldHVybiBzdGRQYXRoLmpvaW4oLi4ucGF0aHMpO1xuICB9XG5cbiAgbm9ybWFsaXplKHBhdGg6IHN0cmluZykge1xuICAgIHJldHVybiBzdGRQYXRoLm5vcm1hbGl6ZShwYXRoKTtcbiAgfVxuXG4gIHJlbGF0aXZlKGZyb206IHN0cmluZywgdG86IHN0cmluZykge1xuICAgIHJldHVybiBzdGRQYXRoLnJlbGF0aXZlKGZyb20sIHRvKTtcbiAgfVxufVxuXG5jbGFzcyBEZW5vUnVudGltZUZpbGVTeXN0ZW0ge1xuICBkZWxldGUocGF0aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIERlbm8ucmVtb3ZlKHBhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pO1xuICB9XG5cbiAgZGVsZXRlU3luYyhwYXRoOiBzdHJpbmcpIHtcbiAgICBEZW5vLnJlbW92ZVN5bmMocGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSk7XG4gIH1cblxuICByZWFkRGlyU3luYyhkaXJQYXRoOiBzdHJpbmcpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShEZW5vLnJlYWREaXJTeW5jKGRpclBhdGgpKTtcbiAgfVxuXG4gIHJlYWRGaWxlKGZpbGVQYXRoOiBzdHJpbmcsIF9lbmNvZGluZyA9IFwidXRmLThcIikge1xuICAgIHJldHVybiBEZW5vLnJlYWRUZXh0RmlsZShmaWxlUGF0aCk7XG4gIH1cblxuICByZWFkRmlsZVN5bmMoZmlsZVBhdGg6IHN0cmluZywgX2VuY29kaW5nID0gXCJ1dGYtOFwiKSB7XG4gICAgcmV0dXJuIERlbm8ucmVhZFRleHRGaWxlU3luYyhmaWxlUGF0aCk7XG4gIH1cblxuICB3cml0ZUZpbGUoZmlsZVBhdGg6IHN0cmluZywgZmlsZVRleHQ6IHN0cmluZykge1xuICAgIHJldHVybiBEZW5vLndyaXRlVGV4dEZpbGUoZmlsZVBhdGgsIGZpbGVUZXh0KTtcbiAgfVxuXG4gIHdyaXRlRmlsZVN5bmMoZmlsZVBhdGg6IHN0cmluZywgZmlsZVRleHQ6IHN0cmluZykge1xuICAgIHJldHVybiBEZW5vLndyaXRlVGV4dEZpbGVTeW5jKGZpbGVQYXRoLCBmaWxlVGV4dCk7XG4gIH1cblxuICBhc3luYyBta2RpcihkaXJQYXRoOiBzdHJpbmcpIHtcbiAgICBhd2FpdCBlbnN1cmVEaXIoZGlyUGF0aCk7XG4gIH1cblxuICBta2RpclN5bmMoZGlyUGF0aDogc3RyaW5nKSB7XG4gICAgZW5zdXJlRGlyU3luYyhkaXJQYXRoKTtcbiAgfVxuXG4gIG1vdmUoc3JjUGF0aDogc3RyaW5nLCBkZXN0UGF0aDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIERlbm8ucmVuYW1lKHNyY1BhdGgsIGRlc3RQYXRoKTtcbiAgfVxuXG4gIG1vdmVTeW5jKHNyY1BhdGg6IHN0cmluZywgZGVzdFBhdGg6IHN0cmluZykge1xuICAgIERlbm8ucmVuYW1lU3luYyhzcmNQYXRoLCBkZXN0UGF0aCk7XG4gIH1cblxuICBjb3B5KHNyY1BhdGg6IHN0cmluZywgZGVzdFBhdGg6IHN0cmluZykge1xuICAgIHJldHVybiBEZW5vLmNvcHlGaWxlKHNyY1BhdGgsIGRlc3RQYXRoKTtcbiAgfVxuXG4gIGNvcHlTeW5jKHNyY1BhdGg6IHN0cmluZywgZGVzdFBhdGg6IHN0cmluZykge1xuICAgIHJldHVybiBEZW5vLmNvcHlGaWxlU3luYyhzcmNQYXRoLCBkZXN0UGF0aCk7XG4gIH1cblxuICBhc3luYyBzdGF0KGZpbGVQYXRoOiBzdHJpbmcpIHtcbiAgICBjb25zdCBzdGF0ID0gYXdhaXQgRGVuby5zdGF0KGZpbGVQYXRoKTtcbiAgICByZXR1cm4gdGhpcy5fdG9TdGF0KHN0YXQpO1xuICB9XG5cbiAgc3RhdFN5bmMocGF0aDogc3RyaW5nKSB7XG4gICAgY29uc3Qgc3RhdCA9IERlbm8uc3RhdFN5bmMocGF0aCk7XG4gICAgcmV0dXJuIHRoaXMuX3RvU3RhdChzdGF0KTtcbiAgfVxuXG4gIHByaXZhdGUgX3RvU3RhdChzdGF0OiBhbnkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgaXNGaWxlKCkge1xuICAgICAgICByZXR1cm4gc3RhdC5pc0ZpbGU7XG4gICAgICB9LFxuICAgICAgaXNEaXJlY3RvcnkoKSB7XG4gICAgICAgIHJldHVybiBzdGF0LmlzRGlyZWN0b3J5O1xuICAgICAgfSxcbiAgICB9O1xuICB9XG5cbiAgcmVhbHBhdGhTeW5jKHBhdGg6IHN0cmluZykge1xuICAgIHJldHVybiBEZW5vLnJlYWxQYXRoU3luYyhwYXRoKTtcbiAgfVxuXG4gIGdldEN1cnJlbnREaXJlY3RvcnkoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gRGVuby5jd2QoKTtcbiAgfVxuXG4gIGFzeW5jIGdsb2IocGF0dGVybnM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPikge1xuICAgIGNvbnN0IHsgZXhjbHVkZVBhdHRlcm5zLCBwYXR0ZXJuIH0gPSBnbG9iUGF0dGVybnNUb1BhdHRlcm4ocGF0dGVybnMpO1xuICAgIGNvbnN0IHJlc3VsdDogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCBnbG9iRW50cmllcyA9IGV4cGFuZEdsb2IocGF0dGVybiwge1xuICAgICAgcm9vdDogdGhpcy5nZXRDdXJyZW50RGlyZWN0b3J5KCksXG4gICAgICBleHRlbmRlZDogdHJ1ZSxcbiAgICAgIGdsb2JzdGFyOiB0cnVlLFxuICAgICAgZXhjbHVkZTogZXhjbHVkZVBhdHRlcm5zLFxuICAgIH0pO1xuICAgIGZvciBhd2FpdCAoY29uc3QgZ2xvYkVudHJ5IG9mIGdsb2JFbnRyaWVzKSB7XG4gICAgICBpZiAoZ2xvYkVudHJ5LmlzRmlsZSlcbiAgICAgICAgcmVzdWx0LnB1c2goZ2xvYkVudHJ5LnBhdGgpO1xuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgZ2xvYlN5bmMocGF0dGVybnM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPikge1xuICAgIGNvbnN0IHsgZXhjbHVkZVBhdHRlcm5zLCBwYXR0ZXJuIH0gPSBnbG9iUGF0dGVybnNUb1BhdHRlcm4ocGF0dGVybnMpO1xuICAgIGNvbnN0IHJlc3VsdDogc3RyaW5nW10gPSBbXTtcbiAgICBjb25zdCBnbG9iRW50cmllcyA9IGV4cGFuZEdsb2JTeW5jKHBhdHRlcm4sIHtcbiAgICAgIHJvb3Q6IHRoaXMuZ2V0Q3VycmVudERpcmVjdG9yeSgpLFxuICAgICAgZXh0ZW5kZWQ6IHRydWUsXG4gICAgICBnbG9ic3RhcjogdHJ1ZSxcbiAgICAgIGV4Y2x1ZGU6IGV4Y2x1ZGVQYXR0ZXJucyxcbiAgICB9KTtcbiAgICBmb3IgKGNvbnN0IGdsb2JFbnRyeSBvZiBnbG9iRW50cmllcykge1xuICAgICAgaWYgKGdsb2JFbnRyeS5pc0ZpbGUpXG4gICAgICAgIHJlc3VsdC5wdXNoKGdsb2JFbnRyeS5wYXRoKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfVxuXG4gIGlzQ2FzZVNlbnNpdGl2ZSgpIHtcbiAgICBjb25zdCBwbGF0Zm9ybSA9IERlbm8uYnVpbGQub3M7XG4gICAgcmV0dXJuIHBsYXRmb3JtICE9PSBcIndpbmRvd3NcIiAmJiBwbGF0Zm9ybSAhPT0gXCJkYXJ3aW5cIjtcbiAgfVxufVxuXG5mdW5jdGlvbiBnbG9iUGF0dGVybnNUb1BhdHRlcm4ocGF0dGVybnM6IFJlYWRvbmx5QXJyYXk8c3RyaW5nPikge1xuICBjb25zdCBleGNsdWRlUGF0dGVybnMgPSBbXTtcbiAgY29uc3QgaW5jbHVkZVBhdHRlcm5zID0gW107XG5cbiAgZm9yIChjb25zdCBwYXR0ZXJuIG9mIHBhdHRlcm5zKSB7XG4gICAgaWYgKGlzTmVnYXRlZEdsb2IocGF0dGVybikpXG4gICAgICBleGNsdWRlUGF0dGVybnMucHVzaChwYXR0ZXJuKTtcbiAgICBlbHNlXG4gICAgICBpbmNsdWRlUGF0dGVybnMucHVzaChwYXR0ZXJuKTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZXhjbHVkZVBhdHRlcm5zLFxuICAgIHBhdHRlcm46IGluY2x1ZGVQYXR0ZXJucy5sZW5ndGggPT09IDAgPyBcIi5cIiA6IGluY2x1ZGVQYXR0ZXJucy5sZW5ndGggPT09IDEgPyBpbmNsdWRlUGF0dGVybnNbMF0gOiBgeyR7aW5jbHVkZVBhdHRlcm5zLmpvaW4oXCIsXCIpfX1gLFxuICB9O1xuXG4gIGZ1bmN0aW9uIGlzTmVnYXRlZEdsb2IoZ2xvYjogc3RyaW5nKSB7XG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21pY3JvbWF0Y2gvaXMtbmVnYXRlZC1nbG9iL2Jsb2IvbWFzdGVyL2luZGV4LmpzXG4gICAgcmV0dXJuIGdsb2JbMF0gPT09IFwiIVwiICYmIGdsb2JbMV0gIT09IFwiKFwiO1xuICB9XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsU0FBUyxTQUFTLEVBQUUsYUFBYSxRQUFRLGlEQUFpRDtBQUMxRixTQUFTLFVBQVUsRUFBRSxjQUFjLFFBQVEsa0RBQWtEO0FBQzdGLFlBQVksYUFBYSw0Q0FBNEM7QUFFckUsT0FBTyxNQUFNO0lBQ1gsS0FBSyxJQUFJLHdCQUF3QjtJQUNqQyxPQUFPLElBQUksa0JBQWtCO0lBRTdCLFVBQVUsSUFBWSxFQUFFO1FBQ3RCLE9BQU8sS0FBSyxHQUFHLENBQUMsR0FBRyxDQUFDO0lBQ3RCO0lBRUEsZUFBZTtRQUNiLE9BQU8sS0FBSyxLQUFLLENBQUMsRUFBRSxLQUFLLFlBQVksU0FBUyxJQUFJO0lBQ3BEO0lBRUEsc0JBQXNCLElBQVksRUFBRSxPQUFlLEVBQUU7UUFDbkQsT0FBTyxRQUFRLFlBQVksQ0FBQyxTQUFTO1lBQ25DLFVBQVUsSUFBSTtZQUNkLFVBQVUsSUFBSTtZQUNkLElBQUk7UUFDTixHQUFHLElBQUksQ0FBQztJQUNWO0FBQ0YsQ0FBQztBQUVELE1BQU07SUFDSixLQUFLLEdBQUcsS0FBZSxFQUFFO1FBQ3ZCLE9BQU8sUUFBUSxJQUFJLElBQUk7SUFDekI7SUFFQSxVQUFVLElBQVksRUFBRTtRQUN0QixPQUFPLFFBQVEsU0FBUyxDQUFDO0lBQzNCO0lBRUEsU0FBUyxJQUFZLEVBQUUsRUFBVSxFQUFFO1FBQ2pDLE9BQU8sUUFBUSxRQUFRLENBQUMsTUFBTTtJQUNoQztB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