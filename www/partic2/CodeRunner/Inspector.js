define(["require", "exports", "partic2/jsutils1/base", "./JsEnviron", "partic2/jsutils1/webutils"], function (require, exports, base_1, JsEnviron_1, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultCompletionHandlers = exports.CodeCellListData = exports.builtInCompletionHandlers = exports.CustomFunctionParameterCompletionSymbol = exports.MiscObject = exports.RemoteReference = exports.getRemoteReference = exports.UnidentifiedArray = exports.UnidentifiedObject = exports.CodeContextRemoteObjectFetcher = exports.serializingEscapeMark = void 0;
    exports.toSerializableObject = toSerializableObject;
    exports.fromSerializableObject = fromSerializableObject;
    exports.inspectCodeContextVariable = inspectCodeContextVariable;
    exports.importNameCompletion = importNameCompletion;
    exports.filepathCompletion = filepathCompletion;
    exports.makeFunctionCompletionWithFilePathArg0 = makeFunctionCompletionWithFilePathArg0;
    const __name__ = base_1.requirejs.getLocalRequireModule(require);
    let DefaultSerializingOption = {
        maxDepth: 6,
        maxKeyCount: 100,
        enumerateMode: 'for in'
    };
    exports.serializingEscapeMark = '__Zag7QaCUiZb1ABgL__';
    function forInListProps(obj) {
        let t1 = [];
        for (let t2 in obj) {
            t1.push(t2);
        }
        return t1;
    }
    //The return value should be JSON-serializable.
    //using serializingEscapeMark to represent non-JSON-serializable object.
    function toSerializableObject(v, opt) {
        let listProps = forInListProps;
        let TypedArray = Object.getPrototypeOf(Object.getPrototypeOf(new Uint8Array())).constructor;
        opt = { ...DefaultSerializingOption, ...opt };
        if (opt.enumerateMode == 'Object.getOwnPropertyNames') {
            listProps = Object.getOwnPropertyNames;
        }
        if (v === null)
            return null;
        if (typeof (v) !== 'object') {
            if (typeof (v) === 'function') {
                return { [exports.serializingEscapeMark]: 'function', name: v.name };
            }
            else if (v === undefined) {
                return { [exports.serializingEscapeMark]: 'undefined' };
            }
            else if (typeof v === 'bigint') {
                return { [exports.serializingEscapeMark]: 'bigint', value: v.toString() };
            }
            else {
                return v;
            }
        }
        else if (opt.maxDepth == 0) {
            let isArray = v instanceof Array;
            let keyCount = isArray ? v.length : listProps(v).length;
            return { [exports.serializingEscapeMark]: 'unidentified', isArray, keyCount };
        }
        else {
            if (v instanceof Array) {
                if (v.length > opt.maxKeyCount) {
                    return { [exports.serializingEscapeMark]: 'unidentified', isArray: true, keyCount: v.length };
                }
                else {
                    return v.map(v2 => toSerializableObject(v2, { ...opt, maxDepth: opt.maxDepth - 1 }));
                }
            }
            else if (v[exports.serializingEscapeMark] != undefined) {
                let v2 = { ...v };
                delete v2[exports.serializingEscapeMark];
                return { [exports.serializingEscapeMark]: 'unescape', value: toSerializableObject(v2, opt),
                    markValue: toSerializableObject(v[exports.serializingEscapeMark], { ...opt, maxDepth: opt.maxDepth - 1 }) };
            }
            else if (v instanceof Date) {
                return { [exports.serializingEscapeMark]: 'date', time: v.getTime() };
            }
            else if (v instanceof TypedArray) {
                let typename = v.constructor.name;
                if (typename == 'Buffer') {
                    //For node
                    typename = 'Uint8Array';
                }
                return { [exports.serializingEscapeMark]: typename,
                    value: (0, base_1.ArrayBufferToBase64)(new Uint8Array(v.buffer, v.byteOffset, v.length * v.BYTES_PER_ELEMENT))
                };
            }
            else if (v instanceof ArrayBuffer) {
                return { [exports.serializingEscapeMark]: 'ArrayBuffer',
                    value: (0, base_1.ArrayBufferToBase64)(v)
                };
            }
            else if (exports.getRemoteReference in v) {
                return { [exports.serializingEscapeMark]: 'RemoteReference', accessPath: v[exports.getRemoteReference]().accessPath };
            }
            else if (v instanceof Error) {
                return { constructor: 'Error', message: v.message, stack: v.stack, ...v };
            }
            else {
                let r = {};
                let keys = listProps(v);
                if (keys.length > opt.maxKeyCount) {
                    return { [exports.serializingEscapeMark]: 'unidentified', isArray: false, keyCount: keys.length };
                }
                else {
                    for (let k1 of keys) {
                        try {
                            r[k1] = toSerializableObject(v[k1], { ...opt, maxDepth: opt.maxDepth - 1 });
                        }
                        catch (e) {
                            r[k1] = {
                                [exports.serializingEscapeMark]: 'error',
                                message: e.toString()
                            };
                        }
                    }
                    return r;
                }
            }
        }
    }
    class CodeContextRemoteObjectFetcher {
        constructor(codeContext) {
            this.codeContext = codeContext;
        }
        async fetch(accessPath, opt) {
            let accessChain = accessPath.map(v => typeof (v) === 'string' ? `['${v}']` : `[${v}]`).join('');
            let resp = await this.codeContext.jsExec(`
            return JSON.stringify(
                lib.toSerializableObject(
                    codeContext.localScope${accessChain},
                    ${JSON.stringify(opt)}
                ))`);
            return JSON.parse(resp);
        }
    }
    exports.CodeContextRemoteObjectFetcher = CodeContextRemoteObjectFetcher;
    class UnidentifiedObject {
        constructor() {
            //keyCount=-1 for non array iteratable.
            this.keyCount = 0;
            this.accessPath = [];
        }
        async identify(opt) {
            opt = { ...DefaultSerializingOption, ...opt };
            let resp;
            resp = await this.fetcher?.fetch(this.accessPath, { ...opt });
            return fromSerializableObject(resp, { fetcher: this.fetcher, accessPath: this.accessPath });
        }
        toJSON(key) {
            return {
                [exports.serializingEscapeMark]: 'unidentified', isArray: false, keyCount: this.keyCount
            };
        }
    }
    exports.UnidentifiedObject = UnidentifiedObject;
    class UnidentifiedArray extends UnidentifiedObject {
        toJSON(key) {
            let objectJson = super.toJSON(key);
            objectJson.isArray = true;
            return objectJson;
        }
    }
    exports.UnidentifiedArray = UnidentifiedArray;
    //Usually used in client to make dereference on server side, by 'fromSerializableObject'.
    exports.getRemoteReference = Symbol(__name__ + '.getRemoteReference');
    class RemoteReference {
        constructor(accessPath) {
            this.accessPath = accessPath;
        }
        ;
        [exports.getRemoteReference]() {
            return this;
        }
    }
    exports.RemoteReference = RemoteReference;
    class MiscObject {
        constructor() {
            //"serializingError" represent the error throw during serializing, Not the real JS Error object.
            this.type = '';
            this.accessPath = [];
        }
        toJSON(key) {
            if (this.type === 'serializingError') {
                return { [exports.serializingEscapeMark]: 'error', message: this.errorMessage };
            }
            else if (this.type === 'function') {
                return { [exports.serializingEscapeMark]: 'function', name: this.functionName };
            }
            return '--- unknown object ---';
        }
    }
    exports.MiscObject = MiscObject;
    function fromSerializableObject(v, opt) {
        if (opt.accessPath == undefined)
            opt.accessPath = [];
        if ((typeof (v) !== 'object') || (v === null)) {
            return v;
        }
        else {
            if (v instanceof Array) {
                return v.map((v2, i2) => fromSerializableObject(v2, { ...opt, accessPath: [...opt.accessPath, i2] }));
            }
            else if (v[exports.serializingEscapeMark] != undefined) {
                let type1 = v[exports.serializingEscapeMark];
                switch (type1) {
                    case 'unidentified':
                        {
                            let { isArray, keyCount } = v;
                            let t1;
                            if (isArray) {
                                t1 = new UnidentifiedArray();
                            }
                            else {
                                t1 = new UnidentifiedObject();
                            }
                            t1.fetcher = opt.fetcher;
                            t1.keyCount = keyCount;
                            t1.accessPath = opt.accessPath;
                            return t1;
                        }
                        ;
                    case 'date':
                        {
                            return new Date(v.time);
                        }
                        ;
                    case 'unescape':
                        {
                            let t1 = fromSerializableObject(v.value, opt);
                            t1[exports.serializingEscapeMark] = fromSerializableObject(v.markValue, { ...opt, accessPath: [...opt.accessPath, exports.serializingEscapeMark] });
                            return t1;
                        }
                        ;
                    case 'function':
                        {
                            let t1 = new MiscObject();
                            t1.type = 'function';
                            t1.accessPath = opt.accessPath;
                            t1.fetcher = opt.fetcher;
                            t1.functionName = v.name;
                            return t1;
                        }
                        ;
                    case 'error':
                        {
                            let t1 = new MiscObject();
                            t1.type = 'serializingError';
                            t1.accessPath = opt.accessPath;
                            t1.fetcher = opt.fetcher;
                            t1.errorMessage = v.message;
                            return t1;
                        }
                        ;
                    case 'undefined':
                        {
                            return undefined;
                        }
                        ;
                    case 'Uint8Array':
                    case 'Int8Array':
                    case 'Uint16Array':
                    case 'Int16Array':
                    case 'Uint32Array':
                    case 'Int32Array':
                        {
                            let buffer = (0, base_1.Base64ToArrayBuffer)(v.value);
                            let typedArr = globalThis[type1];
                            return new typedArr(buffer, 0, buffer.byteLength / typedArr.BYTES_PER_ELEMENT);
                        }
                        ;
                    case 'ArrayBuffer':
                        {
                            return (0, base_1.Base64ToArrayBuffer)(v.value);
                        }
                        ;
                    case 'RemoteReference':
                        {
                            let t1 = opt.referenceGlobal;
                            if (t1 == undefined) {
                                return new RemoteReference(v.accessPath);
                            }
                            else {
                                for (let k1 of v.accessPath) {
                                    if (t1 == undefined)
                                        break;
                                    t1 = t1[k1];
                                }
                                return t1;
                            }
                        }
                        ;
                    case 'bigint': {
                        return BigInt(v.value);
                    }
                }
            }
            else {
                let r1 = {};
                for (let k1 in v) {
                    let opt2 = { ...opt };
                    if (opt2.accessPath != undefined) {
                        opt2.accessPath = [...opt.accessPath, k1];
                    }
                    r1[k1] = fromSerializableObject(v[k1], opt2);
                }
                return r1;
            }
        }
    }
    async function inspectCodeContextVariable(fetcher, accessPath, opt) {
        opt = { ...DefaultSerializingOption, ...opt };
        let t1 = new UnidentifiedObject();
        t1.accessPath = accessPath;
        t1.fetcher = fetcher;
        return await t1.identify(opt);
    }
    async function importNameCompletion(partialName) {
        const removeLeadingSlash = (path) => {
            if (path.startsWith('/')) {
                return path.substring(1);
            }
            else {
                return path;
            }
        };
        let candidate = new Set();
        let defined = await base_1.requirejs.getDefined();
        for (let t1 in defined) {
            if (t1.startsWith(partialName)) {
                let t2 = partialName.length;
                let nextPart = t1.indexOf('/', t2);
                if (nextPart >= 0) {
                    candidate.add(t1.substring(0, nextPart));
                }
                else {
                    candidate.add(t1);
                }
            }
        }
        try {
            for (let customProvider of JsEnviron_1.installedRequirejsResourceProvider) {
                let lastDirIndex = partialName.lastIndexOf('/');
                let lastdir = '';
                if (lastDirIndex >= 0) {
                    lastdir = partialName.substring(0, lastDirIndex);
                }
                try {
                    let children = await customProvider.fs.listdir(customProvider.rootPath + '/' + lastdir);
                    let nameFilter = removeLeadingSlash(partialName.substring(lastdir.length));
                    for (let t1 of children) {
                        if (t1.name.startsWith(nameFilter)) {
                            if (t1.type == 'file' && t1.name.endsWith('.js')) {
                                let modPath = removeLeadingSlash(lastdir + '/' + t1.name.substring(0, t1.name.length - 3));
                                candidate.add(modPath);
                            }
                            else if (t1.type == 'dir') {
                                let modPath = removeLeadingSlash(lastdir + '/' + t1.name);
                                candidate.add(modPath);
                            }
                        }
                    }
                }
                catch (e) { }
                ;
            }
        }
        catch (err) { }
        try {
            await (0, JsEnviron_1.ensureDefaultFileSystem)();
            let moduleDir = (0, webutils_1.getWWWRoot)().replace(/\\/g, '/');
            if (!moduleDir.startsWith('/')) {
                moduleDir = '/' + moduleDir;
            }
            let lastDirIndex = partialName.lastIndexOf('/');
            let lastdir = '';
            if (lastDirIndex >= 0) {
                lastdir = partialName.substring(0, lastDirIndex);
            }
            try {
                let children = await JsEnviron_1.defaultFileSystem.listdir(moduleDir + '/' + lastdir);
                for (let t1 of children) {
                    let nameFilter = removeLeadingSlash(partialName.substring(lastdir.length));
                    if (t1.name.startsWith(nameFilter)) {
                        if (t1.type !== 'dir' && t1.name.endsWith('.js')) {
                            candidate.add(removeLeadingSlash(lastdir + '/' + t1.name.substring(0, t1.name.length - 3)));
                        }
                        else if (t1.type === 'dir') {
                            candidate.add(removeLeadingSlash(lastdir + '/' + t1.name));
                        }
                    }
                }
            }
            catch (e) { }
            ;
        }
        catch (err) { }
        ;
        return Array.from(candidate);
    }
    async function filepathCompletion(partialPath, codeContext, current) {
        let sfs = codeContext.localScope.fs.simple;
        let pathPart = partialPath.split(/[\\\/]/);
        let dirPart = pathPart.slice(0, pathPart.length - 1);
        let partialName = pathPart.at(-1) ?? '';
        if (current != undefined && dirPart.length > 0 && dirPart[0] == '.') {
            dirPart = [...current.split(/[\\\/]/), ...dirPart.slice(1)];
        }
        try {
            let children = await sfs.listdir(dirPart.join('/'));
            return {
                at: partialPath.length - partialName.length,
                children: children.filter(child => child.name.startsWith(partialName))
            };
        }
        catch (e) {
            (0, base_1.throwIfAbortError)(e);
        }
        return {
            at: partialPath.length - partialName.length,
            children: []
        };
    }
    function makeFunctionCompletionWithFilePathArg0(current) {
        return async (context) => {
            let param = context.code.substring(context.funcParamStart, context.caret);
            let loadPath2 = param.match(/\(\s*(['"])([^'"]+)$/);
            if (loadPath2 != null) {
                let replaceRange = [context.funcParamStart + param.lastIndexOf(loadPath2[1]) + 1, 0];
                replaceRange[1] = replaceRange[0] + loadPath2[2].length;
                let loadPath = loadPath2[2];
                let t1 = await filepathCompletion(loadPath, context.codeContext, current);
                replaceRange[0] = replaceRange[0] + t1.at;
                context.completionItems.push(...t1.children.map(v => ({ type: 'literal', candidate: v.name, replaceRange })));
            }
        };
    }
    exports.CustomFunctionParameterCompletionSymbol = Symbol(__name__ + '.CustomFunctionParameterCompletionSymbol');
    exports.builtInCompletionHandlers = {
        checkIsInStringLiteral: async (context) => {
            let t1 = context.code.substring(0, context.caret).split('').reduce((prev, curr) => {
                if (curr == '"') {
                    prev.dquo++;
                }
                else if (curr == "'") {
                    prev.quo++;
                }
                return prev;
            }, { dquo: 0, quo: 0 });
            context.isCaretInStringLiteral = t1.dquo % 2 == 1 || t1.quo % 2 == 1;
        },
        propertyCompletion: async (context) => {
            //propertyCompletion
            if (context.isCaretInStringLiteral) {
                return;
            }
            let behind = context.code.substring(0, context.caret);
            let matched = behind.match(/[0-9a-zA-Z_.\[\]'"]+$/);
            let objExpr;
            let fieldStr;
            if (matched != undefined) {
                let dot = matched[0].lastIndexOf('.');
                if (dot >= 0) {
                    objExpr = matched[0].substring(0, dot);
                    fieldStr = matched[0].substring(dot + 1);
                }
                else {
                    objExpr = '_ENV';
                    fieldStr = matched[0];
                }
            }
            else {
                return;
            }
            let obj1;
            try {
                obj1 = await context.codeContext.runCodeInScope(`return ${objExpr};`);
            }
            catch (e) {
                (0, base_1.throwIfAbortError)(e);
            }
            if (obj1 != undefined) {
                let exists = new Set();
                let protoobj = obj1;
                let abstractTypedArray = Object.getPrototypeOf(Object.getPrototypeOf(new Uint8Array([]))).constructor;
                let objectProto = Object.getPrototypeOf({});
                for (let rp = 0; rp < 100; rp++) {
                    if (protoobj == null || protoobj == objectProto)
                        break;
                    let proto2 = Object.getPrototypeOf(protoobj);
                    if (typeof protoobj === 'string' || (proto2 != null && proto2.constructor === Array) || protoobj instanceof abstractTypedArray) {
                        protoobj = Object.getPrototypeOf(protoobj);
                        continue;
                    }
                    for (let t1 of Object.getOwnPropertyNames(protoobj)) {
                        try {
                            if (t1.startsWith(fieldStr) && !exists.has(t1)) {
                                exists.add(t1);
                                context.completionItems.push({
                                    type: typeof obj1[t1],
                                    candidate: t1,
                                    replaceRange: [context.caret - fieldStr.length, context.caret]
                                });
                            }
                        }
                        catch (e) { }
                    }
                    protoobj = Object.getPrototypeOf(protoobj);
                }
            }
        },
        importStatementCompletion: async (context) => {
            let behind = context.code.substring(0, context.caret);
            let importExpr = behind.match(/import\s*\(\s*(['"])([^'"]+)$/);
            if (importExpr != null) {
                let replaceRange = [(importExpr.index ?? 0) + importExpr[0].indexOf(importExpr[1]) + 1, 0];
                replaceRange[1] = replaceRange[0] + importExpr[2].length;
                let importName = importExpr[2];
                let t1 = await importNameCompletion(importName);
                context.completionItems.push(...t1.map(v => ({ type: 'literal', candidate: v, replaceRange })));
            }
            importExpr = behind.match(/import\s.*from\s*(['"])([^'"]+)$/);
            if (importExpr != null) {
                let replaceRange = [(importExpr.index ?? 0) + importExpr[0].indexOf(importExpr[1]) + 1, 0];
                replaceRange[1] = replaceRange[0] + importExpr[2].length;
                let importName = importExpr[2];
                let t1 = await importNameCompletion(importName);
                context.completionItems.push(...t1.map(v => ({ type: 'literal', candidate: v, replaceRange })));
            }
        },
        customFunctionParameterCompletion: async (context) => {
            let behind = context.code.substring(0, context.caret);
            let rBracketCnt = 0;
            let paramStart = -1;
            for (let t1 = behind.length; t1 >= 0; t1--) {
                let ch = behind.charAt(t1);
                if (ch == '(') {
                    rBracketCnt--;
                    if (rBracketCnt < 0) {
                        paramStart = t1;
                        break;
                    }
                    ;
                }
                else if (ch == ')') {
                    rBracketCnt++;
                }
            }
            if (paramStart < 0) {
                return;
            }
            let funcName = behind.substring(0, paramStart).match(/[0-9a-zA-Z_.\[\]'"]+$/);
            if (funcName == null)
                return;
            try {
                let funcObj = await context.codeContext.runCodeInScope(`return ${funcName};`);
                if (exports.CustomFunctionParameterCompletionSymbol in funcObj) {
                    let customCompletion = funcObj[exports.CustomFunctionParameterCompletionSymbol];
                    context.funcParamStart = paramStart;
                    await customCompletion(context);
                }
            }
            catch (e) {
                (0, base_1.throwIfAbortError)(e);
            }
        }
    };
    class CodeCellListData {
        constructor() {
            this.cellList = new Array();
            this.consoleOutput = {};
        }
        loadFrom(data) {
            let loaded = fromSerializableObject(JSON.parse(data), {});
            this.cellList = loaded.cellList;
            this.consoleOutput = loaded.consoleOutput;
        }
        saveTo() {
            return JSON.stringify(toSerializableObject({ cellList: this.cellList, consoleOutput: this.consoleOutput }, {}));
        }
    }
    exports.CodeCellListData = CodeCellListData;
    exports.defaultCompletionHandlers = [
        exports.builtInCompletionHandlers.checkIsInStringLiteral,
        exports.builtInCompletionHandlers.propertyCompletion,
        exports.builtInCompletionHandlers.importStatementCompletion,
        exports.builtInCompletionHandlers.customFunctionParameterCompletion,
    ];
});
//# sourceMappingURL=Inspector.js.map