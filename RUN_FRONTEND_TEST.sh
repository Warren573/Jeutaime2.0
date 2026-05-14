#!/bin/bash
# Start backend and frontend for testing

set -e

echo "🚀 Starting JeuTaime Frontend & Backend Test"
echo

# Check prerequisites
echo "✅ Checking prerequisites..."
if ! command -v npm &> /dev/null; then
  echo "❌ npm not found"
  exit 1
fi

echo "✅ Prerequisites OK"
echo

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Kill existing processes
echo "🛑 Cleaning up old processes..."
pkill -f "ts-node.*backend" || true
pkill -f "expo start" || true
pkill -f "metro" || true
sleep 1
echo "✅ Old processes cleaned"
echo

# Start backend
echo -e "${BLUE}🔧 Starting Backend...${NC}"
echo "   Location: backend/"
echo "   Command: npm run dev"
cd backend
npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to be ready
echo "   Waiting for backend to be ready..."
for i in {1..30}; do
  if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "   ${GREEN}✅ Backend ready on port 3000${NC}"
    break
  fi
  echo -n "."
  sleep 1
  if [ $i -eq 30 ]; then
    echo -e "\n   ${RED}❌ Backend failed to start${NC}"
    echo "   Check: tail -f /tmp/backend.log"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
  fi
done
echo

# Start frontend
echo -e "${BLUE}⚛️  Starting Frontend...${NC}"
echo "   Location: frontend/"
echo "   Command: npm start --web"
echo "   API URL: http://localhost:3000/api"
echo
echo "   Opening http://localhost:8081 in browser..."
echo "   Press Ctrl+C to stop both services"
echo

cd frontend
export EXPO_PUBLIC_API_URL="http://localhost:3000/api"
npm start --web

# Cleanup on exit
trap "
  echo
  echo '🛑 Stopping services...'
  kill $BACKEND_PID 2>/dev/null || true
  exit 0
" EXIT

