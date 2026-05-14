#!/bin/bash
# Frontend Configuration Validation

echo "=== Frontend Validation ==="
echo

# Check API URL configuration
echo "1. Vérifying API URL configuration..."
API_URL=$(grep "EXPO_PUBLIC_API_URL\|process.env.NEXT_PUBLIC_API_URL\|192.168.0.40" frontend/src/api/client.ts | head -1)
echo "   Current config: $API_URL"
if grep -q "192.168.0.40" frontend/src/api/client.ts; then
  echo "   ⚠️  Using 192.168.0.40 - Change to localhost:3000 for local dev"
  echo "   → Edit: frontend/src/api/client.ts line 6"
else
  echo "   ✅ API URL looks configured"
fi
echo

# Check dependencies
echo "2. Checking npm dependencies..."
if [ -d "frontend/node_modules" ]; then
  echo "   ✅ node_modules exists"
else
  echo "   ❌ node_modules missing - Run: cd frontend && npm install"
fi
echo

# Check required files
echo "3. Checking critical files..."
critical_files=(
  "frontend/src/store/useStore.ts"
  "frontend/src/api/client.ts"
  "frontend/src/api/matches.ts"
  "frontend/src/api/reactions.ts"
  "frontend/src/screens/ProfileTwoStepDemo.tsx"
  "frontend/src/screens/LettersScreen.tsx"
  "frontend/app/login.tsx"
  "frontend/app/register.tsx"
)

for file in "${critical_files[@]}"; do
  if [ -f "$file" ]; then
    echo "   ✅ $file"
  else
    echo "   ❌ MISSING: $file"
  fi
done
echo

# Check AsyncStorage persistence
echo "4. Checking persistence setup..."
if grep -q "persist\|AsyncStorage" frontend/src/store/useStore.ts; then
  echo "   ✅ Zustand persist middleware configured"
else
  echo "   ❌ No persist middleware found"
fi
echo

# Check backend connectivity (if running)
echo "5. Testing backend connectivity..."
BACKEND_URL="http://localhost:3000/api/health"
if curl -s "$BACKEND_URL" > /dev/null 2>&1; then
  echo "   ✅ Backend is running on localhost:3000"
else
  echo "   ❌ Backend NOT reachable on localhost:3000"
  echo "   → Make sure backend is running: npm run dev (from backend dir)"
fi
echo

# Check DEV mode
echo "6. Checking DEV mode settings..."
DEV_MODE=$(grep "DEV_MODE_UNLIMITED_COINS" frontend/src/store/useStore.ts | head -1)
if echo "$DEV_MODE" | grep -q "true"; then
  echo "   ✅ DEV_MODE_UNLIMITED_COINS = true (coins unlimited for testing)"
else
  echo "   ⚠️  DEV_MODE may be off - Set to true for easier testing"
fi
echo

echo "=== Summary ==="
echo "✅ Run: cd frontend && npm start --web"
echo "✅ Opens http://localhost:8081 in browser"
echo "✅ Use Chrome DevTools for debugging:"
echo "   - Network tab: Check API calls"
echo "   - Console: Check for errors"
echo "   - Redux DevTools (if available)"
echo
