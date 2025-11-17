define(["require", "exports", "./base"], function (require, exports, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TableSerializer = exports.RpcExtendServer1 = exports.defaultFuncMap = exports.RpcExtendServerCallable = exports.RpcExtendClient1 = exports.RpcExtendClientCallable = exports.RpcExtendClientObject = exports.RpcExtendError = void 0;
    exports.allocRefFor = allocRefFor;
    class RpcExtendError extends Error {
    }
    exports.RpcExtendError = RpcExtendError;
    //Client side
    class RpcExtendClientObject {
        constructor(client, value) {
            this.client = client;
            this.value = value;
        }
        async free() {
            if (this.value != undefined) {
                let sid = this.client.allocSid();
                let v = this.value;
                this.value = undefined;
                try {
                    await this.client.baseClient.freeRef([v], sid);
                }
                finally {
                    this.client.freeSid(sid);
                }
            }
        }
        async asCallable() {
            let value = this.value;
            this.value = undefined;
            return new RpcExtendClientCallable(this.client, value);
        }
    }
    exports.RpcExtendClientObject = RpcExtendClientObject;
    class RpcExtendClientCallable extends RpcExtendClientObject {
        constructor(client, value) {
            super(client, value);
            this.tParam = '';
            this.tResult = '';
        }
        /*
    function typedecl
    format: 'parameters type->return type'
    eg:
    a function defined in c:
    bool fn(uin32_t,uint64_t,float64_t,struct pxprpc_object *)
    defined in java:
    boolean fn(int,int,double,Object)
    ...
    it's pxprpc typedecl:
    iido->c
    
    available type typedecl characters:
    i  int(32bit integer)
    l  long(64bit integer)
    f  float(32bit float)
    d  double(64bit float)
    o  object(32bit reference address)
    b  bytes(bytes buffer)
    '' return void(32bit 0)
    
    c  boolean(pxprpc use 1byte(1/0) to store a boolean value)
    s  string(bytes will be decode to string)
    */
        typedecl(decl) {
            [this.tParam, this.tResult] = decl.split('->');
            return this;
        }
        serArgs(args) {
            let buf = [];
            if (this.tParam === 'b') {
                let abuf = args[0];
                buf = [abuf];
            }
            else {
                let ser = new base_1.Serializer().prepareSerializing(32);
                new TableSerializer().
                    bindContext(null, this.client).bindSerializer(ser).setColumnsInfo(this.tParam, null).
                    putRowsData([args]);
                let serbuf = ser.build();
                buf = [serbuf];
            }
            return buf;
        }
        unserRet(resp) {
            if (this.tResult === 'b') {
                return resp;
            }
            else {
                let ser = new base_1.Serializer().prepareUnserializing(resp);
                let rets = new TableSerializer().
                    bindContext(null, this.client).bindSerializer(ser).setColumnsInfo(this.tResult, null).
                    getRowsData(1)[0];
                if (this.tResult.length === 1) {
                    return rets[0];
                }
                else if (this.tResult.length === 0) {
                    return null;
                }
                else {
                    return rets;
                }
            }
        }
        async call(...args) {
            let buf = this.serArgs(args);
            let sid = this.client.allocSid();
            try {
                this.client.throwIfNotRunning();
                let resp = await this.client.baseClient.call(this.value, buf, sid);
                return this.unserRet(resp);
            }
            finally {
                this.client.freeSid(sid);
            }
        }
        async poll(onResult, ...args) {
            let buf = this.serArgs(args);
            let sid = this.client.allocSid();
            this.client.throwIfNotRunning();
            this.client.baseClient.poll(this.value, buf, (err, result) => {
                if (err !== null) {
                    this.client.freeSid(sid);
                    onResult(err);
                }
                else {
                    onResult(null, this.unserRet(result));
                }
            }, sid);
        }
    }
    exports.RpcExtendClientCallable = RpcExtendClientCallable;
    class RpcExtendClient1 {
        constructor(baseClient) {
            this.baseClient = baseClient;
            this.__usedSid = {};
            this.__sidStart = 1;
            this.__sidEnd = 0xffff;
            this.__nextSid = this.__sidStart;
        }
        async init() {
            this.baseClient.run();
            for (let item of (await this.baseClient.getInfo()).split('\n')) {
                if (item.indexOf(':') >= 0) {
                    let [key, val] = item.split(':');
                    if (key === 'server name') {
                        this.serverName = val;
                    }
                }
            }
            return this;
        }
        allocSid() {
            let reachEnd = false;
            while (this.__usedSid[this.__nextSid] === true) {
                this.__nextSid += 1;
                if (this.__nextSid >= this.__sidEnd) {
                    if (reachEnd) {
                        throw new RpcExtendError('No sid available');
                    }
                    else {
                        reachEnd = true;
                        this.__nextSid = this.__sidStart;
                    }
                }
            }
            let t1 = this.__nextSid;
            this.__nextSid += 1;
            if (this.__nextSid >= this.__sidEnd) {
                this.__nextSid = this.__sidStart;
            }
            this.__usedSid[t1] = true;
            return t1;
        }
        freeSid(index) {
            delete this.__usedSid[index];
        }
        throwIfNotRunning() {
            if (!this.baseClient.isRunning()) {
                throw new RpcExtendError('baseClient is not running.');
            }
        }
        async getFunc(name) {
            this.throwIfNotRunning();
            let sid = this.allocSid();
            try {
                let index = await this.baseClient.getFunc(name, sid);
                if (index === -1)
                    return null;
                return new RpcExtendClientCallable(this, index);
            }
            finally {
                this.freeSid(sid);
            }
        }
        async close() {
            await this.baseClient.close();
        }
    }
    exports.RpcExtendClient1 = RpcExtendClient1;
    //Server side
    //auto '.close' on free
    function allocRefFor(serv, obj) {
        let ref = serv.allocRef();
        ref.object = obj;
        if ((typeof obj === 'object') && ('close' in obj)) {
            ref.onFree = () => obj.close();
        }
        return ref;
    }
    class RpcExtendServerCallable {
        constructor(wrapped) {
            this.wrapped = wrapped;
            this.tParam = '';
            this.tResult = '';
        }
        //See RpcExtendClientCallable.typedecl
        typedecl(decl) {
            let [tParam, tResult] = decl.split('->');
            this.tParam = tParam;
            this.tResult = tResult;
            return this;
        }
        readParameter(req) {
            let buf = req.parameter;
            let param = [];
            if (this.tParam === 'b') {
                param = [new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)];
            }
            else {
                let ser = new base_1.Serializer().prepareUnserializing(buf);
                param = new TableSerializer().
                    bindContext(req.context, null).bindSerializer(ser).setColumnsInfo(this.tParam, null).
                    getRowsData(1)[0];
            }
            return param;
        }
        async call(req) {
            try {
                let r = await this.wrapped.apply(this, this.readParameter(req));
                req.result = this.writeResult(req, r);
            }
            catch (e) {
                return req.rejected = e;
            }
        }
        writeResult(req, r) {
            if (this.tResult === 'b') {
                return [r];
            }
            else {
                let ser = new base_1.Serializer().prepareSerializing(8);
                let results = this.tResult.length > 1 ? r : [r];
                new TableSerializer().
                    bindContext(req.context, null).bindSerializer(ser).setColumnsInfo(this.tResult, null).
                    putRowsData([results]);
                let buf = ser.build();
                if (buf.byteLength == 0)
                    return [];
                return [buf];
            }
        }
    }
    exports.RpcExtendServerCallable = RpcExtendServerCallable;
    exports.defaultFuncMap = {};
    exports.defaultFuncMap['builtin.anyToString'] = new RpcExtendServerCallable(async (obj) => String(obj)).typedecl('o->s');
    exports.defaultFuncMap['builtin.jsExec'] = new RpcExtendServerCallable(async (code, arg) => {
        let r = (new Function('arg', code))(arg);
        if (r instanceof Promise) {
            r = await r;
        }
        return r;
    }).typedecl('so->o');
    exports.defaultFuncMap['builtin.typeof'] = new RpcExtendServerCallable(async (arg) => typeof arg).typedecl('o->s');
    exports.defaultFuncMap['builtin.toJSON'] = new RpcExtendServerCallable(async (arg) => JSON.stringify(arg)).typedecl('o->s');
    exports.defaultFuncMap['builtin.fromJSON'] = new RpcExtendServerCallable(async (arg) => JSON.parse(arg)).typedecl('s->o');
    exports.defaultFuncMap['builtin.bufferData'] = new RpcExtendServerCallable(async (arg) => arg).typedecl('o->b');
    exports.defaultFuncMap['pxprpc_pp.io_send'] = new RpcExtendServerCallable(async (io, arg) => io.send([arg])).typedecl('ob->');
    exports.defaultFuncMap['pxprpc_pp.io_receive'] = new RpcExtendServerCallable(async (io) => await io.receive()).typedecl('o->b');
    class RpcExtendServer1 {
        constructor(serv) {
            this.serv = serv;
            this.funcMap = exports.defaultFuncMap;
            serv.funcMap = (name) => this.findFunc(name);
        }
        async serve() {
            await this.serv.serve();
        }
        findFunc(name) {
            return this.funcMap[name];
        }
    }
    exports.RpcExtendServer1 = RpcExtendServer1;
    class TableSerializer {
        constructor() {
            this.FLAG_NO_COLUMN_NAME = 1;
            this.columnsName = null;
            this.columnsType = null;
            this.rows = [];
            this.boundServContext = null;
            this.boundClieContext = null;
            this.ser = null;
        }
        setColumnsInfo(types, names) {
            this.columnsName = names;
            this.columnsType = types;
            return this;
        }
        bindContext(serv, clie) {
            this.boundServContext = serv;
            this.boundClieContext = clie;
            return this;
        }
        bindSerializer(ser) {
            this.ser = ser;
            return this;
        }
        getRow(index) {
            return this.rows[index];
        }
        getRowCount() {
            return this.rows.length;
        }
        addRow(row) {
            this.rows.push(row);
            return this;
        }
        getRowsData(rowCnt) {
            let rows = [];
            let colCnt = this.columnsType.length;
            let ser = this.ser;
            for (let i1 = 0; i1 < rowCnt; i1++) {
                rows.push(new Array(colCnt));
            }
            for (let i1 = 0; i1 < colCnt; i1++) {
                let type = this.columnsType.charAt(i1);
                switch (type) {
                    case 'i':
                        for (let i2 = 0; i2 < rowCnt; i2++) {
                            rows[i2][i1] = ser.getInt();
                        }
                        break;
                    case 'l':
                        for (let i2 = 0; i2 < rowCnt; i2++) {
                            rows[i2][i1] = ser.getLong();
                        }
                        break;
                    case 'f':
                        for (let i2 = 0; i2 < rowCnt; i2++) {
                            rows[i2][i1] = ser.getFloat();
                        }
                        break;
                    case 'd':
                        for (let i2 = 0; i2 < rowCnt; i2++) {
                            rows[i2][i1] = ser.getDouble();
                        }
                        break;
                    case 'b':
                        for (let i2 = 0; i2 < rowCnt; i2++) {
                            rows[i2][i1] = ser.getBytes();
                        }
                        break;
                    case 's':
                        for (let i2 = 0; i2 < rowCnt; i2++) {
                            rows[i2][i1] = ser.getString();
                        }
                        break;
                    case 'c':
                        for (let i2 = 0; i2 < rowCnt; i2++) {
                            rows[i2][i1] = ser.getVarint() !== 0;
                        }
                        break;
                    case 'o':
                        for (let i2 = 0; i2 < rowCnt; i2++) {
                            let val = ser.getInt();
                            if (val === -1) {
                                rows[i2][i1] = null;
                            }
                            else {
                                if (this.boundServContext != null) {
                                    rows[i2][i1] = this.boundServContext.getRef(val).object;
                                }
                                else {
                                    rows[i2][i1] = new RpcExtendClientObject(this.boundClieContext, val);
                                }
                            }
                        }
                        break;
                    default:
                        throw new RpcExtendError("Unknown Type");
                }
            }
            return rows;
        }
        load(buf) {
            if (buf != null) {
                this.bindSerializer(new base_1.Serializer().prepareUnserializing(buf));
            }
            let ser = this.ser;
            let flag = ser.getVarint();
            let rowCnt = ser.getVarint();
            this.columnsType = ser.getString();
            let colCnt = this.columnsType.length;
            if ((flag & this.FLAG_NO_COLUMN_NAME) === 0) {
                this.columnsName = [];
                for (let i1 = 0; i1 < colCnt; i1++) {
                    this.columnsName.push(ser.getString());
                }
            }
            this.rows = this.getRowsData(rowCnt);
            return this;
        }
        putRowsData(rows) {
            let colCnt = this.columnsType.length;
            let rowCnt = rows.length;
            let ser = this.ser;
            for (let i1 = 0; i1 < colCnt; i1++) {
                let type = this.columnsType.charAt(i1);
                switch (type) {
                    case 'i':
                        for (let i2 = 0; i2 < rowCnt; i2++) {
                            ser.putInt(rows[i2][i1]);
                        }
                        break;
                    case 'l':
                        for (let i2 = 0; i2 < rowCnt; i2++) {
                            ser.putLong(rows[i2][i1]);
                        }
                        break;
                    case 'f':
                        for (let i2 = 0; i2 < rowCnt; i2++) {
                            ser.putFloat(rows[i2][i1]);
                        }
                        break;
                    case 'd':
                        for (let i2 = 0; i2 < rowCnt; i2++) {
                            ser.putDouble(rows[i2][i1]);
                        }
                        break;
                    case 'b':
                        for (let i2 = 0; i2 < rowCnt; i2++) {
                            ser.putBytes(rows[i2][i1]);
                        }
                        break;
                    case 's':
                        for (let i2 = 0; i2 < rowCnt; i2++) {
                            ser.putString(rows[i2][i1]);
                        }
                        break;
                    case 'c':
                        for (let i2 = 0; i2 < rowCnt; i2++) {
                            ser.putVarint(rows[i2][i1] ? 1 : 0);
                        }
                        break;
                    case 'o':
                        for (let i2 = 0; i2 < rowCnt; i2++) {
                            let val = rows[i2][i1];
                            if (val !== null) {
                                if (this.boundServContext != null) {
                                    ser.putInt(allocRefFor(this.boundServContext, val).index);
                                }
                                else {
                                    ser.putInt(val.value);
                                }
                            }
                            else {
                                ser.putInt(-1);
                            }
                        }
                        break;
                    default:
                        throw new RpcExtendError("Unknown Type");
                }
            }
        }
        build() {
            if (this.ser == null) {
                this.bindSerializer(new base_1.Serializer().prepareSerializing(64));
            }
            let ser = this.ser;
            if (this.columnsType == null) {
                this.columnsType = '';
                if (this.rows.length >= 1) {
                    for (let t1 of this.rows[0]) {
                        switch (typeof t1) {
                            case 'number':
                                this.columnsType += 'd';
                                break;
                            case 'string':
                                this.columnsType += 's';
                                break;
                            case 'boolean':
                                this.columnsType += 'c';
                                break;
                            case 'bigint':
                                this.columnsType += 'l';
                                break;
                            default:
                                if (t1 instanceof Uint8Array) {
                                    this.columnsType += 'b';
                                }
                                else {
                                    this.columnsType += 'o';
                                }
                                break;
                        }
                    }
                }
            }
            let flag = 0;
            if (this.columnsName == null) {
                flag |= this.FLAG_NO_COLUMN_NAME;
            }
            ser.putVarint(flag);
            let rowCnt = this.rows.length;
            ser.putVarint(rowCnt);
            ser.putString(this.columnsType);
            if (this.columnsName !== null) {
                for (let e of this.columnsName) {
                    ser.putString(e);
                }
            }
            this.putRowsData(this.rows);
            return ser.build();
        }
        toMapArray() {
            let r = [];
            let rowCount = this.getRowCount();
            let colCount = this.columnsName.length;
            for (let t1 = 0; t1 < rowCount; t1++) {
                let r0 = {};
                let row = this.getRow(t1);
                for (let t2 = 0; t2 < colCount; t2++) {
                    r0[this.columnsName[t2]] = row[t2];
                }
                r.push(r0);
            }
            return r;
        }
        fromMapArray(val) {
            if (val.length > 0 && this.columnsName === null) {
                this.columnsName = [];
                for (let k in val[0]) {
                    this.columnsName.push(k);
                }
            }
            let rowCount = val.length;
            let colCount = this.columnsName.length;
            for (let t1 = 0; t1 < rowCount; t1++) {
                let row = [];
                for (let t2 = 0; t2 < colCount; t2++) {
                    row.push(val[t1][this.columnsName[t2]]);
                }
                this.addRow(row);
            }
            return this;
        }
        toArray() {
            let r = [];
            let rowCount = this.getRowCount();
            for (let t1 = 0; t1 < rowCount; t1++) {
                r.push(this.getRow(t1)[0]);
            }
            return r;
        }
        fromArray(val) {
            let rowCount = val.length;
            for (let t1 = 0; t1 < rowCount; t1++) {
                this.addRow([val[t1]]);
            }
            return this;
        }
    }
    exports.TableSerializer = TableSerializer;
});
//# sourceMappingURL=extend.js.map