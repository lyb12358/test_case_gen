#### 5.1.7 环境调节 Remote climate control

##### 5.1.7.1 接口功能说明  
本接口提供使用户通过 TSP 将应用程序中的命令发送到车辆上，以便远程控制空调、方向盘、座椅。

##### 5.1.7.2 接口使用说明  
用户手持终端调用。

##### 5.1.7.3 接口设计说明  
只下发用户操作的指令。  
座椅加热/通风，开/关必须操作一个。

##### 5.1.7.4 接口协议与地址  
```
POST /v1.0/remoteControl/control
```

##### 5.1.7.5 接口参数  

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| serviceId | String | Y | 服务 ID (RCE=20) |
| command | String | Y | 操作类型：`start`（开启）、`stop`（停止）、`cancel`（二次确认中取消操作）、`resume`（二次确认中同意操作） |
| setting | Object | N | 其它参数 |

**setting 内部结构：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| serviceParameters | List\<ServiceParameter\> | N | 相关指令具体参数，一个 ServiceParameter 由一个 key 和一个 value 组成 |
| rce.conditioner | Int | Y | 1: 空调<br>2: 除霜<br>3: 座椅加热<br>4: 座椅通风<br>5: 方向盘加热 |
| rce.temp | float | N | 目标温度（空调控制时必填） |
| rce.heat | String | N | 方向盘加热时必填，值为 `steering_wheel` |
| rce.heat.{*} | String | N | 座椅加热等级，例如：<br>`front-left`、`front-right`、`back-left`、`back-right`<br>或数字标识：<br>`11`: driver<br>`19`: passenger<br>`21`: second-left<br>`25`: second-middle<br>`29`: second-right<br>`31`: third-left<br>`39`: third-right<br>多选使用多个 key 下发。<br>值代表加热等级：0: OFF, 1: 1Level, 2: 2Level, 3: 3Level |
| rce.ventilation.{*} | String | N | 通风等级，位置标识同上。<br>值代表通风等级：0: OFF, 1: 1Level, 2: 2Level, 3: 3Level |
| operationScheduling | Object | Y | 调度、安排、计划 |
| duration | Int | Y | 运行时间：<br>除霜: `15 * 6 = 90`<br>其他: `(duration * 60) / 10` |

##### 5.1.7.6 接口输入样例  

1. **开启空调**:
```json
{
  "serviceId": "RCE",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {
        "key": "rce.temp",
        "value": "16"
      },
      {
        "key": "rce.conditioner",
        "value": "1"
      }
    ],
    "operationScheduling": {
      "duration": "20"
    }
  }
}
```

2. **关闭空调**:
```json
{
  "serviceId": "RCE",
  "command": "stop",
  "setting": {
    "serviceParameters": [
      {
        "key": "rce.conditioner",
        "value": "1"
      }
    ]
  }
}
```

3. **开启除霜**:
```json
{
  "serviceId": "RCE",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {
        "key": "rce.conditioner",
        "value": "2"
      }
    ],
    "operationScheduling": {
      "duration": "60"
    }
  }
}
```

4. **关闭除霜**:
```json
{
  "serviceId": "RCE",
  "command": "stop",
  "setting": {
    "serviceParameters": [
      {
        "key": "rce.conditioner",
        "value": "2"
      }
    ]
  }
}
```

5. **开启座椅加热**（选择要开启的座椅位置传 1、2、3）:
```json
{
  "serviceId": "RCE",
  "command": "start",
  "setting": {
    "serviceParameters": [
      { "key": "rce.heat.11", "value": "1" },
      { "key": "rce.heat.19", "value": "1" },
      { "key": "rce.heat.21", "value": "1" },
      { "key": "rce.heat.25", "value": "3" },
      { "key": "rce.heat.29", "value": "1" },
      { "key": "rce.heat.31", "value": "2" },
      { "key": "rce.heat.39", "value": "3" },
      { "key": "rce.ventilation.11", "value": "1" },
      { "key": "rce.ventilation.19", "value": "0" },
      { "key": "rce.ventilation.21", "value": "1" },
      { "key": "rce.ventilation.25", "value": "1" },
      { "key": "rce.ventilation.29", "value": "1" },
      { "key": "rce.ventilation.31", "value": "1" },
      { "key": "rce.ventilation.39", "value": "2" },
      { "key": "rce.conditioner", "value": "3" }
    ],
    "operationScheduling": {
      "duration": "60"
    }
  }
}
```

6. **关闭座椅加热**（选择要关闭的座椅位置传 0）:
```json
{
  "serviceId": "RCE",
  "command": "start",
  "setting": {
    "serviceParameters": [
      { "key": "rce.heat.11", "value": "0" },
      { "key": "rce.heat.19", "value": "0" },
      { "key": "rce.heat.21", "value": "0" },
      { "key": "rce.heat.29", "value": "0" },
      { "key": "rce.ventilation.11", "value": "0" },
      { "key": "rce.ventilation.19", "value": "0" },
      { "key": "rce.ventilation.21", "value": "0" },
      { "key": "rce.ventilation.29", "value": "0" },
      { "key": "rce.conditioner", "value": "3" }
    ],
    "operationScheduling": {
      "duration": "60"
    }
  }
}
```

7. **开启座椅通风**（选择要开启的座椅位置传 1、2、3）:
```json
{
  "vin": "L6T79T2E6MP002042",
  "serviceId": "RCE",
  "command": "start",
  "setting": {
    "serviceParameters": [
      { "key": "rce.heat.front-left", "value": "0" },
      { "key": "rce.heat.front-right", "value": "0" },
      { "key": "rce.heat.back-left", "value": "0" },
      { "key": "rce.heat.back-right", "value": "0" },
      { "key": "rce.ventilation.front-left", "value": "1" },
      { "key": "rce.ventilation.front-right", "value": "0" },
      { "key": "rce.ventilation.back-left", "value": "0" },
      { "key": "rce.ventilation.back-right", "value": "0" },
      { "key": "rce.conditioner", "value": "4" }
    ],
    "operationScheduling": {
      "duration": "60"
    }
  }
}
```

8. **关闭座椅通风**（选择要关闭的座椅位置传 0）:
```json
{
  "vin": "L6T79T2E6MP002042",
  "serviceId": "RCE",
  "command": "start",
  "setting": {
    "serviceParameters": [
      { "key": "rce.heat.front-left", "value": "0" },
      { "key": "rce.heat.front-right", "value": "0" },
      { "key": "rce.heat.back-left", "value": "0" },
      { "key": "rce.heat.back-right", "value": "0" },
      { "key": "rce.ventilation.front-left", "value": "0" },
      { "key": "rce.ventilation.front-right", "value": "0" },
      { "key": "rce.ventilation.back-left", "value": "0" },
      { "key": "rce.ventilation.back-right", "value": "0" },
      { "key": "rce.conditioner", "value": "4" }
    ],
    "operationScheduling": {
      "duration": "60"
    }
  }
}
```

9. **开启方向盘加热**:
```json
{
  "vin": "L6T79T2E6MP002042",
  "serviceId": "RCE",
  "command": "start",
  "setting": {
    "serviceParameters": [
      { "key": "rce.heat", "value": "steering_wheel" },
      { "key": "rce.conditioner", "value": "5" }
    ],
    "operationScheduling": {
      "duration": "60"
    }
  }
}
```

10. **关闭方向盘加热**:
```json
{
  "vin": "L6T79T2E6MP002042",
  "serviceId": "RCE",
  "command": "stop",
  "setting": {
    "serviceParameters": [
      { "key": "rce.heat", "value": "steering_wheel" },
      { "key": "rce.conditioner", "value": "5" }
    ]
  }
}
```

11. **发动机二次确认**（取消操作）:
```json
{
  "vin": "L6T79T2E6MP002042",
  "serviceId": "RCE",
  "command": "cancel"
}
```

##### 5.1.7.7 接口返回  

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| sessionid | String | Y | 会话ID |

**示例**:
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