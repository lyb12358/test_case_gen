#### 5.1.28 制氧机远控 (ZBB)

##### 5.1.28.1 接口功能说明

制氧机远控

##### 5.1.28.2 接口使用说明

| 配置 | 系统 |
|------|------|
| `rc.message.msgCodesMap[ZBB_OPEN] = Operation_ZBB_1`<br>`rc.message.msgCodesMap[ZBB_CLOSE] = Operation_ZBB_2` | Remote-control |

##### 5.1.28.3 接口设计说明

```mermaid
sequenceDiagram
    title 制氧机远控(ZBB)
    actor APP
    participant ms-remote-control
    participant TCAM

    APP->>ms-remote-control: 1 开/关制氧机远控
    ms-remote-control->>ms-remote-control: 2 根据vds协议做coder报文参数组装
    ms-remote-control->>TCAM: 3 下发指令到车端

    alt 下行响应成功
        TCAM->>ms-remote-control: 4 Tcam响应执行成功,上报状态
        ms-remote-control->>ms-remote-control: 5 处理制氧机状态oxyGeneratorActive
        ms-remote-control->>APP: 6 推送指令执行成功的消息提醒
    else 下行响应失败
        TCAM->>ms-remote-control: 7 Tcam响应执行失败
        ms-remote-control->>APP: 8 推送指令执行失败的消息提醒
    end

    opt dhu上报制氧机状态
        TCAM->>ms-remote-control: 9 上报制氧机状态
        ms-remote-control->>ms-remote-control: 10 处理制氧机状态oxyGeneratorActive
        ms-remote-control->>APP: 11 推送状态变更消息提醒
    end
```

##### 5.1.28.4 接口协议与地址

```
POST /v1.0/remoteControl/control
```

##### 5.1.28.5 接口参数

**主参数：**

| 参数名     | 类型   | 必填 | 说明               |
|------------|--------|------|--------------------|
| serviceId  | String | Y    | 服务ID (`ZBB`)     |
| command    | String | Y    | 操作类型: `start` / `stop` |
| setting    | T      | Y    | 其它参数           |

**`setting` 内部结构：**

| 参数名              | 类型                  | 必填 | 说明                     |
|---------------------|-----------------------|------|--------------------------|
| serviceParameters   | List<ServiceParameter>| Y    | 相关指令具体参数，每个 `ServiceParameter` 由 `key` 和 `value` 组成 |
| superiorOxyActivate | bool                  | Y    | （无说明）               |
| duration            | int                   | Y    | 范围 [1-127]，单位：分钟 |

##### 5.1.28.6 接口输入样例

**开启制氧机：**

```json
{
  "serviceId": "ZBB",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {
        "key": "superiorOxyActivate",
        "value": "true"
      },
      {
        "key": "duration",
        "value": "3"
      }
    ]
  }
}
```

**关闭制氧机：**

```json
{
  "serviceId": "ZBB",
  "command": "stop"
}
```

##### 5.1.28.7 接口返回

| 参数名     | 类型   | 必填 | 说明     |
|------------|--------|------|----------|
| sessionid  | String | Y    | 会话ID   |

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

##### 5.1.28.8 上行

| 场景             | 参数路径                                              | 值 / 说明                      |
|------------------|-------------------------------------------------------|--------------------------------|
| 远控执行成功     | `RequestBody.serviceId`                               | `zbb`                          |
|                  | `RequestBody.serviceData.serviceResult.operationSucceeded` | `true`                         |
|                  | `RequestBody.serviceData.vehicleStatus.climateStatus` | `oxyGeneratorActive`（制氧机状态） |
| 远控执行失败     | `RequestBody.serviceId`                               | `zbb`                          |
|                  | `RequestBody.serviceData.serviceResult.operationSucceeded` | `false`                        |
|                  | `RequestBody.serviceData.serviceResult.error`         | `<the error code and message for this failure>` |
| IHU主动上报      | `RequestBody.serviceId`                               | `zbb`                          |
|                  | `RequestBody.serviceData.serviceCommand`              | `sys`（同步状态）              |
|                  | `RequestBody.serviceData.vehicleStatus.climateStatus` | `oxyGeneratorActive`（制氧机状态） |
