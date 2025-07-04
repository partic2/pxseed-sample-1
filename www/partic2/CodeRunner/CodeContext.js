define(["require", "exports", "acorn-walk", "acorn", "partic2/jsutils1/base", "partic2/jsutils1/base", "./Inspector", "partic2/pxprpcClient/registry", "./pxseedLoader", "./jsutils2"], function (require, exports, acorn_walk_1, acorn, base_1, jsutils1, Inspector_1, registry_1, pxseedLoader_1, jsutils2_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.registry = exports.jsExecLib = exports.LocalRunCodeContext = exports.CodeContextEvent = exports.CodeContextEventTarget = exports.TaskLocalEnv = void 0;
    exports.enableDebugger = enableDebugger;
    acorn.defaultOptions.allowAwaitOutsideFunction = true;
    acorn.defaultOptions.ecmaVersion = 'latest';
    acorn.defaultOptions.allowReturnOutsideFunction = true;
    acorn.defaultOptions.sourceType = 'module';
    const __name__ = base_1.requirejs.getLocalRequireModule(require);
    exports.TaskLocalEnv = new jsutils2_1.TaskLocalRef({ __noenv: true });
    (0, pxseedLoader_1.setupAsyncHook)();
    class CodeContextEventTarget extends EventTarget {
        dispatchEvent(event) {
            this.onAnyEvent?.(event);
            return super.dispatchEvent(event);
        }
    }
    exports.CodeContextEventTarget = CodeContextEventTarget;
    //RunCodeContext.jsExec run code like this
    async function __jsExecSample(lib, codeContext) {
        //Your code
        return '';
    }
    class CodeContextEvent extends Event {
        constructor(type, initDict) {
            super(type ?? __name__ + '.CodeContextEvent', {});
            this.data = undefined;
            this.data = initDict?.data;
        }
    }
    exports.CodeContextEvent = CodeContextEvent;
    let FuncCallEventType = jsutils1.GenerateRandomString();
    class FuncCallEvent extends Event {
        constructor() {
            super(...arguments);
            this.originalFunction = null;
            this.argv = [];
        }
    }
    class CFuncCallProbe extends EventTarget {
        constructor(originalFunction) {
            super();
            this.originalFunction = originalFunction;
        }
        hooked() {
            let that = this;
            return function (...argv) {
                let e = new FuncCallEvent(FuncCallEventType);
                e.argv = argv;
                e.originalFunction = that.originalFunction;
                that.dispatchEvent(e);
                return that.originalFunction.apply(this, argv);
            };
        }
    }
    let CodeContextProp = Symbol('CodeContextProp');
    async function enableDebugger() {
        try {
            if (globalThis?.process?.versions?.node != undefined) {
                (await new Promise((resolve_1, reject_1) => { require(['inspector'], resolve_1, reject_1); })).open(9229);
            }
        }
        catch (err) { }
        ;
    }
    function ensureFunctionProbe(o, p) {
        let func = o[p];
        let p2;
        if (CodeContextProp in func) {
            p2 = func[CodeContextProp];
            if (p2.funcCallProbe == undefined) {
                p2.funcCallProbe = new CFuncCallProbe(func);
                o[p] = p2.funcCallProbe.hooked();
                o[p][CodeContextProp] = p2;
            }
        }
        else {
            p2 = {
                funcCallProbe: new CFuncCallProbe(func)
            };
            func[CodeContextProp] = p2;
            o[p] = p2.funcCallProbe.hooked();
            o[p][CodeContextProp] = p2;
        }
        return p2.funcCallProbe;
    }
    class LocalRunCodeContext {
        constructor() {
            this.importHandler = async (source) => {
                return base_1.requirejs.promiseRequire(source);
            };
            this.event = new CodeContextEventTarget();
            this.localScope = {
                //this CodeContext
                __priv_codeContext: undefined,
                //import implemention
                __priv_import: async function (module) {
                    let imp = this.__priv_codeContext.importHandler(module);
                    return imp;
                },
                //some utils provide by codeContext
                __priv_jsExecLib: exports.jsExecLib,
                //custom source processor for 'runCode' _ENV.__priv_processSource, run before builtin processor.
                __priv_processSource: [],
                servePipe: this.servePipe.bind(this),
                event: this.event,
                //Will be close when LocalRunCodeContext is closing.
                autoClosable: {},
                enableDebugger
            };
            this.onConsoleLogListener = (e) => {
                let e2 = e;
                let name = e2.originalFunction.name;
                let outputTexts = [];
                for (let t1 of e2.argv) {
                    if (typeof t1 == 'object') {
                        outputTexts.push(JSON.stringify((0, Inspector_1.toSerializableObject)(t1, {})));
                    }
                    else {
                        outputTexts.push(t1);
                    }
                }
                let evt = new CodeContextEvent('console.data', {
                    data: {
                        level: name,
                        message: outputTexts.join(' ')
                    }
                });
                this.event.dispatchEvent(evt);
            };
            this.servingPipe = new Map();
            this.completionHandlers = [
                ...Inspector_1.defaultCompletionHandlers
            ];
            ensureFunctionProbe(console, 'log').addEventListener(FuncCallEventType, this.onConsoleLogListener);
            ensureFunctionProbe(console, 'debug').addEventListener(FuncCallEventType, this.onConsoleLogListener);
            ensureFunctionProbe(console, 'info').addEventListener(FuncCallEventType, this.onConsoleLogListener);
            ensureFunctionProbe(console, 'warn').addEventListener(FuncCallEventType, this.onConsoleLogListener);
            ensureFunctionProbe(console, 'error').addEventListener(FuncCallEventType, this.onConsoleLogListener);
            this.localScope.__priv_codeContext = this;
            this.localScope._ENV = this.localScope;
            this.localScope.console = { ...console };
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
        async connectPipe(name) {
            let pipe1 = this.servingPipe.get(name);
            if (pipe1 == null) {
                return null;
            }
            else {
                this.servingPipe.delete(name);
                return pipe1[0];
            }
        }
        async servePipe(name) {
            let pipe1 = (0, registry_1.createIoPipe)();
            this.servingPipe.set(name, pipe1);
            return pipe1[1];
        }
        async queryTooltip(code, caret) {
            return '';
        }
        close() {
            ensureFunctionProbe(console, 'log').removeEventListener(FuncCallEventType, this.onConsoleLogListener);
            ensureFunctionProbe(console, 'debug').removeEventListener(FuncCallEventType, this.onConsoleLogListener);
            ensureFunctionProbe(console, 'info').removeEventListener(FuncCallEventType, this.onConsoleLogListener);
            ensureFunctionProbe(console, 'warn').removeEventListener(FuncCallEventType, this.onConsoleLogListener);
            ensureFunctionProbe(console, 'error').removeEventListener(FuncCallEventType, this.onConsoleLogListener);
            this.event.dispatchEvent(new CodeContextEvent('close'));
            for (let [k1, v1] of Object.entries(this.localScope.autoClosable)) {
                if (v1.close != undefined) {
                    v1.close();
                }
            }
        }
        async jsExec(code) {
            let r = new Function('lib', 'codeContext', `return (async ()=>{${code}})();`)(exports.jsExecLib, this);
            if (r instanceof Promise) {
                r = await r;
            }
            if ((typeof r) === 'string') {
                return r;
            }
            return '';
        }
        processSource(source) {
            let replacePlan = new pxseedLoader_1.JsSourceReplacePlan(source);
            let result = acorn.parse(source, { allowAwaitOutsideFunction: true, ecmaVersion: 'latest', allowReturnOutsideFunction: true });
            replacePlan.parsedAst = result;
            let foundDecl = [];
            (0, acorn_walk_1.ancestor)(result, {
                VariableDeclaration(node, state, ancetors) {
                    if (ancetors.find(v => v.type === 'FunctionExpression'))
                        return;
                    if (ancetors.find(v => v.type === 'BlockStatement') !== undefined && node.kind === 'let')
                        return;
                    replacePlan.plan.push({ start: node.start, end: node.start + 3, newString: ' ' });
                    node.declarations.forEach(v => {
                        if (v.id.type === 'Identifier') {
                            foundDecl.push(v.id.name);
                        }
                        else if (v.id.type === 'ObjectPattern') {
                            foundDecl.push(...v.id.properties.map(v2 => v2.key.name));
                        }
                        else if (v.id.type === 'ArrayPattern') {
                            foundDecl.push(...v.id.elements.filter(v2 => v2 != null).map(v2 => v2.name));
                        }
                    });
                },
                FunctionDeclaration(node, state, ancetors) {
                    if (node.expression ||
                        ancetors.find(v => v.type === 'FunctionExpression') != undefined) {
                        return;
                    }
                    if (node.id == null)
                        return;
                    foundDecl.push(node.id.name);
                    let funcType1 = source.substring(node.start, node.id.start);
                    replacePlan.plan.push({ start: node.start, end: node.id.end, newString: node.id.name + '=' + funcType1 });
                },
                ClassDeclaration(node, state, ancetors) {
                    if (ancetors.find(v => v.type === 'FunctionExpression') != undefined) {
                        return;
                    }
                    if (node.id == null)
                        return;
                    foundDecl.push(node.id.name);
                    let clsType1 = source.substring(node.start, node.id.start);
                    replacePlan.plan.push({ start: node.start, end: node.id.end, newString: node.id.name + '=' + clsType1 });
                },
                ImportExpression(node, state, ancetors) {
                    replacePlan.plan.push({ start: node.start, end: node.start + 6, newString: '_ENV.__priv_import' });
                },
                ImportDeclaration(node, state, ancestor) {
                    if (node.specifiers.length === 1 && node.specifiers[0].type === 'ImportNamespaceSpecifier') {
                        let spec = node.specifiers[0];
                        replacePlan.plan.push({ start: node.start, end: node.end, newString: `${spec.local.name}=await _ENV.__priv_import('${node.source.value}');` });
                        foundDecl.push(spec.local.name);
                    }
                    else if (node.specifiers.length > 0 && node.specifiers[0].type === 'ImportSpecifier') {
                        let specs = node.specifiers;
                        let importStat = [];
                        for (let spec of specs) {
                            importStat.push(`${spec.local.name}=(await _ENV.__priv_import('${node.source.value}')).${spec.imported.name};`);
                            foundDecl.push(spec.local.name);
                        }
                        replacePlan.plan.push({ start: node.start, end: node.end, newString: importStat.join('') });
                    }
                    else if (node.specifiers.length === 1 && node.specifiers[0].type === 'ImportDefaultSpecifier') {
                        let spec = node.specifiers[0];
                        replacePlan.plan.push({ start: node.start, end: node.end, newString: `${spec.local.name}=(await _ENV.__priv_import('${node.source.value}')).default;` });
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
            return {
                declaringVariableNames: foundDecl,
                modifiedSource
            };
        }
        async runCode(source, resultVariable) {
            resultVariable = resultVariable ?? '_';
            let that = this;
            let processContext = { _ENV: this.localScope, source };
            await jsutils1.Task.fork(function* () {
                for (let processor of that.localScope.__priv_processSource) {
                    let isAsync = processor(processContext);
                    if (isAsync != undefined && 'then' in isAsync) {
                        yield isAsync;
                    }
                }
            }).run();
            source = processContext.source;
            let proc1 = this.processSource(source);
            try {
                let result = await this.runCodeInScope(proc1.modifiedSource);
                this.localScope[resultVariable] = result;
                let stringResult = (typeof (result) === 'string') ? result : null;
                return { stringResult, err: null };
            }
            catch (e) {
                let { message, stack } = e;
                return { stringResult: null, err: { message, stack } };
            }
        }
        async runCodeInScope(source) {
            let withBlockBegin = 'with(_ENV){';
            let code = new Function('_ENV', withBlockBegin +
                'return (async ()=>{' + source + '\n})();}');
            let that = this;
            //TODO: Custom await scheduler and stack tracer, to avoid Task context missing after "await"
            let r = jsutils1.Task.fork(function* () {
                exports.TaskLocalEnv.set(that.localScope);
                return (yield code(that.localScopeProxy));
            }).run();
            return await r;
        }
        async codeComplete(code, caret) {
            let completeContext = {
                code, caret, codeContext: this, completionItems: []
            };
            for (let t1 of this.completionHandlers) {
                //Mute error
                try {
                    await t1(completeContext);
                }
                catch (e) {
                    jsutils1.throwIfAbortError(e);
                }
            }
            return completeContext.completionItems;
        }
    }
    exports.LocalRunCodeContext = LocalRunCodeContext;
    exports.jsExecLib = {
        jsutils1, LocalRunCodeContext, toSerializableObject: Inspector_1.toSerializableObject, fromSerializableObject: Inspector_1.fromSerializableObject, importModule: (name) => new Promise((resolve_2, reject_2) => { require([name], resolve_2, reject_2); }),
        iteratorNext: async (iterator, count) => {
            let arr = [];
            for (let t1 = 0; t1 < count; t1++) {
                let itr = await iterator.next();
                if (itr.done)
                    break;
                arr.push(itr.value);
            }
            return arr;
        }
    };
    exports.registry = {
        contexts: {},
        set(name, context) {
            if (context == null) {
                delete this.contexts[name];
            }
            else {
                this.contexts[name] = context;
            }
            this.__change.setResult(null);
        },
        get(name) {
            return this.contexts[name] ?? null;
        },
        list() {
            let t1 = [];
            for (let t2 in this.contexts) {
                t1.push(t2);
            }
            return t1;
        },
        __change: new jsutils1.future(),
        async waitChange() {
            let fut = this.__change;
            await fut.get();
            if (fut == this.__change) {
                this.__change = new jsutils1.future();
            }
        }
    };
});
//# sourceMappingURL=CodeContext.js.map