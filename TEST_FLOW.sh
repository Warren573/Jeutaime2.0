#!/bin/bash
# ============================================================
# Test du flow complet: Auth → Profils → Matches → Lettres
# ============================================================
# Usage: ./TEST_FLOW.sh
# Assurez-vous que le backend tourne sur http://localhost:3000/api

API="http://localhost:3000/api"
TIMEOUT=5

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Compteurs
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# Résultats
declare -a RESULTS

# ============================================================
# Helper functions
# ============================================================

test_step() {
  local num=$1
  local name=$2
  echo -e "\n${BLUE}━━━ ÉTAPE $num: $name ━━━${NC}"
  TESTS_TOTAL=$((TESTS_TOTAL + 1))
}

api_call() {
  local method=$1
  local endpoint=$2
  local data=$3
  local token=$4

  local cmd="curl -s -X $method"

  if [ ! -z "$token" ]; then
    cmd="$cmd -H 'Authorization: Bearer $token'"
  fi

  if [ ! -z "$data" ]; then
    local escaped_data="${data//\"/\\\"}"
    cmd="$cmd -H 'Content-Type: application/json' -d \"$escaped_data\""
  fi

  cmd="$cmd -w '\n%{http_code}' $API$endpoint"

  eval $cmd
}

check_response() {
  local response=$1
  local expected_code=$2
  local step_name=$3

  # La dernière ligne est le code HTTP
  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')

  echo "Response code: $http_code"
  echo "Response body: $body"

  if [ "$http_code" = "$expected_code" ]; then
    echo -e "${GREEN}✅ PASS${NC}: $step_name"
    TESTS_PASSED=$((TESTS_PASSED + 1))
    RESULTS+=("PASS: $step_name")
    echo "$body"
  else
    echo -e "${RED}❌ FAIL${NC}: $step_name (Expected $expected_code, got $http_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    RESULTS+=("FAIL: $step_name (Expected $expected_code, got $http_code)")
    echo "$body"
  fi
}

# ============================================================
# TEST 1: Register User A
# ============================================================

test_step 1 "Register User A"

REGISTER_A_DATA='{
  "email": "userA@test.com",
  "password": "TestPassword123!",
  "pseudo": "UserA",
  "birthDate": "1990-01-01",
  "gender": "HOMME",
  "city": "Paris"
}'

REGISTER_A=$(api_call POST "/auth/register" "$REGISTER_A_DATA")
check_response "$REGISTER_A" "201" "Register User A"

TOKEN_A=$(echo "$REGISTER_A" | sed '$d' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || echo "")
USER_A_ID=$(echo "$REGISTER_A" | sed '$d' | grep -o '"userId":"[^"]*"' | cut -d'"' -f4 || echo "")

echo "Token A: ${TOKEN_A:0:20}..."
echo "User A ID: $USER_A_ID"

# ============================================================
# TEST 2: Register User B
# ============================================================

test_step 2 "Register User B"

REGISTER_B_DATA='{
  "email": "userB@test.com",
  "password": "TestPassword123!",
  "pseudo": "UserB",
  "birthDate": "1991-02-02",
  "gender": "FEMME",
  "city": "Lyon"
}'

REGISTER_B=$(api_call POST "/auth/register" "$REGISTER_B_DATA")
check_response "$REGISTER_B" "201" "Register User B"

TOKEN_B=$(echo "$REGISTER_B" | sed '$d' | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4 || echo "")
USER_B_ID=$(echo "$REGISTER_B" | sed '$d' | grep -o '"userId":"[^"]*"' | cut -d'"' -f4 || echo "")

echo "Token B: ${TOKEN_B:0:20}..."
echo "User B ID: $USER_B_ID"

# ============================================================
# TEST 3: User A - Complete Profile
# ============================================================

test_step 3 "User A - Complete Profile"

PROFILE_A_DATA=$(cat <<'JSONEOF'
{
  "pseudo": "UserA_Updated",
  "bio": "Je suis un utilisateur de test passionne par les tests",
  "city": "Paris",
  "physicalDesc": "mysterieux",
  "interests": ["tech", "musique", "voyages"],
  "lookingFor": ["RELATION", "FLIRT"],
  "interestedIn": ["FEMME"],
  "height": 180,
  "vibe": "Curieux et bienveillant",
  "quote": "La vie est une aventure"
}
JSONEOF
)

PROFILE_A=$(api_call PATCH "/profiles/me" "$PROFILE_A_DATA" "$TOKEN_A")
check_response "$PROFILE_A" "200" "User A - Update Profile"

# ============================================================
# TEST 4: User B - Complete Profile
# ============================================================

test_step 4 "User B - Complete Profile"

PROFILE_B_DATA=$(cat <<'JSONEOF'
{
  "pseudo": "UserB_Updated",
  "bio": "Passionnee par la rencontre et les defis",
  "city": "Lyon",
  "physicalDesc": "doux",
  "interests": ["art", "sport", "nature"],
  "lookingFor": ["RELATION"],
  "interestedIn": ["HOMME"],
  "height": 165,
  "vibe": "Spontanee et joyeuse",
  "quote": "La magie c est dans les petites choses"
}
JSONEOF
)

PROFILE_B=$(api_call PATCH "/profiles/me" "$PROFILE_B_DATA" "$TOKEN_B")
check_response "$PROFILE_B" "200" "User B - Update Profile"

# ============================================================
# TEST 5: User A - Add Questions (required for matches)
# ============================================================

test_step 5 "User A - Add Questions (required for matching)"

QUESTIONS_A_DATA=$(cat <<'JSONEOF'
{
  "questions": [
    {
      "questionText": "Quel est ton rêve le plus fou?",
      "answer": "Voyager autour du monde",
      "wrongAnswers": ["Rester chez moi", "Devenir celebre"]
    },
    {
      "questionText": "Comment tu passes un dimanche parfait?",
      "answer": "En explorant une nouvelle ville",
      "wrongAnswers": ["En restant au lit", "Au travail"]
    },
    {
      "questionText": "Qu est-ce qui te fait rire?",
      "answer": "Les blagues absurdes et les moments spontanes",
      "wrongAnswers": ["Rien de special", "Les films d horreur"]
    }
  ]
}
JSONEOF
)

QUESTIONS_A=$(api_call PUT "/profiles/me/questions" "$QUESTIONS_A_DATA" "$TOKEN_A")
check_response "$QUESTIONS_A" "200" "User A - Add Questions"

# ============================================================
# TEST 6: User B - Add Questions
# ============================================================

test_step 6 "User B - Add Questions"

QUESTIONS_B_DATA=$(cat <<'JSONEOF'
{
  "questions": [
    {
      "questionText": "Quel est ton rêve le plus fou?",
      "answer": "Creer une galerie d art",
      "wrongAnswers": ["Devenir riche", "Vivre tranquille"]
    },
    {
      "questionText": "Comment tu passes un dimanche parfait?",
      "answer": "Au musee ou en nature",
      "wrongAnswers": ["Seule chez moi", "En shopping"]
    },
    {
      "questionText": "Qu est-ce qui te fait rire?",
      "answer": "L humour intelligent et les bons moments partages",
      "wrongAnswers": ["Rien de special", "Les plaisanteries mechantes"]
    }
  ]
}
JSONEOF
)

QUESTIONS_B=$(api_call PUT "/profiles/me/questions" "$QUESTIONS_B_DATA" "$TOKEN_B")
check_response "$QUESTIONS_B" "200" "User B - Add Questions"

# ============================================================
# TEST 7: User A Smile User B (POST /discover/react)
# ============================================================

test_step 7 "User A Smile User B"

SMILE_DATA='{
  "toId": "'$USER_B_ID'",
  "type": "SMILE"
}'

SMILE_A=$(api_call POST "/discover/react" "$SMILE_DATA" "$TOKEN_A")
check_response "$SMILE_A" "200" "User A Smile User B"

MATCH_CREATED_A=$(echo "$SMILE_A" | sed '$d' | grep -o '"matchCreated":true' || echo "")
if [ ! -z "$MATCH_CREATED_A" ]; then
  echo "⚠️  Match created immediately (mutual smile detected)"
  MATCH_ID=$(echo "$SMILE_A" | sed '$d' | grep -o '"matchId":"[^"]*"' | cut -d'"' -f4 || echo "")
fi

# ============================================================
# TEST 8: User B Smile User A (should create match)
# ============================================================

test_step 8 "User B Smile User A (should create match)"

SMILE_B_DATA='{
  "toId": "'$USER_A_ID'",
  "type": "SMILE"
}'

SMILE_B=$(api_call POST "/discover/react" "$SMILE_B_DATA" "$TOKEN_B")
check_response "$SMILE_B" "200" "User B Smile User A"

MATCH_CREATED_B=$(echo "$SMILE_B" | sed '$d' | grep -o '"matchCreated":true' || echo "")
if [ ! -z "$MATCH_CREATED_B" ]; then
  echo "✅ Match created from User B smile"
  MATCH_ID=$(echo "$SMILE_B" | sed '$d' | grep -o '"matchId":"[^"]*"' | cut -d'"' -f4)
fi

echo "Match ID: $MATCH_ID"

# ============================================================
# TEST 9: Verify Match Created (GET /matches)
# ============================================================

test_step 9 "Verify Match Created - List Matches"

MATCHES_A=$(api_call GET "/matches" "" "$TOKEN_A")
check_response "$MATCHES_A" "200" "User A - List Matches"

if [ -z "$MATCH_ID" ]; then
  MATCH_ID=$(echo "$MATCHES_A" | sed '$d' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "Match ID from list: $MATCH_ID"
fi

# ============================================================
# TEST 10: User A - Accept Match
# ============================================================

test_step 10 "User A - Accept Match"

ACCEPT_DATA='{}'

ACCEPT_A=$(api_call POST "/matches/$MATCH_ID/accept" "$ACCEPT_DATA" "$TOKEN_A")
check_response "$ACCEPT_A" "200" "User A - Accept Match"

# ============================================================
# TEST 11: Get Match Questions (User A)
# ============================================================

test_step 11 "Get Match Questions (User A)"

QUESTIONS=$(api_call GET "/matches/$MATCH_ID/questions" "" "$TOKEN_A")
check_response "$QUESTIONS" "200" "Get Match Questions"

# ============================================================
# TEST 12: User A - Submit Questions Answers
# ============================================================

test_step 12 "User A - Submit Question Answers"

ANSWERS_A_DATA='{
  "answers": [
    {"profileQuestionId": "q1", "answer": "Creer une galerie d art"},
    {"profileQuestionId": "q2", "answer": "Au musee ou en nature"},
    {"profileQuestionId": "q3", "answer": "L humour intelligent et les bons moments partages"}
  ]
}'

ANSWERS_A=$(api_call POST "/matches/$MATCH_ID/questions/answers" "$ANSWERS_A_DATA" "$TOKEN_A")
check_response "$ANSWERS_A" "200" "User A - Submit Answers"

# ============================================================
# TEST 13: User B - Submit Questions Answers
# ============================================================

test_step 13 "User B - Submit Question Answers"

ANSWERS_B_DATA='{
  "answers": [
    {"profileQuestionId": "q1", "answer": "Voyager autour du monde"},
    {"profileQuestionId": "q2", "answer": "En explorant une nouvelle ville"},
    {"profileQuestionId": "q3", "answer": "Les blagues absurdes et les moments spontanes"}
  ]
}'

ANSWERS_B=$(api_call POST "/matches/$MATCH_ID/questions/answers" "$ANSWERS_B_DATA" "$TOKEN_B")
check_response "$ANSWERS_B" "200" "User B - Submit Answers"

# ============================================================
# TEST 14: User B - Send Letter (first, since initiator)
# ============================================================

test_step 14 "User B - Send Letter (initiator sends first)"

LETTER_B_DATA=$(cat <<'JSONEOF'
{
  "content": "Salut! J ai adoré tes réponses aux questions. J aimerais bien continuer cette conversation!"
}
JSONEOF
)

LETTER_B=$(api_call POST "/matches/$MATCH_ID/letters" "$LETTER_B_DATA" "$TOKEN_B")
check_response "$LETTER_B" "201" "User B - Send Letter"

LETTER_B_ID=$(echo "$LETTER_B" | sed '$d' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Letter B ID: $LETTER_B_ID"

# ============================================================
# TEST 15: Verify User B canSend is false
# ============================================================

test_step 15 "Verify User B canSend is false after sending"

MATCH_DETAIL=$(api_call GET "/matches/$MATCH_ID" "" "$TOKEN_B")
check_response "$MATCH_DETAIL" "200" "Get Match Detail (User B)"

CANSEND=$(echo "$MATCH_DETAIL" | sed '$d' | grep -o '"canSend":false' || echo "")
if [ ! -z "$CANSEND" ]; then
  echo "✅ User B cannot send (canSend=false)"
else
  echo "❌ User B should not be able to send yet"
fi

# ============================================================
# TEST 16: User A - Send Letter Reply
# ============================================================

test_step 16 "User A - Send Letter Reply"

LETTER_A_DATA=$(cat <<'JSONEOF'
{
  "content": "Bonjour! Moi aussi j ai beaucoup aimé. C est un plaisir de discuter avec quelqu un qui partage mes intérêts!"
}
JSONEOF
)

LETTER_A=$(api_call POST "/matches/$MATCH_ID/letters" "$LETTER_A_DATA" "$TOKEN_A")
check_response "$LETTER_A" "201" "User A - Send Letter"

LETTER_A_ID=$(echo "$LETTER_A" | sed '$d' | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Letter A ID: $LETTER_A_ID"

# ============================================================
# TEST 17: Verify User A canSend is false after sending
# ============================================================

test_step 17 "Verify User A canSend is false after sending"

MATCH_DETAIL_A=$(api_call GET "/matches/$MATCH_ID" "" "$TOKEN_A")
check_response "$MATCH_DETAIL_A" "200" "Get Match Detail (User A)"

CANSEND_A=$(echo "$MATCH_DETAIL_A" | sed '$d' | grep -o '"canSend":false' || echo "")
if [ ! -z "$CANSEND_A" ]; then
  echo "✅ User A cannot send (canSend=false)"
else
  echo "❌ User A should not be able to send yet"
fi

# ============================================================
# TEST 18: Get Letters in Match
# ============================================================

test_step 18 "Get Letters in Match"

LETTERS=$(api_call GET "/matches/$MATCH_ID/letters" "" "$TOKEN_A")
check_response "$LETTERS" "200" "Get Letters in Match"

LETTER_COUNT=$(echo "$LETTERS" | sed '$d' | grep -o '"id"' | wc -l)
echo "Total letters in match: $LETTER_COUNT"

# ============================================================
# TEST 19: Mark Letter as Read
# ============================================================

test_step 19 "Mark Letter as Read (User A reads B's letter)"

MARK_READ=$(api_call PATCH "/letters/$LETTER_B_ID/read" '{}' "$TOKEN_A")
check_response "$MARK_READ" "200" "Mark Letter as Read"

# ============================================================
# TEST 20: Check Unread Count
# ============================================================

test_step 20 "Check Unread Count"

UNREAD=$(api_call GET "/notifications/unread-count" "" "$TOKEN_A")
check_response "$UNREAD" "200" "Get Unread Count"

echo "Unread count: $(echo "$UNREAD" | sed '$d' | grep -o '[0-9]*' | head -1)"

# ============================================================
# SUMMARY
# ============================================================

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}RÉSUMÉ DES TESTS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Total tests: $TESTS_TOTAL"
echo -e "Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed: ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}✅ TOUS LES TESTS SONT PASSÉS!${NC}"
else
  echo -e "\n${RED}❌ $TESTS_FAILED tests ont échoué${NC}"
fi

# Print detailed results
echo -e "\n${BLUE}Détails:${NC}"
for result in "${RESULTS[@]}"; do
  echo "  • $result"
done

exit $TESTS_FAILED
