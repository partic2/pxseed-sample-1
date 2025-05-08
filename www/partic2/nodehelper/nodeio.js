define(["require", "exports", "partic2/jsutils1/base", "net", "pxprpc/extend", "partic2/jsutils1/webutils", "ws"], function (require, exports, base_1, net_1, extend_1, webutils_1, ws_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.NodeWritableDataSink = exports.NodeReadableDataSource = exports.NodeWsIo = exports.PxprpcTcpServer = exports.PxprpcIoFromSocket = exports.wrappedStreams = void 0;
    exports.wrapReadable = wrapReadable;
    exports.createIoPxseedJsUrl = createIoPxseedJsUrl;
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
            this.chunkQueue = new base_1.ArrayWrap2([]);
            this.remainbuf = null;
            this.endOfStream = false;
            this.remainoff = 0;
            nodeInput.on('data', (chunk) => {
                this.chunkQueue.queueBlockPush(chunk);
            });
            nodeInput.on('end', () => {
                this.chunkQueue.queueBlockPush(null);
            });
        }
        async read(buf, offset) {
            offset = offset ?? 0;
            if (this.endOfStream)
                return null;
            if (this.remainbuf === null) {
                this.remainbuf = await this.chunkQueue.queueBlockShift();
                if (this.remainbuf === null) {
                    this.endOfStream = true;
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
    //security issue?
    extend_1.defaultFuncMap[__name__ + '.createPxprpcIoFromTcpTarget'] = new extend_1.RpcExtendServerCallable(async (connectTo) => {
        let s = new PxprpcIoFromSocket();
        await s.connect(JSON.parse(connectTo));
        return s;
    }).typedecl('s->o');
    async function createIoPxseedJsUrl(url) {
        let type = (0, webutils_1.GetUrlQueryVariable2)(url, 'type');
        if (type === 'tcp') {
            let io = new PxprpcIoFromSocket();
            let host = (0, webutils_1.GetUrlQueryVariable2)(url, 'host') ?? '127.0.0.1';
            let port = Number((0, webutils_1.GetUrlQueryVariable2)(url, 'port'));
            await io.connect({ host, port });
            return io;
        }
    }
    class NodeWsIo {
        constructor(ws) {
            this.ws = ws;
            this.priv__cached = new base_1.ArrayWrap2([]);
            this.closed = false;
            ws.on('message', (data, isBin) => {
                if (data instanceof ArrayBuffer) {
                    this.priv__cached.queueBlockPush(new Uint8Array(data));
                }
                else if (data instanceof Buffer) {
                    this.priv__cached.queueBlockPush(data);
                }
                else if (data instanceof Array) {
                    this.priv__cached.queueBlockPush(new Uint8Array((0, base_1.ArrayBufferConcat)(data)));
                }
                else {
                    throw new Error('Unknown data type');
                }
            });
            ws.on('close', (code, reason) => {
                this.closed = true;
                this.priv__cached.cancelWaiting();
            });
        }
        async receive() {
            try {
                let wsdata = await this.priv__cached.queueBlockShift();
                return wsdata;
            }
            catch (e) {
                if (e instanceof base_1.CanceledError && this.closed) {
                    this.ws.close();
                    throw new Error('closed.');
                }
                else {
                    this.ws.close();
                    throw e;
                }
            }
        }
        async send(data) {
            this.ws.send((0, base_1.ArrayBufferConcat)(data));
        }
        close() {
            this.ws.close();
            this.closed = true;
            this.priv__cached.cancelWaiting();
        }
    }
    exports.NodeWsIo = NodeWsIo;
    globalThis.WebSocket = ws_1.WebSocket;
    class NodeReadableDataSource {
        constructor(nodeReadable) {
            this.nodeReadable = nodeReadable;
        }
        async pull(controller) {
            let errorHandler = null;
            let resolveHandler = null;
            try {
                let chunk = await new Promise((resolve, reject) => {
                    errorHandler = reject;
                    this.nodeReadable.on('error', errorHandler);
                    resolveHandler = resolve;
                    this.nodeReadable.on('data', resolveHandler);
                });
                controller.enqueue(chunk);
            }
            finally {
                if (errorHandler != null) {
                    this.nodeReadable.off('error', errorHandler);
                }
                if (resolveHandler != null) {
                    this.nodeReadable.off('data', resolveHandler);
                }
            }
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
});
//# sourceMappingURL=nodeio.js.map