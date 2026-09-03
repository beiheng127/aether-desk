# RAG 选型说明（Aether Desk）

## 结论（本项目采用）

| 环节 | 选择 | 原因 |
|------|------|------|
| Embedding 模型（推荐） | **OpenAI `text-embedding-3-small`** 或兼容网关的 **`bge-m3`** | 性价比高、中英语义稳、生态成熟 |
| Embedding 兜底 | **local-hash-v1**（本地 hashing） | 无 Embedding Key 也能建索引、跑通全链路 |
| 向量存储 | **SQLite `note_chunks.embedding_json`** + 内存余弦 | 个人知识库 chunk 量级小，零运维、可克隆 |
| 检索策略 | **Hybrid = 关键词 + 向量 + RRF 融合** | 专有名词靠关键词，同义改写靠向量 |
| 升级路径 | **pgvector / Qdrant / Milvus** | 多租户、百万级 chunk、ANN 时再迁 |

## 为什么不是一上来 Qdrant / Milvus？

那些库适合：多用户、百万向量、需要 HNSW/IVF、独立扩缩容。  
Aether Desk 的目标是「个人工作台」：几十到几千笔记块。SQLite 存向量 + 暴力/小规模余弦完全够用，面试也更好讲清 trade-off。

何时升级：

- chunk > ~5万，查询明显变慢 → pgvector / LanceDB  
- 需要过滤 + ANN + 多租户 ACL → Qdrant / Milvus  
- 只要本地文件嵌入式 → LanceDB / sqlite-vec

## Embedding 模型怎么选？

1. **有 OpenAI / 兼容 Key**：`text-embedding-3-small`（默认）  
2. **国内网关**：配置  
   - `EMBEDDING_BASE_URL`  
   - `EMBEDDING_API_KEY`  
   - `EMBEDDING_MODEL=BAAI/bge-m3`（或网关实际模型名）  
3. **只有 DeepSeek 聊天 Key**：DeepSeek 通常不提供 embeddings → 自动 **local-hash** 兜底；需要语义质量时补一套 Embedding 通道即可。  
4. **完全本地模型（可选后续）**：Ollama `nomic-embed-text` / Transformers.js ——体积大，本项目先不动。

## 流水线

```
笔记保存
  → chunk（段优先，~480 字，重叠 80）
  → embed（远程或 local-hash）
  → note_chunks 落库

查询
  → 关键词召回（标题加权）
  → 向量召回（chunk 余弦，按笔记去重）
  → RRF 融合
  → 返回 citations [1][2]
  → LLM 引用回答；UI 可点角标
```

## 环境变量

```bash
# 聊天（必需）
DEEPSEEK_API_KEY=...
# 或 OPENAI_API_KEY=...

# 远程向量（推荐）
EMBEDDING_API_KEY=...
EMBEDDING_BASE_URL=https://api.openai.com/v1
EMBEDDING_MODEL=text-embedding-3-small

# 强制本地兜底
# EMBEDDING_PROVIDER=local-hash

# Hybrid 可调（可选）
# AETHER_RAG_TOP_K=5
# AETHER_RAG_RRF_K=60
# AETHER_RAG_KW_WEIGHT=1
# AETHER_RAG_VEC_WEIGHT=1
```

加列 / 迁移见 [`MIGRATE.md`](./MIGRATE.md)。

> 我用混合检索：关键词保证专有词命中，向量负责语义相近；个人规模向量落在 SQLite，模型优先 text-embedding-3-small/bge-m3，没有 Embedding Key 时用 local-hash 保证链路可跑，规模上来再迁 pgvector。
