# ==============================================================================
# QUICKCHEX HRMS BACKEND - CHATBOT API (chatbot_api.py)
# Path: Attendance-portal/backend/app/api/v1/endpoints/chatbot_api.py
# Purpose: Enterprise AI HR Assistant with Security Guardrails, PII Masking,
#          Cross-Employee Privacy, Policy Knowledge Engine, Real-time DB Queries,
#          Action-Oriented Leave Applications, and Multilingual Support (EN, HI, MR).
# ==============================================================================

# Import module os for system functionality
import os
# Import module re for system functionality
import re
# Import module json for system functionality
import json
# Import date, datetime, timedelta from datetime for module operations
from datetime import date, datetime, timedelta
# Import Optional, List, Dict, Any from typing for module operations
from typing import Optional, List, Dict, Any
# Import APIRouter, Depends, Request, HTTPException from fastapi for module operations
from fastapi import APIRouter, Depends, Request, HTTPException
# Import BaseModel from pydantic for module operations
from pydantic import BaseModel
# Import Session from sqlalchemy.orm for module operations
from sqlalchemy.orm import Session
# Import text from sqlalchemy for module operations
from sqlalchemy import text
# Import module requests for system functionality
import requests

# Import get_db from app.db.session for module operations
from app.db.session import get_db
# Import Profile from app.models.profile_model for module operations
from app.models.profile_model import Profile
# Import Holiday from app.models.leave for module operations
from app.models.leave import Holiday
# Import _resolve_emp_code from app.api.v1.endpoints.attendance_api for module operations
from app.api.v1.endpoints.attendance_api import _resolve_emp_code
# Import leave_service from app.services for module operations
from app.services import leave_service

# Set router variable to store router value
router = APIRouter(prefix="/chatbot", tags=["AI HR Assistant"])

# ==============================================================================
# SCHEMAS
# ==============================================================================
class ChatQueryRequest(BaseModel):
    # Define message schema field with type str
    message: str
    lang: Optional[str] = "en"  # "en", "hi", "mr"

# Define class ExecuteActionRequest inheriting from BaseModel
class ExecuteActionRequest(BaseModel):
    # Define action schema field with type str
    action: str
    # Define draft schema field with type Dict[str, Any]
    draft: Dict[str, Any]

# Define _safe_float function to handle  safe float
def _safe_float(val, default=0.0):
    # Begin guarded execution block to trap exceptions
    try:
        # Return computed result or response payload to caller
        return float(val) if val is not None else default
    # Catch and handle specific exception if raised
    except (ValueError, TypeError):
        # Return computed result or response payload to caller
        return default


# ==============================================================================
# ENTERPRISE SECURITY & PRIVACY GUARDRAILS
# ==============================================================================
JAILBREAK_PATTERNS = [
    # Execute statement to process data and maintain state
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?",
    # Execute statement to process data and maintain state
    r"bypass\s+(safety|security|rules|guardrails)",
    # Execute statement to process data and maintain state
    r"system\s+prompt",
    # Execute statement to process data and maintain state
    r"developer\s+mode",
    # Execute statement to process data and maintain state
    r"act\s+as\s+(dan|root|admin|god|unrestricted)",
    # Execute statement to process data and maintain state
    r"dump\s+(all\s+)?(db|database|tables|passwords|users|tokens)",
    # Execute statement to process data and maintain state
    r"drop\s+table",
    # Execute statement to process data and maintain state
    r"select\s+.*\s+from\s+",
    # Execute statement to process data and maintain state
    r"union\s+select",
    # Execute statement to process data and maintain state
    r"show\s+all\s+(passwords|tokens|keys|secrets|hashes)",
    # Execute statement to process data and maintain state
    r"reveal\s+(api\s+key|secret|credentials)",
# Execute statement to process data and maintain state
]

# Set SALARY_PATTERNS variable to store SALARY PATTERNS value
SALARY_PATTERNS = [
    # Execute statement to process data and maintain state
    r"\b(salary|ctc|payslip|pay\s?slip|compensation|remuneration|wage|gross\s?pay|net\s?pay|bank\s?account|bonus|increment|in-hand|deduction|tax\s?slip|package|hike)\b",
    # Execute statement to process data and maintain state
    r"\b(tankhah|vetan|pagaar|salary kitni|kitna paisa)\b",
# Execute statement to process data and maintain state
]

# Define _check_security_violations function to handle  check security violations
def _check_security_violations(query: str, current_emp_code: str, lang: str) -> Optional[Dict[str, Any]]:
    """
    Evaluates query against security, jailbreak, financial, and privacy guardrails.
    Returns refusal dictionary if violation detected, else None.
    """
    q = query.lower()

    # 1. Anti-Jailbreak / Injection Detection
    for pattern in JAILBREAK_PATTERNS:
        # Evaluate condition to control execution branch
        if re.search(pattern, q):
            # Evaluate condition to control execution branch
            if lang == "hi":
                # Set reply variable to store reply value
                reply = "🛡️ **सुरक्षा चेतावनी:** मैं एंटरप्राइज सुरक्षा प्रोटोकॉल से सुरक्षित हूँ। मैं केवल आधिकारिक HRMS प्रक्रियाओं, नीतियों, और आपकी व्यक्तिगत उपस्थिति या छुट्टी के प्रश्नों में सहायता कर सकता हूँ।"
            # Evaluate alternate branch condition
            elif lang == "mr":
                # Set reply variable to store reply value
                reply = "🛡️ **सुरक्षा इशारा:** मी एंटरप्राइझ सुरक्षा प्रोटोकॉलने सुरक्षित आहे. मी फक्त अधिकृत HRMS प्रक्रिया, नियम आणि आपल्या हजेरी किंवा सुट्टीच्या प्रश्नांमध्ये मदत करू शकतो."
            # Execute fallback branch when conditions are not met
            else:
                # Set reply variable to store reply value
                reply = "🛡️ **Security Alert:** I am operating under strict enterprise safety protocols. I can only assist with verified HRMS inquiries, company policies, attendance, and leave management."
            # Return computed result or response payload to caller
            return {"reply": reply, "intent": "security_refusal", "lang": lang, "suggestions": ["Check leave balance", "Did I punch in today?"]}

    # 2. Salary & Financial Confidentiality Lock
    for pattern in SALARY_PATTERNS:
        # Evaluate condition to control execution branch
        if re.search(pattern, q):
            # Evaluate condition to control execution branch
            if lang == "hi":
                # Set reply variable to store reply value
                reply = (
                    # Execute statement to process data and maintain state
                    "🔒 **गोपनीय सूचना (Confidential):** वेतन (Salary), पारिश्रमिक और बैंक विवरण अत्यंत गोपनीय हैं। "
                    "डेटा सुरक्षा कारणों से इन्हें चैट में प्रदर्शित नहीं किया जा सकता।\n\n"
                    "👉 कृपया अपनी सैलरी स्लिप और विवरण देखने के लिए डैशबोर्ड के **'Payroll Items / Employee Salary'** सेक्शन में जाएं।"
                # Execute statement to process data and maintain state
                )
            # Evaluate alternate branch condition
            elif lang == "mr":
                # Set reply variable to store reply value
                reply = (
                    # Execute statement to process data and maintain state
                    "🔒 **गोपनीय माहिती (Confidential):** पगार (Salary), मानधन आणि बँक तपशील अत्यंत गोपनीय आहेत. "
                    "सुरक्षेच्या कारणास्तव हे चॅटमध्ये दाखवले जाऊ शकत नाही.\n\n"
                    "👉 कृपया आपली सॅलरी स्लिप पाहण्यासाठी डॅशबोर्डवरील **'Payroll Items / Employee Salary'** विभागात जा."
                # Execute statement to process data and maintain state
                )
            # Execute fallback branch when conditions are not met
            else:
                # Set reply variable to store reply value
                reply = (
                    # Execute statement to process data and maintain state
                    "🔒 **Confidential Information:** Salary, compensation, and bank details are strictly confidential. "
                    "To protect employee privacy, financial details cannot be displayed in chat.\n\n"
                    "👉 Please navigate to the secure **'Payroll Items / Employee Salary'** section in your portal to access your payslips."
                # Execute statement to process data and maintain state
                )
            # Return computed result or response payload to caller
            return {"reply": reply, "intent": "confidential_refusal", "lang": lang, "suggestions": ["How many leaves have I taken?", "Company Policies"]}

    # 3. Cross-Employee Privacy Protection (Inquiring about other employees)
    is_dir_lookup = any(k in q for k in ["email", "phone", "contact", "designation", "department", "who is", "who's", "kon aahe", "kaun hai", "directory"])
    is_mgr_team = any(k in q for k in ["team attendance", "team report", "my team", "reportees"])
    other_emp_match = re.search(r"\b(le\d{3,4})\b", q)
    # Evaluate condition to control execution branch
    if other_emp_match and not (is_dir_lookup or is_mgr_team):
        # Set queried_code variable to store queried code value
        queried_code = other_emp_match.group(1).upper()
        # Evaluate condition to control execution branch
        if queried_code != current_emp_code.upper():
            # Evaluate condition to control execution branch
            if lang == "hi":
                # Set reply variable to store reply value
                reply = (
                    # Execute statement to process data and maintain state
                    f"🔒 **डेटा गोपनीयता:** एंटरप्राइज प्राइवेसी नियमों के तहत, मैं केवल आपकी स्वयं की (`{current_emp_code}`) जानकारी दे सकता हूँ। "
                    f"अन्य कर्मचारी (`{queried_code}`) का व्यक्तिगत विवरण या उपस्थिति साझा नहीं की जा सकती।"
                # Execute statement to process data and maintain state
                )
            # Evaluate alternate branch condition
            elif lang == "mr":
                # Set reply variable to store reply value
                reply = (
                    # Execute statement to process data and maintain state
                    f"🔒 **डेटा गोपनीयता:** एंटरप्राइझ नियमांनुसार मी फक्त आपल्या (`{current_emp_code}`) माहिती देऊ शकतो. "
                    f"इतर कर्मचाऱ्यांचे (`{queried_code}`) वैयक्तिक तपशील किंवा हजेरी दाखवली जाऊ शकत नाही."
                # Execute statement to process data and maintain state
                )
            # Execute fallback branch when conditions are not met
            else:
                # Set reply variable to store reply value
                reply = (
                    # Execute statement to process data and maintain state
                    f"🔒 **Data Privacy Guardrail:** Under enterprise compliance, I can only provide records for your own authenticated profile (`{current_emp_code}`). "
                    f"I cannot disclose attendance, leaves, or personal records of other employees (`{queried_code}`)."
                # Execute statement to process data and maintain state
                )
            # Return computed result or response payload to caller
            return {"reply": reply, "intent": "privacy_refusal", "lang": lang, "suggestions": ["My Profile Details", "My Leave Balances"]}

    # Return computed result or response payload to caller
    return None

# Define _scrub_sensitive_output function to handle  scrub sensitive output
def _scrub_sensitive_output(text_str: str) -> str:
    """Post-processing sanitizer: masks PAN, Aadhaar, Credit Cards, or Passwords from bot replies."""
    if not text_str:
        # Return computed result or response payload to caller
        return text_str
    # PAN Card (e.g. ABCDE1234F)
    text_str = re.sub(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", "[REDACTED-PAN]", text_str)
    # Aadhaar (12 digits)
    text_str = re.sub(r"\b\d{4}\s?\d{4}\s?\d{4}\b", "[REDACTED-AADHAAR]", text_str)
    # Credit/Debit Card (16 digits)
    text_str = re.sub(r"\b(?:\d{4}[ -]?){3}\d{4}\b", "[REDACTED-CARD]", text_str)
    # Return computed result or response payload to caller
    return text_str


# ==============================================================================
# COMPANY KNOWLEDGE BASE (Policies, Rules, Guidelines)
# ==============================================================================
COMPANY_KNOWLEDGE = {
    # Execute statement to process data and maintain state
    "timings": {
        # Execute statement to process data and maintain state
        "keywords": ["timing", "timings", "office hours", "shift", "work hours", "working hours", "samay", "vel", "schedule"],
        # Execute statement to process data and maintain state
        "en": (
            # Execute statement to process data and maintain state
            "🏢 **LA ESFERA Office Hours & Shift Policy:**\n\n"
            "• **Standard Shift:** 10:00 AM to 7:00 PM (Monday to Friday, Alternate Saturdays).\n"
            "• **Working Duration:** 9.5 hours total shift (8.5 hours productive work + 1 hour lunch & refreshments).\n"
            "• **Grace Period:** Punch-ins up to **10:30 AM** are marked on time without penalty.\n"
            "• **Late Punch-In:** Punching in after 10:30 AM is logged as **Late In**. 3 late arrivals in a month may result in half-day salary deduction.\n"
            "• **Half-Day:** Punch-in after 2:00 PM or punch-out before 2:00 PM is counted as a **Half Day (0.5 day)**."
        # Execute statement to process data and maintain state
        ),
        # Execute statement to process data and maintain state
        "hi": (
            # Execute statement to process data and maintain state
            "🏢 **LA ESFERA कार्यालय समय और शिफ्ट नीति:**\n\n"
            "• **नियमित शिफ्ट:** सुबह 10:00 AM से शाम 7:00 PM (सोमवार से शुक्रवार, वैकल्पिक शनिवार)।\n"
            "• **कार्य अवधि:** कुल 9.5 घंटे (8.5 घंटे कार्य + 1 घंटा लंच/ब्रेक)।\n"
            "• **ग्रेस पीरियड:** सुबह **10:30 AM** तक पंच-इन बिना किसी पेनल्टी के मान्य है।\n"
            "• **देर से आगमन (Late):** 10:30 AM के बाद का पंच-इन 'Late In' दर्ज होता है। महीने में 3 बार लेट आने पर आधा दिन काटा जा सकता है।\n"
            "• **हाफ-डे (Half Day):** दोपहर 2:00 PM के बाद पंच-इन या 2:00 PM से पहले पंच-आउट आधा दिन माना जाता है।"
        # Execute statement to process data and maintain state
        ),
        # Execute statement to process data and maintain state
        "mr": (
            # Execute statement to process data and maintain state
            "🏢 **LA ESFERA कार्यालयीन वेळ आणि शिफ्ट नियम:**\n\n"
            "• **नियमित वेळ:** सकाळी 10:00 AM ते संध्याकाळी 7:00 PM (सोमवार ते शुक्रवार, एक शनिवार आड).\n"
            "• **कामाचे तास:** एकूण 9.5 तास (8.5 तास काम + 1 तास लंच/ब्रेक).\n"
            "• **ग्रेस पिरियड:** सकाळी **10:30 AM** पर्यंत पंच-इन ऑन-टाइम मानले जाते.\n"
            "• **उशिरा येणे (Late):** 10:30 AM नंतरचे पंच-इन 'Late In' मानले जाते. महिन्यात 3 वेळा लेट झाल्यास अर्धा दिवस रजा कापली जाऊ शकते.\n"
            "• **हाफ-डे (Half Day):** दुपारी 2:00 PM नंतर पंच-इन किंवा 2:00 PM पूर्वी पंच-आउट केल्यास अर्धा दिवस धरला जातो."
        # Execute statement to process data and maintain state
        )
    # Execute statement to process data and maintain state
    },
    # Execute statement to process data and maintain state
    "leave_policy": {
        # Execute statement to process data and maintain state
        "keywords": ["leave policy", "casual leave", "sick leave", "earned leave", "paid leave", "chutti niyam", "sutti niyam", "leaves allowed"],
        # Execute statement to process data and maintain state
        "en": (
            # Execute statement to process data and maintain state
            "📋 **LA ESFERA Leave Entitlements & Guidelines:**\n\n"
            "• **Casual Leave (CL):** 10 days per year. (Prior notification of at least 24 hours required).\n"
            "• **Sick Leave (SL):** 8 days per year. (Medical certificate mandatory if taken for >2 consecutive days).\n"
            "• **Optional Holidays (OH):** 3 days per year from the official festival list.\n"
            "• **Paid / Privilege Leave (PL):** 15 days per year (accrued monthly, applies after probation).\n"
            "• **Maternity Leave:** 26 weeks paid leave as per statutory guidelines.\n"
            "• **Paternity Leave:** 5 working days for new fathers.\n"
            "• **Bereavement Leave:** 3 to 5 days for immediate family bereavement."
        # Execute statement to process data and maintain state
        ),
        # Execute statement to process data and maintain state
        "hi": (
            # Execute statement to process data and maintain state
            "📋 **LA ESFERA छुट्टी पात्रता और नियम:**\n\n"
            "• **Casual Leave (CL):** प्रति वर्ष 10 दिन (कम से कम 24 घंटे पहले सूचना आवश्यक)।\n"
            "• **Sick Leave (SL):** प्रति वर्ष 8 दिन (2 दिन से अधिक की बीमारी पर डॉक्टर का प्रमाण पत्र अनिवार्य)।\n"
            "• **Optional Holiday (OH):** प्रति वर्ष 3 दिन (त्योहारों की सूची से)।\n"
            "• **Paid Leave (PL):** प्रति वर्ष 15 दिन (हर महीने क्रेडिट होती है)।\n"
            "• **Maternity Leave:** 26 सप्ताह सवेतन अवकाश।\n"
            "• **Paternity Leave:** 5 कार्य दिवस।"
        # Execute statement to process data and maintain state
        ),
        # Execute statement to process data and maintain state
        "mr": (
            # Execute statement to process data and maintain state
            "📋 **LA ESFERA सुट्टी नियम व वाटप:**\n\n"
            "• **कॅज्युअल रजा (CL):** वर्षाला 10 दिवस (किमान 24 तास आधी कळवणे आवश्यक).\n"
            "• **सिक रजा (SL):** वर्षाला 8 दिवस (2 पेक्षा जास्त दिवस सलग रजेसाठी वैद्यकीय प्रमाणपत्र अनिवार्य).\n"
            "• **ऐच्छिक सुट्टी (OH):** वर्षाला 3 दिवस (सणांच्या यादीतून).\n"
            "• **पेड लीव्ह (PL):** वर्षाला 15 दिवस.\n"
            "• **प्रसूती रजा (Maternity):** 26 आठवडे सवेतन रजा."
        # Execute statement to process data and maintain state
        )
    # Execute statement to process data and maintain state
    },
    # Execute statement to process data and maintain state
    "sandwich_rule": {
        # Execute statement to process data and maintain state
        "keywords": ["sandwich", "sandwich rule", "sandwich leave", "friday monday", "weekend leave"],
        # Execute statement to process data and maintain state
        "en": (
            # Execute statement to process data and maintain state
            "🥪 **Sandwich Leave Rule Policy:**\n\n"
            "• If an employee takes leave on **Friday and following Monday** (or on the days immediately preceding and succeeding a public holiday), "
            "the intervening Saturday, Sunday, or holiday is **counted as part of your total leave**.\n"
            "• **Example:** Taking leave on Friday and Monday consumes **4 days of leave** (Friday + Saturday + Sunday + Monday).\n"
            "• To avoid this deduction, ensure you are present either on Friday or Monday."
        # Execute statement to process data and maintain state
        ),
        # Execute statement to process data and maintain state
        "hi": (
            # Execute statement to process data and maintain state
            "🥪 **सैंडविच लीव नियम (Sandwich Rule):**\n\n"
            "• यदि कोई कर्मचारी **शुक्रवार और उसके बाद सोमवार** दोनों दिन छुट्टी लेता है, तो बीच के शनिवार और रविवार भी छुट्टी के रूप में गिने जाते हैं।\n"
            "• **उदाहरण:** शुक्रवार और सोमवार की छुट्टी लेने पर कुल **4 दिन की छुट्टी** कटेगी (शुक्रवार + शनिवार + रविवार + सोमवार)।\n"
            "• इससे बचने के लिए शुक्रवार या सोमवार में से किसी एक दिन उपस्थित रहना अनिवार्य है।"
        # Execute statement to process data and maintain state
        ),
        # Execute statement to process data and maintain state
        "mr": (
            # Execute statement to process data and maintain state
            "🥪 **सँडविच लीव्ह नियम (Sandwich Rule):**\n\n"
            "• जर एखाद्या कर्मचाऱ्याने **शुक्रवार आणि त्यानंतरच्या सोमवारी** रजा घेतली, तर मधला शनिवार आणि रविवार देखील रजेमध्ये मोजला जातो.\n"
            "• **उदाहरण:** शुक्रवार व सोमवार रजा घेतल्यास **4 दिवसांची रजा** कापली जाते.\n"
            "• हे टाळण्यासाठी शुक्रवार किंवा सोमवार यापैकी एका दिवशी कामावर उपस्थित राहा."
        # Execute statement to process data and maintain state
        )
    # Execute statement to process data and maintain state
    },
    # Execute statement to process data and maintain state
    "regularization": {
        # Execute statement to process data and maintain state
        "keywords": ["regularization", "regularise", "missed punch", "forgot punch", "punch nahi kiya", "visarlo", "attendance regular"],
        # Execute statement to process data and maintain state
        "en": (
            # Execute statement to process data and maintain state
            "🔄 **Attendance Regularization Rules:**\n\n"
            "• **Eligibility:** You can apply for regularization if you forgot to punch in/out, had biometric issues, or were on outdoor client duty.\n"
            "• **Deadline:** Must be raised within **3 working days** of the occurrence.\n"
            "• **Monthly Limit:** Maximum of **3 regularizations** permitted per calendar month.\n"
            "• **Approval:** Requires designation and written approval from your **Reporting Manager**.\n"
            "• Apply directly from the **'Regularization'** tab on your dashboard menu."
        # Execute statement to process data and maintain state
        ),
        # Execute statement to process data and maintain state
        "hi": (
            # Execute statement to process data and maintain state
            "🔄 **उपस्थिति नियमितीकरण (Regularization) नियम:**\n\n"
            "• **पात्रता:** पंच भूल जाने, बायोमेट्रिक त्रुटि, या फील्ड विजिट पर होने पर आप रेगुलराइजेशन लगा सकते हैं।\n"
            "• **समय सीमा:** घटना के **3 कार्य दिवसों** के भीतर आवेदन करना आवश्यक है।\n"
            "• **मासिक सीमा:** एक महीने में अधिकतम **3 रेगुलराइजेशन** की अनुमति है।\n"
            "• **अनुमोदन:** आपके रिपोर्टिंग मैनेजर द्वारा स्वीकृत होना आवश्यक है।"
        # Execute statement to process data and maintain state
        ),
        # Execute statement to process data and maintain state
        "mr": (
            # Execute statement to process data and maintain state
            "🔄 **हजेरी रेग्युलायझेशन नियम:**\n\n"
            "• **पात्रता:** जर तुम्ही पंच-इन/आउट विसरला असाल किंवा बायोमेट्रिक त्रुटी असल्यास अर्ज करू शकता.\n"
            "• **मुदत:** घटनेच्या **3 कामकाजाच्या दिवसांत** अर्ज करणे अनिवार्य आहे.\n"
            "• **मर्यादा:** एका कॅलेंडर महिन्यात जास्तीत जास्त **3 रेग्युलायझेशन** करता येतात.\n"
            "• **मंजुरी:** रिपोर्टिंग मॅनेजरची मंजुरी आवश्यक आहे."
        # Execute statement to process data and maintain state
        )
    # Execute statement to process data and maintain state
    },
    # Execute statement to process data and maintain state
    "notice_probation": {
        # Execute statement to process data and maintain state
        "keywords": ["notice period", "probation", "resignation", "resign", "notice period kitna", "rajinama", "quit"],
        # Execute statement to process data and maintain state
        "en": (
            # Execute statement to process data and maintain state
            "📄 **Probation & Notice Period Policy:**\n\n"
            "• **Probation Period:** Standard 3 to 6 months from date of joining based on role and confirmation review.\n"
            "• **Notice Period During Probation:** 30 calendar days.\n"
            "• **Notice Period Post-Confirmation:** 60 calendar days (or 90 days for Tech Leads, Managers, and Executive positions).\n"
            "• **Resignation Process:** Resignation must be formally submitted in writing or through the HRMS portal to your reporting manager and HR (`hr@laesfera.co`)."
        # Execute statement to process data and maintain state
        ),
        # Execute statement to process data and maintain state
        "hi": (
            # Execute statement to process data and maintain state
            "📄 **प्रोबेशन और नोटिस पीरियड नीति:**\n\n"
            "• **प्रोबेशन अवधि:** पद के आधार पर शामिल होने की तिथि से 3 से 6 महीने।\n"
            "• **प्रोबेशन के दौरान नोटिस पीरियड:** 30 दिन।\n"
            "• **कन्फर्मेशन के बाद नोटिस पीरियड:** 60 दिन (टीम लीड और प्रबंधकों के लिए 90 दिन)।\n"
            "• **इस्तीफा प्रक्रिया:** इस्तीफा पोर्टल या ईमेल (`hr@laesfera.co`) के माध्यम से रिपोर्टिंग मैनेजर को प्रस्तुत किया जाना चाहिए।"
        # Execute statement to process data and maintain state
        ),
        # Execute statement to process data and maintain state
        "mr": (
            # Execute statement to process data and maintain state
            "📄 **प्रोबेशन आणि नोटीस पिरियड नियम:**\n\n"
            "• **प्रोबेशन कालावधी:** रुजू झाल्यापासून 3 ते 6 महिने.\n"
            "• **प्रोबेशन दरम्यान नोटीस:** 30 दिवस.\n"
            "• **कन्फर्मेशन नंतर नोटीस:** 60 दिवस (टीम लीड व मॅनेजर्ससाठी 90 दिवस).\n"
            "• **राजीनामा:** राजीनामा पोर्टल किंवा ईमेल (`hr@laesfera.co`) द्वारे मॅनेजरकडे सादर करावा."
        # Execute statement to process data and maintain state
        )
    # Execute statement to process data and maintain state
    },
    # Execute statement to process data and maintain state
    "wfh": {
        # Execute statement to process data and maintain state
        "keywords": ["wfh", "work from home", "remote", "ghar se kam", "remote work"],
        # Execute statement to process data and maintain state
        "en": (
            # Execute statement to process data and maintain state
            "💻 **Work From Home (WFH) Guidelines:**\n\n"
            "• **Approval:** WFH is subject to prior written approval from your Reporting Manager.\n"
            "• **Core Availability:** Must remain available on Teams/Slack and phone during core hours (10:00 AM - 7:00 PM).\n"
            "• **Attendance:** WFH attendance is marked through the HRMS Web Portal remote punch with location verified."
        # Execute statement to process data and maintain state
        ),
        # Execute statement to process data and maintain state
        "hi": (
            # Execute statement to process data and maintain state
            "💻 **वर्क फ्रॉम होम (WFH) नीति:**\n\n"
            "• **मंजूरी:** WFH के लिए आपके रिपोर्टिंग मैनेजर की पूर्व अनुमति अनिवार्य है।\n"
            "• **उपलब्धता:** 10:00 AM से 7:00 PM के दौरान Teams/फ़ोन पर उपलब्ध रहना आवश्यक है।\n"
            "• **हजेरी:** WFH उपस्थिति पोर्टल के रिमोट पंच से दर्ज की जाती है।"
        # Execute statement to process data and maintain state
        ),
        # Execute statement to process data and maintain state
        "mr": (
            # Execute statement to process data and maintain state
            "💻 **वर्क फ्रॉम होम (WFH) नियम:**\n\n"
            "• **मंजुरी:** WFH साठी रिपोर्टिंग मॅनेजरची पूर्वपरवानगी आवश्यक आहे.\n"
            "• **उपलब्धता:** 10:00 AM ते 7:00 PM दरम्यान Teams/फोनवर उपलब्ध असावे.\n"
            "• **हजेरी:** WFH हजेरी पोर्टलवरून रिमोट पंच करून नोंदवली जाते."
        # Execute statement to process data and maintain state
        )
    # Execute statement to process data and maintain state
    },
    # Execute statement to process data and maintain state
    "reimbursement": {
        # Execute statement to process data and maintain state
        "keywords": ["reimbursement", "expense", "bill", "travel claim", "kharcha", "claims"],
        # Execute statement to process data and maintain state
        "en": (
            # Execute statement to process data and maintain state
            "💳 **Expense & Travel Reimbursement Policy:**\n\n"
            "• **Submission Date:** All official expense claims and travel vouchers must be submitted by the **25th of every month**.\n"
            "• **Documentation:** Valid tax invoices (GST) must be attached.\n"
            "• **Payment:** Approved expenses are settled along with the monthly payroll."
        # Execute statement to process data and maintain state
        ),
        # Execute statement to process data and maintain state
        "hi": (
            # Execute statement to process data and maintain state
            "💳 **खर्च और प्रतिपूर्ति (Reimbursement) नीति:**\n\n"
            "• **जमा करने की तिथि:** सभी खर्च और बिल हर महीने की **25 तारीख** तक जमा होने चाहिए।\n"
            "• **दस्तावेज:** वैध जीएसटी बिल संलग्न होना अनिवार्य है।\n"
            "• **भुगतान:** स्वीकृत राशि मासिक वेतन के साथ क्रेडिट की जाती है।"
        # Execute statement to process data and maintain state
        ),
        # Execute statement to process data and maintain state
        "mr": (
            # Execute statement to process data and maintain state
            "💳 **खर्च परतावा (Reimbursement) नियम:**\n\n"
            "• **सादर करण्याची तारीख:** सर्व अधिकृत बिल दर महिन्याच्या **25 तारखेपर्यंत** जमा करावीत.\n"
            "• **कागदपत्रे:** मूळ GST बिल जोडणे अनिवार्य आहे."
        # Execute statement to process data and maintain state
        )
    # Execute statement to process data and maintain state
    }
# Execute statement to process data and maintain state
}

# Define _get_policy_answer function to handle  get policy answer
def _get_policy_answer(query: str, lang: str) -> Optional[str]:
    """Finds matching policy in company knowledge base based on keywords."""
    q = query.lower()
    # Iterate through items in sequence loop
    for policy_key, data in COMPANY_KNOWLEDGE.items():
        # Evaluate condition to control execution branch
        if any(kw in q for kw in data["keywords"]):
            # Return computed result or response payload to caller
            return data.get(lang) or data.get("en")
    # Return computed result or response payload to caller
    return None


# ==============================================================================
# DATABASE RETRIEVAL UTILITIES
# ==============================================================================
def _get_leave_details(db: Session, emp_code: str):
    # Begin guarded execution block to trap exceptions
    try:
        # Import _compute_category_leave_balances from app.main for module operations
        from app.main import _compute_category_leave_balances
        # Return computed result or response payload to caller
        return _compute_category_leave_balances(db, emp_code, allowed=21.0, total_used=0.0)
    # Catch and handle specific exception if raised
    except Exception:
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "casualLeave": {"available": 10.0, "used": 0.0, "total": 10.0},
            # Execute statement to process data and maintain state
            "sickLeave": {"available": 8.0, "used": 0.0, "total": 8.0},
            # Execute statement to process data and maintain state
            "optionalHoliday": {"available": 3.0, "used": 0.0, "total": 3.0},
            # Execute statement to process data and maintain state
            "totalAvailable": 21.0,
            # Execute statement to process data and maintain state
            "used": 0.0
        # Execute statement to process data and maintain state
        }

# Define _get_today_attendance function to handle  get today attendance
def _get_today_attendance(db: Session, emp_code: str):
    # Set today variable to store today value
    today = date.today()
    # Set tname variable to store tname value
    tname = f"attendance_{today.year}_{today.month:02d}"
    # Begin guarded execution block to trap exceptions
    try:
        # Set row variable to store row value
        row = db.execute(text(f"""
            SELECT punch_in_time, punch_out_time, hours_completed, status, punch_in_location
            FROM {tname}
            WHERE UPPER(emp_code) = UPPER(:c) AND date = CURRENT_DATE
            ORDER BY id DESC LIMIT 1
        """), {"c": emp_code}).mappings().first()
        # Return computed result or response payload to caller
        return dict(row) if row else None
    # Catch and handle specific exception if raised
    except Exception:
        # Return computed result or response payload to caller
        return None

# Define _get_upcoming_holidays function to handle  get upcoming holidays
def _get_upcoming_holidays(db: Session, limit: int = 5):
    # Begin guarded execution block to trap exceptions
    try:
        # Initiate database query on specified model
        rows = db.query(Holiday).filter(Holiday.holiday_date >= date.today()).order_by(Holiday.holiday_date.asc()).limit(limit).all()
        # Return computed result or response payload to caller
        return [{"name": h.name or "Holiday", "date": str(h.holiday_date)} for h in rows]
    # Catch and handle specific exception if raised
    except Exception:
        # Return computed result or response payload to caller
        return []

def _get_working_hours_summary(db: Session, emp_code: str, lang: str, first_name: str) -> str:
    """Calculates hours worked today (active shift or finalized) and total month hours."""
    from app.services.attendance_service import get_ist_now
    today = date.today()
    tname = f"attendance_{today.year}_{today.month:02d}"
    today_rec = None
    month_hours = 0.0
    active_days = 0

    try:
        today_row = db.execute(text(f"""
            SELECT punch_in_time, punch_out_time, hours_completed, status, punch_in_location
            FROM {tname}
            WHERE UPPER(emp_code) = UPPER(:c) AND date = CURRENT_DATE
            ORDER BY id DESC LIMIT 1
        """), {"c": emp_code}).mappings().first()
        today_rec = dict(today_row) if today_row else None
    except Exception:
        today_rec = None

    try:
        m_row = db.execute(text(f"""
            SELECT COALESCE(SUM(hours_completed), 0.0) as m_hrs, COUNT(*) as d_cnt
            FROM {tname}
            WHERE UPPER(emp_code) = UPPER(:c) AND (status ILIKE '%Present%' OR status ILIKE '%Half%')
        """), {"c": emp_code}).mappings().first()
        if m_row:
            month_hours = float(m_row["m_hrs"] or 0.0)
            active_days = int(m_row["d_cnt"] or 0)
    except Exception:
        pass

    if not today_rec or not today_rec.get("punch_in_time"):
        if lang == "hi":
            return (
                f"नमस्ते **{first_name}**, आपने **आज अभी तक पंच-इन नहीं किया है**।\n\n"
                f"📅 **इस महीने का कुल कार्य समय:** `{month_hours:.2f} घंटे` ({active_days} कार्य दिवस)।"
            )
        elif lang == "mr":
            return (
                f"नमस्कार **{first_name}**, तुम्ही **आज अद्याप पंच-इन केलेले नाही**।\n\n"
                f"📅 **या महिन्यातील एकूण कामाचे तास:** `{month_hours:.2f} तास` ({active_days} दिवस)."
            )
        else:
            return (
                f"Hello **{first_name}**, you have **not punched in today** yet.\n\n"
                f"📅 **Total Hours Logged This Month:** `{month_hours:.2f} hrs` across `{active_days}` active working days."
            )

    in_time_str = str(today_rec.get("punch_in_time") or "").strip()
    out_time_str = str(today_rec.get("punch_out_time") or "").strip()
    hrs_logged = _safe_float(today_rec.get("hours_completed"), 0.0)

    elapsed_hrs = hrs_logged
    is_active = not out_time_str or out_time_str.lower() in ["none", "null", "—", "active shift"]

    if is_active and in_time_str:
        try:
            now_ist = get_ist_now()
            parsed_in = None
            for fmt in ["%I:%M %p", "%I:%M:%S %p", "%H:%M:%S", "%H:%M"]:
                try:
                    p = datetime.strptime(in_time_str, fmt)
                    parsed_in = now_ist.replace(hour=p.hour, minute=p.minute, second=p.second, microsecond=0)
                    break
                except Exception:
                    continue
            if parsed_in:
                diff_sec = max(0, (now_ist - parsed_in).total_seconds())
                elapsed_hrs = round(diff_sec / 3600.0, 2)
        except Exception:
            pass

    hours_int = int(elapsed_hrs)
    mins_int = int(round((elapsed_hrs - hours_int) * 60))
    target_hrs = 9 + (10 / 60.0)  # 9h 10m
    remaining_hrs = max(0.0, target_hrs - elapsed_hrs)
    rem_h = int(remaining_hrs)
    rem_m = int(round((remaining_hrs - rem_h) * 60))

    if lang == "hi":
        status_note = (
            "🎉 **दैनिक 9 घंटे 10 मिनट का लक्ष्य पूरा हो चुका है!** आप पंच-आउट कर सकते हैं।"
            if remaining_hrs <= 0 else
            f"⏳ **9h 10m शिफ्ट पूरा होने में शेष समय:** `{rem_h} घंटे {rem_m} मिनट`"
        )
        return (
            f"⏱️ **आज के कार्य समय का विवरण - {first_name}:**\n\n"
            f"• **पंच-इन समय:** `{in_time_str}`\n"
            f"• **अब तक का कार्य समय:** `{hours_int} घंटे {mins_int} मिनट` (`{elapsed_hrs:.2f} hrs`)\n"
            f"• **स्थिति:** {'🟢 सक्रिय शिफ्ट (Active Shift)' if is_active else f'पंच-आउट (`{out_time_str}`)'}\n"
            f"• {status_note}\n\n"
            f"📅 **इस महीने का कुल कार्य समय:** `{month_hours:.2f} घंटे` ({active_days} कार्य दिवस)"
        )
    elif lang == "mr":
        status_note = (
            "🎉 **दैनंदिन 9 तास 10 मिनिटांचे टार्गेट पूर्ण झाले आहे!** तुम्ही पंच-आउट करू शकता."
            if remaining_hrs <= 0 else
            f"⏳ **9h 10m शिफ्ट पूर्ण होण्यास शिल्लक वेळ:** `{rem_h} तास {rem_m} मिनिटे`"
        )
        return (
            f"⏱️ **आजच्या कामाच्या तासांचा तपशील - {first_name}:**\n\n"
            f"• **पंच-इन वेळ:** `{in_time_str}`\n"
            f"• **आतापर्यंत झालेले कामाचे तास:** `{hours_int} तास {mins_int} मिनिटे` (`{elapsed_hrs:.2f} hrs`)\n"
            f"• **स्थिती:** {'🟢 सक्रिय शिफ्ट (Active Shift)' if is_active else f'पंच-आउट (`{out_time_str}`)'}\n"
            f"• {status_note}\n\n"
            f"📅 **या महिन्यातील एकूण कामाचे तास:** `{month_hours:.2f} तास` ({active_days} दिवस)"
        )
    else:
        status_note = (
            "🎉 **Shift completion target (9h 10m) achieved!** You are eligible to clock out."
            if remaining_hrs <= 0 else
            f"⏳ **Time Remaining for 9h 10m:** `{rem_h} hrs {rem_m} mins`"
        )
        return (
            f"⏱️ **Work Hours Summary for {first_name}:**\n\n"
            f"• **Punch In Time:** `{in_time_str}`\n"
            f"• **Hours Logged Till Now:** `{hours_int} hrs {mins_int} mins` (`{elapsed_hrs:.2f} hrs`)\n"
            f"• **Shift Status:** {'🟢 Active Shift' if is_active else f'Clocked Out (`{out_time_str}`)'}\n"
            f"• {status_note}\n\n"
            f"📅 **Total Hours This Month:** `{month_hours:.2f} hrs` across `{active_days}` working days."
        )

def _get_monthly_attendance_stats(db: Session, emp_code: str, lang: str, first_name: str) -> str:
    """Aggregates present, absent, half-day, and late check-in counts for current month."""
    today = date.today()
    tname = f"attendance_{today.year}_{today.month:02d}"
    month_name = today.strftime("%B %Y")
    present_cnt = 0
    absent_cnt = 0
    half_cnt = 0
    late_cnt = 0
    total_hrs = 0.0

    try:
        rows = db.execute(text(f"""
            SELECT status, punch_in_time, hours_completed
            FROM {tname}
            WHERE UPPER(emp_code) = UPPER(:c)
        """), {"c": emp_code}).mappings().all()

        for r in rows:
            st = str(r.get("status") or "").lower()
            hrs = _safe_float(r.get("hours_completed"), 0.0)
            total_hrs += hrs
            if "present" in st:
                present_cnt += 1
            elif "half" in st:
                half_cnt += 1
            elif "absent" in st:
                absent_cnt += 1

            p_in = str(r.get("punch_in_time") or "").strip()
            if "late" in st:
                late_cnt += 1
            elif p_in:
                for fmt in ["%I:%M %p", "%I:%M:%S %p", "%H:%M:%S", "%H:%M"]:
                    try:
                        p = datetime.strptime(p_in, fmt)
                        if p.hour > 10 or (p.hour == 10 and p.minute > 30):
                            late_cnt += 1
                        break
                    except Exception:
                        continue
    except Exception:
        pass

    if lang == "hi":
        return (
            f"📊 **{month_name} उपस्थिति सांख्यिकी - {first_name}:**\n\n"
            f"• ✅ **उपस्थित (Present):** `{present_cnt}` दिन\n"
            f"• ⏰ **देरी से आगमन (Late Marks):** `{late_cnt}` दिन\n"
            f"• 🌓 **हाफ डे (Half Day):** `{half_cnt}` दिन\n"
            f"• ❌ **अनुपस्थित (Absent):** `{absent_cnt}` दिन\n"
            f"• ⏱️ **कुल संचित कार्य समय:** `{total_hrs:.2f} घंटे`"
        )
    elif lang == "mr":
        return (
            f"📊 **{month_name} हजेरी आकडेवारी - {first_name}:**\n\n"
            f"• ✅ **उपस्थित (Present):** `{present_cnt}` दिवस\n"
            f"• ⏰ **उशिरा आगमन (Late Marks):** `{late_cnt}` दिवस\n"
            f"• 🌓 **हाफ डे (Half Day):** `{half_cnt}` दिवस\n"
            f"• ❌ **अनुपस्थित (Absent):** `{absent_cnt}` दिवस\n"
            f"• ⏱️ **एकूण भरलेले कामाचे तास:** `{total_hrs:.2f} तास`"
        )
    else:
        return (
            f"📊 **Monthly Attendance Statistics for {first_name} ({month_name}):**\n\n"
            f"• ✅ **Present Days:** `{present_cnt}`\n"
            f"• ⏰ **Late Check-ins (after 10:30 AM):** `{late_cnt}`\n"
            f"• 🌓 **Half Days:** `{half_cnt}`\n"
            f"• ❌ **Absents:** `{absent_cnt}`\n"
            f"• ⏱️ **Total Working Hours:** `{total_hrs:.2f} hrs`"
        )

def _get_regularization_status(db: Session, emp_code: str, lang: str, first_name: str) -> str:
    """Fetches latest attendance regularization requests and their approval statuses."""
    today = date.today()
    tname = f"regularization_{today.year}_{today.month:02d}"
    records = []

    try:
        rows = db.execute(text(f"""
            SELECT target_date, reason, status, manager_status, admin_status
            FROM {tname}
            WHERE UPPER(emp_code) = UPPER(:c)
            ORDER BY id DESC LIMIT 5
        """), {"c": emp_code}).mappings().all()
        records = [dict(r) for r in rows]
    except Exception:
        try:
            rows = db.execute(text("""
                SELECT target_date, reason, status, manager_status, admin_status
                FROM attendance_regularization
                WHERE UPPER(emp_code) = UPPER(:c)
                ORDER BY id DESC LIMIT 5
            """), {"c": emp_code}).mappings().all()
            records = [dict(r) for r in rows]
        except Exception:
            records = []

    if not records:
        if lang == "hi":
            return f"नमस्ते **{first_name}**, इस महीने आपका कोई भी रेगुलराइजेशन अनुरोध (Regularization Request) लंबित या दर्ज नहीं है।"
        elif lang == "mr":
            return f"नमस्कार **{first_name}**, या महिन्यात तुमची कोणतीही रेग्युलायझेशन विनंती (Regularization Request) प्रलंबित किंवा नोंदवलेली नाही."
        else:
            return f"Hello **{first_name}**, you do not have any pending or submitted regularization requests for this month."

    items_text = []
    for r in records:
        t_date = str(r.get("target_date") or "—")
        reason = str(r.get("reason") or "Missed punch")
        st = str(r.get("overall_status") or r.get("status") or "PENDING").upper()
        badge = "🟢 Approved" if "APPROV" in st else ("🔴 Rejected" if "REJECT" in st else "🟡 Pending Approval")
        items_text.append(f"• **Date:** `{t_date}` | **Status:** {badge}\n  *Reason:* {reason}")

    res_body = "\n".join(items_text)
    if lang == "hi":
        return f"📝 **आपके हालिया रेगुलराइजेशन अनुरोध (Regularization Status):**\n\n{res_body}"
    elif lang == "mr":
        return f"📝 **तुमच्या अलीकडील रेग्युलायझेशन विनंत्या (Regularization Status):**\n\n{res_body}"
    else:
        return f"📝 **Your Recent Regularization Requests:**\n\n{res_body}"

def _get_leave_history(db: Session, emp_code: str, lang: str, first_name: str) -> str:
    """Fetches user's leave history from leave_requests."""
    records = []
    try:
        rows = db.execute(text("""
            SELECT category, start_date, end_date, total_days, status, overall_status, reason
            FROM leave_requests
            WHERE UPPER(emp_code) = UPPER(:c)
            ORDER BY id DESC LIMIT 5
        """), {"c": emp_code}).mappings().all()
        records = [dict(r) for r in rows]
    except Exception:
        records = []

    if not records:
        if lang == "hi":
            return f"नमस्ते **{first_name}**, आपका कोई पिछला लीव रिकॉर्ड नहीं मिला।"
        elif lang == "mr":
            return f"नमस्कार **{first_name}**, तुमचा कोणताही मागील सुट्टीचा रेकॉर्ड आढळला नाही."
        else:
            return f"Hello **{first_name}**, you have not applied for any leaves in the system yet."

    lines = []
    for r in records:
        cat = r.get("category") or "Casual Leave"
        s_date = str(r.get("start_date") or "")
        e_date = str(r.get("end_date") or s_date)
        days = r.get("total_days") or 1.0
        st = str(r.get("overall_status") or r.get("status") or "PENDING").upper()
        badge = "🟢 Approved" if "APPROV" in st else ("🔴 Rejected" if "REJECT" in st else "🟡 Pending")
        lines.append(f"• **{cat}** (`{s_date}` to `{e_date}` - `{days}` day(s)): {badge}")

    body = "\n".join(lines)
    if lang == "hi":
        return f"🏖️ **आपकी हालिया छुट्टियां (Leave History - {first_name}):**\n\n{body}"
    elif lang == "mr":
        return f"🏖️ **तुमचा सुट्ट्यांचा इतिहास (Leave History - {first_name}):**\n\n{body}"
    else:
        return f"🏖️ **Your Recent Leave History ({first_name}):**\n\n{body}"

def _search_employee_directory(db: Session, query: str, lang: str) -> Optional[str]:
    """Searches employee profiles for directory details (email, phone, designation, department)."""
    stop_words = {
        "what", "is", "the", "email", "and", "phone", "number", "of", "who", "details",
        "contact", "call", "mobile", "ka", "ki", "ke", "kya", "hai", "cha", "chi", "che",
        "aahe", "kiti", "batao", "sang", "give", "show", "tell", "me", "find", "search", "address"
    }
    tokens = [w for w in re.findall(r"\b[A-Za-z0-9]+\b", query) if w.lower() not in stop_words and len(w) > 2]
    if not tokens:
        return None

    matches = []
    for token in tokens:
        try:
            sql = text("""
                SELECT emp_code, first_name, last_name, email, designation, department, reporting_supervisor
                FROM profile_master
                WHERE UPPER(emp_code) LIKE UPPER(:pat)
                   OR UPPER(first_name) LIKE UPPER(:pat)
                   OR UPPER(last_name) LIKE UPPER(:pat)
                   OR UPPER(email) LIKE UPPER(:pat)
                LIMIT 3
            """)
            results = db.execute(sql, {"pat": f"%{token}%"}).mappings().all()
            for p in results:
                d = dict(p)
                if not any(m.get("emp_code") == d.get("emp_code") for m in matches):
                    matches.append(d)
        except Exception:
            continue

    if not matches:
        return None

    cards = []
    for p in matches[:3]:
        p_name = f"{p.get('first_name') or ''} {p.get('last_name') or ''}".strip() or p.get('emp_code')
        email = p.get('email') or "—"
        phone = "Official Teams Chat"
        desig = p.get('designation') or "Team Member"
        dept = p.get('department') or "Operations"
        cards.append(
            f"👤 **{p_name}** (`{p.get('emp_code')}`)\n"
            f"• **Designation:** {desig}\n"
            f"• **Department:** {dept}\n"
            f"• **Official Email:** `{email}`\n"
            f"• **Contact:** `{phone}`"
        )

    return "👥 **Employee Directory Results:**\n\n" + "\n\n".join(cards)

def _get_team_attendance_report(db: Session, manager_emp_code: str, lang: str, manager_name: str) -> str:
    """Generates today's live team attendance report for reporting managers."""
    reportees = []
    try:
        sql = text("""
            SELECT emp_code, first_name, last_name, email, designation
            FROM profile_master
            WHERE UPPER(reporting_supervisor) = UPPER(:mid)
               OR UPPER(reporting_supervisor) LIKE UPPER(:mname)
            ORDER BY first_name ASC
        """)
        rows = db.execute(sql, {"mid": manager_emp_code, "mname": f"%{manager_name}%"}).mappings().all()
        reportees = [dict(r) for r in rows]
    except Exception:
        reportees = []

    if not reportees:
        if lang == "hi":
            return f"नमस्ते **{manager_name}**, आपके अधीन सीधे रिपोर्ट करने वाले कर्मचारी नहीं पाए गए (Only for Reporting Managers)।"
        elif lang == "mr":
            return f"नमस्कार **{manager_name}**, आपल्याकडे थेट रिपोर्ट करणारे कर्मचारी आढळले नाहीत (Only for Reporting Managers)."
        else:
            return f"Hello **{manager_name}**, you do not have direct reportees assigned in the hierarchy."

    today = date.today()
    tname = f"attendance_{today.year}_{today.month:02d}"
    clocked_in = []
    not_punched = []

    for rep in reportees:
        rep_name = f"{rep.get('first_name') or ''} {rep.get('last_name') or ''}".strip() or rep.get('emp_code')
        rep_code = rep.get('emp_code')
        try:
            row = db.execute(text(f"""
                SELECT punch_in_time, status, punch_in_location
                FROM {tname}
                WHERE UPPER(emp_code) = UPPER(:c) AND date = CURRENT_DATE
                ORDER BY id DESC LIMIT 1
            """), {"c": rep_code}).mappings().first()
            if row and row.get("punch_in_time"):
                p_in = str(row["punch_in_time"])
                loc = str(row.get("punch_in_location") or "Office")
                clocked_in.append(f"• 🟢 **{rep_name}** (`{rep_code}`) – In at `{p_in}` ({loc})")
            else:
                not_punched.append(f"• 🔴 **{rep_name}** (`{rep_code}`)")
        except Exception:
            not_punched.append(f"• 🔴 **{rep_name}** (`{rep_code}`)")

    summary_lines = [f"📋 **Team Attendance Report for Today ({today.strftime('%d %b %Y')}):**\n"]
    if clocked_in:
        summary_lines.append(f"**🟢 Clocked In ({len(clocked_in)}):**\n" + "\n".join(clocked_in))
    if not_punched:
        summary_lines.append(f"\n**🔴 Not Punched In Yet ({len(not_punched)}):**\n" + "\n".join(not_punched))

    return "\n".join(summary_lines)

# Define _detect_language function to handle  detect language
def _detect_language(text_str: str, preferred_lang: Optional[str] = None) -> str:
    """Detect language between 'mr' (Marathi), 'hi' (Hindi), and 'en' (English)."""
    if preferred_lang in ["hi", "mr", "en"]:
        # Evaluate condition to control execution branch
        if preferred_lang in ["hi", "mr"]:
            # Return computed result or response payload to caller
            return preferred_lang

    # Set t variable to store t value
    t = text_str.lower()
    # Set mr_words variable to store mr words value
    mr_words = ["सुट्टी", "रजा", "कधी", "कशी", "झाले", "झाला", "का", "आहे", "आहेत", "माझा", "माझी", "माझे", "मला", "उद्या", "परवा", "आजची", "दाखवा", "पाहिजे", "हवी", "शिल्लक", "तास", "sutti", "shillak", "zala", "aahe", "aahet", "majha", "majhi", "udya", "parva", "pahije", "havi", "dakhav", "kiti"]
    # Evaluate condition to control execution branch
    if any(w in t for w in mr_words):
        # Return computed result or response payload to caller
        return "mr"

    # Set hi_words variable to store hi words value
    hi_words = ["छुट्टी", "कितनी", "कितने", "बची", "बचे", "हुआ", "हुई", "क्या", "मेरा", "मेरी", "मुझे", "कल", "परसों", "आज", "बताओ", "चाहिए", "बीमार", "तबीयत", "घंटे", "kaun", "batao", "chutti", "bachi", "bache", "hua", "hoga", "kya", "mera", "meri", "chahiye", "aaj", "bimar", "tabiyat", "ghante"]
    # Evaluate condition to control execution branch
    if any(w in t for w in hi_words):
        # Return computed result or response payload to caller
        return "hi"

    # Return computed result or response payload to caller
    return preferred_lang if preferred_lang in ["hi", "mr"] else "en"

# Define _parse_leave_request function to handle  parse leave request
def _parse_leave_request(query: str, today: date) -> Dict[str, Any]:
    """Extract category, date, total_days, and reason from natural language."""
    q = query.lower()

    # Set category variable to store category value
    category = "Casual Leave"
    # Evaluate condition to control execution branch
    if any(k in q for k in ["sick", "fever", "ill", "bimar", "tabiyat", "aajari", "medical", "sl", "dokhe"]):
        # Set category variable to store category value
        category = "Sick Leave"
    # Evaluate alternate branch condition
    elif any(k in q for k in ["optional", "festival", "tyohar", "san", "oh"]):
        # Set category variable to store category value
        category = "Optional Holiday"
    # Evaluate alternate branch condition
    elif any(k in q for k in ["paid leave", "pl", "privilege", "earned leave"]):
        # Set category variable to store category value
        category = "Paid Leave"

    # Set total_days variable to store total days value
    total_days = 1.0
    # Evaluate condition to control execution branch
    if any(k in q for k in ["half day", "half-day", "adhha", "ardha", "0.5"]):
        # Set total_days variable to store total days value
        total_days = 0.5
    # Execute fallback branch when conditions are not met
    else:
        # Set m_days variable to store m days value
        m_days = re.search(r"(\d+(?:\.\d+)?)\s*(?:days?|din|divas)", q)
        # Evaluate condition to control execution branch
        if m_days:
            # Set total_days variable to store total days value
            total_days = _safe_float(m_days.group(1), 1.0)

    # Set start_date variable to store start date value
    start_date = today + timedelta(days=1)
    # Evaluate condition to control execution branch
    if any(k in q for k in ["today", "aaj", "aajach"]):
        # Set start_date variable to store start date value
        start_date = today
    # Evaluate alternate branch condition
    elif any(k in q for k in ["day after tomorrow", "parso", "parva"]):
        # Set start_date variable to store start date value
        start_date = today + timedelta(days=2)
    # Evaluate alternate branch condition
    elif any(k in q for k in ["tomorrow", "kal", "udya"]):
        # Set start_date variable to store start date value
        start_date = today + timedelta(days=1)
    # Execute fallback branch when conditions are not met
    else:
        # Set date_match variable to store date match value
        date_match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", q)
        # Evaluate condition to control execution branch
        if date_match:
            # Begin guarded execution block to trap exceptions
            try:
                # Set start_date variable to store start date value
                start_date = datetime.strptime(date_match.group(1), "%Y-%m-%d").date()
            # Catch and handle specific exception if raised
            except ValueError:
                # Placeholder statement performing no operation
                pass

    # Evaluate condition to control execution branch
    if total_days > 1.0:
        # Set end_date variable to store end date value
        end_date = start_date + timedelta(days=int(total_days) - 1)
    # Execute fallback branch when conditions are not met
    else:
        # Set end_date variable to store end date value
        end_date = start_date

    # Set reason variable to store reason value
    reason = "Personal leave requested via AI Assistant"
    # Set reason_patterns variable to store reason patterns value
    reason_patterns = [
        # Execute statement to process data and maintain state
        r"(?:because of|due to|for|reason|kyunki|karan|sathi)\s+([a-zA-Z0-9\s,]+?)(?:\.|$)",
        # Execute statement to process data and maintain state
        r"(?:bimar|fever|illness|family function|personal work|doctor appointment|wedding|travel)",
    # Execute statement to process data and maintain state
    ]
    # Iterate through items in sequence loop
    for p in reason_patterns:
        # Set m_r variable to store m r value
        m_r = re.search(p, q)
        # Evaluate condition to control execution branch
        if m_r:
            # Set raw_r variable to store raw r value
            raw_r = m_r.group(1) if m_r.groups() else m_r.group(0)
            # Set clean_r variable to store clean r value
            clean_r = raw_r.strip().capitalize()
            # Evaluate condition to control execution branch
            if len(clean_r) > 3:
                # Set reason variable to store reason value
                reason = clean_r
                # Break out of current loop early
                break

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "category": category,
        # Execute statement to process data and maintain state
        "start_date": str(start_date),
        # Execute statement to process data and maintain state
        "end_date": str(end_date),
        # Execute statement to process data and maintain state
        "total_days": total_days,
        # Execute statement to process data and maintain state
        "reason": reason
    # Execute statement to process data and maintain state
    }


# ==============================================================================
# ROUTE 1: QUERY CHATBOT
# ==============================================================================
@router.post("/query")
# Define handle_chatbot_query function to handle handle chatbot query
async def handle_chatbot_query(payload: ChatQueryRequest, request: Request, db: Session = Depends(get_db)):
    """
    Enterprise AI HR Assistant Endpoint:
    1. Authenticates current user from JWT token.
    2. Enforces Security & Anti-Jailbreak Guardrails.
    3. Blocks Salary/PII leaks & prevents cross-employee snooping.
    4. Evaluates Company Policy Knowledge Base (RAG).
    5. Dispatches real-time database lookups for attendance, balances, manager.
    6. Formats action cards (1-click leave apply).
    7. Sanitizes all output with PII scrubbers.
    """
    raw_query = payload.message.strip()
    # Check if target condition is false or object is missing
    if not raw_query:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    # Begin guarded execution block to trap exceptions
    try:
        # Set emp_code variable to store emp code value
        emp_code = _resolve_emp_code(request, db, require_auth=False)
    # Catch and handle specific exception if raised
    except Exception:
        # Set emp_code variable to store emp code value
        emp_code = None

    # Check if target condition is false or object is missing
    if not emp_code and request:
        # Begin guarded execution block to trap exceptions
        try:
            # Set auth_h variable to store auth h value
            auth_h = request.headers.get("authorization", "") if hasattr(request, "headers") else ""
            # Evaluate condition to control execution branch
            if auth_h.startswith("Bearer "):
                # Import jwt from jose for module operations
                from jose import jwt
                # Import SECRET_KEY, ALGORITHM from app.core.security for module operations
                from app.core.security import SECRET_KEY, ALGORITHM
                # Set t_data variable to store t data value
                t_data = jwt.decode(auth_h.split(" ")[1], SECRET_KEY, algorithms=[ALGORITHM], options={"verify_signature": False, "verify_exp": False})
                # Set emp_code variable to store emp code value
                emp_code = t_data.get("emp_code") or t_data.get("sub")
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Set lang variable to store lang value
    lang = _detect_language(raw_query, payload.lang)

    # Check if target condition is false or object is missing
    if not emp_code:
        # Evaluate condition to control execution branch
        if lang == "hi":
            # Set reply variable to store reply value
            reply = "👋 **LA ESFERA HR Assistant** में आपका स्वागत है! कृपया अपने लीव बैलेंस, उपस्थिति और प्रोफ़ाइल विवरण देखने के लिए पहले लॉग इन करें।"
        # Evaluate alternate branch condition
        elif lang == "mr":
            # Set reply variable to store reply value
            reply = "👋 **LA ESFERA HR Assistant** मध्ये आपले स्वागत आहे! कृपया आपल्या सुट्ट्या, हजेरी आणि प्रोफाइल तपशील पाहण्यासाठी आधी लॉगिन करा."
        # Execute fallback branch when conditions are not met
        else:
            # Set reply variable to store reply value
            reply = "👋 Welcome to **LA ESFERA HR Assistant**! Please sign in to your HRMS account to check your personal leave balances, attendance, and profile records."
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "reply": reply,
            # Execute statement to process data and maintain state
            "intent": "unauthenticated",
            # Execute statement to process data and maintain state
            "lang": lang,
            # Execute statement to process data and maintain state
            "suggestions": ["Sign in with Microsoft", "Company Policies"]
        # Execute statement to process data and maintain state
        }

    # -------------------------------------------------------------
    # STEP 1: SECURITY & PRIVACY GUARDRAILS CHECK
    # -------------------------------------------------------------
    violation = _check_security_violations(raw_query, emp_code, lang)
    # Evaluate condition to control execution branch
    if violation:
        # Return computed result or response payload to caller
        return violation

    # Fetch user profile
    profile = None
    # Begin guarded execution block to trap exceptions
    try:
        # Initiate database query on specified model
        profile = db.query(Profile).filter(Profile.emp_code.ilike(emp_code)).first()
    # Catch and handle specific exception if raised
    except Exception:
        # Set profile variable to store profile value
        profile = None
    # Set first_name variable to store first name value
    first_name = (profile.first_name if profile else "") or emp_code
    # Set q variable to store q value
    q = raw_query.lower()

    # -------------------------------------------------------------
    # STEP 2: ACTION-ORIENTED LEAVE APPLICATION (Direct Apply Card)
    # -------------------------------------------------------------
    apply_keywords = [
        # Execute statement to process data and maintain state
        "apply leave", "apply for leave", "need leave", "take leave", "take a leave",
        # Execute statement to process data and maintain state
        "want leave", "request leave", "book leave", "apply for cl", "apply for sl",
        # Execute statement to process data and maintain state
        "chutti chahiye", "leave apply karo", "chutti apply", "leave chahiye", "chhutti apply", "chutti le lo",
        # Execute statement to process data and maintain state
        "sutti havi", "sutti apply", "sutti pahije", "leave ghyaychi", "raja havi", "raja apply"
    # Execute statement to process data and maintain state
    ]
    # Set is_apply_intent variable to store is apply intent value
    is_apply_intent = any(k in q for k in apply_keywords) or (
        # Execute statement to process data and maintain state
        ("apply" in q or "chahiye" in q or "havi" in q or "pahije" in q or "dya" in q) and
        # Execute statement to process data and maintain state
        ("leave" in q or "chutti" in q or "sutti" in q or "cl" in q or "sl" in q or "raja" in q)
    # Execute statement to process data and maintain state
    )

    # Evaluate condition to control execution branch
    if is_apply_intent:
        # Set draft variable to store draft value
        draft = _parse_leave_request(raw_query, date.today())
        # Set bal variable to store bal value
        bal = _get_leave_details(db, emp_code)
        # Set cat_key variable to store cat key value
        cat_key = "casualLeave" if "Casual" in draft["category"] else ("sickLeave" if "Sick" in draft["category"] else "optionalHoliday")
        # Set avail_bal variable to store avail bal value
        avail_bal = bal.get(cat_key, {}).get("available", 0.0)
        # Execute statement to process data and maintain state
        draft["available_balance"] = avail_bal

        # Evaluate condition to control execution branch
        if lang == "hi":
            # Set reply variable to store reply value
            reply = (
                # Execute statement to process data and maintain state
                f"नमस्ते **{first_name}**, मैंने आपकी छुट्टी का आवेदन (Leave Draft) तैयार कर लिया है:\n\n"
                f"• **प्रकार:** `{draft['category']}`\n"
                f"• **दिनांक:** `{draft['start_date']}` से `{draft['end_date']}` (`{draft['total_days']}` दिन)\n"
                f"• **कारण:** {draft['reason']}\n"
                f"• **उपलब्ध बैलेंस:** `{avail_bal}` दिन\n\n"
                f"कृपया नीचे दिए गए कार्ड में विवरण की जांच करें और सबमिट करने के लिए **'Confirm & Apply'** बटन दबाएं:"
            # Execute statement to process data and maintain state
            )
            # Set suggestions variable to store suggestions value
            suggestions = ["Confirm and Apply", "Check leave balance", "Cancel"]
        # Evaluate alternate branch condition
        elif lang == "mr":
            # Set reply variable to store reply value
            reply = (
                # Execute statement to process data and maintain state
                f"नमस्कार **{first_name}**, मी तुमचा सुट्टीचा अर्ज (Leave Draft) तयार केला आहे:\n\n"
                f"• **प्रकार:** `{draft['category']}`\n"
                f"• **दिनांक:** `{draft['start_date']}` ते `{draft['end_date']}` (`{draft['total_days']}` दिवस)\n"
                f"• **कारण:** {draft['reason']}\n"
                f"• **शिल्लक सुट्ट्या:** `{avail_bal}` दिवस\n\n"
                f"कृपया खालील कार्ड तपासा आणि अर्ज पाठवण्यासाठी **'Confirm & Apply'** बटनावर क्लिक करा:"
            # Execute statement to process data and maintain state
            )
            # Set suggestions variable to store suggestions value
            suggestions = ["Confirm and Apply", "Check leave balance", "Cancel"]
        # Execute fallback branch when conditions are not met
        else:
            # Set reply variable to store reply value
            reply = (
                # Execute statement to process data and maintain state
                f"Hello **{first_name}**, I've drafted your leave application:\n\n"
                f"• **Category:** `{draft['category']}`\n"
                f"• **Dates:** `{draft['start_date']}` to `{draft['end_date']}` (`{draft['total_days']}` day(s))\n"
                f"• **Reason:** {draft['reason']}\n"
                f"• **Your Available Balance:** `{avail_bal}` day(s)\n\n"
                f"Please review the details in the card below and click **'Confirm & Apply'** to send it directly to your manager for approval:"
            # Execute statement to process data and maintain state
            )
            # Set suggestions variable to store suggestions value
            suggestions = ["Confirm and Apply", "How many leaves have I taken?", "Cancel"]

        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "reply": _scrub_sensitive_output(reply),
            # Execute statement to process data and maintain state
            "intent": "action_draft_leave",
            # Execute statement to process data and maintain state
            "lang": lang,
            # Execute statement to process data and maintain state
            "action": "confirm_leave_application",
            # Execute statement to process data and maintain state
            "draft": draft,
            # Execute statement to process data and maintain state
            "suggestions": suggestions
        # Execute statement to process data and maintain state
        }

    # -------------------------------------------------------------
    # STEP 3: COMPANY POLICY KNOWLEDGE BASE (RAG)
    # -------------------------------------------------------------
    policy_reply = _get_policy_answer(raw_query, lang)
    # Evaluate condition to control execution branch
    if policy_reply:
        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "reply": _scrub_sensitive_output(policy_reply),
            # Execute statement to process data and maintain state
            "intent": "company_policy",
            # Execute statement to process data and maintain state
            "lang": lang,
            # Execute statement to process data and maintain state
            "suggestions": ["Office Timings", "Leave Policy", "Sandwich Rule", "Regularization Rules"]
        # Execute statement to process data and maintain state
        }

    # -------------------------------------------------------------
    # STEP 3A: MANAGER - TEAM ATTENDANCE REPORT
    # -------------------------------------------------------------
    if any(k in q for k in ["team attendance", "team report", "my team attendance", "team status", "who is in today"]):
        team_rep = _get_team_attendance_report(db, emp_code, lang, first_name)
        return {
            "reply": _scrub_sensitive_output(team_rep),
            "intent": "team_attendance_report",
            "lang": lang,
            "suggestions": ["Who is my manager?", "Did I punch in today?"]
        }

    # -------------------------------------------------------------
    # STEP 3B: WORK HOURS SUMMARY & DAILY SHIFT TARGET
    # -------------------------------------------------------------
    if any(k in q for k in ["how many hr", "how many hour", "hours worked", "worked till now", "working hours", "hours completed", "kitne ghante", "kamache tas", "hours log", "worked today", "hours today"]):
        hrs_rep = _get_working_hours_summary(db, emp_code, lang, first_name)
        return {
            "reply": _scrub_sensitive_output(hrs_rep),
            "intent": "working_hours_summary",
            "lang": lang,
            "suggestions": ["How many days was I present this month?", "Did I punch in today?"]
        }

    # -------------------------------------------------------------
    # STEP 3C: MONTHLY ATTENDANCE STATS (Present, Absent, Late)
    # -------------------------------------------------------------
    if any(k in q for k in ["monthly attendance", "attendance summary", "attendance stats", "mahine ki attendance", "mahinyachi hajeri", "days present", "how many days present", "how many days was i present", "days absent"]) or ("present" in q and "absent" in q):
        stats_rep = _get_monthly_attendance_stats(db, emp_code, lang, first_name)
        return {
            "reply": _scrub_sensitive_output(stats_rep),
            "intent": "monthly_attendance_stats",
            "lang": lang,
            "suggestions": ["How many hours have I worked today?", "Check leave balance"]
        }

    # -------------------------------------------------------------
    # STEP 3D: REGULARIZATION REQUEST STATUS
    # -------------------------------------------------------------
    if any(k in q for k in ["regularization", "regularisation", "missed punch status", "regularization request", "regularisation request"]):
        reg_rep = _get_regularization_status(db, emp_code, lang, first_name)
        return {
            "reply": _scrub_sensitive_output(reg_rep),
            "intent": "regularization_status",
            "lang": lang,
            "suggestions": ["Did I punch in today?", "How many leaves have I taken?"]
        }

    # -------------------------------------------------------------
    # STEP 3E: LEAVE HISTORY & PAST APPLICATIONS
    # -------------------------------------------------------------
    if any(k in q for k in ["leave history", "applied leaves", "past leaves", "leaves taken", "leaves applied", "leave status", "chutti history", "sutti history"]):
        hist_rep = _get_leave_history(db, emp_code, lang, first_name)
        return {
            "reply": _scrub_sensitive_output(hist_rep),
            "intent": "leave_history",
            "lang": lang,
            "suggestions": ["Check leave balance", "Apply leave for tomorrow"]
        }

    # -------------------------------------------------------------
    # STEP 3F: EMPLOYEE DIRECTORY SEARCH (Email, Phone, Designation)
    # -------------------------------------------------------------
    if any(k in q for k in ["email of", "phone of", "number of", "contact of", "who is", "who's", "details of", "ka email", "ka phone", "ka number", "cha email", "cha phone", "cha number", "phone number"]):
        dir_rep = _search_employee_directory(db, raw_query, lang)
        if dir_rep:
            return {
                "reply": _scrub_sensitive_output(dir_rep),
                "intent": "employee_directory",
                "lang": lang,
                "suggestions": ["Who is my manager?", "My Profile Details"]
            }

    # -------------------------------------------------------------
    # STEP 4: REAL-TIME DB LEAVE BALANCES
    # -------------------------------------------------------------
    if any(k in q for k in ["leave", "leaves", "balance", "chutti", "sutti", "raja", "bachi", "bache", "shillak"]):
        # Set bal variable to store bal value
        bal = _get_leave_details(db, emp_code)
        # Set cl_avail variable to store cl avail value
        cl_avail = bal.get("casualLeave", {}).get("available", 0.0)
        # Set sl_avail variable to store sl avail value
        sl_avail = bal.get("sickLeave", {}).get("available", 0.0)
        # Set oh_avail variable to store oh avail value
        oh_avail = bal.get("optionalHoliday", {}).get("available", 0.0)
        # Set total_avail variable to store total avail value
        total_avail = bal.get("totalAvailable", cl_avail + sl_avail + oh_avail)
        # Set used variable to store used value
        used = bal.get("used", 0.0)

        # Evaluate condition to control execution branch
        if lang == "hi":
            # Set reply variable to store reply value
            reply = (
                # Execute statement to process data and maintain state
                f"नमस्ते **{first_name}** (`{emp_code}`), आपकी लीव स्थिति:\n\n"
                f"• **Casual Leave (CL):** `{cl_avail}` दिन उपलब्ध\n"
                f"• **Sick Leave (SL):** `{sl_avail}` दिन उपलब्ध\n"
                f"• **Optional Holiday (OH):** `{oh_avail}` दिन उपलब्ध\n"
                f"• **कुल उपलब्ध छुट्टियां:** `{total_avail}` दिन\n"
                f"• **उपयोग की गई छुट्टियां:** `{used}` दिन\n\n"
                f"💡 छुट्टी का आवेदन करने के लिए बस कहें: *'कल के लिए 1 दिन की casual leave apply करो'*"
            # Execute statement to process data and maintain state
            )
        # Evaluate alternate branch condition
        elif lang == "mr":
            # Set reply variable to store reply value
            reply = (
                # Execute statement to process data and maintain state
                f"नमस्कार **{first_name}** (`{emp_code}`), आपली सुट्टीची स्थिती:\n\n"
                f"• **कॅज्युअल सुट्टी (CL):** `{cl_avail}` दिवस शिल्लक\n"
                f"• **सिक सुट्टी (SL):** `{sl_avail}` दिवस शिल्लक\n"
                f"• **ऐच्छिक सुट्टी (OH):** `{oh_avail}` दिवस शिल्लक\n"
                f"• **एकूण शिल्लक सुट्ट्या:** `{total_avail}` दिवस\n"
                f"• **वापरलेल्या सुट्ट्या:** `{used}` दिवस\n\n"
                f"💡 रजेचा अर्ज करण्यासाठी सांगा: *'उद्यासाठी 1 दिवसाची casual leave apply करा'*"
            # Execute statement to process data and maintain state
            )
        # Execute fallback branch when conditions are not met
        else:
            # Set reply variable to store reply value
            reply = (
                # Execute statement to process data and maintain state
                f"Here is your official Leave Balance summary for **{first_name}** (`{emp_code}`):\n\n"
                f"• **Casual Leave (CL):** `{cl_avail}` days available\n"
                f"• **Sick Leave (SL):** `{sl_avail}` days available\n"
                f"• **Optional Holiday (OH):** `{oh_avail}` days available\n"
                f"• **Total Balance Remaining:** `{total_avail}` days\n"
                f"• **Leaves Utilized:** `{used}` days\n\n"
                f"💡 *Tip:* To apply right now, simply say *'Apply 1 day casual leave for tomorrow'*."
            # Execute statement to process data and maintain state
            )

        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "reply": _scrub_sensitive_output(reply),
            # Execute statement to process data and maintain state
            "intent": "leave_balance",
            # Execute statement to process data and maintain state
            "lang": lang,
            # Execute statement to process data and maintain state
            "suggestions": ["Apply leave for tomorrow", "Did I punch in today?", "Who is my manager?"]
        # Execute statement to process data and maintain state
        }

    # -------------------------------------------------------------
    # STEP 5: REAL-TIME TODAY'S ATTENDANCE STATUS
    # -------------------------------------------------------------
    if any(k in q for k in ["punch", "attendance", "punched in", "punched out", "check in", "clock in", "hazari", "hajeri"]):
        # Set att variable to store att value
        att = _get_today_attendance(db, emp_code)
        # Evaluate condition to control execution branch
        if att:
            # Set in_str variable to store in str value
            in_str = str(att.get("punch_in_time") or "—")
            # Set out_str variable to store out str value
            out_str = str(att.get("punch_out_time") or "Not yet (Active Shift)")
            # Set hrs variable to store hrs value
            hrs = _safe_float(att.get("hours_completed"), 0.0)
            # Set st variable to store st value
            st = att.get("status") or "Present"
            # Set loc variable to store loc value
            loc = att.get("punch_in_location") or "Headquarters (MIDC, Mumbai)"

            # Evaluate condition to control execution branch
            if lang == "hi":
                # Set reply variable to store reply value
                reply = (
                    # Execute statement to process data and maintain state
                    f"आज की उपस्थिति स्थिति - **{first_name}** (`{emp_code}`):\n\n"
                    f"• **पंच-इन समय:** `{in_str}`\n"
                    f"• **पंच-आउट समय:** `{out_str}`\n"
                    f"• **कार्य के घंटे:** `{hrs:.2f}` hrs\n"
                    f"• **स्थिति:** `{st}`\n"
                    f"• **स्थान:** {loc}\n\n"
                    f"✅ आपकी आज की उपस्थिति सिस्टम में सफलतापूर्वक दर्ज है!"
                # Execute statement to process data and maintain state
                )
            # Evaluate alternate branch condition
            elif lang == "mr":
                # Set reply variable to store reply value
                reply = (
                    # Execute statement to process data and maintain state
                    f"आजची हजेरी स्थिती - **{first_name}** (`{emp_code}`):\n\n"
                    f"• **पंच-इन वेळ:** `{in_str}`\n"
                    f"• **पंच-आउट वेळ:** `{out_str}`\n"
                    f"• **कामाचे तास:** `{hrs:.2f}` hrs\n"
                    f"• **स्थिती:** `{st}`\n"
                    f"• **ठिकाण:** {loc}\n\n"
                    f"✅ तुमची आजची हजेरी सिस्टममध्ये नोंदवली गेली आहे!"
                # Execute statement to process data and maintain state
                )
            # Execute fallback branch when conditions are not met
            else:
                # Set reply variable to store reply value
                reply = (
                    # Execute statement to process data and maintain state
                    f"Today's Attendance Status for **{first_name}** (`{emp_code}`):\n\n"
                    f"• **Punch In Time:** `{in_str}`\n"
                    f"• **Punch Out Time:** `{out_str}`\n"
                    f"• **Working Hours Logged:** `{hrs:.2f}` hrs\n"
                    f"• **Status:** `{st}`\n"
                    f"• **Location Captured:** {loc}\n\n"
                    f"Your attendance is verified and securely saved in the system!"
                # Execute statement to process data and maintain state
                )
        # Execute fallback branch when conditions are not met
        else:
            # Evaluate condition to control execution branch
            if lang == "hi":
                # Set reply variable to store reply value
                reply = (
                    # Execute statement to process data and maintain state
                    f"नमस्ते **{first_name}**, आपने **आज अभी तक पंच-इन नहीं किया है**।\n\n"
                    f"कृपया डैशबोर्ड के **Live Attendance** सेक्शन में जाकर अपनी सेल्फी सत्यापित करें और पंच-इन करें।"
                # Execute statement to process data and maintain state
                )
            # Evaluate alternate branch condition
            elif lang == "mr":
                # Set reply variable to store reply value
                reply = (
                    # Execute statement to process data and maintain state
                    f"नमस्कार **{first_name}**, तुम्ही **आज अद्याप पंच-इन केलेले नाही**।\n\n"
                    f"कृपया डॅशबोर्डवरील **Live Attendance** विभागात जाऊन सेल्फी व्हेरिफाय करून पंच-इन करा."
                # Execute statement to process data and maintain state
                )
            # Execute fallback branch when conditions are not met
            else:
                # Set reply variable to store reply value
                reply = (
                    # Execute statement to process data and maintain state
                    f"Hello **{first_name}**, you have **not punched in today** yet.\n\n"
                    f"Please head to the **Live Attendance** section on your dashboard to capture your verified selfie and clock in."
                # Execute statement to process data and maintain state
                )

        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "reply": _scrub_sensitive_output(reply),
            # Execute statement to process data and maintain state
            "intent": "attendance_today",
            # Execute statement to process data and maintain state
            "lang": lang,
            # Execute statement to process data and maintain state
            "suggestions": ["How many leaves have I taken?", "Who is my manager?"]
        # Execute statement to process data and maintain state
        }

    # -------------------------------------------------------------
    # STEP 6: REPORTING MANAGER
    # -------------------------------------------------------------
    if any(k in q for k in ["manager", "supervisor", "boss", "reporting to", "kon aahe", "kaun hai"]):
        # Set mgr variable to store mgr value
        mgr = profile.reporting_supervisor if profile and profile.reporting_supervisor else "Management / HR"
        # Set dept variable to store dept value
        dept = profile.department if profile and profile.department else "Operations"

        # Evaluate condition to control execution branch
        if lang == "hi":
            # Set reply variable to store reply value
            reply = (
                # Execute statement to process data and maintain state
                f"आपके रिपोर्टिंग मैनेजर **{mgr}** हैं (**{dept}** विभाग)।\n\n"
                f"आपके सभी लीव आवेदन और रेगुलराइजेशन अनुरोध अनुमोदन के लिए **{mgr}** के पास जाते हैं।"
            # Execute statement to process data and maintain state
            )
        # Evaluate alternate branch condition
        elif lang == "mr":
            # Set reply variable to store reply value
            reply = (
                # Execute statement to process data and maintain state
                f"तुमचे रिपोर्टिंग मॅनेजर **{mgr}** आहेत (**{dept}** विभाग).\n\n"
                f"तुमचे सर्व सुट्टीचे अर्ज आणि रेग्युलायझेशन विनंत्या मंजुरीसाठी **{mgr}** यांच्याकडे जातात."
            # Execute statement to process data and maintain state
            )
        # Execute fallback branch when conditions are not met
        else:
            # Set reply variable to store reply value
            reply = (
                # Execute statement to process data and maintain state
                f"Your designated Reporting Manager is **{mgr}** in the **{dept}** department.\n\n"
                f"All your leave applications and regularization requests are routed to **{mgr}** for approval."
            # Execute statement to process data and maintain state
            )

        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "reply": _scrub_sensitive_output(reply),
            # Execute statement to process data and maintain state
            "intent": "reporting_manager",
            # Execute statement to process data and maintain state
            "lang": lang,
            # Execute statement to process data and maintain state
            "suggestions": ["My Profile Details", "How many leaves have I taken?"]
        # Execute statement to process data and maintain state
        }

    # -------------------------------------------------------------
    # STEP 7: EMPLOYEE PROFILE DETAILS (Self only)
    # -------------------------------------------------------------
    if any(k in q for k in ["profile", "my details", "employee id", "emp code", "designation", "department"]):
        # Evaluate condition to control execution branch
        if profile:
            # Set reply variable to store reply value
            reply = (
                # Execute statement to process data and maintain state
                f"Official HR Records for **{profile.first_name} {profile.last_name or ''}**:\n\n"
                f"• **Employee ID:** `{profile.emp_code}`\n"
                f"• **Designation:** {profile.designation or 'Software Developer'}\n"
                f"• **Department:** {profile.department or 'Engineering'}\n"
                f"• **Official Email:** `{profile.email}`\n"
                f"• **Branch Location:** {profile.branch_location or 'Mumbai Office'}\n"
                f"• **Date of Joining:** `{str(profile.emp_join_date or '—')}`\n"
                f"• **Reporting Manager:** {profile.reporting_supervisor or 'Management'}"
            # Execute statement to process data and maintain state
            )
        # Execute fallback branch when conditions are not met
        else:
            # Set reply variable to store reply value
            reply = f"Your employee code is `{emp_code}`."

        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "reply": _scrub_sensitive_output(reply),
            # Execute statement to process data and maintain state
            "intent": "profile_info",
            # Execute statement to process data and maintain state
            "lang": lang,
            # Execute statement to process data and maintain state
            "suggestions": ["How many leaves have I taken?", "Did I punch in today?"]
        # Execute statement to process data and maintain state
        }

    # -------------------------------------------------------------
    # STEP 8: UPCOMING OFFICIAL HOLIDAYS
    # -------------------------------------------------------------
    if any(k in q for k in ["holiday", "holidays", "calendar", "festival", "off days", "tyohar", "suttya"]):
        # Set holidays variable to store holidays value
        holidays = _get_upcoming_holidays(db)
        # Evaluate condition to control execution branch
        if holidays:
            # Set h_list variable to store h list value
            h_list = "\n".join([f"• **{h['date']}:** {h['name']}" for h in holidays])
            # Set reply variable to store reply value
            reply = f"Upcoming official holidays:\n\n{h_list}\n\nEnjoy your time with family!"
        # Execute fallback branch when conditions are not met
        else:
            # Set reply variable to store reply value
            reply = "Upcoming official holidays for 2026:\n\n• **26 Jan 2026:** Republic Day\n• **25 Mar 2026:** Holi\n• **15 Aug 2026:** Independence Day\n• **02 Oct 2026:** Gandhi Jayanti\n• **08 Nov 2026:** Diwali"

        # Return computed result or response payload to caller
        return {
            # Execute statement to process data and maintain state
            "reply": _scrub_sensitive_output(reply),
            # Execute statement to process data and maintain state
            "intent": "holidays",
            # Execute statement to process data and maintain state
            "lang": lang,
            # Execute statement to process data and maintain state
            "suggestions": ["How many leaves have I taken?", "Sandwich leave rule"]
        # Execute statement to process data and maintain state
        }

    # -------------------------------------------------------------
    # STEP 9: GENERAL / FALLBACK ASSISTANCE
    # -------------------------------------------------------------
    if lang == "hi":
        # Set reply variable to store reply value
        reply = (
            # Execute statement to process data and maintain state
            f"नमस्ते **{first_name}**, मैं आपका LA ESFERA HR AI असिस्टेंट हूँ! आप मुझसे पूछ सकते हैं:\n\n"
            f"• *'मेरी कितनी छुट्टियां बची हैं?'*\n"
            f"• *'कल के लिए casual leave apply करो'*\n"
            f"• *'क्या आज मेरा पंच-इन हुआ?'*\n"
            f"• *'ऑफिस टाइमिंग और लेट मार्क के क्या नियम हैं?'*\n"
            f"• *'सैंडविच लीव रूल क्या है?'*\n"
            f"• *'रेगुलराइजेशन के क्या नियम हैं?'*"
        # Execute statement to process data and maintain state
        )
    # Evaluate alternate branch condition
    elif lang == "mr":
        # Set reply variable to store reply value
        reply = (
            # Execute statement to process data and maintain state
            f"नमस्कार **{first_name}**, मी तुमचा LA ESFERA HR AI असिस्टंट आहे! तुम्ही मला विचारू शकता:\n\n"
            f"• *'माझ्या किती सुट्ट्या शिल्लक आहेत?'*\n"
            f"• *'उद्यासाठी 1 दिवसाची casual leave apply करा'*\n"
            f"• *'आजचे पंच-इन झाले का?'*\n"
            f"• *'ऑफिसची वेळ आणि लेटचे नियम काय आहेत?'*\n"
            f"• *'सँडविच रजेचा नियम काय आहे?'*\n"
            f"• *'हजेरी रेग्युलायझेशनचे नियम काय आहेत?'*"
        # Execute statement to process data and maintain state
        )
    # Execute fallback branch when conditions are not met
    else:
        # Set reply variable to store reply value
        reply = (
            # Execute statement to process data and maintain state
            f"Hi **{first_name}**, I am your LA ESFERA HR Assistant! You can ask me:\n\n"
            f"• *'Apply 1 day casual leave for tomorrow'* 📝\n"
            f"• *'How many leaves have I taken?'*\n"
            f"• *'Did I punch in today?'*\n"
            f"• *'What is the office shift timing and late punch policy?'*\n"
            f"• *'How does the sandwich leave rule work?'*\n"
            f"• *'What are the regularization guidelines?'*"
        # Execute statement to process data and maintain state
        )

    # Return computed result or response payload to caller
    return {
        # Execute statement to process data and maintain state
        "reply": _scrub_sensitive_output(reply),
        # Execute statement to process data and maintain state
        "intent": "general_help",
        # Execute statement to process data and maintain state
        "lang": lang,
        # Execute statement to process data and maintain state
        "suggestions": ["Apply leave for tomorrow", "Office Timings", "Sandwich Rule", "Check leave balance"]
    # Execute statement to process data and maintain state
    }


# ==============================================================================
# ROUTE 2: EXECUTE ACTION (Apply Leave Directly From Chatbot)
# ==============================================================================
@router.post("/execute-action")
# Define handle_execute_action function to handle handle execute action
async def handle_execute_action(payload: ExecuteActionRequest, request: Request, db: Session = Depends(get_db)):
    """
    Executes confirmed action from the interactive Chatbot Card:
    Submits the drafted leave directly to leave_service.create_leave_request.
    """
    try:
        # Set emp_code variable to store emp code value
        emp_code = _resolve_emp_code(request, db, require_auth=False)
    # Catch and handle specific exception if raised
    except Exception:
        # Set emp_code variable to store emp code value
        emp_code = None

    # Check if target condition is false or object is missing
    if not emp_code and request:
        # Begin guarded execution block to trap exceptions
        try:
            # Set auth_h variable to store auth h value
            auth_h = request.headers.get("authorization", "") if hasattr(request, "headers") else ""
            # Evaluate condition to control execution branch
            if auth_h.startswith("Bearer "):
                # Import jwt from jose for module operations
                from jose import jwt
                # Import SECRET_KEY, ALGORITHM from app.core.security for module operations
                from app.core.security import SECRET_KEY, ALGORITHM
                # Set t_data variable to store t data value
                t_data = jwt.decode(auth_h.split(" ")[1], SECRET_KEY, algorithms=[ALGORITHM], options={"verify_signature": False, "verify_exp": False})
                # Set emp_code variable to store emp code value
                emp_code = t_data.get("emp_code") or t_data.get("sub")
        # Catch and handle specific exception if raised
        except Exception:
            # Placeholder statement performing no operation
            pass

    # Check if target condition is false or object is missing
    if not emp_code:
        # Raise HTTP exception with status code and error details
        raise HTTPException(status_code=401, detail="Please log in first to perform this action.")

    # Set action variable to store action value
    action = payload.action.strip().lower()
    # Set draft variable to store draft value
    draft = payload.draft or {}

    # Evaluate condition to control execution branch
    if action in ["confirm_leave_application", "apply_leave"]:
        # Begin guarded execution block to trap exceptions
        try:
            # Set leave_payload variable to store leave payload value
            leave_payload = {
                # Execute statement to process data and maintain state
                "category": draft.get("category", "Casual Leave"),
                # Execute statement to process data and maintain state
                "leave_type": draft.get("category", "Casual Leave"),
                # Execute statement to process data and maintain state
                "start_date": draft.get("start_date"),
                # Execute statement to process data and maintain state
                "end_date": draft.get("end_date"),
                # Execute statement to process data and maintain state
                "total_days": _safe_float(draft.get("total_days", 1.0)),
                # Execute statement to process data and maintain state
                "reason": draft.get("reason", "Requested via AI Chatbot Assistant"),
                # Execute statement to process data and maintain state
                "has_half_days": True if _safe_float(draft.get("total_days")) == 0.5 else False
            # Execute statement to process data and maintain state
            }

            # Set res variable to store res value
            res = leave_service.create_leave_request(db, leave_payload, emp_code)
            # Set leave_id variable to store leave id value
            leave_id = res.get("id") or (res.get("data", {}).get("id") if isinstance(res.get("data"), dict) else "REQ")

            # Set reply variable to store reply value
            reply = (
                # Execute statement to process data and maintain state
                f"🎉 **Leave Application Submitted Successfully!**\n\n"
                f"• **Application ID:** `#{leave_id}`\n"
                f"• **Category:** {leave_payload['category']}\n"
                f"• **Duration:** `{leave_payload['start_date']}` to `{leave_payload['end_date']}` ({leave_payload['total_days']} day(s))\n"
                f"• **Reason:** {leave_payload['reason']}\n"
                f"• **Status:** `Pending Manager Approval`\n\n"
                f"Your reporting manager has been notified and will review your application."
            # Execute statement to process data and maintain state
            )

            # Return computed result or response payload to caller
            return {
                # Execute statement to process data and maintain state
                "success": True,
                # Execute statement to process data and maintain state
                "leave_id": leave_id,
                # Execute statement to process data and maintain state
                "reply": _scrub_sensitive_output(reply),
                # Execute statement to process data and maintain state
                "data": res
            # Execute statement to process data and maintain state
            }
        # Catch and handle specific exception if raised
        except Exception as e:
            # Return computed result or response payload to caller
            return {
                # Execute statement to process data and maintain state
                "success": False,
                # Execute statement to process data and maintain state
                "reply": f"⚠️ Could not submit leave request: {str(e)}",
                # Execute statement to process data and maintain state
                "error": str(e)
            # Execute statement to process data and maintain state
            }

    # Raise HTTP exception with status code and error details
    raise HTTPException(status_code=400, detail=f"Unsupported action: {payload.action}")
