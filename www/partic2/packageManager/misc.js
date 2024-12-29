define(["require", "exports", "path", "fs/promises", "partic2/jsutils1/base"], function (require, exports, path_1, promises_1, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__name__ = void 0;
    exports.cleanWWW = cleanWWW;
    exports.__name__ = 'partic2/packageManager/misc';
    let log = base_1.logger.getLogger(exports.__name__);
    let wwwDir = (0, path_1.join)((0, path_1.dirname)((0, path_1.dirname)((0, path_1.dirname)(__dirname))), 'www');
    let sourceDir = (0, path_1.join)((0, path_1.dirname)((0, path_1.dirname)((0, path_1.dirname)(__dirname))), 'source');
    async function cleanWWW(dir) {
        //clean .js .d.ts .tsbuildinfo .js.map and empty directory
        dir = dir ?? wwwDir;
        let children = await (0, promises_1.readdir)(dir, { withFileTypes: true });
        let emptyDir = true;
        for (let t1 of children) {
            if (t1.name.endsWith('.js') || t1.name.endsWith('.d.ts') || t1.name.endsWith('.tsbuildinfo') || t1.name.endsWith('.js.map')) {
                log.debug(`delete ${(0, path_1.join)(dir, t1.name)}`);
                await (0, promises_1.rm)((0, path_1.join)(dir, t1.name));
            }
            else if (t1.isDirectory()) {
                let r1 = await cleanWWW((0, path_1.join)(dir, t1.name));
                if (r1.emptyDir) {
                    log.debug(`delete ${(0, path_1.join)(dir, t1.name)}`);
                    await (0, promises_1.rmdir)((0, path_1.join)(dir, t1.name));
                }
                else {
                    emptyDir = false;
                }
            }
            else {
                emptyDir = false;
            }
        }
        return { emptyDir };
    }
});
//# sourceMappingURL=misc.js.map