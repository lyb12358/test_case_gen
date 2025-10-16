#### 5.1.24 远程车辆位置查看 (PAI)

##### 5.1.24.1 接口功能说明

因手机 APP 查看车辆位置功能周期性上传车辆位置不符合合规要求，合规意见要求整改后才能过阀点在欧盟卖车。故增加此功能。具体如下：  
当用户在 IHU 上打开位置开关后，可通过该指令最小化获取位置信息，另外只有当业务场景真正需要时，触发式上传车辆位置（即 TCAM 电源状态 `powerMode` 切换到非 normal 下且符合车端附加需求，可通过 MPM 上报最后一次有效位置）。

##### 5.1.24.2 接口使用说明

（内容未提供）

##### 5.1.24.3 接口设计说明

（内容未提供）

##### 5.1.24.4 接口协议与地址

```
POST /v1.0/remoteControl/control
```

##### 5.1.24.5 接口参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| serviceId | String | Y | 服务 ID (PAI) |
| command | String | Y | 操作类型: start |
| setting | T | N | 其它参数 |

**setting 内部结构：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| serviceParameters | List<ServiceParameter> | N | 相关指令具体参数。一个 ServiceParameter 由一个 key 和一个 value 组成 |
| pai | String | N | 1: position |

##### 5.1.24.6 接口输入样例

开启访客模式：

```json
{
  "serviceId": "PAI",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {
        "key": "pai",
        "value": "1"
      }
    ]
  }
}
```

##### 5.1.24.7 接口返回

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| sessionid | String | Y | 会话ID |

**示例：**

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

##### 5.1.24.8 上行

| 编号 | 参数路径 | 字段值 | 说明 |
|------|----------|--------|------|
| #11 | RequestBody.serviceId | pai | |
| | RequestBody.serviceData.serviceResult.operationSucceeded | true | |
| | RequestBody.serviceData.vehicleStatus.basicVehicleStatus | position | |
| #15, 19 | RequestBody.serviceId | pai | |
| | RequestBody.serviceData.serviceResult.operationSucceeded | false | |
| | RequestBody.serviceData.serviceResult.error | `<the error code and message for this failure>` | |
