#!/usr/bin/env node

const https = require('https');
const http = require('http');

const API_URL = process.env.API_URL || 'https://jeutaime-staging.onrender.com/api';

function makeRequest(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(API_URL + path);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, raw: data });
        } catch {
          resolve({ status: res.statusCode, data: null, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function test() {
  console.log('=== Mutual Smile E2E Test ===');
  console.log(`API_URL: ${API_URL}\n`);

  try {
    // Step 1: Reset
    console.log('Step 1: Reset mutual smile');
    let res = await makeRequest('POST', '/test/reset-mutual-smile');
    if (res.status !== 200) {
      console.error(`❌ FAILED at Step 1`);
      console.error(`Status: ${res.status}`);
      console.error(`Response: ${res.raw}`);
      process.exit(1);
    }

    const emailA = res.data.accountA.email;
    const pwdA = res.data.accountA.password;
    const userIdA = res.data.accountA.userId;

    const emailB = res.data.accountB.email;
    const pwdB = res.data.accountB.password;
    const userIdB = res.data.accountB.userId;

    console.log(`✓ Created accountA: ${userIdA}`);
    console.log(`✓ Created accountB: ${userIdB}\n`);

    // Step 2: Login A
    console.log('Step 2: Login accountA');
    res = await makeRequest('POST', '/auth/login', {
      email: emailA,
      password: pwdA,
    });
    if (res.status !== 200) {
      console.error(`❌ FAILED at Step 2 (Login A)`);
      console.error(`Status: ${res.status}`);
      console.error(`Response: ${res.raw}`);
      process.exit(1);
    }
    const tokenA = res.data.data?.accessToken || res.data.accessToken;
    if (!tokenA) {
      console.error(`❌ FAILED at Step 2: No accessToken`);
      console.error(`Response: ${JSON.stringify(res.data)}`);
      process.exit(1);
    }
    console.log(`✓ Logged in as A\n`);

    // Step 3: Login B
    console.log('Step 3: Login accountB');
    res = await makeRequest('POST', '/auth/login', {
      email: emailB,
      password: pwdB,
    });
    if (res.status !== 200) {
      console.error(`❌ FAILED at Step 3 (Login B)`);
      console.error(`Status: ${res.status}`);
      console.error(`Response: ${res.raw}`);
      process.exit(1);
    }
    const tokenB = res.data.data?.accessToken || res.data.accessToken;
    if (!tokenB) {
      console.error(`❌ FAILED at Step 3: No accessToken`);
      console.error(`Response: ${JSON.stringify(res.data)}`);
      process.exit(1);
    }
    console.log(`✓ Logged in as B\n`);

    // Step 4: GET discovery as A
    console.log('Step 4: GET discovery as accountA');
    res = await makeRequest('GET', '/discover/profiles?pageSize=50', null, {
      Authorization: `Bearer ${tokenA}`,
    });
    if (res.status !== 200) {
      console.error(`❌ FAILED at Step 4 (Discovery A)`);
      console.error(`Status: ${res.status}`);
      console.error(`Response: ${res.raw}`);
      process.exit(1);
    }
    const discoveryA = res.data.data || [];
    const discoveryAIds = discoveryA.map(p => p.userId);
    console.log(`Discovery A has ${discoveryA.length} profiles`);
    console.log(`Discovery A IDs: ${discoveryAIds.join(', ')}`);

    // Step 5: Verify B is in discovery A
    console.log(`\nStep 5: Verify accountB (${userIdB}) in discovery A`);
    if (!discoveryAIds.includes(userIdB)) {
      console.error(`❌ FAILED at Step 5: accountB NOT in discovery A`);
      console.error(`Expected userId: ${userIdB}`);
      console.error(`Discovery A IDs: ${discoveryAIds.join(', ')}`);
      process.exit(1);
    }
    console.log(`✓ accountB found in discovery A\n`);

    // Step 6: A smiles B
    console.log('Step 6: A smiles at B');
    res = await makeRequest('POST', '/discover/react', {
      toId: userIdB,
      type: 'SMILE',
    }, {
      Authorization: `Bearer ${tokenA}`,
    });
    if (res.status !== 200) {
      console.error(`❌ FAILED at Step 6 (A smiles B)`);
      console.error(`Status: ${res.status}`);
      console.error(`Response: ${res.raw}`);
      process.exit(1);
    }

    const smileAResponse = res.data.data;
    const debugBranchA = smileAResponse.debugBranch;
    console.log(`Response: ${JSON.stringify(smileAResponse, null, 2)}`);

    // Step 7: Verify NO-MUTUAL
    console.log(`\nStep 7: Verify debugBranch=NO-MUTUAL for A→B`);
    if (debugBranchA !== 'NO-MUTUAL') {
      console.error(`❌ FAILED at Step 7: Expected NO-MUTUAL, got ${debugBranchA}`);
      console.error(`Full response: ${JSON.stringify(smileAResponse)}`);
      process.exit(1);
    }
    console.log(`✓ A→B returned NO-MUTUAL\n`);

    // Step 8: GET discovery as B
    console.log('Step 8: GET discovery as accountB');
    res = await makeRequest('GET', '/discover/profiles?pageSize=50', null, {
      Authorization: `Bearer ${tokenB}`,
    });
    if (res.status !== 200) {
      console.error(`❌ FAILED at Step 8 (Discovery B)`);
      console.error(`Status: ${res.status}`);
      console.error(`Response: ${res.raw}`);
      process.exit(1);
    }
    const discoveryB = res.data.data || [];
    const discoveryBIds = discoveryB.map(p => p.userId);
    console.log(`Discovery B has ${discoveryB.length} profiles`);
    console.log(`Discovery B IDs: ${discoveryBIds.join(', ')}`);

    // Step 9: Verify A is in discovery B
    console.log(`\nStep 9: Verify accountA (${userIdA}) in discovery B`);
    if (!discoveryBIds.includes(userIdA)) {
      console.error(`❌ FAILED at Step 9: accountA NOT in discovery B`);
      console.error(`Expected userId: ${userIdA}`);
      console.error(`Discovery B IDs: ${discoveryBIds.join(', ')}`);
      process.exit(1);
    }
    console.log(`✓ accountA found in discovery B\n`);

    // Step 10: B smiles A (mutual)
    console.log('Step 10: B smiles at A (mutual)');
    res = await makeRequest('POST', '/discover/react', {
      toId: userIdA,
      type: 'SMILE',
    }, {
      Authorization: `Bearer ${tokenB}`,
    });
    if (res.status !== 200) {
      console.error(`❌ FAILED at Step 10 (B smiles A)`);
      console.error(`Status: ${res.status}`);
      console.error(`Response: ${res.raw}`);
      process.exit(1);
    }

    const smileBResponse = res.data.data;
    const debugBranchB = smileBResponse.debugBranch;
    const matchCreated = smileBResponse.matchCreated;
    const matchId = smileBResponse.matchId;

    console.log(`Response: ${JSON.stringify(smileBResponse, null, 2)}`);

    // Step 11: Verify NEW-MATCH
    console.log(`\nStep 11: Verify debugBranch=NEW-MATCH + matchCreated + matchId`);
    if (debugBranchB !== 'NEW-MATCH') {
      console.error(`❌ FAILED at Step 11: Expected NEW-MATCH, got ${debugBranchB}`);
      console.error(`Full response: ${JSON.stringify(smileBResponse)}`);
      process.exit(1);
    }
    if (matchCreated !== true) {
      console.error(`❌ FAILED at Step 11: Expected matchCreated=true, got ${matchCreated}`);
      console.error(`Full response: ${JSON.stringify(smileBResponse)}`);
      process.exit(1);
    }
    if (!matchId) {
      console.error(`❌ FAILED at Step 11: matchId missing or null (${matchId})`);
      console.error(`Full response: ${JSON.stringify(smileBResponse)}`);
      process.exit(1);
    }
    console.log(`✓ B→A returned NEW-MATCH with matchId: ${matchId}\n`);

    // Step 12: GET /matches for both
    console.log('Step 12: GET /matches for both accounts');
    res = await makeRequest('GET', '/matches', null, {
      Authorization: `Bearer ${tokenA}`,
    });
    if (res.status !== 200) {
      console.error(`❌ FAILED at Step 12a (GET matches A)`);
      console.error(`Status: ${res.status}`);
      console.error(`Response: ${res.raw}`);
      process.exit(1);
    }
    const matchesA = res.data.data || [];
    console.log(`Matches for A: ${matchesA.length}`);
    if (matchesA.length > 0) {
      console.log(`Match ID: ${matchesA[0].id}, Status: ${matchesA[0].status}`);
    }

    res = await makeRequest('GET', '/matches', null, {
      Authorization: `Bearer ${tokenB}`,
    });
    if (res.status !== 200) {
      console.error(`❌ FAILED at Step 12b (GET matches B)`);
      console.error(`Status: ${res.status}`);
      console.error(`Response: ${res.raw}`);
      process.exit(1);
    }
    const matchesB = res.data.data || [];
    console.log(`Matches for B: ${matchesB.length}`);
    if (matchesB.length > 0) {
      console.log(`Match ID: ${matchesB[0].id}, Status: ${matchesB[0].status}`);
    }

    if (matchesA.length === 0 || matchesB.length === 0) {
      console.error(`❌ FAILED at Step 12: One account has no matches`);
      console.error(`Matches A: ${matchesA.length}, Matches B: ${matchesB.length}`);
      process.exit(1);
    }

    console.log('\n=== ✅ SUCCESS ===');
    console.log('Mutual smile flow completed successfully!');
    console.log(`Match ID: ${matchId}`);
    console.log(`Match visible for A: ${matchesA.length > 0}`);
    console.log(`Match visible for B: ${matchesB.length > 0}`);
  } catch (err) {
    console.error('\n❌ FATAL ERROR:', err.message);
    process.exit(1);
  }
}

test();
