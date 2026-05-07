define("partic2/packageManager/modtools", ["require", "exports", "partic2/pxprpcClient/registry", "partic2/CodeRunner/jsutils2", "partic2/jsutils1/base"], function (require, exports, registry_1, jsutils2_1, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.HotModuleReload = exports.CHotModuleReload = void 0;
    let remoteMisc = new jsutils2_1.Singleton(async () => {
        return await (0, registry_1.importRemoteModule)(await (await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName)).ensureConnected(), 'partic2/packageManager/misc');
    });
    class CHotModuleReload {
        constructor() {
            this.registry = new Map();
            this.watcher = null;
        }
        async checkAndReloadHmrModule(rebuildMods) {
            let reloadList = new Array();
            for (let t1 of this.registry.values()) {
                let found = rebuildMods.find(t2 => t1.moduleName.startsWith(t2.pkgName + '/'));
                if (found) {
                    reloadList.push(t1);
                }
            }
            reloadList.forEach(t1 => this.registry.delete(t1.moduleName));
            await Promise.allSettled(reloadList.map((t1) => (async () => {
                if (t1.onUnload != undefined) {
                    let mod1 = await new Promise((resolve_1, reject_1) => { require([t1.moduleName], resolve_1, reject_1); });
                    await mod1[t1.onUnload]?.();
                }
                await base_1.requirejs.undef(t1.moduleName);
                let mod1 = await new Promise((resolve_2, reject_2) => { require([t1.moduleName], resolve_2, reject_2); });
                if (t1.onLoad != undefined) {
                    await mod1[t1.onLoad]?.();
                }
            })()));
        }
        setModuleState(s) {
            if (s.hmr === false) {
                this.registry.delete(s.moduleName);
            }
            else {
                let found = this.registry.get(s.moduleName);
                if (found == null) {
                    this.registry.set(s.moduleName, s);
                }
                else {
                    for (let t1 in s) {
                        if (t1 != 'moduleName' && s[t1] != undefined) {
                            found[t1] = s[t1];
                        }
                    }
                }
            }
            if (this.watcher == null && this.registry.size > 0) {
                let that = this;
                let newWatcherTask = base_1.Task.fork(function* () {
                    let misc = yield* base_1.Task.yieldWrap(remoteMisc.get());
                    while (that.watcher == newWatcherTask) {
                        let newBuildEvent = yield* base_1.Task.yieldWrap(misc.waitBuildWatcherEvent());
                        that.checkAndReloadHmrModule(newBuildEvent);
                    }
                });
                this.watcher = newWatcherTask;
                this.watcher.run();
            }
            else if (this.watcher !== null && this.registry.size == 0) {
                this.watcher.abort();
                this.watcher = null;
            }
        }
    }
    exports.CHotModuleReload = CHotModuleReload;
    exports.HotModuleReload = new CHotModuleReload();
});
