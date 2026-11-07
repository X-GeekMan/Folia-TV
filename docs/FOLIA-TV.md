# Folia-TV

Android TV 上的 Folia 客户端：内置 Folia 界面，适配遥控器（D-pad）。

**APK 下载：** [Releases · v0.1.2](https://github.com/X-GeekMan/Folia-TV/releases/tag/v0.1.2)

## 系统要求（最低）

| 项目 | 最低要求 |
| --- | --- |
| Android | **9.0（API 28）** |
| Android System WebView / Chrome | **Chromium ≥ 100** |

图标来自上游 `folia-major` 的 `build/icon.png`。

## 与电脑版的差异

电脑版（Electron）开箱即用，是因为主进程内嵌了网易云 / QQ / 酷狗 API。  
TV 设备跑不了那套 Node 服务，所以：

1. **界面**打进 APK（`assets/www`）
2. **API**仍指向你电脑 / NAS 上已部署的实例
3. 首次启动只填 API 地址（雷电 = `10.0.3.2`，官方模拟器 = `10.0.2.2`）

构建时前端使用哨兵基址（`https://folia-tv.invalid/...`），运行时由 `api-rewrite.js` 改写到用户配置。

## 本地构建

见仓库根目录 [README.md](../README.md)。
