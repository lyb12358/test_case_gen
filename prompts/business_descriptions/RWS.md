#### 5.1.2. 打开关闭窗户、天窗、遮阳帘

##### 5.1.2.1 接口功能说明
本接口提供使用户通过 TSP 将应用程序中的命令发送到车辆上，以便远程打开关闭天窗和车窗。

##### 5.1.2.2 接口使用说明
用户手持终端调用

##### 5.1.2.3 接口设计说明

| 配置 | 系统 |
|------|------|
| #v2.4.0 add rc.message.msgCodesMap[ RWS_SUNROOF_VENTILATE_OPEN ]= ; Operation_RWS_1 | Remote-control |

##### 5.1.2.4 接口协议与地址
`POST /v1.0/remoteControl/control`

##### 5.1.2.5 接口参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| vin | String | Y | 车辆唯一标识 |
| serviceId | String | Y | 服务 ID (RWS = 23) |
| command | String | N | 指令类型：开: start；关: stop |
| setting | T | N | 其它参数 |

其中 `setting` 类型 T 的结构如下：

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| serviceParameters | List<ServiceParameter> | N | 相关指令具体参数，一个 ServiceParameter 由一个 key 和一个 value 组成 |
| target | String | N | window: 车窗；sunroof: 天窗；sunshade: 遮阳帘；ventilate: 通风（一键透气、微开，这个只针对车窗）；sunroofVentilate: 天窗微开<br>注意: 车窗目前 tcam 只支持全控，无法控制具体位置的车窗 |
| pos | String | N | 可选（有位置开度要求才填）开启百分比设置，不填写表示完全打开。（ap 端无需下发，预置在 tcam 端，开合度为 8） |

##### 5.1.2.6 接口输入样例

车窗开启：
```json
{
  "vin": "L6T79T2E2MP003011",
  "serviceId": "RWS",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {
        "key": "target",
        "value": "window"
      }
    ]
  }
}
```

天窗微开：
```json
{
  "vin": "L6T79T2E2MP003011",
  "serviceId": "RWS",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {
        "key": "target",
        "value": "sunroofVentilate"
      }
    ]
  }
}
```

##### 5.1.2.7 接口返回

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| sessionid | String | Y | 会话ID |

示例：
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