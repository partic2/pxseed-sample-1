/*jshint node:true */
define(["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/webutils"], function (require, exports, base_1, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.HttpParser = exports.TjsWriterDataSink = exports.TjsReaderDataSource = void 0;
    exports.enableRemoteModuleLoader = enableRemoteModuleLoader;
    exports.installTxikiJSFetchModuleProvider = installTxikiJSFetchModuleProvider;
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
    }
    exports.TjsWriterDataSink = TjsWriterDataSink;
    //WIP HTTP Parser
    const headerExp = /^([^: \t]+):[ \t]*((?:.*[^ \t])|)/;
    const requestExp = /^([A-Z-]+) ([^ ]+) HTTP\/[^ \t]+$/;
    const responseExp = /^HTTP\/[^ \t]+ (\d{3}) ?(.*)$/;
    class HttpParser {
        constructor(reader) {
            this.reader = reader;
            this.decoder = new TextDecoder();
            this.method = '';
            this.version = '1.0';
            this.path = '/';
            this.headers = new Array();
        }
        async parseHeader() {
            let reqHdr = this.decoder.decode(await this.reader.readUntil(HttpParser.lineSpliter));
            let matchResult = reqHdr.match(requestExp);
            (0, base_1.assert)(matchResult != null);
            this.method = matchResult[1];
            this.path = matchResult[2];
            this.version = matchResult[3];
            for (let t1 = 0; t1 < 64 * 1024; t1++) {
                let line = this.decoder.decode(await this.reader.readUntil(HttpParser.lineSpliter));
                if (line == '\r\n')
                    break;
                let matched = line.match(headerExp);
                (0, base_1.assert)(matched != null);
                this.headers.push([matchResult[1], matchResult[2]]);
            }
        }
    }
    exports.HttpParser = HttpParser;
    HttpParser.lineSpliter = '\n'.charCodeAt(0);
    let remoteModuleLoaderState = {
        rootUrl: null,
        networkError: null,
        lastFailedTime: new Date(0),
        updateLocal: true
    };
    function enableRemoteModuleLoader(rootUrl, opts) {
        remoteModuleLoaderState.rootUrl = rootUrl;
        Object.assign(remoteModuleLoaderState, opts);
    }
    const TxikiJSFetchModuleProvider = async (modName, url) => {
        if ((0, base_1.DateDiff)((0, base_1.GetCurrentTime)(), remoteModuleLoaderState.lastFailedTime, 'second') < 15) {
            return null;
        }
        if (remoteModuleLoaderState.rootUrl == null) {
            return null;
        }
        else {
            let fetchUrl = `${remoteModuleLoaderState.rootUrl}/${modName}`;
            if (!fetchUrl.endsWith('.js')) {
                fetchUrl = fetchUrl + '.js';
            }
            try {
                let resp = await fetch(fetchUrl);
                if (!resp.ok) {
                    throw new Error('fetch module file failed. server response ' + resp.status + ' ' + await resp.text());
                }
                let data = await resp.text();
                if (remoteModuleLoaderState.updateLocal === true) {
                    let modFile = `${(0, webutils_1.getWWWRoot)()}/${modName}`;
                    if (!modFile.endsWith('.js')) {
                        modFile += '.js';
                    }
                    let fh = await tjs.open(modFile, 'w');
                    try {
                        await fh.write(new TextEncoder().encode(modFile));
                    }
                    catch (e) {
                        await fh.close();
                    }
                }
                return data;
            }
            catch (err) {
                remoteModuleLoaderState.networkError = err;
                remoteModuleLoaderState.lastFailedTime = (0, base_1.GetCurrentTime)();
                return null;
            }
        }
    };
    function installTxikiJSFetchModuleProvider() {
        base_1.requirejs.addResourceProvider(TxikiJSFetchModuleProvider);
    }
});
//# sourceMappingURL=tjsutil.js.map