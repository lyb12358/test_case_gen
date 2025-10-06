# 原始提示词文件备份

## 说明

此目录包含原始的提示词文件备份，这些文件已被参数化提示词系统替换。

## 备份文件列表

- `requirements_RCC_original.md` - 原始RCC业务提示词文件
- `requirements_RFD_original.md` - 原始RFD业务提示词文件
- `requirements_ZAB_original.md` - 原始ZAB业务提示词文件
- `requirements_ZBA_original.md` - 原始ZBA业务提示词文件

## 备份时间

2025-01-06 - 参数化提示词系统重构时备份

## 为何备份

这些原始文件包含重复的共享内容（系统背景、错误码、Swagger文档等），已通过参数化模板系统重构，提高了维护效率并消除了重复。

## 恢复方法

如果需要恢复原始文件，可以从这些备份文件中复制内容到相应的 `prompts/requirements_*.md` 文件中。