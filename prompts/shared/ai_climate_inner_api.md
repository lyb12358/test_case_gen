## 二、Swagger文档对应接口信息提炼
以下是关于接口 **`POST /inner/v1.0/remoteControl/aiClimate`** 的所有相关信息
---

### 接口概览

*   **路径 (Path)**: `/inner/v1.0/remoteControl/aiClimate`
*   **方法 (Method)**: `POST`
*   **标签 (Tag)**: `远控服务-内部服务使用` (Rc Inner Controller)
*   **摘要 (Summary)**: 智能空调远控
*   **描述 (Description)**: 智能空调远控

---

### 请求 (Request)

#### 请求头 (Headers)

此接口无需特殊的请求头参数。

#### 请求体 (Body)

*   **Content-Type**: `application/json`
*   **Schema**: `AiClimateReqDTO`

##### 请求体结构详解 (`AiClimateReqDTO`)

这是智能空调远控的请求数据对象，支持批量操作多个VIN。

```json
{
  "command": "string", // 操作类型 (必需)
  "durationDTOList": [
    // vin的集合 (可选)
    {
      "duration": 0, // 持续时长 [1-127]单位分钟 (int32, 必需)
      "vin": "string" // vin (必需)
    }
  ],
  "serviceId": "string" // 服务id (必需)
}
```

**字段说明：**
- `command`: 操作类型，指定要执行的智能空调操作
- `durationDTOList`: VIN和持续时间列表，支持批量操作多个车辆
- `serviceId`: 服务标识符，用于追踪和记录

##### `VinDurationDTO` 结构详解

```json
{
  "duration": 0, // 持续时长 [1-127]单位分钟 (int32)
  "vin": "string" // 车辆VIN码
}
```

---

### 响应 (Response)

*   **状态码 (Code)**: `200` (OK)
*   **Content-Type**: `*/*` (任意类型)
*   **Schema**: `ZrRestResponse«string»`

##### 响应体结构详解 (`ZrRestResponse«string»`)

```json
{
  "code": "string", // 业务状态码，如 "000000" 表示成功
  "data": "string", // 响应数据，通常为操作结果消息或标识符
  "debug": {
    "bizName": "string", // 业务名称
    "time": 0, // 时间戳 (int64)
    "traceId": "string" // 链路追踪ID
  },
  "msg": "string", // 消息描述，如 "ok"
  "success": true // 是否成功
}
```

---

## 三、测试关注点
- **批量操作验证**: 测试单个VIN和多个VIN的场景
- **参数边界值**: duration字段的有效范围 [1-127]
- **必填字段验证**: command、serviceId、duration、vin字段为必填
- **VIN格式校验**: 确保VIN码格式正确
- **服务ID有效性**: 验证serviceId的有效性和权限
- **操作类型覆盖**: 测试不同的command值
- **异常场景**: 空列表、无效duration、重复VIN等
- **并发处理**: 批量操作的并发处理能力
- **响应时间**: 批量操作的响应时间是否符合要求
- **数据一致性**: 批量操作的原子性和一致性