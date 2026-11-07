# TV overlay for folia-major

把本目录内容合并进 `web/`（folia-major）后，Web 端会识别 Android TV 注入的 `window.FoliaTV`，并做轻量适配。**不删减功能**，只增强遥控器可用性。

## 合并方式

```bash
# 在 FoliaTV 根目录
Copy-Item -Recurse -Force tv-overlay\src\* web\src\
```

入口已通过 `src/tv/initTvAdapter.ts` 在应用启动时调用（见下方补丁说明）。若上游 `main.tsx` 结构变化，手动在根组件挂载后调用：

```ts
import { initTvAdapter } from "./tv/initTvAdapter";
initTvAdapter();
```
