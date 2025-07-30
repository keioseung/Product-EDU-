from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import json

from ..database import get_db
from ..models import ActivityLog, User
from ..auth import get_current_active_user

router = APIRouter()

@router.post("/")
def create_log(
    request: Request,
    log_data: dict,
    db: Session = Depends(get_db)
):
    """활동 로그를 생성합니다."""
    try:
        # IP 주소 추출
        client_ip = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent", "")
        
        # 로그 생성
        activity_log = ActivityLog(
            user_id=log_data.get('user_id'),
            username=log_data.get('username'),
            action=log_data.get('action', ''),
            details=log_data.get('details', ''),
            log_type=log_data.get('log_type', 'user'),
            log_level=log_data.get('log_level', 'info'),
            ip_address=client_ip,
            user_agent=user_agent,
            session_id=log_data.get('session_id')
        )
        
        db.add(activity_log)
        db.commit()
        db.refresh(activity_log)
        
        return {"message": "Log created successfully", "log_id": activity_log.id}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create log: {str(e)}")

@router.get("/")
def get_logs(
    skip: int = 0,
    limit: int = 100,
    log_type: Optional[str] = None,
    log_level: Optional[str] = None,
    username: Optional[str] = None,
    action: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """활동 로그 목록을 조회합니다. (관리자만)"""
    
    try:
        print(f"🔍 로그 조회 요청 시작")
        print(f"👤 현재 사용자: {current_user.username if current_user else 'None'}")
        print(f"🏷️ 사용자 역할: {current_user.role if current_user else 'None'}")
        print(f"📊 조회 파라미터: skip={skip}, limit={limit}, log_type={log_type}, log_level={log_level}")
        
        if not current_user:
            print("❌ 현재 사용자가 None입니다")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User authentication failed"
            )
        
        if current_user.role != 'admin':
            print(f"❌ 권한 없음 - 사용자 역할: {current_user.role} (admin 필요)")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions - Admin role required"
            )
        
        print("✅ 권한 확인 완료 - 로그 조회 진행")
        
    except Exception as e:
        print(f"❌ 로그 조회 전처리 에러: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Internal error during log access: {str(e)}"
            )
    
    query = db.query(ActivityLog)
    
    # 필터링
    if log_type:
        query = query.filter(ActivityLog.log_type == log_type)
    if log_level:
        query = query.filter(ActivityLog.log_level == log_level)
    if username:
        query = query.filter(ActivityLog.username.ilike(f"%{username}%"))
    if action:
        query = query.filter(ActivityLog.action.ilike(f"%{action}%"))
    
    # 날짜 범위 필터링
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            query = query.filter(ActivityLog.created_at >= start_dt)
        except ValueError:
            pass
    
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(ActivityLog.created_at < end_dt)
        except ValueError:
            pass
    
    # 정렬 및 페이징
    logs = query.order_by(ActivityLog.created_at.desc()).offset(skip).limit(limit).all()
    total_count = query.count()
    
    # 응답 데이터 구성
    logs_data = []
    for log in logs:
        logs_data.append({
            "id": str(log.id),
            "timestamp": log.created_at.isoformat(),
            "type": log.log_type,
            "level": log.log_level,
            "user": log.username,
            "action": log.action,
            "details": log.details,
            "ip": log.ip_address,
            "user_agent": log.user_agent
        })
    
    return {
        "logs": logs_data,
        "total": total_count,
        "skip": skip,
        "limit": limit
    }

@router.get("/test")
def test_logs_api():
    """로그 API 테스트 엔드포인트 (인증 없음)"""
    return {
        "status": "success",
        "message": "로그 API가 정상 작동 중입니다",
        "timestamp": datetime.now().isoformat(),
        "available_endpoints": [
            "GET /api/logs - 로그 조회 (admin 권한 필요)",
            "GET /api/logs/stats - 로그 통계 (admin 권한 필요)",
            "POST /api/logs - 로그 생성",
            "DELETE /api/logs - 로그 삭제 (admin 권한 필요)"
        ]
    }

@router.get("/simple")
def get_logs_simple(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """임시 로그 조회 엔드포인트 (인증 없음) - 디버깅용"""
    try:
        print("🔍 인증 없는 로그 조회 시작")
        
        # 간단한 로그 조회
        logs = db.query(ActivityLog).order_by(
            ActivityLog.created_at.desc()
        ).offset(skip).limit(limit).all()
        
        total_count = db.query(ActivityLog).count()
        
        print(f"📊 조회 결과: {len(logs)}개 로그, 전체 {total_count}개")
        
        # 응답 데이터 구성
        logs_data = []
        for log in logs:
            logs_data.append({
                "id": str(log.id),
                "timestamp": log.created_at.isoformat() if log.created_at else "N/A",
                "type": log.log_type or "unknown",
                "level": log.log_level or "info",
                "user": log.username or "anonymous",
                "action": log.action or "no action",
                "details": log.details or ""
            })
        
        print("✅ 로그 조회 성공")
        
        return {
            "logs": logs_data,
            "total": total_count,
            "skip": skip,
            "limit": limit,
            "message": "Simple log query successful"
        }
        
    except Exception as e:
        print(f"❌ 간단 로그 조회 실패: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Simple log query failed: {str(e)}"
        )

@router.get("/stats")
def get_log_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """로그 통계를 조회합니다. (관리자만)"""
    
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    # 전체 로그 수
    total_logs = db.query(ActivityLog).count()
    
    # 레벨별 통계
    error_logs = db.query(ActivityLog).filter(ActivityLog.log_level == 'error').count()
    warning_logs = db.query(ActivityLog).filter(ActivityLog.log_level == 'warning').count()
    info_logs = db.query(ActivityLog).filter(ActivityLog.log_level == 'info').count()
    success_logs = db.query(ActivityLog).filter(ActivityLog.log_level == 'success').count()
    
    # 타입별 통계
    user_logs = db.query(ActivityLog).filter(ActivityLog.log_type == 'user').count()
    system_logs = db.query(ActivityLog).filter(ActivityLog.log_type == 'system').count()
    security_logs = db.query(ActivityLog).filter(ActivityLog.log_type == 'security').count()
    
    # 오늘 로그 수
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    today_logs = db.query(ActivityLog).filter(ActivityLog.created_at >= today).count()
    
    return {
        "total_logs": total_logs,
        "today_logs": today_logs,
        "by_level": {
            "error": error_logs,
            "warning": warning_logs,
            "info": info_logs,
            "success": success_logs
        },
        "by_type": {
            "user": user_logs,
            "system": system_logs,
            "security": security_logs
        }
    }

@router.delete("/")
def clear_logs(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """모든 로그를 삭제합니다. (관리자만)"""
    
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    try:
        deleted_count = db.query(ActivityLog).delete()
        db.commit()
        
        # 로그 삭제 기록
        clear_log = ActivityLog(
            user_id=current_user.id,
            username=current_user.username,
            action="시스템 로그 삭제",
            details=f"총 {deleted_count}개의 로그가 삭제되었습니다.",
            log_type="system",
            log_level="warning"
        )
        db.add(clear_log)
        db.commit()
        
        return {"message": f"Successfully deleted {deleted_count} logs"}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to clear logs: {str(e)}")

# 로그 생성 헬퍼 함수
def log_activity(
    db: Session,
    action: str,
    details: str = "",
    log_type: str = "user",
    log_level: str = "info",
    user_id: Optional[int] = None,
    username: Optional[str] = None,
    session_id: Optional[str] = None,
    ip_address: Optional[str] = None
):
    """활동 로그를 생성하는 헬퍼 함수"""
    try:
        activity_log = ActivityLog(
            user_id=user_id,
            username=username,
            action=action,
            details=details,
            log_type=log_type,
            log_level=log_level,
            session_id=session_id,
            ip_address=ip_address
        )
        
        db.add(activity_log)
        db.commit()
        return activity_log
    
    except Exception as e:
        db.rollback()
        print(f"Failed to create log: {str(e)}")
        return None 