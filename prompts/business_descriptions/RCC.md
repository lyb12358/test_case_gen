#### 5.1.8. 远程净化 (Remote climate control (non-engine))

##### 5.1.8.1 接口功能说明
本接口提供使用户通过TSP将应用程序中的命令发送到车辆上，以便远程控制座舱通风。

##### 5.1.8.2. 接口使用说明
用户手持终端调用。

##### 5.1.8.4. 接口协议与地址
`POST /v1.0/remoteControl/control`

##### 5.1.8.5. 接口参数

| 参数名      | 类型   | 必填 | 说明                     |
| ----------- | ------ | ---- | ------------------------ |
| serviceId   | String | Y    | 服务ID (RCC)          |
| command     | String | Y    | 操作类型: `start` 或 `stop` |
| setting     | T      | N    | 其它参数                 |

**T (setting 对象结构)**

| 参数名               | 类型                  | 必填 | 说明                                       |
| -------------------- | --------------------- | ---- | ------------------------------------------ |
| serviceParameters    | List<ServiceParameter> | N    | 相关指令具体参数，每个ServiceParameter由一个key和一个value组成 |
| rcc.conditioner      | Int                   | Y    | 1：空调；2：除霜；50：cabin refresh (座舱清洁/座舱通风) |
| rcc.temp             | float                 | N    | 目标温度 (空调控制时必填)                  |
| Key=rcc.ventilation  | Int                   | N    | 0：cabin ventilation (座舱通风)            |
| operationScheduling  | OperationScheduling   | Y    | 调度、安排、计划                           |
| duration             | Int                   | Y    | 运行时间。除霜：15*6=90；其他的按用户选择传值 |

##### 5.1.8.6. 接口输入样例

**1. 开启座舱通风**
```json
{
  "serviceId": "RCC",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {
        "key": "rcc.conditioner",
        "value": "50"
      },
      {
        "key": "rcc.ventilation",
        "value": "0"
      }
    ],
    "operationScheduling": {
      "duration": "60"
    }
  }
}
```

**2. 关闭座舱通风**
```json
{
  "vin": "L6T79T2E6MP002042",
  "serviceId": "RCC",
  "command": "stop",
  "setting": {
    "serviceParameters": [
      {
        "key": "rcc.conditioner",
        "value": "50"
      },
      {
        "key": "rcc.ventilation",
        "value": "0"
      }
    ]
  }
}
```

**3. 开启空调**
```json
{
  "vin": "L6T79T2E6MP002042",
  "serviceId": "RCC",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {
        "key": "rcc.temp",
        "value": "16"
      },
      {
        "key": "rcc.conditioner",
        "value": "1"
      }
    ],
    "operationScheduling": {
      "duration": "20"
    }
  }
}
```

**4. 关闭空调**
```json
{
  "vin": "L6T79T2E6MP002042",
  "serviceId": "RCC",
  "command": "stop",
  "setting": {
    "serviceParameters": [
      {
        "key": "rcc.conditioner",
        "value": "1"
      }
    ]
  }
}
```

**5. 开启除霜**
```json
{
  "vin": "LB377F2ZXJL33333",
  "serviceId": "RCC",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {
        "key": "rcc.conditioner",
        "value": "2"
      }
    ],
    "operationScheduling": {
      "duration": "60"
    }
  }
}
```

**6. 关闭除霜**
```json
{
  "vin": "L6T79T2E6MP002042",
  "serviceId": "RCC",
  "command": "stop",
  "setting": {
    "serviceParameters": [
      {
        "key": "rcc.conditioner",
        "value": "2"
      }
    ]
  }
}
```

##### 5.1.8.7. 接口返回

| 参数名     | 类型   | 必填 | 说明     |
| ---------- | ------ | ---- | -------- |
| sessionId  | String | Y    | 会话ID   |

**示例：**
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