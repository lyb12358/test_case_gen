# MySQL 迁移指南

## 概述

本项目已从 SQLite 迁移到 MySQL 数据库，提供更好的性能和并发支持。

## 环境要求

### MySQL 服务器设置
确保您的系统上已安装并运行 MySQL 服务器。推荐使用 MySQL 8.0 或更高版本。

### 数据库创建
在 MySQL 中创建项目数据库：

```sql
CREATE DATABASE testcase_gen CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 用户权限
确保 MySQL 用户具有足够权限：

```sql
-- 创建用户（如果不存在）
CREATE USER 'tsp'@'localhost' IDENTIFIED BY 'your_password';

-- 授予权限
GRANT ALL PRIVILEGES ON testcase_gen.* TO 'tsp'@'localhost';
FLUSH PRIVILEGES;
```

## 配置设置

### 环境变量配置
在 `.env` 文件中配置 MySQL 连接参数：

```env
# MySQL Database Configuration
USER=tsp
PASSWORD=your_mysql_password
DATABASE=testcase_gen
HOST=127.0.0.1:3306
```

### 依赖安装
安装 MySQL 驱动：

```bash
uv pip install pymysql
```

## 数据迁移（如果需要）

如果您有现有的 SQLite 数据库需要迁移：

### 1. 运行迁移脚本
```bash
python scripts/migrate_to_mysql.py
```

### 2. 验证迁移
脚本会自动验证数据完整性，确保所有记录都已正确迁移。

## 连接测试

### 测试数据库连接
```bash
python -c "
from src.utils.config import Config
from src.database.database import DatabaseManager
config = Config()
db_manager = DatabaseManager(config)
print('MySQL 连接测试成功!')
"
```

### 测试表创建
```bash
python -c "
from src.utils.config import Config
from src.database.database import DatabaseManager
config = Config()
db_manager = DatabaseManager(config)
db_manager.create_tables()
print('数据库表创建成功!')
"
```

## 常见问题

### 连接错误
- **错误**: `Access denied for user`
- **解决**: 检查用户名和密码，确保用户具有访问权限

- **错误**: `Can't connect to MySQL server`
- **解决**: 确保 MySQL 服务正在运行，检查主机和端口配置

### 字符编码问题
- **错误**: 中文数据显示为乱码
- **解决**: 确保数据库使用 `utf8mb4` 字符集

### 性能优化
- MySQL 连接池已在代码中配置，支持高并发访问
- 索引已优化，确保查询性能

## 备份和恢复

### 数据库备份
```bash
mysqldump -u tsp -p testcase_gen > backup.sql
```

### 数据库恢复
```bash
mysql -u tsp -p testcase_gen < backup.sql
```

## 项目结构变化

### 已移除
- SQLite 相关代码和配置
- `data/test_cases.db` 文件（如存在）
- SQLite 特定的连接逻辑

### 已添加
- MySQL 连接配置
- 数据迁移脚本 `scripts/migrate_to_mysql.py`
- PyMySQL 驱动依赖

## 技术规格

- **数据库**: MySQL 8.0+
- **连接器**: PyMySQL 1.1.0
- **ORM**: SQLAlchemy 2.0.43
- **字符集**: utf8mb4
- **连接池**: 10-30 连接

## 性能对比

| 指标 | SQLite | MySQL |
|------|--------|-------|
| 并发写入 | 有限 | 优秀 |
| 连接池 | 无 | 支持 |
| 字符集支持 | 基本 | 完整（包括 emoji） |
| 生产环境 | 不推荐 | 推荐 |
| 数据完整性 | ACID | ACID |

## 支持

如果在迁移过程中遇到问题，请检查：
1. MySQL 服务状态
2. 网络连接配置
3. 用户权限设置
4. 防火墙配置

更多技术支持请参考项目文档或联系开发团队。