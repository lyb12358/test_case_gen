```markdown
#### 5.1.21 维修模式 (3.0)

##### 接口配置

| 配置 | 系统 |
|------|------|
| `rc.message.msgCodesMap[FANXIN_SWITCH_CLOSE]=;RSM_2_0;RSM_1_0@2` | Remote-control |

##### 接口功能说明

用于繁星维修模式。

##### 5.1.19.1 接口使用说明

成功后需要推送 app 消息，并且回调调用方。

##### 5.1.19.2 接口设计说明

（内容未提供）

##### 5.1.19.3 接口协议与地址

```
POST ms-remote-control/inner/v1.0/remoteControl/control
```

##### 5.1.18.5 接口参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| serviceId | String | Y | 服务 ID (RSM) |
| command | String | Y | 操作类型: close 关闭 |
| vin | String | Y | 车辆 vin |
| dataSource | String | Y | 数据来源：inner_fanxin_maintenance |
| RequestBody.serviceData.serviceParameters.<Key,Value> | Key = rsm |  |  |
|  | intVal |  | 53: 维修模式 |
```