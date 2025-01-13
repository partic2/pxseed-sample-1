define(["require", "exports", "partic2/jsutils1/base", "net"], function (require, exports, base_1, net_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PxprpcTcpServer = exports.PxprpcIoFromSocket = exports.wrappedStreams = void 0;
    exports.wrapReadable = wrapReadable;
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
                    this.sock.once('error', () => {
                        reject(this.sock);
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
            await wrapReadable(this.sock).read(buf1, 0);
            let size = new DataView(buf1.buffer).getInt32(0, true);
            buf1 = new Uint8Array(size);
            await wrapReadable(this.sock).read(buf1, 0);
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
});
//# sourceMappingURL=nodeio.js.map