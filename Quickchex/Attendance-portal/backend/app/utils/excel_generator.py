import io
import pandas as pd
 
def generate_monthly_excel(data):
    """
    Transforms database results into a formatted Excel byte stream.
    Requirement: All employees, Employee Name, Task Description, Date.
    """
    # Convert SQLAlchemy results to a list of dictionaries
    report_list = []
    for row in data:
        report_list.append({
            "EMP Code": row.emp_code,
            "Employee Name": row.employee_name,
            "Department": row.department,
            "Designation": row.designation,
            "Task Date": row.task_date,
            "Task Title": row.task_title,
            "Description": row.description,
            "Status": row.status
        })
 
    # Create a Pandas DataFrame
    df = pd.DataFrame(report_list)
 
    # Use an in-memory buffer to store the Excel file
    output = io.BytesIO()
   
    # We use xlsxwriter for better formatting options
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, index=False, sheet_name='Monthly Tasks')
       
        # Get the xlsxwriter workbook and worksheet objects for formatting
        workbook  = writer.book
        worksheet = writer.sheets['Monthly Tasks']
 
        # Add some basic professional styling
        header_format = workbook.add_format({
            'bold': True,
            'text_wrap': True,
            'valign': 'top',
            'fg_color': '#D7E4BC',
            'border': 1
        })
 
        # Set column widths so the data is readable
        worksheet.set_column('A:B', 15) # Emp Code & Name
        worksheet.set_column('C:D', 20) # Dept & Designation
        worksheet.set_column('E:E', 12) # Date
        worksheet.set_column('F:G', 40) # Title & Description
        worksheet.set_column('H:H', 12) # Status
 
    # Seek to the beginning of the stream so FastAPI can read it
    output.seek(0)
    return output
 