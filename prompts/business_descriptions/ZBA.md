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