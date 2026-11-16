define("partic2/CodeRunner/CodeContext", ["require", "exports", "./prebuilt/acorn-walk", "./prebuilt/acorn", "partic2/jsutils1/base", "partic2/jsutils1/base", "./pxseedLoader", "./jsutils2"], function (require, exports, acornWalk, acorn, base_1, jsutils1, pxseedLoader_1, jsutils2_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.newCodeCellListData = exports.BaseCodeCellListData = exports.LocalRunCodeContext = exports.__internal__ = exports.CodeContextEvent = exports.CodeContextEventTarget = exports.TaskLocalEnv = void 0;
    exports.JsonStringifyWithCircular = JsonStringifyWithCircular;
    acorn.defaultOptions.allowAwaitOutsideFunction = true;
    acorn.defaultOptions.ecmaVersion = 'latest';
    acorn.defaultOptions.allowReturnOutsideFunction = true;
    acorn.defaultOptions.sourceType = 'module';
    const __name__ = base_1.requirejs.getLocalRequireModule(require);
    exports.TaskLocalEnv = new jsutils2_1.TaskLocalRef({ __noenv: true });
    (0, pxseedLoader_1.setupAsyncHook)();
    class CodeContextEventTarget extends EventTarget {
        constructor() {
            super(...arguments);
            //Used by RemoteCodeContext, to delegate event. 
            this._buffer = new jsutils2_1.EventBuffer();
        }
        dispatchEvent(event) {
            this._buffer.push({ type: event.type, data: event.data });
            return super.dispatchEvent(event);
        }
        addEventListener(type, callback, options) {
            super.addEventListener(type, callback, options);
        }
        removeEventListener(type, callback, options) {
            super.removeEventListener(type, callback);
        }
        //The original dispatchEvent on EventTarget. To trigger listener only.
        _dispatchEventOnEventTarget(event) {
            return super.dispatchEvent(event);
        }
    }
    exports.CodeContextEventTarget = CodeContextEventTarget;
    class CodeContextEvent extends Event {
        constructor(type, initDict) {
            super(type ?? __name__ + '.CodeContextEvent', {});
            this.data = undefined;
            this.data = initDict?.data;
        }
    }
    exports.CodeContextEvent = CodeContextEvent;
    async function defaultCodeTranspilingProcessor(processContext) {
        let replacePlan = new pxseedLoader_1.JsSourceReplacePlan(processContext.source);
        await (0, pxseedLoader_1.addAutoAsyncAwait)(replacePlan, processContext._ENV.__topLevelTranspileDirective ?? {});
        processContext.source = replacePlan.apply();
    }
    async function builtinCodeContextSourceProcessor(processContext) {
        let { source } = processContext;
        let replacePlan = new pxseedLoader_1.JsSourceReplacePlan(source);
        let result = acorn.parse(source, { allowAwaitOutsideFunction: true, ecmaVersion: 'latest', allowReturnOutsideFunction: true });
        replacePlan.parsedAst = result;
        let foundDecl = [];
        function parseDeclStat(decl) {
            let declNames = [];
            decl.forEach(v => {
                if (v.id.type === 'Identifier') {
                    declNames.push(v.id.name);
                }
                else if (v.id.type === 'ObjectPattern') {
                    declNames.push(...v.id.properties.map(v2 => v2.value.name));
                }
                else if (v.id.type === 'ArrayPattern') {
                    declNames.push(...v.id.elements.filter(v2 => v2 != null).map(v2 => v2.name));
                }
            });
            return { declNames };
        }
        acornWalk.ancestor(result, {
            VariableDeclaration(node, state, ancestors) {
                //Performance issue.
                if (ancestors.find(v => v.type.endsWith('FunctionExpression')))
                    return;
                if (ancestors.find(v => ['BlockStatement'].includes(v.type)) !== undefined && node.kind !== 'var')
                    return;
                if ((['ForStatement', 'ForOfStatement'].includes(ancestors.at(-2)?.type ?? ''))) {
                    if (node.kind == 'var') {
                        let { declNames } = parseDeclStat(node.declarations);
                        foundDecl.push(...declNames);
                        let declaratorStart = node.declarations[0].start;
                        replacePlan.plan.push({ start: node.start, end: declaratorStart, newString: '' });
                        return;
                    }
                    else {
                        return;
                    }
                }
                let { declNames } = parseDeclStat(node.declarations);
                foundDecl.push(...declNames);
                let declaratorStart = node.declarations[0].start;
                let declaratorEnd = node.declarations.at(-1).end;
                replacePlan.plan.push({ start: node.start, end: declaratorStart, newString: ';(' });
                replacePlan.plan.push({ start: declaratorEnd, end: declaratorEnd, newString: ')' });
            },
            FunctionDeclaration(node, state, ancestors) {
                if (node.expression ||
                    ancestors.find(v => v.type === 'FunctionExpression') != undefined) {
                    return;
                }
                if (node.id == null)
                    return;
                foundDecl.push(node.id.name);
                let funcType1 = source.substring(node.start, node.id.start);
                replacePlan.plan.push({ start: node.start, end: node.id.end, newString: node.id.name + '=' + funcType1 });
            },
            ClassDeclaration(node, state, ancestors) {
                if (ancestors.find(v => v.type === 'FunctionExpression') != undefined) {
                    return;
                }
                if (node.id == null)
                    return;
                foundDecl.push(node.id.name);
                let clsType1 = source.substring(node.start, node.id.start);
                replacePlan.plan.push({ start: node.start, end: node.id.end, newString: node.id.name + '=' + clsType1 });
            },
            ImportExpression(node, state, ancestors) {
                replacePlan.plan.push({ start: node.start, end: node.start + 6, newString: '_ENV.__codeContext.importHandler' });
            },
            ImportDeclaration(node, state, ancestor) {
                if (node.specifiers.length === 1 && node.specifiers[0].type === 'ImportNamespaceSpecifier') {
                    let spec = node.specifiers[0];
                    replacePlan.plan.push({ start: node.start, end: node.end, newString: `${spec.local.name}=await _ENV.__codeContext.importHandler('${node.source.value}');` });
                    foundDecl.push(spec.local.name);
                }
                else if (node.specifiers.length > 0 && node.specifiers[0].type === 'ImportSpecifier') {
                    let specs = node.specifiers;
                    let importStat = [`{let __timp=(await _ENV.__codeContext.importHandler('${node.source.value}'));`];
                    for (let spec of specs) {
                        importStat.push(`_ENV.${spec.local.name}=__timp.${spec.imported.name};`);
                        foundDecl.push(spec.local.name);
                    }
                    importStat.push('}');
                    replacePlan.plan.push({ start: node.start, end: node.end, newString: importStat.join('') });
                }
                else if (node.specifiers.length === 1 && node.specifiers[0].type === 'ImportDefaultSpecifier') {
                    let spec = node.specifiers[0];
                    replacePlan.plan.push({ start: node.start, end: node.end, newString: `${spec.local.name}=(await _ENV.__codeContext.importHandler('${node.source.value}')).default;` });
                    foundDecl.push(spec.local.name);
                }
                else {
                    replacePlan.plan.push({ start: node.start, end: node.end, newString: `` });
                }
            }
        });
        let lastStat = result.body.at(-1);
        (0, pxseedLoader_1.addAsyncHook)(replacePlan);
        if (lastStat != undefined) {
            if (lastStat.type.includes('Expression')) {
                replacePlan.plan.push({
                    start: lastStat.start,
                    end: lastStat.start,
                    newString: ' return '
                });
            }
        }
        let modifiedSource = replacePlan.apply();
        processContext.source = modifiedSource;
        processContext.declVars.push(...foundDecl);
    }
    exports.__internal__ = {
        defaultCodeTranspilingProcessor, builtinCodeContextSourceProcessor
    };
    class LocalRunCodeContext {
        constructor() {
            this.importHandler = async (source) => {
                try {
                    let imp = await new Promise((resolve_1, reject_1) => { require([source], resolve_1, reject_1); });
                    return imp;
                }
                catch (err) {
                    await Promise.all(Object.keys(await base_1.requirejs.getFailed()).map(t1 => base_1.requirejs.undef(t1)));
                    throw err;
                }
            };
            this.sourceProcessors = [
                { name: __name__ + '.defaultCodeTranspilingProcessor', process: defaultCodeTranspilingProcessor },
                { name: __name__ + '.builtinCodeContextSourceProcessor', process: builtinCodeContextSourceProcessor }
            ];
            this.event = new CodeContextEventTarget();
            this.localScope = {
                //this CodeContext
                __codeContext: undefined,
                //transpiler
                __topLevelTranspileDirective: {},
                __transpile__: (directive, source) => source,
                event: null,
                console: null,
                CodeContextEvent,
                Task: jsutils1.Task,
                tasks: {},
                //Will be closed when LocalRunCodeContext is closing.
                autoClosable: {},
                deleteVariables: (names) => {
                    for (let n of names) {
                        delete this.localScope[n];
                    }
                },
                close: () => {
                    this.close();
                }
            };
            this.state = 'running';
            this.contextRunCodeQueue = new jsutils1.ArrayWrap2();
            this.contextRunCodeTaskSpawner = null;
            this.localScope.event = this.event;
            this.localScope.__codeContext = this;
            this.localScope._ENV = this.localScope;
            this.localScope.console = console;
            this.localScopeProxy = new Proxy(this.localScope, {
                has: () => true,
                get: (target, p) => {
                    if (p in target) {
                        return target[p];
                    }
                    else {
                        return globalThis[p];
                    }
                },
                set: (target, p, newVal, receiver) => {
                    target[p] = newVal;
                    return true;
                }
            });
        }
        async close() {
            try {
                if (this.state != 'running')
                    return;
                this.contextRunCodeQueue.cancelWaiting();
                this.state = 'closing';
                this.event.dispatchEvent(new CodeContextEvent('close'));
                let that = this;
                await jsutils1.Task.fork(function* () {
                    exports.TaskLocalEnv.set(that.localScope);
                    for (let [k1, v1] of Object.entries(that.localScope.autoClosable)) {
                        if (v1.close != undefined) {
                            try {
                                v1.close();
                            }
                            catch (err) { }
                            ;
                        }
                    }
                }).run();
            }
            catch (err) { }
            finally {
                this.state = 'closed';
            }
        }
        runInContextTask(task, opt) {
            if (this.contextRunCodeTaskSpawner === null) {
                let codeContext = this;
                this.contextRunCodeTaskSpawner = jsutils1.Task.fork(function* () {
                    //Mute log by default
                    jsutils1.TaskLocalLogHandler.set(() => { });
                    while (codeContext.state == 'running') {
                        try {
                            let next = yield* jsutils1.Task.yieldWrap(codeContext.contextRunCodeQueue.queueBlockShift());
                            function* taskMain() {
                                let taskName = 'task' + jsutils1.GenerateRandomString();
                                let curtask = jsutils1.Task.currentTask;
                                curtask.name = taskName;
                                codeContext.localScope.tasks[taskName] = curtask;
                                exports.TaskLocalEnv.set(codeContext.localScope);
                                try {
                                    next.r.setResult(yield* next.g());
                                }
                                catch (err) {
                                    next.r.setException(err);
                                }
                                finally {
                                    delete codeContext.localScope.tasks[taskName];
                                }
                            }
                            if (next.fork === false) {
                                yield* taskMain();
                            }
                            else {
                                jsutils1.Task.fork(taskMain).run();
                            }
                        }
                        catch (err) { }
                        ;
                    }
                }).run();
            }
            ;
            let r = new jsutils1.future();
            this.contextRunCodeQueue.queueSignalPush({ g: task, r, fork: opt?.fork });
            return r.get();
        }
        async callFunction(func, args) {
            let that = this;
            return this.runInContextTask(function* () {
                if (typeof func === 'string') {
                    let r = that.localScope[func](...args);
                    if (typeof r === 'object' && r !== null && typeof r.then === 'function') {
                        r = yield r;
                    }
                    return r;
                }
                else {
                    let m = yield new Promise((resolve_2, reject_2) => { require([func.module], resolve_2, reject_2); });
                    let r = m[func.name](...args);
                    if (typeof r === 'object' && r !== null && typeof r.then === 'function') {
                        r = yield r;
                    }
                    return r;
                }
            });
        }
        async processSource(source) {
            let that = this;
            let processContext = { _ENV: this.localScope, source, declVars: new Array() };
            await this.runInContextTask(function* () {
                exports.TaskLocalEnv.set(that.localScope);
                for (let processor of that.sourceProcessors) {
                    let isAsync = processor.process(processContext);
                    if (isAsync != null && typeof isAsync === 'object' && typeof isAsync.then === 'function') {
                        yield isAsync;
                    }
                }
            });
            return processContext;
        }
        async runCode(source, resultVariable) {
            resultVariable = resultVariable ?? '_';
            let processResult = await this.processSource(source);
            source = processResult.source;
            try {
                let withBlockBegin = 'with(_ENV){';
                let code = new Function('_ENV', withBlockBegin +
                    'return (async ()=>{Promise.__onAsyncEnter();try{\n' + source + '\n}finally{Promise.__onAsyncExit();}})();}');
                let that = this;
                let rt = this.runInContextTask(function* () {
                    return (yield code(that.localScopeProxy));
                });
                let result = await rt;
                if (resultVariable !== '')
                    this.localScope[resultVariable] = result;
                let stringResult = (typeof (result) === 'string') ? result : null;
                return { stringResult, err: null };
            }
            catch (e) {
                if (resultVariable !== '')
                    this.localScope[resultVariable] = e;
                return { stringResult: null, err: e.toString() };
            }
        }
    }
    exports.LocalRunCodeContext = LocalRunCodeContext;
    function JsonStringifyWithCircular(obj) {
        let seen = new Map();
        let path = [];
        return JSON.stringify(obj, (key, value) => {
            if (value && typeof value === 'object') {
                if (seen.has(value)) {
                    return `[Circular -> ${seen.get(value).join('.')}]`;
                }
                seen.set(value, [...path, key]);
            }
            return value;
        });
    }
    class BaseCodeCellListData {
        constructor() {
            this.cellList = new Array();
            this.consoleOutput = {};
        }
        loadFrom(data) {
            let loaded = JSON.parse(data);
            this.cellList = loaded.cellList;
            this.consoleOutput = loaded.consoleOutput;
        }
        saveTo() {
            return JsonStringifyWithCircular({ cellList: this.cellList, consoleOutput: this.consoleOutput });
        }
    }
    exports.BaseCodeCellListData = BaseCodeCellListData;
    exports.newCodeCellListData = new jsutils1.Ref2(() => new BaseCodeCellListData());
});
