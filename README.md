# block-block

Phaser 3 + TypeScript + Vite で作るスマホ向けブロック崩しです。

## 開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
```

`dist/` を GitHub Pages に配置すれば動きます。`vite.config.ts` は `base: "./"` にしてあるので、リポジトリ名サブパス配信でも相対パスで読み込めます。

## GitHub Pages

`.github/workflows/deploy.yml` を入れてあるので、GitHub 側で Pages のソースを `GitHub Actions` にすれば `main` push で自動デプロイされます。
