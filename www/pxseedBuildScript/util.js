define("pxseedBuildScript/util", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__internal__ = exports.console = exports.mutex = void 0;
    exports.getNodeCompatApi = getNodeCompatApi;
    exports.simpleGlob = simpleGlob;
    exports.withConsole = withConsole;
    let cachedNodeCompatApi = null;
    async function getNodeCompatApi() {
        if (cachedNodeCompatApi != null) {
            return cachedNodeCompatApi;
        }
        if (globalThis.process?.versions?.node != undefined) {
            const fs = await new Promise((resolve_1, reject_1) => { require(['fs/promises'], resolve_1, reject_1); });
            const path = await new Promise((resolve_2, reject_2) => { require(['path'], resolve_2, reject_2); });
            cachedNodeCompatApi = { fs, path, wwwroot: path.join(__dirname, '..') };
        }
        else {
            const { buildNodeCompatApiTjs } = await new Promise((resolve_3, reject_3) => { require(['partic2/packageManager/nodecompat'], resolve_3, reject_3); });
            const builtApi = await buildNodeCompatApiTjs();
            cachedNodeCompatApi = { fs: builtApi.fs.promises, path: builtApi.path, wwwroot: builtApi.wwwroot };
        }
        return cachedNodeCompatApi;
    }
    class mutex {
        constructor() {
            this.locked = false;
            this.unlockCb = [];
        }
        async lock() {
            var that = this;
            if (this.locked) {
                return new Promise(function (resolve, reject) {
                    that.unlockCb.push(resolve);
                });
            }
            else {
                this.locked = true;
                return;
            }
        }
        async unlock() {
            if (this.unlockCb.length > 0) {
                this.unlockCb.shift()();
            }
            else {
                this.locked = false;
            }
        }
        async tryLock() {
            if (!this.locked) {
                this.locked = true;
                return true;
            }
            else {
                return false;
            }
        }
        async exec(fn) {
            await this.lock();
            try {
                return await fn();
            }
            finally {
                await this.unlock();
            }
        }
    }
    exports.mutex = mutex;
    async function runCommand(cmd, opt) {
        const { spawn } = await new Promise((resolve_4, reject_4) => { require(['child_process'], resolve_4, reject_4); });
        let runOpt = opt ?? {};
        let process = spawn(cmd, { shell: true, stdio: 'inherit', ...runOpt });
        return new Promise((resolve => {
            process.on('close', () => resolve(process.exitCode));
        }));
    }
    async function readJson(path) {
        const { fs } = await getNodeCompatApi();
        const { readFile, writeFile } = fs;
        return JSON.parse(new TextDecoder().decode(await readFile(path)));
    }
    async function writeJson(jsonPath, obj) {
        const { fs, path } = await getNodeCompatApi();
        const { readFile, writeFile } = fs;
        let dir = path.dirname(jsonPath);
        await fs.mkdir(dir, { recursive: true });
        await writeFile(jsonPath, new TextEncoder().encode(JSON.stringify(obj)));
    }
    async function simpleGlob(include, opt) {
        let { fs, path } = await getNodeCompatApi();
        const segmentRegexCache = new Map();
        function compileSegment(segment) {
            const cached = segmentRegexCache.get(segment);
            if (cached)
                return cached;
            let source = '^';
            for (const ch of segment) {
                if (ch === '*') {
                    source += '[^/]*';
                }
                else if (ch === '?') {
                    source += '[^/]';
                }
                else {
                    source += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                }
            }
            source += '$';
            const regex = new RegExp(source);
            segmentRegexCache.set(segment, regex);
            return regex;
        }
        function segmentMatches(pathSegment, patternSegment) {
            if (patternSegment === '*')
                return true;
            return compileSegment(patternSegment).test(pathSegment);
        }
        function parsePattern(pattern) {
            return pattern.split('/').filter((s) => s.length > 0 && s !== '.');
        }
        function matchesPattern(pathSegments, pattern) {
            const n = pathSegments.length;
            const m = pattern.length;
            const memo = new Map();
            const go = (i, j) => {
                if (j === m)
                    return i === n;
                const key = i * (m + 1) + j;
                const cached = memo.get(key);
                if (cached !== undefined)
                    return cached;
                let result;
                if (pattern[j] === '**') {
                    result = go(i, j + 1) || (i < n && go(i + 1, j));
                }
                else {
                    result = i < n && segmentMatches(pathSegments[i], pattern[j]) && go(i + 1, j + 1);
                }
                memo.set(key, result);
                return result;
            };
            return go(0, 0);
        }
        function canBePrefix(pathSegments, pattern) {
            const n = pathSegments.length;
            const m = pattern.length;
            const memo = new Map();
            const go = (i, j) => {
                if (i === n)
                    return true; // all directory segments consumed so far
                if (j === m)
                    return false; // pattern exhausted, path is not
                const key = i * (m + 1) + j;
                const cached = memo.get(key);
                if (cached !== undefined)
                    return cached;
                let result;
                if (pattern[j] === '**') {
                    result = go(i, j + 1) || go(i + 1, j);
                }
                else {
                    result = segmentMatches(pathSegments[i], pattern[j]) && go(i + 1, j + 1);
                }
                memo.set(key, result);
                return result;
            };
            return go(0, 0);
        }
        function excludedDir(pathSegments, pattern) {
            const n = pathSegments.length;
            const m = pattern.length;
            const memo = new Map();
            const go = (i, j) => {
                if (i === n) {
                    // Directory path fully matched. Anything left in the pattern must be "**",
                    // meaning the whole subtree is excluded too.
                    for (let k = j; k < m; k++) {
                        if (pattern[k] !== '**')
                            return false;
                    }
                    return true;
                }
                if (j === m)
                    return false;
                const key = i * (m + 1) + j;
                const cached = memo.get(key);
                if (cached !== undefined)
                    return cached;
                let result;
                if (pattern[j] === '**') {
                    result = go(i, j + 1) || go(i + 1, j);
                }
                else {
                    result = segmentMatches(pathSegments[i], pattern[j]) && go(i + 1, j + 1);
                }
                memo.set(key, result);
                return result;
            };
            return go(0, 0);
        }
        async function glob({ include, exclude, cwd }) {
            const includePatterns = include.map(parsePattern).filter((p) => p.length > 0);
            const excludePatterns = exclude.map(parsePattern).filter((p) => p.length > 0);
            if (includePatterns.length === 0)
                return [];
            const results = [];
            const walk = async (absDir, relSegments) => {
                let entries;
                try {
                    entries = await fs.readdir(absDir, { withFileTypes: true });
                }
                catch {
                    return;
                }
                for (const entry of entries) {
                    const name = entry.name;
                    const childRel = relSegments.concat(name);
                    const childAbs = path.join(absDir, name);
                    if (entry.isDirectory()) {
                        if (excludePatterns.some((p) => excludedDir(childRel, p)))
                            continue;
                        if (!includePatterns.some((p) => canBePrefix(childRel, p)))
                            continue;
                        await walk(childAbs, childRel);
                    }
                    else if (entry.isFile()) {
                        if (excludePatterns.some((p) => matchesPattern(childRel, p)))
                            continue;
                        if (includePatterns.some((p) => matchesPattern(childRel, p))) {
                            results.push(childRel.join('/'));
                        }
                    }
                }
            };
            await walk(cwd, []);
            results.sort();
            return results;
        }
        return glob({ include, exclude: opt.exclude ?? [], cwd: opt.cwd });
    }
    exports.console = globalThis.console;
    async function withConsole(c, fn) {
        exports.console = c;
        try {
            await fn();
        }
        finally {
            exports.console = globalThis.console;
        }
    }
    exports.__internal__ = {
        runCommand, readJson, writeJson
    };
});
