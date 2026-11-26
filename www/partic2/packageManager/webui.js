define("partic2/packageManager/webui", ["require", "exports", "partic2/jsutils1/webutils", "partic2/jsutils1/base", "partic2/pxprpcClient/registry", "partic2/pxprpcClient/bus", "partic2/pxprpcClient/rpcworker", "pxprpc/extend", "pxprpc/base"], function (require, exports, webutils_1, base_1, registry_1, bus_1, rpcworker_1, extend_1, base_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.config = exports.packageManagerWebuiEntry = void 0;
    exports.setPackageManagerWebuiEntry = setPackageManagerWebuiEntry;
    exports.navigateWindowToThisWebui = navigateWindowToThisWebui;
    const __name__ = base_1.requirejs.getLocalRequireModule(require);
    let packageManagerFallbackWebuiEntry = {
        module: 'partic2/packageManager/webui2', func: 'main'
    };
    exports.packageManagerWebuiEntry = { ...packageManagerFallbackWebuiEntry };
    let persistentConfig = {};
    exports.config = {
        warningBeforeUnload: true
    };
    window.addEventListener('beforeunload', (ev) => {
        if (exports.config.warningBeforeUnload) {
            ev.preventDefault();
            ev.returnValue = true;
        }
    });
    (async () => {Promise.__onAsyncEnter();try{
        if ((0, webutils_1.GetJsEntry)() == __name__) {
            persistentConfig = await  Promise.__onAwait((0, webutils_1.GetPersistentConfig)(__name__));
            if (persistentConfig.packageManagerWebuiEntry != undefined) {
                exports.packageManagerWebuiEntry = persistentConfig.packageManagerWebuiEntry;
            }
            if (persistentConfig.onWebuiStartup != undefined) {
                await  Promise.__onAwait(Promise.allSettled(persistentConfig.onWebuiStartup.map(t1 => new Promise((resolve_1, reject_1) => { require([t1.module], resolve_1, reject_1); }).then((mod) => mod[t1.func]()).catch((err) => { console.warn(err); }))));
            }
            try {
                if (await  Promise.__onAwait((0, registry_1.getPersistentRegistered)(registry_1.ServerHostRpcName)) != null) {
                    bus_1.RemotePxseedJsIoServer.serve(`/pxprpc/pxseed_webui/${__name__.replace(/\//g, '.')}/${rpcworker_1.rpcId.get()}`, {
                        onConnect: (io) => new extend_1.RpcExtendServer1(new base_2.Server(io)).serve()
                    }).catch((err) => console.warn(err.message, err.stack));
                }
                let shw1 = await  Promise.__onAwait((0, registry_1.getPersistentRegistered)(registry_1.ServerHostWorker1RpcName));
                if (shw1 != null) {
                    let rpc1 = await  Promise.__onAwait(shw1.ensureConnected());
                    let startups = await  Promise.__onAwait((0, registry_1.easyCallRemoteJsonFunction)(rpc1, 'partic2/packageManager/registry', 'getPackageListeners', ['onWebuiStartup']));
                    await  Promise.__onAwait(Promise.allSettled((startups.map(t1 => new Promise((resolve_2, reject_2) => { require([t1.module], resolve_2, reject_2); }).then(t2 => t2[t1.func]()).catch((err) => { console.warn(err); })))));
                }
            }
            catch (err) { }
            new Promise((resolve_3, reject_3) => { require([exports.packageManagerWebuiEntry.module], resolve_3, reject_3); }).then((mod) => mod[exports.packageManagerWebuiEntry.func]('webui')).catch(() => {
                new Promise((resolve_4, reject_4) => { require([packageManagerFallbackWebuiEntry.module], resolve_4, reject_4); }).then((mod) => mod[packageManagerFallbackWebuiEntry.func]('webui')).catch(() => { });
            });
        }
    }finally{Promise.__onAsyncExit();}})();
    async function setPackageManagerWebuiEntry(entry) {Promise.__onAsyncEnter();try{
        exports.packageManagerWebuiEntry = entry;
        let config = await  Promise.__onAwait((0, webutils_1.GetPersistentConfig)(__name__));
        config.packageManagerWebuiEntry = entry;
        await  Promise.__onAwait((0, webutils_1.SavePersistentConfig)(__name__, config));
    }finally{Promise.__onAsyncExit();}}
    function navigateWindowToThisWebui(urlarg) {
        window.open((0, webutils_1.BuildUrlFromJsEntryModule)(__name__, urlarg), '_self');
    }
});
