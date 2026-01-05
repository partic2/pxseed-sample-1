define(["require", "exports", "./kvdb", "./worker", "./jseio"], function (require, exports, kvdb_1, worker_1, jseio_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__inited__ = void 0;
    function setupImpl() {
        (0, kvdb_1.setupImpl)();
        (0, worker_1.setupImpl)();
        (0, jseio_1.setup)();
        if (globalThis.open == undefined) {
            globalThis.open = (async (url, target) => {
                let jscode = '';
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    let resp = await fetch(url);
                    if (resp.ok) {
                        jscode = await resp.text();
                    }
                    else {
                        throw new Error(await resp.text());
                    }
                }
                else if (url.startsWith('file://')) {
                    let path = url.substring(7);
                    let os = await new Promise((resolve_1, reject_1) => { require(['os'], resolve_1, reject_1); });
                    if (os.platform() === 'win32') {
                        path = path.substring(1);
                    }
                    let fs = await new Promise((resolve_2, reject_2) => { require(['fs/promises'], resolve_2, reject_2); });
                    jscode = new TextDecoder().decode(await fs.readFile(path));
                }
                new Function(jscode)();
            });
        }
    }
    exports.__inited__ = (async () => {
        if (globalThis.process?.versions?.node == undefined) {
            console.warn('This module is only used to initialize pxseed environment on Node.js,' +
                ' and has no effect on other platform.' +
                'Also avoid to import this module on other platform.');
        }
        else {
            setupImpl();
        }
    })();
});
//# sourceMappingURL=env.js.map