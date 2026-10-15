# 此门即将开启 / THRESHOLD

**Skip Ad to Live · v0.2.0**  
HUA Chencheng × YANG Haowei · Re-Imagine Internet

一座大厅、三个前进节点、五类弹窗和一个结局。把一句留言送进门后；每次处理广告，参与的痕迹便嵌入墙面。

## 运行与修改

这是纯 HTML / CSS / JavaScript 网站，没有第三方运行时依赖、服务器账号或真实支付。可直接打开 `threshold-offline.html` 离线试玩。在线版本从本仓库 `main` 分支的根目录发布至 GitHub Pages。

- `index.html`：页面结构与作品手记
- `style.css`：画面、模拟广告及响应式样式
- `scene.js`：大厅、光线与墙面记录绘制
- `engine.js`：节点、广告及计时规则
- `game.js`：页面交互、声音与绘制调度
- `tests/engine.test.cjs`：游戏规则检查
- `scripts/make-offline.cjs`：生成单文件离线版

使用 Node.js 运行：

```sh
npm test
npm run offline
```

修改拆分源码后重新生成离线文件，再提交到 `main`。无需 `npm install`。

## 持续协作

跨设备开发时先拉取本仓库最新版本。多人修改建议使用独立分支和 Pull Request；视觉调整集中在 `style.css` 与 `scene.js`，规则调整集中在 `engine.js` 与 `game.js`。

保留一座大厅、三个节点、五种广告与最终 12 秒接收窗口 / 30 秒强制广告的冲突。后续重点是实际手机试玩、明确观察平台及课堂反馈。

## 验证范围

8 项规则测试通过。画面已在原生 Canvas 环境检查；实际手机 Safari、触摸、键盘焦点与完整响应式广告路线仍待验证。

画面由代码绘制；页面中的艺术家与作品是视觉参考，没有嵌入其作品图片。广告品牌及操作均为虚构。公开源码不等于授予开源许可证，本仓库目前未附加许可证。
