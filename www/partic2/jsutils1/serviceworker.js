define("partic2/jsutils1/serviceworker", ["require", "exports", "./base", "./webutils"], function (require, exports, base_1, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.onfetchHandlers = exports.__internal__ = exports.proxyMessageEventTarget = exports.ServiceWorkerId = exports.serviceWorkerServeRoot = void 0;
    exports.setWorkerInfo = setWorkerInfo;
    exports.requestExit = requestExit;
    exports.cacheFetch = cacheFetch;
    exports.getDefaultCache = getDefaultCache;
    exports.loadServiceWorkerModule = loadServiceWorkerModule;
    const __name__ = 'partic2/jsutils1/serviceworker';
    exports.serviceWorkerServeRoot = (0, webutils_1.getWWWRoot)() + `/${__name__}/`;
    exports.ServiceWorkerId = 'service worker 1';
    exports.proxyMessageEventTarget = new EventTarget();
    class MessageEventWithSource extends MessageEvent {
        get source() {
            return this._source;
        }
        constructor(type, eventInit) {
            super(type, eventInit);
        }
    }
    __pxseedInit.onmessage = function (msg) {
        let ev = new MessageEventWithSource(msg.type, { data: msg.data });
        ev._source = msg.source;
        exports.proxyMessageEventTarget.dispatchEvent(ev);
    };
    let spawnerFunctionCall = new webutils_1.FunctionCallOverMessagePort({
        postMessage: () => { },
        addEventListener: exports.proxyMessageEventTarget.addEventListener.bind(exports.proxyMessageEventTarget),
        removeEventListener: exports.proxyMessageEventTarget.addEventListener.bind(removeEventListener),
    });
    async function setWorkerInfo(id) {
        globalThis.__workerId = id;
        return id;
    }
    exports.__internal__ = { spawnerFunctionCall };
    async function requestExit() {
        globalThis.close();
    }
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
