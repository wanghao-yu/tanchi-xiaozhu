# 贪吃小猪 Android

原生 Android WebView 外壳，包名 `com.tanchixiaozhu.game`，最低 Android 8.0（API 26）。游戏从 APK 内的 `file:///android_asset/index.html` 加载，开启 JavaScript 和 DOMStorage，不申请网络、存储、相机等权限。

## 构建要求

- JDK 17、Gradle 8.11.1、Android Gradle Plugin 8.9.2。
- Android SDK Platform 35、Build Tools 35.0.0，配置 `ANDROID_HOME` 或忽略提交的 `local.properties`。
- 从仓库根目录运行 `node scripts/build-offline.mjs`，自动生成 `app/src/main/assets/index.html`。该生成文件不提交仓库，脚本会内嵌全部脚本、样式、字体和图片。
- 将头像图标复制到 `app/src/main/res/drawable/face.png`。

版本组合已按 [Android 官方兼容表](https://developer.android.com/build/releases/agp-8-9-0-release-notes)核对：AGP 8.9 使用 Gradle 8.11.1 和 JDK 17，支持最高 API 35。

工程未提交 Gradle Wrapper。安装对应版本后，从仓库根目录执行：

```sh
gradle --project-dir android assembleDebug
```

Debug 构建使用 Android 自动管理的调试签名，无需提供发布密钥。生成文件为 `app/build/outputs/apk/debug/app-debug.apk`。

## 发布签名

Release 构建必须通过环境变量提供已有的 PKCS12 密钥：

| 变量 | 含义 |
| --- | --- |
| `ANDROID_KEYSTORE_PATH` | 仓库外已有 `.p12` 文件的绝对路径 |
| `ANDROID_KEYSTORE_PASSWORD` | 密钥库和私钥密码，两者一致 |
| `ANDROID_KEY_ALIAS` | 密钥别名，工作流固定为 `littlepig` |

配置后执行 `gradle --project-dir android assembleRelease`，输出 `app/build/outputs/apk/release/app-release.apk`。缺少签名变量时 Release 构建主动失败，不生成未签名的交付包。不要把密钥、密码或 `local.properties` 提交到仓库；后续升级须沿用同一签名密钥并增加 `versionCode`。

## 手动 GitHub Actions

仓库的 `Build Android APK` 工作流仅支持手动运行，需要仓库 Secrets：

- `ANDROID_KEYSTORE_BASE64`：已有 PKCS12 文件的 Base64 内容。
- `ANDROID_KEYSTORE_PASSWORD`：上述密码。

工作流先从当前网页源码生成离线 HTML，再使用官方 `actions/setup-java@v4` 和 `gradle/actions/setup-gradle@v4` 安装 Java 17、Gradle 8.11.1，将密钥还原到 Runner 临时目录，构建并核验 APK 签名，上传名为 `tanchi-xiaozhu-android` 的 Artifact，最后清理临时密钥。工作流只拥有 `contents: read`，不会创建 GitHub Release。

## WebView 行为和验证

- 页面导航只允许 APK assets。用户点击的 HTTPS 外链交给外部浏览器，其他 scheme 被拦截。内嵌 Base64 PNG、JPEG、WebP、GIF 图片可正常显示。
- `NativeShare.share(title, url)` 仅接受 HTTPS 链接，在主线程调用 Android `ACTION_SEND`，使用系统分享面板。网页需主动调用该桥接。
- 应用进入后台时发送 `window` 的 `blur` 事件，再暂停 WebView；游戏须已有对应的暂停监听。回到前台只恢复 WebView，不触发继续游戏，需要玩家手动继续。
- API 35 的系统栏和刘海通过 WindowInsets 留白，背景为暖米白，无 ActionBar。

项目文件的静态校验不等同于 APK 编译或真机验收。交付前仍须完成 CI `assembleRelease` 和签名核验，并在安卓真机确认：飞行模式可开始和重开、头像及食物完整、滑动方向正常、切后台后保持暂停、最高分重启后保留、分享面板可正常打开、系统栏不遮挡按钮。未完成前不要声称 APK 已通过真机测试。
