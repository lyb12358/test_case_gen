#### 5.1.5. 香氛控制

##### 5.1.5.1 接口功能说明
本接口提供使用户通过 TSP 将应用程序中的命令发送到车辆上，以便远程释放香味。

##### 5.1.5.2. 接口使用说明
用户手持终端调用。

##### 5.1.5.4. 接口协议与地址
`POST /v1.0/remoteControl/control`

##### 5.1.5.5. 接口参数

**主参数**

| 参数名    | 类型   | 必填 | 说明               |
| --------- | ------ | ---- | ------------------ |
| vin       | String | Y    | 车辆唯一标识       |
| serviceId | String | Y    | 服务 ID (RFD)      |
| setting   | Object | Y    | 其它参数           |

**`setting` 对象内的 `serviceParameters` 参数 (List<ServiceParameter>)**

每个 `ServiceParameter` 由一个 `key` 和一个 `value` 组成。

| 参数名 (key)   | 类型   | 必填 | 说明                                       |
| -------------- | ------ | ---- | ------------------------------------------ |
| channel_id     | String | Y    | 香氛通道 (取香氛列表里面的 id 字段) <br> 0=default(off) <br> 1=channel_1 <br> 2=channel_2 <br> 3=channel_3 |
| level          | String | Y    | 香氛等级 <br> 0 = off <br> 1 = level1 <br> 2 = level2 <br> 3 = level3 |
| code           | String | N    | 香氛味道 (0~255)                           |

##### 5.1.5.6. 接口输入样例

**开启香氛**

```json
{
  "vin": "L6T79T2E6MP002042",
  "serviceId": "RFD",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {
        "key": "channel_id",
        "value": "1"
      },
      {
        "key": "level",
        "value": "1"
      },
      {
        "key": "code",
        "value": "2"
      }
    ]
  }
}
```

**关闭香氛**

```json
{
  "vin": "L6T79T2E6MP002042",
  "serviceId": "RFD",
  "command": "stop",
  "setting": {
    "serviceParameters": [
      {
        "key": "channel_id",
        "value": "0"
      },
      {
        "key": "level",
        "value": "0"
      }
    ]
  }
}
```

##### 5.1.5.7. 接口返回

**返回参数**

| 参数名    | 类型   | 必填 | 说明     |
| --------- | ------ | ---- | -------- |
| sessionid | String | Y    | 会话 ID  |

**返回示例:**

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