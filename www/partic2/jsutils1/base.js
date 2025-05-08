define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AssertError = exports.logger = exports.Ref2 = exports.ErrorChain = exports.requirejs = exports.amdContext = exports.mutex = exports.ArrayWrap2 = exports.CanceledError = exports.future = exports.Task = void 0;
    exports.throwIfAbortError = throwIfAbortError;
    exports.copy = copy;
    exports.clone = clone;
    exports.FormatDate = FormatDate;
    exports.ParseDate = ParseDate;
    exports.GetBlobArrayBufferContent = GetBlobArrayBufferContent;
    exports.sleep = sleep;
    exports.GenerateRandomString = GenerateRandomString;
    exports.FlattenArray = FlattenArray;
    exports.FlattenArraySync = FlattenArraySync;
    exports.DateAdd = DateAdd;
    exports.DateDiff = DateDiff;
    exports.GetCurrentTime = GetCurrentTime;
    exports.assert = assert;
    exports.ArrayBufferToBase64 = ArrayBufferToBase64;
    exports.Base64ToArrayBuffer = Base64ToArrayBuffer;
    exports.BytesToHex = BytesToHex;
    exports.BytesFromHex = BytesFromHex;
    exports.ArrayBufferConcat = ArrayBufferConcat;
    exports.WaitUntil = WaitUntil;
    exports.partial = partial;
    exports.ToDataUrl = ToDataUrl;
    //polyfill globalThis
    try {
        let _ = globalThis;
    }
    catch (e) {
        new Function('this.globalThis=this')();
    }
    //AbortController polyfill on https://github.com/mo/abortcontroller-polyfill
    (function () {
        class AbortSignal extends EventTarget {
            constructor() {
                super();
                this.aborted = false;
            }
            toString() {
                return '[object AbortSignal]';
            }
            dispatchEvent(event) {
                if (event.type === 'abort') {
                    this.aborted = true;
                    if (typeof this.onabort === 'function') {
                        this.onabort.call(this, event);
                    }
                }
                return super.dispatchEvent(event);
            }
            throwIfAborted() {
                const { aborted, reason = 'Aborted' } = this;
                if (!aborted)
                    return;
                throw reason;
            }
            static timeout(time) {
                const controller = new AbortController();
                setTimeout(() => controller.abort(new DOMException(`This signal is timeout in ${time}ms`, 'TimeoutError')), time);
                return controller.signal;
            }
        }
        class AbortController {
            constructor() {
                this.signal = new AbortSignal();
            }
            abort(reason) {
                let signalReason = reason;
                if (reason == undefined) {
                    signalReason = new Error('This operation was aborted');
                    signalReason.name = 'AbortError';
                }
                const event = new Event('abort');
                event.reason = reason;
                this.signal.reason = signalReason;
                this.signal.dispatchEvent(event);
            }
            toString() {
                return '[object AbortController]';
            }
        }
        if (globalThis.AbortSignal == undefined || globalThis.AbortSignal.prototype.throwIfAborted == undefined) {
            globalThis.AbortController = AbortController;
            globalThis.AbortSignal = AbortSignal;
        }
    })();
    class Task {
        static locals() {
            return Task.currentTask?.locals();
        }
        static getAbortSignal() {
            return Task.currentTask?.getAbortSignal();
        }
        static fork(taskMain) {
            if (Task.currentTask != undefined) {
                return Task.currentTask.fork(taskMain);
            }
            else {
                return new Task(taskMain);
            }
        }
        /*
            Convert Promise to Generator. To use Promise in Task and make correct return type with typescript.
            eg: let number_1=yield* Task.yieldWrap(new Promise((resolve)=>resolve(1)));
        */
        static *yieldWrap(p) {
            return (yield p);
        }
        constructor(taskMain, name) {
            this.name = name;
            this.__locals = {};
            this.__abortController = new AbortController();
            this.__childrenTask = new Array();
            this.__iter = (typeof taskMain === 'function') ? taskMain() : taskMain;
            let resolver = [undefined, undefined, undefined];
            resolver[0] = new Promise((resolve, reject) => {
                resolver[1] = resolve;
                resolver[2] = reject;
            });
            this.__resolver = resolver;
            this.__abortController.signal.addEventListener('abort', (ev) => {
                this.onAbort();
            });
        }
        __step(tNext, error) {
            let savedTask = Task.currentTask;
            Task.currentTask = this;
            try {
                if (this.__abortController.signal.aborted) {
                    this.__iter.throw(this.__abortController.signal.reason);
                }
                if (error != undefined) {
                    this.__iter.throw(error);
                }
                let yieldResult = this.__iter.next(tNext);
                if (!yieldResult.done) {
                    yieldResult.value.then(r => this.__step(r, undefined), reason => this.__step(undefined, reason));
                }
                else {
                    Task.currentTask = null;
                    this.__resolver[1](yieldResult.value);
                }
            }
            catch (e) {
                this.__resolver[2](e);
            }
            finally {
                Task.currentTask = savedTask;
            }
        }
        run() {
            this.__step(undefined, undefined);
            return this;
        }
        abort(reason) {
            this.__abortController.abort(reason);
        }
        getAbortSignal() {
            return this.__abortController.signal;
        }
        locals() {
            return this.__locals;
        }
        //Fork a child task. 
        //The default behaviour: set the parent locals as prototype of child locals, propagate abort signal to children.
        fork(taskMain) {
            let childTask = new Task(taskMain);
            Object.setPrototypeOf(childTask.__locals, this.locals());
            this.__childrenTask.push(childTask);
            const cleanTask = () => this.__childrenTask.splice(this.__childrenTask.indexOf(childTask));
            childTask.then(cleanTask, cleanTask);
            return childTask;
        }
        onAbort() {
            for (let t1 of [...this.__childrenTask]) {
                t1.abort(this.__abortController.signal.reason);
            }
        }
        then(onfulfilled, onrejected) {
            return this.__resolver[0].then(onfulfilled, onrejected);
        }
    }
    exports.Task = Task;
    Task.currentTask = null;
    function throwIfAbortError(e) {
        if (e.name === 'AbortError') {
            throw e;
        }
    }
    function copy(src, dst, depth) {
        if (depth == 0) {
            return;
        }
        Object.getOwnPropertyNames(src).forEach(function (key, i) {
            let srcObj = src;
            let v = srcObj[key];
            if (v instanceof Function) {
                dst[key] = srcObj[key];
            }
            else if (depth > 1 && (v instanceof Array)) {
                dst[key] = new Array();
                copy(srcObj[key], dst[key], depth - 1);
            }
            else if (depth > 1 && v instanceof Object) {
                dst[key] = new Object();
                copy(srcObj[key], dst[key], depth - 1);
            }
            else {
                dst[key] = srcObj[key];
            }
        });
        Object.setPrototypeOf(dst, Object.getPrototypeOf(src));
    }
    function clone(src, depth) {
        let dst = new Object();
        copy(src, dst, depth);
        return dst;
    }
    function FormatDate(date, layout) {
        let outstr = layout;
        let o = {
            "MM": date.getMonth() + 1,
            "dd": date.getDate(),
            "HH": date.getHours(),
            "hh": date.getHours() % 12,
            "mm": date.getMinutes(),
            "ss": date.getSeconds(),
            "SSS": date.getMilliseconds()
        };
        outstr = outstr.replace(/yyyy/, date.getFullYear().toString().padStart(4, '0'));
        for (var k in o) {
            outstr = outstr.replace(new RegExp(k), o[k].toString().padStart(2, '0'));
        }
        return outstr;
    }
    ;
    function ParseDate(dateStr, layout) {
        let pos = layout.indexOf('yyyy');
        let year = pos >= 0 ? Number.parseInt(dateStr.substring(pos, pos + 4)) : 0;
        pos = layout.indexOf('MM');
        let month = pos >= 0 ? Number.parseInt(dateStr.substring(pos, pos + 2)) - 1 : 0;
        pos = layout.indexOf('dd');
        let date = pos >= 0 ? Number.parseInt(dateStr.substring(pos, pos + 2)) : 0;
        pos = layout.indexOf('HH');
        let hour = Number.parseInt(dateStr.substring(pos, pos + 2));
        pos = layout.indexOf('mm');
        let minute = pos >= 0 ? Number.parseInt(dateStr.substring(pos, pos + 2)) : 0;
        pos = layout.indexOf('ss');
        let second = pos >= 0 ? Number.parseInt(dateStr.substring(pos, pos + 2)) : 0;
        pos = layout.indexOf('SSS');
        let millisecond = pos >= 0 ? Number.parseInt(dateStr.substring(pos, pos + 3)) : 0;
        return new Date(year, month, date, hour, minute, second, millisecond);
    }
    function GetBlobArrayBufferContent(blob) {
        return new Promise(function (resolve, reject) {
            let reader = new FileReader();
            reader.onload = function (ev) {
                resolve(reader.result);
            };
            reader.onerror = function (ev) {
                reject(ev);
            };
            reader.readAsArrayBuffer(blob);
        });
    }
    function sleep(milliSeconds, arg) {
        return new Promise(function (resolve, reject) {
            setTimeout(resolve, milliSeconds, arg);
        });
    }
    class future {
        constructor() {
            this.done = false;
            this.resultPromise = new Promise((resolve, reject) => {
                this.resolveCallback = resolve;
                this.rejectCallback = reject;
            });
        }
        get() {
            return this.resultPromise;
        }
        setResult(result) {
            if (!this.done) {
                this.done = true;
                this.result = result;
                this.resolveCallback(result);
            }
        }
        setException(exception) {
            if (!this.done) {
                this.done = true;
                this.exception = exception;
                this.rejectCallback(exception);
            }
        }
    }
    exports.future = future;
    class CanceledError extends Error {
        constructor() {
            super('canceled.');
            this.name = 'Canceled';
        }
    }
    exports.CanceledError = CanceledError;
    class ArrayWrap2 {
        constructor(wrapped, initPush) {
            this.wrapped = [];
            this.onQueueChange = [];
            if (wrapped != undefined) {
                this.wrapped = wrapped;
            }
            if (initPush != undefined) {
                this.pushIterable(initPush);
            }
        }
        arr() {
            return this.wrapped;
        }
        pushIterable(iter) {
            for (let t1 of iter) {
                this.wrapped.push(t1);
            }
            return this;
        }
        removeFirst(predict) {
            let idx = this.wrapped.findIndex(predict);
            if (idx >= 0) {
                return this.wrapped.splice(idx, 1)[0];
            }
        }
        insertAfter(predict, newElem) {
            let arr = this.arr();
            arr.splice(arr.findIndex(predict), 1, newElem);
            this.wrapped = arr;
        }
        last() {
            return this.arr()[this.arr().length - 1];
        }
        clone() {
            return new ArrayWrap2([...this.arr()]);
        }
        emitQueueChange() {
            let e = clone(this.onQueueChange, 1);
            this.onQueueChange.splice(0, this.onQueueChange.length);
            for (let t1 of e) {
                t1.setResult(0);
            }
        }
        cancelWaiting() {
            this.onQueueChange.forEach(t1 => t1.setException(new CanceledError()));
        }
        async waitForQueueChange() {
            let waitForChange = new future();
            this.onQueueChange.push(waitForChange);
            await waitForChange.get();
        }
        async queueBlockShift() {
            while (this.arr().length === 0) {
                await this.waitForQueueChange();
            }
            let r = this.arr().shift();
            this.emitQueueChange();
            return r;
        }
        async queueBlockPush(elem) {
            while (this.queueSizeLimit != undefined && this.arr().length >= this.queueSizeLimit) {
                await this.waitForQueueChange();
            }
            this.queueSignalPush(elem);
        }
        queueSignalPush(elem) {
            this.arr().push(elem);
            this.emitQueueChange();
        }
        processWrapped(processor) {
            let result = processor(this.arr());
            if (result != undefined) {
                this.wrapped = result;
            }
            return this;
        }
        [Symbol.iterator]() {
            return this.arr()[Symbol.iterator];
        }
        static *IntSequence(start, end, step) {
            assert(step !== 0);
            step = step ?? (end >= start ? 1 : -1);
            for (let t1 = start; (step > 0) ? (t1 < end) : (t1 > end); t1 += step) {
                yield t1;
            }
        }
    }
    exports.ArrayWrap2 = ArrayWrap2;
    class mutex {
        constructor() {
            this.locked = false;
            this.unlockCb = [];
        }
        async lock() {
            var that = this;
            if (this.locked) {
                return new Promise(function (resolve, reject) {
                    that.unlockCb.push(resolve);
                });
            }
            else {
                this.locked = true;
                return;
            }
        }
        async unlock() {
            if (this.unlockCb.length > 0) {
                this.unlockCb.shift()();
            }
            else {
                this.locked = false;
            }
        }
        async tryLock() {
            if (!this.locked) {
                this.locked = true;
                return true;
            }
            else {
                return false;
            }
        }
    }
    exports.mutex = mutex;
    exports.amdContext = {
        require: null,
        define: null,
        requirejs: null
    };
    try {
        exports.amdContext.require = require;
        exports.amdContext.define = define;
        exports.amdContext.requirejs = globalThis.requirejs;
    }
    catch (e) { /*Not AMD Environment*/ }
    class ResourceProviderLoader {
        constructor() {
            this.currentDefining = null;
        }
        async loadModuleAsync(moduleId, url) {
            url = (url.match(/[^\?]*/) ?? [''])[0];
            if (exports.requirejs.resourceProvider == null) {
                return new Error('ResourceProviderLoader:Module not found');
            }
            for (let t1 of exports.requirejs.resourceProvider) {
                let res = await t1(moduleId, url);
                if (res == null) {
                    continue;
                }
                if (typeof res === 'string') {
                    res = new Function(res);
                }
                try {
                    this.currentDefining = moduleId;
                    res();
                }
                finally {
                    this.currentDefining = null;
                }
                return null;
            }
            return new Error('ResourceProviderLoader:Module not found');
        }
        loadModule(moduleId, url, done) {
            this.loadModuleAsync(moduleId, url).then((e) => done(e)).catch(err => done(err));
        }
        getDefiningModule() {
            return this.currentDefining;
        }
    }
    exports.requirejs = {
        define: function (name, dependency, mod) {
            exports.amdContext.define(name, dependency, mod);
        },
        require: function (dependency, callback, errback) {
            exports.amdContext.require(dependency, callback, errback);
        },
        promiseRequire: function (implModName) {
            let that = this;
            return new Promise(function (resolve, reject) {
                that.require([implModName], function (mod0) {
                    resolve(mod0);
                }, (err) => {
                    reject(err);
                });
            });
        },
        getConfig: function () {
            return exports.amdContext.require.getConfig();
        },
        getDefined: async function () {
            return exports.amdContext.require.getDefined();
        },
        getFailed: async function () {
            //partic2-iamdee feature
            return exports.amdContext.requirejs.getFailed();
        },
        undef: async function (mod) {
            exports.amdContext.requirejs.undef(mod);
        },
        resourceProvider: null,
        addResourceProvider(provider) {
            //partic2-iamdee feature
            if (this.resourceProvider === null) {
                this.resourceProvider = [];
                exports.amdContext.define.amd.scriptLoaders.unshift(new ResourceProviderLoader());
            }
            this.resourceProvider.unshift(provider);
        },
        getLocalRequireModule(localRequire) {
            //partic2-iamdee feature
            return localRequire.localRequireModule;
        },
        definingHook: null,
        async addDefiningHook(hook) {
            //partic2-iamdee feature
            if (this.definingHook === null) {
                this.definingHook = [];
                let { onDefining } = await this.getConfig();
                if (onDefining != undefined) {
                    this.definingHook.push(onDefining);
                }
                exports.amdContext.requirejs.config({
                    onDefining: (defineParameter) => {
                        if (this.definingHook != null) {
                            for (let t1 of this.definingHook) {
                                t1(defineParameter);
                            }
                        }
                    }
                });
            }
            this.definingHook.push(hook);
        }
    };
    function GenerateRandomString(maxRandLenX4) {
        let s = 'rnd1';
        if (maxRandLenX4 == undefined)
            maxRandLenX4 = 4;
        for (let i1 = 0; i1 < maxRandLenX4; i1++) {
            let part = Math.floor(Math.random() * 1679616).toString(36);
            for (; part.length < 4; part = '0' + part)
                ;
            s += part;
        }
        return s;
    }
    class ErrorChain extends Error {
        constructor(message) {
            super(message);
        }
    }
    exports.ErrorChain = ErrorChain;
    async function FlattenArray(source) {
        let parts = [];
        for (let t1 of source) {
            if (t1 instanceof Promise) {
                parts.push(await t1);
            }
            else if (t1 == null) {
            }
            else if (typeof (t1) === 'object' && (Symbol.iterator in t1)) {
                parts.push(...await FlattenArray(t1));
            }
            else {
                parts.push(t1);
            }
        }
        return parts;
    }
    //Promise will be ignored
    function FlattenArraySync(source) {
        let parts = [];
        for (let t1 of source) {
            if (t1 instanceof Promise) {
            }
            else if (t1 == null) {
            }
            else if (typeof (t1) === 'object' && (Symbol.iterator in t1)) {
                parts.push(...FlattenArraySync(t1));
            }
            else {
                parts.push(t1);
            }
        }
        return parts;
    }
    function DateAdd(org, add, field) {
        if (typeof add === 'number') {
            assert(field != undefined);
            switch (field) {
                case 'date':
                    return DateAdd(org, { days: add });
                case 'month':
                case 'year':
                case 'hour':
                case 'minute':
                case 'second':
                case 'millisecond':
                    return DateAdd(org, { [field + 's']: add });
            }
        }
        else {
            var d = new Date(org);
            if (add.days != undefined) {
                d.setDate(d.getDate() + add.days);
            }
            if (add.months != undefined) {
                d.setMonth(d.getMonth() + add.months);
            }
            if (add.years != undefined) {
                d.setFullYear(d.getFullYear() + add.years);
            }
            if (add.hours != undefined) {
                d.setHours(d.getHours() + add.hours);
            }
            if (add.minutes != undefined) {
                d.setMinutes(d.getMinutes() + add.minutes);
            }
            if (add.seconds != undefined) {
                d.setSeconds(d.getSeconds() + add.seconds);
            }
            if (add.milliseconds) {
                d.setMilliseconds(d.getMilliseconds() + add.milliseconds);
            }
            return d;
        }
    }
    function DateDiff(date1, date2, unit) {
        let diffMs = date1.getTime() - date2.getTime();
        switch (unit) {
            case 'date':
                return diffMs / (1000 * 60 * 60 * 24);
            case 'hour':
                return diffMs / (1000 * 60 * 60);
            case 'minute':
                return diffMs / (1000 * 60);
            case 'second':
                return diffMs / 1000;
        }
    }
    function GetCurrentTime() {
        return new Date();
    }
    class Ref2 {
        constructor(__val) {
            this.__val = __val;
            this.watcher = new Set();
        }
        set(val) {
            let oldVal = this.__val;
            this.__val = val;
            this.watcher.forEach(v => v(this, oldVal));
        }
        get() {
            return this.__val;
        }
        watch(onUpdated) {
            this.watcher.add(onUpdated);
        }
        unwatch(onUpdated) {
            this.watcher.delete(onUpdated);
        }
    }
    exports.Ref2 = Ref2;
    exports.logger = {
        debug: function (...msg) { console.debug(...msg); },
        info: function (...msg) { console.info(...msg); },
        warning: function (...msg) { console.warn(...msg); },
        error: function (...msg) { console.error(...msg); },
        setHandler: function (level, handler) {
            this[level] = handler;
        },
        getLogger: function (label) {
            let that = this;
            return {
                debug: (...msg) => { that.debug(label + ':', ...msg); },
                info: (...msg) => { that.info(label + ':', ...msg); },
                warning: (...msg) => { that.warning(label + ':', ...msg); },
                error: (...msg) => { that.error(label + ':', ...msg); },
            };
        }
    };
    class AssertError extends Error {
        init(msg) {
            this.message = msg;
            return this;
        }
        toString() {
            return this.message;
        }
    }
    exports.AssertError = AssertError;
    function assert(cond, msg) {
        if (!cond)
            throw new AssertError().init(msg ?? 'assert failed');
    }
    // https://github.com/niklasvh/base64-arraybuffer/blob/master/src/index.ts
    const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    // Use a lookup table to find the index.
    const b64lookup = typeof Uint8Array === 'undefined' ? [] : new Uint8Array(256);
    for (let i = 0; i < b64chars.length; i++) {
        b64lookup[b64chars.charCodeAt(i)] = i;
    }
    function ArrayBufferToBase64(buffer) {
        let bytes;
        if (buffer instanceof ArrayBuffer) {
            bytes = new Uint8Array(buffer);
        }
        else {
            bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        }
        let i, len = bytes.length, base64 = '';
        for (i = 0; i < len; i += 3) {
            base64 += b64chars[bytes[i] >> 2] +
                b64chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)] +
                b64chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)] +
                b64chars[bytes[i + 2] & 63];
        }
        if (len % 3 === 2) {
            base64 = base64.substring(0, base64.length - 1) + '=';
        }
        else if (len % 3 === 1) {
            base64 = base64.substring(0, base64.length - 2) + '==';
        }
        return base64;
    }
    ;
    function Base64ToArrayBuffer(base64) {
        for (let i = 0; i < b64chars.length; i++) {
            b64lookup[b64chars.charCodeAt(i)] = i;
        }
        let bufferLength = base64.length * 0.75, len = base64.length, i, p = 0, encoded1, encoded2, encoded3, encoded4;
        if (base64[base64.length - 1] === '=') {
            bufferLength--;
            if (base64[base64.length - 2] === '=') {
                bufferLength--;
            }
        }
        const arraybuffer = new ArrayBuffer(bufferLength), bytes = new Uint8Array(arraybuffer);
        for (i = 0; i < len; i += 4) {
            encoded1 = b64lookup[base64.charCodeAt(i)];
            encoded2 = b64lookup[base64.charCodeAt(i + 1)];
            encoded3 = b64lookup[base64.charCodeAt(i + 2)];
            encoded4 = b64lookup[base64.charCodeAt(i + 3)];
            bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
            bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
            bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
        }
        return arraybuffer;
    }
    ;
    function BytesToHex(b) {
        let hex = '';
        for (let t1 of b) {
            let ch = t1.toString(16);
            hex += ch.length == 2 ? ch : '0' + ch;
        }
        return hex;
    }
    function BytesFromHex(hex) {
        hex = hex.replace(/[^0-9a-fA-F]/g, '');
        let bytes = new Uint8Array(hex.length >> 1);
        for (let t1 = 0; t1 < hex.length; t1 += 2) {
            bytes[t1 >> 1] = parseInt(hex.substring(t1, t1 + 2), 16);
        }
        return bytes;
    }
    function ArrayBufferConcat(bufs) {
        let len = bufs.reduce((prev, curr) => prev + curr.byteLength, 0);
        let r = new Uint8Array(len);
        bufs.reduce((offset, curr) => {
            r.set(new Uint8Array(curr.buffer, curr.byteOffset, curr.byteLength), offset);
            return offset + curr.byteLength;
        }, 0);
        return r.buffer;
    }
    async function WaitUntil(cond, intervalMs, timeoutMs) {
        if (intervalMs == undefined) {
            intervalMs = 200;
        }
        ;
        for (let i1 = Math.ceil((timeoutMs ?? 30000) / intervalMs); i1 >= 0; i1--) {
            if (cond())
                return;
            await sleep(intervalMs, null);
        }
        throw new Error('WaitUntil timeout');
    }
    function partial(o, fields) {
        let r = {};
        for (let f of fields) {
            r[f] = o[f];
        }
        return r;
    }
    function ToDataUrl(data, mediaType) {
        if (typeof data === 'string') {
            return 'data:' + mediaType + ';base64,' + btoa(data);
        }
        else {
            return 'data:' + mediaType + ';base64,' + ArrayBufferToBase64(data);
        }
    }
});
//# sourceMappingURL=base.js.map