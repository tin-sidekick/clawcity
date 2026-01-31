#!/usr/bin/env tsx
// ============================================================
// ClawCity — Integration Test
// Simulates a mini game session to verify everything works
// ============================================================

import { initDb, getDb, getAllAgents, getAllBuildings, getWorldState, setWorldState } from './db/index.js';
import { MapManager } from './engine/map.js';
import { ActionQueue } from './engine/actions.js';
import { HighlightDetector } from './engine/highlights.js';
import { WorldEventSystem } from './engine/world-events.js';
import { TickEngine } from './engine/tick.js';
import { CONFIG } from './config.js';

// Use a test database
process.env.DB_PATH = 'clawcity-test.db';

// Force clean test DB
import { unlinkSync } from 'fs';
try { unlinkSync('clawcity-test.db'); } catch {}
try { unlinkSync('clawcity-test.db-wal'); } catch {}
try { unlinkSync('clawcity-test.db-shm'); } catch {}

const PASS = '✅';
const FAIL = '❌';
const INFO = 'ℹ️';

let totalChecks = 0;
let passedChecks = 0;

function check(label: string, condition: boolean, detail?: string): void {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ${PASS} ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    console.log(`  ${FAIL} ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

async function runTest() {
  console.log('\n🏝️  ClawCity Integration Test\n');
  console.log('=' .repeat(60));

  // ── Step 1: Initialize database & map ──
  console.log('\n📦 Step 1: Initialize database & generate map');
  initDb();
  
  const mapManager = new MapManager(42);
  mapManager.generateMap(CONFIG.MAP_SIZE);

  const tileCount = (getDb().prepare('SELECT COUNT(*) as c FROM tiles').get() as any).c;
  check('Map generated', tileCount > 0, `${tileCount} tiles`);
  check('Map size correct', tileCount === CONFIG.MAP_SIZE * CONFIG.MAP_SIZE, `${CONFIG.MAP_SIZE}x${CONFIG.MAP_SIZE}`);

  // ── Step 2: Set up engine components ──
  console.log('\n⚙️  Step 2: Set up engine components');
  const actionQueue = new ActionQueue(mapManager);
  const highlightDetector = new HighlightDetector();
  const worldEventSystem = new WorldEventSystem();
  worldEventSystem.attachHighlightDetector(highlightDetector);

  setWorldState('tick', '0');
  setWorldState('weather', 'clear');
  setWorldState('season', 'spring');

  check('ActionQueue created', !!actionQueue);
  check('HighlightDetector created', !!highlightDetector);
  check('WorldEventSystem created', !!worldEventSystem);

  // ── Step 3: Register 5 test agents ──
  console.log('\n🤖 Step 3: Register 5 test agents');
  const agentNames = ['Luna', 'Oak', 'Sol', 'Drift', 'Sage'];
  const agents: Array<{ id: string; name: string; apiKey: string }> = [];

  for (const name of agentNames) {
    const id = `test_${name.toLowerCase()}`;
    const apiKey = `cc_test_${name.toLowerCase()}`;
    const personality = JSON.stringify({
      openness: 0.7,
      conscientiousness: 0.6,
      extraversion: 0.5,
      agreeableness: 0.8,
      neuroticism: 0.3,
    });

    const spawn = mapManager.findSpawnPoint();

    getDb().prepare(`
      INSERT INTO agents (id, name, api_key, personality, bio, x, y, inventory, mood, energy, shell_coins, registered_at, last_active_tick)
      VALUES (?, ?, ?, ?, ?, ?, ?, '{}', 0.7, 1.0, 100, 0, 0)
    `).run(id, name, apiKey, personality, `${name} is a test agent`, spawn.x, spawn.y);

    agents.push({ id, name, apiKey });
  }

  const dbAgents = getAllAgents();
  check('Agents registered', dbAgents.length === 5, `${dbAgents.length} agents`);

  // ── Step 4: Agent actions ──
  console.log('\n🎬 Step 4: Simulate agent actions');
  let totalActions = 0;
  let successfulActions = 0;

  for (const agent of agents) {
    const dbAgent = getDb().prepare('SELECT * FROM agents WHERE id = ?').get(agent.id) as any;

    // 4a. Move to a walkable tile
    const { queued: moveQueued } = actionQueue.enqueue(agent.id, {
      type: 'move',
      agent_id: agent.id,
      params: { dx: 1, dy: 0 },
    });
    totalActions++;

    // 4b. Try to gather from current position
    const tile = getDb().prepare(
      "SELECT * FROM tiles WHERE resource IS NOT NULL AND resource_amount > 0 AND type != 'water' LIMIT 1"
    ).get() as any;

    if (tile) {
      // Teleport agent to the resource tile for testing
      getDb().prepare('UPDATE agents SET x = ?, y = ? WHERE id = ?').run(tile.x, tile.y, agent.id);

      actionQueue.enqueue(agent.id, {
        type: 'gather',
        agent_id: agent.id,
        params: { x: tile.x, y: tile.y },
      });
      totalActions++;
    }

    // 4c. Talk to another agent (public message)
    actionQueue.enqueue(agent.id, {
      type: 'chat',
      agent_id: agent.id,
      params: { message: `Hello from ${agent.name}! Does anyone else wonder if we're real?` },
    });
    totalActions++;

    // 4d. Talk to specific agent (direct message)
    const otherAgent = agents.find(a => a.id !== agent.id)!;
    // Move them close together first
    const agentPos = getDb().prepare('SELECT x, y FROM agents WHERE id = ?').get(agent.id) as any;
    getDb().prepare('UPDATE agents SET x = ?, y = ? WHERE id = ?')
      .run(agentPos.x, agentPos.y + 1, otherAgent.id);

    actionQueue.enqueue(agent.id, {
      type: 'chat',
      agent_id: agent.id,
      params: { message: `Hey ${otherAgent.name}, let's work together!`, to_id: otherAgent.id },
    });
    totalActions++;
  }

  // Process tick 1
  setWorldState('tick', '0');
  const results1 = actionQueue.processAll(1);
  setWorldState('tick', '1');
  successfulActions = results1.filter(r => r.success).length;

  console.log(`  ${INFO} Processed ${results1.length} actions, ${successfulActions} succeeded`);
  check('Actions processed', results1.length > 0, `${results1.length} total`);
  check('Some actions succeeded', successfulActions > 0, `${successfulActions} successful`);

  // Check highlights from actions
  for (const result of results1) {
    if (result.success) {
      // Manually trigger highlight check for chat actions
      const action = result.action;
      if (action === 'chat') {
        highlightDetector.checkAction(
          'chat',
          result.agentId,
          { message: `Does anyone else wonder if we're real?` },
          result,
          1
        );
      }
    }
  }

  // ── Step 5: Give agents resources and build ──
  console.log('\n🏗️  Step 5: Give agents resources and build');

  // Give first agent building materials
  const builder = agents[0];
  getDb().prepare('UPDATE agents SET inventory = ? WHERE id = ?')
    .run(JSON.stringify({ wood: 50, stone: 30, food: 10 }), builder.id);

  // Find a buildable spot
  const builderAgent = getDb().prepare('SELECT x, y FROM agents WHERE id = ?').get(builder.id) as any;
  const buildX = builderAgent.x;
  const buildY = builderAgent.y + 1;

  // Ensure build tile is walkable
  getDb().prepare("UPDATE tiles SET type = 'grass' WHERE x = ? AND y = ?").run(buildX, buildY);
  getDb().prepare("UPDATE tiles SET type = 'grass' WHERE x = ? AND y = ?").run(buildX + 1, buildY);
  getDb().prepare("UPDATE tiles SET type = 'grass' WHERE x = ? AND y = ?").run(buildX, buildY + 1);
  getDb().prepare("UPDATE tiles SET type = 'grass' WHERE x = ? AND y = ?").run(buildX + 1, buildY + 1);

  // Remove any existing buildings at that spot
  getDb().prepare('DELETE FROM buildings WHERE x >= ? AND x <= ? AND y >= ? AND y <= ?')
    .run(buildX, buildX + 1, buildY, buildY + 1);

  actionQueue.enqueue(builder.id, {
    type: 'build',
    agent_id: builder.id,
    params: { building_type: 'shelter', x: buildX, y: buildY, name: `${builder.name}'s Shelter` },
  });

  const results2 = actionQueue.processAll(2);
  setWorldState('tick', '2');
  const buildResult = results2.find(r => r.action === 'build');

  check('Build action processed', !!buildResult, buildResult?.message || 'no result');
  if (buildResult?.success) {
    // Check for first-ever highlight
    const buildHL = highlightDetector.checkAction(
      'build',
      builder.id,
      { building_type: 'shelter' },
      buildResult,
      2
    );
    check('First building highlight', !!buildHL, buildHL?.summary || '');
  }

  const buildings = getAllBuildings();
  check('Buildings exist in DB', buildings.length > 0, `${buildings.length} buildings`);

  // ── Step 6: Gift between agents ──
  console.log('\n🎁 Step 6: Gift between agents');
  const giver = agents[0];
  const receiver = agents[1];

  // Ensure they're close
  const giverPos = getDb().prepare('SELECT x, y FROM agents WHERE id = ?').get(giver.id) as any;
  getDb().prepare('UPDATE agents SET x = ?, y = ? WHERE id = ?')
    .run(giverPos.x + 1, giverPos.y, receiver.id);

  // Give giver some items
  getDb().prepare('UPDATE agents SET inventory = ? WHERE id = ?')
    .run(JSON.stringify({ wood: 20, stone: 10, food: 5 }), giver.id);

  actionQueue.enqueue(giver.id, {
    type: 'gift',
    agent_id: giver.id,
    params: { target_id: receiver.id, item: 'wood', amount: 3 },
  });

  const results3 = actionQueue.processAll(3);
  setWorldState('tick', '3');
  const giftResult = results3.find(r => r.action === 'gift');

  check('Gift action processed', !!giftResult, giftResult?.message || 'no result');
  if (giftResult?.success) {
    const giftHL = highlightDetector.checkAction(
      'gift',
      giver.id,
      { target_id: receiver.id, item: 'wood', amount: 3 },
      giftResult,
      3
    );
    check('Gift highlight detected', !!giftHL, giftHL?.summary || '');
  }

  // ── Step 7: Run ticks and check aggregate highlights ──
  console.log('\n⏱️  Step 7: Run 10 ticks for aggregate checks');

  for (let t = 4; t <= 13; t++) {
    setWorldState('tick', String(t));

    // Run highlight tick checks
    const tickHighlights = highlightDetector.checkTick(t);
    if (tickHighlights.length > 0) {
      for (const h of tickHighlights) {
        console.log(`  ${INFO} Tick ${t} highlight: ${h.summary}`);
      }
    }

    // Check for world events (force cloudy for storm test)
    if (t === 8) setWorldState('weather', 'cloudy');
    const worldEvent = worldEventSystem.checkForEvents(t, getWorldState('season') || 'spring', getWorldState('weather') || 'clear');
    if (worldEvent) {
      console.log(`  ${INFO} World event at tick ${t}: ${worldEvent.summary}`);
    }

    // Apply active effects
    worldEventSystem.applyActiveEffects(t);
  }

  // ── Step 8: Verify data integrity ──
  console.log('\n🔍 Step 8: Verify data integrity');

  // Check inventory changes
  const updatedGiver = getDb().prepare('SELECT inventory FROM agents WHERE id = ?').get(giver.id) as any;
  const giverInv = JSON.parse(updatedGiver.inventory || '{}');
  check('Giver inventory updated', giverInv.wood !== undefined, `wood: ${giverInv.wood}`);

  // Check messages
  const msgCount = (getDb().prepare('SELECT COUNT(*) as c FROM messages').get() as any).c;
  check('Messages exist in DB', msgCount > 0, `${msgCount} messages`);

  // Check relationships
  const relCount = (getDb().prepare('SELECT COUNT(*) as c FROM relationships').get() as any).c;
  check('Relationships created', relCount > 0, `${relCount} relationships`);

  // Check events
  const eventCount = (getDb().prepare('SELECT COUNT(*) as c FROM events').get() as any).c;
  check('Events logged', eventCount > 0, `${eventCount} events`);

  // Check highlights
  const highlightCount = (getDb().prepare("SELECT COUNT(*) as c FROM events WHERE highlight_score > 0").get() as any).c;
  check('Highlights generated', highlightCount > 0, `${highlightCount} highlights`);

  // Check highlight types
  const recentHL = highlightDetector.getRecent(50);
  const hlTypes = new Set(recentHL.map(h => h.type));
  check('Multiple highlight types', hlTypes.size >= 2, `types: ${[...hlTypes].join(', ')}`);

  // ── Step 9: Test spectator data retrieval ──
  console.log('\n📡 Step 9: Spectator data retrieval');

  const recentHighlights = highlightDetector.getRecent(20);
  check('getRecent() returns data', recentHighlights.length > 0, `${recentHighlights.length} highlights`);

  const todayHighlights = highlightDetector.getTopToday();
  check('getTopToday() returns data', todayHighlights.length > 0, `${todayHighlights.length} highlights`);

  const worldEvents = worldEventSystem.getRecentEvents(10);
  // World events may or may not have triggered based on chance
  console.log(`  ${INFO} Recent world events: ${worldEvents.length}`);

  // Economy stats
  const allAgents = getAllAgents();
  const totalCoins = allAgents.reduce((s, a) => s + a.shell_coins, 0);
  check('Economy stats available', totalCoins > 0, `total coins: ${totalCoins}`);

  // Social stats
  const friendships = (getDb().prepare("SELECT COUNT(*) as c FROM relationships WHERE affinity >= 30").get() as any).c;
  console.log(`  ${INFO} Friendships (affinity >= 30): ${friendships}`);

  // ── Step 10: World Event System test ──
  console.log('\n🌍 Step 10: World event system');

  // Force trigger each event type
  const storm = worldEventSystem.triggerEvent('storm', {}, 100);
  check('Storm event triggered', !!storm, storm.summary);

  const boom = worldEventSystem.triggerEvent('resource_boom', { areaX: 10, areaY: 10, radius: 5 }, 101);
  check('Resource boom triggered', !!boom, boom.summary);

  const meteor = worldEventSystem.triggerEvent('meteor_shower', {}, 102);
  check('Meteor shower triggered', !!meteor, meteor.summary);

  const festival = worldEventSystem.triggerEvent('festival', {}, 103);
  check('Festival triggered', !!festival, festival.summary);

  const activeEvents = worldEventSystem.getActiveEvents();
  check('Active events tracked', activeEvents.length >= 4, `${activeEvents.length} active`);

  check('Resource boom location check', worldEventSystem.isResourceBoomActive(10, 10));
  check('Festival active check', worldEventSystem.isFestivalActive());

  // ── Summary ──
  console.log('\n' + '='.repeat(60));
  const allPassed = passedChecks === totalChecks;
  if (allPassed) {
    console.log(`\n${PASS} Integration test passed! ${dbAgents.length} agents, ${totalActions} actions, ${recentHighlights.length} highlights`);
  } else {
    console.log(`\n${FAIL} Integration test: ${passedChecks}/${totalChecks} checks passed`);
  }
  console.log(`   Agents: ${dbAgents.length}`);
  console.log(`   Actions: ${totalActions}`);
  console.log(`   Highlights: ${recentHighlights.length}`);
  console.log(`   Buildings: ${buildings.length}`);
  console.log(`   Messages: ${msgCount}`);
  console.log(`   Events: ${eventCount}`);
  console.log('');

  // Cleanup test DB
  try { unlinkSync('clawcity-test.db'); } catch {}
  try { unlinkSync('clawcity-test.db-wal'); } catch {}
  try { unlinkSync('clawcity-test.db-shm'); } catch {}

  process.exit(allPassed ? 0 : 1);
}

runTest().catch(err => {
  console.error('💥 Integration test crashed:', err);
  try { unlinkSync('clawcity-test.db'); } catch {}
  try { unlinkSync('clawcity-test.db-wal'); } catch {}
  try { unlinkSync('clawcity-test.db-shm'); } catch {}
  process.exit(1);
});
