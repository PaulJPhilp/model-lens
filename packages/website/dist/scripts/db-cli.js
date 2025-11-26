#!/usr/bin/env bun
/**
 * Model Lens Database CLI
 *
 * Simple command-line interface for database inspection
 * Usage: bun run db <command> [options]
 */
import pkg from "pg";
const { Pool } = pkg;
// Parse command line arguments
function parseArgs(args) {
    const options = {
        command: 'help'
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case 'status':
            case 'syncs':
            case 'models':
            case 'query':
            case 'help':
                options.command = arg;
                break;
            case '--limit':
                options.limit = parseInt(args[++i]) || 10;
                break;
            case '--query':
                options.query = args[++i];
                break;
            case '-h':
            case '--help':
                options.command = 'help';
                break;
            default:
                console.error(`Unknown argument: ${arg}`);
                options.command = 'help';
                break;
        }
    }
    return options;
}
// Database operations
const createDbClient = () => {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });
    return pool;
};
// Simple connection test
async function testConnection() {
    const pool = createDbClient();
    try {
        const client = await pool.connect();
        await client.query("SELECT 1");
        client.release();
        await pool.end();
        return true;
    }
    catch (error) {
        await pool.end();
        return false;
    }
}
// Close database connection
async function closeDb() {
    // Pool is closed in each function
}
// CLI Commands Implementation
async function showStatus() {
    var _a, _b, _c;
    console.log("🔍 Database Status");
    console.log("==================");
    try {
        // Basic connection test
        const connected = await testConnection();
        console.log(`Database Connection: ${connected ? '✅ Connected' : '❌ Failed'}`);
        if (!connected)
            return;
        const pool = createDbClient();
        const client = await pool.connect();
        try {
            // Table counts
            const modelResult = await client.query('SELECT COUNT(*) as count FROM model_snapshots');
            const syncResult = await client.query('SELECT COUNT(*) as count FROM model_syncs');
            const modelCount = parseInt(((_a = modelResult.rows[0]) === null || _a === void 0 ? void 0 : _a.count) || '0');
            const syncCount = parseInt(((_b = syncResult.rows[0]) === null || _b === void 0 ? void 0 : _b.count) || '0');
            console.log(`Model Snapshots: ${modelCount.toLocaleString()}`);
            console.log(`Sync Operations: ${syncCount.toLocaleString()}`);
            // Latest sync
            const latestSyncResult = await client.query(`
        SELECT * FROM model_syncs
        ORDER BY started_at DESC
        LIMIT 1
      `);
            if (latestSyncResult.rows.length > 0) {
                const latestSync = latestSyncResult.rows[0];
                const status = latestSync.status === 'completed' ? '✅' : latestSync.status === 'failed' ? '❌' : '⏳';
                console.log(`Latest Sync: ${status} ${latestSync.status} (${new Date(latestSync.started_at).toLocaleString()})`);
                if (latestSync.total_stored) {
                    console.log(`Models Stored: ${parseInt(latestSync.total_stored).toLocaleString()}`);
                }
            }
            // Database size (approximate)
            const dbSizeResult = await client.query('SELECT pg_size_pretty(pg_database_size(current_database())) as size');
            console.log(`Database Size: ${((_c = dbSizeResult.rows[0]) === null || _c === void 0 ? void 0 : _c.size) || 'Unknown'}`);
        }
        finally {
            client.release();
            await pool.end();
        }
    }
    catch (error) {
        console.error("Error getting status:", error);
    }
}
async function showSyncs(options) {
    var _a;
    console.log("🔄 Recent Sync Operations");
    console.log("========================");
    try {
        const pool = createDbClient();
        const client = await pool.connect();
        const limit = options.limit || 10;
        try {
            const result = await client.query(`
        SELECT id, status, started_at, completed_at, total_stored, error_message
        FROM model_syncs
        ORDER BY started_at DESC
        LIMIT $1
      `, [limit]);
            if (result.rows.length === 0) {
                console.log("No sync operations found");
                return;
            }
            console.log("ID".padEnd(8), "Status".padEnd(10), "Started".padEnd(20), "Duration".padEnd(10), "Models".padEnd(8), "Error");
            console.log("-".repeat(80));
            for (const sync of result.rows) {
                const status = sync.status.padEnd(10);
                const started = new Date(sync.started_at).toLocaleString();
                const duration = sync.completed_at
                    ? `${Math.round((new Date(sync.completed_at).getTime() - new Date(sync.started_at).getTime()) / 1000)}s`
                    : '-';
                const models = ((_a = sync.total_stored) === null || _a === void 0 ? void 0 : _a.toString()) || '-';
                const error = sync.error_message ? sync.error_message.substring(0, 30) + '...' : '';
                console.log(sync.id.substring(0, 8).padEnd(8), status, started.padEnd(20), duration.padEnd(10), models.padEnd(8), error);
            }
        }
        finally {
            client.release();
            await pool.end();
        }
    }
    catch (error) {
        console.error("Error getting syncs:", error);
    }
}
async function showModels(options) {
    console.log("🤖 Recent Models");
    console.log("================");
    try {
        const pool = createDbClient();
        const client = await pool.connect();
        const limit = options.limit || 20;
        try {
            const result = await client.query(`
        SELECT
          model_data->>'name' as name,
          model_data->>'provider' as provider,
          source,
          synced_at
        FROM model_snapshots
        ORDER BY synced_at DESC
        LIMIT $1
      `, [limit]);
            if (result.rows.length === 0) {
                console.log("No models found");
                return;
            }
            console.log("Name".padEnd(30), "Provider".padEnd(15), "Source".padEnd(12), "Synced");
            console.log("-".repeat(80));
            for (const model of result.rows) {
                const name = (model.name || 'Unknown').substring(0, 30);
                const provider = (model.provider || 'Unknown').substring(0, 15);
                const source = model.source.substring(0, 12);
                const synced = new Date(model.synced_at).toLocaleDateString();
                console.log(name.padEnd(30), provider.padEnd(15), source.padEnd(12), synced);
            }
        }
        finally {
            client.release();
            await pool.end();
        }
    }
    catch (error) {
        console.error("Error getting models:", error);
    }
}
async function runQuery(options) {
    if (!options.query) {
        console.error("❌ --query parameter required");
        return;
    }
    console.log("🔍 Running Custom Query");
    console.log("======================");
    console.log(`Query: ${options.query}`);
    console.log();
    try {
        const pool = createDbClient();
        const client = await pool.connect();
        try {
            const result = await client.query(options.query);
            if (result.rows && result.rows.length > 0) {
                // Simple table output for results
                const rows = result.rows.slice(0, 10); // Limit output
                if (rows.length > 0) {
                    const columns = Object.keys(rows[0]);
                    // Header
                    console.log(columns.map(c => c.padEnd(20)).join(' | '));
                    console.log('-'.repeat(columns.length * 22));
                    // Rows
                    for (const row of rows) {
                        const values = columns.map(col => String(row[col] || '').substring(0, 20));
                        console.log(values.map(v => v.padEnd(20)).join(' | '));
                    }
                    if (result.rows.length > 10) {
                        console.log(`\\n⚠️  Showing first 10 of ${result.rows.length} rows`);
                    }
                }
            }
            else {
                console.log("No results");
            }
        }
        finally {
            client.release();
            await pool.end();
        }
    }
    catch (error) {
        console.error("Query failed:", error);
    }
}
function showHelp() {
    console.log("Model Lens Database CLI");
    console.log("=======================");
    console.log();
    console.log("Usage: bun run db <command> [options]");
    console.log();
    console.log("Commands:");
    console.log("  status              Show database status and basic stats");
    console.log("  syncs               List recent sync operations");
    console.log("  models              List recent models");
    console.log("  query               Run custom SQL query");
    console.log("  help                Show this help message");
    console.log();
    console.log("Options:");
    console.log("  --limit <n>         Limit results (default: 10-20)");
    console.log("  --query <sql>       SQL query to run");
    console.log("  -h, --help          Show help");
    console.log();
    console.log("Examples:");
    console.log("  bun run db status");
    console.log("  bun run db syncs --limit 5");
    console.log("  bun run db models");
    console.log("  bun run db query --query \"SELECT COUNT(*) FROM model_snapshots\"");
}
// Main CLI runner
async function runCLI(options) {
    try {
        switch (options.command) {
            case 'status':
                await showStatus();
                break;
            case 'syncs':
                await showSyncs(options);
                break;
            case 'models':
                await showModels(options);
                break;
            case 'query':
                await runQuery(options);
                break;
            case 'help':
            default:
                showHelp();
                break;
        }
    }
    catch (error) {
        console.error("CLI Error:", error);
    }
}
// Main program
const options = parseArgs(process.argv.slice(2));
// Run CLI
runCLI(options).catch((error) => {
    console.error("CLI Error:", error);
    process.exit(1);
});
