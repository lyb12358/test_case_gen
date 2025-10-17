#!/usr/bin/env python3
"""
Generate All Test Cases Script

This script generates test cases for all business types in the TSP system.
It performs the following operations:
1. Initialize knowledge graph
2. Clean all test case related data
3. Sequentially generate test cases for all business types
4. Provide detailed execution reports with error handling and retry mechanisms

Usage:
    python generate_all_test_cases.py [options]

Options:
    --force                    Force regeneration of all business types
    --dry-run                  Show what would be executed without actually running
    --business-types TEXT      Comma-separated list of business types to generate
    --exclude TEXT             Comma-separated list of business types to exclude
    --max-retries INTEGER      Maximum retry attempts per business type (default: 3)
    --timeout INTEGER          Timeout per business type in minutes (default: 30)
    --log-file TEXT            Custom log file path
    --resume                   Resume from previous execution if possible
    --help                     Show this help message
"""

import sys
import os
import argparse
import json
import time
import signal
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple, Set
from dataclasses import dataclass, asdict
from pathlib import Path

# Add the project root to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
src_path = os.path.join(project_root, 'src')
sys.path.insert(0, src_path)

try:
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry
    # Ensure src is in path and import business types
    sys.path.insert(0, src_path)
    from config.business_types import BUSINESS_TYPE_NAMES, get_business_type_mapping
except ImportError as e:
    print(f"ERROR: Module import failed: {e}")
    print(f"Project root: {project_root}")
    print(f"Source path: {src_path}")
    print(f"Python path: {sys.path[:3]}")
    print(f"Please install required packages: pip install requests")
    sys.exit(1)


@dataclass
class ExecutionResult:
    """Execution result for a single business type."""
    business_type: str
    status: str  # 'success', 'failed', 'skipped'
    test_cases_count: int = 0
    error_message: str = ""
    retry_count: int = 0
    execution_time: float = 0.0
    task_id: str = ""


@dataclass
class ExecutionState:
    """Persistent execution state for resume functionality."""
    start_time: str
    completed_business_types: List[str]
    failed_business_types: List[str]
    current_business_type: Optional[str]
    total_count: int
    completed_count: int
    failed_count: int


class APIClient:
    """API client for interacting with the FastAPI server."""

    def __init__(self, base_url: str = "http://127.0.0.1:8000", timeout: int = 1800):
        """
        Initialize API client.

        Args:
            base_url: Base URL of the API server
            timeout: Request timeout in seconds (default: 30 minutes)
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session = self._create_session()

    def _create_session(self) -> requests.Session:
        """Create a configured HTTP session with retry strategy."""
        session = requests.Session()

        # Configure retry strategy
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)

        return session

    def _make_request(self, method: str, endpoint: str, **kwargs) -> Optional[requests.Response]:
        """Make HTTP request with error handling."""
        url = f"{self.base_url}{endpoint}"

        try:
            response = self.session.request(method, url, timeout=self.timeout, **kwargs)
            response.raise_for_status()
            return response
        except requests.exceptions.RequestException as e:
            logging.error(f"API request failed: {e}")
            return None

    def check_health(self) -> bool:
        """Check if API server is healthy."""
        response = self._make_request("GET", "/")
        return response is not None and response.status_code == 200

    def initialize_knowledge_graph(self) -> bool:
        """Initialize knowledge graph."""
        response = self._make_request("POST", "/knowledge-graph/initialize")
        if response:
            data = response.json()
            logging.info(f"Knowledge graph initialized: {data.get('message', 'Success')}")
            return True
        return False

    def clear_knowledge_graph(self) -> bool:
        """Clear knowledge graph data."""
        response = self._make_request("DELETE", "/knowledge-graph/clear")
        if response:
            data = response.json()
            logging.info(f"Knowledge graph cleared: {data.get('message', 'Success')}")
            return True
        return False

    def clear_test_cases(self, business_type: str) -> Dict[str, int]:
        """Clear test cases for a specific business type."""
        response = self._make_request("DELETE", f"/test-cases/{business_type}")
        if response:
            data = response.json()
            return {
                "deleted_groups_count": data.get("deleted_groups_count", 0),
                "deleted_items_count": data.get("deleted_items_count", 0),
                "deleted_knowledge_entities_count": data.get("deleted_knowledge_entities_count", 0),
                "deleted_knowledge_relations_count": data.get("deleted_knowledge_relations_count", 0)
            }
        return {}

    def generate_test_cases(self, business_type: str) -> Optional[str]:
        """Generate test cases for a business type."""
        payload = {"business_type": business_type}
        response = self._make_request("POST", "/generate-test-cases", json=payload)
        if response:
            data = response.json()
            return data.get("task_id")
        return None

    def get_task_status(self, task_id: str) -> Optional[Dict]:
        """Get task status."""
        response = self._make_request("GET", f"/status/{task_id}")
        if response:
            return response.json()
        return None

    def get_business_types_mapping(self) -> Dict[str, Dict[str, str]]:
        """Get business types mapping."""
        response = self._make_request("GET", "/business-types/mapping")
        if response:
            return response.json().get("business_types", {})
        return {}


class ProgressTracker:
    """Track execution progress and handle persistent state."""

    def __init__(self, state_file: str = "generate_all_test_cases_state.json"):
        """
        Initialize progress tracker.

        Args:
            state_file: Path to state file for persistence
        """
        self.state_file = state_file
        self.state: Optional[ExecutionState] = None

    def initialize(self, business_types: List[str]):
        """Initialize tracking for new execution."""
        self.state = ExecutionState(
            start_time=datetime.now().isoformat(),
            completed_business_types=[],
            failed_business_types=[],
            current_business_type=None,
            total_count=len(business_types),
            completed_count=0,
            failed_count=0
        )
        self._save_state()

    def load_state(self) -> bool:
        """Load previous state if exists."""
        if os.path.exists(self.state_file):
            try:
                with open(self.state_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.state = ExecutionState(**data)
                return True
            except Exception as e:
                logging.warning(f"Failed to load state file: {e}")
        return False

    def update_current_business_type(self, business_type: str):
        """Update current business type being processed."""
        if self.state:
            self.state.current_business_type = business_type
            self._save_state()

    def mark_completed(self, business_type: str):
        """Mark business type as completed."""
        if self.state and business_type not in self.state.completed_business_types:
            self.state.completed_business_types.append(business_type)
            self.state.completed_count += 1
            self.state.current_business_type = None
            self._save_state()

    def mark_failed(self, business_type: str):
        """Mark business type as failed."""
        if self.state and business_type not in self.state.failed_business_types:
            self.state.failed_business_types.append(business_type)
            self.state.failed_count += 1
            self.state.current_business_type = None
            self._save_state()

    def get_progress_info(self) -> Dict:
        """Get current progress information."""
        if not self.state:
            return {}

        return {
            "start_time": self.state.start_time,
            "total_count": self.state.total_count,
            "completed_count": self.state.completed_count,
            "failed_count": self.state.failed_count,
            "current_business_type": self.state.current_business_type,
            "progress_percentage": (self.state.completed_count + self.state.failed_count) / self.state.total_count * 100
        }

    def _save_state(self):
        """Save current state to file."""
        if self.state:
            with open(self.state_file, 'w', encoding='utf-8') as f:
                json.dump(asdict(self.state), f, indent=2, ensure_ascii=False)

    def clear_state(self):
        """Clear saved state."""
        if os.path.exists(self.state_file):
            os.remove(self.state_file)
        self.state = None


class ReportGenerator:
    """Generate execution reports."""

    def __init__(self):
        self.results: List[ExecutionResult] = []

    def add_result(self, result: ExecutionResult):
        """Add execution result."""
        self.results.append(result)

    def generate_console_report(self) -> str:
        """Generate console report."""
        if not self.results:
            return "No results to report."

        successful_results = [r for r in self.results if r.status == 'success']
        failed_results = [r for r in self.results if r.status == 'failed']
        skipped_results = [r for r in self.results if r.status == 'skipped']

        total_test_cases = sum(r.test_cases_count for r in successful_results)
        total_time = sum(r.execution_time for r in self.results)

        report = []
        report.append("\n" + "="*80)
        report.append("📊 测试用例批量生成执行报告")
        report.append("="*80)

        # Summary
        report.append(f"\n📈 执行概况:")
        report.append(f"  ✅ 成功: {len(successful_results)} 个业务类型")
        report.append(f"  ❌ 失败: {len(failed_results)} 个业务类型")
        report.append(f"  ⏭️  跳过: {len(skipped_results)} 个业务类型")
        report.append(f"  📝 测试用例总数: {total_test_cases}")
        report.append(f"  ⏱️  总执行时间: {total_time:.2f} 秒")

        # Successful results
        if successful_results:
            report.append(f"\n✅ 成功生成的业务类型:")
            for result in successful_results:
                report.append(f"  - {result.business_type}: {result.test_cases_count} 个用例 ({result.execution_time:.2f}s)")

        # Failed results
        if failed_results:
            report.append(f"\n❌ 失败的业务类型:")
            for result in failed_results:
                report.append(f"  - {result.business_type}: {result.error_message} (重试 {result.retry_count} 次)")

        # Skipped results
        if skipped_results:
            report.append(f"\n⏭️  跳过的业务类型:")
            for result in skipped_results:
                report.append(f"  - {result.business_type}")

        report.append("\n" + "="*80)
        return "\n".join(report)

    def save_detailed_report(self, filename: str):
        """Save detailed report to file."""
        report_data = {
            "execution_time": datetime.now().isoformat(),
            "summary": {
                "total_business_types": len(self.results),
                "successful": len([r for r in self.results if r.status == 'success']),
                "failed": len([r for r in self.results if r.status == 'failed']),
                "skipped": len([r for r in self.results if r.status == 'skipped']),
                "total_test_cases": sum(r.test_cases_count for r in self.results if r.status == 'success'),
                "total_execution_time": sum(r.execution_time for r in self.results)
            },
            "detailed_results": [asdict(r) for r in self.results]
        }

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report_data, f, indent=2, ensure_ascii=False)


class AllTestCaseGenerator:
    """Main generator class for all test cases."""

    def __init__(self, config):
        """Initialize generator."""
        self.config = config
        self.api_client = APIClient(timeout=config.timeout * 60)
        self.progress_tracker = ProgressTracker()
        self.report_generator = ReportGenerator()
        self.setup_logging()

    def setup_logging(self):
        """Setup logging configuration."""
        log_level = logging.INFO if not self.config.verbose else logging.DEBUG

        # Create formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

        # Setup file handler
        file_handler = logging.FileHandler(self.config.log_file, encoding='utf-8')
        file_handler.setFormatter(formatter)
        file_handler.setLevel(log_level)

        # Setup console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        console_handler.setLevel(log_level)

        # Configure root logger
        logging.basicConfig(
            level=log_level,
            handlers=[file_handler, console_handler],
            force=True
        )

    def get_business_types_to_process(self) -> List[str]:
        """Get list of business types to process."""
        all_business_types = list(BUSINESS_TYPE_NAMES.keys())

        # Apply include filter
        if self.config.business_types:
            include_set = set(bt.strip().upper() for bt in self.config.business_types.split(','))
            all_business_types = [bt for bt in all_business_types if bt in include_set]

        # Apply exclude filter
        if self.config.exclude:
            exclude_set = set(bt.strip().upper() for bt in self.config.exclude.split(','))
            all_business_types = [bt for bt in all_business_types if bt not in exclude_set]

        return sorted(all_business_types)

    def wait_for_task_completion(self, task_id: str, business_type: str) -> Tuple[bool, int]:
        """Wait for task completion and monitor progress."""
        start_time = time.time()
        check_interval = 10  # seconds

        logging.info(f"  📡 监控任务进度: {task_id}")

        while True:
            # Check timeout
            if time.time() - start_time > self.config.timeout * 60:
                logging.error(f"  ⏰ 任务超时: {business_type} ({task_id})")
                return False, 0

            # Get task status
            status_data = self.api_client.get_task_status(task_id)
            if not status_data:
                logging.error(f"  ❌ 无法获取任务状态: {task_id}")
                return False, 0

            status = status_data.get("status")
            progress = status_data.get("progress", 0)

            if status == "completed":
                test_cases_count = status_data.get("test_case_id", 0)
                logging.info(f"  ✅ 任务完成: {business_type} (生成 {test_cases_count} 个用例)")
                return True, test_cases_count
            elif status == "failed":
                error_message = status_data.get("error", "未知错误")
                logging.error(f"  ❌ 任务失败: {business_type} - {error_message}")
                return False, 0

            # Show progress
            logging.info(f"  ⏳ 任务进行中: {business_type} ({progress}%)")
            time.sleep(check_interval)

    def generate_for_business_type(self, business_type: str) -> ExecutionResult:
        """Generate test cases for a single business type with retry mechanism."""
        result = ExecutionResult(business_type=business_type, status='failed')

        for attempt in range(self.config.max_retries + 1):
            if attempt > 0:
                logging.info(f"  🔄 重试第 {attempt} 次: {business_type}")
                time.sleep(5)  # Wait before retry

            start_time = time.time()

            try:
                # Clear existing test cases
                if not self.config.dry_run:
                    deleted_info = self.api_client.clear_test_cases(business_type)
                    if deleted_info:
                        logging.info(f"  🧹 清理旧数据: {business_type} - 删除 {deleted_info.get('deleted_items_count', 0)} 个测试用例")

                # Start generation
                task_id = self.api_client.generate_test_cases(business_type)
                if not task_id:
                    result.error_message = "无法启动生成任务"
                    if attempt == self.config.max_retries:
                        logging.error(f"  ❌ {result.error_message}: {business_type}")
                    continue

                logging.info(f"  🚀 开始生成: {business_type} (任务ID: {task_id})")

                # Wait for completion (skip in dry run)
                if self.config.dry_run:
                    result.status = 'success'
                    result.test_cases_count = 10  # Mock number
                    result.execution_time = 60.0
                    break
                else:
                    success, test_cases_count = self.wait_for_task_completion(task_id, business_type)

                    if success:
                        result.status = 'success'
                        result.test_cases_count = test_cases_count
                        result.task_id = task_id
                        break
                    else:
                        result.error_message = "任务执行失败"
                        if attempt == self.config.max_retries:
                            logging.error(f"  ❌ {result.error_message}: {business_type}")

            except Exception as e:
                result.error_message = str(e)
                if attempt == self.config.max_retries:
                    logging.error(f"  ❌ 异常: {business_type} - {e}")

            result.retry_count = attempt
            result.execution_time = time.time() - start_time

        return result

    def _validate_configuration(self) -> bool:
        """
        Validate system configuration before starting generation.

        Returns:
            bool: True if configuration is valid, False otherwise
        """
        try:
            # Test basic configuration
            logging.info("  检查基本配置...")

            # Check environment variables directly
            import os
            from dotenv import load_dotenv
            load_dotenv()

            # Get project root for file path checking
            current_dir = os.path.dirname(os.path.abspath(__file__))
            project_root = os.path.dirname(current_dir)

            api_key = os.getenv('API_KEY', '')
            api_base_url = os.getenv('API_BASE_URL', '')
            model = os.getenv('MODEL', '')

            # Check required environment variables
            if not api_key:
                logging.error("  ❌ API key未配置，请检查.env文件中的API_KEY")
                return False

            if not api_base_url:
                logging.error("  ❌ API base URL未配置，请检查.env文件中的API_BASE_URL")
                return False

            if not model:
                logging.error("  ❌ 模型名称未配置，请检查.env文件中的MODEL")
                return False

            logging.info(f"  ✅ 基本配置检查通过: {api_base_url} / {model}")

            # Test file paths
            logging.info("  检查文件路径...")

            # Check system prompt file
            system_prompt_path = os.path.join(project_root, os.getenv('SYSTEM_PROMPT_PATH', 'prompts/system.md'))
            if not os.path.exists(system_prompt_path):
                logging.error(f"  ❌ 系统提示词文件不存在: {system_prompt_path}")
                return False
            logging.info(f"  ✅ 系统提示词文件存在: {system_prompt_path}")

            # Check business description files
            business_types = self.get_business_types_to_process()
            if not business_types:
                logging.error("  ❌ 没有找到业务类型")
                return False

            # Check a few business description files
            missing_files = []
            for bt in business_types[:3]:  # Check first 3
                from config.business_types import get_business_file_mapping
                filename = get_business_file_mapping(bt)
                file_path = os.path.join(project_root, 'prompts', 'business_descriptions', filename)
                if not os.path.exists(file_path):
                    missing_files.append(file_path)

            if missing_files:
                logging.error(f"  ❌ 业务描述文件不存在: {', '.join(missing_files)}")
                return False

            logging.info(f"  ✅ 业务描述文件检查通过")

            # Test server health (we already did this above, but confirm it's still working)
            if not self.api_client.check_health():
                logging.error("  ❌ API服务器健康检查失败")
                return False

            logging.info(f"  ✅ API服务器健康检查通过")

            return True

        except ImportError as e:
            logging.error(f"  ❌ 导入模块失败: {e}")
            logging.error("  💡 请确保项目依赖已正确安装")
            return False
        except Exception as e:
            logging.error(f"  ❌ 配置验证过程中发生错误: {e}")
            return False

    def run(self) -> bool:
        """Main execution method."""
        try:
            logging.info("🚀 开始批量生成所有业务类型测试用例")
            logging.info(f"📋 配置: 服务器={self.api_client.base_url}, 超时={self.config.timeout}分钟, 最大重试={self.config.max_retries}次")

            # Check server health
            if not self.config.dry_run and not self.api_client.check_health():
                logging.error("❌ API服务器不可用，请确保服务器正在运行")
                logging.error(f"   服务器地址: {self.api_client.base_url}")
                logging.error("   💡 尝试运行: python scripts/test_api_connection.py")
                return False

            # Validate configuration before starting
            logging.info("🔧 验证配置...")
            if not self._validate_configuration():
                logging.error("❌ 配置验证失败")
                return False
            logging.info("✅ 配置验证通过")

            # Get business types to process
            business_types = self.get_business_types_to_process()
            logging.info(f"📝 将处理 {len(business_types)} 个业务类型: {', '.join(business_types)}")

            if self.config.dry_run:
                logging.info("🔍 预览模式 - 不会实际执行操作")
                for bt in business_types:
                    logging.info(f"  将处理: {bt} - {BUSINESS_TYPE_NAMES.get(bt, bt)}")
                return True

            # Handle resume
            if self.config.resume and self.progress_tracker.load_state():
                progress_info = self.progress_tracker.get_progress_info()
                logging.info(f"📂 从上次执行恢复: 已完成 {progress_info['completed_count']}/{progress_info['total_count']}")

                # Filter out already completed business types
                completed = set(progress_info.get('completed_business_types', []))
                business_types = [bt for bt in business_types if bt not in completed]
            else:
                self.progress_tracker.initialize(business_types)

            # Initialize knowledge graph
            logging.info("🔧 初始化知识图谱...")
            if not self.api_client.initialize_knowledge_graph():
                logging.error("❌ 知识图谱初始化失败")
                return False

            # Process each business type
            start_time = time.time()

            for i, business_type in enumerate(business_types, 1):
                progress_info = self.progress_tracker.get_progress_info()
                logging.info(f"\n📊 [{i}/{len(business_types)}] 处理业务类型: {business_type} ({BUSINESS_TYPE_NAMES.get(business_type, business_type)})")

                self.progress_tracker.update_current_business_type(business_type)

                result = self.generate_for_business_type(business_type)
                self.report_generator.add_result(result)

                if result.status == 'success':
                    self.progress_tracker.mark_completed(business_type)
                elif result.status == 'failed':
                    self.progress_tracker.mark_failed(business_type)

            # Generate final report
            execution_time = time.time() - start_time
            logging.info(f"\n⏱️  总执行时间: {execution_time:.2f} 秒")

            # Print console report
            console_report = self.report_generator.generate_console_report()
            logging.info(console_report)

            # Save detailed report
            report_filename = f"test_cases_generation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            self.report_generator.save_detailed_report(report_filename)
            logging.info(f"📄 详细报告已保存: {report_filename}")

            # Clean up state
            self.progress_tracker.clear_state()

            # Determine success
            failed_count = len([r for r in self.report_generator.results if r.status == 'failed'])
            if failed_count == 0:
                logging.info("🎉 所有业务类型测试用例生成成功!")
                return True
            else:
                logging.warning(f"⚠️  {failed_count} 个业务类型生成失败")
                return False

        except KeyboardInterrupt:
            logging.info("\n⏹️  用户中断执行")
            logging.info("💾 进度已保存，使用 --resume 参数可从中断点继续")
            return False
        except Exception as e:
            logging.error(f"💥 执行过程中发生异常: {e}")
            return False


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Generate test cases for all business types',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                          # Generate all business types
  %(prog)s --business-types RCC,RFD # Generate specific business types
  %(prog)s --exclude WEIXIU_RSM     # Exclude specific business types
  %(prog)s --dry-run                # Preview what would be executed
  %(prog)s --resume                 # Resume from previous execution
  %(prog)s --force --max-retries 5  # Force regeneration with 5 retries
        """
    )

    parser.add_argument(
        '--force',
        action='store_true',
        help='Force regeneration of all business types'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be executed without actually running'
    )

    parser.add_argument(
        '--business-types',
        type=str,
        help='Comma-separated list of business types to generate (e.g., RCC,RFD,ZAB)'
    )

    parser.add_argument(
        '--exclude',
        type=str,
        help='Comma-separated list of business types to exclude'
    )

    parser.add_argument(
        '--max-retries',
        type=int,
        default=3,
        help='Maximum retry attempts per business type (default: 3)'
    )

    parser.add_argument(
        '--timeout',
        type=int,
        default=30,
        help='Timeout per business type in minutes (default: 30)'
    )

    parser.add_argument(
        '--log-file',
        type=str,
        default=f"generate_all_test_cases_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log",
        help='Custom log file path'
    )

    parser.add_argument(
        '--resume',
        action='store_true',
        help='Resume from previous execution if possible'
    )

    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )

    parser.add_argument(
        '--server-url',
        type=str,
        default='http://127.0.0.1:8000',
        help='API server base URL (default: http://127.0.0.1:8000)'
    )

    return parser.parse_args()


def main():
    """Main function."""
    # Parse arguments
    args = parse_arguments()

    # Create configuration
    config = argparse.Namespace(**vars(args))

    print("🚀 TSP 测试用例批量生成脚本")
    print(f"📝 日志文件: {config.log_file}")
    print(f"🌐 API服务器: {config.server_url}")
    print("="*80)

    # Create and run generator
    generator = AllTestCaseGenerator(config)
    success = generator.run()

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()