#### 5.1.18 新访客模式(3.0)

##### 接口功能说明
本接口提供 打开访客模式（仅密码设置）和使用密码｜验证码关闭访客模式的功能。

##### 接口使用说明
用户手持终端调用

##### 接口设计说明
无密码关闭复用关闭时消息模板

##### 接口协议与地址
`POST /v1.0/remoteControl/control`

##### 接口参数

| 参数名           | 类型   | 必填 | 说明                                                                 |
|------------------|--------|------|----------------------------------------------------------------------|
| serviceId        | String | Y    | 服务 ID (ZAS)                                                       |
| command          | String | Y    | 操作类型: <br> `start` 开启/设置密码 <br> `stop` 通过(密码\|验证码)关闭 <br> `requestCode`: 获取验证码 <br> `responseData` 验证码设置 <br> `exitService` 无密码关闭访客模式 |
| setting          | T      | N    | 其它参数                                                             |

**setting 内部结构：**

| 参数名             | 类型                  | 必填 | 说明                                      |
|--------------------|-----------------------|------|-------------------------------------------|
| serviceParameters  | List<ServiceParameter>| N    | 相关指令具体参数，一个 ServiceParameter 由一个 key 和一个 value 组成 |
| zas.model          | String                | N    | `1`: password <br> `2`: Verification Code（仅关闭时） |
| code               | String                | N    | 密码或验证码(4位)                         |

##### 接口输入样例

**开启访客模式：**
```json
{
  "serviceId": "ZAS",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {
        "key": "zas.model",
        "value": "1"
      },
      {
        "key": "code",
        "value": "1234"
      }
    ]
  }
}
```

**通过密码关闭访客模式：**
```json
{
  "serviceId": "ZAS",
  "command": "stop",
  "setting": {
    "serviceParameters": [
      {
        "key": "zas.model",
        "value": "1"
      },
      {
        "key": "code",
        "value": "1234"
      }
    ]
  }
}
```

**获取验证码：**
```json
{
  "serviceId": "ZAS",
  "command": "requestCode",
  "setting": {
    "serviceParameters": [
      {
        "key": "zas.model",
        "value": "2"
      }
    ]
  }
}
```

**通过验证码关闭访客模式：**
```json
{
  "serviceId": "ZAS",
  "command": "stop",
  "setting": {
    "serviceParameters": [
      {
        "key": "zas.model",
        "value": "2"
      },
      {
        "key": "code",
        "value": "1234"
      }
    ]
  }
}
```

**通过无密码关闭访客模式：**
```json
{
  "serviceId": "ZAS",
  "command": "exitService"
}
```

##### 接口返回

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
    "sessionId": "1658712640841"
  }
}
```
