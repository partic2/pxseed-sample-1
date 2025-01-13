define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WebMessage = exports.WebSocketIo = void 0;
    class WebSocketIo {
        constructor() {
            this.queuedData = new Array();
            this.onmsg = null;
            this.ws = null;
        }
        async wrap(ws) {
            this.ws = ws;
            var that = this;
            this.ws.binaryType = 'arraybuffer';
            ws.addEventListener('message', function (ev) {
                that.queuedData.push(new Uint8Array(ev.data));
                if (that.onmsg != null)
                    that.onmsg(null);
            });
            ws.addEventListener('close', function (ev) {
                if (that.onmsg != null)
                    that.onmsg(new Error('Websocket EOF'));
            });
            ws.addEventListener('error', function (ev) {
                ws.close();
                if (that.onmsg != null)
                    that.onmsg(new Error(String(ev)));
            });
            return this;
        }
        ensureConnected() {
            let that = this;
            return new Promise((resolve, reject) => {
                if (that.ws.readyState === WebSocket.CONNECTING) {
                    that.ws.addEventListener('open', function (ev) {
                        resolve(that);
                    });
                    let onerr = function (ev) {
                        that.ws.removeEventListener('error', onerr);
                        reject(new Error('WebSocket error'));
                    };
                    that.ws.addEventListener('error', onerr);
                }
                else if (that.ws.readyState === WebSocket.OPEN) {
                    resolve(that);
                }
                else {
                    reject(new Error('Invalid WebSocket readyState:' + this.ws.readyState));
                }
            });
        }
        async connect(url) {
            await (await this.wrap(new WebSocket(url))).ensureConnected();
            return this;
        }
        async receive() {
            if (this.ws?.readyState != WebSocket.OPEN) {
                throw new Error('Illegal websocket readState ' + String(this.ws?.readyState));
            }
            if (this.queuedData.length > 0) {
                return this.queuedData.shift();
            }
            else {
                let that = this;
                await new Promise((resolve, reject) => {
                    that.onmsg = (err) => {
                        that.onmsg = null;
                        if (err === null) {
                            resolve(null);
                        }
                        else {
                            reject(err);
                        }
                    };
                });
                return this.queuedData.shift();
            }
        }
        async send(data) {
            if (this.ws?.readyState != WebSocket.OPEN) {
                throw new Error('Illegal websocket readState ' + String(this.ws?.readyState));
            }
            let len = data.reduce((prev, curr) => prev + curr.byteLength, 0);
            let buf = new Uint8Array(len);
            let pos = 0;
            for (let b of data) {
                buf.set(new Uint8Array(b.buffer, b.byteOffset, b.byteLength), pos);
                pos += b.byteLength;
            }
            this.ws.send(buf.buffer);
        }
        close() {
            this.ws?.close();
        }
    }
    exports.WebSocketIo = WebSocketIo;
    exports.WebMessage = (function () {
        //mark for pxprpc message
        const pxprpcMessageMark = '__messageMark_pxprpc';
        //extra options for postMessage, like 'targetOrigin'
        //Take care for security risk.
        const postMessageOptions = {};
        let servers = {};
        let connections = {};
        let boundList = [];
        function listener(msg) {
            if (typeof msg.data === 'object' && Boolean(msg.data[pxprpcMessageMark])) {
                let type = msg.data.type;
                let id = msg.data.id;
                //for Dedicate Worker, use msg.target
                let source = msg.source ?? msg.target;
                if (type === 'connect') {
                    let servId = msg.data.servId;
                    let serv = servers[servId];
                    if (serv === undefined) {
                        source.postMessage({ [pxprpcMessageMark]: true, type: 'notfound', id: id }, postMessageOptions);
                    }
                    else {
                        let conn = new Connection();
                        conn.connected = true;
                        conn.id = id;
                        conn.port = source;
                        connections[conn.id] = conn;
                        source.postMessage({ [pxprpcMessageMark]: true, type: 'connected', id: id }, postMessageOptions);
                        serv.onConnection(conn);
                    }
                }
                else if (type === 'connected') {
                    let conn = connections[id];
                    if (conn === undefined) {
                        source.postMessage({ [pxprpcMessageMark]: true, type: 'closed', id: id }, postMessageOptions);
                    }
                    else {
                        //Only handle the first 'connected' event.
                        if (!conn.connected) {
                            conn.connected = true;
                            conn.port = source;
                            conn.onmsg?.(null);
                        }
                    }
                }
                else if (type === 'notfound') {
                    let conn = connections[id];
                    if (conn !== undefined) {
                        conn.__notfoundResponse();
                    }
                }
                else if (type === 'data') {
                    let conn = connections[id];
                    if (conn === undefined) {
                        source.postMessage({ [pxprpcMessageMark]: true, type: 'closed', id: id }, postMessageOptions);
                    }
                    else {
                        conn.queuedData.push(new Uint8Array(msg.data.data));
                        conn.onmsg?.(null);
                    }
                }
                else if (type === 'closed') {
                    let conn = connections[id];
                    if (conn !== undefined) {
                        conn.connected = false;
                        delete connections[id];
                        conn.onmsg?.(new Error('WebMessageConnection closed'));
                    }
                }
            }
        }
        function bind(messagePort) {
            boundList.push(messagePort);
            messagePort.addEventListener('message', listener);
        }
        function unbind(messagePort) {
            messagePort.removeEventListener('message', listener);
            let idx = boundList.findIndex(v => v === messagePort);
            if (idx >= 0) {
                boundList.splice(idx, 1);
            }
        }
        class Server {
            constructor(onConnection) {
                this.onConnection = onConnection;
                this.id = '';
            }
            listen(id) {
                this.id = id;
                if (servers[id] !== undefined) {
                    throw new Error('WebMessageServer listen failed, id already in used');
                }
                servers[id] = this;
            }
            close() {
                delete servers[this.id];
            }
        }
        class Connection {
            constructor() {
                this.queuedData = new Array();
                this.onmsg = null;
                this.id = '';
                this.connected = false;
                this.__broadcastCount = 0;
                this.__notfoundCount = 0;
            }
            async connect(servId, timeout) {
                this.id = (new Date().getTime() % 2176782336).toString(36) + '-' + Math.floor(Math.random() * 2176782336).toString(36);
                connections[this.id] = this;
                try {
                    this.__broadcastCount = boundList.length;
                    if (this.__broadcastCount === 0) {
                        throw new Error('WebMessageConnection connect failed. server not found.');
                    }
                    for (let port of boundList) {
                        port.postMessage({ [pxprpcMessageMark]: true, id: this.id, type: 'connect', servId }, { transfer: [], ...postMessageOptions });
                    }
                    if (!this.connected) {
                        await this.__waitMessage(timeout);
                    }
                    if (!this.connected) {
                        throw new Error('WebMessageConnection connect failed. timeout. server not found.');
                    }
                    return this;
                }
                catch (e) {
                    delete connections[this.id];
                    throw e;
                }
            }
            __waitMessage(timeout) {
                return new Promise((resolve, reject) => {
                    let timer1 = null;
                    if (timeout != undefined) {
                        timer1 = setTimeout(() => {
                            this.onmsg = null;
                            resolve(null);
                        }, timeout);
                    }
                    this.onmsg = (err) => {
                        if (timer1 != null) {
                            clearTimeout(timer1);
                        }
                        this.onmsg = null;
                        if (err === null) {
                            resolve(null);
                        }
                        else {
                            reject(err);
                        }
                    };
                });
            }
            __notfoundResponse() {
                this.__notfoundCount++;
                if (!this.connected && this.__notfoundCount >= this.__broadcastCount) {
                    this.onmsg?.(new Error('WebMessageConnection connect failed. server not found.'));
                }
            }
            async receive() {
                if (!this.connected) {
                    throw new Error('WebMessageConnection receive failed, Not connected.');
                }
                if (this.queuedData.length > 0) {
                    return this.queuedData.shift();
                }
                else {
                    await this.__waitMessage();
                    return this.queuedData.shift();
                }
            }
            async send(data) {
                if (!this.connected) {
                    throw new Error('WebMessageConnection send failed, Not connected.');
                }
                let len = data.reduce((prev, curr) => prev + curr.byteLength, 0);
                let buf = new Uint8Array(len);
                let pos = 0;
                for (let b of data) {
                    buf.set(new Uint8Array(b.buffer, b.byteOffset, b.byteLength), pos);
                    pos += b.byteLength;
                }
                this.port.postMessage({ [pxprpcMessageMark]: true, id: this.id, type: 'data', data: buf.buffer }, { transfer: [buf.buffer], ...postMessageOptions });
            }
            close() {
                this.port.postMessage({ [pxprpcMessageMark]: true, type: 'closed', id: this.id }, postMessageOptions);
                this.connected = false;
                delete connections[this.id];
            }
        }
        return { bind, unbind, Server, Connection, postMessageOptions };
    })();
});
//# sourceMappingURL=backend.js.map