define("partic2/CodeRunner/CodeContext", ["require", "exports", "acorn-walk", "acorn", "partic2/jsutils1/base", "partic2/jsutils1/base", "./pxseedLoader", "./jsutils2"], function (require, exports, acornWalk, acorn, base_1, jsutils1, pxseedLoader_1, jsutils2_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LocalRunCodeContext = exports.__internal__ = exports.CodeContextEvent = exports.CodeContextEventTarget = exports.TaskLocalEnv = void 0;
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
            this._lastSeq = 0;
        }
        dispatchEvent(event) {
            this._lastSeq++;
            this._cachedEventQueue.queueSignalPush({ time: jsutils1.GetCurrentTime().getTime(), event, seq: this._lastSeq });
            setTimeout(() => this._cachedEventQueue.arr().shift(), this._eventQueueExpiredTime);
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
    async function enableDebugger() {
        try {
            if (globalThis?.process?.versions?.node != undefined) {
                (await new Promise((resolve_1, reject_1) => { require(['inspector'], resolve_1, reject_1); })).open(9229);
            }
        }
        catch (err) { }
        ;
    }
    async function defaultCodeTranspilingProcessor(processContext) {
        let replacePlan = new pxseedLoader_1.JsSourceReplacePlan(processContext.source);
        await (0, pxseedLoader_1.addAutoAsyncAwait)(replacePlan, processContext._ENV.__topLevelTranspileDirective ?? {});
        processContext.source = replacePlan.apply();
    }
    exports.__internal__ = {
        defaultCodeTranspilingProcessor
    };
    class LocalRunCodeContext {
        constructor() {
            this.importHandler = async (source) => {
                return new Promise((resolve_2, reject_2) => { require([source], resolve_2, reject_2); });
            };
            this.event = new CodeContextEventTarget();
            this.localScope = {
                //this CodeContext
                __priv_codeContext: undefined,
                //import implemention
                __priv_import: async (module) => {
                    let imp = await this.importHandler(module);
                    return imp;
                },
                __topLevelTranspileDirective: {},
                __transpile__: (directive, source) => source,
                //some utils provide by codeContext
                //custom source processor for 'runCode' _ENV.__priv_processSource, run before builtin processor.
                __priv_sourceProcessors: [{ name: __name__ + '.defaultCodeTranspilingProcessor', process: defaultCodeTranspilingProcessor }],
                callModuleFunction: async (module, func, args) => {
                    let imp = await this.importHandler(module);
                    return await imp[func](...args);
                },
                event: this.event,
                CodeContextEvent,
                Task: jsutils1.Task,
                tasks: {},
                //Will be close when LocalRunCodeContext is closing.
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
            this.localScope.__priv_codeContext = this;
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
        close() {
            this.event.dispatchEvent(new CodeContextEvent('close'));
            for (let [k1, v1] of Object.entries(this.localScope.autoClosable)) {
                if (v1.close != undefined) {
                    v1.close();
                }
            }
        }
        async callFunction(name, args) {
            let taskName = __name__ + '.task-' + jsutils1.GenerateRandomString();
            let that = this;
            let t = jsutils1.Task.fork(function* () {
                let curtask = jsutils1.Task.currentTask;
                curtask.name = taskName;
                that.localScope.tasks[taskName] = curtask;
                exports.TaskLocalEnv.set(that.localScope);
                try {
                    let r = that.localScope[name](...args);
                    if (typeof r === 'object' && 'then' in r) {
                        r = yield r;
                    }
                    return r;
                }
                finally {
                    delete that.localScope.tasks[taskName];
                }
            }).run();
            return await t;
        }
        async processSource(source) {
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
                exports.TaskLocalEnv.set(that.localScope);
                for (let processor of that.localScope.__priv_sourceProcessors) {
                    let isAsync = processor.process(processContext);
                    if (isAsync != undefined && 'then' in isAsync) {
                        yield isAsync;
                    }
                }
            }).run();
            source = processContext.source;
            let proc1 = await this.processSource(source);
            try {
                let result = await this.runCodeInScope(proc1.modifiedSource);
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
        async runCodeInScope(source) {
            let withBlockBegin = 'with(_ENV){';
            let code = new Function('_ENV', withBlockBegin +
                'return (async ()=>{Promise.__onAsyncEnter();try{\n' + source + '\n}finally{Promise.__onAsyncExit();}})();}');
            let that = this;
            let taskName = __name__ + '.task-' + jsutils1.GenerateRandomString();
            let r = jsutils1.Task.fork(function* () {
                let curtask = jsutils1.Task.currentTask;
                curtask.name = taskName;
                that.localScope.tasks[taskName] = curtask;
                exports.TaskLocalEnv.set(that.localScope);
                try {
                    return (yield code(that.localScopeProxy));
                }
                finally {
                    delete that.localScope.tasks[taskName];
                }
            }).run();
            return await r;
        }
    }
    exports.LocalRunCodeContext = LocalRunCodeContext;
});
