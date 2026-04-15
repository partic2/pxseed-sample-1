define("partic2/jsutils1/webutils", ["require", "exports", "./base"], function (require, exports, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.globalInputState = exports.GlobalInputStateTracer = exports.lifecycle = exports.path = exports.defaultHttpClient = exports.HttpClient = exports.WebWorkerThread = exports.FunctionCallOverMessagePort = exports.WorkerThreadMessageMark = exports.DynamicPageCSSManager = exports.CDynamicPageCSSManager = exports.CKeyValueDb = exports.config = exports.__name__ = void 0;
    exports.GetUrlQueryVariable = GetUrlQueryVariable;
    exports.GetUrlQueryVariable2 = GetUrlQueryVariable2;
    exports.AddUrlQueryVariable = AddUrlQueryVariable;
    exports.RequestDownload = RequestDownload;
    exports.selectFile = selectFile;
    exports.AddStyleSheetNode = AddStyleSheetNode;
    exports.GetStyleRuleOfSelector = GetStyleRuleOfSelector;
    exports.kvStore = kvStore;
    exports.setKvStoreBackend = setKvStoreBackend;
    exports.useKvStorePrefix = useKvStorePrefix;
    exports.GetPersistentConfig = GetPersistentConfig;
    exports.SavePersistentConfig = SavePersistentConfig;
    exports.CreateWorkerThread = CreateWorkerThread;
    exports.setWorkerThreadImplementation = setWorkerThreadImplementation;
    exports.setDefaultHttpClient = setDefaultHttpClient;
    exports.GetJsEntry = GetJsEntry;
    exports.BuildUrlFromJsEntryModule = BuildUrlFromJsEntryModule;
    exports.getWWWRoot = getWWWRoot;
    exports.setResourceManagerImpl = setResourceManagerImpl;
    exports.getResourceManager = getResourceManager;
    exports.useDeviceWidth = useDeviceWidth;
    exports.useCssFile = useCssFile;
    exports.usePageIcon = usePageIcon;
    exports.__name__ = 'partic2/jsutils1/webutils';
    exports.config = {
        defaultStorePrefix: exports.__name__,
        //No garantee to contain all kvStorePrefix binding, But at least binding for current wwwroot.
        //See useKvStorePrefix for detail.
        kvStorePrefix: null
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
                this.db.close();
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
        async getAllKeys(onKey, onErr) {
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
        constructor(dbName, impl) {
            this.dbName = dbName;
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
            delete kvdbmap[this.dbName];
            return this.impl.close();
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
                }, (err) => reject(err));
            });
        }
        async *getAllItems() {
            for (let k of await this.getAllKeysArray()) {
                yield { key: k, value: await this.getItem(k) };
            }
        }
    }
    exports.CKeyValueDb = CKeyValueDb;
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
    function RequestDownload(buff, fileName) {
        let downloadAnchor = document.createElement('a');
        downloadAnchor.style.display = 'none';
        document.body.appendChild(downloadAnchor);
        downloadAnchor.setAttribute('download', fileName);
        let url = URL.createObjectURL(new Blob([buff]));
        downloadAnchor.href = url;
        downloadAnchor.click();
        (async () => {
            await (0, base_1.sleep)(5000, null);
            URL.revokeObjectURL(url);
            document.body.removeChild(downloadAnchor);
        })();
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
    function AddStyleSheetNode(parentNode) {
        parentNode = parentNode ?? (document.head);
        let cssNode = document.createElement('style');
        parentNode.appendChild(cssNode);
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
        constructor(cssSheetIn) {
            this.cssSheet = cssSheetIn ?? AddStyleSheetNode();
        }
        PutCss(selector, rules) {
            let found = this.FindRuleFor(selector);
            if (found != undefined) {
                this.cssSheet.deleteRule(found.index);
            }
            this.cssSheet.insertRule(selector + '{' + rules.join(';') + '}', 0);
        }
        *IterCss() {
            for (let t1 = 0; t1 < this.cssSheet.cssRules.length; t1++) {
                let rule = this.cssSheet.cssRules.item(t1);
                yield { index: t1, rule };
            }
        }
        FindRuleFor(selector) {
            for (let t1 of this.IterCss()) {
                if (t1.rule.selectorText == selector) {
                    return t1;
                }
            }
        }
        RemoveCss(selector) {
            let found = this.FindRuleFor(selector);
            if (found != undefined) {
                this.cssSheet.deleteRule(found.index);
            }
        }
    }
    exports.CDynamicPageCSSManager = CDynamicPageCSSManager;
    exports.DynamicPageCSSManager = null;
    if (globalThis.document != undefined) {
        exports.DynamicPageCSSManager = new CDynamicPageCSSManager(AddStyleSheetNode());
    }
    var kvdbmap = {};
    var kvdbinitmutex = new base_1.mutex();
    var kvStoreBackend = async (dbname) => {
        let impl = new IndexedDbAdapter4Kvdb();
        await impl.init(dbname);
        return impl;
    };
    async function kvStore(dbname) {
        return kvdbinitmutex.exec(async () => {
            if (dbname == undefined) {
                dbname = exports.config.defaultStorePrefix + '/kv-1';
            }
            if (exports.config.kvStorePrefix == null) {
                let impl = await kvStoreBackend(exports.config.defaultStorePrefix + '/kv-1');
                let cfg = await impl.getItem(exports.__name__ + '/config');
                if (cfg == undefined || cfg.kvStorePrefix == undefined) {
                    exports.config.kvStorePrefix = {};
                }
                else {
                    exports.config.kvStorePrefix = cfg.kvStorePrefix;
                }
            }
            let prefix = exports.config.kvStorePrefix[getWWWRoot()];
            if (prefix != undefined) {
                dbname = prefix + dbname;
            }
            if (!(dbname in kvdbmap)) {
                let impl = await kvStoreBackend(dbname);
                kvdbmap[dbname] = new CKeyValueDb(dbname, impl);
            }
            return kvdbmap[dbname];
        });
    }
    function setKvStoreBackend(backend) {
        kvStoreBackend = backend;
    }
    //By default, kvStore pass 'dbname' parameter directly to kvStoreBackend.
    //But sometime, User may want a isolated kvStore namespace.
    //This function bind a kvStore 'prefix' to wwwroot persistently.
    //When this module is loaded with matched wwwroot, the correspond prefix will be added to 'dbname' before passing to kvStoreBackend.
    //Default value:wwwroot=getWWWRoot();prefix=wwwroot+'/';
    async function useKvStorePrefix(wwwroot, prefix) {
        await kvdbinitmutex.lock();
        try {
            wwwroot = wwwroot ?? getWWWRoot();
            prefix = prefix ?? (wwwroot + '/');
            let impl = await kvStoreBackend(exports.config.defaultStorePrefix + '/kv-1');
            let cfg = await impl.getItem(exports.__name__ + '/config');
            if (cfg == undefined)
                cfg = {};
            if (cfg.kvStorePrefix == undefined)
                cfg.kvStorePrefix = {};
            cfg.kvStorePrefix[wwwroot] = prefix;
            await impl.setItem(exports.__name__ + '/config', cfg);
        }
        finally {
            await kvdbinitmutex.unlock();
        }
    }
    var cachedPersistentConfig = {};
    async function GetPersistentConfig(modname) {
        if (cachedPersistentConfig[modname] == undefined) {
            cachedPersistentConfig[modname] = {};
        }
        let kvs = await kvStore();
        let cfg = await kvs.getItem(modname + '/config');
        let ccfg = cachedPersistentConfig[modname];
        for (let t1 in ccfg) {
            delete ccfg[t1];
        }
        ;
        Object.assign(ccfg, cfg);
        return ccfg;
    }
    async function SavePersistentConfig(modname) {
        if (cachedPersistentConfig[modname] != undefined) {
            let kvs = await kvStore();
            return await kvs.setItem(modname + '/config', cachedPersistentConfig[modname]);
        }
    }
    //WorkerThread feature require a custom AMD loader https://github.com/partic2/partic2-iamdee
    exports.WorkerThreadMessageMark = '__messageMark_WorkerThread';
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
    class FunctionCallOverMessagePort {
        constructor(port) {
            this.port = port;
            this.callRequest = {};
            this.onMessage = (msg) => {
                if (typeof msg.data === 'object') {
                    if (msg.data[exports.WorkerThreadMessageMark] === 'return') {
                        let { id, res, err } = msg.data;
                        if (this.callRequest[id] != undefined) {
                            if (err != undefined) {
                                this.callRequest[id].setException(err);
                            }
                            else {
                                this.callRequest[id].setResult(res);
                            }
                            delete this.callRequest[id];
                        }
                    }
                    else if (msg.data[exports.WorkerThreadMessageMark] === 'call') {
                        let { id, module, func, args } = msg.data;
                        new Promise((resolve_1, reject_1) => { require([module], resolve_1, reject_1); }).then((mod) => mod[func](...args, this)).then((res) => { (msg.source ?? this.port).postMessage({ [exports.WorkerThreadMessageMark]: 'return', id, res }); }, (err) => { (msg.source ?? this.port).postMessage({ [exports.WorkerThreadMessageMark]: 'return', id, err }); });
                    }
                }
            };
            this.port.addEventListener('message', this.onMessage);
        }
        ;
        async call(module, func, args) {
            let id = (0, base_1.GenerateRandomString)();
            let fut = new base_1.future();
            this.callRequest[id] = fut;
            this.port.postMessage({ [exports.WorkerThreadMessageMark]: 'call', id, module, func, args });
            return fut.get();
        }
    }
    exports.FunctionCallOverMessagePort = FunctionCallOverMessagePort;
    class WebWorkerThread {
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
        async _createWorker() {
            return new Worker(workerEntryUrl);
        }
        async start() {
            this.port = await this._createWorker();
            let cb = (msg) => {
                if (typeof msg.data === 'object') {
                    if (msg.data[exports.WorkerThreadMessageMark] === 'ready') {
                        this.waitReady.setResult(0);
                    }
                    else if (msg.data[exports.WorkerThreadMessageMark] === 'closing') {
                        this.onExit.forEach(cb => cb());
                    }
                }
            };
            this.port.addEventListener('message', cb);
            await this.waitReady.get();
            this.funcCall = new FunctionCallOverMessagePort(this.port);
            await this.call('partic2/jsutils1/workerentry', 'setWorkerInfo', [this.workerId]);
            exports.lifecycle.addEventListener('exit', this._forwardLifecycle);
            this.onExit.add(() => exports.lifecycle.removeEventListener('exit', this._forwardLifecycle));
        }
        async call(module, funcName, args) {
            return await this.funcCall.call(module, funcName, args);
        }
        requestExit() {
            this.call('partic2/jsutils1/workerentry', 'requestExit', []);
        }
    }
    exports.WebWorkerThread = WebWorkerThread;
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
            init = init ?? {};
            for (let hook of this.reqHooks) {
                await hook({ url, init });
            }
            if (base_1.Task.currentTask != undefined && init?.signal == undefined) {
                init.signal = base_1.Task.currentTask.getAbortSignal();
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
    function setDefaultHttpClient(client) {
        exports.defaultHttpClient = client;
    }
    function GetJsEntry() {
        return __pxseedInit._entry;
    }
    //Mainly for http url process, So don't modify 'sep' on windows.
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
            return this.join(PathLike, '..');
        }
    };
    function BuildUrlFromJsEntryModule(entryModule, urlarg) {
        return window.location.pathname + '?__jsentry=' + encodeURIComponent(entryModule) + (urlarg ? '&' + urlarg : '');
    }
    function getWWWRoot() {
        return base_1.requirejs.getConfig().baseUrl;
    }
    let getResourceManagerImpl = (modNameOrLocalRequire) => {
        if (typeof modNameOrLocalRequire === 'function') {
            modNameOrLocalRequire = base_1.requirejs.getLocalRequireModule(modNameOrLocalRequire);
        }
        return {
            getUrl(path2) {
                let r = '';
                if (path2.substring(0, 1) === '/') {
                    r = exports.path.join(getWWWRoot(), path2.substring(1));
                }
                else {
                    r = exports.path.join(getWWWRoot(), modNameOrLocalRequire, '..', path2);
                }
                if (r.startsWith('http')) {
                    let urlArgs = base_1.requirejs.getConfig().urlArgs ?? '';
                    if (urlArgs !== '') {
                        r = r + '?' + urlArgs;
                    }
                }
                return r;
            },
            async read(path2) {
                let resp = await exports.defaultHttpClient.fetch(this.getUrl(path2));
                (0, base_1.assert)(resp.ok, 'fetch failed with error HTTP error:' + resp.status + ' ' + resp.statusText);
                (0, base_1.assert)(resp.body != null);
                return resp.body;
            }
        };
    };
    function setResourceManagerImpl(impl) {
        getResourceManagerImpl = impl;
    }
    function getResourceManager(modNameOrLocalRequire) {
        return getResourceManagerImpl(modNameOrLocalRequire);
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
    let iconLinkTag = null;
    function usePageIcon(iconUrl, iconType) {
        if (iconLinkTag != null) {
            document.head.removeChild(iconLinkTag);
        }
        iconType = iconType ?? 'image/x-icon';
        iconLinkTag = document.createElement('link');
        iconLinkTag.rel = 'icon';
        iconLinkTag.type = iconType;
        iconLinkTag.href = iconUrl;
        document.head.appendChild(iconLinkTag);
    }
    class _LifecycleEventHandler extends EventTarget {
        addEventListener(type, callback, options) {
            super.addEventListener(type, callback, options);
        }
    }
    exports.lifecycle = new _LifecycleEventHandler();
    if (globalThis.document != undefined) {
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
    class GlobalInputStateTracer {
        constructor() {
            this.pressingKey = new Set();
            this.mouseState = { x: 0, y: 0, left: false, right: false, center: false };
            this.touchsPosition = new Array();
            this.onStateChange = new Set();
            this.keyDownHandler = (ev) => {
                this.pressingKey.add(ev.key);
                this.onStateChange.forEach((cb) => cb());
            };
            this.keyUpHandler = (ev) => {
                this.pressingKey.delete(ev.key);
                this.onStateChange.forEach((cb) => cb());
            };
            this.mouseHandler = (ev) => {
                this.mouseState.x = ev.clientX;
                this.mouseState.y = ev.clientY;
                this.mouseState.left = (ev.buttons & 1) != 0;
                this.mouseState.right = (ev.buttons & 2) != 0;
                this.mouseState.center = (ev.buttons & 3) != 0;
                this.onStateChange.forEach((cb) => cb());
                ;
            };
            this.touchHandler = (ev) => {
                ev.touches.item(0);
                this.touchsPosition.splice(0, this.touchsPosition.length);
                for (let t1 = 0; t1 < ev.touches.length; t1++) {
                    let t2 = ev.touches.item(t1);
                    this.touchsPosition.push({ x: t2.clientX, y: t2.clientY, id: t2.identifier });
                }
                this.onStateChange.forEach((cb) => cb());
            };
            this.enabled = false;
        }
        enable() {
            if (!this.enabled && globalThis.window != undefined) {
                let { window } = globalThis;
                this.enabled = true;
                window.addEventListener('keydown', this.keyDownHandler);
                window.addEventListener('keyup', this.keyUpHandler);
                window.addEventListener('mousemove', this.mouseHandler);
                window.addEventListener('mouseup', this.mouseHandler);
                window.addEventListener('mousedown', this.mouseHandler);
                window.addEventListener('touchstart', this.touchHandler);
                window.addEventListener('touchmove', this.touchHandler);
                window.addEventListener('touchend', this.touchHandler);
                window.addEventListener('touchcancel', this.touchHandler);
            }
        }
    }
    exports.GlobalInputStateTracer = GlobalInputStateTracer;
    exports.globalInputState = new GlobalInputStateTracer();
});
