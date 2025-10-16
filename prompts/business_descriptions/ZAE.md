#### 5.1.11. 远程车载冰箱设置 Remote Car Fridge

##### 设置

###### 5.1.11.1 接口功能说明

本接口提供使用户通过TSP将应用程序中的命令发送到车辆上，以便远程进行车载冰箱的开启/关闭，温度设置，加热/冷藏等设置，为用户的出行带来便利。

###### 5.1.11.2 接口使用说明

用户手持终端调用

###### 5.1.11.3 接口设计说明

（内容未提供）

###### 5.1.11.4 接口协议与地址

```
POST /v1.0/remoteControl/control
```

###### 5.1.11.5 接口参数

| 参数名        | 类型   | 必填 | 说明                      |
|---------------|--------|------|---------------------------|
| serviceId     | String | Y    | 服务ID (ZAE)              |
| command       | String | Y    | 操作类型：start 或 stop   |
| setting       | T      | N    | 其它参数                  |

**T 类型结构：**

| 参数名            | 类型                    | 必填 | 说明                                       |
|-------------------|-------------------------|------|--------------------------------------------|
| serviceParameters | List<ServiceParameter> | N    | 相关指令具体参数，每个 ServiceParameter 由一个 key 和一个 value 组成 |
| zae.model         | String                 | N    | 0：保温；1：冷藏                           |
| temp              | String                 | N    | 温度                                       |

###### 5.1.11.6 接口输入样例

- **开启保温：**

  ```json
  {
    "serviceId": "ZAE",
    "command": "start",
    "setting": {
      "serviceParameters": [
        {"key": "zae.model", "value": "0"},
        {"key": "temp", "value": "20"}
      ]
    }
  }
  ```

- **关闭保温：**

  ```json
  {
    "serviceId": "ZAE",
    "command": "stop",
    "setting": {
      "serviceParameters": [
        {"key": "zae.model", "value": "0"}
      ]
    }
  }
  ```

- **开启冷藏：**

  ```json
  {
    "serviceId": "ZAE",
    "command": "start",
    "setting": {
      "serviceParameters": [
        {"key": "zae.model", "value": "1"},
        {"key": "temp", "value": "20"}
      ]
    }
  }
  ```

- **关闭冷藏：**

  ```json
  {
    "serviceId": "ZAE",
    "command": "stop",
    "setting": {
      "serviceParameters": [
        {"key": "zae.model", "value": "1"}
      ]
    }
  }
  ```

###### 5.1.11.7 接口返回

| 参数名     | 类型   | 必填 | 说明     |
|------------|--------|------|----------|
| sessionId  | String | Y    | 会话ID   |

**返回示例：**

```json
{
  "respTime": "0",
  "code": "000000",
  "msg": "ok",
  "data": {
    "sessionId": "107-1658712640841"
  }
}
```