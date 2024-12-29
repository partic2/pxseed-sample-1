define(["require", "exports", "./base", "./webutils"], function (require, exports, base_1, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.onfetchHandlers = exports.ServiceWorkerId = exports.serviceWorkerServeRoot = void 0;
    exports.cacheFetch = cacheFetch;
    exports.getDefaultCache = getDefaultCache;
    exports.loadServiceWorkerModule = loadServiceWorkerModule;
    const __name__ = 'partic2/jsutils1/serviceworker';
    exports.serviceWorkerServeRoot = (0, webutils_1.getWWWRoot)() + `/${__name__}/`;
    exports.ServiceWorkerId = 'service worker 1';
    (function () {
        const WorkerThreadMessageMark = '__messageMark_WorkerThread';
        self.globalThis = self;
        addEventListener('message', function (msg) {
            if (typeof msg.data === 'object' && msg.data[WorkerThreadMessageMark]) {
                let type = msg.data.type;
                let scriptId = msg.data.scriptId;
                switch (type) {
                    case 'run':
                        new Function('resolve', 'reject', msg.data.script)((result) => {
                            (msg.source ?? globalThis).postMessage({ [WorkerThreadMessageMark]: true, type: 'onScriptResolve', result, scriptId });
                        }, (reason) => {
                            (msg.source ?? globalThis).postMessage({ [WorkerThreadMessageMark]: true, type: 'onScriptRejecte', reason, scriptId });
                        });
                        break;
                }
            }
        });
        if ('postMessage' in globalThis) {
            globalThis.postMessage({ [WorkerThreadMessageMark]: true, type: 'ready' });
        }
    })();
    async function kvStoreOnFetch(dbName, varName, queryStat) {
        let db = await (0, webutils_1.kvStore)(dbName);
        let data = await db.getItem(varName);
        if (data == undefined) {
            return new Response('Not found', {
                status: 404
            });
        }
        else {
            let contentType = '';
            if (queryStat != undefined) {
                contentType = decodeURIComponent((0, webutils_1.GetUrlQueryVariable2)(queryStat, 'content-type') ?? '');
            }
            let headers = {};
            if (contentType != '') {
                headers['content-type'] = contentType;
            }
            return new Response(data, {
                headers
            });
        }
    }
    let swconfig = {};
    exports.onfetchHandlers = new Array();
    async function cacheFetch(url) {
        return await __pxseedInit.serviceWorker.cacheFetch(url);
    }
    function getDefaultCache() {
        return __pxseedInit.serviceWorker.cache;
    }
    async function loadServiceWorkerModule(modName) {
        try {
            let mod = await base_1.requirejs.promiseRequire(modName);
            if (mod != undefined && ('asyncInit' in mod)) {
                await mod.asyncInit();
            }
        }
        catch (e) {
            console.error(e);
        }
    }
    if ('__pxseedInit' in globalThis && __pxseedInit.env == 'service worker') {
        //For service worker.
        (async () => {
            swconfig = await (0, webutils_1.GetPersistentConfig)(__name__);
            __pxseedInit.onfetch = (ev) => {
                let resp = null;
                for (let t1 of exports.onfetchHandlers) {
                    resp = t1(ev);
                    if (resp !== null) {
                        break;
                    }
                }
                return resp;
            };
            exports.onfetchHandlers.push((fetchEv) => {
                let req = fetchEv.request;
                if (req.url.startsWith(exports.serviceWorkerServeRoot)) {
                    let subpath = req.url.substring(exports.serviceWorkerServeRoot.length);
                    let matched = subpath.match(/^kvStore\/(.+?)\/(.+?)(\?.*)?$/);
                    if (matched != null) {
                        return kvStoreOnFetch(decodeURIComponent(matched[1]), matched[2], matched[3]);
                    }
                }
                return null;
            });
            try {
                await Promise.allSettled((swconfig.startupModules ?? []).map(t1 => loadServiceWorkerModule(t1)));
            }
            catch (e) {
                //Don't throw
                console.error(e);
            }
            __pxseedInit.serviceWorker.serviceWorkerLoaded();
        })();
    }
});
//# sourceMappingURL=serviceworker.js.map