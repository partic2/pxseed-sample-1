define(["require", "exports", "partic2/jsutils1/base"], function (require, exports, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Singleton = exports.ExtendStreamReader = exports.TaskLocalRef = void 0;
    exports.utf8conv = utf8conv;
    exports.u8hexconv = u8hexconv;
    exports.FlattenArray = FlattenArray;
    exports.FlattenArraySync = FlattenArraySync;
    exports.deepEqual = deepEqual;
    exports.setupAsyncHook = setupAsyncHook;
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
            //Slow but simple
            let concated = null;
            for (let t1 = 0; t1 < 0x7fffff; t1++) {
                let chunk = await this.read();
                if (!chunk.done) {
                    if (concated == null) {
                        concated = chunk.value;
                    }
                    else {
                        concated = new Uint8Array((0, base_1.ArrayBufferConcat)([concated, chunk.value]));
                    }
                    let markMatched = false;
                    let t2 = 0;
                    let t3 = concated.length - mark.length;
                    for (t2 = 0; t2 <= t3; t2++) {
                        markMatched = true;
                        for (let t3 = 0; t3 < mark.length; t3++) {
                            if (concated[t2 + t3] !== mark[t3]) {
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
            this.i = null;
        }
        async get() {
            if (!this.done) {
                this.init().then((result) => {
                    this.setResult(result);
                }, (err) => {
                    this.setException(err);
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
    function setupAsyncHook() {
        if (!('__onAwait' in Promise)) {
            let asyncStackDepth = 0;
            Promise.__onAsyncEnter = () => {
                asyncStackDepth++;
            };
            Promise.__onAsyncExit = () => {
                asyncStackDepth--;
                if (asyncStackDepth === 0) {
                    base_1.Task.currentTask = null;
                }
            };
            //Only call ONCE for each 'await'
            Promise.__onAwait = async (p) => {
                base_1.Task.getAbortSignal()?.throwIfAborted();
                let task = base_1.Task.currentTask;
                asyncStackDepth--;
                if (asyncStackDepth === 0) {
                    base_1.Task.currentTask = null;
                }
                try {
                    return await p;
                }
                finally {
                    asyncStackDepth++;
                    base_1.Task.currentTask = task;
                }
            };
        }
    }
    setupAsyncHook();
});
//# sourceMappingURL=jsutils2.js.map