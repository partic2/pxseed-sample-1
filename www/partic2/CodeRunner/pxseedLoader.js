//Some function to process source 
define("partic2/CodeRunner/pxseedLoader", ["require", "exports", "acorn", "acorn-walk", "partic2/jsutils1/base", "./jsutils2"], function (require, exports, acorn, acornWalk, base_1, jsutils2_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.setupAsyncHook = exports.JsSourceReplacePlan = void 0;
    exports.addAsyncHook = addAsyncHook;
    exports.ensureModuleImported = ensureModuleImported;
    exports.addAutoAsyncAwait = addAutoAsyncAwait;
    exports.addAsyncHookPxseedLoader = addAsyncHookPxseedLoader;
    exports.addAutoAsyncAwaitPxseedLoader = addAutoAsyncAwaitPxseedLoader;
    const __name__ = base_1.requirejs.getLocalRequireModule(require);
    class JsSourceReplacePlan {
        constructor(source) {
            this.source = source;
            this.plan = [];
        }
        ast() {
            if (this.parsedAst == undefined) {
                this.parsedAst = acorn.parse(this.source, acorn.defaultOptions);
            }
            return this.parsedAst;
        }
        apply() {
            let modified = [];
            let start = 0;
            this.plan.sort((a, b) => {
                if (a.end <= b.start) {
                    return -1;
                }
                else if (a.start >= b.end) {
                    return 1;
                }
                else {
                    throw new Error('Invaid params:plan');
                }
            });
            this.plan.forEach(plan => {
                modified.push(this.source.substring(start, plan.start));
                modified.push(plan.newString);
                start = plan.end;
            });
            modified.push(this.source.substring(start));
            return modified.join('');
        }
    }
    exports.JsSourceReplacePlan = JsSourceReplacePlan;
    //XXX:Support top most await?
    function addAsyncEnterExitHook(node, replacePlan) {
        if (node.async && node.body.type === 'BlockStatement') {
            let enterHook = `Promise.__onAsyncEnter();try{`;
            if (!(replacePlan.source.substring(node.body.start + 1, node.body.start + 1 + enterHook.length) === enterHook)) {
                replacePlan.plan.push({
                    start: node.body.start + 1,
                    end: node.body.start + 1,
                    newString: enterHook
                });
                replacePlan.plan.push({
                    start: node.body.end - 1,
                    end: node.body.end - 1,
                    newString: `}finally{Promise.__onAsyncExit();}`
                });
            }
        }
    }
    function addAsyncHook(replacePlan) {
        let result = replacePlan.ast();
        acornWalk.ancestor(result, {
            FunctionDeclaration(node, state, ancestors) {
                addAsyncEnterExitHook(node, replacePlan);
            },
            ArrowFunctionExpression(node, state, ancestors) {
                addAsyncEnterExitHook(node, replacePlan);
            },
            FunctionExpression(node, state, ancestors) {
                addAsyncEnterExitHook(node, replacePlan);
            },
            AwaitExpression(node, state, ancestors) {
                let awaitHook = 'Promise.__onAwait(';
                if (!(replacePlan.source.substring(node.argument.start, node.argument.start + awaitHook.length) === awaitHook)) {
                    replacePlan.plan.push({
                        start: node.argument.start,
                        end: node.argument.start,
                        newString: ' ' + awaitHook
                    });
                    replacePlan.plan.push({
                        start: node.argument.end,
                        end: node.argument.end,
                        newString: ')'
                    });
                }
            }
        });
    }
    Object.defineProperty(exports, "setupAsyncHook", { enumerable: true, get: function () { return jsutils2_1.setupAsyncHook; } });
    async function ensureModuleImported(replacePlan, moduleName) {
        //Only support top most AMD declare
        for (let t1 of replacePlan.ast().body) {
            if (t1.type === 'ExpressionStatement' && t1.expression.type === 'CallExpression' &&
                t1.expression.callee.type === 'Identifier' && t1.expression.callee.name === 'define') {
                let t2 = t1.expression.arguments;
                let t3 = t2[0].type === 'ArrayExpression' ? t2[0] : t2[1];
                let deps = JSON.parse(replacePlan.source.substring(t3.start, t3.end));
                if (!deps.includes(moduleName)) {
                    deps.push(moduleName);
                    replacePlan.plan.push({ start: t3.start, end: t3.end, newString: JSON.stringify(deps) });
                }
            }
        }
    }
    async function addAutoAsyncAwait(replacePlan, initDirective) {
        let sast = replacePlan.ast();
        function ensureFunctionAsync(node, replacePlan) {
            if (!node.async) {
                replacePlan.plan.push({
                    start: node.start,
                    end: node.start,
                    newString: ' async '
                });
            }
        }
        function ensureFunctionCallAwait(node, ancestors, replacePlan) {
            if (ancestors.at(-2)?.type !== 'AwaitExpression') {
                replacePlan.plan.push({
                    start: node.start,
                    end: node.start,
                    newString: (ancestors.at(-2)?.type === 'ExpressionStatement' ? ';' : '') + '(await '
                });
                replacePlan.plan.push({
                    start: node.end,
                    end: node.end,
                    newString: ')'
                });
            }
        }
        acornWalk.ancestor(sast, {
            FunctionDeclaration(node, state, ancestors) {
                if (state.at(-1).autoAsync === true) {
                    ensureFunctionAsync(node, replacePlan);
                }
            },
            ArrowFunctionExpression(node, state, ancestors) {
                if (state.at(-1).autoAsync === true) {
                    ensureFunctionAsync(node, replacePlan);
                }
            },
            FunctionExpression(node, state, ancestors) {
                if (state.at(-1).autoAsync === true) {
                    ensureFunctionAsync(node, replacePlan);
                }
            },
            CallExpression(node, state, ancestors) {
                if (node.callee.type == 'Identifier' && node.callee.name === '__transpile__' && node.arguments.length === 2) {
                    //skip
                }
                else if (state.at(-1).autoAsync === true) {
                    ensureFunctionCallAwait(node, ancestors, replacePlan);
                }
            },
            ImportExpression(node, state, ancestors) {
                if (state.at(-1).autoAsync === true) {
                    ensureFunctionCallAwait(node, ancestors, replacePlan);
                }
            },
            ForOfStatement(node, state, ancestors) {
                if (state.at(-1).autoAsync === true) {
                    if (!node.await) {
                        replacePlan.plan.push({
                            start: node.start + 3,
                            end: node.start + 3,
                            newString: ' await'
                        });
                    }
                }
            }
        }, {
            ...acornWalk.base,
            CallExpression: (node, state, walk) => {
                if (node.callee.type == 'Identifier' && node.callee.name === '__transpile__' && node.arguments.length === 2) {
                    let directive = { ...state.at(-1), ...(new Function('return ' + replacePlan.source.substring(node.arguments[0].start, node.arguments[0].end))()) };
                    state.push(directive);
                    walk(node.arguments[1], state);
                    state.pop();
                }
                else {
                    acornWalk.base.CallExpression?.(node, state, walk);
                }
            }
        }, [initDirective ?? {}]);
    }
    async function addAsyncHookPxseedLoader(dir, config, status) {
        const { sourceDir, outputDir } = await new Promise((resolve_1, reject_1) => { require(['pxseedBuildScript/loaders'], resolve_1, reject_1); });
        const { getNodeCompatApi } = await new Promise((resolve_2, reject_2) => { require(['pxseedBuildScript/util'], resolve_2, reject_2); });
        const { fs, path } = await getNodeCompatApi();
        let packageOutput = outputDir + '/' + dir.substring(sourceDir.length + 1);
        if (config.include == undefined) {
            config.include = ['**/*.js'];
        }
        const { simpleGlob } = await new Promise((resolve_3, reject_3) => { require(['pxseedBuildScript/util'], resolve_3, reject_3); });
        let lastCompleteTime = status.loadersData[__name__ + '.addAsyncHookPxseedLoader']?.completeTime ?? 1;
        for (let file1 of await simpleGlob(config.include, { cwd: packageOutput })) {
            let fpath = path.join(packageOutput, file1);
            let finfo = await fs.stat(fpath);
            if (finfo.mtime.getTime() > lastCompleteTime) {
                console.info('addAsyncHook:', file1);
                let source = new TextDecoder().decode(await fs.readFile(fpath));
                let replacePlan = new JsSourceReplacePlan(source);
                replacePlan.parsedAst = acorn.parse(source, { allowAwaitOutsideFunction: true, ecmaVersion: 'latest', allowReturnOutsideFunction: true });
                addAsyncHook(replacePlan);
                let modified = replacePlan.apply();
                await fs.writeFile(fpath, new TextEncoder().encode(modified));
            }
        }
        status.loadersData[__name__ + '.addAsyncHookPxseedLoader'] = { completeTime: (0, base_1.GetCurrentTime)().getTime() };
    }
    async function addAutoAsyncAwaitPxseedLoader(dir, config, status) {
        const { sourceDir, outputDir } = await new Promise((resolve_4, reject_4) => { require(['pxseedBuildScript/loaders'], resolve_4, reject_4); });
        const { getNodeCompatApi } = await new Promise((resolve_5, reject_5) => { require(['pxseedBuildScript/util'], resolve_5, reject_5); });
        const { fs, path } = await getNodeCompatApi();
        let packageOutput = outputDir + '/' + dir.substring(sourceDir.length + 1);
        if (config.include == undefined) {
            config.include = ['**/*.js'];
        }
        const { simpleGlob } = await new Promise((resolve_6, reject_6) => { require(['pxseedBuildScript/util'], resolve_6, reject_6); });
        let lastCompleteTime = status.loadersData[__name__ + '.addAutoAsyncAwaitPxseedLoader']?.completeTime ?? 1;
        for (let file1 of await simpleGlob(config.include, { cwd: packageOutput })) {
            let fpath = path.join(packageOutput, file1);
            let finfo = await fs.stat(fpath);
            if (finfo.mtime.getTime() > lastCompleteTime) {
                console.info('addAutoAsyncAwait:', file1);
                let source = new TextDecoder().decode(await fs.readFile(fpath));
                let replacePlan = new JsSourceReplacePlan(source);
                replacePlan.parsedAst = acorn.parse(source, { allowAwaitOutsideFunction: true, ecmaVersion: 'latest', allowReturnOutsideFunction: true });
                addAutoAsyncAwait(replacePlan);
                let modified = replacePlan.apply();
                await fs.writeFile(fpath, new TextEncoder().encode(modified));
            }
        }
        status.loadersData[__name__ + '.addAutoAsyncAwaitPxseedLoader'] = { completeTime: (0, base_1.GetCurrentTime)().getTime() };
    }
});
