# ==============================================================================
# QUICKCHEX HRMS BACKEND - BASE.PY
# Path: Attendance-portal/backend/app/db/base.py
# Purpose: Database management, migration, or lifecycle initialization module for 'base'.
# ==============================================================================

# app/db/base.py

from sqlalchemy.orm import declarative_base

# Create the Base class that all your models will inherit from
Base = declarative_base()

# 🛑 DO NOT IMPORT YOUR MODELS HERE! 
# (Leave all your model imports inside your init_db.py file to prevent circular import loops)