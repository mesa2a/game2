# Prototype (Browser)

`docs/game_proposal_ja.md` の縦切り方針に沿った、最小ブラウザプロトタイプです。

## 起動

このフォルダで静的サーバーを起動してください。

```bash
cd prototype
python3 -m http.server 8000
```

ブラウザで `http://localhost:8000` を開きます。

## 収録要素

- 見下ろし移動（WASD）
- 疑似3Dジャンプ（Space）
- ピース要素
  - `さしかえ`: アクションを `attack` / `jump` で切り替え（キー `1`）
  - `まつ`: 次アクションを0.6秒遅延（キー `2`）
- 敵1体（被弾無敵あり）
- 低障害 / 高障害の高さルール
- 出口到達でクリア
