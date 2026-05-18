define("partic2/JsNotebook/inspector", ["require", "exports", "partic2/jsutils1/base", "partic2/CodeRunner/Inspector", "partic2/jsutils1/webutils"], function (require, exports, base_1, Inspector_1, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.filepathCompletion = filepathCompletion;
    exports.makeFunctionCompletionWithFilePathArg0 = makeFunctionCompletionWithFilePathArg0;
    exports.setupInspectorHelper = setupInspectorHelper;
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
    function setupInspectorHelper(_ENV) {
        try {
            _ENV.import2env[Inspector_1.CustomFunctionParameterCompletionSymbol] = async (context) => {
                let param = context.code.substring(context.funcParamStart, context.caret);
                let importName2 = param.match(/\(\s*(['"])([^'"]+)$/);
                if (importName2 != null) {
                    let replaceRange = [context.funcParamStart + param.lastIndexOf(importName2[1]) + 1, 0];
                    replaceRange[1] = replaceRange[0] + importName2[2].length;
                    let importName = importName2[2];
                    let t1 = await (0, Inspector_1.importNameCompletion)(importName);
                    let lastSlashOffset = importName.lastIndexOf('/') + 1;
                    replaceRange[0] += lastSlashOffset;
                    context.completionItems.push(...t1.map(v => ({ type: 'literal', candidate: v.substring(lastSlashOffset), replaceRange })));
                }
            };
            _ENV.fs.loadScript[Inspector_1.CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(webutils_1.path.dirname(_ENV.fs.codePath ?? ''));
            _ENV.fs.loadNotebook[Inspector_1.CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(webutils_1.path.dirname(_ENV.fs.codePath ?? ''));
            if (_ENV.fs.simple != undefined) {
                _ENV.fs.simple.readAll[Inspector_1.CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
                _ENV.fs.simple.read[Inspector_1.CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
                _ENV.fs.simple.writeAll[Inspector_1.CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
                _ENV.fs.simple.write[Inspector_1.CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
                _ENV.fs.simple.listdir[Inspector_1.CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
                _ENV.fs.simple.filetype[Inspector_1.CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
                _ENV.fs.simple.delete2[Inspector_1.CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
                _ENV.fs.simple.mkdir[Inspector_1.CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
                _ENV.fs.simple.rename[Inspector_1.CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
            }
        }
        catch (err) {
        }
    }
});
