define(["require", "exports", "child_process", "path", "fs/promises"], function (require, exports, child_process_1, path_1, promises_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.buildScriptPath = void 0;
    exports.runCommand = runCommand;
    exports.readJson = readJson;
    exports.writeJson = writeJson;
    exports.runBuild = runBuild;
    exports.buildScriptPath = (0, path_1.join)((0, path_1.dirname)(__dirname), 'script', 'buildAll.js');
    async function runCommand(cmd, opt) {
        let runOpt = opt ?? {};
        let process = (0, child_process_1.spawn)(cmd, { shell: true, stdio: 'inherit', ...runOpt });
        return new Promise((resolve => {
            process.on('close', () => resolve(process.exitCode));
        }));
    }
    async function readJson(path) {
        return JSON.parse(new TextDecoder().decode(await (0, promises_1.readFile)(path)));
    }
    async function writeJson(path, obj) {
        await (0, promises_1.writeFile)(path, new TextEncoder().encode(JSON.stringify(obj, undefined, 2)));
    }
    async function runBuild() {
        await runCommand('node ' + exports.buildScriptPath);
    }
});
//# sourceMappingURL=util.js.map