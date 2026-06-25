define("partic2/nodehelper/nodeio", ["require", "exports", "stream", "partic2/jsutils1/base", "tls"], function (require, exports, stream_1, base_1, tls_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TlsStream = exports.NodeWritableDataSink = exports.NodeReadableDataSource = exports.wrappedStreams = void 0;
    exports.wrapReadable = wrapReadable;
    exports.createIoPxseedJsUrl = createIoPxseedJsUrl;
    exports.newHttpClientForNodeJs = newHttpClientForNodeJs;
    exports.wrappedStreams = Symbol('wrappedStreams');
    function wrapReadable(r) {
        let wrapped = {};
        if (exports.wrappedStreams in r) {
            wrapped = r[exports.wrappedStreams];
        }
        else {
            r[exports.wrappedStreams] = wrapped;
        }
        if (!('readStream' in wrapped)) {
            wrapped.readStream = new ReadStream4NodeIo(r);
        }
        return wrapped.readStream;
    }
    //tjs.Reader
    class ReadStream4NodeIo {
        constructor(nodeInput) {
            this.nodeInput = nodeInput;
            this.chunkQueue = new base_1.ArrayWrap2();
            this.err = null;
            this.endOfStream = false;
            nodeInput.on('data', (chunk) => {
                this.chunkQueue.queueSignalPush(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.length));
            });
            nodeInput.on('end', () => {
                this.chunkQueue.queueSignalPush('END');
            });
            nodeInput.on('error', (err) => {
                this.chunkQueue.queueSignalPush('END');
                this.err = err;
            });
            nodeInput.on('close', () => {
                this.chunkQueue.queueSignalPush('END');
            });
        }
        async read(buf, offset) {
            if (this.err != null) {
                throw this.err;
            }
            offset = offset ?? 0;
            if (this.endOfStream)
                return null;
            let buf1 = await this.chunkQueue.queueBlockShift();
            if (buf1 === 'END') {
                this.endOfStream = true;
                return null;
            }
            let readLen = Math.min(buf.length - offset, buf1.length);
            buf.set(new Uint8Array(buf1.buffer, buf1.byteOffset, readLen), offset);
            if (readLen < buf1.length) {
                buf1 = new Uint8Array(buf1.buffer, buf1.byteOffset + readLen, buf1.length - readLen);
                this.chunkQueue.arr().unshift(buf1);
            }
            return readLen;
        }
    }
    const __name__ = base_1.requirejs.getLocalRequireModule(require);
    async function createIoPxseedJsUrl(url) {
        let bus = await new Promise((resolve_1, reject_1) => { require(['partic2/pxprpcClient/bus'], resolve_1, reject_1); });
        return bus.createIoPxseedJsUrl(url);
    }
    class NodeReadableDataSource {
        constructor(nodeReadable) {
            this.nodeReadable = nodeReadable;
        }
        start(controller) {
            this.nodeReadable.on('data', (chunk) => controller.enqueue(chunk));
            this.nodeReadable.on('error', (err) => { try {
                controller.error(err);
                controller.close();
            }
            catch (err) { } });
            this.nodeReadable.on('end', () => controller.close());
        }
    }
    exports.NodeReadableDataSource = NodeReadableDataSource;
    class NodeWritableDataSink {
        constructor(nodeWritable) {
            this.nodeWritable = nodeWritable;
        }
        async write(chunk, controller) {
            this.nodeWritable.write(chunk);
        }
    }
    exports.NodeWritableDataSink = NodeWritableDataSink;
    class TlsStream {
        constructor(underlying, servername) {
            this.underlying = underlying;
            this.servername = servername;
            this.r = new ReadableStream();
            this.w = new WritableStream();
            this.closed = false;
        }
        async connect() {
            this.nodeDuplex = stream_1.Duplex.fromWeb({ readable: this.underlying.r, writable: this.underlying.w });
            this.tlsConn = tls_1.default.connect({ servername: this.servername, socket: this.nodeDuplex });
            this.r = new ReadableStream(new NodeReadableDataSource(this.tlsConn));
            this.w = new WritableStream(new NodeWritableDataSink(this.tlsConn));
            return this;
        }
        close() {
            if (!this.closed) {
                this.closed = true;
                this.underlying.w.close();
                this.underlying.r.cancel();
                this.w?.close();
                this.tlsConn?.destroy();
            }
        }
    }
    exports.TlsStream = TlsStream;
    async function newHttpClientForNodeJs() {
        let { HttpClient } = await new Promise((resolve_2, reject_2) => { require(['partic2/tjshelper/httpprot'], resolve_2, reject_2); });
        let { buildTjs } = await new Promise((resolve_3, reject_3) => { require(['partic2/tjshelper/tjsbuilder'], resolve_3, reject_3); });
        let client = new HttpClient();
        client.setConnectorTjs((await buildTjs()).connect);
        client.makeSsl = async (underlying, servername) => new TlsStream(underlying, servername).connect();
        return client;
    }
});
