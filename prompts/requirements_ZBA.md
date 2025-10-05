# 接口测试用例生成需求

请根据以下设计文档和Swagger文档生成接口测试用例：

## 一、设计文档

### 1. 背景介绍
#### 系统建设背景
用户使用远程控制客户端(如：app)发送远程控制命令到TSP，TSP 将命令下发到到车辆的场景，以便车辆可以按要求执行操作。
#### 系统建设目标
本文档主要介绍远程控制服务包含的主要功能模块，以及每个功能模块的技术设计。
#### 系统角色：
- TSP：Telematics Service Provider，是车联网服务提供商。
- TCAM：Telematics & Connectivity Antenna Module，车联网智能天线模块。
- DHU：Display Head Unit，驾驶信息及娱乐主机。
#### TSP系统架构描述：
架构中包含以下关键组件和流程：
1. 车端设备（device）
   - 车辆作为终端设备，通过网络与云端进行双向通信：
   - 上行：将状态数据（如位置、车况）上传至云端。
   - 下行：接收来自云端的控制指令。
2. 车云通讯模块
   - 使用 MQTT 协议 实现设备与云端的轻量级通信。
   - 消息经由 规则引擎 处理后，转发至 Kafka 消息队列，并按 Topic 分类存储。
   - 支持“指令下发”功能，将控制指令从云端发送回车辆。
3. 远控服务
   - 核心业务逻辑处理单元，负责解析和执行远程控制指令。
   - 包含“业务逻辑”和“车云通讯SDK”模块，与车云通讯模块协同工作。
   - 接收来自移动端或运维平台的请求，处理后触发指令下发。
4. 消息中心
   - 统一的消息分发枢纽，连接各服务模块，确保消息可靠传递。
5. 用户与运维入口
   - 移动设备：用户通过 APP 网关访问系统，实现远程控制、查看车况等操作。
   - 运维平台：运维人员通过运维网关进行系统监控、故障排查、指令下发等管理操作。
6. 支持服务模块
   - 用户设置：管理用户的个性化配置（如告警阈值、权限）。
   - 车况服务：处理和存储车辆状态数据，供查询和分析使用。
7. 数据流向
   - 上行：车辆（TCAM） → MQTT → 规则引擎 → Kafka → 远控服务/消息中心
   - 下行：用户/运维 → 网关 → 远控服务 → 指令下发 → 车辆（TCAM）
#### TSP远控通用业务流程：
以下描述是用户在移动端发起远程操作后，系统各模块之间的协作流程。整体流程分为四个参与方：client（客户端）、APP（应用层）、TSP（车联网服务平台） 和 TCAM（车载终端或车端控制器），该流程是TSP系统架构描述中“远控服务”和“指令下发”部分的行为级细化。它体现了典型的“请求-响应”模式，并引入了“消息推送”机制以提升用户体验,流程步骤如下：
1. client（客户端）
   - 用户进入功能页面，准备进行远程操作。
   - 触发操作后，流程传递至 APP。
2. APP（应用层）
   - 用户点击“远控按钮”。
   - 系统组装指令数据（如设备ID、操作类型等）。
   - 将指令发送至 TSP 服务。
   - 接收来自 TSP 的执行状态反馈。
   - 接收到消息后，通过“消息推送”机制通知前端。
   - 页面刷新，展示最新状态。
   - 流程结束。
3. TSP
   - 接收来自 APP 的指令。
   - 进行业务逻辑处理（如权限校验、参数验证）。
   - 转发指令至 TCAM（车端）。
   - 接收 TCAM 返回的执行状态。
   - 将状态反馈给 APP。
4. TCAM
   - 接收 TSP 下发的指令。
   - 执行具体操作（如锁车、启动发动机等）。
   - 将执行结果（成功/失败/超时等）反馈回 TSP。

### 2. 业务描述

#### 5.1.27 水淹报警 (ZBA)

##### 5.1.27.1 接口功能说明

水淹报警功能控制。

---

##### 5.1.27.3 接口设计说明

```mermaid
sequenceDiagram
    participant APP
    participant ms-remote-control
    participant TCAM

    note right: 水淹报警开关设置（ZBA）

    APP->>ms-remote-control: 1 水淹报警开关设置
    ms-remote-control->>ms-remote-control: 2 根据vds协议做coder报文参数组装
    ms-remote-control->>TCAM: 3 下发指令到车端

    alt [下行响应成功]
        TCAM->>ms-remote-control: 4 Tcam响应执行成功, 上报状态
        ms-remote-control->>ms-remote-control: 5 处理水淹报警开关状态submersionAlrmActive
        ms-remote-control->>APP: 6 推送指令执行成功的消息提醒
    else [下行响应失败]
        TCAM->>ms-remote-control: 7 响应执行失败
        ms-remote-control->>APP: 8 推送指令执行失败的消息提醒
    end

    opt [dhu上报水淹报警状态]
        TCAM->>ms-remote-control: 9 上报水淹报警状态（水淹报警运行结束自动关闭）
        ms-remote-control->>ms-remote-control: 10 处理水淹报警开关状态submersionAlrmActive
        ms-remote-control->>APP: 11 推送状态变更消息提醒
    end

    opt [dhu上报水淹报警errorcode]
        TCAM->>ms-remote-control: 12 上报水淹报警errorReminder
        ms-remote-control->>ms-remote-control: 13 组装vehicleErrorCode和消息模板
        ms-remote-control->>APP: 14 推送异常消息文案提醒
    end
```

---

##### 5.1.27.4 接口协议与地址

```
POST /v1.0/remoteControl/control
```

---

##### 5.1.27.5 接口参数

| 参数名   | 类型   | 必填 | 说明              |
|----------|--------|------|-------------------|
| serviceId| String | Y    | 服务ID (`ZBA`)    |
| command  | String | Y    | 操作类型: `start` / `stop` |
| setting  | Object | N    | 其它参数（类型 T 表示对象） |

---

##### 5.1.27.6 接口输入样例

**开启水淹报警开关：**

```json
{
  "serviceId": "ZBA",
  "command": "start"
}
```

---

##### 5.1.27.7 接口返回

**返回参数：**

| 参数名    | 类型   | 必填 | 说明     |
|-----------|--------|------|----------|
| sessionid | String | Y    | 会话ID   |

**返回示例：**

```json
{
  "respTime": 0,
  "code": "000000",
  "msg": "ok",
  "data": {
    "sessionId": "1658712640841"
  }
}
```

---

##### 5.1.27.8 上行消息

###### 1. 远控执行成功

| 参数路径                                      | 字段值             | 说明               |
|-----------------------------------------------|--------------------|--------------------|
| `RequestBody.serviceId`                       | `zba`              | 服务ID             |
| `RequestBody.serviceData.serviceResult.operationSucceeded` | `true`             | 操作成功标志       |
| `RequestBody.serviceData.vehicleStatus.additionalStatus` | `submersionAlrmActive` | 水淹报警开关状态   |

###### 2. 远控执行失败

| 参数路径                                      | 字段值             | 说明                         |
|-----------------------------------------------|--------------------|------------------------------|
| `RequestBody.serviceId`                       | `zba`              | 服务ID                       |
| `RequestBody.serviceData.serviceResult.operationSucceeded` | `false`            | 操作失败标志                 |
| `RequestBody.serviceData.serviceResult.error` | `<错误码和消息>`   | 具体的错误码与错误信息       |

###### 3. IHU 主动上报

| 参数路径                                      | 字段值             | 说明               |
|-----------------------------------------------|--------------------|--------------------|
| `RequestBody.serviceId`                       | `zba`              | 服务ID             |
| `RequestBody.serviceData.serviceCommand`      | `sys`              | 同步状态命令       |
| `RequestBody.serviceData.vehicleStatus.additionalStatus` | `submersionAlrmActive` | 水淹报警开关状态   |
| `RequestBody.serviceData.vehicleStatus.additionalStatus.errorReminder.vehicleErrorCode` | —                  | 参见涉水报警 errorcode 定义 |


### 3. TSP-APP错误码
| 错误码  | 说明                     |
|---------|--------------------------|
| 037000  | 参数不正确               |
| 037001  | 没有车辆使用权           |
| 037002  | 有其他指令正在执行       |
| 037003  | 已经存在该指令，不能重复执行 |
| 037004  | 指令下发失败             |
| 037005  | 唤醒失败(唤醒服务是否反馈) |
| 037006  | 请勿重复操作             |
| 037007  | 内部错误                 |
| 037008  | 需要刷新车况             |
| 037009  | 指令下发超时             |

## 二、Swagger文档对应接口信息提炼
以下是关于接口 **`POST /v1.0/remoteControl/control`** 的所有相关信息
---

### 接口概览

*   **路径 (Path)**: `/v1.0/remoteControl/control`
*   **方法 (Method)**: `POST`
*   **标签 (Tag)**: `远控服务` (Rc Api Controller)
*   **摘要 (Summary)**: 远控控制
*   **描述 (Description)**: 远控控制

---

### 请求 (Request)

#### 请求头 (Headers)

| 参数名 (Parameter) | 位置 (In) | 描述 (Description) | 是否必需 (Required) | 类型 (Type) |
| :----------------- | :-------- | :----------------- | :------------------ | :---------- |
| `X-PLATFORM`       | header    | X-PLATFORM         | 否 (false)          | string      |

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
- [列出需要特别关注的测试场景]
- [列出可能的异常情况]
- [列出性能要求相关的测试点]