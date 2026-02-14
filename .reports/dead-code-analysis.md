# Dead Code Analysis Report

Generated: 2026-02-14

## Tools Used
- ts-prune: Unused TypeScript exports
- depcheck: Unused dependencies
- Manual cross-reference analysis

---

## 1. Unused Files (SAFE to delete)

### Services - No imports found anywhere in the codebase
| File | Severity | Reason |
|------|----------|--------|
| `services/CameraService.ts` | SAFE | Zero imports outside itself. Uses expo-camera/expo-av. |
| `services/FriendService.ts` | SAFE | Zero imports outside itself. Uses types/Friend.ts. |
| `services/VoiceService.ts` | SAFE | Zero imports outside itself. Uses expo-av. |
| `services/StatsService.ts` | SAFE | Zero imports outside itself. Superseded by GameService stats methods. |
| `services/MonetizationService.ts` | SAFE | Zero imports outside itself. Premium features removed per spec. |

### Components - No imports found anywhere
| File | Severity | Reason |
|------|----------|--------|
| `components/AdModal.tsx` | SAFE | Only imported by MonetizationService (also unused). |
| `components/PremiumModal.tsx` | SAFE | Only imported by MonetizationService (also unused). |

### Types - No imports outside unused services
| File | Severity | Reason |
|------|----------|--------|
| `types/Friend.ts` | SAFE | Only imported by FriendService (unused). |
| `types/Media.ts` | SAFE | Only imported by CameraService (unused). |

### Hooks - No imports outside the codebase
| File | Severity | Reason |
|------|----------|--------|
| `hooks/useAuth.ts` | SAFE | Zero imports in any source file. |

### Screens
| File | Severity | Reason |
|------|----------|--------|
| `app/(tabs)/data-processing.tsx` | CAUTION | Registered in _layout but never navigated to (link removed per spec comment in account.tsx:392). |

### Scripts
| File | Severity | Reason |
|------|----------|--------|
| `scripts/seed.ts` | SAFE | Development seed script, never imported. |

---

## 2. Unused Exports (within used files)

| File | Export | Status |
|------|--------|--------|
| `types/GameRecord.ts:52` | `Account` interface | Not imported anywhere (AccountService uses database.ts types) |
| `utils/ScoreCalculator.ts:33` | `TobiWinnersData` type | Only defined, never imported |

---

## 3. Unused Dependencies (package.json)

### Production Dependencies - SAFE to remove
| Package | Reason |
|---------|--------|
| `@expo/vector-icons` | Not imported in any source file |
| `@lucide/lab` | Not imported in any source file |
| `@types/uuid` | Should be devDependency; `uuid` itself is unused |
| `ajv` | Not imported in any source file |
| `ajv-keywords` | Not imported in any source file |
| `dotenv` | Not imported in any source file |
| `expo-av` | Only used by VoiceService (dead code) |
| `expo-blur` | Not imported in any source file |
| `expo-build-properties` | Expo plugin, keep as CAUTION |
| `expo-camera` | Only used by CameraService (dead code) |
| `expo-document-picker` | Not imported in any source file |
| `expo-haptics` | Not imported in any source file |
| `expo-linear-gradient` | Not imported in any source file |
| `expo-sharing` | Not imported in any source file |
| `expo-symbols` | Not imported in any source file |
| `expo-web-browser` | Not imported in any source file |
| `react-native-super-grid` | Not imported in any source file |
| `react-native-url-polyfill` | May be needed as side-effect import for Supabase |
| `uuid` | Not imported in any source file |

### Dev Dependencies - SAFE to remove
| Package | Reason |
|---------|--------|
| `@types/node` | Not needed in React Native project |

### Dependencies to KEEP (despite depcheck flagging)
| Package | Reason |
|---------|--------|
| `expo-build-properties` | Used by Expo build system via app.json |
| `expo-dev-client` | Used by Expo development workflow |
| `expo-splash-screen` | Used by Expo build system |
| `expo-system-ui` | Used by Expo build system |
| `react-native-url-polyfill` | Side-effect polyfill for Supabase |

---

## 4. Unused Styles / Dead Code within Files

### account.tsx - Unused styles (from removed features)
- `userInfo`, `avatar`, `userDetails`, `editingRow`, `usernameInput`, `saveButton`, `saveButtonText`
- `usernameRow`, `username`, `editButton`, `editButtonText`, `accountId`, `createdDate`
- `actionButton`, `actionButtonText`, `dangerButton`

---

## 5. console.log Statements (should be removed for production)

| File | Count |
|------|-------|
| `services/DeletionService.ts` | 16 |
| `app/(tabs)/account.tsx` | 4 |
| `services/AccountService.ts` | 4 |
| `services/GameService.ts` | 1 |

---

## Summary

| Category | Count |
|----------|-------|
| Unused files (SAFE) | 11 |
| Unused exports | 2 |
| Unused npm dependencies | ~17 |
| console.log statements | 25 |
