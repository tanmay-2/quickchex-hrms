# ==============================================================================
# QUICKCHEX HRMS BACKEND - EXCEL_GENERATOR.PY
# Path: Attendance-portal/backend/app/utils/excel_generator.py
# Purpose: Backend module.
# Primary Functions:
#   • generate_monthly_excel()
# ==============================================================================

# Import module io for system functionality
import io
# Import module pandas as pd for system functionality
import pandas as pd
 
# Define generate_monthly_excel function to handle generate monthly excel
def generate_monthly_excel(data):
    """
    Transforms database results into a formatted Excel byte stream.
    Requirement: All employees, Employee Name, Task Description, Date.
    """
    # Convert SQLAlchemy results to a list of dictionaries
    report_list = []
    # Iterate through items in sequence loop
    for row in data:
        # Execute statement to process data and maintain state
        report_list.append({
            # Execute statement to process data and maintain state
            "EMP Code": row.emp_code,
            # Execute statement to process data and maintain state
            "Employee Name": row.employee_name,
            # Execute statement to process data and maintain state
            "Department": row.department,
            # Execute statement to process data and maintain state
            "Designation": row.designation,
            # Execute statement to process data and maintain state
            "Task Date": row.task_date,
            # Execute statement to process data and maintain state
            "Task Title": row.task_title,
            # Execute statement to process data and maintain state
            "Description": row.description,
            # Execute statement to process data and maintain state
            "Status": row.status
        # Execute statement to process data and maintain state
        })
 
    # Create a Pandas DataFrame
    df = pd.DataFrame(report_list)
 
    # Use an in-memory buffer to store the Excel file
    output = io.BytesIO()
   
    # We use xlsxwriter for better formatting options
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        # Invoke df.to_excel to perform operational action
        df.to_excel(writer, index=False, sheet_name='Monthly Tasks')
       
        # Get the xlsxwriter workbook and worksheet objects for formatting
        workbook  = writer.book
        # Set worksheet variable to store worksheet value
        worksheet = writer.sheets['Monthly Tasks']
 
        # Add some basic professional styling
        header_format = workbook.add_format({
            # Execute statement to process data and maintain state
            'bold': True,
            # Execute statement to process data and maintain state
            'text_wrap': True,
            # Execute statement to process data and maintain state
            'valign': 'top',
            # Execute statement to process data and maintain state
            'fg_color': '#D7E4BC',
            # Execute statement to process data and maintain state
            'border': 1
        # Execute statement to process data and maintain state
        })
 
        # Set column widths so the data is readable
        worksheet.set_column('A:B', 15) # Emp Code & Name
        worksheet.set_column('C:D', 20) # Dept & Designation
        worksheet.set_column('E:E', 12) # Date
        worksheet.set_column('F:G', 40) # Title & Description
        worksheet.set_column('H:H', 12) # Status
 
    # Seek to the beginning of the stream so FastAPI can read it
    output.seek(0)
    # Return computed result or response payload to caller
    return output
 