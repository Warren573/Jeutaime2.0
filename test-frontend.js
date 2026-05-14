#!/usr/bin/env node
/**
 * Frontend Flow Test - Headless Node.js
 * Simule les 20 étapes du flow sans UI graphique
 */

const http = require('http');
const { spawn, execSync } = require('child_process');
const fs = require('fs');

const API_URL = 'http://localhost:3000/api';
const METRO_URL = 'http://localhost:8081';
const REPORT_FILE = '/tmp/frontend-test-report.json';

let report = {
  timestamp: new Date().toISOString(),
  steps: [],
  errors: [],
  stats: {
    total: 20,
    passed: 0,
    failed: 0,
  },
};

// ─── Helpers ───────────────────────────────────────────────────────────────

function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

function logStep(step, title, result) {
  console.log(`  ÉTAPE ${step}: ${title} → ${result}`);
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function httpGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { headers, timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data || '{}'), headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

async function httpRequest(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : '';
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(body && { 'Content-Length': Buffer.byteLength(bodyStr) }),
        ...headers,
      },
      timeout: 5000,
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data || '{}') });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function httpPost(url, body, headers = {}) {
  return httpRequest('POST', url, body, headers);
}

async function httpPatch(url, body, headers = {}) {
  return httpRequest('PATCH', url, body, headers);
}

async function httpPut(url, body, headers = {}) {
  return httpRequest('PUT', url, body, headers);
}

function addStep(num, title, success, details = '') {
  report.steps.push({ num, title, success, details });
  if (success) report.stats.passed++;
  else report.stats.failed++;
}

function addError(msg) {
  report.errors.push(msg);
}

// ─── Test Suite ────────────────────────────────────────────────────────────

async function runTests() {
  log('🚀 Starting Frontend Flow Test (Headless)');
  log(`API Backend: ${API_URL}`);
  log(`Metro/Expo: ${METRO_URL}`);
  log('');

  // ─── Phase 1: Backend Connectivity ──────────────────────────────────────

  log('📋 Phase 1: Backend Connectivity');
  try {
    const health = await httpGet(`${API_URL}/health`);
    if (health.status === 200) {
      log('✅ Backend is running');
    } else {
      throw new Error(`Backend returned ${health.status}`);
    }
  } catch (err) {
    log('❌ Backend not reachable - aborting tests');
    addError(`Backend connectivity: ${err.message}`);
    return;
  }
  log('');

  // ─── Phase 2: Test API Endpoints (simulating frontend calls) ────────────

  log('📋 Phase 2: API Endpoint Validation');

  let tokenA, tokenB, userAId, userBId, matchId;

  // Add unique suffix to avoid conflicts
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // ÉTAPE 1-2: Register
  try {
    logStep(1, 'Register User A', 'testing...');
    const regA = await httpPost(`${API_URL}/auth/register`, {
      email: `testA-${uniqueSuffix}@test.com`,
      password: 'TestPassword123!',
      pseudo: `UserA-${uniqueSuffix}`,
      birthDate: '1990-01-01',
      gender: 'HOMME',
      city: 'Paris',
    });

    if (regA.status === 201 && regA.data.data?.accessToken) {
      tokenA = regA.data.data.accessToken;
      userAId = regA.data.data.userId;
      addStep(1, 'Register User A', true, `userId=${userAId}`);
      logStep(1, 'Register User A', '✅ PASS');
    } else {
      throw new Error(`Status ${regA.status}`);
    }
  } catch (err) {
    addStep(1, 'Register User A', false, err.message);
    logStep(1, 'Register User A', `❌ FAIL: ${err.message}`);
    addError(`ÉTAPE 1: ${err.message}`);
    return;
  }

  try {
    logStep(2, 'Register User B', 'testing...');
    const regB = await httpPost(`${API_URL}/auth/register`, {
      email: `testB-${uniqueSuffix}@test.com`,
      password: 'TestPassword123!',
      pseudo: `UserB-${uniqueSuffix}`,
      birthDate: '1991-02-02',
      gender: 'FEMME',
      city: 'Lyon',
    });

    if (regB.status === 201 && regB.data.data?.accessToken) {
      tokenB = regB.data.data.accessToken;
      userBId = regB.data.data.userId;
      addStep(2, 'Register User B', true, `userId=${userBId}`);
      logStep(2, 'Register User B', '✅ PASS');
    } else {
      throw new Error(`Status ${regB.status}`);
    }
  } catch (err) {
    addStep(2, 'Register User B', false, err.message);
    logStep(2, 'Register User B', `❌ FAIL: ${err.message}`);
    addError(`ÉTAPE 2: ${err.message}`);
    return;
  }

  // ÉTAPE 3-4: Update Profiles
  try {
    logStep(3, 'Update Profile A', 'testing...');
    const profA = await httpPatch(`${API_URL}/profiles/me`, {
      pseudo: `UserA_Updated-${uniqueSuffix}`,
      bio: 'Je suis un utilisateur de test passionne par les tests',
      city: 'Paris',
      physicalDesc: 'mysterieux',
      interests: ['tech', 'musique', 'voyages'],
      lookingFor: ['RELATION', 'FLIRT'],
      interestedIn: ['FEMME'],
      height: 180,
      vibe: 'Curieux et bienveillant',
      quote: 'La vie est une aventure',
    }, { Authorization: `Bearer ${tokenA}` });

    if (profA.status === 200) {
      addStep(3, 'Update Profile A', true);
      logStep(3, 'Update Profile A', '✅ PASS');
    } else {
      const errorMsg = typeof profA.data === 'string' ? profA.data : JSON.stringify(profA.data);
      console.log(`  DEBUG: Profile A error: ${errorMsg.substring(0, 200)}`);
      throw new Error(`Status ${profA.status}: ${profA.data?.error?.message || profA.data?.message || 'unknown'}`);
    }
  } catch (err) {
    addStep(3, 'Update Profile A', false, err.message);
    logStep(3, 'Update Profile A', `❌ FAIL: ${err.message}`);
  }

  try {
    logStep(4, 'Update Profile B', 'testing...');
    const profB = await httpPatch(`${API_URL}/profiles/me`, {
      pseudo: `UserB_Updated-${uniqueSuffix}`,
      bio: 'Passionnee par la rencontre et les defis',
      city: 'Lyon',
      physicalDesc: 'doux',
      interests: ['art', 'sport', 'nature'],
      lookingFor: ['RELATION'],
      interestedIn: ['HOMME'],
      height: 165,
      vibe: 'Spontanee et joyeuse',
      quote: 'La magie c est dans les petites choses',
    }, { Authorization: `Bearer ${tokenB}` });

    if (profB.status === 200) {
      addStep(4, 'Update Profile B', true);
      logStep(4, 'Update Profile B', '✅ PASS');
    } else {
      throw new Error(`Status ${profB.status}`);
    }
  } catch (err) {
    addStep(4, 'Update Profile B', false, err.message);
    logStep(4, 'Update Profile B', `❌ FAIL: ${err.message}`);
  }

  // ÉTAPE 5-6: Setup Questions
  try {
    logStep(5, 'Setup Questions A', 'testing...');
    const qA = await httpPut(`${API_URL}/profiles/me/questions`, {
      questions: [
        { questionText: 'What is your dream?', answer: 'Travel the world', wrongAnswers: ['Stay home', 'Work hard'] },
        { questionText: 'What makes you happy?', answer: 'Good friends', wrongAnswers: ['Money', 'Fame'] },
        { questionText: 'Where do you want to live?', answer: 'Big city', wrongAnswers: ['Small town', 'Remote area'] },
      ],
    }, { Authorization: `Bearer ${tokenA}` });

    if (qA.status === 200) {
      addStep(5, 'Setup Questions A', true);
      logStep(5, 'Setup Questions A', '✅ PASS');
    } else {
      throw new Error(`Status ${qA.status}: ${JSON.stringify(qA.data)}`);
    }
  } catch (err) {
    addStep(5, 'Setup Questions A', false, err.message);
    logStep(5, 'Setup Questions A', `❌ FAIL: ${err.message}`);
  }

  try {
    logStep(6, 'Setup Questions B', 'testing...');
    const qB = await httpPut(`${API_URL}/profiles/me/questions`, {
      questions: [
        { questionText: 'What is your dream?', answer: 'Create art', wrongAnswers: ['Become rich', 'Live quiet'] },
        { questionText: 'What makes you happy?', answer: 'Art and music', wrongAnswers: ['Money only', 'Games only'] },
        { questionText: 'Where do you want to live?', answer: 'Nice place', wrongAnswers: ['Bad place', 'Cold place'] },
      ],
    }, { Authorization: `Bearer ${tokenB}` });

    if (qB.status === 200) {
      addStep(6, 'Setup Questions B', true);
      logStep(6, 'Setup Questions B', '✅ PASS');
    } else {
      throw new Error(`Status ${qB.status}`);
    }
  } catch (err) {
    addStep(6, 'Setup Questions B', false, err.message);
    logStep(6, 'Setup Questions B', `❌ FAIL: ${err.message}`);
  }

  // ÉTAPE 7-8: Smiles & Match
  try {
    logStep(7, 'User A Smile User B', 'testing...');
    const smile1 = await httpPost(`${API_URL}/discover/react`, {
      toId: userBId,
      type: 'SMILE',
    }, { Authorization: `Bearer ${tokenA}` });

    if (smile1.status === 200) {
      addStep(7, 'User A Smile', true, `matchCreated=${smile1.data.data?.matchCreated}`);
      logStep(7, 'User A Smile', '✅ PASS');
    } else {
      throw new Error(`Status ${smile1.status}`);
    }
  } catch (err) {
    addStep(7, 'User A Smile', false, err.message);
    logStep(7, 'User A Smile', `❌ FAIL: ${err.message}`);
  }

  try {
    logStep(8, 'User B Smile User A (Match)', 'testing...');
    const smile2 = await httpPost(`${API_URL}/discover/react`, {
      toId: userAId,
      type: 'SMILE',
    }, { Authorization: `Bearer ${tokenB}` });

    if (smile2.status === 200 && smile2.data.data?.matchCreated) {
      matchId = smile2.data.data.matchId;
      addStep(8, 'User B Smile (Match)', true, `matchId=${matchId}`);
      logStep(8, 'User B Smile (Match)', '✅ PASS');
    } else {
      throw new Error(`Status ${smile2.status}, matchCreated=${smile2.data.data?.matchCreated}`);
    }
  } catch (err) {
    addStep(8, 'User B Smile (Match)', false, err.message);
    logStep(8, 'User B Smile (Match)', `❌ FAIL: ${err.message}`);
    addError(`No match created - cannot continue`);
    return;
  }

  // ÉTAPE 9-10: Accept Match
  try {
    logStep(9, 'Load Matches', 'testing...');
    const matches = await httpGet(`${API_URL}/matches`, { Authorization: `Bearer ${tokenA}` });
    if (matches.status === 200) {
      addStep(9, 'Load Matches', true);
      logStep(9, 'Load Matches', '✅ PASS');
    } else {
      throw new Error(`Status ${matches.status}`);
    }
  } catch (err) {
    addStep(9, 'Load Matches', false, err.message);
    logStep(9, 'Load Matches', `❌ FAIL: ${err.message}`);
  }

  try {
    logStep(10, 'Accept Match', 'testing...');
    const accept = await httpPost(`${API_URL}/matches/${matchId}/accept`, {},
      { Authorization: `Bearer ${tokenA}` });

    if (accept.status === 200 && accept.data.data?.status === 'ACTIVE') {
      addStep(10, 'Accept Match', true, `status=${accept.data.data.status}`);
      logStep(10, 'Accept Match', '✅ PASS');
    } else {
      throw new Error(`Status ${accept.status}, match status=${accept.data.data?.status}`);
    }
  } catch (err) {
    addStep(10, 'Accept Match', false, err.message);
    logStep(10, 'Accept Match', `❌ FAIL: ${err.message}`);
  }

  // ÉTAPE 11-13: Questions Game
  try {
    logStep(11, 'Get Questions', 'testing...');
    const getQ = await httpGet(`${API_URL}/matches/${matchId}/questions`,
      { Authorization: `Bearer ${tokenA}` });

    if (getQ.status === 200) {
      addStep(11, 'Get Questions', true, `count=${getQ.data.data?.questions?.length || 0}`);
      logStep(11, 'Get Questions', '✅ PASS');
    } else {
      throw new Error(`Status ${getQ.status}`);
    }
  } catch (err) {
    addStep(11, 'Get Questions', false, err.message);
    logStep(11, 'Get Questions', `❌ FAIL: ${err.message}`);
  }

  try {
    logStep(12, 'User A Submit Answers', 'testing...');
    const ansA = await httpPost(`${API_URL}/matches/${matchId}/questions/answers`, {
      answers: [
        { profileQuestionId: 'q1', answer: 'Create art' },
        { profileQuestionId: 'q2', answer: 'Art and music' },
        { profileQuestionId: 'q3', answer: 'Nice place' },
      ],
    }, { Authorization: `Bearer ${tokenA}` });

    if (ansA.status === 200) {
      addStep(12, 'User A Submit', true, `score=${ansA.data.data?.myScore}, waiting=${ansA.data.data?.waitingForOther}`);
      logStep(12, 'User A Submit', '✅ PASS');
    } else {
      throw new Error(`Status ${ansA.status}`);
    }
  } catch (err) {
    addStep(12, 'User A Submit', false, err.message);
    logStep(12, 'User A Submit', `❌ FAIL: ${err.message}`);
  }

  try {
    logStep(13, 'User B Submit Answers', 'testing...');
    const ansB = await httpPost(`${API_URL}/matches/${matchId}/questions/answers`, {
      answers: [
        { profileQuestionId: 'q1', answer: 'Travel the world' },
        { profileQuestionId: 'q2', answer: 'Good friends' },
        { profileQuestionId: 'q3', answer: 'Big city' },
      ],
    }, { Authorization: `Bearer ${tokenB}` });

    if (ansB.status === 200) {
      addStep(13, 'User B Submit', true, `score=${ansB.data.data?.myScore}, validated=${ansB.data.data?.questionsValidated}`);
      logStep(13, 'User B Submit', '✅ PASS');
    } else {
      throw new Error(`Status ${ansB.status}`);
    }
  } catch (err) {
    addStep(13, 'User B Submit', false, err.message);
    logStep(13, 'User B Submit', `❌ FAIL: ${err.message}`);
  }

  // ÉTAPE 14-17: Letters
  try {
    logStep(14, 'User B Send Letter', 'testing...');
    const letterB = await httpPost(`${API_URL}/matches/${matchId}/letters`, {
      content: 'Hello from B',
    }, { Authorization: `Bearer ${tokenB}` });

    if (letterB.status === 201) {
      addStep(14, 'User B Send Letter', true);
      logStep(14, 'User B Send Letter', '✅ PASS');
    } else {
      throw new Error(`Status ${letterB.status}: ${letterB.data?.error?.message}`);
    }
  } catch (err) {
    addStep(14, 'User B Send Letter', false, err.message);
    logStep(14, 'User B Send Letter', `❌ FAIL: ${err.message}`);
  }

  try {
    logStep(15, 'Verify B canSend=false', 'testing...');
    const match15 = await httpGet(`${API_URL}/matches/${matchId}`,
      { Authorization: `Bearer ${tokenB}` });

    if (match15.status === 200 && match15.data.data?.canSend !== true) {
      addStep(15, 'B canSend=false', true);
      logStep(15, 'B canSend=false', '✅ PASS');
    } else {
      throw new Error(`canSend=${match15.data.data?.canSend}`);
    }
  } catch (err) {
    addStep(15, 'B canSend=false', false, err.message);
    logStep(15, 'B canSend=false', `❌ FAIL: ${err.message}`);
  }

  try {
    logStep(16, 'User A Send Letter Reply', 'testing...');
    const letterA = await httpPost(`${API_URL}/matches/${matchId}/letters`, {
      content: 'Hello from A',
    }, { Authorization: `Bearer ${tokenA}` });

    if (letterA.status === 201) {
      addStep(16, 'User A Send Letter', true);
      logStep(16, 'User A Send Letter', '✅ PASS');
    } else {
      throw new Error(`Status ${letterA.status}`);
    }
  } catch (err) {
    addStep(16, 'User A Send Letter', false, err.message);
    logStep(16, 'User A Send Letter', `❌ FAIL: ${err.message}`);
  }

  try {
    logStep(17, 'Verify A canSend=false', 'testing...');
    const match17 = await httpGet(`${API_URL}/matches/${matchId}`,
      { Authorization: `Bearer ${tokenA}` });

    if (match17.status === 200 && match17.data.data?.canSend !== true) {
      addStep(17, 'A canSend=false', true);
      logStep(17, 'A canSend=false', '✅ PASS');
    } else {
      throw new Error(`canSend=${match17.data.data?.canSend}`);
    }
  } catch (err) {
    addStep(17, 'A canSend=false', false, err.message);
    logStep(17, 'A canSend=false', `❌ FAIL: ${err.message}`);
  }

  // ÉTAPE 18-20: Letters List & Read
  try {
    logStep(18, 'Get Letters List', 'testing...');
    const letters = await httpGet(`${API_URL}/matches/${matchId}/letters`,
      { Authorization: `Bearer ${tokenA}` });

    console.log(`  DEBUG: Letters response status=${letters.status}, data=${JSON.stringify(letters.data).substring(0, 200)}`);

    if (letters.status === 200) {
      const count = letters.data.data?.length || 0;
      addStep(18, 'Get Letters List', true, `count=${count}`);
      logStep(18, 'Get Letters List', `✅ PASS (${count} letters)`);

      if (count > 0 && letters.data.data[0]?.id) {
        const letterId = letters.data.data[0].id;

        try {
          logStep(19, 'Mark Letter Read', 'testing...');
          const read = await httpPatch(`${API_URL}/letters/${letterId}/read`, {},
            { Authorization: `Bearer ${tokenA}` });

          if (read.status === 200) {
            addStep(19, 'Mark Letter Read', true);
            logStep(19, 'Mark Letter Read', '✅ PASS');
          } else {
            throw new Error(`Status ${read.status}`);
          }
        } catch (err) {
          addStep(19, 'Mark Letter Read', false, err.message);
          logStep(19, 'Mark Letter Read', `❌ FAIL: ${err.message}`);
        }
      }
    } else {
      throw new Error(`Status ${letters.status}`);
    }
  } catch (err) {
    addStep(18, 'Get Letters List', false, err.message);
    logStep(18, 'Get Letters List', `❌ FAIL: ${err.message}`);
  }

  try {
    logStep(20, 'Check Unread Count', 'testing...');
    const unread = await httpGet(`${API_URL}/notifications/unread-count`,
      { Authorization: `Bearer ${tokenA}` });

    if (unread.status === 200) {
      addStep(20, 'Unread Count', true, `count=${unread.data.data?.count}`);
      logStep(20, 'Unread Count', '✅ PASS');
    } else {
      throw new Error(`Status ${unread.status}`);
    }
  } catch (err) {
    addStep(20, 'Unread Count', false, err.message);
    logStep(20, 'Unread Count', `❌ FAIL: ${err.message}`);
  }

  log('');
}

// ─── Main ──────────────────────────────────────────────────────────────────

(async () => {
  try {
    await runTests();
  } catch (err) {
    log(`Fatal error: ${err.message}`);
    addError(`Fatal: ${err.message}`);
  }

  // Write report
  log('');
  log('📊 Test Summary');
  log(`   Total: ${report.stats.total}`);
  log(`   Passed: ${report.stats.passed} ✅`);
  log(`   Failed: ${report.stats.failed} ❌`);
  log(`   Success Rate: ${Math.round((report.stats.passed / report.stats.total) * 100)}%`);

  if (report.errors.length > 0) {
    log('');
    log('⚠️  Errors:');
    report.errors.forEach(e => log(`   - ${e}`));
  }

  // Save report
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
  log('');
  log(`📄 Full report saved to: ${REPORT_FILE}`);

  process.exit(report.stats.failed > 0 ? 1 : 0);
})();
