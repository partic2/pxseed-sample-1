define("partic2/CodeRunner/Inspector", ["require", "exports", "./CodeContext", "partic2/jsutils1/base", "./JsEnviron", "partic2/jsutils1/webutils", "./jsutils2", "partic2/pxprpcClient/registry"], function (require, exports, CodeContext_1, base_1, JsEnviron_1, webutils_1, jsutils2_1, registry_1) {
    "use strict";
    var _a, _b;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultTooltipsHandlers = exports.defaultCompletionHandlers = exports.builtInCompletionHandlers = exports.builtInTooltipsHandlers = exports.CustomObjectTooltipsSymbol = exports.CustomFunctionParameterCompletionSymbol = exports.MiscObject = exports.UnidentifiedArray = exports.UnidentifiedObject = exports.RemoteCodeContextInspector = exports.magicPropertyName = void 0;
    exports.toSerializableObject = toSerializableObject;
    exports.fromSerializableObject = fromSerializableObject;
    exports.inspectCodeContextVariable = inspectCodeContextVariable;
    exports.importNameCompletion = importNameCompletion;
    exports.__priv_codeContext_accessVariableAsSerializableObject = __priv_codeContext_accessVariableAsSerializableObject;
    exports.__priv_codeContext_requestCodeCompletion = __priv_codeContext_requestCodeCompletion;
    exports.__priv_codeContext_requestExtraTooltips = __priv_codeContext_requestExtraTooltips;
    exports.installJavascriptInspectorForCodeContext = installJavascriptInspectorForCodeContext;
    exports.ensureJavascriptInspectorForCodeContextInstalled = ensureJavascriptInspectorForCodeContextInstalled;
    exports.createViewableHtml = createViewableHtml;
    exports.createViewableImage = createViewableImage;
    exports.createCustomViewerObject = createCustomViewerObject;
    const __name__ = base_1.requirejs.getLocalRequireModule(require);
    let DefaultSerializingOption = {
        maxDepth: 6,
        maxKeyCount: 100,
        enumerateMode: 'for in'
    };
    exports.magicPropertyName = {
        serializingEscapeMark: '__Zag7QaCUiZb1ABgL__',
        customViewerFactoryProp: '__Zag7QaCUiZb1ABgL__.customViewerFactoryProp',
        objectConstructorName: '__Zag7QaCUiZb1ABgL__.objectConstructorName'
    };
    function forInListProps(obj) {
        let t1 = [];
        for (let t2 in obj) {
            t1.push(t2);
        }
        return t1;
    }
    //The return value should be JSON-serializable.
    //using magicPropertyName.serializingEscapeMark to represent non-JSON-serializable object.
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
                return { [exports.magicPropertyName.serializingEscapeMark]: 'function', name: v.name };
            }
            else if (v === undefined) {
                return { [exports.magicPropertyName.serializingEscapeMark]: 'undefined' };
            }
            else if (typeof v === 'bigint') {
                return { [exports.magicPropertyName.serializingEscapeMark]: 'bigint', value: v.toString() };
            }
            else {
                return v;
            }
        }
        else if (opt.maxDepth == 0) {
            let isArray = Array.isArray(v);
            let keyCount = isArray ? v.length : listProps(v).length;
            return { [exports.magicPropertyName.serializingEscapeMark]: 'unidentified', isArray, keyCount, [exports.magicPropertyName.objectConstructorName]: v.constructor?.name };
        }
        else {
            if (v instanceof Array) {
                if (v.length > opt.maxKeyCount) {
                    return { [exports.magicPropertyName.serializingEscapeMark]: 'unidentified', isArray: true, keyCount: v.length, [exports.magicPropertyName.objectConstructorName]: v.constructor?.name };
                }
                else {
                    return v.map(v2 => toSerializableObject(v2, { ...opt, maxDepth: opt.maxDepth - 1 }));
                }
            }
            else if (v[exports.magicPropertyName.serializingEscapeMark] != undefined) {
                let v2 = { ...v };
                delete v2[exports.magicPropertyName.serializingEscapeMark];
                return { [exports.magicPropertyName.serializingEscapeMark]: 'unescape', value: toSerializableObject(v2, opt),
                    markValue: toSerializableObject(v[exports.magicPropertyName.serializingEscapeMark], { ...opt, maxDepth: opt.maxDepth - 1 }) };
            }
            else if (v instanceof Date) {
                return { [exports.magicPropertyName.serializingEscapeMark]: 'date', time: v.getTime() };
            }
            else if (v instanceof TypedArray) {
                let typename = v.constructor.name;
                if (typename == 'Buffer') {
                    //For node
                    typename = 'Uint8Array';
                }
                return { [exports.magicPropertyName.serializingEscapeMark]: typename,
                    value: (0, base_1.ArrayBufferToBase64)(new Uint8Array(v.buffer, v.byteOffset, v.length * v.BYTES_PER_ELEMENT))
                };
            }
            else if (v instanceof ArrayBuffer) {
                return { [exports.magicPropertyName.serializingEscapeMark]: 'ArrayBuffer',
                    value: (0, base_1.ArrayBufferToBase64)(v)
                };
            }
            else if (v instanceof UnidentifiedObject || v instanceof MiscObject) {
                return v.toJSON();
            }
            else {
                let r = {};
                let keys = listProps(v);
                if (keys.length > opt.maxKeyCount) {
                    return { [exports.magicPropertyName.serializingEscapeMark]: 'unidentified', isArray: false, keyCount: keys.length, [exports.magicPropertyName.objectConstructorName]: v.constructor?.name };
                }
                else {
                    for (let k1 of keys) {
                        if (k1 === registry_1.RpcSerializeMagicMark)
                            continue;
                        try {
                            r[k1] = toSerializableObject(v[k1], { ...opt, maxDepth: opt.maxDepth - 1 });
                        }
                        catch (e) {
                            r[k1] = {
                                [exports.magicPropertyName.serializingEscapeMark]: 'error',
                                message: e.toString()
                            };
                        }
                    }
                    if (v.constructor != undefined && r[exports.magicPropertyName.objectConstructorName] == undefined) {
                        r[exports.magicPropertyName.objectConstructorName] = v.constructor.name;
                    }
                    //Error.stack Error.message
                    if (v.message != undefined) {
                        r.message = v.message;
                    }
                    if (v.stack != undefined) {
                        r.stack = v.stack;
                    }
                    return r;
                }
            }
        }
    }
    class RemoteCodeContextInspector {
        constructor(codeContext) {
            this.codeContext = codeContext;
        }
        async fetchObject(accessPath, opt) {
            let resp = await this.codeContext.callFunction({ module: __name__, name: '__priv_codeContext_accessVariableAsSerializableObject' }, [accessPath, opt]);
            return fromSerializableObject(resp, { fetcher: this, accessPath });
        }
        async requestCodeCompletion(code, caret) {
            let resp = await this.codeContext.callFunction({ module: __name__, name: '__priv_codeContext_requestCodeCompletion' }, [code, caret]);
            return resp;
        }
        async requestExtraTooltips(code, caret) {
            let resp = await this.codeContext.callFunction({ module: __name__, name: '__priv_codeContext_requestExtraTooltips' }, [code, caret]);
            return resp;
        }
    }
    exports.RemoteCodeContextInspector = RemoteCodeContextInspector;
    class UnidentifiedObject {
        static async identifyRecursive(obj, opt) {
            for (let t1 in obj) {
                if (obj[t1] instanceof UnidentifiedObject) {
                    obj[t1] = await obj[t1].identify(opt);
                }
                else if (typeof obj[t1] === 'object' && obj[t1] != null) {
                    await this.identifyRecursive(obj[t1], opt);
                }
            }
        }
        constructor() {
            //keyCount=-1 for non array iteratable.
            this.keyCount = 0;
            this.accessPath = [];
            this[_a] = 'Object';
        }
        async identify(opt) {
            opt = { ...DefaultSerializingOption, ...opt };
            return await this.fetcher?.fetchObject(this.accessPath, { ...opt });
        }
        toJSON(key) {
            return {
                [exports.magicPropertyName.serializingEscapeMark]: 'unidentified',
                isArray: false, keyCount: this.keyCount, accessPath: this.accessPath,
                [exports.magicPropertyName.objectConstructorName]: this[exports.magicPropertyName.objectConstructorName]
            };
        }
    }
    exports.UnidentifiedObject = UnidentifiedObject;
    _a = exports.magicPropertyName.objectConstructorName;
    class UnidentifiedArray extends UnidentifiedObject {
        constructor() {
            super(...arguments);
            this[_b] = 'Array';
        }
        toJSON(key) {
            let objectJson = super.toJSON(key);
            objectJson.isArray = true;
            return objectJson;
        }
    }
    exports.UnidentifiedArray = UnidentifiedArray;
    _b = exports.magicPropertyName.objectConstructorName;
    class MiscObject {
        constructor() {
            //"serializingError" represent the error throw during serializing, Not the real JS Error object.
            this.type = '';
            this.accessPath = [];
        }
        toJSON(key) {
            if (this.type === 'serializingError') {
                return { [exports.magicPropertyName.serializingEscapeMark]: 'error', message: this.errorMessage };
            }
            else if (this.type === 'function') {
                return { [exports.magicPropertyName.serializingEscapeMark]: 'function', name: this.functionName };
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
            else if (v[exports.magicPropertyName.serializingEscapeMark] != undefined) {
                let type1 = v[exports.magicPropertyName.serializingEscapeMark];
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
                            t1.accessPath = v.accessPath ?? opt.accessPath;
                            t1[exports.magicPropertyName.objectConstructorName] = v[exports.magicPropertyName.objectConstructorName];
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
                            t1[exports.magicPropertyName.serializingEscapeMark] = fromSerializableObject(v.markValue, { ...opt, accessPath: [...opt.accessPath, exports.magicPropertyName.serializingEscapeMark] });
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
    exports.CustomFunctionParameterCompletionSymbol = Symbol(__name__ + '.CustomFunctionParameterCompletionSymbol');
    exports.CustomObjectTooltipsSymbol = Symbol(__name__ + '.CustomObjectTooltipsSymbol');
    exports.builtInTooltipsHandlers = {
        getCalleeInFuncCallExpr: async (context) => {
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
                let funcObj = new Function('_ENV', `return _ENV.${funcName};`)(context.codeContext.localScope);
                context.calleeInFuncCallExpr = funcObj;
                context.funcParamStart = paramStart;
            }
            catch (e) {
                (0, base_1.throwIfAbortError)(e);
            }
        },
        customFunctionTooltips: async (context) => {
            if (context.calleeInFuncCallExpr != undefined) {
                let funcObj = context.calleeInFuncCallExpr;
                if (exports.CustomObjectTooltipsSymbol in funcObj) {
                    let customTooltips = funcObj[exports.CustomObjectTooltipsSymbol];
                    await customTooltips(context);
                }
            }
        }
    };
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
                obj1 = new Function('_ENV', `return _ENV.${objExpr};`)(context.codeContext.localScope);
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
                let lastSlashOffset = importName.lastIndexOf('/') + 1;
                replaceRange[0] += lastSlashOffset;
                context.completionItems.push(...t1.map(v => ({ type: 'literal', candidate: v.substring(lastSlashOffset), replaceRange })));
            }
            importExpr = behind.match(/import\s.*from\s*(['"])([^'"]+)$/);
            if (importExpr != null) {
                let replaceRange = [(importExpr.index ?? 0) + importExpr[0].indexOf(importExpr[1]) + 1, 0];
                replaceRange[1] = replaceRange[0] + importExpr[2].length;
                let importName = importExpr[2];
                let t1 = await importNameCompletion(importName);
                let lastSlashOffset = importName.lastIndexOf('/') + 1;
                replaceRange[0] += lastSlashOffset;
                context.completionItems.push(...t1.map(v => ({ type: 'literal', candidate: v.substring(lastSlashOffset), replaceRange })));
            }
        },
        getCalleeInFuncCallExpr: exports.builtInTooltipsHandlers.getCalleeInFuncCallExpr,
        customFunctionParameterCompletion: async (context) => {
            if (context.calleeInFuncCallExpr != undefined) {
                let funcObj = context.calleeInFuncCallExpr;
                if (exports.CustomFunctionParameterCompletionSymbol in funcObj) {
                    let customCompletion = funcObj[exports.CustomFunctionParameterCompletionSymbol];
                    await customCompletion(context);
                }
            }
        }
    };
    async function __priv_codeContext_accessVariableAsSerializableObject(accessPath, serializeOption) {
        let obj = CodeContext_1.TaskLocalEnv.get();
        for (let t1 of accessPath) {
            if (typeof t1 === 'string' || typeof t1 === 'number') {
                obj = obj[t1];
            }
        }
        return toSerializableObject(obj, serializeOption);
    }
    async function __priv_codeContext_requestCodeCompletion(code, caret) {
        let obj = CodeContext_1.TaskLocalEnv.get();
        let codeContext = obj.__codeContext;
        return base_1.Task.fork(function* () {
            let completeContext = {
                code, caret, codeContext: codeContext, completionItems: []
            };
            for (let t1 of exports.defaultCompletionHandlers) {
                //Mute error
                try {
                    yield t1(completeContext);
                }
                catch (e) {
                    (0, base_1.throwIfAbortError)(e);
                }
            }
            return completeContext.completionItems;
        }).run();
    }
    async function __priv_codeContext_requestExtraTooltips(code, caret) {
        let obj = CodeContext_1.TaskLocalEnv.get();
        let codeContext = obj.__codeContext;
        return base_1.Task.fork(function* () {
            let tooltipsContext = {
                code, caret, codeContext: codeContext, tooltips: null
            };
            for (let t1 of exports.defaultTooltipsHandlers) {
                //Mute error
                try {
                    yield t1(tooltipsContext);
                }
                catch (e) {
                    (0, base_1.throwIfAbortError)(e);
                }
            }
            return tooltipsContext.tooltips;
        }).run();
    }
    async function installJavascriptInspectorForCodeContext(codeContext) {
        if (codeContext.localScope.autoClosable[__name__ + '.consoleDataHookForCodeContext'] == undefined) {
            const onConsoleLogListener = (level, argv) => {
                let outputTexts = [];
                for (let t1 of argv) {
                    if (typeof t1 == 'object') {
                        outputTexts.push((0, CodeContext_1.JsonStringifyWithCircular)(t1));
                    }
                    else {
                        outputTexts.push(t1);
                    }
                }
                let evt = new CodeContext_1.CodeContextEvent('console.data', {
                    data: {
                        level,
                        message: outputTexts.join(' ')
                    }
                });
                codeContext.event.dispatchEvent(evt);
            };
            codeContext.localScope.autoClosable[__name__ + '.consoleDataHookForCodeContext'] = { close: () => {
                    jsutils2_1.OnConsoleData.delete(onConsoleLogListener);
                } };
            jsutils2_1.OnConsoleData.add(onConsoleLogListener);
            codeContext.runInContextTask(function* () {
                base_1.TaskLocalLogHandler.set((arg0) => {
                    onConsoleLogListener(arg0.level, [arg0.label + ':', ...arg0.msg]);
                });
            }, { fork: false });
        }
        if (codeContext.localScope.deleteVariables[exports.CustomObjectTooltipsSymbol] == undefined) {
            codeContext.localScope.deleteVariables[exports.CustomObjectTooltipsSymbol] = (context) => {
                context.tooltips = 'TYPE:deleteVariables(names:string[])=>void';
            };
        }
        if (globalThis?.process?.versions?.node != undefined && codeContext.localScope['__priv_enableDebugger'] == undefined) {
            codeContext.localScope['__priv_enableDebugger'] = async function () {
                try {
                    (await new Promise((resolve_1, reject_1) => { require(['inspector'], resolve_1, reject_1); })).open(9229);
                }
                catch (err) { }
                ;
            };
        }
    }
    let codeContextAttachedInspector = Symbol(__name__ + '.codeContextAttachedInspector');
    async function ensureJavascriptInspectorForCodeContextInstalled(codeContext) {
        if (codeContext[codeContextAttachedInspector] == undefined) {
            await codeContext.runCode(`(await import('${__name__}')).installJavascriptInspectorForCodeContext(__codeContext)`, '');
            codeContext[codeContextAttachedInspector] = new RemoteCodeContextInspector(codeContext);
        }
        return codeContext[codeContextAttachedInspector];
    }
    exports.defaultCompletionHandlers = [
        exports.builtInCompletionHandlers.checkIsInStringLiteral,
        exports.builtInCompletionHandlers.propertyCompletion,
        exports.builtInCompletionHandlers.importStatementCompletion,
        exports.builtInCompletionHandlers.getCalleeInFuncCallExpr,
        exports.builtInCompletionHandlers.customFunctionParameterCompletion,
    ];
    exports.defaultTooltipsHandlers = [
        exports.builtInTooltipsHandlers.getCalleeInFuncCallExpr,
        exports.builtInTooltipsHandlers.customFunctionTooltips
    ];
    function createViewableHtml(source) {
        return createCustomViewerObject({ module: webutils_1.path.join(__name__, '..', 'Component1'), name: 'HtmlViewer' }, source);
    }
    function createViewableImage(source) {
        let opt = {};
        if (source.url != undefined) {
            opt.url = source.url;
        }
        else if (source.svg != undefined) {
            opt.url = (0, base_1.ToDataUrl)(source.svg, 'image/svg+xml');
        }
        else if (source.pngdata != undefined) {
            opt.url = (0, base_1.ToDataUrl)(source.pngdata, 'image/png');
        }
        else if (source.jpegdata != undefined) {
            opt.url = (0, base_1.ToDataUrl)(source.jpegdata, 'image/jpeg');
        }
        else if (source.bmpdata != undefined) {
            opt.url = (0, base_1.ToDataUrl)(source.bmpdata, 'image/bmp');
        }
        return createCustomViewerObject({ module: webutils_1.path.join(__name__, '..', 'Component1'), name: 'ImageViewer' }, opt);
    }
    //viewer should be a Class extend React.Component<{name:string,object:any,variableName?:string,codeContext?:RunCodeContext}>
    function createCustomViewerObject(viewer, object) {
        return {
            [exports.magicPropertyName.customViewerFactoryProp]: viewer,
            ...object
        };
    }
});
