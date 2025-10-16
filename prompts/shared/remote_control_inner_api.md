## 二、Swagger文档对应接口信息提炼
以下是关于接口 **`POST /inner/v1.0/remoteControl/control`** 的所有相关信息
---

### 接口概览

*   **路径 (Path)**: `/inner/v1.0/remoteControl/control`
*   **方法 (Method)**: `POST`
*   **标签 (Tag)**: `远控服务-内部服务使用` (Rc Inner Controller)
*   **摘要 (Summary)**: 远控控制
*   **描述 (Description)**: 远控控制

---

### 请求 (Request)

#### 请求头 (Headers)

此接口无需特殊的请求头参数。

#### 请求体 (Body)

*   **Content-Type**: `application/json`
*   **Schema**: `RcParamDTO«RcServiceData»`

##### 请求体结构详解 (`RcParamDTO«RcServiceData»`)

这是一个泛型对象，其 `setting` 字段的类型为 `RcServiceData`。

```json
{
  "command": "string", // 指令类型 (必需)
  "deviceId": "string", // 设备ID (必需)
  "projectId": "string", // 项目ID (必需)
  "serviceId": "string", // 服务id (必需)
  "userId": "string", // 用户id (必需)
  "vin": "string", // 车辆vin (必需)
  "dataSource": "string", // 数据来源
  "eventId": "string", // 事件ID
  "reqParameter": "string", // 请求参数
  "setting": {
    // 类型为 RcServiceData，见下方详解
  }
}
```

##### `RcServiceData` 结构详解

这是远控服务的核心数据对象，包含了执行远控指令所需的各种参数。

```json
{
  "operationScheduling": {
    // 预约调度信息 (必需)
    "duration": 0, // 持续时间 (int32)
    "endTime": 0, // 一天结束的时间 (int64)
    "interval": 0, // 间隔 (int32)
    "occurs": 0, // 发生的次数，-1 表示没有限制 (int32)
    "recurrentOperation": false, // 是否循环操作
    "scheduledTime": 0, // 计划时间 (int64)
    "socTarget": "string", // 充至目标电量
    "startTimeofDay": 0 // 一天开始启动的时间 (int32)
  },
  "serviceParameters": [
    // 相关指令具体参数列表 (必需)
    {
      "key": "string", // 具体的参数key (必需)
      "value": "string" // 具体的参数value (必需)
    }
  ],
  "temStatus": {
    // TEM的状态 (必需)
    "healthStatus": 0, // (int32)
    "powerSource": 0, // (int32)
    "serialNumber": "string",
    "serviceProvisoned": false,
    "vin": "string"
  },
  "timerInfo": {
    // 定时列表 (必需)
    "timerId": 0, // (int32)
    "timers": [
      {
        "dayofWeek": "string", // 一周几天
        "duration": 0, // 持续时间 (int32)
        "endtimeofDay": "string", // 一天结束的时间
        "startTimeofDay": "string", // 一天开始启动的时间
        "timerActivation": 0 // 是否激活定时器 (int32)
      }
    ]
  },
  "smartTemp": {
    // 智能温控 (非必需，但文档中定义了)
    "ac": "string",
    "duration": "string",
    "heat": [
      {
        "level": "string",
        "pos": "string"
      }
    ],
    "mode": "string",
    "paa": "string",
    "scheduleList": [
      {
        "dayOfWeek": "string",
        "startTime": "string",
        "timeActivation": "string"
      }
    ],
    "scheduledTime": "string",
    "sw": "string",
    "temp": "string",
    "timerId": "string",
    "ventilation": [
      {
        "level": "string",
        "pos": "string"
      }
    ],
    "vlt": "string",
    "vltDuration": "string",
    "vltPos": "string"
  }
}
```

---

### 响应 (Response)

*   **状态码 (Code)**: `200` (OK)
*   **Content-Type**: `*/*` (任意类型)
*   **Schema**: `ZrRestResponse«RcResultVO»`

##### 响应体结构详解 (`ZrRestResponse«RcResultVO»`)

```json
{
  "code": "string", // 业务状态码，如 "000000" 表示成功
  "data": {
    "sessionId": "string" // 会话ID (必需)
  },
  "debug": {
    "bizName": "string",
    "time": 0, // (int64)
    "traceId": "string"
  },
  "msg": "string", // 消息描述，如 "ok"
  "success": true // 是否成功
}
```

---

## 三、测试关注点
- **必填字段验证**: command、deviceId、projectId、serviceId、userId、vin字段为必填
- **复杂数据结构**: 验证RcServiceData中所有嵌套对象的完整性
- **预约调度功能**: 测试operationScheduling的各种时间和频率设置
- **服务参数**: 验证serviceParameters中key-value对的有效性
- **TEM状态**: 检查temStatus字段的状态值范围
- **定时器功能**: 测试timerInfo中的定时器配置
- **智能温控**: 验证smartTemp相关参数（如果使用）
- **会话管理**: 确保返回的sessionId唯一且有效
- **权限控制**: 验证内部服务调用的权限和访问控制
- **参数边界值**: occurs为-1表示无限制的特殊处理
- **时间格式**: 各种时间字段的格式和范围验证
- **循环操作**: recurrentOperation字段对执行逻辑的影响
- **错误处理**: 各种异常场景的错误码和消息
- **性能要求**: 复杂指令处理的响应时间要求