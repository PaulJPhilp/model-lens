#!/usr/bin/env bun
/**
 * Model Lens Analytics
 *
 * Generate insights and reports about AI model data
 */
import pkg from "pg";
const { Pool } = pkg;
// Generate simple analytics
async function generateAnalytics() {
    console.log("📊 Generating analytics...");
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
    });
    const client = await pool.connect();
    try {
        // Basic counts
        const totalResult = await client.query('SELECT COUNT(*) as count FROM model_snapshots');
        const totalModels = parseInt(totalResult.rows[0].count);
        // Provider distribution (top 10)
        const providerResult = await client.query(`
      SELECT model_data->>'provider' as provider, COUNT(*) as count
      FROM model_snapshots
      GROUP BY provider
      ORDER BY count DESC
      LIMIT 10
    `);
        const providers = providerResult.rows.map(p => ({
            name: p.provider || 'Unknown',
            count: parseInt(p.count),
            percentage: Math.round((parseInt(p.count) / totalModels) * 100 * 10) / 10
        }));
        // Source distribution
        const sourceResult = await client.query(`
      SELECT source, COUNT(*) as count
      FROM model_snapshots
      GROUP BY source
      ORDER BY count DESC
    `);
        const sources = sourceResult.rows.map(s => ({
            name: s.source,
            count: parseInt(s.count),
            percentage: Math.round((parseInt(s.count) / totalModels) * 100 * 10) / 10
        }));
        // Top models by name
        const modelResult = await client.query(`
      SELECT model_data->>'name' as name, model_data->>'provider' as provider, source
      FROM model_snapshots
      ORDER BY (model_data->>'name') COLLATE "C"
      LIMIT 10
    `);
        return {
            totalModels,
            providers,
            sources,
            sampleModels: modelResult.rows
        };
    }
    finally {
        client.release();
        await pool.end();
    }
}
// Display analytics in a nice format
function displayAnalytics(analytics) {
    console.log("🚀 Model Lens Analytics Report");
    console.log("==============================");
    console.log();
    console.log(`📊 Total Models: ${analytics.totalModels.toLocaleString()}`);
    console.log();
    console.log("🏢 Top Providers:");
    analytics.providers.slice(0, 10).forEach((p) => {
        console.log(`  ${p.name.padEnd(15)} ${p.count.toString().padStart(6)} (${p.percentage}%)`);
    });
    console.log();
    console.log("📡 Data Sources:");
    analytics.sources.forEach((s) => {
        console.log(`  ${s.name.padEnd(15)} ${s.count.toString().padStart(6)} (${s.percentage}%)`);
    });
    console.log();
    console.log("🤖 Sample Models:");
    analytics.sampleModels.forEach((m) => {
        console.log(`  ${m.name.substring(0, 30).padEnd(30)} ${m.provider.substring(0, 15).padEnd(15)} ${m.source}`);
    });
}
// Main program
async function main() {
    try {
        const analytics = await generateAnalytics();
        displayAnalytics(analytics);
    }
    catch (error) {
        console.error("Analytics generation failed:", error);
        process.exit(1);
    }
}
main();
