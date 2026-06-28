[![MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/TeamZincs/kipphi-apparatus)

# KipPhi Apparatus - Web Edition

> Based on TeamZincs/kipphi-apparatus, licensed under MIT License.

> 基于 [KipPhi Apparatus](https://github.com/TeamZincs/kipphi-apparatus) 改造的纯网页版 Phigros 谱面编辑器。

## 原项目信息

- **原项目**: [KipPhi Apparatus](https://github.com/TeamZincs/kipphi-apparatus)
- **原作者**: Zes M Young / TeamZincs
- **原项目许可证**: MIT

本项目基于原版 KipPhi Apparatus（SvelteKit + Tauri 桌面应用）进行改造，将其从依赖 Tauri 桌面运行环境改为纯浏览器网页版。所有文件系统操作已替换为浏览器 IndexedDB 存储，文件导出改为浏览器下载。

## 改造内容

| 原版 (Tauri) | 网页版 (Web) |
|---|---|
| Tauri FS 文件系统 | 浏览器 IndexedDB |
| `@tauri-apps/plugin-fs` | IndexedDB API |
| `@tauri-apps/plugin-opener` | 浏览器下载 API |
| 桌面应用打包 | GitHub Pages 部署 |
| 本地文件存储 | 浏览器本地存储 (IndexedDB) |

## 在线使用

访问 GitHub Pages 部署地址即可使用，无需安装任何软件。

## 技术栈

- SvelteKit (SPA 模式)
- IndexedDB (数据存储)
- Service Worker (自动更新 + 离线缓存)
- GitHub Pages (托管)

## 许可证

MIT License — 继承自原项目

## 版权声明

```
This project is based on kipphi-apparatus
Copyright (c) 2026 TeamZincs

Licensed under the MIT License.
```
