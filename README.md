# Folia-TV

Android TV 上的 Folia 客户端：内置 Folia 界面 + WebView 壳，适配遥控器（D-pad）。

音源层采用 [Timingyyds/folia-android](https://github.com/Timingyyds/folia-android) 的后端思路——**设备内 `audioNative` 协议 + 原生 OkHttp/Cookie 桥**，默认无需电脑开 Node；Folia 前端业务代码保持不动。

**APK 下载：** [Releases · v0.1.2](https://github.com/X-GeekMan/Folia-TV/releases/tag/v0.1.2)  
直链：[`Folia-TV-0.1.2.apk`](https://github.com/X-GeekMan/Folia-TV/releases/download/v0.1.2/Folia-TV-0.1.2.apk)（内置桥请装本地打出的 `0.1.3+`）

## 系统要求（最低）

| 项目 | 最低要求 | 说明 |
| --- | --- | --- |
| Android | **9.0（API 28）** | `minSdk = 28`；TV / 机顶盒 / 雷电等模拟器均适用 |
| Android System WebView / Chrome | **Chromium 主版本 ≥ 100** | 内置 Folia 为现代 Vite/React 产物；过旧 WebView 可能白屏或功能异常 |
| 架构 | armeabi-v7a / arm64-v8a 等设备自带 WebView 即可 | 普通 APK，无独立 Chromium 内核 |
| 音源 | 默认内置网易云 / 酷狗（folia-android 思路） | 设置中也可选填远程 API 覆盖；QQ 暂建议远程 |

建议在可更新 WebView 的环境使用（有 Google Play / 厂商应用商店）。部分国产机顶盒 WebView 无法升级时，即使 Android 版本够也可能无法运行完整界面。

应用图标与 TV Banner 使用上游 [folia-major](https://github.com/chthollyphile/folia-major) 的 `build/icon.png`。

## 项目简介

Folia-TV 是面向 Android TV / 机顶盒的播放端：

- **内置前端**（与 [folia-major](https://github.com/chthollyphile/folia-major) Web 同源），业务 UI 不改
- **音源后端思想对齐 [folia-android](https://github.com/Timingyyds/folia-android)**：注入 `audioNative`，经 `FoliaNative.bridgeRequest`（OkHttp + CookieManager）完成协议请求
- 设置页可留空走内置，或填写远程 API 覆盖某一音源
- **遥控器**：方向键焦点、确认、返回、播放/上下曲

包名：`top.izuna.foliatv`

## 音源架构（folia-android）

| 层级 | 作用 |
| --- | --- |
| Folia UI | 仍请求构建期哨兵基址（`VITE_*`），**不改前端业务** |
| `folia-audio-native.js` | 自 folia-android `audioNative` 移植，拦截哨兵请求并实现网易云/酷狗协议 |
| `FoliaNative.bridgeRequest` | 原生 OkHttp + WebView CookieManager（对齐 FoliaBridge） |
| 设置页远程 API | 可选覆盖；填写后该音源走外置服务 |

当前内置优先：**网易云、酷狗**；QQ 可暂用远程 API。

## 目录

```
android-tv/          Android TV 工程（Leanback + 按键桥 + 内置 www）
tv-overlay/          Web 侧 TV 适配入口
scripts/             构建 / 推送脚本
.github/workflows/   打 tag 自动构建 APK（含 web 打包）
```

## 安装

```bash
adb install -r Folia-TV-0.1.3.apk
```

首次启动点「使用内置音源」即可；若要用电脑上的 Node API，再填远程地址：

| 场景 | 网易云 API 示例 |
| --- | --- |
| 雷电模拟器访问本机 | `http://10.0.3.2:3300` |
| Android 官方模拟器 | `http://10.0.2.2:3300` |
| 真机 + 电脑局域网 | `http://192.168.x.x:3300` |

## 本地构建

```bash
# 1) 准备 Folia 源码
git clone --depth 1 https://github.com/chthollyphile/folia-major.git web

# 2) 用哨兵 API 地址打包前端 → android-tv/.../assets/www
node scripts/build-web-for-tv.mjs

# 3) 构建内置音源桥（folia-android audioNative）
cd tv-audio-native && npm install && npm run build && cd ..

# 4)（可选）从 web/build/icon.png 重新生成桌面图标 / TV Banner
powershell -File scripts/generate-android-icons.ps1

# 5) 打 APK
cd android-tv
./gradlew :app:assembleRelease
```

产物：

- Release：`android-tv/app/build/outputs/apk/release/`
- Debug：`android-tv/app/build/outputs/apk/debug/app-debug.apk`

## 遥控器映射

| 按键 | 行为 |
| --- | --- |
| 方向键 | 空间焦点移动 |
| 确认 / OK | 激活当前焦点 |
| 返回 | 关弹层 → 设置页 / 退出 |
| 播放暂停 | 播放控制 |
| 上一首 / 下一首 | 切歌 |
| 菜单 | 尝试打开命令面板 |

实现：`android-tv/app/src/main/assets/folia-tv-bridge.js`

## 发布新版本

```bash
git tag v0.1.2
git push origin v0.1.2
```

GitHub Actions 会拉取 `folia-major`、打包内置前端并挂 APK 到对应 Release。

## 许可

AGPL-3.0。基于 [chthollyphile/folia-major](https://github.com/chthollyphile/folia-major) 衍生，分发请遵守源码义务。
