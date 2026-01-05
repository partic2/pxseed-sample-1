/*jshint node:true */
define(["require", "exports", "partic2/jsutils1/base"], function (require, exports, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PxprpcIoFromTjsStream = exports.TjsWriterDataSink = exports.TjsReaderDataSource = void 0;
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
                await Promise.all(data.map((t1) => this.w.write(buf1)));
            }
        }
        close() {
            this.c.close();
        }
    }
    exports.PxprpcIoFromTjsStream = PxprpcIoFromTjsStream;
});
//# sourceMappingURL=tjsutil.js.map