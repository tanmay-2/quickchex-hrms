from sqlalchemy.orm import Session
from sqlalchemy import text
from app.models.leave import LeaveBalance
from app.models.profile_model import Profile
from datetime import date, datetime, timedelta

# --- HELPER LOGIC ---

def get_monthly_table_name(date_obj: date):
    """Generates table name like leave_2026_04"""
    return f"leave_{date_obj.year}_{date_obj.month:02d}"

def find_leave_by_id_globally(db: Session, leave_id: int):
    """
    Checks all dynamic monthly tables and static leave_requests table
    to find where this specific leave_id exists.
    """
    table_names = []
    try:
        from sqlalchemy import inspect
        insp = inspect(db.bind)
        for t in insp.get_table_names():
            if t.startswith("leave_20") and t not in table_names:
                table_names.append(t)
    except Exception:
        pass

    today = date.today()
    check_dates = [
        today,
        today.replace(day=1) - timedelta(days=1),
        today.replace(day=28) + timedelta(days=5)
    ]
    for d in check_dates:
        t_name = get_monthly_table_name(d)
        if t_name not in table_names:
            table_names.append(t_name)

    for t_name in table_names:
        try:
            query = text(f"SELECT * FROM {t_name} WHERE id = :id")
            res = db.execute(query, {"id": leave_id}).mappings().first()
            if res:
                return res, t_name
        except Exception:
            continue

    # Also check static leave_requests
    try:
        s_query = text("SELECT * FROM leave_requests WHERE id = :id")
        res = db.execute(s_query, {"id": leave_id}).mappings().first()
        if res:
            return res, "leave_requests"
    except Exception:
        pass

    return None, None

def ensure_leave_table(db: Session, table_name: str):
    """Ensures dynamic monthly leave table exists with proper schema."""
    try:
        is_sqlite = "sqlite" in str(db.bind.url) if db.bind else False
        id_col = "id INTEGER PRIMARY KEY AUTOINCREMENT" if is_sqlite else "id SERIAL PRIMARY KEY"
        create_sql = text(f"""
            CREATE TABLE IF NOT EXISTS {table_name} (
                {id_col},
                emp_code VARCHAR(50) NOT NULL,
                category VARCHAR(50) NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                total_days FLOAT NOT NULL,
                reason TEXT NOT NULL,
                has_half_days BOOLEAN DEFAULT FALSE,
                half_day_details TEXT,
                status VARCHAR(20) DEFAULT 'Pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        db.execute(create_sql)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Warning: ensure_leave_table {table_name} error: {e}")


def _parse_date(val, fallback):
    if not val:
        return fallback
    if isinstance(val, date):
        return val
    if isinstance(val, datetime):
        return val.date()
    val_str = str(val).strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(val_str[:11].strip(), fmt).date()
        except Exception:
            pass
    try:
        from dateutil.parser import parse
        return parse(val_str).date()
    except Exception:
        pass
    return fallback

def create_leave_request(db: Session, obj_in, emp_code: str):
    # Handle dict or Pydantic object
    def _get(field, default=None):
        if isinstance(obj_in, dict):
            return obj_in.get(field, default)
        return getattr(obj_in, field, default)

    start_d = _parse_date(_get("start_date") or _get("from") or _get("fromDate"), date.today())
    end_d = _parse_date(_get("end_date") or _get("to") or _get("toDate"), start_d)
    category = _get("category") or _get("type") or _get("leave_type") or "Casual Leave"
    raw_days = _get("total_days") or _get("days") or 1.0
    try:
        total_days = float(str(raw_days).split()[0])
    except Exception:
        total_days = 1.0

    has_half_days = bool(_get("has_half_days") or _get("halfDay") == "Yes" or total_days == 0.5)
    half_day_details = _get("half_day_details")
    reason = str(_get("reason") or "").strip()

    table_name = get_monthly_table_name(start_d)
    ensure_leave_table(db, table_name)

    params = {
        "code": emp_code,
        "cat": category,
        "start": start_d,
        "end": end_d,
        "days": total_days,
        "half": has_half_days,
        "details": half_day_details,
        "reason": reason
    }

    inserted_record = None

    # 1. Insert into dynamic monthly table
    try:
        query = text(f"""
            INSERT INTO {table_name} 
            (emp_code, category, start_date, end_date, total_days, has_half_days, half_day_details, reason, status)
            VALUES (:code, :cat, :start, :end, :days, :half, :details, :reason, 'Pending')
            RETURNING *;
        """)
        result = db.execute(query, params).mappings().first()
        db.commit()
        if result:
            inserted_record = dict(result)
    except Exception as e:
        db.rollback()
        try:
            query_plain = text(f"""
                INSERT INTO {table_name} 
                (emp_code, category, start_date, end_date, total_days, has_half_days, half_day_details, reason, status)
                VALUES (:code, :cat, :start, :end, :days, :half, :details, :reason, 'Pending');
            """)
            db.execute(query_plain, params)
            db.commit()
        except Exception as err2:
            db.rollback()
            print("Error inserting into monthly leave table:", err2)

    # 2. Insert into static leave_requests table for reliable unique ID retrieval
    try:
        static_query = text("""
            INSERT INTO leave_requests 
            (emp_code, category, start_date, end_date, total_days, has_half_days, half_day_details, reason, status)
            VALUES (:code, :cat, :start, :end, :days, :half, :details, :reason, 'Pending')
            RETURNING *;
        """)
        s_res = db.execute(static_query, params).mappings().first()
        db.commit()
        if s_res:
            inserted_record = dict(s_res)
    except Exception as exc:
        db.rollback()
        print("Error inserting into static leave_requests:", exc)

    if not inserted_record:
        inserted_record = {
            "id": int(datetime.now().timestamp()),
            "emp_code": emp_code,
            "category": category,
            "start_date": start_d,
            "end_date": end_d,
            "total_days": total_days,
            "has_half_days": has_half_days,
            "half_day_details": half_day_details,
            "reason": reason,
            "status": "Pending",
        }

    return {
        **inserted_record,
        "category": category,
        "type": category,
        "leave_type": category,
        "start_date": str(start_d),
        "end_date": str(end_d),
        "from": str(start_d),
        "to": str(end_d),
        "from_date": str(start_d),
        "to_date": str(end_d),
        "days": f"{total_days} days",
        "total_days": total_days,
    }


def get_leave_requests(db: Session, emp_code: str):
    # Fetches from current month's table
    table_name = get_monthly_table_name(date.today())
    
    query = text(f"SELECT * FROM {table_name} WHERE emp_code = :code ORDER BY id DESC")
    try:
        results = db.execute(query, {"code": emp_code}).mappings().all()
        return [dict(r) for r in results]
    except Exception:
        return []


def get_team_leaves(db: Session, tl_emp_code: str):
    table_name = get_monthly_table_name(date.today())
    
    # Joining Dynamic Leave table with Static Profile table
    query = text(f"""
        SELECT l.*, p.first_name, p.last_name, p.designation, p.role
        FROM {table_name} l
        JOIN profile_master p ON l.emp_code = p.emp_code
        WHERE p.reporting_supervisor = :tl_code
        ORDER BY l.id DESC
    """)
    
    try:
        results = db.execute(query, {"tl_code": tl_emp_code}).mappings().all()
        
        formatted_data = []
        for r in results:
            formatted_data.append({
                "id": r["id"],
                "empCode": r["emp_code"],
                "name": f"{r['first_name'] or ''} {r['last_name'] or ''}".strip() or "Unknown",
                "role": r["designation"] or r["role"] or "Employee",
                "category": r["category"],
                "startDate": r["start_date"],
                "endDate": r["end_date"],
                "totalDays": r["total_days"],
                "status": r["status"],
                "reason": r["reason"]
            })
        return formatted_data
    except Exception as e:
        print(f"SQL ERROR in get_team_leaves: {e}")
        return []


def get_leave_stats(db: Session, emp_code: str):
    table_name = get_monthly_table_name(date.today())
    
    # 1. Count pending using raw SQL
    try:
        p_query = text(f"SELECT COUNT(*) FROM {table_name} WHERE emp_code = :code AND status = 'Pending'")
        pending_count = db.execute(p_query, {"code": emp_code}).scalar() or 0
    except Exception:
        pending_count = 0

    # 2. Get/Create Balance using ORM (static table)
    balance = db.query(LeaveBalance).filter(LeaveBalance.emp_code == emp_code).first()
    if not balance:
        balance = LeaveBalance(emp_code=emp_code, allowed_leaves=21.0, used_leaves=0.0)
        db.add(balance)
        db.commit()
        db.refresh(balance)

    available = balance.allowed_leaves - balance.used_leaves
    return {"pending_count": pending_count, "available_balance": available}


def update_leave_status(db: Session, leave_id: int, new_status: str):
    leave = None
    table_name = None

    # 1. First check static leave_requests by id
    try:
        s_res = db.execute(text("SELECT * FROM leave_requests WHERE id = :id"), {"id": int(leave_id)}).mappings().first()
        if s_res:
            leave = dict(s_res)
            table_name = "leave_requests"
    except Exception:
        pass

    # 2. Fallback to global search across dynamic tables
    if not leave:
        leave, table_name = find_leave_by_id_globally(db, leave_id)
    
    if not leave:
        return None

    emp_code = leave.get("emp_code")
    raw_days = leave.get("total_days") or 1.0
    try:
        total_days = float(raw_days)
    except Exception:
        total_days = 1.0

    start_date = leave.get("start_date")

    # Update in leave_requests
    try:
        db.execute(text("UPDATE leave_requests SET status = :status WHERE id = :id OR (emp_code = :code AND start_date = :start)"), {
            "status": new_status,
            "id": leave.get("id"),
            "code": emp_code,
            "start": start_date
        })
        db.commit()
    except Exception:
        db.rollback()

    # Update in all monthly tables where this leave exists
    table_names = []
    try:
        from sqlalchemy import inspect
        insp = inspect(db.bind)
        for t in insp.get_table_names():
            if t.startswith("leave_20") and t not in table_names:
                table_names.append(t)
    except Exception:
        pass

    for t in table_names:
        try:
            db.execute(text(f"UPDATE {t} SET status = :status WHERE (emp_code = :code AND start_date = :start) OR id = :id"), {
                "status": new_status,
                "code": emp_code,
                "start": start_date,
                "id": leave.get("id")
            })
            db.commit()
        except Exception:
            db.rollback()

    # Deduct leave balance if Approved
    if new_status == "Approved" and emp_code:
        try:
            balance = db.query(LeaveBalance).filter(LeaveBalance.emp_code == emp_code).first()
            if not balance:
                balance = LeaveBalance(emp_code=emp_code, allowed_leaves=21.0, used_leaves=0.0)
                db.add(balance)
            balance.used_leaves = float(balance.used_leaves or 0.0) + total_days
            db.commit()
        except Exception as e:
            db.rollback()
            print("Error updating leave balance on approve:", e)

    return {**dict(leave), "status": new_status}


def get_all_leaves_admin(db: Session):
    """
    Fetches all leave applications across dynamic tables and leave_requests,
    joined with profile_master for Employee and Admin portals.
    Guarantees unique IDs and consistent real-time status.
    """
    # 1. Collect all dynamic monthly tables
    table_names = []
    try:
        from sqlalchemy import inspect
        insp = inspect(db.bind)
        for t in insp.get_table_names():
            if t.startswith("leave_20") and t not in table_names:
                table_names.append(t)
    except Exception:
        pass

    today = date.today()
    for d in [today, today.replace(day=1) - timedelta(days=1), today.replace(day=28) + timedelta(days=5)]:
        t_name = get_monthly_table_name(d)
        if t_name not in table_names:
            table_names.append(t_name)

    # 2. Sync any missing dynamic rows into leave_requests
    for t_name in table_names:
        try:
            rows = db.execute(text(f"SELECT * FROM {t_name}")).mappings().all()
            for r in rows:
                chk = db.execute(text(
                    "SELECT id FROM leave_requests WHERE emp_code = :c AND start_date = :s"
                ), {"c": r.get("emp_code"), "s": r.get("start_date")}).scalar()
                if not chk:
                    db.execute(text("""
                        INSERT INTO leave_requests 
                        (emp_code, category, start_date, end_date, total_days, has_half_days, half_day_details, reason, status)
                        VALUES (:c, :cat, :s, :e, :d, :h, :det, :re, :st)
                    """), {
                        "c": r.get("emp_code"),
                        "cat": r.get("category") or "Casual Leave",
                        "s": r.get("start_date"),
                        "e": r.get("end_date"),
                        "d": float(r.get("total_days") or 1.0),
                        "h": bool(r.get("has_half_days") or False),
                        "det": r.get("half_day_details"),
                        "re": r.get("reason") or "",
                        "st": r.get("status") or "Pending"
                    })
                    db.commit()
        except Exception:
            db.rollback()

    # 3. Read from leave_requests joined with profile_master
    all_leaves = []
    try:
        query = text("""
            SELECT l.*, p.first_name, p.last_name, p.designation, p.department, p.role, p.reporting_supervisor
            FROM leave_requests l
            LEFT JOIN profile_master p ON l.emp_code = p.emp_code
            ORDER BY l.id DESC
        """)
        rows = db.execute(query).mappings().all()
        for r in rows:
            emp_name = f"{r.get('first_name') or ''} {r.get('last_name') or ''}".strip() or r.get("emp_code") or "Employee"
            start_d = r.get("start_date")
            end_d = r.get("end_date")
            start_str = start_d.strftime("%d-%m-%Y") if hasattr(start_d, "strftime") else str(start_d or "")
            end_str = end_d.strftime("%d-%m-%Y") if hasattr(end_d, "strftime") else str(end_d or "")
            t_days = float(r.get("total_days") or 1.0)
            cat = r.get("category") or "Casual Leave"

            all_leaves.append({
                "id": r["id"],
                "emp_code": r.get("emp_code") or "",
                "code": r.get("emp_code") or "",
                "empCode": r.get("emp_code") or "",
                "name": emp_name,
                "employee_name": emp_name,
                "employeeName": emp_name,
                "department": r.get("department") or "General",
                "designation": r.get("designation") or r.get("role") or "Employee",
                "category": cat,
                "type": cat,
                "leave_type": cat,
                "start_date": str(start_d or ""),
                "end_date": str(end_d or ""),
                "startDate": start_str,
                "endDate": end_str,
                "from": start_str,
                "from_date": str(start_d or ""),
                "to": end_str,
                "to_date": str(end_d or ""),
                "total_days": t_days,
                "days": f"{t_days} days",
                "reason": r.get("reason") or "",
                "status": r.get("status") or "Pending",
                "approver": r.get("reporting_supervisor") or "Admin Approver",
                "level": f"Level 1 {r.get('status') or 'Pending'}",
                "location": "Mumbai; Maharashtra",
            })
    except Exception as e:
        print("Error reading leave_requests:", e)

    # Sort descending by start_date / id
    all_leaves.sort(key=lambda x: str(x.get("start_date") or ""), reverse=True)
    return all_leaves