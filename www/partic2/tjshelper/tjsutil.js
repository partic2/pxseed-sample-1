/*jshint node:true */
define(["require", "exports", "partic2/jsutils1/base"], function (require, exports, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.polyfill = exports.TlsStream = exports.PxprpcIoFromTjsStream = exports.TjsWriterDataSink = exports.TjsReaderDataSource = void 0;
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    let log = base_1.logger.getLogger(__name__);
    class TjsReaderDataSource {
        constructor(tjsReader) {
            this.tjsReader = tjsReader;
        }
        async pull(controller) {
            let buf = new Uint8Array(1024);
            let count = await this.tjsReader.read(buf);
            if (count == null) {
                controller.close();
            }
            else {
                controller.enqueue(new Uint8Array(buf.buffer, 0, count));
            }
        }
    }
    exports.TjsReaderDataSource = TjsReaderDataSource;
    class TjsWriterDataSink {
        constructor(tjsWriter) {
            this.tjsWriter = tjsWriter;
        }
        async write(chunk, controller) {
            await this.tjsWriter.write(chunk);
        }
        close() {
            if (this.tjsWriter.close != undefined) {
                this.tjsWriter.close();
            }
        }
    }
    exports.TjsWriterDataSink = TjsWriterDataSink;
    class PxprpcIoFromTjsStream {
        constructor(r, w, c) {
            this.r = r;
            this.w = w;
            this.c = c;
        }
        async receive() {
            let buf1 = new Uint8Array(4);
            await this.r.read(buf1);
            let size = new DataView(buf1.buffer).getInt32(0, true);
            buf1 = new Uint8Array(size);
            let readCount = 0;
            while (readCount < size) {
                let nread = await this.r.read(new Uint8Array(buf1.buffer, readCount, size - readCount));
                if (nread === null || nread === 0) {
                    throw new Error("packet truncated.");
                }
                readCount += nread;
            }
            return buf1;
        }
        async send(data) {
            let size = data.reduce((prev, curr) => prev + curr.byteLength, 0);
            let buf1 = new Uint8Array(4);
            new DataView(buf1.buffer).setInt32(0, size, true);
            //XXX:Should I take care about the result of write?
            if (size < 1024) {
                await this.w.write(new Uint8Array((0, base_1.ArrayBufferConcat)([buf1, ...data])));
            }
            else {
                await this.w.write(buf1);
                for (let t1 of data) {
                    await this.w.write(t1);
                }
            }
        }
        close() {
            this.c.close();
        }
    }
    exports.PxprpcIoFromTjsStream = PxprpcIoFromTjsStream;
    class TlsStream {
        constructor(underlying, servername) {
            this.underlying = underlying;
            this.servername = servername;
            this.cipherReadQueue = new Array();
            this.plainWriteQueue = new Array();
            this.cipherWriteQueue = new Array();
            this.pumpSignal = new base_1.future();
            this.abortControl = new AbortController();
            this.r = new ReadableStream({
                start: (ctl) => { this.plainReadBuffer = ctl; }
            });
            this.w = new WritableStream({
                write: async (chunk, ctl) => {
                    this.plainWriteQueue.push(chunk);
                    this.pumpSignal.setResult(0);
                }
            });
            this.closed = false;
            this.pump();
        }
        async pump() {
            let { TjsTlsClient } = await new Promise((resolve_1, reject_1) => { require(['./tjsenv'], resolve_1, reject_1); });
            this.tjstlsc = new TjsTlsClient(this.servername);
            let w2 = this.underlying.w.getWriter();
            let r2 = this.underlying.r.getReader();
            this.abortControl.signal.addEventListener('abort', (ev) => {
                let err = new Error();
                err.name = 'AbortError';
                this.pumpSignal.setException(err);
            });
            ;
            (async () => {
                while (!this.abortControl.signal.aborted) {
                    let next = await r2.read();
                    if (next.done)
                        break;
                    this.cipherWriteQueue.push(next.value);
                    this.pumpSignal.setResult(0);
                }
            })().catch(() => { }).finally(() => { this.close(); });
            try {
                while (!this.abortControl.signal.aborted) {
                    let shouldWaitSignal = true;
                    let count = 0;
                    if (this.plainWriteQueue.length > 0) {
                        let t1 = this.plainWriteQueue.shift();
                        count = await this.tjstlsc.writePlain(t1);
                        if (count < t1.length) {
                            t1 = new Uint8Array(t1.buffer, t1.byteOffset + count, t1.length - count);
                            this.plainWriteQueue.unshift(t1);
                        }
                        if (count > 0) {
                            shouldWaitSignal = false;
                        }
                    }
                    let buf = new Uint8Array(4096);
                    count = await this.tjstlsc.readCipherSendBuffer(buf);
                    if (count > 0) {
                        await w2.write(new Uint8Array(buf.buffer, 0, count));
                        shouldWaitSignal = false;
                    }
                    if (this.cipherWriteQueue.length > 0) {
                        let t1 = this.cipherWriteQueue.shift();
                        count = await this.tjstlsc.writeCipherRecvBuffer(t1);
                        if (count < t1.length) {
                            t1 = new Uint8Array(t1.buffer, t1.byteOffset + count, t1.length - count);
                            this.cipherWriteQueue.unshift(t1);
                        }
                        if (count > 0) {
                            shouldWaitSignal = false;
                        }
                    }
                    count = await this.tjstlsc.readPlain(buf);
                    if (count > 0) {
                        this.plainReadBuffer.enqueue(new Uint8Array(buf.buffer, 0, count));
                        shouldWaitSignal = false;
                    }
                    if (shouldWaitSignal) {
                        await this.pumpSignal.get();
                        this.pumpSignal = new base_1.future();
                    }
                }
            }
            finally {
                this.close();
            }
        }
        close() {
            if (!this.closed) {
                this.closed = true;
                this.abortControl.abort();
                this.underlying.w.close();
                this.underlying.r.cancel();
                this.w.close();
                this.plainReadBuffer.close();
                this.tjstlsc?.close();
            }
        }
    }
    exports.TlsStream = TlsStream;
    let polyfillHttpClient = null;
    async function ensurePolyfillHttpClient() {
        if (polyfillHttpClient == null) {
            let { buildTjs } = await new Promise((resolve_2, reject_2) => { require(["./tjsbuilder"], resolve_2, reject_2); });
            let { HttpClient } = await new Promise((resolve_3, reject_3) => { require(['./httpprot'], resolve_3, reject_3); });
            polyfillHttpClient = new HttpClient();
            polyfillHttpClient.setConnectorTjs((await buildTjs()).connect);
            polyfillHttpClient.makeSsl = async (underlying, servername) => new TlsStream(underlying, servername);
        }
    }
    class WebSocketPolyfill extends EventTarget {
        async __connect() {
            await ensurePolyfillHttpClient();
            try {
                this.__wsh = await polyfillHttpClient.websocket(new Request(this.url));
                this.readyState = this.OPEN;
                this.dispatchEvent(new Event('open', {}));
                while (this.readyState === this.OPEN) {
                    let msg = await this.__wsh.receive();
                    if (typeof msg === 'string') {
                        this.dispatchEvent(new MessageEvent('message', { data: msg }));
                    }
                    else if (this.binaryType === 'arraybuffer') {
                        if (msg.byteOffset === 0 && msg.byteLength === msg.buffer.byteLength) {
                            this.dispatchEvent(new MessageEvent('message', { data: msg.buffer }));
                        }
                        else {
                            this.dispatchEvent(new MessageEvent('message', { data: msg.buffer.slice(msg.byteOffset, msg.byteOffset + msg.byteLength) }));
                        }
                    }
                    else {
                        this.dispatchEvent(new MessageEvent('message', { data: new Blob([msg]) }));
                    }
                }
            }
            catch (err) {
                this.readyState = this.CLOSING;
                if (this.__wsh != null) {
                    if (!this.__wsh.closed.done) {
                        this.readyState = this.CLOSING;
                        await this.__wsh.close();
                    }
                }
                let ev = new Event('error');
                ev.cause = err;
                this.dispatchEvent(ev);
            }
            finally {
                this.readyState = this.CLOSED;
            }
        }
        constructor(url, protocols) {
            super();
            this.CONNECTING = 0;
            this.OPEN = 1;
            this.CLOSING = 2;
            this.CLOSED = 3;
            this.onclose = null;
            this.onerror = null;
            this.onmessage = null;
            this.onopen = null;
            this.binaryType = 'blob';
            this.readyState = this.CONNECTING;
            this.bufferedAmount = 0;
            this.__wsh = null;
            let urlStr;
            try {
                let t1 = new URL(url);
                if (t1.protocol == 'http:') {
                    t1.protocol = 'ws:';
                }
                else if (t1.protocol == 'https:') {
                    t1.protocol = 'wss:';
                }
                urlStr = t1.toString();
            }
            catch (_) { }
            if (!urlStr) {
                throw new Error('Invalid URL');
            }
            this.url = urlStr;
            this.addEventListener('close', (ev) => this.onclose?.(ev));
            this.addEventListener('error', (ev) => this.onerror?.(ev));
            this.addEventListener('message', (ev) => this.onmessage?.(ev));
            this.addEventListener('open', (ev) => this.onopen?.(ev));
            new Promise((resolve) => resolve()).then(() => this.__connect());
        }
        get extensions() { return ''; }
        get protocol() { return ''; }
        send(data) {
            if (typeof data === 'string') {
                this.__wsh.send(data);
            }
            else if (data instanceof ArrayBuffer) {
                this.__wsh.send(new Uint8Array(data));
            }
            else if (ArrayBuffer.isView(data)) {
                this.__wsh.send(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
            }
            else if (data instanceof Blob) {
                data.arrayBuffer().then(buf => {
                    this.__wsh.send(new Uint8Array(buf));
                });
            }
        }
        close(code = 1000, reason = '') {
            this.readyState = this.CLOSING;
            this.__wsh?.close(code, reason);
        }
    }
    WebSocketPolyfill.CONNECTING = 0;
    WebSocketPolyfill.OPEN = 1;
    WebSocketPolyfill.CLOSING = 2;
    WebSocketPolyfill.CLOSED = 3;
    exports.polyfill = {
        fetch: async function (input, init) {
            await ensurePolyfillHttpClient();
            return polyfillHttpClient.fetch(new Request(input, init));
        },
        WebSocket: WebSocketPolyfill
    };
});
//# sourceMappingURL=tjsutil.js.map