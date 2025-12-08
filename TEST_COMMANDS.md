# TaskRythm - Quick Test Commands

## Backend Tests

### Run all backend tests
```bash
cd backend
npm test
```

### Run with coverage
```bash
cd backend
npm run test:cov
```

### Run E2E tests only
```bash
cd backend
npm run test:e2e
```

### Run specific test file
```bash
cd backend
npm test -- jwt.strategy.spec.ts
```

---

## Frontend Tests

### Run all frontend tests
```bash
npm test
```

### Run with coverage
```bash
npm run test:coverage
```

### Run in watch mode
```bash
npm run test:watch
```

### Run specific test file
```bash
npm test -- LoginButton.test.tsx
```

---

## Coverage Reports

### Backend Coverage Report
After running `npm run test:cov` in backend:
- Open: `backend/coverage/lcov-report/index.html`

### Frontend Coverage Report  
After running `npm run test:coverage`:
- Open: `coverage/lcov-report/index.html`

---

## Test Result Documentation

### Generate Test Results
```bash
# Backend
cd backend
npm run test:cov > ../test-results-backend.txt

# Frontend
cd ..
npm run test:coverage > test-results-frontend.txt
```

### Quick Stats Command
```bash
# Backend test count
cd backend
npm test -- --listTests | wc -l

# Frontend test count
cd ..
npm test -- --listTests | wc -l
```

---

## Common Test Patterns

### Watch specific file during development
```bash
npm test -- --watch LoginButton
```

### Update snapshots (if using snapshot testing)
```bash
npm test -- -u
```

### Run tests with verbose output
```bash
npm test -- --verbose
```

### Clear cache and run tests
```bash
npm test -- --clearCache
npm test
```
