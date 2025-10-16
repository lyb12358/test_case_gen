#### 5.1.20 智驾唤醒 acdu (3.0)

##### 接口配置

| 配置 | 系统 |
|------|------|
| `rc.message.msgCodesMap[ZAY_START_CODE_APP]=;Operation_ZAY_3` | Remote-control |


##### 接口功能说明

用于泊车代驾，如远程召唤等场景下唤醒 ADCU、激活代客泊车等。

##### 5.1.19.1 接口使用说明

成功后需要推送 app 消息。

##### 5.1.19.2 接口设计说明

（无具体内容）

##### 5.1.19.3 接口协议与地址

```
POST ms-remote-control/inner/v1.0/remoteControl/control
```

##### 5.1.18.5 接口参数

| 参数名      | 类型   | 必填 | 说明                     |
|-------------|--------|------|--------------------------|
| serviceId   | String | Y    | 服务 ID (ZAY)            |
| command     | String | Y    | 操作类型: start 开启     |
| vin         | String | Y    | 车辆 vin                 |
| userId      | String | N    | 用户 id                  |
| dataSource  | String | Y    | 数据来源：inner_map      |

##### 5.1.18.6 接口输入样例

远程召唤：

```json
{
  "serviceId": "ZAY",
  "command": "start",
  "vin": "Fxxx11xx",
  "dataSource": "inner_map"
}
```

##### 5.1.18.7 接口返回

示例：

```json
{
  "code": "000000",
  "msg": "ok",
  "data": {
    "sessionId": "1658712640841"
  }
}
```