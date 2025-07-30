from sqlalchemy import Column, Integer, BigInteger, String, Text, DateTime, Boolean
from sqlalchemy.sql import func
from .database import Base

# 사용자 모델 추가 (실제 Supabase 스키마에 맞춤)
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)  # 실제로는 integer
    username = Column(String, unique=True, index=True, nullable=False)  # varchar
    email = Column(String, unique=True, index=True, nullable=True)  # varchar
    hashed_password = Column(String, nullable=False)  # 실제 필드명: hashed_password
    role = Column(String, default="user", nullable=False)  # varchar
    created_at = Column(DateTime(timezone=True), server_default=func.now())  # timestamptz

# 활동 로그 모델 추가
class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=True)  # 사용자 ID (로그인한 경우)
    username = Column(String, nullable=True)  # 사용자명 (빠른 조회용)
    action = Column(String, nullable=False)  # 액션 (로그인, 학습, 퀴즈 등)
    details = Column(Text, nullable=True)  # 상세 내용
    log_type = Column(String, default='user')  # 'user', 'system', 'security', 'error'
    log_level = Column(String, default='info')  # 'info', 'warning', 'error', 'success'
    ip_address = Column(String, nullable=True)  # IP 주소
    user_agent = Column(Text, nullable=True)  # 사용자 에이전트
    session_id = Column(String, nullable=True)  # 세션 ID
    created_at = Column(DateTime(timezone=True), server_default=func.now())

# 백업 히스토리 모델 추가
class BackupHistory(Base):
    __tablename__ = "backup_history"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_size = Column(Integer, nullable=True)  # 파일 크기 (bytes)
    backup_type = Column(String, default='manual')  # 'manual', 'auto'
    tables_included = Column(Text, nullable=True)  # JSON 배열로 포함된 테이블 목록
    description = Column(Text, nullable=True)
    created_by = Column(Integer, nullable=True)  # 백업을 생성한 사용자 ID
    created_by_username = Column(String, nullable=True)  # 사용자명 (빠른 조회용)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AIInfo(Base):
    __tablename__ = "ai_info"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, index=True)
    info1_title = Column(Text)
    info1_content = Column(Text)
    info1_terms = Column(Text)  # JSON 직렬화된 용어 리스트
    info2_title = Column(Text)
    info2_content = Column(Text)
    info2_terms = Column(Text)  # JSON 직렬화된 용어 리스트
    info3_title = Column(Text)
    info3_content = Column(Text)
    info3_terms = Column(Text)  # JSON 직렬화된 용어 리스트
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Quiz(Base):
    __tablename__ = "quiz"
    
    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String, index=True)
    question = Column(Text)
    option1 = Column(Text)
    option2 = Column(Text)
    option3 = Column(Text)
    option4 = Column(Text)
    correct = Column(Integer)
    explanation = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class UserProgress(Base):
    __tablename__ = "user_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)
    date = Column(String, index=True)
    learned_info = Column(Text)  # JSON 직렬화 문자열
    stats = Column(Text)         # JSON 직렬화 문자열
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Prompt(Base):
    __tablename__ = "prompt"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(Text)
    category = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class BaseContent(Base):
    __tablename__ = "base_content"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(Text)
    category = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now()) 

class Term(Base):
    __tablename__ = "term"
    id = Column(Integer, primary_key=True, index=True)
    term = Column(String, unique=True, index=True)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now()) 