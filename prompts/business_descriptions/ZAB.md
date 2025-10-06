#### 5.1.9. 远程恒温座舱设置 (Remote Cabin Temperature Reduction Setting)

##### 5.1.9.1 接口功能说明
本接口提供使用户通过 TSP 将应用程序中的命令发送到车辆上，这样开关就能在车内生效。
该功能用于将开关设置到车内，并将开关状态同步到 TSP。用户可以通过 IHU 设置开关的开关状态，IHU 将该状态通知 TEM，TEM 接收该信息然后上报开关状态给 TSP。

##### 5.1.9.2. 接口使用说明
用户手持终端调用。

##### 5.1.9.4. 接口协议与地址
`POST /v1.0/remoteControl/control`

#### 5.1.9.5. 接口参数

| 参数名      | 类型   | 必填 | 说明                     |
| ----------- | ------ | ---- | ------------------------ |
| vin         | String | Y    | 车辆唯一标识             |
| serviceId   | String | Y    | 服务 ID (ZAB)            |
| command     | String | Y    | 指令类型：开: start 关: stop |
| setting     | Object | N    | 其它参数                 |

**`setting` 对象内的参数 (`serviceParameters`)**

| 参数名             | 类型                   | 必填 | 说明                                                                 |
| ------------------ | ---------------------- | ---- | -------------------------------------------------------------------- |
| serviceParameters  | List<ServiceParameter> | N    | 相关指令具体参数。一个 ServiceParameter 由一个 key 和一个 value 组成。 |
| zab.model          | String                 | N    | 为开时必填。1: ACON；2: ACOFF                                        |
| type               | String                 | Y    | 座舱过热保护 +AC，value=1，表示传统的通风+空调压缩机；座舱过热保护 -AC，value=11，AC-表示只开通风。 |

##### 5.1.9.6. 接口输入样例

**打开 座舱过热保护 +AC**
```json
{
  "vin": "LB377F2ZXJL552137",
  "serviceId": "ZAB",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {
        "key": "zab.model",
        "value": "1"
      },
      {
        "key": "type",
        "value": "1"
      }
    ]
  }
}
```

**关闭 座舱过热保护 +AC**
```json
{
  "vin": "LB377F2ZXJL552137",
  "serviceId": "ZAB",
  "command": "stop",
  "setting": {
    "serviceParameters": [
      {
        "key": "type",
        "value": "1"
      }
    ]
  }
}
```

**打开 座舱过热保护 -AC**
```json
{
  "vin": "LB377F2ZXJL552137",
  "serviceId": "ZAB",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {
        "key": "zab.model",
        "value": "1"
      },
      {
        "key": "type",
        "value": "11"
      }
    ]
  }
}
```

**关闭 座舱过热保护 -AC**
```json
{
  "vin": "LB377F2ZXJL552137",
  "serviceId": "ZAB",
  "command": "stop",
  "setting": {
    "serviceParameters": [
      {
        "key": "type",
        "value": "11"
      }
    ]
  }
}
```

##### 5.1.9.7. 接口返回

| 参数名    | 类型   | 必填 | 说明     |
| --------- | ------ | ---- | -------- |
| sessionid | String | Y    | 会话 ID  |

**示例:**
```json
{
  "respTime": 0,
  "code": "000000",
  "msg": "ok",
  "data": {
    "sessionId": "107-1658712640841"
  }
}
```