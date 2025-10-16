#### 5.1.23 百灵鸟远程灯光秀控制 (PAB)

##### 5.1.23.1 接口功能说明

远程音乐灯光秀可以为用户在手机上提供：下载灯光秀、删除灯光秀、开启灯光秀、关闭灯光秀等功能。云端将收到 App 下发的指令给 TCAM，并将从 TCAM 接收到的执行结果反馈给 App。

**功能开启 / 关闭逻辑：**  
音乐灯光秀控制包含下载（下载 / 删除）和执行（开启 / 关闭）两种类型指令，两种类型指令独立控制。用户只有先下载成功，才允许下发执行类指令。

##### 5.1.23.2 接口使用说明

**注意事项：**  
- 灯光秀执行器只支持存储一首音乐文件，音乐切换播放，需要等待车辆音乐文件准备完毕后才可播放。  
- 当 TEM 不能执行以上操作时，需要上报错误码和错误原因。发生错误的原因不仅限于以下几种：
  - 电池电量低 / 发动机油量低  
  - 没有任何响应消息  
  - 车端控制器执行异常或故障  
  - 车辆车况状态不满足  
  - 车窗开启异常  
  - 音乐灯光文件异常  

##### 5.1.23.3 接口设计说明

**接口配置**

| 配置 | 系统 |
|------|------|
| `rc.message.msgCodesMap[PAB_DOWNLOAD]` | `PAB_1_21` |
| `rc.message.msgCodesMap[PAB_OPEN]` | `PAB_1_1` |
| `rc.message.msgCodesMap[PAB_CLOSE]` | `PAB_1_0` |
| `rc.message.msgCodesMap[PAB_DELETE]` | `PAB_1_9` |
| `rc.message.msgCodesMap[PAI_EXECUTION]` | `PAI_2_4_1; PAI_1_4_1` |
| `rc.message.msgCodesMap[PAE_OPEN]` | `PAE_1_1_0` |
| `rc.message.msgCodesMap[PAE_CLOSE]` | `PAE_1_0_0` |
| `rc.message.msgCodesMap[PAE_BOOK_OPEN]` | `PAE_1_1_10` |
| `rc.message.msgCodesMap[PAE_BOOK_CLOSE]` | `PAE_1_0_10` |
| `rc.message.msgCodesMap[PAE_DHU_BOOK_START]` | `PAE_STATUS_TITLE_1` |
| `rc.message.msgCodesMap[PAE_DHU_BOOK_CLOSE]` | `PAE_STATUS_TITLE_2` |
| `rc.message.msgCodesMap[PAE_DHU_REMIND_CODE]` | `PAE_STATUS_TITLE_3` |

| 配置 | Remote-control |
|------|----------------|

##### 5.1.23.4 接口协议与地址

```
POST /v1.0/remoteControl/control
```

##### 5.1.23.5 接口参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| serviceId | String | Y | 服务 ID (PAB) |
| command | String | Y | 操作类型: `download`: 下载灯光秀<br>`start`: 开始播放<br>`stop`: 停止播放<br>`delete`: 删除灯光秀 |
| setting | Object | N | 其它参数 |

**setting 内部结构：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| serviceParameters | List<ServiceParameter> | N | 相关指令具体参数，一个 ServiceParameter 由一个 key 和一个 value 组成 |
| pab.eid | String | N | 1-20 |

##### 5.1.23.6 接口输入样例

**开始播放：**

```json
{
  "serviceId": "PAB",
  "command": "startService",
  "setting": {
    "serviceParameters": [
      {
        "key": "pad.eid",
        "value": "1"
      }
    ]
  }
}
```

##### 5.1.23.7 接口返回

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| sessionid | String | Y | 会话ID |

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

##### 5.1.23.8 上行

| 序号 | 参数路径 | 字段值 | 说明 |
|------|----------|--------|------|
| #13 | `RequestBody.serviceId` | `pab` | |
| | `RequestBody.serviceData.serviceResult.operationSucceeded` | `true` | |
| | `RequestBody.serviceData.vehicleStatus.basicVehicleStatus` | （空） | Optional |
| | `RequestBody.serviceData.vehicleStatus.additionalStatus` | `elsStatus` | 当下发播放与停止时，返回必填 |
| #16 | `RequestBody.serviceId` | `pab` | |
| | `RequestBody.serviceData.serviceResult.operationSucceeded` | `true` | |
| | `RequestBody.serviceData.vehicleStatus.additionalStatus` | `elsStatus` | 当下发播放到点停止之间，返回必填 |
| | `RequestBody.serviceId` | `pab` | |
| | `RequestBody.serviceData.serviceResult.operationSucceeded` | `false` | |
| | `RequestBody.serviceData.serviceResult.error` | `<the error code and message for this failure>` | |