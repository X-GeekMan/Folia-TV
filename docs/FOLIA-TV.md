# Folia-TV

Android TV 上的 Folia 客户端：内置 Folia 界面，适配遥控器（D-pad）。

音源采用 [Timingyyds/folia-android](https://github.com/Timingyyds/folia-android) 的后端思想（`audioNative` + 原生网络桥），默认无需外置 Node。

**APK 下载：** [Releases · v0.1.2](https://github.com/X-GeekMan/Folia-TV/releases/tag/v0.1.2)

## 系统要求（最低）

| 项目 | 最低要求 |
| --- | --- |
| Android | **9.0（API 28）** |
| Android System WebView / Chrome | **Chromium ≥ 100** |

图标来自上游 `folia-major` 的 `build/icon.png`。

## 音源（folia-android 后端思想）

默认**不依赖电脑上的 Node**：

1. Folia UI 仍请求哨兵地址（构建期 `VITE_*`），**前端业务代码不改**
2. 注入 `folia-audio-native.js`（自 [folia-android](https://github.com/Timingyyds/folia-android) 的 `audioNative` 移植）在设备内完成网易云/酷狗协议
3. 原生 `FoliaNative.bridgeRequest` = OkHttp + CookieManager（对齐 FoliaBridge）
4. 设置里若填写远程 API，则覆盖对应音源，回退到外置服务

当前内置优先：网易云、酷狗；QQ 可填远程或后续补齐 MQTT 登录。

## 本地构建

见仓库根目录 [README.md](../README.md)。另需：

```bash
cd tv-audio-native && npm install && npm run build
```
