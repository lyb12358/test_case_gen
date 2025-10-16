#### 5.1.11. 远程车载冰箱设置（领克 P AE） Remote Car Fridge

##### 5.1.11.1 接口功能说明
本接口车载冰箱能对饮品或食品进行冷却或制热，不能冷冻。从而使乘客享用比较舒适的低温或高温饮品或食品。  
用户可以通过 APP 设置单次、周期或立即三种模式的车载冰箱设置功能，三者为互斥关系。

##### 5.1.11.2 接口使用说明
用户手持终端调用。

##### 5.1.11.3 接口设计说明
```
rc.message.msgCodesMap[ PAE_OPEN ]=;Operation_ZAY_3  
rc.message.msgCodesMap[ PAE_CLOSE ]=;Operation_ZAY_3  
Remote-control
```

##### 5.1.11.4 接口协议与地址
```
POST /v1.0/remoteControl/control
```

##### 5.1.11.5 接口参数

- **通用参数**

| 参数名        | 类型   | 必填 | 说明             |
|---------------|--------|------|------------------|
| serviceId     | String | Y    | 服务 ID (PAE)    |
| command       | String | Y    | 操作类型: start 开 / stop 关 |
| setting       | T      | N    | 其它参数         |

- **pae = 0（立即）**

| 参数名              | 类型                     | 必填 | 说明                                      |
|---------------------|--------------------------|------|-------------------------------------------|
| serviceParameters   | List<ServiceParameter>   | N    | 相关指令具体参数，一个 ServiceParameter 由一个 key 和一个 value 组成 |
| pae                 | String                   | N    | 0: Immediately 立即                       |
| pae.mode            | String                   | N    | 1: 冷藏 / 2: 加热                         |
| pae.temp            | String                   | N    | 车载冰箱温度设置，单位：摄氏度，例如: 10  |

- **pae = 1（临时）或 pae = 2（周期）**

| 参数名                | 类型                     | 必填 | 说明                                      |
|-----------------------|--------------------------|------|-------------------------------------------|
| serviceParameters     | List<ServiceParameter>   | N    | 相关指令具体参数                          |
| pae                   | String                   | N    | 1: temp 临时 / 2: cycle 周期              |
| pae.mode              | String                   | N    | 1: 冷藏 / 2: 加热                         |
| pae.temp              | String                   | N    | 车载冰箱温度设置，单位：摄氏度，例如: 10  |
| pae.timerId           | String                   | N    | 若服务仅有一个 timerDate，timerId 可设为 "1" |
| pae.dayofWeek         | String                   | N    | 星期一至星期日，例如：Mon & Tue → "1,2"；星期日为 7 |
| pae.timerActivation   | String                   | N    | 1: 激活定时器 / 0: 不激活                 |
| pae.startTimeofDay    | String                   | N    | 例如："07:00"                             |

- **pae = 1（临时）额外参数**

| 参数名               | 类型                | 必填 | 说明                      |
|----------------------|---------------------|------|---------------------------|
| operationScheduling  | OperationScheduling | N    | 相关指令具体参数          |
| scheduledTime        | Long                | N    | 预约执行时间戳（毫秒）    |
| duration             | Int                 | N    | 持续时间，单位：秒（例如 10） |

##### 5.1.11.6 接口输入样例

- **立即打开冷藏**
```json
{
  "serviceId": "PAE",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {"key": "pae", "value": "0"},
      {"key": "pae.mode", "value": "1"},
      {"key": "pae.temp", "value": "10"}
    ]
  }
}
```

- **临时预约打开冷藏**
```json
{
  "serviceId": "PAE",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {"key": "pae", "value": "1"},
      {"key": "pae.mode", "value": "1"},
      {"key": "pae.temp", "value": "10"}
    ],
    "operationScheduling": {
      "duration": "60",
      "scheduledTime": "1511243661056"
    }
  }
}
```

- **周期预约打开冷藏**
```json
{
  "serviceId": "PAE",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {"key": "pae", "value": "2"},
      {"key": "pae.mode", "value": "1"},
      {"key": "pae.temp", "value": "10"},
      {"key": "pae.timerId", "value": "1"},
      {"key": "pae.dayofWeek", "value": "1,2,7"},
      {"key": "pae.timerActivation", "value": "1"},
      {"key": "pae.startTimeofDay", "value": "07:30"}
    ]
  }
}
```

##### 5.1.11.7 接口返回

| 参数名     | 类型   | 必填 | 说明     |
|------------|--------|------|----------|
| sessionid  | String | Y    | 会话 ID  |

- **返回示例**
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

##### 5.1.11.8 上行

- **临时指令上行**

| 参数路径                                                  | 字段值 / 说明                                   |
|-----------------------------------------------------------|------------------------------------------------|
| RequestBody.serviceData.serviceResult.operationTrigger    | ihu                                            |
| RequestBody.serviceData.vehicleStatus.additionalStatus    | carRefrigeratorStatus crCurrentTemp            |
| RequestBody.serviceId                                     | pae                                            |
| RequestBody.serviceData.serviceResult.operationSucceeded  | true                                           |
| RequestBody.serviceData.serviceParameters.(key, value)    | Key=pae, intVal=0（immediately）               |
| RequestBody.serviceData.vehicleStatus.additionalStatus.errorReminder | 提醒码（可选）                        |
| RequestBody.serviceData.serviceResult.operationSucceeded  | false（失败时）                                |
| RequestBody.serviceData.serviceResult.error               | 错误码和错误信息                               |

- **预约指令上行**

| 参数路径                                                  | 字段值 / 说明                                   |
|-----------------------------------------------------------|------------------------------------------------|
| RequestBody.serviceData.serviceResult.operationTrigger    | ihu                                            |
| RequestBody.serviceData.vehicleStatus.additionalStatus    | crBookingActive, carRefrigeratorStatus crCurrentTemp（#26 必填） |
| RequestBody.serviceId                                     | pae                                            |
| RequestBody.serviceData.serviceResult.operationSucceeded  | true                                           |
| RequestBody.serviceData.serviceParameters.(key, value)    | Key=pae, intVal=1（temp）或 2（cycle）         |
| RequestBody.serviceData.vehicleStatus.additionalStatus.errorReminder | 提醒码（可选）                        |
| RequestBody.serviceData.serviceResult.operationSucceeded  | false（失败时）                                |
| RequestBody.serviceData.serviceResult.error               | 错误码和错误信息                               |
