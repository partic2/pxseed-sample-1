/*jshint node:true */
define(["require", "exports", "partic2/jsutils1/base"], function (require, exports, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TjsWriterDataSink = exports.TjsReaderDataSource = void 0;
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
});
//# sourceMappingURL=tjsutil.js.map