define("partic2/CodeRunner/jsutils2", ["require", "exports", "partic2/jsutils1/base"], function (require, exports, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.EventBuffer = exports.OnConsoleData = exports.CFunctionHook = exports.ArrayWrap3 = exports.ThrottleCall = exports.DebounceCall = exports.Singleton = exports.ExtendStreamReader = exports.TaskLocalRef = void 0;
    exports.utf8conv = utf8conv;
    exports.u8hexconv = u8hexconv;
    exports.FlattenArray = FlattenArray;
    exports.FlattenArraySync = FlattenArraySync;
    exports.deepEqual = deepEqual;
    exports.setupAsyncHook = setupAsyncHook;
    exports.ensureFunctionHookSetup = ensureFunctionHookSetup;
    exports.newEventBuffer = newEventBuffer;
    Object.defineProperty(exports, "TaskLocalRef", { enumerable: true, get: function () { return base_1.TaskLocalRef; } });
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    let utf8decoder = new TextDecoder();
    let utf8encoder = new TextEncoder();
    function utf8conv(input) {
        if (typeof input === 'string') {
            return utf8encoder.encode(input);
        }
        else {
            return utf8decoder.decode(input);
        }
    }
    function u8hexconv(input) {
        if (typeof input === 'string') {
            let hex = input;
            hex = hex.replace(/[^0-9a-fA-F]/g, '');
            let bytes = new Uint8Array(hex.length >> 1);
            for (let t1 = 0; t1 < hex.length; t1 += 2) {
                bytes[t1 >> 1] = parseInt(hex.substring(t1, t1 + 2), 16);
            }
            return bytes;
        }
        else {
            let b = input;
            let hex = '';
            for (let t1 of b) {
                let ch = t1.toString(16);
                hex += ch.length == 2 ? ch : '0' + ch;
            }
            return hex;
        }
    }
    class ExtendStreamReader {
        constructor(wrapped) {
            this.wrapped = wrapped;
            this.readBuffers = new base_1.ArrayWrap2();
            this.closed = this.wrapped.closed;
        }
        async read() {
            this.onReadRequest();
            let next = await this.readBuffers.queueBlockShift();
            if (next != null) {
                return { done: false, value: next };
            }
            else {
                return { done: true, value: next };
            }
        }
        async onReadRequest() {
            //XXX:retry on next tick?
            if (this.readBuffers.arr().length == 0) {
                let next = await this.wrapped.read();
                if (next.done && next.value == undefined) {
                    this.readBuffers.queueSignalPush(null);
                }
                else {
                    this.readBuffers.queueSignalPush(next.value);
                }
            }
        }
        //push buffer back, like 'ungetc'.
        unshiftBuffer(data) {
            if (this.readBuffers.arr().length === 0) {
                this.readBuffers.queueSignalPush(data);
            }
            else {
                this.readBuffers.arr().unshift(data);
            }
        }
        cancelWaiting() {
            this.readBuffers.cancelWaiting();
        }
        releaseLock() {
            this.wrapped.releaseLock();
        }
        cancel(reason) {
            return this.wrapped.cancel(reason);
        }
        async readUntil(mark) {
            if (typeof mark === 'number') {
                mark = new Uint8Array([mark]);
            }
            let concated = null;
            let t1 = 0;
            for (let readTryCount = 0; readTryCount < 0x10000000; readTryCount++) {
                let chunk = await this.read();
                if (!chunk.done) {
                    if (concated == null) {
                        concated = chunk.value;
                    }
                    else {
                        //slow but simple
                        concated = new Uint8Array((0, base_1.ArrayBufferConcat)([concated, chunk.value]));
                    }
                    let markMatched = false;
                    let t2 = 0;
                    let t3 = concated.length - mark.length;
                    for (t2 = t1; t2 <= t3; t2++) {
                        t2 = concated.indexOf(mark[0], t2);
                        if (t2 < 0)
                            break;
                        markMatched = true;
                        for (let t4 = 1; t4 < mark.length; t4++) {
                            if (concated[t2 + t4] !== mark[t4]) {
                                markMatched = false;
                                break;
                            }
                        }
                        if (markMatched)
                            break;
                    }
                    if (markMatched) {
                        if (t2 + mark.length < concated.length) {
                            this.unshiftBuffer(new Uint8Array(concated.buffer, concated.byteOffset + t2 + mark.length, concated.length - t2 - mark.length));
                        }
                        return new Uint8Array(concated.buffer, concated.byteOffset, t2 + mark.length);
                    }
                    else {
                        t1 = t3 + 1;
                    }
                }
                else {
                    if (concated != null)
                        this.unshiftBuffer(concated);
                    throw new Error('No mark found before EOF occured');
                }
            }
            throw new Error('Too much read try');
        }
        async readInto(buffer, writePos) {
            let nextPart = await this.read();
            if (nextPart.value != undefined) {
                let writeAt = 0;
                if (writePos != undefined)
                    writeAt = writePos.get();
                let readBytes = Math.min(buffer.byteLength - writeAt, nextPart.value.byteLength);
                if (readBytes < nextPart.value.byteLength) {
                    let remain = new Uint8Array(nextPart.value.buffer, nextPart.value.byteOffset + readBytes, nextPart.value.byteLength - readBytes);
                    this.unshiftBuffer(remain);
                }
                buffer.set(new Uint8Array(nextPart.value.buffer, nextPart.value.byteOffset, readBytes), writeAt);
                if (writePos != undefined)
                    writePos.set(writeAt + readBytes);
                return readBytes;
            }
            throw new Error('stream closed');
        }
        async readForNBytes(count) {
            let b = new Uint8Array(count);
            let pos = new base_1.Ref2(0);
            for (let t1 = 0; t1 < 0x7fffff; t1++) {
                await this.readInto(b, pos);
                if (pos.get() == b.byteLength)
                    break;
            }
            return b;
        }
        async readAll() {
            let chunks = new Array();
            for (let t1 = 0; t1 < 0x7fffff; t1++) {
                let chunk = await this.read();
                if (!chunk.done) {
                    chunks.push(chunk.value);
                }
                else {
                    break;
                }
            }
            return new Uint8Array((0, base_1.ArrayBufferConcat)(chunks));
        }
    }
    exports.ExtendStreamReader = ExtendStreamReader;
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
    class Singleton extends base_1.future {
        constructor(init) {
            super();
            this.init = init;
            this.initing = false;
        }
        async get() {
            if (!this.done && !this.initing) {
                this.initing = true;
                this.init().then((result) => {
                    this.setResult(result);
                    this.initing = false;
                }, (err) => {
                    this.setException(err);
                    this.initing = false;
                });
            }
            return super.get();
        }
    }
    exports.Singleton = Singleton;
    function deepEqual(a, b) {
        if (a === b)
            return true;
        if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
            return false;
        }
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length)
            return false;
        for (const key of keysA) {
            if (!keysB.includes(key) || !deepEqual(a[key], b[key])) {
                return false;
            }
        }
        return true;
    }
    class DebounceCall {
        constructor(fn, delayMs) {
            this.fn = fn;
            this.delayMs = delayMs;
            this.callId = 1;
            this.result = new base_1.future();
            this.mut = new base_1.mutex();
            this.canceled = false;
        }
        async call(...args) {
            if (this.callId == -1) {
                //waiting fn return
                return await this.result.get();
            }
            this.callId++;
            let thisCallId = this.callId;
            await (0, base_1.sleep)(this.delayMs);
            if (this.canceled)
                return;
            if (thisCallId == this.callId) {
                try {
                    this.callId = -1;
                    let r = await this.fn(...args);
                    this.result.setResult(r);
                }
                catch (e) {
                    this.result.setException(e);
                }
                finally {
                    this.callId = 1;
                    let r2 = this.result;
                    this.result = new base_1.future();
                    return r2.get();
                }
            }
            else {
                return await this.result.get();
            }
        }
        cancel() {
            this.result.setResult(undefined);
            this.callId = 1;
            this.result = new base_1.future();
        }
    }
    exports.DebounceCall = DebounceCall;
    class ThrottleCall {
        constructor(fn, minIntervalMs) {
            this.fn = fn;
            this.minIntervalMs = minIntervalMs;
            this.lastCallTime = 0;
            this.nextCallArgs = null;
            this.result = null;
        }
        async call(...args) {
            this.nextCallArgs = args;
            if (this.result != null) {
                return await this.result.get();
            }
            this.result = new base_1.future();
            let res = this.result;
            let now = (0, base_1.GetCurrentTime)().getTime();
            if (now < this.lastCallTime + this.minIntervalMs) {
                await (0, base_1.sleep)(this.lastCallTime + this.minIntervalMs - now);
            }
            try {
                let r = await this.fn(...this.nextCallArgs);
                res.setResult(r);
            }
            catch (e) {
                res.setException(e);
            }
            finally {
                now = (0, base_1.GetCurrentTime)().getTime();
                this.lastCallTime = now;
                this.nextCallArgs = null;
                this.result = null;
            }
            return await res.get();
        }
    }
    exports.ThrottleCall = ThrottleCall;
    function setupAsyncHook() {
        if (!('__onAwait' in Promise)) {
            let asyncStackDepth = 0;
            let depth0Task = null;
            Promise.__onAsyncEnter = () => {
                if (asyncStackDepth === 0)
                    depth0Task = base_1.Task.currentTask;
                asyncStackDepth++;
            };
            Promise.__onAsyncExit = () => {
                asyncStackDepth--;
                if (asyncStackDepth === 0) {
                    base_1.Task.currentTask = depth0Task;
                }
            };
            //Only call ONCE for each 'await'
            Promise.__onAwait = async (p) => {
                base_1.Task.getAbortSignal()?.throwIfAborted();
                let task = base_1.Task.currentTask;
                asyncStackDepth--;
                if (asyncStackDepth === 0) {
                    base_1.Task.currentTask = depth0Task;
                }
                try {
                    return await p;
                }
                finally {
                    if (asyncStackDepth === 0)
                        depth0Task = base_1.Task.currentTask;
                    asyncStackDepth++;
                    base_1.Task.currentTask = task;
                }
            };
        }
    }
    class ArrayWrap3 extends base_1.ArrayWrap2 {
        async forEach2(cb) {
            let arr = this.arr();
            let input = { index: 0, break2() { this.iterating = false; }, iterating: true };
            for (let t1 = 0; t1 < arr.length && input.iterating; t1++) {
                input.index = t1;
                input.value = arr[t1];
                await cb(input);
            }
        }
        async map(cb) {
            let arr = this.arr();
            let r = new Array();
            for (let t1 = 0; t1 < arr.length; t1++) {
                r.push(await cb(arr[t1], t1, this));
            }
            return new this.constructor(r);
        }
        async forEach(cb) {
            this.forEach2(async ({ value, index }) => {
                await cb(value, index, this);
            });
        }
        async filter(cb) {
            let result = await this.findElements2(({ value, index }) => cb(value, index, this));
            return new this.constructor(result.found);
        }
        async reduce(cb, initialValue) {
            let r = initialValue;
            await this.forEach2(async ({ value, index }) => {
                r = await cb(r, value, index, this);
            });
            return r;
        }
        async findIndexs(condition) {
            let found = new Array();
            this.forEach2(async (i) => {
                let b = await condition(i, found);
                if (b && i.iterating) {
                    found.push(i.index);
                }
            });
            return found;
        }
        //indexs must be unique
        deleteByIndexs(indexs) {
            let indexs2 = [...indexs].sort();
            let arr = this.arr();
            indexs2.forEach((v, i) => { arr.splice(v - i, 1); });
        }
        insertBefore(indexs, e) {
            let indexs2 = [...indexs].sort();
            let arr = this.arr();
            indexs2.forEach((v, i) => { arr.splice(v + i, 0, e); });
        }
        insertAfter(indexs, e) {
            let indexs2 = [...indexs].sort();
            let arr = this.arr();
            indexs2.forEach((v, i) => { arr.splice(v + i + 1, 0, e); });
        }
        pickByIndexs(indexs) {
            let arr = this.arr();
            return indexs.map((v) => arr[v]);
        }
        async findElements2(condition, opt) {
            let indexs = await this.findIndexs(async (c, f) => {
                if (opt?.maxCount != undefined && f.length >= opt.maxCount) {
                    c.break2();
                    return false;
                }
                return condition(c);
            });
            return {
                indexs,
                found: this.pickByIndexs(indexs),
                delete: () => this.deleteByIndexs(indexs),
                insertBefore: (e) => this.insertBefore(indexs, e),
                insertAfter: (e) => this.insertAfter(indexs, e),
            };
        }
        async groupBy2(cb) {
            let r = {};
            this.forEach2(async (input) => {
                let id = await cb(input);
                if (input.iterating) {
                    if (r[id] == undefined) {
                        r[id] = new this.constructor([]);
                    }
                    r[id].arr().push(input.value);
                }
            });
            return r;
        }
    }
    exports.ArrayWrap3 = ArrayWrap3;
    class CFunctionHook {
        constructor(originalFunction) {
            this.originalFunction = originalFunction;
            this.hooks = new Set();
        }
        _call() {
            let that = this;
            return function (...argv) {
                let context = { hookedThis: this, hook: that, originalFunction: that.originalFunction };
                for (let t1 of that.hooks) {
                    try {
                        t1(argv, context);
                    }
                    catch (err) { }
                    ;
                }
                return context.originalFunction.apply(this, argv);
            };
        }
    }
    exports.CFunctionHook = CFunctionHook;
    let functionHookProp = Symbol('functionHookProp');
    function ensureFunctionHookSetup(o, p) {
        let func = o[p];
        let p2;
        if (functionHookProp in func) {
            p2 = func[functionHookProp];
            if (p2.hook == undefined) {
                p2.hook = new CFunctionHook(func);
                p2.hook.name = p.toString();
                o[p] = p2.hook._call();
                o[p][functionHookProp] = p2;
            }
        }
        else {
            p2 = {
                hook: new CFunctionHook(func)
            };
            p2.hook.name = p.toString();
            func[functionHookProp] = p2;
            o[p] = p2.hook._call();
            o[p][functionHookProp] = p2;
        }
        return p2.hook;
    }
    exports.OnConsoleData = new Set();
    ensureFunctionHookSetup(console, 'log').hooks.add((argv) => exports.OnConsoleData.forEach(t1 => t1('log', argv)));
    ensureFunctionHookSetup(console, 'debug').hooks.add((argv) => exports.OnConsoleData.forEach(t1 => t1('debug', argv)));
    ensureFunctionHookSetup(console, 'info').hooks.add((argv) => exports.OnConsoleData.forEach(t1 => t1('info', argv)));
    ensureFunctionHookSetup(console, 'warn').hooks.add((argv) => exports.OnConsoleData.forEach(t1 => t1('warn', argv)));
    ensureFunctionHookSetup(console, 'error').hooks.add((argv) => exports.OnConsoleData.forEach(t1 => t1('error', argv)));
    setupAsyncHook();
    class EventBuffer {
        constructor() {
            //[RpcSerializeMagicMark]={}; BUT we must use literal to avoid recursive import
            this.__DUz66NYkWuMdex9k2mvwBbYN__ = {};
            this._cachedEvent = new base_1.ArrayWrap2();
            this.eventQueueExpiredTime = 1000;
            this._lastSeq = 0;
        }
        push(event) {
            this._lastSeq++;
            this._cachedEvent.queueSignalPush({ time: (0, base_1.GetCurrentTime)().getTime(), event, seq: this._lastSeq });
            setTimeout(() => this._cachedEvent.arr().shift(), this.eventQueueExpiredTime);
        }
        async peek(cond) {
            let events = [];
            const checkEvent = () => {
                let evs = this._cachedEvent.arr();
                if (cond.seqGt != undefined) {
                    evs = evs.filter(t1 => t1.seq > cond.seqGt);
                }
                if (cond.timeGt != undefined) {
                    evs = evs.filter(t1 => t1.time > cond.timeGt);
                }
                return evs.map(t1 => t1.event);
            };
            events = checkEvent();
            if (events.length === 0) {
                await this._cachedEvent.waitForQueueChange();
                events = checkEvent();
            }
            return events;
        }
    }
    exports.EventBuffer = EventBuffer;
    async function newEventBuffer() {
        return new EventBuffer();
    }
});
