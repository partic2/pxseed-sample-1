define(["require", "exports", "./base"], function (require, exports, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.lifecycle = exports.path = exports.defaultHttpClient = exports.HttpClient = exports.DynamicPageCSSManager = exports.CDynamicPageCSSManager = exports.CKeyValueDb = exports.config = exports.__name__ = void 0;
    exports.DomStringListToArray = DomStringListToArray;
    exports.ConvertFormDataToObject = ConvertFormDataToObject;
    exports.GetUrlQueryVariable = GetUrlQueryVariable;
    exports.GetUrlQueryVariable2 = GetUrlQueryVariable2;
    exports.AddUrlQueryVariable = AddUrlQueryVariable;
    exports.GetFullPathFromRelativePath = GetFullPathFromRelativePath;
    exports.RequestDownload = RequestDownload;
    exports.selectFile = selectFile;
    exports.AddStyleSheetNode = AddStyleSheetNode;
    exports.GetStyleRuleOfSelector = GetStyleRuleOfSelector;
    exports.kvStore = kvStore;
    exports.setKvStoreBackend = setKvStoreBackend;
    exports.GetPersistentConfig = GetPersistentConfig;
    exports.SavePersistentConfig = SavePersistentConfig;
    exports.CreateWorkerThread = CreateWorkerThread;
    exports.setWorkerThreadImplementation = setWorkerThreadImplementation;
    exports.webFetch = webFetch;
    exports.GetJsEntry = GetJsEntry;
    exports.BuildUrlFromJsEntryModule = BuildUrlFromJsEntryModule;
    exports.getWWWRoot = getWWWRoot;
    exports.getResourceManager = getResourceManager;
    exports.useDeviceWidth = useDeviceWidth;
    exports.useCssFile = useCssFile;
    exports.usePageIcon = usePageIcon;
    exports.__name__ = 'partic2/jsutils1/webutils';
    exports.config = {
        defaultStorePrefix: exports.__name__
    };
    function DomStringListToArray(strLs) {
        var arr = new Array();
        for (var i = 0; i < strLs.length; i++) {
            arr.push(strLs[i]);
        }
        return arr;
    }
    class CIndexedDb {
        constructor() { }
        connect(name, version) {
            var that = this;
            return new Promise(function (resolve, reject) {
                let openReq = globalThis.indexedDB.open(name, version);
                openReq.onerror = function (ev) {
                    reject(openReq.error);
                };
                openReq.onsuccess = function (ev) {
                    that.db = openReq.result;
                    that.update = false;
                    resolve(that.update);
                };
                openReq.onupgradeneeded = function (ev) {
                    that.db = openReq.result;
                    that.update = true;
                    resolve(that.update);
                };
            });
        }
        async drop(name) {
            if (this.db != null) {
                if (name == null) {
                    name = this.db.name;
                }
                await this.db.close();
            }
            return new Promise(function (resolve, reject) {
                var req = globalThis.indexedDB.deleteDatabase(name);
                req.onsuccess = function (ev) {
                    resolve(this.result);
                };
                req.onerror = function (ev) {
                    reject(req.error);
                };
            });
        }
        async createObjectStore(name, parameters) {
            let obj = this.db.createObjectStore(name, parameters);
            return obj;
        }
        beginTranscation() {
            this.transaction = this.db.transaction(DomStringListToArray(this.db.objectStoreNames), 'readwrite');
            return this.transaction;
        }
        getObjectStoreNames() {
            return Array.from(this.db.objectStoreNames);
        }
        async close() {
            this.db.close();
        }
    }
    class IndexedDbAdapter4Kvdb {
        constructor() {
            this.backend = 'none';
        }
        async init(dbName) {
            this.db = new CIndexedDb();
            var update = await this.db.connect(dbName);
            if (update && !new Set(this.db.getObjectStoreNames()).has('KeyValueMap')) {
                var objStore = await this.db.createObjectStore('KeyValueMap', {});
                await this.db.close();
                await this.db.connect(dbName);
            }
            this.backend = 'indexedDb';
        }
        async setItem(key, val) {
            var trans = this.db.beginTranscation();
            var store = trans.objectStore('KeyValueMap');
            var req = store.put(val, key);
            return new Promise(function (resolve, reject) {
                req.onsuccess = function (ev) {
                    resolve();
                };
                req.onerror = function (ev) {
                    reject(this.error);
                };
            });
        }
        async getItem(key) {
            var trans = this.db.beginTranscation();
            var store = trans.objectStore('KeyValueMap');
            var req = store.get(key);
            return new Promise(function (resolve, reject) {
                req.onsuccess = function (ev) {
                    resolve(this.result);
                };
                req.onerror = function (ev) {
                    reject(this.error);
                };
            });
        }
        //do NOT use AsyncIterator. indexedDb will close cursor automatically if no further request in one TICK.
        getAllKeys(onKey, onErr) {
            var trans = this.db.beginTranscation();
            var store = trans.objectStore('KeyValueMap');
            var req = store.openKeyCursor();
            req.onsuccess = function (ev) {
                if (this.result !== null) {
                    let next = onKey(this.result.key);
                    if (!(next != undefined && next.stop === true)) {
                        this.result.continue();
                    }
                }
                else {
                    onKey(null);
                }
            };
            req.onerror = function (ev) {
                onErr?.(new Error('idb error'));
                onKey(null);
            };
        }
        async delete(key) {
            var trans = this.db.beginTranscation();
            var store = trans.objectStore('KeyValueMap');
            var req = store.delete(key);
            return new Promise(function (resolve, reject) {
                req.onsuccess = function (ev) {
                    resolve(this.result);
                };
                req.onerror = function (ev) {
                    reject(this.error);
                };
            });
        }
        async close() {
            await this.db.close();
        }
    }
    class CKeyValueDb {
        async use(impl) {
            this.impl = impl;
        }
        //NOTE: only number,string,boolean,Uint8Array,Int8Array,ArrayBuffer,Array or Object with only above member are promised can store as value.
        setItem(key, val) {
            return this.impl.setItem(key, val);
        }
        getItem(key) {
            return this.impl.getItem(key);
        }
        getAllKeys(onKey, onErr) {
            this.impl.getAllKeys(onKey, onErr);
        }
        delete(key) {
            return this.impl.delete(key);
        }
        close() {
            return this.impl.close();
        }
        async useIndexedDb(dbName) {
            let impl = new IndexedDbAdapter4Kvdb();
            await impl.init(dbName);
            await this.use(impl);
        }
        async getAllKeysArray() {
            let keys = [];
            return await new Promise((resolve, reject) => {
                this.getAllKeys((k) => {
                    if (k != null) {
                        keys.push(k);
                    }
                    else {
                        resolve(keys);
                    }
                    return {};
                });
            });
        }
        async *getAllItems() {
            for (let k of await this.getAllKeysArray()) {
                yield { key: k, value: await this.getItem(k) };
            }
        }
    }
    exports.CKeyValueDb = CKeyValueDb;
    function ConvertFormDataToObject(data) {
        var r = {};
        data.forEach((val, key, parent) => {
            r[key] = val;
        });
        return r;
    }
    function GetUrlQueryVariable(name) {
        return GetUrlQueryVariable2(location.toString(), name);
    }
    function GetUrlQueryVariable2(url, name) {
        var startOfQuery = url.indexOf('?');
        if (startOfQuery < 0) {
            return null;
        }
        else {
            var query = url.substring(startOfQuery + 1);
            var vars = query.split("&");
            for (var i = 0; i < vars.length; i++) {
                var pair = vars[i].split("=");
                if (pair[0] == name) {
                    return pair[1];
                }
            }
            return null;
        }
    }
    function AddUrlQueryVariable(url, vars) {
        var startOfQuery = url.indexOf('&');
        let split = '&';
        if (startOfQuery < 0) {
            url += '?';
            split = '';
        }
        for (let k in vars) {
            url += split + k + '=' + encodeURI(vars[k]);
            split = '&';
        }
        return url;
    }
    function GetFullPathFromRelativePath(relPath) {
        var dir = location.pathname.substring(location.pathname.lastIndexOf('/'));
        return dir + relPath;
    }
    var priv__CachedDownloadLink = null;
    function RequestDownload(buff, fileName) {
        if (priv__CachedDownloadLink == null) {
            priv__CachedDownloadLink = document.createElement('a');
            priv__CachedDownloadLink.style.display = 'none';
            document.body.appendChild(priv__CachedDownloadLink);
        }
        priv__CachedDownloadLink.setAttribute('download', fileName);
        let url = URL.createObjectURL(new Blob([buff]));
        priv__CachedDownloadLink.href = url;
        priv__CachedDownloadLink.click();
        (async () => { await (0, base_1.sleep)(5000, null); URL.revokeObjectURL(url); });
    }
    async function selectFile() {
        let fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        return new Promise((resolve, reject) => {
            fileInput.addEventListener('change', (ev) => {
                resolve(fileInput.files);
            });
            fileInput.click();
        });
    }
    function AddStyleSheetNode() {
        let cssNode = document.createElement('style');
        document.head.appendChild(cssNode);
        return cssNode.sheet;
    }
    function GetStyleRuleOfSelector(selector) {
        var matched = new Array();
        for (let i = 0; i < document.styleSheets.length; i++) {
            let style = document.styleSheets.item(i);
            for (let i2 = 0; i2 < style.cssRules.length; i2++) {
                var rule = style.cssRules.item(i2);
                if (rule != null && rule.constructor == CSSStyleRule) {
                    let cssRule = rule;
                    if (cssRule.selectorText.split(',').findIndex(function (v) {
                        return v.trim() == selector;
                    }) >= 0) {
                        matched.push(cssRule);
                    }
                }
            }
        }
        return matched;
    }
    class CDynamicPageCSSManager {
        constructor() {
            this.InsertedSelector = new Array();
        }
        PutCss(selector, rules) {
            if (this.CssNode == undefined) {
                this.CssNode = AddStyleSheetNode();
            }
            let index = this.InsertedSelector.indexOf(selector);
            if (index >= 0) {
                //cssText is read only, Do not write it. 
                this.CssNode.deleteRule(index);
                this.InsertedSelector.splice(index, 1);
            }
            this.CssNode.insertRule(selector + '{' + rules.join(';') + '}', 0);
            this.InsertedSelector.unshift(selector);
        }
        RemoveCss(selector) {
            if (this.CssNode == undefined) {
                this.CssNode = AddStyleSheetNode();
            }
            let index = this.InsertedSelector.indexOf(selector);
            if (index >= 0) {
                this.CssNode.deleteRule(index);
                this.InsertedSelector.splice(index, 1);
            }
        }
    }
    exports.CDynamicPageCSSManager = CDynamicPageCSSManager;
    exports.DynamicPageCSSManager = new CDynamicPageCSSManager();
    var kvdbmap = {};
    var kvdbinitmutex = new base_1.mutex();
    var kvStoreBackend = async (dbname) => {
        let db = new CKeyValueDb();
        await db.useIndexedDb(dbname);
        return db.impl;
    };
    async function kvStore(dbname) {
        await kvdbinitmutex.lock();
        if (dbname == undefined) {
            dbname = exports.config.defaultStorePrefix + '/kv-1';
        }
        try {
            if (!(dbname in kvdbmap)) {
                let impl = await kvStoreBackend(dbname);
                kvdbmap[dbname] = new CKeyValueDb();
                await kvdbmap[dbname].use(impl);
            }
            return kvdbmap[dbname];
        }
        finally {
            await kvdbinitmutex.unlock();
        }
    }
    function setKvStoreBackend(backend) {
        kvStoreBackend = backend;
    }
    var cachedPersistentConfig = {};
    async function GetPersistentConfig(modname) {
        if (cachedPersistentConfig[modname] == undefined) {
            let kvs = await kvStore();
            cachedPersistentConfig[modname] = await kvs.getItem(modname + '/config');
        }
        if (cachedPersistentConfig[modname] == undefined) {
            cachedPersistentConfig[modname] = {};
        }
        return cachedPersistentConfig[modname];
    }
    async function SavePersistentConfig(modname) {
        if (cachedPersistentConfig[modname] != undefined) {
            let kvs = await kvStore();
            return await kvs.setItem(modname + '/config', cachedPersistentConfig[modname]);
        }
    }
    //WorkerThread feature require a custom AMD loader https://github.com/partic2/partic2-iamdee
    const WorkerThreadMessageMark = '__messageMark_WorkerThread';
    /*workerentry.js MUST put into the same origin to access storage api on web ,
    Due to same-origin-policy. That mean, dataurl is unavailable.
    Worker can be override, So do NOT abort this module init(throw error).*/
    let workerEntryUrl = function () {
        try {
            return getWWWRoot() + '/pxseedInit.js?__jsentry=' + encodeURIComponent('partic2/jsutils1/workerentry');
        }
        catch (e) { }
        ;
        return '';
    }();
    class WebWorkerThread {
        constructor(workerId) {
            this.workerId = '';
            this.waitReady = new base_1.future();
            this.processingScript = {};
            this.workerId = workerId ?? (0, base_1.GenerateRandomString)();
        }
        ;
        async start() {
            this.port = new Worker(workerEntryUrl);
            this.port = this.port;
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
            await this.waitReady.get();
            await this.runScript(`this.__workerId='${this.workerId}'`);
            exports.lifecycle.addEventListener('pause', () => {
                this.runScript(`require(['${exports.__name__}'],function(webutils){
                webutils.lifecycle.dispatchEvent(new Event('pause'));
            })`);
            });
            exports.lifecycle.addEventListener('resume', () => {
                this.runScript(`require(['${exports.__name__}'],function(webutils){
                webutils.lifecycle.dispatchEvent(new Event('resume'));
            })`);
            });
            exports.lifecycle.addEventListener('exit', () => {
                this.runScript(`require(['${exports.__name__}'],function(webutils){
                webutils.lifecycle.dispatchEvent(new Event('exit'));
            })`);
            });
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
    var defaultWorkerThreadImpl = WebWorkerThread;
    function CreateWorkerThread(workerId) {
        return new defaultWorkerThreadImpl(workerId);
    }
    function setWorkerThreadImplementation(impl) {
        defaultWorkerThreadImpl = impl;
    }
    class HttpClient {
        constructor() {
            this.reqHooks = [];
            this.respHooks = [];
        }
        async fetch(url, init) {
            for (let hook of this.reqHooks) {
                await hook({ url, init });
            }
            let resp = await fetch(url, init);
            for (let hook of this.respHooks) {
                await hook({ url, init }, resp);
            }
            return resp;
        }
        hookRequest(hook) {
            this.reqHooks.push(hook);
        }
        hookResponse(hook) {
            this.respHooks.push(hook);
        }
    }
    exports.HttpClient = HttpClient;
    exports.defaultHttpClient = new HttpClient();
    async function webFetch(url, init) {
        return await exports.defaultHttpClient.fetch(url, init);
    }
    function GetJsEntry() {
        return __pxseedInit._entry;
    }
    exports.path = {
        sep: '/',
        join(...args) {
            let parts = [];
            for (let t1 of args) {
                for (let t2 of t1.split(this.sep)) {
                    if (t2 === '..' && parts.length >= 1) {
                        parts.pop();
                    }
                    else if (t2 === '.') {
                        //skip
                    }
                    else {
                        parts.push(t2);
                    }
                }
            }
            return parts.join(this.sep);
        },
        dirname(PathLike) {
            let delim = PathLike.lastIndexOf(this.sep);
            return PathLike.substring(0, delim);
        }
    };
    function BuildUrlFromJsEntryModule(entryModule, urlarg) {
        return window.location.pathname + '?__jsentry=' + encodeURIComponent(entryModule) + (urlarg ? '&' + urlarg : '');
    }
    function getWWWRoot() {
        return base_1.requirejs.getConfig().baseUrl;
    }
    function getResourceManager(modNameOrLocalRequire) {
        if (typeof modNameOrLocalRequire === 'function') {
            modNameOrLocalRequire = base_1.requirejs.getLocalRequireModule(modNameOrLocalRequire);
        }
        return {
            getUrl(path2) {
                return exports.path.join(getWWWRoot(), modNameOrLocalRequire + '/..', path2);
            }
        };
    }
    function useDeviceWidth() {
        let headmeta = document.createElement('meta');
        headmeta.name = 'viewport';
        headmeta.content = 'width=device-width user-scalable=no';
        document.head.append(headmeta);
    }
    function useCssFile(cssUrl) {
        let linkTag = document.createElement('link');
        linkTag.rel = 'stylesheet';
        linkTag.type = 'text/css';
        linkTag.href = cssUrl;
        document.head.appendChild(linkTag);
    }
    function usePageIcon(iconUrl, iconType) {
        iconType = iconType ?? 'image/x-icon';
        let linkTag = document.createElement('link');
        linkTag.rel = 'icon';
        linkTag.type = iconType;
        linkTag.href = iconUrl;
        document.head.appendChild(linkTag);
    }
    class _LifecycleEventHandler extends EventTarget {
        addEventListener(type, callback, options) {
            super.addEventListener(type, callback, options);
        }
    }
    exports.lifecycle = new _LifecycleEventHandler();
    if ('document' in globalThis) {
        globalThis.document.addEventListener('visibilitychange', (ev) => {
            if (document.hidden) {
                exports.lifecycle.dispatchEvent(new Event('pause'));
            }
            else {
                exports.lifecycle.dispatchEvent(new Event('resume'));
            }
        });
        globalThis.addEventListener('beforeunload', () => {
            exports.lifecycle.dispatchEvent(new Event('pause'));
            exports.lifecycle.dispatchEvent(new Event('exit'));
        });
    }
});
//# sourceMappingURL=webutils.js.map