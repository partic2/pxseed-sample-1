define(["require", "exports", "./backend", "./base", "./extend", "partic2/jsutils1/webutils", "./backend"], function (require, exports, backend_1, base_1, extend_1, webutils_1, backend_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.testAsClient = testAsClient;
    exports.testAsServer = testAsServer;
    async function testAsClient(client2) {
        try {
            if (client2 == undefined) {
                client2 = await new extend_1.RpcExtendClient1(new base_1.Client(await new backend_1.WebSocketIo().connect('ws://127.0.0.1:1345/pxprpc'))).init();
            }
            console.log(await client2.conn.getInfo());
            console.log('server name:' + client2.serverName);
            let get1234 = (await client2.getFunc('test1.get1234'));
            get1234.typedecl('->o');
            let str1 = await get1234.call();
            let printString = (await client2.getFunc('test1.printString'));
            printString.typedecl('o->');
            await printString.call(str1);
            await str1.free();
            let testNone = (await client2.getFunc('test1.testNone'));
            testNone.typedecl('o->o');
            console.log('expect null:', await testNone.call(null));
            let testPrintArg = (await client2.getFunc('test1.testPrintArg'));
            testPrintArg.typedecl('cilfdb->il');
            console.log('multi-result:', await testPrintArg.call(true, 123, BigInt('1122334455667788'), 123.5, 123.123, new TextEncoder().encode('bytes')));
            let testUnser = (await client2.getFunc('test1.testUnser'));
            testUnser.typedecl('b->');
            let serdata = new base_1.Serializer().prepareSerializing(8)
                .putInt(123).putLong(BigInt('1122334455667788')).putFloat(123.5).putDouble(123.123).putString('abcdef').putBytes(new TextEncoder().encode('bytes'))
                .build();
            await testUnser.call(serdata);
            let testTableUnser = (await client2.getFunc('test1.testTableUnser'));
            testTableUnser.typedecl('b->');
            serdata = new extend_1.TableSerializer().setColumnInfo('iscl', null).fromMapArray([{ id: 1554, name: '1.txt', isdir: false, filesize: BigInt('12345') }, { id: 1555, name: 'docs', isdir: true, filesize: BigInt('0') }]).build();
            await testTableUnser.call(serdata);
            let raiseError1 = (await client2.getFunc('test1.raiseError1'));
            try {
                raiseError1.typedecl('->s');
                await raiseError1.call();
            }
            catch (e) {
                console.log(e);
            }
            let autoCloseable = (await client2.getFunc('test1.autoCloseable')).typedecl('->o');
            await autoCloseable.call();
            await client2.close();
        }
        catch (e) {
            console.error(e);
        }
    }
    async function testAsServer(server2) {
        try {
            if (server2 == undefined) {
                server2 = await new extend_1.RpcExtendServer1(new base_1.Server(await new backend_1.WebSocketIo().connect('ws://127.0.0.1:1345/pxprpcClient')));
            }
            extend_1.defaultFuncMap['test1.get1234'] = new extend_1.RpcExtendServerCallable(async () => '1234').typedecl('->o');
            extend_1.defaultFuncMap['test1.printString'] = new extend_1.RpcExtendServerCallable(async (s) => console.log(s)).typedecl('o->');
            extend_1.defaultFuncMap['test1.testUnser'] = new extend_1.RpcExtendServerCallable(async (b) => {
                let ser = new base_1.Serializer().prepareUnserializing(b);
                console.log(ser.getInt(), ser.getLong(), ser.getFloat(), ser.getDouble(), ser.getString(), new TextDecoder().decode(ser.getBytes()));
            }).typedecl('b->');
            extend_1.defaultFuncMap['test1.testTableUnser'] = new extend_1.RpcExtendServerCallable(async (b) => {
                console.log(new extend_1.TableSerializer().load(b).toMapArray());
            }).typedecl('b->');
            extend_1.defaultFuncMap['test1.wait1Sec'] = new extend_1.RpcExtendServerCallable(() => new Promise((resolve) => setTimeout(() => { resolve('tick'); }, 1000))).typedecl('->s');
            extend_1.defaultFuncMap['test1.raiseError1'] = new extend_1.RpcExtendServerCallable(async () => { throw new Error('dummy io error'); }).typedecl('->');
            extend_1.defaultFuncMap['test1.testPrintArg'] = new extend_1.RpcExtendServerCallable(async (a, b, c, d, e, f) => { console.log(a, b, c, d, e, new TextDecoder().decode(f)); return [100, BigInt('1234567890')]; }).typedecl('cilfdb->il');
            extend_1.defaultFuncMap['test1.testNone'] = new extend_1.RpcExtendServerCallable(async (nullValue) => { console.log('expect null', nullValue); return null; }).typedecl('o->o');
            extend_1.defaultFuncMap['test1.autoCloseable'] = new extend_1.RpcExtendServerCallable(async () => { return { close: () => { console.log('auto closeable closed'); } }; }).typedecl('->o');
            await server2.serve();
        }
        catch (e) {
            console.error(e);
        }
    }
    var __name__ = './tests';
    (async () => {
        if (globalThis.window != undefined) {
            let workerThread = (0, webutils_1.CreateWorkerThread)();
            await workerThread.start();
            backend_2.WebMessage.bind(workerThread.port);
            let serv = new backend_2.WebMessage.Server(async (conn) => {
                let server2 = await new extend_1.RpcExtendServer1(new base_1.Server(conn));
                await testAsServer(server2);
            });
            serv.listen('pxprpc test 1');
            await workerThread.runScript(`require(['${__name__}'])`);
        }
        else {
            console.log('worker');
            backend_2.WebMessage.bind(globalThis);
            let client2 = await new extend_1.RpcExtendClient1(new base_1.Client(await new backend_2.WebMessage.Connection().connect('pxprpc test 1'))).init();
            await testAsClient(client2);
        }
        await testAsClient();
        await testAsServer();
    })();
});
//# sourceMappingURL=tests.js.map