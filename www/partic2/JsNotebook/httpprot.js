define(["require", "exports", "partic2/jsutils1/base", "partic2/CodeRunner/JsEnviron"], function (require, exports, base_1, JsEnviron_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SimpleFileServer = exports.HttpServer = exports.WebSocketServerConnection = void 0;
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
    class ProtocolSwitchResponse extends Response {
        get status() {
            return this.pStatus;
        }
        constructor(body, init) {
            let pStat = init?.status;
            if (init?.status != undefined) {
                init.status = 200;
            }
            super(body, init);
            this.closed = new base_1.future();
            this.pStatus = 101;
            if (pStat != undefined)
                this.pStatus = pStat;
        }
    }
    class WebSocketServerConnection {
        constructor(reader, writer) {
            this.reader = reader;
            this.writer = writer;
            this.closed = false;
            this.opcodes = { TEXT: 1, BINARY: 2, PING: 9, PONG: 10, CLOSE: 8 };
            this.queuedRecvData = new base_1.ArrayWrap2();
            this.pWsHeaderBuf = new Uint8Array(14);
            this.pCurrPacket = null;
            this.startProcessWebSocketStream();
        }
        async startProcessWebSocketStream() {
            while (!this.closed) {
                let readPos = new base_1.Ref2(0);
                while (readPos.get() < 2) {
                    await this.reader.readInto(this.pWsHeaderBuf, readPos);
                }
                let view = new DataView(this.pWsHeaderBuf.buffer, 0);
                let idx = 2, b1 = view.getUint8(0), fin = b1 & 128, opcode = b1 & 15, b2 = view.getUint8(1), hasMask = b2 & 128; //Must true
                if (this.pCurrPacket == null) {
                    if (this.pCurrPacket == null) {
                        this.pCurrPacket = { payloads: [], opcode };
                    }
                }
                let length = b2 & 127;
                if (length > 125) {
                    if (length == 126) {
                        while (readPos.get() < 4) {
                            await this.reader.readInto(this.pWsHeaderBuf, readPos);
                        }
                        length = view.getUint16(2, false);
                        idx += 2;
                    }
                    else if (length == 127) {
                        while (readPos.get() < 10) {
                            await this.reader.readInto(this.pWsHeaderBuf, readPos);
                        }
                        if (view.getUint32(2, false) != 0) {
                            this.close(1009, "");
                        }
                        length = view.getUint32(6, !1);
                        idx += 8;
                    }
                }
                while (readPos.get() < idx + 4) {
                    await this.reader.readInto(this.pWsHeaderBuf, readPos);
                }
                let maskBytes = this.pWsHeaderBuf.slice(idx, idx + 4);
                idx += 4;
                let payload = new Uint8Array(length);
                if (readPos.get() - idx > 0) {
                    this.reader.unshiftBuffer(new Uint8Array(this.pWsHeaderBuf.buffer, idx, readPos.get() - idx));
                }
                readPos.set(0);
                while (readPos.get() < length) {
                    await this.reader.readInto(payload, readPos);
                }
                for (let i = 0; i < payload.length; i++) {
                    payload[i] = maskBytes[i % 4] ^ payload[i];
                }
                this.pCurrPacket.payloads.push(payload);
                if (fin) {
                    this.handlePacket(this.pCurrPacket);
                    this.pCurrPacket = null;
                }
            }
        }
        async writeFrame(opcode, payload) {
            await this.writer.ready;
            return await this.writer.write(this.encodeMessage(opcode, payload));
        }
        async send(obj) {
            let opcode, payload;
            if (obj instanceof Uint8Array) {
                opcode = this.opcodes.BINARY;
                payload = obj;
            }
            else if (typeof obj == "string") {
                opcode = this.opcodes.TEXT;
                payload = encode(obj);
            }
            else {
                throw new Error("Cannot send object. Must be string or Uint8Array");
            }
            await this.writeFrame(opcode, payload);
        }
        async receive() {
            try {
                if (this.closed)
                    throw new Error('WebSocket closed');
                return await this.queuedRecvData.queueBlockShift();
            }
            catch (err) {
                if (err instanceof base_1.CanceledError && this.closed) {
                    throw new Error('WebSocket closed');
                }
                else {
                    throw err;
                }
            }
        }
        async close(code, reason) {
            const opcode = this.opcodes.CLOSE;
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
            await this.writeFrame(opcode, buffer);
            await this.writer.closed;
            this.closed = true;
            this.queuedRecvData.cancelWaiting();
            this.handshakeResponse?.closed.setResult(0);
        }
        async handlePacket(packet) {
            let concated = packet.payloads.length === 1 ?
                packet.payloads[0]
                : new Uint8Array((0, base_1.ArrayBufferConcat)(packet.payloads));
            switch (packet.opcode) {
                case this.opcodes.TEXT:
                    this.queuedRecvData.queueSignalPush(decode(concated));
                    break;
                case this.opcodes.BINARY:
                    this.queuedRecvData.queueBlockPush(concated);
                    break;
                case this.opcodes.PING:
                    await this.writeFrame(this.opcodes.PONG, concated);
                    break;
                case this.opcodes.PONG:
                    break;
                case this.opcodes.CLOSE:
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
        encodeMessage(opcode, payload) {
            let buf, b1 = 128 | opcode, b2 = 0, length = payload.length;
            if (length < 126) {
                buf = new Uint8Array(payload.length + 2 + 0);
                const view = new DataView(buf.buffer);
                b2 |= length;
                view.setUint8(0, b1);
                view.setUint8(1, b2);
                buf.set(payload, 2);
            }
            else if (length < 65536) {
                buf = new Uint8Array(payload.length + 2 + 2);
                const view = new DataView(buf.buffer);
                b2 |= 126;
                view.setUint8(0, b1);
                view.setUint8(1, b2);
                view.setUint16(2, length);
                buf.set(payload, 4);
            }
            else {
                buf = new Uint8Array(payload.length + 2 + 8);
                const view = new DataView(buf.buffer);
                b2 |= 127;
                view.setUint8(0, b1);
                view.setUint8(1, b2);
                view.setUint32(2, 0, !1);
                view.setUint32(6, length, !1);
                buf.set(payload, 10);
            }
            return buf;
        }
        async switchToWebsocket(req) {
            if (this.handshakeResponse != undefined)
                return this.handshakeResponse;
            // Use Web Cryptography API crypto.subtle where defined
            let key;
            if (globalThis.crypto.subtle) {
                key = globalThis.btoa([
                    ...new Uint8Array(await crypto.subtle.digest("SHA-1", encode(`${req.headers.get('sec-websocket-key')}${WebSocketServerConnection.KEY_SUFFIX}`))),
                ].map((s) => String.fromCodePoint(s)).join(""));
            }
            else {
                const { createHash } = await new Promise((resolve_1, reject_1) => { require(["tjs:hashing"], resolve_1, reject_1); });
                const hash = createHash("sha1").update(`${req.headers.get('sec-websocket-key')}${WebSocketServerConnection.KEY_SUFFIX}`).bytes();
                key = btoa(String.fromCodePoint(...hash));
            }
            this.handshakeResponse = new ProtocolSwitchResponse(null, {
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
    exports.WebSocketServerConnection = WebSocketServerConnection;
    WebSocketServerConnection.KEY_SUFFIX = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
    class HttpServer {
        constructor() {
            this.onfetch = async () => new Response();
            this.controller = new AbortController();
            this.signal = this.controller.signal;
        }
        async serve(stream) {
            while (!this.signal.aborted) {
                let req = await this.pParseHttpRequest(stream.r);
                let resp = await this.onfetch(req, { ...stream });
                await this.pWriteResponse(stream.w, resp);
                if (resp instanceof ProtocolSwitchResponse) {
                    try {
                        await resp.closed.get();
                    }
                    catch (err) {
                        (0, base_1.throwIfAbortError)(err);
                    }
                    break;
                }
            }
        }
        async pParseHttpHeader(r) {
            const lineSpliter = '\n'.charCodeAt(0);
            let reqHdr = decode(await r.readUntil(lineSpliter));
            let matchResult = reqHdr.match(HttpServer.requestExp);
            (0, base_1.assert)(matchResult != null);
            let method = matchResult[1];
            let pathname = matchResult[2];
            let httpVersion = matchResult[3];
            let headers = new Headers();
            for (let t1 = 0; t1 < 64 * 1024; t1++) {
                let line = decode(await r.readUntil(lineSpliter));
                if (line == '\r\n')
                    break;
                let sepAt = line.indexOf(':');
                headers.set(line.substring(0, sepAt), line.substring(sepAt + 1, line.length - 2).trim());
            }
            return { method, pathname, httpVersion, headers };
        }
        async pParseHttpRequest(r) {
            let header1 = await this.pParseHttpHeader(r);
            let bodySource;
            if (header1.headers.get('transfer-encoding') === 'chunked') {
                bodySource = {
                    pull: async (controller) => {
                        let length = Number(decode(await r.readUntil('\n'.charCodeAt(0))).trim());
                        if (length == 0) {
                            let eoc = new Uint8Array(2);
                            await r.readInto(eoc);
                            (0, base_1.assert)(decode(eoc) == '\r\n');
                            controller.close();
                        }
                        else {
                            let buf = new Uint8Array(length);
                            let writePos = new base_1.Ref2(0);
                            while (writePos.get() < length) {
                                await r.readInto(buf, writePos);
                            }
                            let eoc = new Uint8Array(2);
                            await r.readInto(eoc);
                            (0, base_1.assert)(decode(eoc) == '\r\n');
                            controller.enqueue(buf);
                        }
                    }
                };
            }
            else if (header1.headers.has('content-length')) {
                bodySource = {
                    pull: async (controller) => {
                        let contentLength = Number(header1.headers.get('content-length').trim());
                        let buf = new Uint8Array(contentLength);
                        let writePos = new base_1.Ref2(0);
                        while (writePos.get() < length) {
                            await r.readInto(buf, writePos);
                        }
                        controller.enqueue(buf);
                        controller.close();
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
            let url = header1.pathname;
            if (!url.startsWith('http:')) {
                url = 'http://';
                if (header1.headers.has('host')) {
                    url += header1.headers.get('host');
                }
                else {
                    url += '0.0.0.0:0';
                }
                url += header1.pathname;
            }
            let req = new Request(url, {
                method: header1.method,
                body: ['GET', 'HEAD'].includes(header1.method.toUpperCase()) ? undefined
                    : new ReadableStream(bodySource),
                headers: header1.headers
            });
            return req;
        }
        async pWriteResponse(w, resp) {
            let headersString = new Array();
            let chunked = resp.headers.get('transfer-encoding') == 'chunked';
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
                            await w.write(encode(String(chunk.length) + '\r\n'));
                            await w.write(chunk);
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
    HttpServer.requestExp = /^([A-Z-]+) ([^ ]+) HTTP\/([^ \t]+)\r\n$/;
    class SimpleFileServer {
        constructor(fs) {
            this.fs = fs;
            this.onfetch = async (req) => {
                let filepath = new URL(req.url).pathname;
                try {
                    (0, base_1.assert)(await this.fs.filetype(filepath) === 'file', 'Not a valid file');
                    let statResult = await this.fs.stat(filepath);
                    let headers = new Headers();
                    headers.set('content-length', String(statResult.size));
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
                    let t1 = new Response((0, JsEnviron_1.getFileSystemReadableStream)(this.fs, filepath), { headers });
                    return t1;
                }
                catch (err) {
                    return new Response(err.toString(), { status: 404 });
                }
            };
        }
    }
    exports.SimpleFileServer = SimpleFileServer;
});
//# sourceMappingURL=httpprot.js.map