#### 5.1.15. 新空调/环境调节 Remote climate control

##### 5.1.15.1 接口功能说明

本接口提供使用户通过 TSP 将应用程序中的命令发送到车辆上，以便远程控制空调、方向盘、座椅。

##### 5.1.15.2 接口使用说明

用户手持终端调用。

##### 5.1.15.3 接口设计说明

（内容未提供）

##### 5.1.15.4 接口协议与地址

```
POST /v1.0/remoteControl/control
```

##### 5.1.15.5 接口参数

| 参数名      | 类型   | 必填 | 说明                      |
|-------------|--------|------|---------------------------|
| serviceId   | String | Y    | 服务ID (ZAF)              |
| setting     | T      | N    | 其它参数                  |

`setting` 中包含 `serviceParameters`，其结构如下：

| 参数名（key）         | 类型            | 必填 | 说明 |
|----------------------|-----------------|------|------|
| serviceParameters    | List<ServiceParameter> | N | 相关指令具体参数，一个 ServiceParameter 由一个 key 和一个 value 组成 |

**空调控制**

| 参数名（key）     | 类型   | 必填 | 说明 |
|------------------|--------|------|------|
| AC               | bool   | N    | `true`：开，`false`：关 |
| AC.temp          | String | N    | 温度范围 1–100，精度 0.5°C；`AC=true` 时必填 |
| AC.duration      | int    | N    | 持续时间 1–255 分钟，精度 1 分钟；`AC=true` 时必填 |

**方向盘加热**

| 参数名（key）     | 类型   | 必填 | 说明 |
|------------------|--------|------|------|
| SW               | bool   | N    | `true`：开，`false`：关 |
| SW.level         | int    | N    | 加热等级 1–10，精度 1 级；`SW=true` 时必填 |
| SW.duration      | int    | N    | 持续时间 1–255 分钟；`SW=true` 时必填 |

**座椅加热**

| 参数名（key）     | 类型   | 必填 | 说明 |
|------------------|--------|------|------|
| SH.{*}           | bool   | N    | `true`：开，`false`：关<br>`{*}` 取值示例：<br>`SH.11`：驾驶位座椅<br>`SH.19`：乘客位座椅<br>`SH.21`：第二排左侧座椅<br>`SH.29`：第二排右侧座椅<br>`SH.31`：第三排左侧座椅<br>`SH.39`：第三排右侧座椅 |
| SH.{*}.level     | int    | N    | 加热等级 1–10，精度 1 级；`SH.{*}=true` 时必填 |
| SH.{*}.duration  | int    | N    | 持续时间 1–255 分钟；`SH.{*}=true` 时必填 |

**座椅通风**

| 参数名（key）     | 类型   | 必填 | 说明 |
|------------------|--------|------|------|
| SV.{*}           | bool   | N    | `true`：开，`false`：关<br>`{*}` 取值示例：<br>`SV.11`：驾驶位座椅<br>`SV.19`：乘客位座椅<br>`SV.21`：第二排左侧座椅<br>`SV.29`：第二排右侧座椅 |
| SV.{*}.level     | int    | N    | 通风等级 1–10，精度 1 级；`SV.{*}=true` 时必填 |
| SV.{*}.duration  | int    | N    | 持续时间 1–255 分钟；`SV.{*}=true` 时必填 |

**除霜**

| 参数名（key）     | 类型   | 必填 | 说明 |
|------------------|--------|------|------|
| DF               | bool   | N    | `true`：开，`false`：关 |
| DF.level         | int    | N    | 等级 1–10，精度 1 级；`DF=true` 时必填 |
| DF.duration      | int    | N    | 持续时间 1–255 分钟（预留）；`DF=true` 时必填 |

**座舱通风**

| 参数名（key）     | 类型   | 必填 | 说明 |
|------------------|--------|------|------|
| CV               | bool   | N    | `true`：开，`false`：关 |
| CV.level         | int    | N    | 等级 1–10，精度 1 级；`CV=true` 时必填 |
| CV.duration      | int    | N    | 持续时间 1–255 分钟；`CV=true` 时必填 |

**急速制冷**

| 参数名（key）     | 类型   | 必填 | 说明 |
|------------------|--------|------|------|
| RC               | bool   | N    | `true`：开，`false`：关 |
| RC.duration      | int    | N    | 持续时间 1–255 分钟；ZEEA3.0 且 `RC=true` 时必填 |

**急速制热**

| 参数名（key）     | 类型   | 必填 | 说明 |
|------------------|--------|------|------|
| RW               | bool   | N    | `true`：开，`false`：关 |
| RW.duration      | int    | N    | 持续时间 1–255 分钟；ZEEA3.0 且 `RW=true` 时必填 |

**高温杀菌**

| 参数名（key）     | 类型   | 必填 | 说明 |
|------------------|--------|------|------|
| HTS              | bool   | N    | `true`：开，`false`：关 |
| HTS.duration     | int    | N    | 持续时间 1–255 分钟；ZEEA3.0 且 `HTS=true` 时必填 |

##### 接口输入样例

1. **开启/关闭空调：**

```json
{
  "serviceId": "ZAF",
  "setting": {
    "serviceParameters": [
      { "key": "AC", "value": true },
      { "key": "AC.temp", "value": "16.5" },
      { "key": "AC.duration", "value": 1 }
    ]
  }
}
```

2. **座椅通风：**

```json
{
  "serviceId": "ZAF",
  "setting": {
    "serviceParameters": [
      { "key": "SV.11", "value": true },
      { "key": "SV.11.level", "value": 1 },
      { "key": "SV.11.duration", "value": 2 }
    ]
  }
}
```

3. **高温杀菌：**

```json
{
  "serviceId": "ZAF",
  "setting": {
    "serviceParameters": [
      { "key": "HTS", "value": true },
      { "key": "HTS.duration", "value": 25 }
    ]
  }
}
```

##### 5.1.15.7 接口返回

| 参数名     | 类型   | 必填 | 说明     |
|------------|--------|------|----------|
| sessionId  | String | Y    | 会话 ID  |

**返回示例：**

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