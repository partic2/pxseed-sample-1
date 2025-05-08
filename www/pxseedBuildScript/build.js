define("pxseedBuildScript/build", ["require", "exports", "fs/promises", "fs", "path", "./buildlib"], function (require, exports, fs, fs_1, path_1, buildlib_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    ;
    (async () => {
        let buildScriptAt = process.argv.indexOf('pxseedBuildScript/build');
        let command = process.argv[buildScriptAt + 1] ?? 'build';
        if (command == 'build') {
            let buildDone = false;
            try {
                await fs.access((0, path_1.join)(buildlib_1.sourceDir, 'pxseed.build-hint.json'), fs_1.constants.R_OK);
                let buildHint = JSON.parse(new TextDecoder().decode(await fs.readFile((0, path_1.join)(buildlib_1.sourceDir, 'pxseed.build-hint.json'))));
                if ('use' in buildHint) {
                    buildHint = buildHint.profiles[buildHint.use];
                }
                if (buildHint.includeDir && buildHint.includeDir.indexOf('*') < 0) {
                    console.log('only process directory in buildHint.includeDir', buildHint.includeDir);
                    for (let subdir of buildHint.includeDir) {
                        await (0, buildlib_1.processDirectory)((0, path_1.join)(buildlib_1.sourceDir, subdir));
                    }
                    buildDone = true;
                }
            }
            catch (e) {
                if (e.toString().indexOf('no such file or directory') < 0) {
                    console.warn(e);
                }
            }
            ;
            if (!buildDone) {
                await (0, buildlib_1.processDirectory)(buildlib_1.sourceDir);
            }
        }
        else if (command == 'clean') {
            await (0, buildlib_1.cleanBuildStatus)(buildlib_1.sourceDir);
            if (process.argv.includes('--js')) {
                await (0, buildlib_1.cleanJsFiles)(buildlib_1.outputDir);
            }
        }
        else {
            console.error(`unknown command ${command}`);
        }
    })();
});
