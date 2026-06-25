define("partic2/packageManager/onServerStartup", ["require", "exports", "partic2/pxprpcClient/registry", "partic2/jsutils1/base"], function (require, exports, registry_1, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__inited__ = exports._blockedStaticFiles = void 0;
    exports.__blockHttpAccessToStaticFileInWWW = __blockHttpAccessToStaticFileInWWW;
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    exports._blockedStaticFiles = {};
    async function packageManagerFileBlocker(path) {
        let pathPart = path.split(/\/+/).filter(t1 => t1 !== '').slice(1);
        let blocked = exports._blockedStaticFiles;
        for (let t1 of pathPart) {
            blocked = blocked[t1];
            if (blocked === undefined) {
                return false;
            }
            else if (blocked === 1) {
                return true;
            }
        }
        return false;
    }
    function __blockHttpAccessToStaticFileInWWW(path) {
        let pathPart = path.split(/\/+/);
        let t1 = exports._blockedStaticFiles;
        for (let t3 = 0; t3 < pathPart.length - 1; t3++) {
            let t2 = pathPart[t3];
            if (t1[t2] === undefined) {
                t1[t2] = {};
            }
            else if (t1[t2] === 1) {
                return;
            }
            t1 = t1[t2];
        }
        t1[pathPart.at(-1)] = 1;
    }
    exports.__inited__ = (async () => {
        let { blockStaticFileAccessIf } = await new Promise((resolve_1, reject_1) => { require(['pxseedServer2023/pxseedhttpserver'], resolve_1, reject_1); });
        blockStaticFileAccessIf.set(__name__ + '.fileBlocker', packageManagerFileBlocker);
        let client1 = await (await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName)).ensureConnected();
        await (0, registry_1.easyCallRemoteJsonFunction)(client1, 'partic2/packageManager/registry', 'sendOnStartupEventForAllPackages', []);
    })();
});
