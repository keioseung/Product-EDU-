import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("DATABASE_URL not found in environment variables")
    # 직접 설정
    DATABASE_URL = "postgresql://postgres.jzfwqunitwpczhartwdh:rhdqngo123@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres"

print(f"Testing connection to: {DATABASE_URL}")

try:
    engine = create_engine(DATABASE_URL)
    
    # 연결 테스트
    with engine.connect() as connection:
        result = connection.execute(text("SELECT 1"))
        print("Database connection successful!")
        
        # prompt 테이블 확인
        result = connection.execute(text("SELECT * FROM prompt LIMIT 1"))
        print("Prompt table exists and accessible!")
        
        # base_content 테이블 확인
        result = connection.execute(text("SELECT * FROM base_content LIMIT 1"))
        print("Base content table exists and accessible!")
        
        # base_content 테이블 구조 확인
        result = connection.execute(text("""
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'base_content'
            ORDER BY ordinal_position
        """))
        
        print("\nBase content table structure:")
        for row in result:
            print(f"  {row[0]}: {row[1]} (nullable: {row[2]})")
        
        # base_content 데이터 확인
        result = connection.execute(text("SELECT id, title, created_at FROM base_content ORDER BY id"))
        print("\nBase content data:")
        for row in result:
            print(f"  ID: {row[0]}, Title: {row[1]}, Created: {row[2]} (type: {type(row[2])})")
            
except Exception as e:
    print(f"Database connection failed: {e}")
    import traceback
    traceback.print_exc() 