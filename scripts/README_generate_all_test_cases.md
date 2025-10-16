# 批量生成所有业务测试用例脚本

## 概述

`generate_all_test_cases.py` 是一个健壮的脚本，用于批量生成所有TSP业务类型的测试用例。该脚本具备完整的错误处理、重试机制、进度跟踪和报告生成功能。

## 功能特性

- ✅ **自动知识图谱初始化** - 自动初始化知识图谱数据
- ✅ **数据清理** - 自动清理旧的测试用例数据
- ✅ **全业务类型支持** - 支持所有32个业务类型
- ✅ **错误重试机制** - 失败自动重试，可配置重试次数
- ✅ **进度跟踪** - 实时显示执行进度和状态
- ✅ **断点续传** - 支持从中断点继续执行
- ✅ **详细报告** - 生成控制台和JSON格式的执行报告
- ✅ **超时控制** - 可配置单个业务类型超时时间
- ✅ **灵活过滤** - 支持指定特定业务类型或排除某些类型

## 前置条件

1. **启动API服务器**
   ```bash
   cd d:/project/tsp-testcase-script
   .venv/Scripts/python.exe -m src.api.endpoints
   ```
   服务器将运行在 `http://127.0.0.1:8001`

2. **安装依赖**
   ```bash
   pip install requests
   ```

## 使用方法

### 基本用法

```bash
# 生成所有业务类型的测试用例
python scripts/generate_all_test_cases.py

# 预览模式 - 查看将要执行的操作
python scripts/generate_all_test_cases.py --dry-run

# 生成特定业务类型
python scripts/generate_all_test_cases.py --business-types RCC,RFD,ZAB

# 排除特定业务类型
python scripts/generate_all_test_cases.py --exclude WEIXIU_RSM,VIVO_WATCH
```

### 高级用法

```bash
# 从上次中断点继续执行
python scripts/generate_all_test_cases.py --resume

# 自定义重试次数和超时时间
python scripts/generate_all_test_cases.py --max-retries 5 --timeout 60

# 强制重新生成所有业务类型
python scripts/generate_all_test_cases.py --force

# 自定义日志文件
python scripts/generate_all_test_cases.py --log-file my_generation.log

# 启用详细日志
python scripts/generate_all_test_cases.py --verbose

# 指定不同的服务器地址
python scripts/generate_all_test_cases.py --server-url http://192.168.1.100:8001
```

## 命令行参数

| 参数 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `--force` | flag | False | 强制重新生成所有业务类型 |
| `--dry-run` | flag | False | 预览模式，不实际执行 |
| `--business-types` | string | - | 指定要生成的业务类型，逗号分隔 |
| `--exclude` | string | - | 排除的业务类型，逗号分隔 |
| `--max-retries` | int | 3 | 每个业务类型的最大重试次数 |
| `--timeout` | int | 30 | 单个业务类型超时时间（分钟） |
| `--log-file` | string | 自动生成 | 自定义日志文件路径 |
| `--resume` | flag | False | 从上次执行中断点继续 |
| `--verbose` | flag | False | 启用详细日志输出 |
| `--server-url` | string | http://127.0.0.1:8001 | API服务器地址 |

## 支持的业务类型

脚本支持所有32个TSP业务类型：

**原始业务类型 (4个)**
- RCC (远程净化)
- RFD (香氛控制)
- ZAB (远程恒温座舱设置)
- ZBA (水淹报警)

**新增业务类型 (26个)**
- PAB, PAE, PAI, RCE, RES, RHL, RPP, RSM, RWS
- ZAD, ZAE, ZAF, ZAG, ZAH, ZAJ, ZAM, ZAN, ZAS, ZAV, ZAY, ZBB
- WEIXIU_RSM, VIVO_WATCH

**组合业务类型 (2个)**
- RDL_RDU (车门锁定解锁)
- RDO_RDC (车门/后备箱/引擎盖/加油盖/充电盖 开关)

## 执行流程

1. **初始化阶段**
   - 检查API服务器健康状态
   - 初始化知识图谱数据
   - 清理所有现有测试用例数据

2. **生成阶段**
   - 依次为每个业务类型生成测试用例
   - 实时监控任务进度
   - 自动重试失败的业务类型
   - 更新知识图谱实体和关系

3. **报告阶段**
   - 生成详细的执行报告
   - 保存JSON格式的报告文件
   - 显示成功/失败统计信息

## 输出示例

### 控制台输出
```
[1/32] 处理业务类型: RCC (远程净化)
  🧹 清理旧数据: RCC - 删除 0 个测试用例
  🚀 开始生成: RCC (任务ID: abc123)
  ⏳ 任务进行中: RCC (50%)
  ✅ 任务完成: RCC (生成 15 个用例)

[2/32] 处理业务类型: RFD (香氛控制)
  🚀 开始生成: RFD (任务ID: def456)
  ...
```

### 最终报告
```
================================================================================
📊 测试用例批量生成执行报告
================================================================================

📈 执行概况:
  ✅ 成功: 30 个业务类型
  ❌ 失败: 2 个业务类型
  ⏭️  跳过: 0 个业务类型
  📝 测试用例总数: 450
  ⏱️  总执行时间: 1800.25 秒
```

## 文件输出

脚本会生成以下文件：

1. **日志文件** - `generate_all_test_cases_YYYYMMDD_HHMMSS.log`
2. **详细报告** - `test_cases_generation_report_YYYYMMDD_HHMMSS.json`
3. **状态文件** - `generate_all_test_cases_state.json` (断点续传用)

## 错误处理

- **网络错误** - 自动重试连接
- **API错误** - 根据错误类型进行重试或跳过
- **超时错误** - 可配置超时时间，超时后重试
- **中断处理** - Ctrl+C优雅中断，保存进度状态

## 故障排除

### 常见问题

1. **API服务器不可用**
   ```
   ERROR: API服务器不可用，请确保服务器正在运行
   ```
   解决方案：启动API服务器并确认端口8001可访问

2. **Unicode编码错误**
   ```
   UnicodeEncodeError: 'gbk' codec can't encode character
   ```
   解决方案：设置环境变量 `PYTHONIOENCODING=utf-8`

3. **导入模块失败**
   ```
   ERROR: Module import failed: No module named 'src'
   ```
   解决方案：确保在项目根目录执行脚本

### 日志分析

检查日志文件了解详细错误信息：
```bash
tail -f generate_all_test_cases_*.log
```

## 性能优化建议

1. **并发控制** - 脚本采用顺序执行以确保稳定性
2. **内存管理** - 及时清理API会话和临时数据
3. **重试策略** - 合理设置重试次数和超时时间
4. **网络优化** - 在网络良好的环境中运行

## 技术实现

- **语言**: Python 3.8+
- **依赖**: requests, urllib3
- **架构**: 模块化设计，易于维护和扩展
- **API交互**: RESTful API调用
- **数据持久化**: JSON格式状态文件

## 版本信息

- **版本**: 1.0.0
- **作者**: TSP测试团队
- **更新日期**: 2025-10-16

---

**注意**: 执行前请确保LLM API密钥已正确配置，并有足够的API配额。