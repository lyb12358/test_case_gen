#### 5.1.4. 开关管理

##### 5.1.4.1 接口功能说明
本接口提供使用户通过 TSP 将应用程序中的命令发送到车辆上，这样开关就能在车内生效。  
该功能用于将开关设置到车内，并将开关状态同步到 TSP。用户可以通过 IHU 设置开关的开关状态，IHU 将该状态通知 TEM，TEM 接收该信息然后上报开关状态给 TSP。

##### 5.1.4.2 接口使用说明
用户手持终端调用

##### 5.1.4.3 接口设计说明

##### 5.1.4.4 接口协议与地址
```
POST /v1.0/remoteControl/control
```

##### 5.1.4.5 接口参数

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| vin | String | Y | 车辆唯一标识 |
| serviceId | String | Y | 服务 ID (RSM=212) |
| command | String | Y | 指令类型：开: start  关: stop |
| setting | T | N | 其它参数 |

**setting 内部参数：**

| 参数名 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| serviceParameters | List<ServiceParameter> | N | 相关指令具体参数，一个 ServiceParameter 由一个 key 和一个 value 组成 |
| rsm | String | N | 1: 温度过热保护/恒温座舱开关 (app可以控制)<br>2: 活体检测(生命探测)开关 (APP不可以控制)<br>3: PANIC(远程一键报警开关) (APP可以控制)<br>4: 泊车舒适模式开关 (APP可以控制)<br>5: 代客模式开关 (APP可以控制)<br>6: 哨兵模式开关 (APP可以控制)<br>7: 漂移模式开关 (app接口文档有定义，集成文档未定义) (APP不可以控制)<br>8: 露营模式功能开关 (APP可以控制)<br>10: 洗车模式<br>11: GPS 开关<br>51: 车内实时视频聊天总开关<br>52: PNC 开关<br>53: 维修模式<br>54: 无痕模式<br>55: 宠物模式<br>56: VPD 状态<br>20: 电池保养<br>60: 智慧寻车 |
| password | String | N | 可选，当 rsm = 5 且是 startService 时必填 |

**其他字段说明：**

- `RequestBody.serviceData.vehicleStatus.climateStatus`  
  - 当 IHU 上操作：  
    - 1 座舱加热开关 → `copActive` 必填  
    - 2 生命探测开关 → `ldacStatus` 必填  
    - 4 驻车舒适开关 → `parkingComfortStatus` 必填  

- `RequestBody.serviceData.vehicleStatus.additionalStatus`  
  - `vstdModeStatus`：IHU 上设置哨兵开关 or 因电量过低退出导致开关变更  
  - `campingModeActive`：露营模式开关状态  
  - `washCarModeActive`：洗车模式开关  
  - `chatVideoMainActive`：车内实时视频聊天总开关  
  - `pncStatus`：即插即充开关状态  
  - `repairModeActive`：维修模式状态  
  - `tracelessModeActive`：无痕模式状态  

- `RequestBody.serviceData.vehicleStatus.basicVehicleStatus.position`  
  - `carLocatorStatUploadEn`：当 rsm = 11（GPS 开关状态）时必填  

- `RequestBody.serviceData.vehicleStatus.additionalStatus.signals`  
  - `<the switch status>`：上报车辆开关信号（可选）：相应功能的开关状态

##### 5.1.4.6 接口输入样例

1. **恒温座舱开关控制**

开启：
```json
{
  "vin": "LB377F2ZXJL552137",
  "serviceId": "RSM",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {
        "key": "rsm",
        "value": "1"
      }
    ]
  }
}
```

关闭：
```json
{
  "vin": "LB377F2ZXJL552137",
  "serviceId": "RSM",
  "command": "stop",
  "setting": {
    "serviceParameters": [
      {
        "key": "rsm",
        "value": "1"
      }
    ]
  }
}
```

2. **代客模式开关控制**

开启：
```json
{
  "vin": "LB377F2ZXJL552137",
  "serviceId": "RSM",
  "command": "start",
  "setting": {
    "serviceParameters": [
      {
        "key": "rsm",
        "value": "5"
      },
      {
        "key": "password",
        "value": "123456"
      }
    ]
  }
}
```

关闭：
```json
{
  "vin": "LB377F2ZXJL552137",
  "serviceId": "RSM",
  "command": "stop",
  "setting": {
    "serviceParameters": [
      {
        "key": "rsm",
        "value": "5"
      },
      {
        "key": "password",
        "value": "123456"
      }
    ]
  }
}
```
