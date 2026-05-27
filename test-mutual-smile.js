#!/usr/bin/env node

const API_URL = process.env.API_URL || "https://jeutaime-staging.onrender.com/api";

async function test() {
  console.log("=== Starting Mutual Smile Test ===");
  console.log(`API_URL: ${API_URL}\n`);

  try {
    // Step 1: Reset mutual smile
    console.log("=== Step 1: Reset mutual smile ===");
    const resetRes = await fetch(`${API_URL}/test/reset-mutual-smile`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const resetText = await resetRes.text();
    console.log(`Status: ${resetRes.status}`);
    console.log(`Response: ${resetText}`);
    const resetData = JSON.parse(resetText);
    console.log(JSON.stringify(resetData, null, 2));

    const emailA = resetData.accountA.email;
    const passwordA = resetData.accountA.password;
    const userIdA = resetData.accountA.userId;

    const emailB = resetData.accountB.email;
    const passwordB = resetData.accountB.password;
    const userIdB = resetData.accountB.userId;

    console.log(`\nAccount A: email=${emailA} userId=${userIdA}`);
    console.log(`Account B: email=${emailB} userId=${userIdB}\n`);

    // Step 2: Login accountA
    console.log("=== Step 2: Login accountA ===");
    const loginARes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailA, password: passwordA }),
    });
    const loginAData = await loginARes.json();
    console.log(JSON.stringify(loginAData, null, 2));

    const tokenA = loginAData.data?.accessToken || loginAData.accessToken;
    if (!tokenA) {
      console.error("ERROR: Failed to get token for account A");
      process.exit(1);
    }
    console.log(`Token A: ${tokenA.substring(0, 20)}...\n`);

    // Step 3: Login accountB
    console.log("=== Step 3: Login accountB ===");
    const loginBRes = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailB, password: passwordB }),
    });
    const loginBData = await loginBRes.json();
    console.log(JSON.stringify(loginBData, null, 2));

    const tokenB = loginBData.data?.accessToken || loginBData.accessToken;
    if (!tokenB) {
      console.error("ERROR: Failed to get token for account B");
      process.exit(1);
    }
    console.log(`Token B: ${tokenB.substring(0, 20)}...\n`);

    // Step 4: A smiles at B
    console.log("=== Step 4: A smiles at B ===");
    console.log(`Payload: { toId: ${userIdB}, type: "SMILE" }`);
    const smileARes = await fetch(`${API_URL}/discover/react`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
      },
      body: JSON.stringify({ toId: userIdB, type: "SMILE" }),
    });
    const smileAData = await smileARes.json();
    console.log("Response:");
    console.log(JSON.stringify(smileAData, null, 2));

    const debugBranchA = smileAData.data?.debugBranch || smileAData.debugBranch || "MISSING";
    const matchCreatedA = smileAData.data?.matchCreated ?? smileAData.matchCreated ?? "MISSING";
    const fromIdA = smileAData.data?.fromId || smileAData.fromId || "MISSING";
    const toIdA = smileAData.data?.toId || smileAData.toId || "MISSING";

    console.log("\nStep 4 Results:");
    console.log(`  debugBranch: ${debugBranchA} (expected: NO-MUTUAL)`);
    console.log(`  matchCreated: ${matchCreatedA} (expected: false)`);
    console.log(`  fromId: ${fromIdA} (expected: ${userIdA})`);
    console.log(`  toId: ${toIdA} (expected: ${userIdB})`);

    if (debugBranchA !== "NO-MUTUAL") {
      console.error(`\n❌ ERROR: Expected debugBranch=NO-MUTUAL but got ${debugBranchA}`);
      process.exit(1);
    }

    if (matchCreatedA !== false) {
      console.error(`\n❌ ERROR: Expected matchCreated=false but got ${matchCreatedA}`);
      process.exit(1);
    }

    // Step 5: B smiles at A (mutual smile)
    console.log("\n=== Step 5: B smiles at A (mutual smile) ===");
    console.log(`Payload: { toId: ${userIdA}, type: "SMILE" }`);
    const smileBRes = await fetch(`${API_URL}/discover/react`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`,
      },
      body: JSON.stringify({ toId: userIdA, type: "SMILE" }),
    });
    const smileBData = await smileBRes.json();
    console.log("Response:");
    console.log(JSON.stringify(smileBData, null, 2));

    const debugBranchB = smileBData.data?.debugBranch || smileBData.debugBranch || "MISSING";
    const matchCreatedB = smileBData.data?.matchCreated ?? smileBData.matchCreated ?? "MISSING";
    const matchId = smileBData.data?.matchId || smileBData.matchId || "MISSING";
    const fromIdB = smileBData.data?.fromId || smileBData.fromId || "MISSING";
    const toIdB = smileBData.data?.toId || smileBData.toId || "MISSING";

    console.log("\nStep 5 Results:");
    console.log(`  debugBranch: ${debugBranchB} (expected: NEW-MATCH)`);
    console.log(`  matchCreated: ${matchCreatedB} (expected: true)`);
    console.log(`  matchId: ${matchId} (expected: present)`);
    console.log(`  fromId: ${fromIdB} (expected: ${userIdB})`);
    console.log(`  toId: ${toIdB} (expected: ${userIdA})`);

    if (debugBranchB !== "NEW-MATCH") {
      console.error(`\n❌ ERROR: Expected debugBranch=NEW-MATCH but got ${debugBranchB}`);
      process.exit(1);
    }

    if (matchCreatedB !== true) {
      console.error(`\n❌ ERROR: Expected matchCreated=true but got ${matchCreatedB}`);
      process.exit(1);
    }

    if (!matchId || matchId === "MISSING" || matchId === "null") {
      console.error(`\n❌ ERROR: Expected matchId to be present but got ${matchId}`);
      process.exit(1);
    }

    // Step 6: Verify match visible for both
    console.log("\n=== Step 6: Verify match visible for both accounts ===");

    const matchesARes = await fetch(`${API_URL}/matches`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const matchesAData = await matchesARes.json();
    console.log("Matches for A:");
    console.log(JSON.stringify(matchesAData, null, 2));

    const matchesBRes = await fetch(`${API_URL}/matches`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const matchesBData = await matchesBRes.json();
    console.log("\nMatches for B:");
    console.log(JSON.stringify(matchesBData, null, 2));

    const matchFoundA = matchesAData.data?.some((m) => m.id === matchId);
    const matchFoundB = matchesBData.data?.some((m) => m.id === matchId);

    console.log("\nStep 6 Results:");
    console.log(`  Match visible for A: ${matchFoundA ? "YES" : "NO"}`);
    console.log(`  Match visible for B: ${matchFoundB ? "YES" : "NO"}`);

    if (!matchFoundA) {
      console.error(`\n❌ ERROR: Match not visible for account A`);
      process.exit(1);
    }

    if (!matchFoundB) {
      console.error(`\n❌ ERROR: Match not visible for account B`);
      process.exit(1);
    }

    console.log("\n=== ✅ ALL TESTS PASSED ===");
    console.log("Mutual smile flow is working correctly!");
  } catch (err) {
    console.error("\n❌ FATAL ERROR:", err.message);
    process.exit(1);
  }
}

test();
