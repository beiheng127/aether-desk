# Aether Desk · 简历条目（克制版）

**Aether Desk｜个人知识工作台｜独立开发**  
Next.js · React · Zustand · Vercel AI SDK · SQLite

- 顶栏主页介绍产品；对话为四栏：会话、流式回复、工具时间线（含耗时）、结构化结果（待办 / 表格 / 引用）。
- 笔记 Hybrid 检索（关键词 + 向量 + RRF）；回答带可点引用；编号无效时前端提示。
- 工具结果进入后续轮次上下文；存笔记 / 写待办需确认后再生效；会话导出/导入。
- 无 Chat Key 时用离线 Fixture 走真实工具落库；有 Key 只走真模型；`/eval` 可对比检索模式。

本地：`npm run desk` → http://localhost:3000
