import {assert} from 'chai';
import {SQLite} from "../../src/sqlite/SQLite";
import * as fs from "fs";
import {MigrationManager} from "../../src/MigrationManager";
import {Logger} from "layer-logging";
import {randomWord} from "../TestUtils";
import {PersonEntitySchema, PersonRepo} from "../PersonEntity";

describe(`sqlite/SQLite`, function () {

    const single_migration = `res/schema/sqlite/single_migration`;
    let dbPath: string = `sqlite-tests.db`;
    let db: SQLite;
    let repo: PersonRepo;

    beforeEach(async function () {
        return new Promise((resolve => {
            db = new SQLite(dbPath, { callback: async () => {
                    const mm = new MigrationManager(db, {schemaPath: single_migration});
                    await mm.makeSureMigrationsAreUpToDate();
                    repo = new PersonRepo(db);
                    resolve();
                }
            });
        }));
    });

    afterEach(function () {
        if(fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
        }
    });

    before(function () {
        Logger.voidAllConsumers();
    });

    after(function () {
        Logger.restoreConsumersToDefaults();
    });

    it('should create a database file on connection', function () {
        const file = `${randomWord()}.db`;

        return new Promise(((resolve) => {
            new SQLite(file, {callback: () => {
                assert.isTrue(fs.existsSync(file));
                fs.unlinkSync(file);
                resolve();
            }});
        }));
    });

    it('should instantiate SQLite with default config', function () {
        const file = `${randomWord()}.db`;

        return new Promise(((resolve) => {
            new SQLite(file, {callback: () => {
                assert.isTrue(fs.existsSync(file));
                fs.unlinkSync(file);
                resolve();
            }});
        }));
    });

    it('should list tables', function () {
        // TODO: Implement

    });

    it('should insert an autoincrement record', async function () {
        const p = await repo.insert({id: 0, name: randomWord() });

        assert.strictEqual(p.id, 1);

        const all = await repo.getAll();

        assert.strictEqual(all.length, 1);
    });

    it('should update a record', async function () {
        const p = await repo.insert({id: 0, name: randomWord() } );
        const newName = randomWord();

        await repo.update({id: 1, name: newName});
        const persisted = await repo.getOne(1);

        assert.strictEqual(persisted.id, 1);
        assert.strictEqual(persisted.name, newName);
    });

    it('should fail queriesRun on defective sql', async     function () {
        let flag = false;

        try{
            await db.queriesRun("foo foo; foo foo;");
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);
    });

    it('should fail queryRun on defective sql', async function () {
        let flag = false;

        try{
            await db.queryRun("foo foo");
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);
    });

    it('should fail on queryData', async function () {
        let flag = false;

        try{
            await db.queryData("foo foo");
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);
    });

    it('should fail on queryEntity with bad query', async function () {
        let flag = false;

        try{
            await db.queryEntity( PersonEntitySchema, "foo foo");
        }catch(e){
            flag = true;
        }

        assert.isTrue(flag);
    });

    it('should output sql', async function () {
        const token = randomWord();
        const logs: any[] = [];
        const buffer = Logger.consumers.TRACE;
        Logger.consumers.TRACE = data => logs.push(data);
        db.config.echoSQL = true;
        await db.queryData(`SELECT '${token}'`);
        db.config.echoSQL = false;
        Logger.consumers.TRACE = buffer;
        assert.isTrue(String(logs[0]).indexOf(token) > 0);
    });

    it('should output sql when error', async function () {
        const token = randomWord();
        const logs: any[] = [];
        const buffer = Logger.consumers.ERROR;
        Logger.consumers.ERROR = data => logs.push(data);
        db.config.echoErrorSQL = true;
        try{
            await db.queryData(`SELECT ${token}`);
        }catch(e){}
        db.config.echoErrorSQL = false;
        Logger.consumers.ERROR = buffer;
        assert.isTrue(String(logs[0]).indexOf(token) > 0);
    });

    it('should delete a record', async function () {
        const p = await repo.insert({id: 0, name: randomWord() });
        assert.strictEqual(p.id, 1);

        await repo.delete(p);

        const all = await repo.getAll();
        assert.strictEqual(all.length, 0);
    });

});