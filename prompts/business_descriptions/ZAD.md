#### 5.1.10. 远程储物箱私密锁设置（Remote Storage Box）

##### Interior Private Setting

###### 5.1.10.1 接口功能说明

本接口提供使储物箱密码激活和解除（注：非开箱/关箱，仅指储物箱的密码功能），满足用户储存物品需求的同时提供更多的私密空间，保护用户隐私，当用户忘记密码时还可以通过手机APP上进行“忘记密码”进行解锁操作。

###### 5.1.10.2 接口使用说明

用户手持终端调用。

###### 5.1.10.3 接口设计说明

（内容未提供）

###### 5.1.10.4 接口协议与地址

```
POST /v1.0/remoteControl/control
```

###### 5.1.10.5 接口参数

| 参数名      | 类型   | 必填 | 说明 |
|-------------|--------|------|------|
| serviceId   | String | Y    | 服务ID（ZAD） |
| command     | String | Y    | 操作类型：<br>`start`：激活或设置密码<br>`stop`：通过（密码\|验证码）解除密码<br>`requestCode`：获取验证码 |
| setting     | T      | N    | 其它参数 |

**T 类型结构：**

| 参数名             | 类型                     | 必填 | 说明 |
|--------------------|--------------------------|------|------|
| serviceParameters  | List<ServiceParameter>   | N    | 相关指令具体参数。<br>每个 `ServiceParameter` 由一个 `key` 和一个 `value` 组成 |
| zad.model          | String                   | N    | `1`：password<br>`2`：VerificationCode（仅关闭时） |
| code               | String                   | N    | 密码或验证码（4位） |
| boxId              | String                   | N    | 验证码类型时需要填写箱号 |

###### 5.1.10.6 接口输入样例

- **设置或激活密码**

  ```json
  {
    "serviceId": "ZAD",
    "command": "start",
    "setting": {
      "serviceParameters": [
        {"key": "zad.model", "value": "1"},
        {"key": "boxId", "value": "1"},
        {"key": "code", "value": "1234"}
      ]
    }
  }
  ```

- **通过密码解除密码**

  ```json
  {
    "vin": "L6T79T2E2MP003011",
    "serviceId": "ZAD",
    "command": "stop",
    "setting": {
      "serviceParameters": [
        {"key": "zad.model", "value": "1"},
        {"key": "boxId", "value": "1"},
        {"key": "code", "value": "1234"}
      ]
    }
  }
  ```

- **获取验证码**

  ```json
  {
    "serviceId": "ZAD",
    "command": "requestCode",
    "setting": {
      "serviceParameters": [
        {"key": "zad.model", "value": "2"},
        {"key": "boxId", "value": "12222"}
      ]
    }
  }
  ```

- **通过验证码解除密码**

  ```json
  {
    "vin": "L6T79T2E2MP003011",
    "serviceId": "ZAD",
    "command": "stop",
    "setting": {
      "serviceParameters": [
        {"key": "zad.model", "value": "2"},
        {"key": "code", "value": "1234"},
        {"key": "boxId", "value": "1"}
      ]
    }
  }
  ```

###### 5.1.10.7 接口返回

| 参数名     | 类型   | 必填 | 说明     |
|------------|--------|------|----------|
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
