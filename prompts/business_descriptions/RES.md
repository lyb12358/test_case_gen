#### 5.1.13. 远程发动机启动 / 停止 Remote engine start/stop （RES）

##### 5.1.13.1 接口功能说明
本接口提供使用户通过 TSP 将应用程序中的命令发送到车辆上，以便启动汽车引擎。

##### 5.1.12.2. 接口使用说明
用户手持终端调用，车主。

##### 5.1.12.3. 接口设计说明
与闪灯、鸣笛相同。

##### 5.1.12.4. 接口协议与地址
```
POST /v1.0/remoteControl/control
```

##### 5.1.12.5. 接口参数

| 参数名        | 类型   | 必填 | 说明                              |
|---------------|--------|------|-----------------------------------|
| vin           | String | N    | 运维平台下发时必填                |
| serviceId     | String | Y    | 服务 (RES = 17)                   |
| command       | String | Y    | 操作类型: Start or Stop           |
| setting       | T      | Y    | 其它参数                          |

**setting 内部结构：**

| 参数名               | 类型                    | 必填 | 说明                                                                 |
|----------------------|-------------------------|------|----------------------------------------------------------------------|
| serviceParameters    | List<ServiceParameter>  | N    | 相关指令具体参数，一个 ServiceParameter 由一个 key 和一个 value 组成 |
| engStrtType          | String                  | Y    | 1. remoteEng：远程立即启动（不限车主）<br>2. disChrgrEngStrt<br>3. RemAllowStrt：远程允许启动（目前只实现了这个） |
| operationScheduling  | OperationScheduling     | N    | 调度、安排、计划                                                    |
| duration             | Int                     | N    | 运行时间，分钟                                                      |

##### 5.1.12.6. 接口输入样例

**启动（Start）**
```json
{
  "vin": "L6T79T2E2MP003011",
  "serviceId": "RES",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {
        "key": "engStrtType",
        "value": "3"
      }
    ],
    "operationScheduling": {
      "duration": "20"
    }
  }
}
```

**停止（Stop）**
```json
{
  "vin": "L6T79T2E2MP003011",
  "serviceId": "RES",
  "command": "stop",
  "setting": {
    "serviceParameters": [
      {
        "key": "engStrtType",
        "value": "3"
      }
    ]
  }
}
```

##### 5.1.12.7. 接口返回

| 参数名     | 类型   | 必填 | 说明     |
|------------|--------|------|----------|
| sessionid  | String | Y    | 会话ID   |

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
