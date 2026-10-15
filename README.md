# Knot Untangle

Game puzzle 3D (three.js): kéo sợi len trên cùng khỏi chốt, cuộn len rơi vào khay 6 lỗ; đủ 3 cuộn cùng màu thì đan
lên đồ chơi len 3D phía trên. Khay đầy mà không ghép được là thua. 50 level, mỗi level một đồ chơi.

- **Chơi trên web:** https://anhlh-go.github.io/tangle/ (Add to Home Screen được trên iPhone/Android).
- **APK Android (debug):** mục Releases → `apk-latest` → `knot-untangle.apk`.

## Chạy và build

```bash
npm install
npm run dev        # mở game; ?level=N để vào thẳng level N
npm run build      # ra đúng một file dist/index.html (chạy offline)
node scripts/tune.ts --range=1-50 --seeds=12   # dò lại độ khó bằng bot
```

## Cấu trúc

| File | Nội dung |
| --- | --- |
| `src/sim.ts` | Luật chơi (dùng chung cho game và bot) |
| `src/levels.ts`, `src/tuned.ts` | Curve 50 level, lịch blocker, sinh level, tham số đã tune |
| `src/scene3d.ts` | Board 3D, dây xoắn, chốt, khoá/chìa, đồ chơi, màn hoàn thành |
| `src/kit3d.ts`, `src/toys/*.ts` | 50 đồ chơi len 3D |
| `src/game.ts` | Vòng lặp, HUD, khay, booster, popup, tutorial |
| `.github/workflows/web.yml` | Build và đăng GitHub Pages khi push `main` |
| `.github/workflows/apk.yml` | Bọc bản web bằng Capacitor, build APK debug, đăng ở release `apk-latest` |

Blocker: Mystery Yarn (L6), Frozen Slot (L11), Lock & Key (L16). Booster: Undo (L3), Scissors (L5), +Slot (L7).
