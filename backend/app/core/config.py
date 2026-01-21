"""
应用配置模块
"""
import os
from typing import List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """应用配置"""
    
    # 服务端口
    BACKEND_PORT: int = 8847
    
    # MongoDB
    MONGODB_URL: str = "mongodb://ciap_admin:change_me@localhost:27847/?authSource=admin"
    MONGODB_DB_NAME: str = "copilot_insight"
    
    # Redis
    REDIS_URL: str = "redis://:change_me@localhost:6847/0"
    
    # Elasticsearch (可选)
    ELASTICSEARCH_HOST: str = "localhost:9200"
    ELASTICSEARCH_ENABLED: bool = False
    
    # API
    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Copilot Insight Analytics Platform"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    
    class Config:
        # 优先加载项目根目录的 .env 文件
        env_file = "../.env"
        extra = "ignore"
        case_sensitive = True


settings = Settings()
