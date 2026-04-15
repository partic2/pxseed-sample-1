define("partic2/tjshelper/httpprot", ["require", "exports", "partic2/CodeRunner/jsutils2", "partic2/jsutils1/base", "partic2/CodeRunner/JsEnviron", "partic2/tjshelper/tjsutil"], function (require, exports, jsutils2_1, base_1, JsEnviron_1, tjsutil_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SimpleFileServer = exports.SimpleHttpServerRouter = exports.HttpClient = exports.HttpServer = exports.WebSocketClientStreamHandler = exports.WebSocketServerStreamHandler = exports.ExtendHttpRequest = exports.ExtendHttpResponse = void 0;
    const decode = TextDecoder.prototype.decode.bind(new TextDecoder());
    const encode = TextEncoder.prototype.encode.bind(new TextEncoder());
    const mimeDb = {
        "js": "application/javascript",
        "json": "application/json",
        "bin": "application/octet-stream",
        "exe": "application/octet-stream",
        "dll": "application/octet-stream",
        "deb": "application/octet-stream",
        "dmg": "application/octet-stream",
        "iso": "application/octet-stream",
        "img": "application/octet-stream",
        "msi": "application/octet-stream",
        "msp": "application/octet-stream",
        "msm": "application/octet-stream",
        "pdf": "application/pdf",
        "m3u8": "application/vnd.apple.mpegurl",
        "wasm": "application/wasm",
        "7z": "application/x-7z-compressed",
        "der": "application/x-x509-ca-cert",
        "pem": "application/x-x509-ca-cert",
        "crt": "application/x-x509-ca-cert",
        "xpi": "application/x-xpinstall",
        "xhtml": "application/xhtml+xml",
        "zip": "application/zip",
        "mid": "audio/midi",
        "midi": "audio/midi",
        "kar": "audio/midi",
        "mp3": "audio/mpeg",
        "ogg": "audio/ogg",
        "m4a": "audio/x-m4a",
        "ra": "audio/x-realaudio",
        "woff": "font/woff",
        "woff2": "font/woff2",
        "avif": "image/avif",
        "gif": "image/gif",
        "jpeg": "image/jpeg",
        "jpg": "image/jpeg",
        "png": "image/png",
        "svg": "image/svg+xml",
        "svgz": "image/svg+xml",
        "tif": "image/tiff",
        "tiff": "image/tiff",
        "webp": "image/webp",
        "ico": "image/x-icon",
        "jng": "image/x-jng",
        "bmp": "image/x-ms-bmp",
        "css": "text/css",
        "html": "text/html",
        "htm": "text/html",
        "shtml": "text/html",
        "mml": "text/mathml",
        "txt": "text/plain",
        "xml": "text/xml",
        "3gpp": "video/3gpp",
        "3gp": "video/3gpp",
        "mp4": "video/mp4",
        "mpeg": "video/mpeg",
        "mpg": "video/mpeg",
        "mov": "video/quicktime",
        "webm": "video/webm",
        "flv": "video/x-flv",
        "m4v": "video/x-m4v",
        "mng": "video/x-mng",
        "asx": "video/x-ms-asf",
        "asf": "video/x-ms-asf",
        "wmv": "video/x-ms-wmv",
        "avi": "video/x-msvideo"
    };
    //Don't use Response directly, Response limit status range into 200-599
    class ExtendHttpResponse extends Response {
        get status() {
            return this.pStatus;
        }
        set status(v) { this.pStatus = v; }
        constructor(body, init) {
            let savedStatus = init?.status;
            if (init?.status != undefined && (init?.status < 200 || init?.status > 599)) {
                init.status = 200;
            }
            if ([204, 304].includes(init?.status ?? 0)) {
                body = null;
            }
            super(body, init);
            this.pStatus = 0;
            this.pStatus = savedStatus ?? 200;
        }
    }
    exports.ExtendHttpResponse = ExtendHttpResponse;
    //Don't use Request directly, Request don't support CONNECT method.
    class ExtendHttpRequest extends Request {
        get method() {
            return this.pMethod;
        }
        set method(v) { this.pMethod = v; }
        constructor(input, init) {
            let savedMethod = init?.method;
            if (init?.method === 'CONNECT') {
                delete init.method;
                if (typeof input === 'string' && !input.startsWith('http:')) {
                    input = 'http:' + input;
                }
            }
            super(input, init);
            this.pMethod = '';
            this.pMethod = savedMethod ?? 'GET';
        }
    }
    exports.ExtendHttpRequest = ExtendHttpRequest;
    let WebSocketOpcodeConst = { TEXT: 1, BINARY: 2, PING: 9, PONG: 10, CLOSE: 8 };
    class WebSocketStreamHandler {
        constructor(reader, writer) {
            this.reader = reader;
            this.writer = writer;
            this.closed = new base_1.future();
            this.pCurrPacket = null;
            this.error = null;
            this.queuedRecvData = new base_1.ArrayWrap2();
            this._payloadXor = (mask, payload) => {
                for (let i = 0; i < payload.length; i++) {
                    payload[i] = mask[i % 4] ^ payload[i];
                }
            };
            if (typeof globalThis.tjs?.misc?.__wsFastXor === 'function') {
                this._payloadXor = globalThis.tjs.misc.__wsFastXor;
            }
            this.startProcessWebSocketStream();
        }
        async readForNBytesView(n) {
            let buf = await this.reader.readForNBytes(n);
            return new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
        }
        async startProcessWebSocketStream() {
            try {
                while (!this.closed.done) {
                    let view = await this.readForNBytesView(2);
                    let idx = 2, b1 = view.getUint8(0), fin = b1 & 128, opcode = b1 & 15, b2 = view.getUint8(1), hasMask = b2 & 128;
                    if (this.pCurrPacket == null) {
                        if (this.pCurrPacket == null) {
                            this.pCurrPacket = { payloads: [], opcode };
                        }
                    }
                    let length = b2 & 127;
                    if (length > 125) {
                        if (length == 126) {
                            length = (await this.readForNBytesView(2)).getUint16(0, false);
                            idx += 2;
                        }
                        else if (length == 127) {
                            view = (await this.readForNBytesView(8));
                            if (view.getUint32(0, false) != 0) {
                                this.close(1009, "");
                            }
                            length = view.getUint32(4, false);
                        }
                    }
                    let maskBytes;
                    if (hasMask) {
                        maskBytes = await this.reader.readForNBytes(4);
                    }
                    let payload = await this.reader.readForNBytes(length);
                    if (hasMask) {
                        this._payloadXor(maskBytes, payload);
                    }
                    this.pCurrPacket.payloads.push(payload);
                    if (fin) {
                        this.handlePacket(this.pCurrPacket);
                        this.pCurrPacket = null;
                    }
                }
            }
            catch (err) {
                (0, base_1.throwIfAbortError)(err);
                this.error = err;
            }
            finally {
                if (!this.closed.done)
                    this.close(1000, 'Unexpected error');
            }
        }
        async handlePacket(packet) {
            let concated = packet.payloads.length === 1 ?
                packet.payloads[0]
                : new Uint8Array((0, base_1.ArrayBufferConcat)(packet.payloads));
            switch (packet.opcode) {
                case WebSocketOpcodeConst.TEXT:
                    this.queuedRecvData.queueSignalPush(decode(concated));
                    break;
                case WebSocketOpcodeConst.BINARY:
                    this.queuedRecvData.queueBlockPush(concated);
                    break;
                case WebSocketOpcodeConst.PING:
                    await this.writeFrame(WebSocketOpcodeConst.PONG, [concated]);
                    break;
                case WebSocketOpcodeConst.PONG:
                    break;
                case WebSocketOpcodeConst.CLOSE:
                    let code;
                    let reason;
                    if (concated.length >= 2) {
                        code = new DataView(concated.buffer, concated.byteOffset).getUint16(0, false);
                        reason = decode(concated.slice(2));
                    }
                    this.close(code, reason);
                    break;
                default:
                    this.close(1002, "unknown opcode");
            }
        }
        sendWithMask() {
            return false;
        }
        encodeMessage(opcode, payload) {
            let buf, b1 = 128 | opcode, b2 = this.sendWithMask() ? 128 : 0;
            let length = payload.reduce((prev, curr) => prev + curr.length, 0);
            if (length < 126) {
                buf = new Uint8Array(2 + 0);
                const view = new DataView(buf.buffer);
                b2 |= length;
                view.setUint8(0, b1);
                view.setUint8(1, b2);
            }
            else if (length < 65536) {
                buf = new Uint8Array(2 + 2);
                const view = new DataView(buf.buffer);
                b2 |= 126;
                view.setUint8(0, b1);
                view.setUint8(1, b2);
                view.setUint16(2, length);
            }
            else {
                buf = new Uint8Array(2 + 8);
                const view = new DataView(buf.buffer);
                b2 |= 127;
                view.setUint8(0, b1);
                view.setUint8(1, b2);
                view.setUint32(2, 0, false);
                view.setUint32(6, length, false);
            }
            let bufs = [buf];
            if (this.sendWithMask()) {
                bufs.push(new Uint8Array([0, 0, 0, 0]));
            }
            bufs.push(...payload);
            return new Uint8Array((0, base_1.ArrayBufferConcat)(bufs));
        }
        async writeFrame(opcode, payload) {
            await this.writer.ready;
            return await this.writer.write(this.encodeMessage(opcode, payload));
        }
        async send(obj) {
            let opcode, payload;
            if (obj instanceof Uint8Array) {
                opcode = WebSocketOpcodeConst.BINARY;
                payload = [obj];
            }
            else if (typeof obj == "string") {
                opcode = WebSocketOpcodeConst.TEXT;
                payload = [encode(obj)];
            }
            else if (obj instanceof Array) {
                opcode = WebSocketOpcodeConst.BINARY;
                payload = obj;
            }
            else {
                throw new Error("Cannot send object. Must be string or Uint8Array");
            }
            await this.writeFrame(opcode, payload);
        }
        async receive() {
            try {
                if (this.closed.done)
                    throw new Error('WebSocket closed');
                let nextPacket = await this.queuedRecvData.queueBlockShift();
                return nextPacket;
            }
            catch (err) {
                if (err instanceof base_1.CanceledError && this.closed.done) {
                    throw new Error('WebSocket closed');
                }
                else {
                    throw err;
                }
            }
        }
        async close(code, reason) {
            if (!this.closed.done) {
                this.closed.setResult(true);
                const opcode = WebSocketOpcodeConst.CLOSE;
                let buffer;
                let reasonU8;
                if (reason != undefined)
                    reasonU8 = encode(reason);
                if (code != undefined) {
                    buffer = new Uint8Array(reasonU8.length + 2);
                    const view = new DataView(buffer.buffer);
                    view.setUint16(0, code, !1);
                    buffer.set(reasonU8, 2);
                }
                else {
                    buffer = new Uint8Array(0);
                }
                await this.writeFrame(opcode, [buffer]);
            }
            this.queuedRecvData.cancelWaiting();
        }
    }
    WebSocketStreamHandler.KEY_SUFFIX = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    class WebSocketServerStreamHandler extends WebSocketStreamHandler {
        async switchToWebsocketResponse(req) {
            if (this.handshakeResponse != undefined)
                return this.handshakeResponse;
            // Use Web Cryptography API crypto.subtle where defined
            let key;
            if (globalThis.crypto?.subtle != undefined) {
                key = globalThis.btoa([
                    ...new Uint8Array(await crypto.subtle.digest("SHA-1", encode(`${req.headers.get('sec-websocket-key')}${WebSocketStreamHandler.KEY_SUFFIX}`))),
                ].map((s) => String.fromCodePoint(s)).join(""));
            }
            else {
                //use partic2/txiki.js sha1
                (0, base_1.assert)(tjs.mbedtls?.sha1 != undefined);
                let t1 = new TextEncoder().encode(`${req.headers.get('sec-websocket-key')}${WebSocketStreamHandler.KEY_SUFFIX}`);
                let hash = tjs.mbedtls.sha1(t1);
                key = (0, base_1.ArrayBufferToBase64)(hash);
            }
            this.handshakeResponse = new ExtendHttpResponse(null, {
                status: 101,
                statusText: 'Switch Protocol',
                headers: new Headers({
                    Upgrade: 'WebSocket',
                    Connection: 'Upgrade',
                    'sec-websocket-accept': key
                })
            });
            return this.handshakeResponse;
        }
    }
    exports.WebSocketServerStreamHandler = WebSocketServerStreamHandler;
    class WebSocketClientStreamHandler extends WebSocketStreamHandler {
        sendWithMask() {
            return true;
        }
    }
    exports.WebSocketClientStreamHandler = WebSocketClientStreamHandler;
    let httpRequestExp = /^(\S+)\s+(\S+)\s+HTTP\/(\S+)\s*\r\n$/;
    let httpResponseExp = /^HTTP\/(\S+)\s+(\S+)\s+(.*?)\r\n$/;
    const lineSpliter = '\n'.charCodeAt(0);
    async function parseHttpKeyValueHeader(r) {
        let headers = new Headers();
        for (let t1 = 0; t1 < 64 * 1024; t1++) {
            let line = decode(await r.readUntil(lineSpliter));
            if (line == '\r\n')
                break;
            let sepAt = line.indexOf(':');
            headers.set(line.substring(0, sepAt), line.substring(sepAt + 1, line.length - 2).trim());
        }
        return headers;
    }
    async function parseHttpRequestHeader(r) {
        let reqHdr = decode(await r.readUntil(lineSpliter));
        let matchResult = reqHdr.match(httpRequestExp);
        (0, base_1.assert)(matchResult != null);
        let method = matchResult[1];
        let url = matchResult[2];
        let httpVersion = matchResult[3];
        return { method, url, httpVersion, headers: await parseHttpKeyValueHeader(r) };
    }
    async function parseHttpResponseHeader(r) {
        let respHdr = decode(await r.readUntil(lineSpliter));
        let matchResult = respHdr.match(httpResponseExp);
        (0, base_1.assert)(matchResult != null);
        let httpVersion = matchResult[1];
        let status = matchResult[2];
        let statusText = matchResult[3];
        return { httpVersion, status, statusText, headers: await parseHttpKeyValueHeader(r) };
    }
    class HttpServer {
        constructor() {
            this.onfetch = async () => new Response();
            this.onwebsocket = async () => { };
        }
        async serve(stream) {
            try {
                while (true) {
                    let { request: req } = await this.pParseHttpRequest(stream.r);
                    if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
                        let that = this;
                        let p = {
                            _ws: null,
                            request: req,
                            accept: async function () {
                                if (this._ws == null) {
                                    this._ws = new WebSocketServerStreamHandler(stream.r, stream.w);
                                    await that.pWriteResponse(stream.w, await this._ws.switchToWebsocketResponse(this.request));
                                }
                                return this._ws;
                            }
                        };
                        await this.onwebsocket(p);
                        if (p._ws == null) {
                            await this.pWriteResponse(stream.w, new Response("Unsupported", { status: 426 }));
                        }
                        else {
                            await p._ws.closed.get();
                        }
                    }
                    else {
                        let resp = await this.onfetch(req);
                        await this.pWriteResponse(stream.w, resp);
                    }
                    if (req.headers.get('connection')?.toLocaleLowerCase() === 'close') {
                        break;
                    }
                }
            }
            catch (err) { }
        }
        *serveTjs(serverSocket) {
            let { TjsReaderDataSource, TjsWriterDataSink } = yield* base_1.Task.yieldWrap(new Promise((resolve_1, reject_1) => { require(["partic2/tjshelper/tjsutil"], resolve_1, reject_1); }));
            while (!(base_1.Task.getAbortSignal()?.aborted ?? false)) {
                let soc = yield* base_1.Task.yieldWrap(serverSocket.accept());
                let r = new jsutils2_1.ExtendStreamReader(new ReadableStream(new TjsReaderDataSource(soc)).getReader());
                let w = new WritableStream(new TjsWriterDataSink(soc)).getWriter();
                let that = this;
                base_1.Task.fork(function* () {
                    try {
                        yield that.serve({ r, w });
                    }
                    finally {
                        w.close();
                    }
                }).run();
            }
        }
        async pParseHttpRequest(r) {
            let header1 = await parseHttpRequestHeader(r);
            let bodyCompleted = new base_1.future();
            let bodySource;
            if (header1.headers.get('transfer-encoding')?.includes('chunked')) {
                bodySource = {
                    pull: async (controller) => {
                        let length = Number.parseInt(decode(await r.readUntil('\n'.charCodeAt(0))).trim(), 16);
                        if (length == 0) {
                            let eoc = await r.readForNBytes(2);
                            //assert(eoc[0]==0xd && eoc[1]==0xa);
                            controller.close();
                            bodyCompleted.setResult();
                        }
                        else {
                            let buf = await r.readForNBytes(length);
                            let eoc = await r.readForNBytes(2);
                            //assert(eoc[0]==0xd && eoc[1]==0xa);
                            controller.enqueue(buf);
                        }
                    }
                };
            }
            else if (header1.headers.has('content-length')) {
                let contentLength = Number(header1.headers.get('content-length').trim());
                let remainBytes = contentLength;
                bodySource = {
                    pull: async (controller) => {
                        let buf = await r.read();
                        if (!buf.done) {
                            if (buf.value.byteLength > remainBytes) {
                                r.unshiftBuffer(new Uint8Array(buf.value.buffer, buf.value.byteOffset + remainBytes, buf.value.byteLength - remainBytes));
                                buf.value = new Uint8Array(buf.value.buffer, buf.value.byteOffset, remainBytes);
                            }
                            controller.enqueue(buf.value);
                            remainBytes -= buf.value.byteLength;
                        }
                        if (remainBytes == 0) {
                            controller.close();
                            bodyCompleted.setResult();
                        }
                    }
                };
            }
            else {
                bodySource = {
                    pull: async (controller) => {
                        controller.close();
                    }
                };
            }
            bodySource;
            let url = header1.url;
            if (!url.startsWith('http:') && url.startsWith('/')) {
                url = 'http://';
                if (header1.headers.has('host')) {
                    url += header1.headers.get('host');
                }
                else {
                    url += '0.0.0.0:0';
                }
                url += header1.url;
            }
            let req = new ExtendHttpRequest(url, {
                method: header1.method,
                body: ['GET', 'HEAD'].includes(header1.method.toUpperCase()) ? undefined
                    : new ReadableStream(bodySource),
                headers: header1.headers,
                duplex: 'half' //BUG:TS complain with it, but it's required in this case.
            });
            return { request: req, bodyCompleted };
        }
        async pWriteResponse(w, resp) {
            let headersString = new Array();
            let chunked = resp.headers.get('transfer-encoding')?.includes('chunked');
            resp.headers.forEach((val, key) => {
                headersString.push(`${key}: ${val}`);
            });
            let nonChunkBody = null;
            if (!chunked && !resp.headers.has('content-length')) {
                nonChunkBody = await resp.arrayBuffer();
                headersString.push('Content-Length:' + String(nonChunkBody.byteLength));
            }
            await w.write(encode([
                `HTTP/1.1 ${resp.status} ${resp.statusText}`,
                ...headersString,
                '\r\n'
            ].join('\r\n')));
            if (resp.body != undefined) {
                if (chunked) {
                    await resp.body.pipeTo(new WritableStream({
                        write: async (chunk, controller) => {
                            await w.write(new Uint8Array((0, base_1.ArrayBufferConcat)([encode(chunk.length.toString(16) + '\r\n'), chunk, encode('\r\n')])));
                        }
                    }));
                    await w.write(encode('0\r\n\r\n'));
                }
                else if (nonChunkBody != null) {
                    await w.write(new Uint8Array(nonChunkBody));
                }
                else {
                    await resp.body.pipeTo(new WritableStream({
                        write: async (chunk, controller) => {
                            await w.write(chunk);
                        }
                    }));
                }
            }
        }
    }
    exports.HttpServer = HttpServer;
    class HttpClient {
        constructor() {
            this.connections = {};
            this.connector = null;
            this.makeSsl = null;
        }
        async pWriteRequest(w, req) {
            let purl = new URL(req.url);
            let headersString = new Array();
            let chunked = req.headers.get('transfer-encoding')?.includes('chunked') ?? false;
            if (!req.headers.has('host')) {
                headersString.push('Host:' + purl.host);
            }
            req.headers.forEach((val, key) => {
                headersString.push(`${key}: ${val}`);
            });
            let nonChunkBody = null;
            if (!chunked && !req.headers.has('content-length')) {
                nonChunkBody = await req.arrayBuffer();
                headersString.push('Content-Length:' + String(nonChunkBody.byteLength));
            }
            await w.write(encode([
                `${req.method} ${purl.pathname}${purl.search} HTTP/1.1`,
                ...headersString,
                '\r\n'
            ].join('\r\n')));
            if (req.body != undefined) {
                if (chunked) {
                    await req.body.pipeTo(new WritableStream({
                        write: async (chunk, controller) => {
                            await w.write(new Uint8Array((0, base_1.ArrayBufferConcat)([encode(chunk.length.toString(16) + '\r\n'), chunk, encode('\r\n')])));
                        }
                    }));
                    await w.write(encode('0\r\n\r\n'));
                }
                else if (nonChunkBody != null) {
                    await w.write(new Uint8Array(nonChunkBody));
                }
                else {
                    await req.body.pipeTo(new WritableStream({
                        write: async (chunk, controller) => {
                            await w.write(chunk);
                        }
                    }));
                }
            }
        }
        async pParseHttpResponse(r) {
            let header1 = await parseHttpResponseHeader(r);
            let bodySource;
            let bodyCompleted = new base_1.future();
            if (header1.headers.get('transfer-encoding')?.includes('chunked')) {
                bodySource = {
                    pull: async (controller) => {
                        let length = Number.parseInt(decode(await r.readUntil('\n'.charCodeAt(0))).trim(), 16);
                        if (length == 0) {
                            let eoc = await r.readForNBytes(2);
                            (0, base_1.assert)(eoc[0] == 0xd && eoc[1] == 0xa);
                            controller.close();
                            bodyCompleted.setResult();
                        }
                        else {
                            let buf = await r.readForNBytes(length);
                            let eoc = await r.readForNBytes(2);
                            (0, base_1.assert)(eoc[0] == 0xd && eoc[1] == 0xa);
                            controller.enqueue(buf);
                        }
                    }
                };
            }
            else if (header1.headers.has('content-length')) {
                let contentLength = Number(header1.headers.get('content-length').trim());
                let remainBytes = contentLength;
                bodySource = {
                    pull: async (controller) => {
                        let buf = await r.read();
                        if (!buf.done) {
                            if (buf.value.byteLength > remainBytes) {
                                r.unshiftBuffer(new Uint8Array(buf.value.buffer, buf.value.byteOffset + remainBytes, buf.value.byteLength - remainBytes));
                                buf.value = new Uint8Array(buf.value.buffer, buf.value.byteOffset, remainBytes);
                            }
                            controller.enqueue(buf.value);
                            remainBytes -= buf.value.byteLength;
                        }
                        if (remainBytes == 0) {
                            controller.close();
                            bodyCompleted.setResult();
                        }
                    }
                };
            }
            else {
                bodySource = {
                    pull: async (controller) => {
                        controller.close();
                    }
                };
                bodyCompleted.setResult();
            }
            let resp = new ExtendHttpResponse(new ReadableStream(bodySource), {
                status: Number(header1.status),
                statusText: header1.statusText,
                headers: header1.headers
            });
            return { response: resp, bodyCompleted };
        }
        setConnector(connector) {
            this.connector = connector;
            return this;
        }
        setConnectorTjs(tjsConn) {
            return this.setConnector(async (url) => {
                let target = {
                    host: url.hostname,
                    port: 0
                };
                let isSsl = false;
                if (url.port === '') {
                    if (['http:', 'ws:'].includes(url.protocol)) {
                        target.port = 80;
                    }
                    else if (['https:', 'wss:'].includes(url.protocol)) {
                        target.port = 443;
                        isSsl = true;
                        (0, base_1.assert)(this.makeSsl != null);
                    }
                }
                else {
                    target.port = Number.parseInt(url.port);
                }
                if (tjsConn == undefined) {
                    let { buildTjs } = await new Promise((resolve_2, reject_2) => { require(['./tjsbuilder'], resolve_2, reject_2); });
                    tjsConn = (await buildTjs()).connect;
                }
                let c = await tjsConn('tcp', target.host, target.port);
                let t1 = {
                    r: new ReadableStream(new tjsutil_1.TjsReaderDataSource(c)),
                    w: new WritableStream(new tjsutil_1.TjsWriterDataSink(c))
                };
                if (isSsl) {
                    t1 = await this.makeSsl(t1, target.host);
                }
                return {
                    r: new jsutils2_1.ExtendStreamReader(t1.r.getReader()),
                    w: t1.w.getWriter()
                };
            });
        }
        async fetch(req) {
            (0, base_1.assert)(this.connector != null);
            let purl = new URL(req.url);
            let foundConn = Object.entries(this.connections).find(t1 => t1[0].startsWith(purl.origin + '/fetch') && t1[1].idle);
            if (foundConn == undefined) {
                let t1 = await this.connector(purl);
                foundConn = [purl.origin + '/fetch' + (0, base_1.GenerateRandomString)(), { r: t1.r, w: t1.w, idle: true }];
                this.connections[foundConn[0]] = foundConn[1];
                Promise.race([t1.w.closed, t1.r.closed]).then(() => delete this.connections[foundConn[0]]);
            }
            try {
                foundConn[1].idle = false;
                await this.pWriteRequest(foundConn[1].w, req);
                let res = await this.pParseHttpResponse(foundConn[1].r);
                res.bodyCompleted.get().then(() => foundConn[1].idle = true);
                return res.response;
            }
            catch (err) {
                foundConn[1].w.close().catch(() => { });
                throw err;
            }
        }
        async websocket(req) {
            (0, base_1.assert)(this.connector != null);
            let purl = new URL(req.url);
            let { r, w } = await this.connector(purl);
            let cid = purl.origin + '/ws' + (0, base_1.GenerateRandomString)();
            if (this.connections[cid] == undefined) {
                let newConn = await this.connector(purl);
                this.connections[cid] = { r: newConn.r, w: newConn.w, idle: false };
                Promise.race([newConn.w.closed, newConn.r.closed]).then(() => { delete this.connections[cid]; });
            }
            req.headers.set('Upgrade', 'websocket');
            req.headers.set('Connection', 'Upgrade');
            req.headers.set('Sec-WebSocket-Key', 'dGhlIHNhbXBsZSBub25jZQ==');
            req.headers.set('Sec-WebSocket-Version', '13');
            await this.pWriteRequest(w, req);
            let { response: resp } = await this.pParseHttpResponse(r);
            (0, base_1.assert)(resp.status == 101);
            return new WebSocketClientStreamHandler(r, w);
        }
        close() {
            for (let t1 of Object.values(this.connections)) {
                t1.w.close();
            }
        }
    }
    exports.HttpClient = HttpClient;
    class SimpleHttpServerRouter {
        constructor() {
            this.root = { map: {} };
            this.onfetch = async (req) => {
                let { pathname } = new URL(req.url);
                let parts = pathname.substring(1).split(/\//).filter(t1 => t1 != '');
                let cur = this.root;
                for (let t1 of parts) {
                    cur = cur.map[t1];
                    if (cur == undefined) {
                        return new Response(null, { status: 404 });
                    }
                    if (cur.fetch != undefined) {
                        return await cur.fetch(req);
                    }
                }
                return new Response(null, { status: 404 });
            };
            this.onwebsocket = async (controller) => {
                let req = controller.request;
                let { pathname } = new URL(req.url);
                let parts = pathname.substring(1).split(/\//).filter(t1 => t1.length > 0);
                let cur = this.root;
                for (let t1 of parts) {
                    cur = cur.map[t1];
                    if (cur == undefined) {
                        break;
                    }
                    if (cur.websocket != undefined) {
                        await cur.websocket(controller);
                        break;
                    }
                }
            };
        }
        ;
        setHandler(prefix, handler) {
            let parts = prefix.substring(1).split(/\//).filter(t1 => t1.length > 0);
            let cur = this.root;
            let parent = undefined;
            if (parts.length == 0 && handler != null) {
                this.root = handler;
            }
            else {
                for (let t1 of parts) {
                    parent = cur;
                    cur = cur.map[t1];
                    if (cur == undefined) {
                        cur = { map: {} };
                        parent.map[t1] = cur;
                    }
                }
                if (handler != null) {
                    parent.map[parts.at(-1)] = handler;
                }
                else {
                    delete parent.map[parts.at(-1)];
                }
            }
        }
    }
    exports.SimpleHttpServerRouter = SimpleHttpServerRouter;
    class SimpleFileServer {
        constructor(fs) {
            this.fs = fs;
            this.pathStartAt = 0;
            this.showIndex = true;
            this.cacheControl = async (filepath) => ({ maxAge: 86400 });
            this.interceptor = async () => null;
            this.onfetch = async (req) => {
                let { pathname } = new URL(req.url);
                let filepath = decodeURIComponent(pathname.substring(this.pathStartAt));
                try {
                    {
                        let t1 = await this.interceptor(filepath);
                        if (t1 !== null) {
                            return t1;
                        }
                    }
                    let filetype = await this.fs.filetype(filepath);
                    if (filetype === 'file') {
                        let statResult = await this.fs.stat(filepath);
                        let headers = new Headers();
                        headers.set('date', (0, base_1.GetCurrentTime)().toUTCString());
                        let t1 = await this.cacheControl(filepath);
                        if (typeof t1 === 'string') {
                            headers.set('cache-control', t1);
                        }
                        else {
                            headers.set('cache-control', 'max-age=' + t1.maxAge);
                        }
                        if (t1 !== 'no-store') {
                            let etag = String(statResult.mtime.getTime());
                            headers.set('etag', etag);
                            let ifNoneMatch = req.headers.get('If-None-Match');
                            if (ifNoneMatch === etag) {
                                return new Response(null, { status: 304, headers });
                            }
                        }
                        let fileNameAt = filepath.lastIndexOf('/');
                        let fileName = filepath.substring(fileNameAt + 1);
                        let extStartAt = fileName.lastIndexOf('.');
                        let ext = '';
                        if (extStartAt >= 0) {
                            ext = fileName.substring(extStartAt + 1);
                        }
                        if (ext in mimeDb) {
                            headers.set('content-type', mimeDb[ext]);
                        }
                        if (statResult.size < 0x8192) {
                            headers.set('content-length', String(statResult.size));
                        }
                        else {
                            headers.set('transfer-encoding', 'chunked');
                        }
                        return new Response(JsEnviron_1.simpleFileSystemHelper.getFileSystemReadableStream(this.fs, filepath), { status: 200, headers });
                    }
                    else if (filetype === 'dir' && this.showIndex) {
                        let children = await this.fs.listdir(filepath);
                        let lastName = pathname.substring(Math.max(0, pathname.lastIndexOf('/')));
                        return new Response(`<!DOCTYPE html>
				<html><head><meta charset="UTF-8"/></head>
					<body>${children.map(t1 => `<div><a href=".${lastName}/${t1.name}">${t1.name}</a></div>`).join('')}</body>
				</html>`, {
                            headers: { 'content-type': 'text/html' }
                        });
                    }
                    else {
                        throw new Error('Unsupported filetype');
                    }
                }
                catch (err) {
                    return new Response(err.toString(), { status: 404 });
                }
            };
        }
    }
    exports.SimpleFileServer = SimpleFileServer;
});
