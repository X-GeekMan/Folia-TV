# FoliaTV

把 [chthollyphile/folia-major](https://github.com/chthollyphile/folia-major) 的 **Web 端** 适配到 Android TV：功能保持不变，重点是 **WebView 壳 + 遥控器（D-pad）适配**。

## 架构

```
FoliaTV/
  android-tv/     Android TV WebView APK（Leanback + 按键桥）
  web/            folia-major 源码（克隆），继续跑原有 Web/API
```

- **不做 TWA**
- **不把网易云/QQ/酷狗 API 打进 APK**；TV 只做客户端，API 仍自托管
- 遥控器按键 → 原生 `MainActivity` → `window.FoliaTV.dispatchKey(...)` → 空间焦点 / 播放控制

## 快速开始

### 1. Folia Web（音源 API 照旧）

```bash
cd web
cp .env.example .env.local   # 配置 VITE_NETEASE_API_BASE 等
npm install
npm run dev                  # 默认 :3000
```

### 2. 打 TV APK

```bash
cd android-tv
# 首次需要 Gradle Wrapper（见下方）
./gradlew :app:assembleDebug
```

安装到 TV / 模拟器：

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 3. 指定 Folia 地址

应用首次打开是 `bootstrap.html`，用遥控器填入 Web 地址，例如：

| 场景 | URL |
| --- | --- |
| 真机 + 电脑局域网 | `http://192.168.x.x:3000` |
| Android 模拟器访问宿主 | `http://10.0.2.2:3000` |
| 已部署的 Web | `https://your-folia.example.com` |

或用 Intent：

```bash
adb shell am start -n top.izuna.foliatv.debug/.MainActivity --es start_url "http://10.0.2.2:3000"
```

## 遥控器映射

| 按键 | 行为 |
| --- | --- |
| 方向键 | 空间焦点移动 |
| 确认 / OK | 激活当前焦点 |
| 返回 | 先尝试关弹层，否则交还给原生（历史返回 / 退出） |
| 播放暂停 | 尝试 Folia 命令，否则发送 Space |
| 上一首 / 下一首 | 媒体键 / Folia 播放命令 |
| 菜单 | 尝试打开命令面板 |

注入脚本：`android-tv/app/src/main/assets/folia-tv-bridge.js`

## Gradle Wrapper

若目录里还没有 `gradlew`：

```bash
cd android-tv
gradle wrapper --gradle-version 8.9
```

没有本机 `gradle` 时，可用 Android Studio 打开 `android-tv/` 自动生成 Wrapper。

## 后续（功能不变前提下）

1. 在 `web/src` 为高频控件加 `data-tv-focusable` / 焦点态样式（减少误聚焦）
2. 把 Folia 命令面板 ID 与 `folia-tv-bridge.js` 里的 `tryFoliaCommand` 对齐
3. 可选：`vite build` 产物拷进 `android-tv/app/src/main/assets/www/` 做离线包

## 许可

上游 Folia 为 AGPL-3.0；本仓库 TV 壳同样按 AGPL-3.0 衍生使用，分发时请遵守源码义务。
