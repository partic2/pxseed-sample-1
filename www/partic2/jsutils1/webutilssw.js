//This module can ONLY be used in environemnt support Service worker
//(https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
define(["require", "exports", "./base", "./webutils"], function (require, exports, base_1, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ServiceWorkerId = exports.serviceWorkerServeRoot = void 0;
    exports.getUrlForKvStore = getUrlForKvStore;
    exports.RequestDownloadSW = RequestDownloadSW;
    exports.ensureServiceWorkerInstalled = ensureServiceWorkerInstalled;
    exports.registerServiceWorkerStartupModule = registerServiceWorkerStartupModule;
    exports.unregisterServiceWorkerStartupModule = unregisterServiceWorkerStartupModule;
    exports.reloadServiceWorkerAndCache = reloadServiceWorkerAndCache;
    exports.getServiceWorkerStartupModule = getServiceWorkerStartupModule;
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
            this.processingScript = {};
            this.workerId = workerId ?? (0, base_1.GenerateRandomString)();
        }
        ;
        async start() {
            let servreg = await navigator.serviceWorker.register(workerEntryUrl);
            await (0, base_1.WaitUntil)(() => servreg.active != null, 100);
            let servworker = servreg.active;
            this.port = {
                addEventListener(type, cb) {
                    navigator.serviceWorker.addEventListener(type, cb);
                },
                removeEventListener(type, cb) {
                    navigator.serviceWorker.removeEventListener(type, cb);
                },
                postMessage(data, opt) {
                    servworker.postMessage(data, opt);
                }
            };
            this.port.addEventListener('message', (msg) => {
                if (typeof msg.data === 'object' && msg.data[WorkerThreadMessageMark]) {
                    let { type, scriptId } = msg.data;
                    switch (type) {
                        case 'run':
                            this.onHostRunScript(msg.data.script);
                            break;
                        case 'onScriptResolve':
                            this.onScriptResult(msg.data.result, scriptId);
                            break;
                        case 'onScriptReject':
                            this.onScriptReject(msg.data.reason, scriptId);
                            break;
                        case 'ready':
                            this.waitReady.setResult(0);
                            break;
                    }
                }
            });
            let workerReady = false;
            for (let t1 = 0; t1 < 1000 && !workerReady; t1++) {
                await Promise.race([
                    this.runScript(`resolve('ok')`, true).then(() => workerReady = true),
                    (0, base_1.sleep)(200, 'pending')
                ]);
            }
            await this.runScript(`this.__workerId='${this.workerId}'`);
            await this.runScript(`try{
            require(['${webutils_1.__name__}'],function(thismod){
                resolve(0);
            },function(err){
                reject(err);
            })}catch(e){reject(e)}`, true);
        }
        onHostRunScript(script) {
            (new Function('workerThread', script))(this);
        }
        async runScript(script, getResult) {
            let scriptId = '';
            if (getResult === true) {
                scriptId = (0, base_1.GenerateRandomString)();
                this.processingScript[scriptId] = new base_1.future();
            }
            this.port?.postMessage({ [WorkerThreadMessageMark]: true, type: 'run', script, scriptId });
            if (getResult === true) {
                return await this.processingScript[scriptId].get();
            }
        }
        onScriptResult(result, scriptId) {
            if (scriptId !== undefined && scriptId in this.processingScript) {
                let fut = this.processingScript[scriptId];
                delete this.processingScript[scriptId];
                fut.setResult(result);
            }
        }
        onScriptReject(reason, scriptId) {
            if (scriptId !== undefined && scriptId in this.processingScript) {
                let fut = this.processingScript[scriptId];
                delete this.processingScript[scriptId];
                fut.setException(new Error(reason));
            }
        }
        requestExit() {
            this.runScript('globalThis.close()');
        }
    }
    let serviceWorkerThread1;
    function getUrlForKvStore(dbName, key, options) {
        dbName ?? (dbName = webutils_1.config.defaultStorePrefix + '/kv-1');
        let search = [];
        if (options?.contentType != undefined) {
            search.push('content-type=' + encodeURIComponent(options.contentType));
        }
        let url = exports.serviceWorkerServeRoot + 'kvStore/' + encodeURIComponent(dbName) + '/' + key;
        if (search.length > 0) {
            url += '?' + search.join('&');
        }
        return url;
    }
    async function RequestDownloadSW(buff, fileName) {
        let kvs = await (0, webutils_1.kvStore)();
        let tempPath = '__temp/' + (0, base_1.GenerateRandomString)() + '/' + fileName;
        if (typeof buff === 'string') {
            buff = new TextEncoder().encode(buff);
        }
        await kvs.setItem(tempPath, buff);
        window.open(getUrlForKvStore(undefined, tempPath, { contentType: 'application/octet-stream' }), '_blank');
        await (0, base_1.sleep)(3000);
        kvs.delete(tempPath);
    }
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
        await (0, webutils_1.SavePersistentConfig)(serviceworkerName);
        worker.runScript(`require(['${serviceworkerName}'],function(sw){
        sw.loadServiceWorkerModule('${s}')
    })`);
    }
    async function unregisterServiceWorkerStartupModule(s) {
        swconfig = await (0, webutils_1.GetPersistentConfig)(serviceworkerName);
        let startupModules = new Set(swconfig.startupModules ?? []);
        startupModules.delete(s);
        swconfig.startupModules = Array.from(startupModules);
        await (0, webutils_1.SavePersistentConfig)(serviceworkerName);
    }
    async function reloadServiceWorkerAndCache() {
        //Maybe we should call function in service worker instead?
        fetch(`${(0, webutils_1.getWWWRoot)()}/pxseedInit.js/reload`);
    }
    async function getServiceWorkerStartupModule() {
        swconfig = await (0, webutils_1.GetPersistentConfig)(serviceworkerName);
        return new Set(swconfig.startupModules ?? []);
    }
});
//# sourceMappingURL=webutilssw.js.map