# Folia-TV

Android TV 上的 Folia 客户端：内置 Folia 界面 + WebView 壳，适配遥控器（D-pad）。只需配置音源 API。

**APK 下载：** [Releases · v0.1.0](https://github.com/X-GeekMan/Folia-TV/releases/tag/v0.1.0)  
直链：[`Folia-TV-0.1.0.apk`](https://github.com/X-GeekMan/Folia-TV/releases/download/v0.1.0/Folia-TV-0.1.0.apk)

## 项目简介

Folia-TV 是面向 Android TV / 机顶盒的播放端：

- **内置前端**（与 Folia Web 同源），不再填写部署 URL
- 首次启动只配置网易云 / QQ / 酷狗等 **API 地址**
- 使用 **WebView 壳**打包 APK（不是 TWA）
- **遥控器**：方向键焦点、确认、返回、播放/上下曲
- TV 只做客户端；音源 API 仍需在电脑 / NAS 上自建（与电脑版共用）

包名：`top.izuna.foliatv`

## 目录

```
android-tv/          Android TV 工程（Leanback + 按键桥 + 内置 www）
tv-overlay/          Web 侧 TV 适配入口
scripts/             构建 / 推送脚本
.github/workflows/   打 tag 自动构建 APK（含 web 打包）
```

## 安装

```bash
adb install -r Folia-TV-0.1.0.apk
```

首次启动填写 API：

| 场景 | 网易云 API 示例 |
| --- | --- |
| Android 模拟器访问宿主 | `http://10.0.2.2:3300` |
| 真机 + 电脑局域网 | `http://192.168.x.x:3300` |

## 本地构建

```bash
# 1) 准备 Folia 源码
git clone --depth 1 https://github.com/chthollyphile/folia-major.git web

# 2) 用哨兵 API 地址打包前端 → android-tv/.../assets/www
node scripts/build-web-for-tv.mjs

# 3) 打 APK
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
git tag v0.1.1
git push origin v0.1.1
```

GitHub Actions 会拉取 `folia-major`、打包内置前端并挂 APK 到对应 Release。

## 许可

AGPL-3.0。基于 [chthollyphile/folia-major](https://github.com/chthollyphile/folia-major) 衍生，分发请遵守源码义务。
