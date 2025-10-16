#### 5.1.22 vivo手表远控

##### 5.1.22.1 接口使用说明
用于vivo手表远控，成功后需要调用特殊接口推送app消息。

##### 5.1.22.2 接口设计说明
Config配置

##### 5.1.22.3 接口协议与地址
`POST`  
`ms-remote-control/inner/v1.0/remoteControl/control`

##### 5.1.22.4 接口参数

| 参数名                                              | 类型   | 必填 | 说明                   |
|---------------------------------------------------|--------|------|------------------------|
| serviceId                                         | String | Y    |                        |
| command                                           | String | Y    |                        |
| vin                                               | String | Y    | 车辆vin                |
| dataSource                                        | String | Y    | 数据来源：VIVO_WATCH   |
| RequestBody.serviceData.serviceParameters.<Key,Value> |        |      |                        |