define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__internal__ = exports.console = void 0;
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
    async function writeJson(path, obj) {
        const { fs } = await getNodeCompatApi();
        const { readFile, writeFile } = fs;
        await writeFile(path, new TextEncoder().encode(JSON.stringify(obj, undefined, 2)));
    }
    async function runBuild() {
        const { dirname, join: pathJoin } = await new Promise((resolve_5, reject_5) => { require(['path'], resolve_5, reject_5); });
        let buildScriptPath = pathJoin(dirname(__dirname), 'script', 'buildAll.js');
        await runCommand('node ' + buildScriptPath);
    }
    async function* iterPath(path2, opt) {
        const { path, fs } = await getNodeCompatApi();
        for (let child of await fs.readdir(path.join(opt.cwd, path2), { withFileTypes: true })) {
            if (!opt.includeHidenFile && child.name.startsWith('.')) {
                continue;
            }
            if (child.isDirectory()) {
                yield* iterPath(path.join(path2, child.name), opt);
            }
            else {
                const p = path.join(path2, child.name);
                yield p;
            }
        }
    }
    async function simpleGlob(include, opt) {
        let matchRegexps = [];
        for (let t1 of include) {
            let pathPart = t1.split(/[\\/]/);
            let pathPartReg = [];
            for (let t2 of pathPart) {
                if (t2 == '.') {
                    continue;
                }
                else if (t2 == '..') {
                    if (pathPartReg.length == 0) {
                        throw new Error('simple glob do not support ".." on the top level.');
                    }
                    pathPartReg.pop();
                }
                else if (t2 == '**') {
                    pathPartReg.push('**');
                }
                else {
                    pathPartReg.push(new RegExp('^' +
                        t2.replace(/[\.\(\)]/g, (v) => '\\' + v)
                            .replace(/\*/g, '.*') +
                        '$'));
                }
            }
            matchRegexps.push(pathPartReg);
        }
        let matchResult = [];
        for await (let t1 of iterPath('', { cwd: opt.cwd, includeHidenFile: opt.includeHidenFile })) {
            let matched = false;
            const pathPart = t1.split(/[\\/]/);
            for (let t2 of matchRegexps) {
                let pathPartMatched = true;
                let doubleStar = t2.indexOf('**');
                if (doubleStar < 0)
                    doubleStar = t2.length;
                for (let t3 = 0; t3 < doubleStar; t3++) {
                    if (!t2[t3].test(pathPart[t3])) {
                        pathPartMatched = false;
                        break;
                    }
                }
                if (pathPartMatched) {
                    for (let t3 = t2.length - 1; t3 > doubleStar; t3--) {
                        if (!t2[t3].test(pathPart[pathPart.length - (t2.length - t3)])) {
                            pathPartMatched = false;
                            break;
                        }
                    }
                }
                if (pathPartMatched) {
                    matched = true;
                    break;
                }
            }
            if (matched) {
                matchResult.push(t1.replace(/\\/g, '/'));
            }
        }
        return matchResult;
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
        runCommand, readJson, writeJson, runBuild
    };
});
//# sourceMappingURL=util.js.map