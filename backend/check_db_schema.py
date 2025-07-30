#!/usr/bin/env python3
"""
Supabase 데이터베이스 스키마 확인 스크립트
"""

import os
import sys
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

def check_database_schema():
    """데이터베이스 스키마를 확인합니다."""
    try:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("❌ DATABASE_URL 환경변수가 설정되지 않았습니다.")
            return False
            
        print(f"📡 데이터베이스 연결 중...")
        engine = create_engine(database_url)
        
        with engine.connect() as conn:
            print("✅ 데이터베이스 연결 성공\n")
            
            # 1. 모든 테이블 목록 조회
            print("📋 현재 데이터베이스의 모든 테이블:")
            result = conn.execute(text("""
                SELECT table_name, table_schema 
                FROM information_schema.tables 
                WHERE table_schema IN ('public', 'auth')
                ORDER BY table_schema, table_name;
            """))
            
            for row in result:
                print(f"  - {row.table_schema}.{row.table_name}")
            
            print("\n" + "="*50 + "\n")
            
            # 2. users 테이블이 있는지 확인
            print("🔍 users 테이블 검색:")
            result = conn.execute(text("""
                SELECT table_name, table_schema 
                FROM information_schema.tables 
                WHERE table_name = 'users'
                ORDER BY table_schema;
            """))
            
            users_tables = result.fetchall()
            if not users_tables:
                print("❌ users 테이블을 찾을 수 없습니다.")
                return False
                
            for table in users_tables:
                schema = table.table_schema
                table_name = table.table_name
                print(f"✅ 발견: {schema}.{table_name}")
                
                # 3. 해당 users 테이블의 컬럼 구조 조회
                print(f"\n📊 {schema}.{table_name} 테이블 구조:")
                result = conn.execute(text("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns 
                    WHERE table_schema = :schema AND table_name = :table_name
                    ORDER BY ordinal_position;
                """), {"schema": schema, "table_name": table_name})
                
                print(f"{'컬럼명':<20} {'타입':<15} {'NULL허용':<10} {'기본값'}")
                print("-" * 60)
                for col in result:
                    default = col.column_default or ""
                    if len(default) > 15:
                        default = default[:12] + "..."
                    print(f"{col.column_name:<20} {col.data_type:<15} {col.is_nullable:<10} {default}")
                
                print("\n" + "="*50 + "\n")
            
            # 4. 특히 비밀번호 관련 컬럼 찾기
            print("🔐 비밀번호 관련 컬럼 검색:")
            result = conn.execute(text("""
                SELECT table_schema, table_name, column_name, data_type
                FROM information_schema.columns 
                WHERE table_name = 'users' 
                AND (column_name LIKE '%password%' OR column_name LIKE '%pass%' OR column_name LIKE '%pwd%')
                ORDER BY table_schema, table_name;
            """))
            
            password_columns = result.fetchall()
            if password_columns:
                for col in password_columns:
                    print(f"  - {col.table_schema}.{col.table_name}.{col.column_name} ({col.data_type})")
            else:
                print("❌ 비밀번호 관련 컬럼을 찾을 수 없습니다.")
                
        return True
        
    except Exception as e:
        print(f"❌ 데이터베이스 스키마 확인 실패: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("🔍 Supabase 데이터베이스 스키마 확인 시작...\n")
    success = check_database_schema()
    if success:
        print("\n🎉 스키마 확인이 완료되었습니다!")
    else:
        print("\n💥 스키마 확인이 실패했습니다!") 