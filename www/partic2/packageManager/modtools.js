define("partic2/packageManager/modtools", ["require", "exports", "partic2/pxprpcClient/registry", "partic2/CodeRunner/jsutils2", "partic2/jsutils1/base", "pxprpc/extend", "pxprpc/base", "partic2/pxprpcClient/bus"], function (require, exports, registry_1, jsutils2_1, base_1, extend_1, base_2, bus_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.HotModuleReload = exports.CHotModuleReload = void 0;
    exports.getConnectedPxseedWebuiRpcClientFromServerHostUrl = getConnectedPxseedWebuiRpcClientFromServerHostUrl;
    let remoteMisc = new jsutils2_1.Singleton(async () => {Promise.__onAsyncEnter();try{
        return await  Promise.__onAwait((0, registry_1.importRemoteModule)(await  Promise.__onAwait((await  Promise.__onAwait((0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName))).ensureConnected()), 'partic2/packageManager/misc'));
    }finally{Promise.__onAsyncExit();}});
    class CHotModuleReload {
        constructor() {
            this.registry = new Map();
            this.watcher = null;
        }
        async checkAndReloadHmrModule(rebuildMods) {Promise.__onAsyncEnter();try{
            let reloadList = new Array();
            for (let t1 of this.registry.values()) {
                let found = rebuildMods.find(t2 => t1.moduleName.startsWith(t2.pkgName + '/'));
                if (found) {
                    reloadList.push(t1);
                }
            }
            reloadList.forEach(t1 => this.registry.delete(t1.moduleName));
            await  Promise.__onAwait(Promise.allSettled(reloadList.map((t1) => (async () => {Promise.__onAsyncEnter();try{
                if (t1.onUnload != undefined) {
                    let mod1 = await  Promise.__onAwait(new Promise((resolve_1, reject_1) => { require([t1.moduleName], resolve_1, reject_1); }));
                    await  Promise.__onAwait(mod1[t1.onUnload]?.());
                }
                await  Promise.__onAwait(base_1.requirejs.undef(t1.moduleName));
                let mod1 = await  Promise.__onAwait(new Promise((resolve_2, reject_2) => { require([t1.moduleName], resolve_2, reject_2); }));
                if (t1.onLoad != undefined) {
                    await  Promise.__onAwait(mod1[t1.onLoad]?.());
                }
            }finally{Promise.__onAsyncExit();}})())));
        }finally{Promise.__onAsyncExit();}}
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
    async function getConnectedPxseedWebuiRpcClientFromServerHostUrl(serverHostUrl, index) {Promise.__onAsyncEnter();try{
        let conn = await  Promise.__onAwait((0, registry_1.openConnectionFromUrl)(serverHostUrl));
        (0, base_1.assert)(conn != null);
        let prefix = `/pxprpc/pxseed_webui/partic2.packageManager.webui/`;
        let client = await  Promise.__onAwait(new extend_1.RpcExtendClient1(new base_2.Client(conn)).init());
        let lookupresult = await  Promise.__onAwait(bus_1.RemotePxseedJsIoServer.prefixQuery(prefix, client));
        index = index ?? 0;
        let choice = lookupresult.at(index);
        if (choice == undefined) {
            return null;
        }
        return await  Promise.__onAwait(new extend_1.RpcExtendClient1(new base_2.Client(await  Promise.__onAwait(bus_1.RemotePxseedJsIoServer.connect(choice, client)))).init());
    }finally{Promise.__onAsyncExit();}}
});
