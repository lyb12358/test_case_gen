#### 5.1.17. 远程冷暖箱控制

##### 5.1.17.1 接口功能说明  
本接口提供使用户通过 TSP 将应用程序中的命令发送到车辆上，以便开闭冷暖箱。

##### 5.1.17.2 接口使用说明  
用户手持终端调用。

##### 5.1.17.3 接口设计说明  
与远程控制冰箱相同。

##### 5.1.17.4 接口协议与地址  
`POST /v1.0/remoteControl/control`

##### 5.1.17.5 接口参数  

主参数：

| 参数名       | 类型   | 必填 | 说明                     |
|--------------|--------|------|--------------------------|
| vin          | String | 否   | 运维平台下发时必填       |
| serviceId    | String | 是   | ZAJ                      |
| command      | String | 是   | 操作类型: start / stop   |
| setting      | T      | 是   | 其它参数                 |

`setting` 对象中的参数（类型 T）：

| 参数名             | 类型                | 必填 | 说明                             |
|--------------------|---------------------|------|----------------------------------|
| serviceParameters  | List<ServiceParameter> | 否   | 相关指令具体参数，每个 ServiceParameter 由一个 key 和一个 value 组成 |
| temp               | String              | 是   | 目标温度                         |
| duration           | int                 | 否   | 运行时长，单位分钟               |
| zaj.ts             | bool                | 否   | 恒温开关 true 或 false           |

##### 5.1.17.6 接口输入样例  

**启动命令示例：**

```json
{
  "vin": "L6T79T2E2MP003011",
  "serviceId": "ZAJ",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {
        "key": "temp",
        "value": "3"
      },
      {
        "key": "duration",
        "value": "3"
      },
      {
        "key": "zaj.ts",
        "value": "true"
      }
    ]
  }
}
```

**停止命令示例：**

```json
{
  "vin": "L6T79T2E2MP003011",
  "serviceId": "ZAJ",
  "command": "stop"
}
```
