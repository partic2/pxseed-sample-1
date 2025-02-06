define(["require", "exports", "path", "pxseedBuildScript/loaders", "tinyglobby", "fs/promises", "./CodeContext"], function (require, exports, path_1, loaders_1, tinyglobby_1, promises_1, CodeContext_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.addAwaitHookLoader = addAwaitHookLoader;
    //Await hook
    //pxseedjs:partic2/CodeRunner/pxseedLoader.addAwaitHookLoader
    async function addAwaitHookLoader(dir, cfg, status) {
        let tplVar = {
            sourceRoot: loaders_1.sourceDir, outputRoot: loaders_1.outputDir,
            packageSource: dir, packageOutput: loaders_1.outputDir + '/' + dir.substring(loaders_1.sourceDir.length + 1)
        };
        let jsDir = cfg.jsDir;
        function applyTemplate(source, tpl) {
            let vars = Object.keys(tpl);
            let result = (new Function(...vars, 'return `' + source + '`;'))(...vars.map(p => tpl[p]));
            return result;
        }
        if (jsDir == undefined) {
            jsDir = loaders_1.outputDir + '/' + dir.substring(loaders_1.sourceDir.length + 1);
        }
        else {
            jsDir = applyTemplate(jsDir, tplVar);
        }
        let jsFiles = await (0, tinyglobby_1.glob)(['**/*.js'], { cwd: jsDir });
        for (let t1 of jsFiles) {
            let fullPath = path_1.default.join(jsDir, t1);
            if ((await promises_1.default.stat(fullPath)).mtimeMs > status.lastSuccessBuildTime) {
                let sourceCode = new TextDecoder().decode(await promises_1.default.readFile(fullPath));
                let modified = (0, CodeContext_1.addAwaitHook)(sourceCode);
                await promises_1.default.writeFile(fullPath, new TextEncoder().encode(modified));
            }
        }
    }
});
//# sourceMappingURL=pxseedLoader.js.map