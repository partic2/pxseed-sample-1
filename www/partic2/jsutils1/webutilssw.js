//This module can ONLY be used in environemnt support Service worker
//(https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
define("partic2/jsutils1/webutilssw", ["require", "exports", "./base", "./webutils"], function (require, exports, base_1, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SimpleGETCache = exports.__inited__ = exports.usingSimpleGETCacheFetchHandler = exports.ServiceWorkerId = exports.serviceWorkerServeRoot = void 0;
    exports.ensureServiceWorkerInstalled = ensureServiceWorkerInstalled;
    exports.registerServiceWorkerStartupModule = registerServiceWorkerStartupModule;
    exports.unregisterServiceWorkerStartupModule = unregisterServiceWorkerStartupModule;
    exports.reloadServiceWorkerAndCache = reloadServiceWorkerAndCache;
    exports.getServiceWorkerStartupModule = getServiceWorkerStartupModule;
    exports.installThisModule = installThisModule;
    exports.uninstallThisModule = uninstallThisModule;
    exports.SimpleGETCacheReloadConfig = SimpleGETCacheReloadConfig;
    const __name__ = base_1.requirejs.getLocalRequireModule(require);
    /*workerentry.js MUST put into the same origin to access storage api on web ,
    Due to same-origin-policy. That mean, dataurl is unavailable.
    Worker can be override, So do NOT abort this module init(throw error).*/
    let workerEntryUrl = function () {
        try {
            return (0, webutils_1.getWWWRoot)() + '/pxseedInit.js?__jsentry=' + encodeURIComponent('partic2/jsutils1/serviceworker');
        }
        catch (e) { }
        ;
        return '';
    }();
    exports.serviceWorkerServeRoot = (0, webutils_1.getWWWRoot)() + '/partic2/jsutils1/serviceworker/';
    exports.ServiceWorkerId = 'service worker 1';
    //WorkerThread feature require a custom AMD loader https://github.com/partic2/partic2-iamdee
    const WorkerThreadMessageMark = '__messageMark_WorkerThread';
    class ServiceWorkerThread {
        constructor(workerId) {
            this.workerId = '';
            this.waitReady = new base_1.future();
            this.onExit = new Set();
            this._forwardLifecycle = (msg) => {
                this.call('partic2/jsutils1/workerentry', 'dispatchWorkerLifecycle', [msg.type]);
            };
            this.workerId = workerId ?? (0, base_1.GenerateRandomString)();
        }
        ;
        async start() {
            let serviceWorker;
            if (navigator.serviceWorker.controller != undefined) {
                serviceWorker = navigator.serviceWorker.controller;
            }
            else {
                let servreg = await navigator.serviceWorker.register(workerEntryUrl);
                await (0, base_1.WaitUntil)(() => servreg.active != null, 100, 10000);
                serviceWorker = servreg.active;
            }
            this.port = {
                addEventListener(type, cb) {
                    navigator.serviceWorker.addEventListener(type, cb);
                },
                removeEventListener(type, cb) {
                    navigator.serviceWorker.removeEventListener(type, cb);
                },
                postMessage(data, opt) {
                    serviceWorker.postMessage(data, opt);
                }
            };
            let cb = (msg) => {
                if (typeof msg.data === 'object') {
                    if (msg.data[WorkerThreadMessageMark] === 'closing') {
                        this.onExit.forEach(cb => cb());
                    }
                }
            };
            this.port.addEventListener('message', cb);
            this.funcCall = new webutils_1.FunctionCallOverMessagePort(this.port);
            for (let t1 = 0; t1 < 50 && !this.waitReady.done; t1++) {
                this.call('partic2/jsutils1/serviceworker', 'setWorkerInfo', [this.workerId]).then(() => this.waitReady.setResult(0), () => { });
                await Promise.race([this.waitReady.get(), (0, base_1.sleep)(200)]);
            }
            if (!this.waitReady.done)
                throw new Error('Timeout waiting for service worker ready.');
        }
        async call(module, funcName, args) {
            return await this.funcCall.call(module, funcName, args);
        }
        requestExit() {
            this.call('partic2/jsutils1/serviceworker', 'requestExit', []);
        }
    }
    let serviceWorkerThread1;
    async function ensureServiceWorkerInstalled() {
        if (serviceWorkerThread1 == null) {
            serviceWorkerThread1 = new ServiceWorkerThread(exports.ServiceWorkerId);
            await serviceWorkerThread1.start();
        }
        ;
        return serviceWorkerThread1;
    }
    let swconfig = {};
    const serviceworkerName = 'partic2/jsutils1/serviceworker';
    //service worker startup module may export asyncInit to do initialize asynchronously.
    //startup module can push/unshift interceptor to "onfetchHandlers" in './serviceworker'.
    async function registerServiceWorkerStartupModule(s) {
        let worker = await ensureServiceWorkerInstalled();
        swconfig = await (0, webutils_1.GetPersistentConfig)(serviceworkerName);
        let startupModules = new Set(swconfig.startupModules ?? []);
        startupModules.add(s);
        swconfig.startupModules = Array.from(startupModules);
        await (0, webutils_1.SavePersistentConfig)(serviceworkerName, swconfig);
        worker.call(serviceworkerName, 'loadServiceWorkerModule', [s]);
    }
    async function unregisterServiceWorkerStartupModule(s) {
        swconfig = await (0, webutils_1.GetPersistentConfig)(serviceworkerName);
        let startupModules = new Set(swconfig.startupModules ?? []);
        startupModules.delete(s);
        swconfig.startupModules = Array.from(startupModules);
        await (0, webutils_1.SavePersistentConfig)(serviceworkerName, swconfig);
    }
    async function reloadServiceWorkerAndCache() {
        //Maybe we should call function in service worker instead?
        fetch(`${(0, webutils_1.getWWWRoot)()}/pxseedInit.js/reload`);
    }
    async function getServiceWorkerStartupModule() {
        swconfig = await (0, webutils_1.GetPersistentConfig)(serviceworkerName);
        return new Set(swconfig.startupModules ?? []);
    }
    const cacheName = (0, webutils_1.getWWWRoot)() + '/' + __name__;
    let config = {};
    class SimpleGETCacheFetchHandler {
        constructor() {
            this.fetch = (ev) => {
                if (ev.request.method != 'GET') {
                    return null;
                }
                let policy = config.simpleGETCache?.policy ?? 'not handle';
                switch (policy) {
                    case 'not handle':
                        return null;
                    case 'fetch only':
                        return this.fetchOnlyHandler(ev.request);
                    case 'fetch first':
                        return this.fetchFirstHandler(ev.request);
                    case 'cache first':
                        return this.cacheFirstHandler(ev.request);
                    default:
                        return null;
                }
            };
        }
        async fetchOnlyHandler(request) {
            return await fetch(request);
        }
        async updateWithConfig() {
            if (this.cache == undefined) {
                this.cache = await caches.open(cacheName);
            }
        }
        async fetchFirstHandler(request) {
            try {
                let resp = await fetch(request.url);
                let respClone = resp.clone();
                await this.cache.put(request.url, resp);
                return respClone;
            }
            catch (err) {
                (0, base_1.throwIfAbortError)(err);
                let matchResult = await this.cache.match(request.url);
                if (matchResult == undefined) {
                    return new Response(null, { status: 404 });
                }
                else {
                    return matchResult;
                }
            }
        }
        async cacheFirstHandler(request) {
            let matchResult = await this.cache.match(request.url);
            if (matchResult == undefined) {
                let resp = await fetch(request.url);
                let respClone = resp.clone();
                await this.cache.put(request.url, resp);
                return respClone;
            }
            else {
                return matchResult;
            }
        }
    }
    //internal use
    exports.usingSimpleGETCacheFetchHandler = null;
    exports.__inited__ = (async () => {
        if ('__pxseedInit' in globalThis && __pxseedInit.env == 'service worker') {
            config = await (0, webutils_1.GetPersistentConfig)(__name__);
            let { onfetchHandlers } = await new Promise((resolve_1, reject_1) => { require(['./serviceworker'], resolve_1, reject_1); });
            exports.usingSimpleGETCacheFetchHandler = new SimpleGETCacheFetchHandler();
            await exports.usingSimpleGETCacheFetchHandler.updateWithConfig();
            onfetchHandlers.push({ name: __name__ + '.SimpleGETCache', handler: exports.usingSimpleGETCacheFetchHandler.fetch });
        }
    })();
    async function installThisModule() {
        await registerServiceWorkerStartupModule(__name__);
    }
    async function uninstallThisModule() {
        await unregisterServiceWorkerStartupModule(__name__);
    }
    //Simple "GET Request Cache Manager" for Service Worker 
    exports.SimpleGETCache = {
        ensurePersistentConfigLoaded: async function () {
            config = await (0, webutils_1.GetPersistentConfig)(__name__);
        },
        //The service worker config must reload manually after modified(ie:setCachePolicy)
        async reloadServiceWorkerConfig() {
            if ('__pxseedInit' in globalThis && __pxseedInit.env == 'service worker') {
                if (exports.usingSimpleGETCacheFetchHandler != null) {
                    await this.ensurePersistentConfigLoaded();
                    await exports.usingSimpleGETCacheFetchHandler.updateWithConfig();
                }
            }
            else {
                let sw = await ensureServiceWorkerInstalled();
                await sw.call(__name__, 'SimpleGETCacheReloadConfig', []);
            }
        },
        setCachePolicy: async function (policy) {
            await this.ensurePersistentConfigLoaded();
            config.simpleGETCache = { policy: policy };
            await (0, webutils_1.SavePersistentConfig)(__name__, config);
        },
        getCachePolicy: async function () {
            await this.ensurePersistentConfigLoaded();
            return config.simpleGETCache?.policy;
        },
        clearCache: async function () {
            await caches.delete(cacheName);
        }
    };
    async function SimpleGETCacheReloadConfig() {
        return await exports.SimpleGETCache.reloadServiceWorkerConfig();
    }
});
