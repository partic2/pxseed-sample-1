define(["require", "exports", "partic2/jsutils1/base"], function (require, exports, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.wrappedStreams = void 0;
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
});
//# sourceMappingURL=nodeio.js.map