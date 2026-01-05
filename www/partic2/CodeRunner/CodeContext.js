define(["require", "exports", "acorn-walk", "acorn", "partic2/jsutils1/base", "partic2/jsutils1/base", "./Inspector", "./pxseedLoader", "./jsutils2"], function (require, exports, acorn_walk_1, acorn, base_1, jsutils1, Inspector_1, pxseedLoader_1, jsutils2_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.jsExecLib = exports.LocalRunCodeContext = exports.CodeContextEvent = exports.CodeContextEventTarget = exports.TaskLocalEnv = void 0;
    exports.enableDebugger = enableDebugger;
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
            this._cachedEventQueue = new jsutils1.ArrayWrap2();
            this._eventQueueExpiredTime = 1000;
        }
        dispatchEvent(event) {
            this._cachedEventQueue.queueSignalPush({ time: jsutils1.GetCurrentTime().getTime(), event });
            setTimeout(() => this._cachedEventQueue.arr().shift(), this._eventQueueExpiredTime);
            return super.dispatchEvent(event);
        }
        addEventListener(type, callback, options) {
            super.addEventListener(type, callback, options);
        }
        removeEventListener(type, callback, options) {
            super.removeEventListener(type, callback);
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
    async function enableDebugger() {
        try {
            if (globalThis?.process?.versions?.node != undefined) {
                (await new Promise((resolve_1, reject_1) => { require(['inspector'], resolve_1, reject_1); })).open(9229);
            }
        }
        catch (err) { }
        ;
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
                __priv_import: (module) => {
                    let imp = this.importHandler(module);
                    return imp;
                },
                //some utils provide by codeContext
                __priv_jsExecLib: exports.jsExecLib,
                //custom source processor for 'runCode' _ENV.__priv_processSource, run before builtin processor.
                __priv_processSource: [],
                event: this.event,
                CodeContextEvent,
                Task: jsutils1.Task,
                TaskLocalRef: jsutils2_1.TaskLocalRef,
                TaskLocalEnv: exports.TaskLocalEnv,
                //Will be close when LocalRunCodeContext is closing.
                autoClosable: {},
                close: () => {
                    this.close();
                }
            };
            this.onConsoleLogListener = (level, argv) => {
                let outputTexts = [];
                for (let t1 of argv) {
                    if (typeof t1 == 'object') {
                        outputTexts.push(JSON.stringify((0, Inspector_1.toSerializableObject)(t1, {})));
                    }
                    else {
                        outputTexts.push(t1);
                    }
                }
                let evt = new CodeContextEvent('console.data', {
                    data: {
                        level,
                        message: outputTexts.join(' ')
                    }
                });
                this.event.dispatchEvent(evt);
            };
            this.completionHandlers = [
                ...Inspector_1.defaultCompletionHandlers
            ];
            jsutils2_1.OnConsoleData.add(this.onConsoleLogListener);
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
        close() {
            jsutils2_1.OnConsoleData.delete(this.onConsoleLogListener);
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
            (0, acorn_walk_1.ancestor)(result, {
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
                        let importStat = [`{let __timp=(await _ENV.__priv_import('${node.source.value}'));`];
                        for (let spec of specs) {
                            importStat.push(`_ENV.${spec.local.name}=__timp.${spec.imported.name};`);
                            foundDecl.push(spec.local.name);
                        }
                        importStat.push('}');
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
        enableDebugger,
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
});
//# sourceMappingURL=CodeContext.js.map