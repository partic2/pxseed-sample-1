define(["require", "exports", "./loaders", "./buildlib", "./util"], function (require, exports, loaders_1, buildlib_1, util_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    (async () => {
        await loaders_1.inited;
        let buildScriptAt = process.argv.indexOf('pxseedBuildScript/build');
        let command = process.argv[buildScriptAt + 1] ?? 'build';
        if (command == 'build') {
            let buildDone = false;
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
            util_1.console.error(`unknown command ${command}`);
        }
    })();
});
//# sourceMappingURL=build.js.map