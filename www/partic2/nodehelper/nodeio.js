define("partic2/nodehelper/nodeio", ["require", "exports", "stream", "partic2/jsutils1/base", "net", "tls"], function (require, exports, stream_1, base_1, net_1, tls_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TlsStream = exports.NodeWritableDataSink = exports.NodeReadableDataSource = exports.PxprpcTcpServer = exports.PxprpcIoFromSocket = exports.wrappedStreams = void 0;
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
            this.remainbuf = null;
            this.endOfStream = false;
            this.remainoff = 0;
            nodeInput.on('data', (chunk) => {
                this.chunkQueue.queueSignalPush(chunk);
            });
            nodeInput.on('end', () => {
                this.chunkQueue.queueSignalPush(null);
            });
            nodeInput.on('error', (err) => {
                this.chunkQueue.queueSignalPush(null);
                this.err = err;
            });
            nodeInput.on('close', () => {
                this.chunkQueue.queueSignalPush(null);
                this.endOfStream = true;
            });
        }
        async read(buf, offset) {
            if (this.err != null) {
                throw this.err;
            }
            offset = offset ?? 0;
            if (this.endOfStream)
                return null;
            if (this.remainbuf === null) {
                this.remainbuf = await this.chunkQueue.queueBlockShift();
                if (this.remainbuf === null) {
                    if (this.err != null) {
                        throw this.err;
                    }
                    return null;
                }
                this.remainoff = this.remainbuf.byteOffset;
            }
            let readLen = Math.min(buf.length - offset, this.remainbuf.length - this.remainoff);
            buf.set(new Uint8Array(this.remainbuf.buffer, this.remainbuf.byteOffset + this.remainoff, readLen), offset);
            this.remainoff += readLen;
            if (this.remainbuf.length - this.remainoff === 0) {
                this.remainbuf = null;
            }
            return readLen;
        }
        async readFully(buf) {
            let end = buf.byteOffset + buf.byteLength;
            let start = 0;
            while (start < end) {
                let readLen = await this.read(buf, start);
                if (readLen == null) {
                    if (start < end) {
                        throw new Error('EOF occured');
                    }
                }
                else {
                    start += readLen;
                }
            }
        }
        async readAll() {
            let buffList = [];
            for (let t1 = 0; t1 < 1024 * 1024; t1++) {
                let buff = await this.chunkQueue.queueBlockShift();
                if (buff != null) {
                    buffList.push(buff);
                }
                else {
                    break;
                }
            }
            return (0, base_1.ArrayBufferConcat)(buffList);
        }
    }
    class PxprpcIoFromSocket {
        async connect(opt) {
            if (this.sock == undefined) {
                return new Promise((resolve, reject) => {
                    this.sock = new net_1.Socket();
                    this.sock.once('error', (err) => {
                        reject(err);
                    });
                    this.sock.connect(opt, () => resolve(undefined));
                });
            }
            else {
                return this.sock;
            }
        }
        async receive() {
            let buf1 = new Uint8Array(4);
            await wrapReadable(this.sock).readFully(buf1);
            let size = new DataView(buf1.buffer).getInt32(0, true);
            buf1 = new Uint8Array(size);
            await wrapReadable(this.sock).readFully(buf1);
            return buf1;
        }
        async send(data) {
            let size = data.reduce((prev, curr) => prev + curr.byteLength, 0);
            let buf1 = new Uint8Array(4);
            new DataView(buf1.buffer).setInt32(0, size, true);
            this.sock.write(buf1);
            data.forEach((buf2) => {
                this.sock.write(buf2);
            });
        }
        close() {
            this.sock.end();
        }
    }
    exports.PxprpcIoFromSocket = PxprpcIoFromSocket;
    class PxprpcTcpServer {
        constructor() {
            this.onNewConnection = () => { };
        }
        async listen(opt) {
            return new Promise((resolve, reject) => {
                this.ssock = new net_1.Server();
                this.ssock.once('error', (err) => reject(err));
                this.ssock.on('connection', (conn) => {
                    let io1 = new PxprpcIoFromSocket();
                    io1.sock = conn;
                    this.onNewConnection(io1);
                });
                this.ssock.listen(opt, 6, () => resolve(undefined));
            });
        }
        async close() {
            return new Promise((resolve, reject) => {
                this.ssock.close((err) => {
                    if (err != null) {
                        reject(err);
                    }
                    else {
                        resolve(undefined);
                    }
                });
            });
        }
    }
    exports.PxprpcTcpServer = PxprpcTcpServer;
    const __name__ = base_1.requirejs.getLocalRequireModule(require);
    async function createIoPxseedJsUrl(url) {
        let bus = await new Promise((resolve_1, reject_1) => { require(['partic2/pxprpcClient/bus'], resolve_1, reject_1); });
        return bus.createIoPxseedJsUrl(url);
    }
    globalThis.WebSocket = WebSocket;
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
