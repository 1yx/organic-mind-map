# Phase 2 Manual Verification Flow

按 Phase 2 canonical flow 逐步手动验证后端 API 是否跑通。

## Prerequisites

### 启动 API 服务器

```bash
cd /Users/dontaire/Repositories/organic-mind-map
pnpm dev:api
# -> http://localhost:3210
```

### 种子用户

Dev server 不会自动创建用户，需要手动写入。注意：`pnpm --filter` 的工作目录是 `packages/api/`，所以 storage 路径相对于那里。

```bash
mkdir -p packages/api/.omm-storage

cat > packages/api/.omm-storage/user_user_test_001.json << 'EOF'
{"id":"user_test_001","email":"test@example.com","name":"Test User","role":"user","plan":"trial","generationQuotaRemaining":5,"generationQuotaReserved":0,"createdAt":"2026-01-01T00:00:00Z"}
EOF

cat > packages/api/.omm-storage/user_user_admin_001.json << 'EOF'
{"id":"user_admin_001","email":"admin@example.com","name":"Admin User","role":"admin","plan":"paid","createdAt":"2026-01-01T00:00:00Z"}
EOF
```

### 生成签名 Cookie

```bash
export OMM_COOKIE=$(node -e "
const crypto = require('crypto');
const userId = 'user_test_001';
const secret = 'dev-secret-change-me';
const sig = crypto.createHmac('sha256', secret).update(userId).digest('base64url');
console.log('omm_user_id=' + encodeURIComponent(userId) + '.' + sig);
")

export ADMIN_COOKIE=$(node -e "
const crypto = require('crypto');
const userId = 'user_admin_001';
const secret = 'dev-secret-change-me';
const sig = crypto.createHmac('sha256', secret).update(userId).digest('base64url');
console.log('omm_user_id=' + encodeURIComponent(userId) + '.' + sig);
")
```

---

## Step 1: Session / Auth

```bash
# 1a. Health check
curl -s http://localhost:3210/api/health
# 预期: {"ok":true}

# 1b. 无 cookie session
curl -s http://localhost:3210/api/session | jq
# 预期: {"ok":true,"data":{"authenticated":false,"user":null}}

# 1c. 有 cookie session
curl -s -b "$OMM_COOKIE" http://localhost:3210/api/session | jq
# 预期: {"ok":true,"data":{"authenticated":true,"user":{"id":"user_test_001",...}}}

# 1d. 无 auth 访问 quota
curl -s http://localhost:3210/api/quota | jq
# 预期: 401, error code "unauthorized"

# 1e. 有 auth 访问 quota
curl -s -b "$OMM_COOKIE" http://localhost:3210/api/quota | jq
# 预期: 200, quota balance with remaining/reserved
```

---

## Step 2: Generation Job 创建

对应 canonical flow Step 2-3（backend 验证 input，解析 outline，调 LLM）。

```bash
# 2a. content-outline-text 路径（纯缩进文本，# 开头的行会被过滤）
curl -s -b "$OMM_COOKIE" -X POST http://localhost:3210/api/generation-jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "kind": "content_outline_text",
      "text": "Water Cycle\n  Evaporation\n    Sun heats water\n    Water turns to vapor\n  Condensation\n    Vapor rises and cools\n    Forms clouds\n  Precipitation\n    Clouds release rain\n    Water returns to ground"
    },
    "title": "Water Cycle Mind Map"
  }' | jq
# 预期: 201, jobId, status "completed", documentId
# content_outline_text 格式: center 缩进 0, branch 缩进 2, sub-branch 缩进 4

# 2b. 自然语言路径（会调 LLM）
curl -s -b "$OMM_COOKIE" -X POST http://localhost:3210/api/generation-jobs \
  -H "Content-Type: application/json" \
  -d '{
    "input": {
      "kind": "text_prompt",
      "text": "Explain the water cycle in simple terms"
    },
    "title": "Water Cycle Map"
  }' | jq
# 预期: 201（如果没有 REPLICATE_API_TOKEN 则后续阶段会失败）

# 2c. 无 auth 创建 job
curl -s -X POST http://localhost:3210/api/generation-jobs \
  -H "Content-Type: application/json" \
  -d '{"input":{"kind":"text_prompt","text":"test"}}' | jq
# 预期: 401 "unauthorized"

# 2d. 无效输入
curl -s -b "$OMM_COOKIE" -X POST http://localhost:3210/api/generation-jobs \
  -H "Content-Type: application/json" \
  -d '{"input":{"kind":"text_prompt"}}' | jq
# 预期: 400 "validation_failed"
```

记录返回的 `jobId`，后续步骤使用。

---

## Step 3: Job 状态轮询

对应 canonical flow Step 4-7（生成 reference image，enqueue CV worker，提取结构）。

```bash
JOB_ID="<Step 2 返回的 jobId>"

# 3a. 查询 job 状态
curl -s -b "$OMM_COOKIE" http://localhost:3210/api/generation-jobs/$JOB_ID | jq

# 3b. 反复调用观察 stages 变化
# 状态流转: queued -> validating_input -> outlining -> generating_reference -> extracting -> assembling_artifacts -> completed/failed
```

验证点：
- 没配 `REPLICATE_API_TOKEN` 时，job 应在 outlining 或 generating_reference 阶段失败，返回 `provider_failed`
- 失败的 job 不应创建 product document
- job 应有 contentOutline 和 referenceImage artifact 引用（如果走到那一步）

---

## Step 4: Worker 结果注入

对应 canonical flow Step 7（CV worker 提取结构，返回 prediction_omm）。

如果 job 走到了 extracting 阶段，需要模拟 CV worker 返回结果：

```bash
# 4a. 注入 worker 结果（需要 admin cookie）
curl -s -b "$ADMIN_COOKIE" -X POST http://localhost:3210/api/generation-jobs/$JOB_ID/worker-result \
  -H "Content-Type: application/json" \
  -d '{
    "output": {
      "ok": true,
      "predictionOmm": {
        "schema": "omm.document",
        "version": 1,
        "producer": "cv_worker",
        "title": "Water Cycle Mind Map",
        "contentOutline": {
          "schema": "omm.content_outline",
          "version": 1,
          "center": {"id": "center", "concept": "Water Cycle"},
          "branches": []
        }
      },
      "artifacts": [],
      "diagnostics": []
    }
  }' | jq
# 预期: 200, job 状态更新
```

---

## Step 5: Document 创建与 currentEditableSource

对应 canonical flow Step 8-9（backend 创建 document，设置 currentEditableSource）。

```bash
# 5a. 查询 job，应包含 documentId
curl -s -b "$OMM_COOKIE" http://localhost:3210/api/generation-jobs/$JOB_ID | jq '.data.documentId'

# 5b. 获取 document 详情
DOC_ID="<上一步的 documentId>"
curl -s -b "$OMM_COOKIE" http://localhost:3210/api/documents/$DOC_ID | jq

# 5c. currentEditableSource 验证
curl -s -b "$OMM_COOKIE" http://localhost:3210/api/documents/$DOC_ID | jq '.data.currentEditableSource'
# 预期: {"kind":"prediction_omm","artifactId":"..."}
```

---

## Step 6: Artifact 读取

对应 canonical flow Step 10（前端加载 prediction_omm 初始化 canvas）。

```bash
ARTIFACT_ID="<currentEditableSource 中的 artifactId>"

# 6a. 获取 artifact 元数据
curl -s -b "$OMM_COOKIE" http://localhost:3210/api/artifacts/$ARTIFACT_ID | jq
# 预期: 200, artifact record with kind, mimeType, etc.

# 6b. 获取 artifact 内容（prediction_omm JSON，前端可读）
curl -s -b "$OMM_COOKIE" http://localhost:3210/api/artifacts/$ARTIFACT_ID/content | jq
# 预期: prediction_omm JSON 内容

# 6c. 跨用户访问（应该 404）
curl -s http://localhost:3210/api/artifacts/$ARTIFACT_ID \
  -b "omm_user_id=user_test_002.INVALID" | jq
# 预期: 404 "not_found"
```

---

## Step 7: 用户保存

对应 canonical flow Step 12（explicit save 创建 user-saved-omm）。

```bash
# 7a. 保存 user_saved_omm
curl -s -b "$OMM_COOKIE" -X PUT http://localhost:3210/api/documents/$DOC_ID/current-omm \
  -H "Content-Type: application/json" \
  -d '{
    "baseArtifactId": "'$ARTIFACT_ID'",
    "omm": {
      "version": "1.0",
      "center": {"text": "Main Topic", "x": 500, "y": 400},
      "branches": [
        {"id": "b1", "text": "Branch A (edited)", "points": [[500,400],[300,200]]},
        {"id": "b2", "text": "Branch B", "points": [[500,400],[700,200]]}
      ]
    }
  }' | jq
# 预期: 200, new artifactId

# 7b. currentEditableSource 应切换到 user_saved_omm
curl -s -b "$OMM_COOKIE" http://localhost:3210/api/documents/$DOC_ID | jq '.data.currentEditableSource'
# 预期: {"kind":"user_saved_omm","artifactId":"..."}

# 7c. 陈旧保存检测（用旧的 baseArtifactId）
curl -s -b "$OMM_COOKIE" -X PUT http://localhost:3210/api/documents/$DOC_ID/current-omm \
  -H "Content-Type: application/json" \
  -d '{
    "baseArtifactId": "'$ARTIFACT_ID'",
    "omm": {"version":"1.0","center":{"text":"stale","x":0,"y":0},"branches":[]}
  }' | jq
# 预期: 409 "stale_document"
```

---

## Step 8: Export

```bash
# 8a. 导出 PNG
curl -s -b "$OMM_COOKIE" -X POST http://localhost:3210/api/exports \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "'$DOC_ID'",
    "format": "png"
  }' | jq
# 预期: 201, exportJobId

# 8b. 查询导出状态
EXPORT_ID="<exportJobId>"
curl -s -b "$OMM_COOKIE" http://localhost:3210/api/exports/$EXPORT_ID | jq

# 8c. 普通用户访问 admin 格式（应 403）
curl -s -b "$OMM_COOKIE" -X POST http://localhost:3210/api/exports \
  -H "Content-Type: application/json" \
  -d '{"documentId":"'$DOC_ID'","format":"debug_bundle"}' | jq
# 预期: 403 "forbidden"

# 8d. Admin 导出 debug_bundle
curl -s -b "$ADMIN_COOKIE" -X POST http://localhost:3210/api/exports \
  -H "Content-Type: application/json" \
  -d '{"documentId":"'$DOC_ID'","format":"debug_bundle"}' | jq
# 预期: 201（admin 有权）
```

---

## Step 9: Admin Corrections

```bash
# 9a. 普通用户创建 correction（应 403）
curl -s -b "$OMM_COOKIE" -X POST http://localhost:3210/api/admin/corrections \
  -H "Content-Type: application/json" \
  -d '{"documentId":"'$DOC_ID'","correctionOmm":{}}' | jq
# 预期: 403 "forbidden"

# 9b. Admin 创建 correction（字段名是 predictionArtifactId，不是 sourceArtifactId）
curl -s -b "$ADMIN_COOKIE" -X POST http://localhost:3210/api/admin/corrections \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "'$DOC_ID'",
    "predictionArtifactId": "'$ARTIFACT_ID'",
    "correctionOmm": {
      "schema": "omm.document",
      "version": 1,
      "producer": "correction",
      "title": "Water Cycle Mind Map (corrected)"
    }
  }' | jq
# 预期: 201

# 9c. correction 不改变 currentEditableSource
curl -s -b "$OMM_COOKIE" http://localhost:3210/api/documents/$DOC_ID | jq '.data.currentEditableSource'
# 预期: 仍然指向 user_saved_omm，不是 correction_omm
```

---

## Step 10: Document Archive

```bash
# 10a. 归档文档
curl -s -b "$OMM_COOKIE" -X POST http://localhost:3210/api/documents/$DOC_ID/archive | jq
# 预期: 200

# 10b. lifecycle 变为 archived
curl -s -b "$OMM_COOKIE" http://localhost:3210/api/documents/$DOC_ID | jq '.data.lifecycle'
# 预期: "archived"
```

---

## Key Assertions

| # | 断言 | 对应 design.md 决策 |
|---|------|---------------------|
| 1 | 失败的 job 不创建 document | Failed Generation Does Not Create User Documents |
| 2 | `currentEditableSource` 优先 `user_saved_omm`，否则 `prediction_omm` | Use currentEditableSource |
| 3 | `correction_omm` 不改变 document lifecycle 或 `currentEditableSource` | Restrict Internal Artifacts |
| 4 | stale save 返回 409 `stale_document` | Browser Owns Unsaved Editor State |
| 5 | mask/raw artifacts 是 admin-only | Restrict Internal Artifacts |
| 6 | 普通用户不能访问 `debug_bundle` / `phase3_dataset_seed` export | Stable Errors |
| 7 | 跨用户访问 artifact 返回 404 | Auth ownership checks |
| 8 | Job stages 流转完整 | Queue CV Worker Jobs |

## Full Flow Summary

```
Step 1:  Session/Auth              -> cookie-based auth, /api/session
Step 2:  创建 Generation Job       -> POST /api/generation-jobs
Step 3:  轮询 Job 状态             -> GET /api/generation-jobs/:id (stages 流转)
Step 4:  Worker 结果注入           -> POST /api/generation-jobs/:id/worker-result
Step 5:  Document 创建             -> 自动创建, currentEditableSource -> prediction_omm
Step 6:  Artifact 读取             -> GET /api/artifacts/:id/content
Step 7:  用户保存                  -> PUT /api/documents/:id/current-omm (切换到 user_saved_omm)
Step 8:  Export                    -> POST /api/exports
Step 9:  Admin Corrections         -> POST /api/admin/corrections (不改变用户 document)
Step 10: Archive                   -> POST /api/documents/:id/archive
```
