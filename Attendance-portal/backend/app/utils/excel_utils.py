# import io
# import pandas as pd
# from fastapi.responses import StreamingResponse

# def generate_excel_response(data: list[dict], filename: str):
#     """
#     Converts a list of dictionaries into an Excel file and returns a StreamingResponse.
#     Works dynamically for ANY dataset.
#     """
#     # 1. Convert JSON/Dict data to a Pandas DataFrame
#     df = pd.DataFrame(data)

#     # 2. Create an in-memory buffer
#     stream = io.BytesIO()

#     # 3. Write the DataFrame to the buffer
#     with pd.ExcelWriter(stream, engine='xlsxwriter') as writer:
#         df.to_excel(writer, index=False, sheet_name='Data')
        
#         # Optional: Auto-adjust column widths dynamically
#         for column in df:
#             column_length = max(df[column].astype(str).map(len).max(), len(column))
#             col_idx = df.columns.get_loc(column)
#             writer.sheets['Data'].set_column(col_idx, col_idx, column_length + 2)

#     # 4. Rewind the stream to the beginning
#     stream.seek(0)

#     # 5. Return the stream with the correct headers for a forced download
#     headers = {
#         'Content-Disposition': f'attachment; filename="{filename}"'
#     }
    
#     return StreamingResponse(
#         stream, 
#         media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
#         headers=headers
#     )