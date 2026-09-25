import datetime
from sqlalchemy import text, create_engine
# from app.db.session import DATABASE_URL # Use your actual connection string
 
# Manual connection for the script
engine = create_engine("postgresql://postgres:root@localhost:5432/attendance_db")
 
def migrate_attendance():
    with engine.connect() as conn:
        # 1. Get all unique month/year combinations from existing data
        print("🔍 Checking existing records...")
        result = conn.execute(text("SELECT DISTINCT EXTRACT(MONTH FROM date) as m, EXTRACT(YEAR FROM date) as y FROM attendance"))
        periods = result.fetchall()
 
        for m, y in periods:
            month_str = f"{int(m):02d}"
            year_val = int(y)
            new_table = f"attendance_{year_val}_{month_str}"
           
            print(f"📦 Migrating data for {month_str}/{year_val} into {new_table}...")
 
            # 2. Create the monthly table if it doesn't exist (using the structure of the old table)
            conn.execute(text(f"CREATE TABLE IF NOT EXISTS {new_table} (LIKE attendance INCLUDING ALL)"))
           
            # 3. Move data
            insert_query = text(f"""
                INSERT INTO {new_table}
                SELECT * FROM attendance
                WHERE EXTRACT(MONTH FROM date) = :m
                AND EXTRACT(YEAR FROM date) = :y
                ON CONFLICT DO NOTHING
            """)
            conn.execute(insert_query, {"m": m, "y": y})
            conn.commit()
            print(f"✅ Migration for {new_table} complete.")
 
        # 4. Rename old table to prevent accidental use
        print("⚠️ Renaming old attendance table to attendance_backup...")
        conn.execute(text("ALTER TABLE attendance RENAME TO attendance_backup"))
        conn.commit()
        print("🚀 All data migrated successfully!")
 
if __name__ == "__main__":
    migrate_attendance()
 