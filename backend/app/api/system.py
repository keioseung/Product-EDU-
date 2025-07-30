from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import io
import os

from ..database import get_db
from ..models import User, AIInfo, UserProgress, ActivityLog, BackupHistory, Quiz, Prompt, BaseContent, Term
from ..auth import get_current_active_user
from .logs import log_activity

router = APIRouter()

@router.post("/backup")
async def create_backup(
    include_tables: Optional[List[str]] = None,
    description: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """전체 시스템 데이터를 백업합니다. (관리자만)"""
    
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    try:
        # 기본적으로 모든 테이블 백업
        if not include_tables:
            include_tables = ['users', 'ai_info', 'user_progress', 'activity_logs', 'quiz', 'prompt', 'base_content', 'term']
        
        backup_data = {
            "backup_info": {
                "created_at": datetime.now().isoformat(),
                "created_by": current_user.username,
                "description": description or "Manual backup",
                "tables_included": include_tables,
                "version": "1.0.0"
            },
            "data": {}
        }
        
        # 각 테이블 데이터 수집
        table_models = {
            'users': User,
            'ai_info': AIInfo,
            'user_progress': UserProgress,
            'activity_logs': ActivityLog,
            'quiz': Quiz,
            'prompt': Prompt,
            'base_content': BaseContent,
            'term': Term,
            'backup_history': BackupHistory
        }
        
        for table_name in include_tables:
            if table_name in table_models:
                model = table_models[table_name]
                records = db.query(model).all()
                
                # 모델 데이터를 딕셔너리로 변환
                table_data = []
                for record in records:
                    record_dict = {}
                    for column in record.__table__.columns:
                        value = getattr(record, column.name)
                        if isinstance(value, datetime):
                            value = value.isoformat()
                        record_dict[column.name] = value
                    table_data.append(record_dict)
                
                backup_data["data"][table_name] = table_data
        
        # 백업 파일명 생성
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"ai_mastery_backup_{timestamp}.json"
        
        # JSON 문자열 생성
        json_str = json.dumps(backup_data, indent=2, ensure_ascii=False)
        file_size = len(json_str.encode('utf-8'))
        
        # 백업 히스토리 저장
        backup_history = BackupHistory(
            filename=filename,
            file_size=file_size,
            backup_type='manual',
            tables_included=json.dumps(include_tables),
            description=description,
            created_by=current_user.id,
            created_by_username=current_user.username
        )
        db.add(backup_history)
        db.commit()
        
        # 백업 생성 로그 기록
        log_activity(
            db=db,
            action="시스템 백업 생성",
            details=f"백업 파일이 생성되었습니다. 파일명: {filename}, 크기: {file_size} bytes",
            log_type="system",
            log_level="success",
            user_id=current_user.id,
            username=current_user.username
        )
        
        # 파일 스트림으로 반환
        def generate():
            yield json_str
        
        return StreamingResponse(
            io.StringIO(json_str),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create backup: {str(e)}")

@router.post("/restore")
async def restore_backup(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """백업 파일을 업로드하여 시스템을 복원합니다. (관리자만)"""
    
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    if not file.filename.endswith('.json'):
        raise HTTPException(status_code=400, detail="Only JSON files are allowed")
    
    try:
        # 파일 내용 읽기
        content = await file.read()
        backup_data = json.loads(content.decode('utf-8'))
        
        # 백업 파일 검증
        if "backup_info" not in backup_data or "data" not in backup_data:
            raise HTTPException(status_code=400, detail="Invalid backup file format")
        
        backup_info = backup_data["backup_info"]
        data = backup_data["data"]
        
        # 트랜잭션 시작
        try:
            # 테이블 모델 매핑
            table_models = {
                'users': User,
                'ai_info': AIInfo,
                'user_progress': UserProgress,
                'activity_logs': ActivityLog,
                'quiz': Quiz,
                'prompt': Prompt,
                'base_content': BaseContent,
                'term': Term,
                'backup_history': BackupHistory
            }
            
            restored_tables = []
            
            # 현재 사용자 정보 백업 (복원 후 로그인 유지용)
            current_user_data = {
                'id': current_user.id,
                'username': current_user.username,
                'hashed_password': current_user.hashed_password
            }
            
            # 각 테이블 데이터 복원
            for table_name, table_data in data.items():
                if table_name in table_models and table_data:
                    model = table_models[table_name]
                    
                    # 기존 데이터 삭제 (사용자는 제외하고 나중에 처리)
                    if table_name != 'users':
                        db.query(model).delete()
                    
                    # 새 데이터 삽입
                    for record_data in table_data:
                        # 날짜 필드 변환
                        for key, value in record_data.items():
                            if key.endswith('_at') and isinstance(value, str):
                                try:
                                    record_data[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                                except:
                                    pass
                        
                        new_record = model(**record_data)
                        db.add(new_record)
                    
                    restored_tables.append(table_name)
            
            # 사용자 테이블 특별 처리 (현재 사용자 보존)
            if 'users' in data:
                db.query(User).delete()
                
                # 백업된 사용자들 복원
                for user_data in data['users']:
                    for key, value in user_data.items():
                        if key.endswith('_at') and isinstance(value, str):
                            try:
                                user_data[key] = datetime.fromisoformat(value.replace('Z', '+00:00'))
                            except:
                                pass
                    
                    new_user = User(**user_data)
                    db.add(new_user)
                
                # 현재 관리자 사용자가 백업에 없으면 추가
                backup_usernames = [u['username'] for u in data['users']]
                if current_user.username not in backup_usernames:
                    admin_user = User(**current_user_data)
                    db.add(admin_user)
            
            db.commit()
            
            # 복원 완료 로그 기록
            log_activity(
                db=db,
                action="시스템 복원 완료",
                details=f"백업 파일에서 시스템이 복원되었습니다. 파일: {file.filename}, 복원된 테이블: {', '.join(restored_tables)}",
                log_type="system",
                log_level="success",
                user_id=current_user.id,
                username=current_user.username
            )
            
            return {
                "message": "System restored successfully",
                "restored_tables": restored_tables,
                "backup_info": backup_info
            }
            
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to restore data: {str(e)}")
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process backup file: {str(e)}")

@router.get("/backup-history")
def get_backup_history(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """백업 히스토리를 조회합니다. (관리자만)"""
    
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    backups = db.query(BackupHistory).order_by(BackupHistory.created_at.desc()).limit(50).all()
    
    backup_list = []
    for backup in backups:
        backup_list.append({
            "id": backup.id,
            "filename": backup.filename,
            "file_size": backup.file_size,
            "backup_type": backup.backup_type,
            "tables_included": json.loads(backup.tables_included) if backup.tables_included else [],
            "description": backup.description,
            "created_by": backup.created_by_username,
            "created_at": backup.created_at.isoformat()
        })
    
    return {"backups": backup_list}

@router.delete("/backup-history/{backup_id}")
def delete_backup_history(
    backup_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """백업 히스토리 항목을 삭제합니다. (관리자만)"""
    
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    backup = db.query(BackupHistory).filter(BackupHistory.id == backup_id).first()
    if not backup:
        raise HTTPException(status_code=404, detail="Backup history not found")
    
    db.delete(backup)
    db.commit()
    
    return {"message": "Backup history deleted successfully"}

@router.get("/system-info")
def get_system_info(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """시스템 정보를 조회합니다. (관리자만)"""
    
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # 테이블별 레코드 수 조회
    stats = {
        "users": db.query(User).count(),
        "ai_info": db.query(AIInfo).count(),
        "user_progress": db.query(UserProgress).count(),
        "activity_logs": db.query(ActivityLog).count(),
        "quiz": db.query(Quiz).count(),
        "prompt": db.query(Prompt).count(),
        "base_content": db.query(BaseContent).count(),
        "term": db.query(Term).count(),
        "backup_history": db.query(BackupHistory).count()
    }
    
    # 최근 백업 정보
    latest_backup = db.query(BackupHistory).order_by(BackupHistory.created_at.desc()).first()
    
    return {
        "version": "1.0.0",
        "table_stats": stats,
        "total_records": sum(stats.values()),
        "latest_backup": {
            "filename": latest_backup.filename if latest_backup else None,
            "created_at": latest_backup.created_at.isoformat() if latest_backup else None,
            "created_by": latest_backup.created_by_username if latest_backup else None
        } if latest_backup else None
    }

@router.delete("/clear-all-data")
def clear_all_data(
    confirm: bool = False,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """모든 시스템 데이터를 삭제합니다. (관리자만, 매우 위험)"""
    
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    if not confirm:
        raise HTTPException(
            status_code=400,
            detail="Please set confirm=true to proceed with data deletion"
        )
    
    try:
        # 현재 관리자 사용자 정보 백업
        admin_data = {
            'username': current_user.username,
            'hashed_password': current_user.hashed_password,
            'role': current_user.role
        }
        
        # 모든 테이블 데이터 삭제
        db.query(ActivityLog).delete()
        db.query(UserProgress).delete()
        db.query(BackupHistory).delete()
        db.query(AIInfo).delete()
        db.query(Quiz).delete()
        db.query(Prompt).delete()
        db.query(BaseContent).delete()
        db.query(Term).delete()
        db.query(User).delete()
        
        # 관리자 계정 복원
        admin_user = User(**admin_data)
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        # 데이터 삭제 로그 기록
        log_activity(
            db=db,
            action="전체 데이터 삭제",
            details="관리자가 모든 시스템 데이터를 삭제했습니다. (관리자 계정은 보존)",
            log_type="system",
            log_level="warning",
            user_id=admin_user.id,
            username=admin_user.username
        )
        
        return {"message": "All data cleared successfully. Admin account preserved."}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to clear data: {str(e)}")

@router.post("/init-database")
async def init_database_tables(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """데이터베이스 테이블을 초기화하고 누락된 테이블을 생성합니다. (관리자만)"""
    
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    try:
        from ..database import Base, engine
        from ..models import User, AIInfo, UserProgress, ActivityLog, BackupHistory, Quiz, Prompt, BaseContent, Term
        
        # 모든 테이블 생성 (이미 존재하는 테이블은 건드리지 않음)
        Base.metadata.create_all(bind=engine)
        
        # 테이블 확인
        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        expected_tables = [
            'users', 'ai_info', 'user_progress', 'activity_logs', 
            'backup_history', 'quiz', 'prompt', 'base_content', 'term'
        ]
        
        created_tables = []
        missing_tables = []
        
        for table in expected_tables:
            if table in existing_tables:
                created_tables.append(table)
            else:
                missing_tables.append(table)
        
        # 활동 로그 테이블이 생성되었는지 다시 확인
        with engine.connect() as conn:
            try:
                result = conn.execute(text("SELECT COUNT(*) FROM activity_logs"))
                log_count = result.scalar()
            except Exception:
                # activity_logs 테이블이 없으면 강제로 생성
                try:
                    conn.execute(text("""
                        CREATE TABLE IF NOT EXISTS activity_logs (
                            id SERIAL PRIMARY KEY,
                            user_id INTEGER,
                            username VARCHAR,
                            action VARCHAR NOT NULL,
                            details TEXT,
                            log_type VARCHAR DEFAULT 'user',
                            log_level VARCHAR DEFAULT 'info',
                            ip_address VARCHAR,
                            user_agent TEXT,
                            session_id VARCHAR,
                            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                        )
                    """))
                    conn.commit()
                    log_count = 0
                except Exception as create_error:
                    raise HTTPException(
                        status_code=500, 
                        detail=f"Failed to create activity_logs table: {str(create_error)}"
                    )
        
        # 초기화 로그 기록
        log_activity(
            db=db,
            action="데이터베이스 테이블 초기화",
            details=f"테이블 생성 완료. 기존 테이블: {len(created_tables)}개, 누락된 테이블: {len(missing_tables)}개",
            log_type="system",
            log_level="info",
            user_id=current_user.id,
            username=current_user.username
        )
        
        return {
            "message": "Database tables initialized successfully",
            "existing_tables": created_tables,
            "missing_tables": missing_tables,
            "total_tables": len(created_tables)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to initialize database: {str(e)}")

@router.get("/database-status")
async def get_database_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """데이터베이스 상태를 확인합니다. (관리자만)"""
    
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    try:
        from sqlalchemy import inspect, text
        from ..database import engine
        
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        expected_tables = [
            'users', 'ai_info', 'user_progress', 'activity_logs', 
            'backup_history', 'quiz', 'prompt', 'base_content', 'term'
        ]
        
        table_status = {}
        for table in expected_tables:
            if table in existing_tables:
                # 테이블 행 수 확인
                try:
                    with engine.connect() as conn:
                        result = conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                        count = result.scalar()
                        table_status[table] = {"exists": True, "rows": count}
                except Exception:
                    table_status[table] = {"exists": True, "rows": "unknown"}
            else:
                table_status[table] = {"exists": False, "rows": 0}
        
        return {
            "database_url": "Connected" if engine else "Not connected",
            "tables": table_status,
            "total_existing": len([t for t in expected_tables if t in existing_tables]),
            "total_expected": len(expected_tables)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check database status: {str(e)}")

@router.get("/admin-stats")
async def get_admin_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """관리자 대시보드 통계 조회 (관리자만)"""
    
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    try:
        from datetime import datetime, timedelta
        from sqlalchemy import func, text
        import json
        from collections import defaultdict, Counter
        
        # 1. 총 사용자 수
        total_users = db.query(User).count()
        
        # 2. 활성 사용자 수 (최근 7일간 활동)
        seven_days_ago = datetime.now() - timedelta(days=7)
        
        # 세션 ID 기반으로 활성 사용자 계산
        active_sessions_subquery = db.query(ActivityLog.session_id).filter(
            ActivityLog.created_at >= seven_days_ago,
            ActivityLog.session_id.isnot(None)
        ).distinct().subquery()
        
        active_users = db.query(active_sessions_subquery).count()
        
        # 3. 총 퀴즈 수
        total_quizzes = db.query(Quiz).count()
        
        # 4. 총 컨텐츠 수
        ai_info_count = db.query(AIInfo).count()
        prompt_count = db.query(Prompt).count()
        base_content_count = db.query(BaseContent).count()
        term_count = db.query(Term).count()
        total_content = ai_info_count + prompt_count + base_content_count + term_count
        
        # 5. 인기 토픽 (퀴즈 주제별 통계)
        quiz_topics = db.query(Quiz.topic).filter(
            Quiz.topic.isnot(None),
            Quiz.topic != ""
        ).all()
        
        if quiz_topics:
            topic_counter = Counter([topic[0] for topic in quiz_topics if topic[0]])
            popular_topics = [
                {"name": topic, "count": count}
                for topic, count in topic_counter.most_common(5)
            ]
        else:
            # 퀴즈 주제가 없으면 기본 주제들로 구성
            popular_topics = [
                {"name": "AI 기초", "count": max(total_quizzes // 3, 1)},
                {"name": "머신러닝", "count": max(total_quizzes // 4, 1)},
                {"name": "딥러닝", "count": max(total_quizzes // 5, 1)},
                {"name": "자연어처리", "count": max(total_quizzes // 6, 1)},
                {"name": "컴퓨터비전", "count": max(total_quizzes // 7, 1)}
            ]
        
        # 6. 주간 활동 (최근 7일)
        weekly_progress = []
        day_names = ['월', '화', '수', '목', '금', '토', '일']
        
        for i in range(7):
            target_date = datetime.now() - timedelta(days=6-i)
            
            # 해당 날짜의 활동 사용자 수 (세션 ID 기준)
            daily_sessions = db.query(ActivityLog.session_id).filter(
                func.date(ActivityLog.created_at) == target_date.date(),
                ActivityLog.session_id.isnot(None)
            ).distinct().count()
            
            # 해당 날짜의 퀴즈 활동 수
            daily_quizzes = db.query(ActivityLog).filter(
                func.date(ActivityLog.created_at) == target_date.date(),
                ActivityLog.action.ilike('%quiz%')
            ).count()
            
            weekly_progress.append({
                "day": day_names[target_date.weekday()],
                "users": daily_sessions,
                "quizzes": daily_quizzes
            })
        
        # 7. 최근 활동 (실시간)
        recent_activities = []
        recent_logs = db.query(ActivityLog).order_by(
            ActivityLog.created_at.desc()
        ).limit(10).all()
        
        for log in recent_logs:
            # 시간차 계산
            now = datetime.now()
            log_time = log.created_at.replace(tzinfo=None) if log.created_at.tzinfo else log.created_at
            time_diff = now - log_time
            
            if time_diff.total_seconds() < 60:
                time_str = f"{int(time_diff.total_seconds())}초 전"
            elif time_diff.total_seconds() < 3600:
                time_str = f"{int(time_diff.total_seconds() // 60)}분 전"
            elif time_diff.days == 0:
                time_str = f"{int(time_diff.total_seconds() // 3600)}시간 전"
            else:
                time_str = f"{time_diff.days}일 전"
            
            # 사용자 이름 결정
            user_display = log.username or (
                log.session_id[:8] + "..." if log.session_id and len(log.session_id) > 8 
                else log.session_id or "익명"
            )
            
            recent_activities.append({
                "user": user_display,
                "action": log.action,
                "time": time_str
            })
        
        return {
            "success": True,
            "stats": {
                "totalUsers": total_users,
                "activeUsers": active_users,
                "totalQuizzes": total_quizzes,
                "totalContent": total_content,
                "popularTopics": popular_topics,
                "weeklyProgress": weekly_progress,
                "recentActivity": recent_activities
            }
        }
        
    except Exception as e:
        print(f"Admin stats error: {e}")
        raise HTTPException(status_code=500, detail=f"통계 조회 실패: {str(e)}") 