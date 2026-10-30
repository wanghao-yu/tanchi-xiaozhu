# 贪吃小猪

免费公开网页版：https://wanghao-yu.github.io/tanchi-xiaozhu/

手机滑动或点按方向键；电脑使用方向键或WASD。随机美食每个加10分，每局有3次保分复活机会。最高分保存在当前浏览器。

这是当前免费公开链接的发布源。main根目录由GitHub Pages发布，不需要后端或账户登录。

中文圆体字体的许可证和来源见assets/ROUNDED-LICENSE.txt。

安装下载页：https://wanghao-yu.github.io/tanchi-xiaozhu/download.html

安卓APK和电脑离线ZIP通过下载页获取。iPhone使用Safari添加到主屏幕，第一次从主屏幕联网打开、等待“已可离线游玩”后可断网使用。iPhone方案为离线网页App，不是IPA安装包。

网页更新使用Service Worker网络优先，离线时回退到已保存资源；更新核心资源列表时需同步递增sw.js缓存命名空间。下载文件不进入离线缓存。
