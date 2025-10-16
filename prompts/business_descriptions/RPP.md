#### 5.1.6. 查询PM2.5、温度、氧气浓度

##### 5.1.6.1 接口功能说明

本接口提供使用户通过TSP将应用程序中的命令发送到车辆上，以便从传感器中获取新的pm2.5值和温度。

##### 5.1.6.2 接口使用说明

用户手持终端调用

##### 5.1.6.3 接口设计说明

（内容未提供）

##### 5.1.6.4 接口协议与地址

`POST /v1.0/remoteControl/control`

##### 5.1.6.5 接口参数

| 参数名        | 类型   | 必填 | 说明                         |
|---------------|--------|------|------------------------------|
| serviceId     | String | Y    | 服务ID (RPP)                 |
| command       | String | N    | 指令类型                     |
| setting       | T      | N    | 其它参数                     |

**T 类型定义：**

| 参数名             | 类型                    | 必填 | 说明                                                                 |
|--------------------|-------------------------|------|----------------------------------------------------------------------|
| serviceParameters  | List<ServiceParameter> | N    | 相关指令具体参数。一个 ServiceParameter 由一个 key 和一个 value 组成 |

**serviceParameters 中 key 为 `rpp` 时的 value 可选值：**

- `pm`：查询 PM2.5  
- `temp`：温度  
- `pm-temp`：PM2.5 和温度  
- `oxygen`：氧气浓度  
- `pm-temp-oxygen`：PM2.5、温度、氧气浓度  

##### 5.1.6.6 接口输入样例

```json
{
  "serviceId": "RPP",
  "command": "",
  "setting": {
    "serviceParameters": [
      {
        "key": "rpp",
        "value": "pm"
      }
    ]
  }
}
```

开启查询氧气浓度：

```json
{
  "serviceId": "RPP",
  "command": "",
  "setting": {
    "serviceParameters": [
      {
        "key": "rpp",
        "value": "oxygen"
      }
    ]
  }
}
```

> 注：原文中的 JSON 样例存在语法错误，以上为修正后的标准格式。

##### 5.1.6.7 接口返回

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