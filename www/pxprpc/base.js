define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Server = exports.PxpRef = exports.PxpRequest = exports.Client = exports.PxprpcRemoteError = exports.Serializer = void 0;
    class Serializer {
        constructor() {
            this.pos = 0;
        }
        prepareUnserializing(buf) {
            this.dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
            return this;
        }
        prepareSerializing(initBufSize) {
            this.dv = new DataView(new ArrayBuffer(initBufSize));
            return this;
        }
        getInt() {
            let val = this.dv.getInt32(this.pos, true);
            this.pos += 4;
            return val;
        }
        getLong() {
            let val = this.dv.getBigInt64(this.pos, true);
            this.pos += 8;
            return val;
        }
        getFloat() {
            let val = this.dv.getFloat32(this.pos, true);
            this.pos += 4;
            return val;
        }
        getDouble() {
            let val = this.dv.getFloat64(this.pos, true);
            this.pos += 8;
            return val;
        }
        getVarint() {
            let val = this.dv.getUint8(this.pos);
            this.pos++;
            if (val === 0xff) {
                val = this.dv.getUint32(this.pos, true);
                this.pos += 4;
            }
            return val;
        }
        putInt(val) {
            this.ensureBuffer(4);
            this.dv.setInt32(this.pos, val, true);
            this.pos += 4;
            return this;
        }
        putLong(val) {
            this.ensureBuffer(8);
            this.dv.setBigInt64(this.pos, val, true);
            this.pos += 8;
            return this;
        }
        putFloat(val) {
            this.ensureBuffer(4);
            this.dv.setFloat32(this.pos, val, true);
            this.pos += 4;
            return this;
        }
        putDouble(val) {
            this.ensureBuffer(8);
            this.dv.setFloat64(this.pos, val, true);
            this.pos += 8;
            return this;
        }
        putVarint(val) {
            if (val >= 0xff) {
                this.ensureBuffer(5);
                this.dv.setUint8(this.pos, 0xff);
                this.pos += 1;
                this.dv.setUint32(this.pos, val, true);
                this.pos += 4;
            }
            else {
                this.ensureBuffer(1);
                this.dv.setUint8(this.pos, val);
                this.pos++;
            }
        }
        ensureBuffer(remainSize) {
            if (this.pos + remainSize > this.dv.buffer.byteLength) {
                let newSize = this.pos + remainSize;
                newSize += newSize >> 1;
                let buf = new Uint8Array(newSize);
                buf.set(new Uint8Array(this.dv.buffer, this.dv.byteOffset, this.pos), 0);
                this.dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
            }
        }
        putBytes(b) {
            let len = b.byteLength;
            this.putVarint(len);
            this.ensureBuffer(len);
            new Uint8Array(this.dv.buffer).set(b, this.dv.byteOffset + this.pos);
            this.pos += len;
            return this;
        }
        putString(val) {
            this.putBytes(new TextEncoder().encode(val));
            return this;
        }
        build() {
            return new Uint8Array(this.dv.buffer, this.dv.byteOffset, this.pos);
        }
        getBytes() {
            let len = this.getVarint();
            let val = new Uint8Array(this.dv.buffer, this.dv.byteOffset + this.pos, len);
            this.pos += len;
            return val;
        }
        getString() {
            return new TextDecoder().decode(this.getBytes());
        }
    }
    exports.Serializer = Serializer;
    class PxprpcRemoteError extends Error {
    }
    exports.PxprpcRemoteError = PxprpcRemoteError;
    class Client {
        constructor(io1) {
            this.io1 = io1;
            this.running = false;
            this.waitingSessionCb = {};
            this.respReadingCb = () => { };
        }
        async run() {
            if (this.running)
                return;
            this.running = true;
            try {
                while (this.running) {
                    let buf = await this.io1.receive();
                    let packet = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
                    let sid = packet.getUint32(0, true);
                    let cb = this.waitingSessionCb[sid & 0x7fffffff];
                    delete this.waitingSessionCb[sid & 0x7fffffff];
                    cb(null, [sid, new Uint8Array(buf.buffer, buf.byteOffset + 4, buf.byteLength - 4)]);
                }
            }
            catch (e) {
                for (let k in this.waitingSessionCb) {
                    let cb = this.waitingSessionCb[k];
                    cb(e);
                }
            }
            finally {
                this.running = false;
            }
        }
        isRunning() {
            return this.running;
        }
        async call(callableIndex, parameter, sid = 0x100) {
            let hdr = new Uint8Array(8);
            let hdr2 = new DataView(hdr.buffer);
            hdr2.setUint32(0, sid, true);
            hdr2.setInt32(4, callableIndex, true);
            let respFut = new Promise((resolve, reject) => {
                this.waitingSessionCb[sid] = (err, resp) => {
                    if (err == null) {
                        resolve(resp);
                    }
                    else {
                        reject(err);
                    }
                    ;
                };
            });
            await this.io1.send([hdr, ...parameter]);
            let [sid2, result] = await respFut;
            if (sid != sid2) {
                throw new PxprpcRemoteError(new TextDecoder().decode(result));
            }
            return result;
        }
        async getFunc(funcName, sid = 0x100) {
            let result = await this.call(-1, [new TextEncoder().encode(funcName)], sid);
            return new DataView(result.buffer, result.byteOffset, result.byteLength).getInt32(0, true);
        }
        async freeRef(index, sid = 0x100) {
            let para = new DataView(new ArrayBuffer(index.length << 2));
            for (let i = 0; i < index.length; i++) {
                para.setInt32(i << 2, index[i], true);
            }
            await this.call(-2, [new Uint8Array(para.buffer, para.byteOffset, para.byteLength)], sid);
        }
        async close(sid = 0x100) {
            let hdr = new Uint8Array(8);
            let hdr2 = new DataView(hdr.buffer);
            hdr2.setUint32(0, sid, true);
            hdr2.setInt32(4, -3, true);
            await this.io1.send([hdr]);
            this.running = false;
            this.io1.close();
        }
        async getInfo(sid = 0x100) {
            let result = await this.call(-4, [], sid);
            return new TextDecoder().decode(result);
        }
        async sequence(mask, maskCnt = 24, sid = 0x100) {
            let hdr = new Uint8Array(4);
            new DataView(hdr.buffer).setUint32(0, mask | maskCnt, true);
            return await this.call(-5, [hdr], sid);
        }
    }
    exports.Client = Client;
    class PxpRequest {
        constructor(context, session) {
            this.context = context;
            this.session = session;
            this.callableIndex = -1;
            this.result = [];
            this.rejected = null;
            this.nextPending = null;
            this.inSequence = false;
        }
    }
    exports.PxpRequest = PxpRequest;
    class PxpRef {
        constructor(index) {
            this.index = index;
            this.object = null;
            this.onFree = null;
            this.nextFree = null;
        }
    }
    exports.PxpRef = PxpRef;
    let RefPoolExpandCount = 256;
    class Server {
        constructor(io1) {
            this.io1 = io1;
            this.refPool = new Array();
            this.sequenceSession = 0xffffffff;
            this.sequenceMaskBitsCnt = 0;
            this.freeRefEntry = null;
            this.running = false;
            this.pendingRequests = {};
            this.builtInCallable = [null, this.getFunc, this.freeRefHandler, this.closeHandler, this.getInfo, this.sequence];
            this.funcMap = null;
        }
        queueRequest(r) {
            if (this.sequenceSession === 0xffffffff || (r.session >>> (32 - this.sequenceMaskBitsCnt) != this.sequenceSession)) {
                this.processRequest(r);
                return;
            }
            r.inSequence = true;
            let r2 = this.pendingRequests[r.session];
            if (r2 == undefined) {
                this.pendingRequests[r.session] = r;
                this.processRequest(r);
            }
            else {
                while (r2.nextPending != null) {
                    r2 = r2.nextPending;
                }
                r2.nextPending = r;
            }
        }
        //return next request to process
        finishRequest(r) {
            if (r.inSequence) {
                if (r.nextPending != null) {
                    this.pendingRequests[r.session] = r.nextPending;
                    return r.nextPending;
                }
                else {
                    delete this.pendingRequests[r.session];
                    return null;
                }
            }
            else {
                return null;
            }
        }
        expandRefPools() {
            let start = this.refPool.length;
            let end = this.refPool.length + RefPoolExpandCount - 1;
            for (let i = start; i <= end; i++) {
                this.refPool.push(new PxpRef(i));
            }
            for (let i = start; i < end; i++) {
                this.refPool[i].nextFree = this.refPool[i + 1];
            }
            this.refPool[end].nextFree = this.freeRefEntry;
            this.freeRefEntry = this.refPool[start];
        }
        allocRef() {
            if (this.freeRefEntry == null) {
                this.expandRefPools();
            }
            let ref2 = this.freeRefEntry;
            this.freeRefEntry = this.freeRefEntry.nextFree;
            return ref2;
        }
        freeRef(ref2) {
            if (ref2.onFree != null) {
                ref2.onFree();
                ref2.onFree = null;
            }
            ref2.object = null;
            ref2.nextFree = this.freeRefEntry;
            this.freeRefEntry = ref2;
        }
        getRef(index) {
            return this.refPool[index];
        }
        async freeRefHandler(r) {
            let dv = new DataView(r.parameter.buffer, r.parameter.byteOffset, r.parameter.byteLength);
            for (let i = 0; i < r.parameter.byteLength; i += 4) {
                this.freeRef(this.getRef(dv.getInt32(i, true)));
            }
        }
        async closeHandler(r) {
            this.close();
        }
        async processRequest(r) {
            try {
                while (r != null) {
                    if (r.callableIndex >= 0) {
                        await this.getRef(r.callableIndex).object.call(r);
                    }
                    else {
                        await this.builtInCallable[-r.callableIndex].call(this, r);
                    }
                    //abort if closed
                    if (r.callableIndex === -3)
                        return;
                    let sid = new DataView(new ArrayBuffer(4));
                    if (r.rejected === null) {
                        sid.setUint32(0, r.session, true);
                        await this.io1.send([new Uint8Array(sid.buffer), ...r.result]);
                    }
                    else {
                        sid.setUint32(0, r.session ^ 0x80000000, true);
                        await this.io1.send([new Uint8Array(sid.buffer), new TextEncoder().encode(String(r.rejected))]);
                    }
                    r = this.finishRequest(r);
                }
            }
            catch (e) {
                // mute all error here.
            }
        }
        async serve() {
            if (this.running)
                return;
            this.running = true;
            try {
                while (this.running) {
                    let buf = await this.io1.receive();
                    let packet = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
                    let r = new PxpRequest(this, packet.getUint32(0, true));
                    r.callableIndex = packet.getInt32(4, true);
                    r.parameter = new Uint8Array(buf.buffer, buf.byteOffset + 8, buf.byteLength - 8);
                    this.queueRequest(r);
                }
            }
            finally {
                this.close();
            }
        }
        async getFunc(r) {
            let name = new TextDecoder().decode(r.parameter);
            let found = this.funcMap?.(name);
            let res = new DataView(new ArrayBuffer(4));
            if (found == null) {
                res.setInt32(0, -1, true);
            }
            else {
                let ref2 = this.allocRef();
                ref2.object = found;
                res.setInt32(0, ref2.index, true);
            }
            r.result = [new Uint8Array(res.buffer)];
        }
        async getInfo(r) {
            r.result = [new TextEncoder().encode("server name:pxprpc for typescript\n" +
                    "version:2.0\n")];
        }
        async sequence(r) {
            this.sequenceSession = new DataView(r.parameter.buffer, r.parameter.byteOffset, r.parameter.byteLength).getUint32(0, true);
            if (this.sequenceSession === 0xffffffff) {
                //discard pending request. execute immdiately mode, default value
                for (let i2 in this.pendingRequests) {
                    let r2 = this.pendingRequests[i2];
                    r2.nextPending = null;
                }
                this.pendingRequests = this.pendingRequests;
            }
            else {
                this.sequenceMaskBitsCnt = this.sequenceSession & 0xff;
                this.sequenceSession = this.sequenceSession >>> (32 - this.sequenceMaskBitsCnt);
            }
        }
        close() {
            if (!this.running)
                return;
            this.running = false;
            this.io1.close();
            for (let ref2 of this.refPool) {
                if (ref2.onFree != null) {
                    ref2.onFree();
                    ref2.onFree = null;
                }
                ref2.object = null;
            }
        }
    }
    exports.Server = Server;
});
//# sourceMappingURL=base.js.map