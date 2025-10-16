#### 5.1.1．闪灯 / 鸣笛

##### 5.1.1.1 接口功能说明
本接口提供使用户用来通过 TSP 将移动应用程序中的命令发送到车辆上，以便快速定位车辆位置。

##### 5.1.1.2 接口使用说明
用户手持终端调用

##### 5.1.1.3 接口设计说明

##### 5.1.1.4 接口协议与地址
`POST /v1.0/remoteControl/control`

##### 5.1.1.5 接口参数

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| vin | String | Y | 车辆唯一标识 |
| serviceId | String | Y | 服务 ID (RHL = 21) |
| setting | T | N | 其它参数 |

其中 `setting` 类型 T 包含以下结构：

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| serviceParameters | List<ServiceParameter> | N | 相关指令具体参数。一个 ServiceParameter 由一个 key 和一个 value 组成 |
| rhl | String | N | 可选值：<br>horn：鸣笛<br>light-flash：闪灯<br>horn-light-flash：闪灯鸣笛 |

##### 5.1.1.6 接口输入样例
```json
{
  "vin": "LB377F2ZXJL552137",
  "serviceId": "RHL",
  "setting": {
    "serviceParameters": [
      {
        "key": "rhl",
        "value": "horn-light-flash"
      }
    ]
  }
}
```

##### 5.1.1.7 接口返回

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
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