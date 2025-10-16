#### 5.1.12. 打开关闭车门 / 后备箱 / 引擎盖 / 油箱盖 / 充电盖

##### 5.1.12.1 接口功能说明
本接口提供使用户通过 TSP 将应用程序中的命令发送到车辆上，以便远程打开关闭车门、后备箱、引擎盖、油箱盖和充电盖。

##### 5.1.12.2 接口使用说明
用户手持终端调用

##### 5.1.12.3 接口设计说明
与闪灯、鸣笛相同

##### 5.1.12.4 接口协议与地址
```
POST /v1.0/remoteControl/control
```

##### 5.1.12.5 接口参数

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| serviceId | String | Y | 服务 ID：RDO: 开启; RDC: 关闭 |
| command | String | Y | 操作类型: start 或 stop |
| setting | T | Y | 其它参数 |

**setting 内部结构：**

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| serviceParameters | List<ServiceParameter> | N | 相关指令具体参数，一个 ServiceParameter 由一个 key 和一个 value 组成 |
| door | String | N | front-left: 主驾侧门; front-right: 副驾侧门; middle-left: 左中门; (集成文档中未找到对应的值) middle-right: 右中门; (集成文档中未找到对应的值) back-left: 左后门; back-right: 右后门; all: 所有门。多选使用多个 key 下发 |
| target | String | N | trunk: 后备箱; hood: 引擎盖; tank-flag: 加油口盖; front-charge-lid: 前充电口盖(DC或AC/DC); back-charge-lid: 后充电口盖(AC); 注：充电盖需要此命令来控制开启关闭。多选使用多个 key 下发 |

##### 5.1.12.6 接口输入样例
```json
{
  "vin": "L6T79T2E2MP003011",
  "serviceId": "RDO",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {
        "key": "target",
        "value": "front-charge-lid"
      }
    ]
  }
}
```

##### 5.1.12.7 接口返回

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| sessionid | String | Y | 会话ID |

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
