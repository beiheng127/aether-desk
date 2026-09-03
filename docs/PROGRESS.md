# Aether Desk · 进度与下一步

> 更新：2026-07-27（晚）

## 当前状态

**本地知识工作台 Agent**：顶栏 **主页（默认）/ 对话 / 设置**。  
主页为品牌先行的产品介绍（目的、能力、回合示意、推荐用法）；对话为四栏工作台。无 Chat Key 时走 **离线 Fixture**（真实工具落库），有 Key 只走真模型。

## 完成度

| 模块 | 完成度 | 说明 |
|------|--------|------|
| 主页 | ✅ | `DeskHome`：目的 / 四项能力 / 回合流程 / CTA |
| 对话工作台 | ✅ | 四栏 + SSE + HITL + 引用 + 工具耗时概览 |
| 离线 Fixture | ✅ | `lib/ai/fixtures` + `/api/fixtures`；快捷句对齐 |
| 知识库 | ✅ | 增删改 + 重建索引 |
| 页面设置 | ✅ | `desk-prefs`：紧凑布局 / 副标题 / fixture 横幅 / 默认主页 |
| RAG | ✅ | Hybrid + TopK/权重可调（`AETHER_RAG_*`）；health 暴露 `rag` |
| 单测 | ✅ | `npm test`（RRF / citation / HITL，零额外依赖） |
| migrate 文档 | ✅ | `docs/MIGRATE.md` |
| 向量后端切换 | 📄 | 说明在 MIGRATE |
| 部署故事 | ❌ | P2 后置 |

## 下一步计划表

| 优先级 | 事项 | 状态 |
|--------|------|------|
| P0 | 最小单测 | ✅ |
| P0 | drizzle migrate 文档 | ✅ |
| P1 | 工具耗时概览（时间线瀑布） | ✅ |
| P1 | Hybrid TopK / 权重可调 | ✅ |
| P1 | 无 Key Fixture 全流程 | ✅ |
| P2 | 向量后端切换说明 | ✅（MIGRATE） |
| P2 | 轻量部署故事 | 后置 |

## 本轮对齐

- [x] 主页升级为完整产品介绍（非极简列表）  
- [x] Fixture 目录 + health / fixtures API  
- [x] `npm test` + MIGRATE + Hybrid env  
- [x] 工具时间线耗时概览  

```bash
npm test
npm run desk   # :3000
curl -s http://127.0.0.1:3000/api/health | python3 -m json.tool
```
