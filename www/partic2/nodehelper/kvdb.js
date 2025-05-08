define(["require", "exports", "fs/promises", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/CodeRunner/Inspector", "path"], function (require, exports, fs, base_1, webutils_1, Inspector_1, path) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FsBasedKvDbV1 = void 0;
    exports.setupImpl = setupImpl;
    var __name__ = base_1.requirejs.getLocalRequireModule(require);
    class FsBasedKvDbV1 {
        constructor() {
            this.baseDir = '';
        }
        async init(baseDir) {
            this.baseDir = baseDir;
            try {
                await fs.access(baseDir + '/config.json', fs.constants.R_OK);
            }
            catch (e) {
                await fs.writeFile(baseDir + '/config.json', new TextEncoder().encode('{}'));
            }
            let data = await fs.readFile(baseDir + '/config.json');
            this.config = { fileList: {}, ...JSON.parse(new TextDecoder().decode(data)) };
        }
        async setItem(key, val) {
            if (!(key in this.config.fileList)) {
                this.config.fileList[key] = { fileName: (0, base_1.GenerateRandomString)(), type: 'json' };
            }
            let { fileName } = this.config.fileList[key];
            if (val instanceof ArrayBuffer) {
                this.config.fileList[key].type = 'ArrayBuffer';
                await fs.writeFile(`${this.baseDir}/${fileName}`, new Uint8Array(val));
            }
            else if (val instanceof Uint8Array) {
                this.config.fileList[key].type = 'Uint8Array';
                await fs.writeFile(`${this.baseDir}/${fileName}`, val);
            }
            else if (val instanceof Int8Array) {
                this.config.fileList[key].type = 'Int8Array';
                await fs.writeFile(`${this.baseDir}/${fileName}`, val);
            }
            else {
                let data = JSON.stringify((0, Inspector_1.toSerializableObject)(val, { maxDepth: 0x7fffffff, enumerateMode: 'for in', maxKeyCount: 0x7fffffff }));
                await fs.writeFile(`${this.baseDir}/${fileName}`, new TextEncoder().encode(data));
            }
            await fs.writeFile(this.baseDir + '/config.json', new TextEncoder().encode(JSON.stringify(this.config)));
        }
        async getItem(key) {
            if (!(key in this.config.fileList)) {
                return undefined;
            }
            let { fileName, type } = this.config.fileList[key];
            try {
                if (type === 'ArrayBuffer') {
                    return (await fs.readFile(`${this.baseDir}/${fileName}`)).buffer;
                }
                else if (type === 'Uint8Array') {
                    return new Uint8Array((await fs.readFile(`${this.baseDir}/${fileName}`)).buffer);
                }
                else if (type === 'Int8Array') {
                    return new Int8Array((await fs.readFile(`${this.baseDir}/${fileName}`)).buffer);
                }
                else if (type === 'json') {
                    let data = await fs.readFile(`${this.baseDir}/${fileName}`);
                    let r = (0, Inspector_1.fromSerializableObject)(JSON.parse(new TextDecoder().decode(data)), {});
                    return r;
                }
            }
            catch (e) {
                delete this.config.fileList[key];
                return undefined;
            }
        }
        getAllKeys(onKey, onErr) {
            for (let file in this.config.fileList) {
                let next = onKey(file);
                if (next.stop === true) {
                    break;
                }
            }
            onKey(null);
        }
        async delete(key) {
            let { fileName } = this.config.fileList[key];
            await fs.rm(this.baseDir + '/' + fileName);
            delete this.config.fileList[key];
            await fs.writeFile(this.baseDir + '/config.json', new TextEncoder().encode(JSON.stringify(this.config)));
        }
        async close() {
            await fs.writeFile(this.baseDir + '/config.json', new TextEncoder().encode(JSON.stringify(this.config)));
        }
    }
    exports.FsBasedKvDbV1 = FsBasedKvDbV1;
    let cachePath = path.join((0, webutils_1.getWWWRoot)(), __name__, '..');
    function setupImpl() {
        (0, webutils_1.setKvStoreBackend)(async (dbname) => {
            let dbMap = {};
            //deprecate base64 to be filesystem independent.
            let filename = btoa(dbname);
            await fs.mkdir(path.join(cachePath, 'data'), { recursive: true });
            try {
                dbMap = JSON.parse(new TextDecoder().decode(await fs.readFile(path.join(cachePath, 'data', 'meta-dbMap'))));
            }
            catch (e) { }
            ;
            if (dbname in dbMap) {
                filename = dbMap[dbname];
            }
            try {
                await fs.access(path.join(cachePath, 'data', filename));
                if (!(dbname in dbMap)) {
                    dbMap[dbname] = filename;
                }
            }
            catch (e) {
                filename = (0, base_1.GenerateRandomString)();
                dbMap[dbname] = filename;
            }
            await fs.writeFile(path.join(cachePath, 'data', 'meta-dbMap'), JSON.stringify(dbMap));
            let db = new FsBasedKvDbV1();
            await fs.mkdir(path.join(cachePath, 'data', filename), { recursive: true });
            await db.init(path.join(cachePath, 'data', filename));
            return db;
        });
    }
});
//# sourceMappingURL=kvdb.js.map