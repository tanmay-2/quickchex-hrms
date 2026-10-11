import os, json
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy import create_engine, text
from app.core.security import create_access_token

engine = create_engine(os.getenv('DATABASE_URL'))
conn = engine.connect()

for role_target in ['employee', 'manager']:
    row = conn.execute(text("SELECT * FROM profile_master WHERE role=:r LIMIT 1"), {"r": role_target}).mappings().first()
    if row:
        token = create_access_token({'sub': row['email'], 'role': row['role'], 'emp_code': row['emp_code']})
        name = f"{row['first_name'] or ''} {row['last_name'] or ''}".strip() or row['emp_code']
        u = {
            'id': row['id'],
            'emp_code': row['emp_code'],
            'name': name,
            'email': row['email'],
            'role': row['role'],
            'designation': row.get('designation') or ('Manager' if role_target == 'manager' else 'Employee'),
            'profile_image': row.get('profile_image') or ''
        }
        print(f"=== {role_target.upper()} ===")
        print("TOKEN:", token)
        print("USER_JSON:", json.dumps(u))
