# -*- coding: utf-8 -*-
"""
AI生成测试用例专用日志工具
用于记录提示词构建、AI调用和数据处理过程的详细信息
"""

import json
import os
from datetime import datetime
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)


class AILogger:
    """AI生成测试用例专用日志记录器"""

    def __init__(self, task_id: str, business_type: str, project_id: int):
        self.task_id = task_id
        self.business_type = business_type
        self.project_id = project_id
        self.timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.base_path = "output/ai_generation_logs"

        # 创建日志文件路径
        self.session_path = f"{self.base_path}/{self.timestamp}_{task_id}"
        self.prompts_path = f"{self.session_path}/prompts"
        self.responses_path = f"{self.session_path}/responses"
        self.transformation_path = f"{self.session_path}/transformation"

        # 确保目录存在
        os.makedirs(self.prompts_path, exist_ok=True)
        os.makedirs(self.responses_path, exist_ok=True)
        os.makedirs(self.transformation_path, exist_ok=True)

        # 初始化元数据
        self.metadata = {
            "task_id": task_id,
            "business_type": business_type,
            "project_id": project_id,
            "timestamp": self.timestamp,
            "session_start": datetime.now().isoformat(),
            "files_created": []
        }

    def _write_file(self, file_path: str, content: Any, is_json: bool = False) -> None:
        """写入文件"""
        try:
            if is_json:
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(content, f, ensure_ascii=False, indent=2)
            else:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(str(content))

            self.metadata["files_created"].append(file_path)
            logger.info(f"AI日志文件已创建: {file_path}")

        except Exception as e:
            logger.error(f"写入AI日志文件失败: {file_path}, 错误: {e}")

    def log_system_prompt(self, system_prompt: str) -> None:
        """记录系统提示词"""
        file_path = f"{self.prompts_path}/{self.timestamp}_system_prompt.txt"
        self._write_file(file_path, system_prompt)

    def log_user_prompt(self, user_prompt: str) -> None:
        """记录用户提示词"""
        file_path = f"{self.prompts_path}/{self.timestamp}_user_prompt.txt"
        self._write_file(file_path, user_prompt)

    def log_template_variables(self, variables: Dict[str, Any]) -> None:
        """记录模板变量"""
        file_path = f"{self.prompts_path}/{self.timestamp}_template_variables.json"
        self._write_file(file_path, variables, is_json=True)

    def log_prompt_building_process(self, process_data: Dict[str, Any]) -> None:
        """记录提示词构建过程"""
        file_path = f"{self.prompts_path}/{self.timestamp}_prompt_building_process.json"
        self._write_file(file_path, process_data, is_json=True)

    def log_ai_response_raw(self, response: str) -> None:
        """记录AI原始响应"""
        file_path = f"{self.responses_path}/{self.timestamp}_ai_response_raw.txt"
        self._write_file(file_path, response)

    def log_ai_response_extracted(self, extracted_data: Dict[str, Any]) -> None:
        """记录AI响应提取的数据"""
        file_path = f"{self.responses_path}/{self.timestamp}_ai_response_extracted.json"
        self._write_file(file_path, extracted_data, is_json=True)

    def log_ai_response_validated(self, validated_data: Dict[str, Any]) -> None:
        """记录AI响应验证后的数据"""
        file_path = f"{self.responses_path}/{self.timestamp}_ai_response_validated.json"
        self._write_file(file_path, validated_data, is_json=True)

    def log_test_points_to_prompt(self, test_points_data: Dict[str, Any]) -> None:
        """记录测试点到提示词的转换过程"""
        file_path = f"{self.transformation_path}/{self.timestamp}_test_points_to_prompt.json"
        self._write_file(file_path, test_points_data, is_json=True)

    def log_json_extraction_steps(self, extraction_data: Dict[str, Any]) -> None:
        """记录JSON提取步骤"""
        file_path = f"{self.transformation_path}/{self.timestamp}_json_extraction_steps.json"
        self._write_file(file_path, extraction_data, is_json=True)

    def log_data_mapping_comparison(self, mapping_data: Dict[str, Any]) -> None:
        """记录数据映射对比"""
        file_path = f"{self.transformation_path}/{self.timestamp}_data_mapping_comparison.json"
        self._write_file(file_path, mapping_data, is_json=True)

    def log_llm_call_details(self, call_details: Dict[str, Any]) -> None:
        """记录LLM调用详情"""
        file_path = f"{self.responses_path}/{self.timestamp}_llm_call_details.json"
        self._write_file(file_path, call_details, is_json=True)

    def log_business_type_config(self, config_data: Dict[str, Any]) -> None:
        """记录业务类型配置"""
        file_path = f"{self.prompts_path}/{self.timestamp}_business_type_config.json"
        self._write_file(file_path, config_data, is_json=True)

    def log_validation_errors(self, errors: Dict[str, Any]) -> None:
        """记录验证错误"""
        file_path = f"{self.transformation_path}/{self.timestamp}_validation_errors.json"
        self._write_file(file_path, errors, is_json=True)

    def log_resolved_prompts(self, resolved_system_prompt: str, resolved_user_prompt: str) -> None:
        """记录替换后的提示词"""
        system_resolved_path = f"{self.prompts_path}/{self.timestamp}_system_prompt_resolved.txt"
        user_resolved_path = f"{self.prompts_path}/{self.timestamp}_user_prompt_resolved.txt"
        self._write_file(system_resolved_path, resolved_system_prompt)
        self._write_file(user_resolved_path, resolved_user_prompt)

    def log_template_replacement_info(self, original_system: str, resolved_system: str,
                                     original_user: str, resolved_user: str) -> None:
        """记录模板变量替换信息"""
        replacement_info = {
            "system_prompt": {
                "original_length": len(original_system),
                "resolved_length": len(resolved_system),
                "was_modified": len(original_system) != len(resolved_system),
                "has_template_variables": "{{" in original_system and "}}" in original_system
            },
            "user_prompt": {
                "original_length": len(original_user),
                "resolved_length": len(resolved_user),
                "was_modified": len(original_user) != len(resolved_user),
                "has_template_variables": "{{" in original_user and "}}" in original_user
            },
            "replacement_success": True
        }
        replacement_info_path = f"{self.prompts_path}/{self.timestamp}_template_replacement_info.json"
        self._write_file(replacement_info_path, replacement_info, is_json=True)

    def finalize_session(self, success: bool, error_message: Optional[str] = None) -> None:
        """完成日志会话并保存元数据"""
        self.metadata["session_end"] = datetime.now().isoformat()
        self.metadata["success"] = success
        if error_message:
            self.metadata["error_message"] = error_message

        # 保存元数据
        metadata_path = f"{self.session_path}/metadata.json"
        self._write_file(metadata_path, self.metadata, is_json=True)

        logger.info(f"AI日志会话完成: {self.session_path}, 成功: {success}")

    def get_session_path(self) -> str:
        """获取会话路径"""
        return self.session_path


class AILoggerManager:
    """AI日志管理器"""

    @staticmethod
    def create_logger(task_id: str, business_type: str, project_id: int) -> AILogger:
        """创建AI日志记录器"""
        return AILogger(task_id, business_type, project_id)

    @staticmethod
    def cleanup_old_logs(days: int = 30) -> None:
        """清理旧的日志文件"""
        import time
        from pathlib import Path

        base_path = Path("output/ai_generation_logs")
        if not base_path.exists():
            return

        current_time = time.time()
        cutoff_time = current_time - (days * 24 * 60 * 60)

        for session_dir in base_path.iterdir():
            if session_dir.is_dir():
                try:
                    dir_mtime = session_dir.stat().st_mtime
                    if dir_mtime < cutoff_time:
                        import shutil
                        shutil.rmtree(session_dir)
                        logger.info(f"已清理旧日志目录: {session_dir}")
                except Exception as e:
                    logger.error(f"清理日志目录失败: {session_dir}, 错误: {e}")