define(["require", "exports", "fs/promises", "path", "./loaders", "./util"], function (require, exports, fs, path_1, loaders_1, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.outputDir = exports.sourceDir = void 0;
    exports.processDirectory = processDirectory;
    exports.cleanBuildStatus = cleanBuildStatus;
    Object.defineProperty(exports, "sourceDir", { enumerable: true, get: function () { return loaders_1.sourceDir; } });
    Object.defineProperty(exports, "outputDir", { enumerable: true, get: function () { return loaders_1.outputDir; } });
    let PxseedStatusDefault = {
        lastBuildTime: 1,
        lastSuccessBuildTime: 1,
        lastBuildError: [],
        currentBuildError: [],
        subpackages: []
    };
    function makeDefaultStatus() {
        return { ...PxseedStatusDefault, lastBuildError: [], currentBuildError: [], subpackages: [] };
    }
    async function processDirectory(dir) {
        console.log(`enter ${dir}`);
        let children = await fs.readdir(dir, { withFileTypes: true });
        let hasPxseedConfig = false;
        if (children.find(v => v.name == 'pxseed.config.json')) {
            hasPxseedConfig = true;
            console.log('pxseed.config.json found');
        }
        if (!hasPxseedConfig) {
            for (let child of children) {
                if (child.isDirectory()) {
                    await processDirectory((0, path_1.join)(dir, child.name));
                }
            }
        }
        else {
            let pxseedConfig = await (0, util_1.readJson)((0, path_1.join)(dir, 'pxseed.config.json'));
            let pstat;
            if (children.find(v => v.name == '.pxseed.status.json')) {
                pstat = await (0, util_1.readJson)((0, path_1.join)(dir, '.pxseed.status.json'));
                pstat = { ...makeDefaultStatus(), ...pstat };
            }
            else {
                pstat = { ...makeDefaultStatus() };
            }
            let loaders = pxseedConfig.loaders;
            for (let loaderConfig of loaders) {
                try {
                    await loaders_1.pxseedBuiltinLoader[loaderConfig.name](dir, loaderConfig, pstat);
                }
                catch (e) {
                    pstat.currentBuildError.push(`loader ${loaderConfig.name} failed with error ${String(e)}`);
                }
            }
            if (pstat.subpackages.length > 0) {
                for (let t1 of pstat.subpackages) {
                    await processDirectory((0, path_1.join)(dir, t1));
                }
                //Don't save to file.
                pstat.subpackages = [];
            }
            pstat.lastBuildTime = new Date().getTime();
            pstat.lastBuildError = pstat.currentBuildError;
            if (pstat.lastBuildError.length == 0) {
                pstat.lastSuccessBuildTime = pstat.lastBuildTime;
            }
            else {
                console.info('build failed.');
                console.info(pstat.lastBuildError);
            }
            pstat.currentBuildError = [];
            await (0, util_1.writeJson)((0, path_1.join)(dir, '.pxseed.status.json'), pstat);
        }
    }
    async function cleanBuildStatus(dir) {
        let children = await fs.readdir(dir, { withFileTypes: true });
        for (let t1 of children) {
            if (t1.isDirectory()) {
                await cleanBuildStatus((0, path_1.join)(dir, t1.name));
            }
            else if (t1.name == '.pxseed.status.json') {
                await fs.rm((0, path_1.join)(dir, t1.name));
            }
        }
    }
});
//# sourceMappingURL=buildlib.js.map