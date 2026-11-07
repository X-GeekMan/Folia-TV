# Folia-TV

Android TV 上的 Folia 客户端：用 WebView 加载 Folia Web，适配遥控器（D-pad）。

**APK 下载：** [Releases · v0.1.0](https://github.com/X-GeekMan/Folia-TV/releases/tag/v0.1.0)  
直链：[`Folia-TV-0.1.0.apk`](https://github.com/X-GeekMan/Folia-TV/releases/download/v0.1.0/Folia-TV-0.1.0.apk)

## 项目简介

Folia-TV 是面向 Android TV / 机顶盒的播放端：

- 功能与 Folia Web 保持一致（登录、搜歌、歌单、歌词舞台等）
- 使用 **WebView 壳**打包 APK（不是 TWA）
- **遥控器**：方向键焦点、确认、返回、播放/上下曲
- TV 只做客户端；网易云 / QQ / 酷狗等音源 API 仍需自行部署

包名：`top.izuna.foliatv`

## 目录

```
android-tv/          Android TV 工程（Leanback + 按键桥）
tv-overlay/          Web 侧 TV 适配入口
scripts/             辅助脚本
.github/workflows/   打 tag 自动构建 APK
```

## 安装

```bash
adb install -r Folia-TV-0.1.0.apk
```

首次启动填写已部署的 Folia Web 地址：

| 场景 | URL 示例 |
| --- | --- |
| 真机 + 电脑局域网 | `http://192.168.x.x:3000` |
| Android 模拟器访问宿主 | `http://10.0.2.2:3000` |
| 已部署的 Web | `https://your-folia.example.com` |

也可用 Intent 指定：

```bash
adb shell am start -n top.izuna.foliatv/.MainActivity --es start_url "http://10.0.2.2:3000"
```

## 本地构建 APK

```bash
cd android-tv
./gradlew :app:assembleRelease
# 或调试包
./gradlew :app:assembleDebug
```

产物：

- Release：`android-tv/app/build/outputs/apk/release/`
- Debug：`android-tv/app/build/outputs/apk/debug/app-debug.apk`

## 遥控器映射

| 按键 | 行为 |
| --- | --- |
| 方向键 | 空间焦点移动 |
| 确认 / OK | 激活当前焦点 |
| 返回 | 关弹层 → 历史返回 / 退出 |
| 播放暂停 | 播放控制 |
| 上一首 / 下一首 | 切歌 |
| 菜单 | 尝试打开命令面板 |

实现：`android-tv/app/src/main/assets/folia-tv-bridge.js`

## 发布新版本

```bash
git tag v0.1.1
git push origin v0.1.1
```

GitHub Actions 会构建 APK 并挂到对应 Release。

## 许可

AGPL-3.0。基于 [chthollyphile/folia-major](https://github.com/chthollyphile/folia-major) 衍生，分发请遵守源码义务。
