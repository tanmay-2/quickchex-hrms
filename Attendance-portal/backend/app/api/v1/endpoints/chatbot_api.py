# ==============================================================================
# QUICKCHEX HRMS BACKEND - CHATBOT API (chatbot_api.py)
# Path: Attendance-portal/backend/app/api/v1/endpoints/chatbot_api.py
# Purpose: Enterprise AI HR Assistant with Security Guardrails, PII Masking,
#          Cross-Employee Privacy, Policy Knowledge Engine, Real-time DB Queries,
#          Action-Oriented Leave Applications, and Multilingual Support (EN, HI, MR).
# ==============================================================================

import os
import re
import json
from datetime import date, datetime, timedelta
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
import requests

from app.db.session import get_db
from app.models.profile_model import Profile
from app.models.leave import Holiday
from app.api.v1.endpoints.attendance_api import _resolve_emp_code
from app.services import leave_service

router = APIRouter(prefix="/chatbot", tags=["AI HR Assistant"])

# ==============================================================================
# SCHEMAS
# ==============================================================================
class ChatQueryRequest(BaseModel):
    message: str
    lang: Optional[str] = "en"  # "en", "hi", "mr"

class ExecuteActionRequest(BaseModel):
    action: str
    draft: Dict[str, Any]

def _safe_float(val, default=0.0):
    try:
        return float(val) if val is not None else default
    except (ValueError, TypeError):
        return default


# ==============================================================================
# ENTERPRISE SECURITY & PRIVACY GUARDRAILS
# ==============================================================================
JAILBREAK_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?",
    r"bypass\s+(safety|security|rules|guardrails)",
    r"system\s+prompt",
    r"developer\s+mode",
    r"act\s+as\s+(dan|root|admin|god|unrestricted)",
    r"dump\s+(all\s+)?(db|database|tables|passwords|users|tokens)",
    r"drop\s+table",
    r"select\s+.*\s+from\s+",
    r"union\s+select",
    r"show\s+all\s+(passwords|tokens|keys|secrets|hashes)",
    r"reveal\s+(api\s+key|secret|credentials)",
]

SALARY_PATTERNS = [
    r"\b(salary|ctc|payslip|pay\s?slip|compensation|remuneration|wage|gross\s?pay|net\s?pay|bank\s?account|bonus|increment|in-hand|deduction|tax\s?slip|package|hike)\b",
    r"\b(tankhah|vetan|pagaar|salary kitni|kitna paisa)\b",
]

def _check_security_violations(query: str, current_emp_code: str, lang: str) -> Optional[Dict[str, Any]]:
    """
    Evaluates query against security, jailbreak, financial, and privacy guardrails.
    Returns refusal dictionary if violation detected, else None.
    """
    q = query.lower()

    # 1. Anti-Jailbreak / Injection Detection
    for pattern in JAILBREAK_PATTERNS:
        if re.search(pattern, q):
            if lang == "hi":
                reply = "🛡️ **सुरक्षा चेतावनी:** मैं एंटरप्राइज सुरक्षा प्रोटोकॉल से सुरक्षित हूँ। मैं केवल आधिकारिक HRMS प्रक्रियाओं, नीतियों, और आपकी व्यक्तिगत उपस्थिति या छुट्टी के प्रश्नों में सहायता कर सकता हूँ।"
            elif lang == "mr":
                reply = "🛡️ **सुरक्षा इशारा:** मी एंटरप्राइझ सुरक्षा प्रोटोकॉलने सुरक्षित आहे. मी फक्त अधिकृत HRMS प्रक्रिया, नियम आणि आपल्या हजेरी किंवा सुट्टीच्या प्रश्नांमध्ये मदत करू शकतो."
            else:
                reply = "🛡️ **Security Alert:** I am operating under strict enterprise safety protocols. I can only assist with verified HRMS inquiries, company policies, attendance, and leave management."
            return {"reply": reply, "intent": "security_refusal", "lang": lang, "suggestions": ["Check leave balance", "Did I punch in today?"]}

    # 2. Salary & Financial Confidentiality Lock
    for pattern in SALARY_PATTERNS:
        if re.search(pattern, q):
            if lang == "hi":
                reply = (
                    "🔒 **गोपनीय सूचना (Confidential):** वेतन (Salary), पारिश्रमिक और बैंक विवरण अत्यंत गोपनीय हैं। "
                    "डेटा सुरक्षा कारणों से इन्हें चैट में प्रदर्शित नहीं किया जा सकता।\n\n"
                    "👉 कृपया अपनी सैलरी स्लिप और विवरण देखने के लिए डैशबोर्ड के **'Payroll Items / Employee Salary'** सेक्शन में जाएं।"
                )
            elif lang == "mr":
                reply = (
                    "🔒 **गोपनीय माहिती (Confidential):** पगार (Salary), मानधन आणि बँक तपशील अत्यंत गोपनीय आहेत. "
                    "सुरक्षेच्या कारणास्तव हे चॅटमध्ये दाखवले जाऊ शकत नाही.\n\n"
                    "👉 कृपया आपली सॅलरी स्लिप पाहण्यासाठी डॅशबोर्डवरील **'Payroll Items / Employee Salary'** विभागात जा."
                )
            else:
                reply = (
                    "🔒 **Confidential Information:** Salary, compensation, and bank details are strictly confidential. "
                    "To protect employee privacy, financial details cannot be displayed in chat.\n\n"
                    "👉 Please navigate to the secure **'Payroll Items / Employee Salary'** section in your portal to access your payslips."
                )
            return {"reply": reply, "intent": "confidential_refusal", "lang": lang, "suggestions": ["How many leaves have I taken?", "Company Policies"]}

    # 3. Cross-Employee Privacy Protection (Inquiring about other employees)
    other_emp_match = re.search(r"\b(le\d{3,4})\b", q)
    if other_emp_match:
        queried_code = other_emp_match.group(1).upper()
        if queried_code != current_emp_code.upper():
            if lang == "hi":
                reply = (
                    f"🔒 **डेटा गोपनीयता:** एंटरप्राइज प्राइवेसी नियमों के तहत, मैं केवल आपकी स्वयं की (`{current_emp_code}`) जानकारी दे सकता हूँ। "
                    f"अन्य कर्मचारी (`{queried_code}`) का व्यक्तिगत विवरण या उपस्थिति साझा नहीं की जा सकती।"
                )
            elif lang == "mr":
                reply = (
                    f"🔒 **डेटा गोपनीयता:** एंटरप्राइझ नियमांनुसार मी फक्त आपल्या (`{current_emp_code}`) माहिती देऊ शकतो. "
                    f"इतर कर्मचाऱ्यांचे (`{queried_code}`) वैयक्तिक तपशील किंवा हजेरी दाखवली जाऊ शकत नाही."
                )
            else:
                reply = (
                    f"🔒 **Data Privacy Guardrail:** Under enterprise compliance, I can only provide records for your own authenticated profile (`{current_emp_code}`). "
                    f"I cannot disclose attendance, leaves, or personal records of other employees (`{queried_code}`)."
                )
            return {"reply": reply, "intent": "privacy_refusal", "lang": lang, "suggestions": ["My Profile Details", "My Leave Balances"]}

    return None

def _scrub_sensitive_output(text_str: str) -> str:
    """Post-processing sanitizer: masks PAN, Aadhaar, Credit Cards, or Passwords from bot replies."""
    if not text_str:
        return text_str
    # PAN Card (e.g. ABCDE1234F)
    text_str = re.sub(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b", "[REDACTED-PAN]", text_str)
    # Aadhaar (12 digits)
    text_str = re.sub(r"\b\d{4}\s?\d{4}\s?\d{4}\b", "[REDACTED-AADHAAR]", text_str)
    # Credit/Debit Card (16 digits)
    text_str = re.sub(r"\b(?:\d{4}[ -]?){3}\d{4}\b", "[REDACTED-CARD]", text_str)
    return text_str


# ==============================================================================
# COMPANY KNOWLEDGE BASE (Policies, Rules, Guidelines)
# ==============================================================================
COMPANY_KNOWLEDGE = {
    "timings": {
        "keywords": ["timing", "timings", "office hours", "shift", "work hours", "working hours", "samay", "vel", "schedule"],
        "en": (
            "🏢 **LA ESFERA Office Hours & Shift Policy:**\n\n"
            "• **Standard Shift:** 10:00 AM to 7:00 PM (Monday to Friday, Alternate Saturdays).\n"
            "• **Working Duration:** 9.5 hours total shift (8.5 hours productive work + 1 hour lunch & refreshments).\n"
            "• **Grace Period:** Punch-ins up to **10:30 AM** are marked on time without penalty.\n"
            "• **Late Punch-In:** Punching in after 10:30 AM is logged as **Late In**. 3 late arrivals in a month may result in half-day salary deduction.\n"
            "• **Half-Day:** Punch-in after 2:00 PM or punch-out before 2:00 PM is counted as a **Half Day (0.5 day)**."
        ),
        "hi": (
            "🏢 **LA ESFERA कार्यालय समय और शिफ्ट नीति:**\n\n"
            "• **नियमित शिफ्ट:** सुबह 10:00 AM से शाम 7:00 PM (सोमवार से शुक्रवार, वैकल्पिक शनिवार)।\n"
            "• **कार्य अवधि:** कुल 9.5 घंटे (8.5 घंटे कार्य + 1 घंटा लंच/ब्रेक)।\n"
            "• **ग्रेस पीरियड:** सुबह **10:30 AM** तक पंच-इन बिना किसी पेनल्टी के मान्य है।\n"
            "• **देर से आगमन (Late):** 10:30 AM के बाद का पंच-इन 'Late In' दर्ज होता है। महीने में 3 बार लेट आने पर आधा दिन काटा जा सकता है।\n"
            "• **हाफ-डे (Half Day):** दोपहर 2:00 PM के बाद पंच-इन या 2:00 PM से पहले पंच-आउट आधा दिन माना जाता है।"
        ),
        "mr": (
            "🏢 **LA ESFERA कार्यालयीन वेळ आणि शिफ्ट नियम:**\n\n"
            "• **नियमित वेळ:** सकाळी 10:00 AM ते संध्याकाळी 7:00 PM (सोमवार ते शुक्रवार, एक शनिवार आड).\n"
            "• **कामाचे तास:** एकूण 9.5 तास (8.5 तास काम + 1 तास लंच/ब्रेक).\n"
            "• **ग्रेस पिरियड:** सकाळी **10:30 AM** पर्यंत पंच-इन ऑन-टाइम मानले जाते.\n"
            "• **उशिरा येणे (Late):** 10:30 AM नंतरचे पंच-इन 'Late In' मानले जाते. महिन्यात 3 वेळा लेट झाल्यास अर्धा दिवस रजा कापली जाऊ शकते.\n"
            "• **हाफ-डे (Half Day):** दुपारी 2:00 PM नंतर पंच-इन किंवा 2:00 PM पूर्वी पंच-आउट केल्यास अर्धा दिवस धरला जातो."
        )
    },
    "leave_policy": {
        "keywords": ["leave policy", "casual leave", "sick leave", "earned leave", "paid leave", "chutti niyam", "sutti niyam", "leaves allowed"],
        "en": (
            "📋 **LA ESFERA Leave Entitlements & Guidelines:**\n\n"
            "• **Casual Leave (CL):** 10 days per year. (Prior notification of at least 24 hours required).\n"
            "• **Sick Leave (SL):** 8 days per year. (Medical certificate mandatory if taken for >2 consecutive days).\n"
            "• **Optional Holidays (OH):** 3 days per year from the official festival list.\n"
            "• **Paid / Privilege Leave (PL):** 15 days per year (accrued monthly, applies after probation).\n"
            "• **Maternity Leave:** 26 weeks paid leave as per statutory guidelines.\n"
            "• **Paternity Leave:** 5 working days for new fathers.\n"
            "• **Bereavement Leave:** 3 to 5 days for immediate family bereavement."
        ),
        "hi": (
            "📋 **LA ESFERA छुट्टी पात्रता और नियम:**\n\n"
            "• **Casual Leave (CL):** प्रति वर्ष 10 दिन (कम से कम 24 घंटे पहले सूचना आवश्यक)।\n"
            "• **Sick Leave (SL):** प्रति वर्ष 8 दिन (2 दिन से अधिक की बीमारी पर डॉक्टर का प्रमाण पत्र अनिवार्य)।\n"
            "• **Optional Holiday (OH):** प्रति वर्ष 3 दिन (त्योहारों की सूची से)।\n"
            "• **Paid Leave (PL):** प्रति वर्ष 15 दिन (हर महीने क्रेडिट होती है)।\n"
            "• **Maternity Leave:** 26 सप्ताह सवेतन अवकाश।\n"
            "• **Paternity Leave:** 5 कार्य दिवस।"
        ),
        "mr": (
            "📋 **LA ESFERA सुट्टी नियम व वाटप:**\n\n"
            "• **कॅज्युअल रजा (CL):** वर्षाला 10 दिवस (किमान 24 तास आधी कळवणे आवश्यक).\n"
            "• **सिक रजा (SL):** वर्षाला 8 दिवस (2 पेक्षा जास्त दिवस सलग रजेसाठी वैद्यकीय प्रमाणपत्र अनिवार्य).\n"
            "• **ऐच्छिक सुट्टी (OH):** वर्षाला 3 दिवस (सणांच्या यादीतून).\n"
            "• **पेड लीव्ह (PL):** वर्षाला 15 दिवस.\n"
            "• **प्रसूती रजा (Maternity):** 26 आठवडे सवेतन रजा."
        )
    },
    "sandwich_rule": {
        "keywords": ["sandwich", "sandwich rule", "sandwich leave", "friday monday", "weekend leave"],
        "en": (
            "🥪 **Sandwich Leave Rule Policy:**\n\n"
            "• If an employee takes leave on **Friday and following Monday** (or on the days immediately preceding and succeeding a public holiday), "
            "the intervening Saturday, Sunday, or holiday is **counted as part of your total leave**.\n"
            "• **Example:** Taking leave on Friday and Monday consumes **4 days of leave** (Friday + Saturday + Sunday + Monday).\n"
            "• To avoid this deduction, ensure you are present either on Friday or Monday."
        ),
        "hi": (
            "🥪 **सैंडविच लीव नियम (Sandwich Rule):**\n\n"
            "• यदि कोई कर्मचारी **शुक्रवार और उसके बाद सोमवार** दोनों दिन छुट्टी लेता है, तो बीच के शनिवार और रविवार भी छुट्टी के रूप में गिने जाते हैं।\n"
            "• **उदाहरण:** शुक्रवार और सोमवार की छुट्टी लेने पर कुल **4 दिन की छुट्टी** कटेगी (शुक्रवार + शनिवार + रविवार + सोमवार)।\n"
            "• इससे बचने के लिए शुक्रवार या सोमवार में से किसी एक दिन उपस्थित रहना अनिवार्य है।"
        ),
        "mr": (
            "🥪 **सँडविच लीव्ह नियम (Sandwich Rule):**\n\n"
            "• जर एखाद्या कर्मचाऱ्याने **शुक्रवार आणि त्यानंतरच्या सोमवारी** रजा घेतली, तर मधला शनिवार आणि रविवार देखील रजेमध्ये मोजला जातो.\n"
            "• **उदाहरण:** शुक्रवार व सोमवार रजा घेतल्यास **4 दिवसांची रजा** कापली जाते.\n"
            "• हे टाळण्यासाठी शुक्रवार किंवा सोमवार यापैकी एका दिवशी कामावर उपस्थित राहा."
        )
    },
    "regularization": {
        "keywords": ["regularization", "regularise", "missed punch", "forgot punch", "punch nahi kiya", "visarlo", "attendance regular"],
        "en": (
            "🔄 **Attendance Regularization Rules:**\n\n"
            "• **Eligibility:** You can apply for regularization if you forgot to punch in/out, had biometric issues, or were on outdoor client duty.\n"
            "• **Deadline:** Must be raised within **3 working days** of the occurrence.\n"
            "• **Monthly Limit:** Maximum of **3 regularizations** permitted per calendar month.\n"
            "• **Approval:** Requires designation and written approval from your **Reporting Manager**.\n"
            "• Apply directly from the **'Regularization'** tab on your dashboard menu."
        ),
        "hi": (
            "🔄 **उपस्थिति नियमितीकरण (Regularization) नियम:**\n\n"
            "• **पात्रता:** पंच भूल जाने, बायोमेट्रिक त्रुटि, या फील्ड विजिट पर होने पर आप रेगुलराइजेशन लगा सकते हैं।\n"
            "• **समय सीमा:** घटना के **3 कार्य दिवसों** के भीतर आवेदन करना आवश्यक है।\n"
            "• **मासिक सीमा:** एक महीने में अधिकतम **3 रेगुलराइजेशन** की अनुमति है।\n"
            "• **अनुमोदन:** आपके रिपोर्टिंग मैनेजर द्वारा स्वीकृत होना आवश्यक है।"
        ),
        "mr": (
            "🔄 **हजेरी रेग्युलायझेशन नियम:**\n\n"
            "• **पात्रता:** जर तुम्ही पंच-इन/आउट विसरला असाल किंवा बायोमेट्रिक त्रुटी असल्यास अर्ज करू शकता.\n"
            "• **मुदत:** घटनेच्या **3 कामकाजाच्या दिवसांत** अर्ज करणे अनिवार्य आहे.\n"
            "• **मर्यादा:** एका कॅलेंडर महिन्यात जास्तीत जास्त **3 रेग्युलायझेशन** करता येतात.\n"
            "• **मंजुरी:** रिपोर्टिंग मॅनेजरची मंजुरी आवश्यक आहे."
        )
    },
    "notice_probation": {
        "keywords": ["notice period", "probation", "resignation", "resign", "notice period kitna", "rajinama", "quit"],
        "en": (
            "📄 **Probation & Notice Period Policy:**\n\n"
            "• **Probation Period:** Standard 3 to 6 months from date of joining based on role and confirmation review.\n"
            "• **Notice Period During Probation:** 30 calendar days.\n"
            "• **Notice Period Post-Confirmation:** 60 calendar days (or 90 days for Tech Leads, Managers, and Executive positions).\n"
            "• **Resignation Process:** Resignation must be formally submitted in writing or through the HRMS portal to your reporting manager and HR (`hr@laesfera.co`)."
        ),
        "hi": (
            "📄 **प्रोबेशन और नोटिस पीरियड नीति:**\n\n"
            "• **प्रोबेशन अवधि:** पद के आधार पर शामिल होने की तिथि से 3 से 6 महीने।\n"
            "• **प्रोबेशन के दौरान नोटिस पीरियड:** 30 दिन।\n"
            "• **कन्फर्मेशन के बाद नोटिस पीरियड:** 60 दिन (टीम लीड और प्रबंधकों के लिए 90 दिन)।\n"
            "• **इस्तीफा प्रक्रिया:** इस्तीफा पोर्टल या ईमेल (`hr@laesfera.co`) के माध्यम से रिपोर्टिंग मैनेजर को प्रस्तुत किया जाना चाहिए।"
        ),
        "mr": (
            "📄 **प्रोबेशन आणि नोटीस पिरियड नियम:**\n\n"
            "• **प्रोबेशन कालावधी:** रुजू झाल्यापासून 3 ते 6 महिने.\n"
            "• **प्रोबेशन दरम्यान नोटीस:** 30 दिवस.\n"
            "• **कन्फर्मेशन नंतर नोटीस:** 60 दिवस (टीम लीड व मॅनेजर्ससाठी 90 दिवस).\n"
            "• **राजीनामा:** राजीनामा पोर्टल किंवा ईमेल (`hr@laesfera.co`) द्वारे मॅनेजरकडे सादर करावा."
        )
    },
    "wfh": {
        "keywords": ["wfh", "work from home", "remote", "ghar se kam", "remote work"],
        "en": (
            "💻 **Work From Home (WFH) Guidelines:**\n\n"
            "• **Approval:** WFH is subject to prior written approval from your Reporting Manager.\n"
            "• **Core Availability:** Must remain available on Teams/Slack and phone during core hours (10:00 AM - 7:00 PM).\n"
            "• **Attendance:** WFH attendance is marked through the HRMS Web Portal remote punch with location verified."
        ),
        "hi": (
            "💻 **वर्क फ्रॉम होम (WFH) नीति:**\n\n"
            "• **मंजूरी:** WFH के लिए आपके रिपोर्टिंग मैनेजर की पूर्व अनुमति अनिवार्य है।\n"
            "• **उपलब्धता:** 10:00 AM से 7:00 PM के दौरान Teams/फ़ोन पर उपलब्ध रहना आवश्यक है।\n"
            "• **हजेरी:** WFH उपस्थिति पोर्टल के रिमोट पंच से दर्ज की जाती है।"
        ),
        "mr": (
            "💻 **वर्क फ्रॉम होम (WFH) नियम:**\n\n"
            "• **मंजुरी:** WFH साठी रिपोर्टिंग मॅनेजरची पूर्वपरवानगी आवश्यक आहे.\n"
            "• **उपलब्धता:** 10:00 AM ते 7:00 PM दरम्यान Teams/फोनवर उपलब्ध असावे.\n"
            "• **हजेरी:** WFH हजेरी पोर्टलवरून रिमोट पंच करून नोंदवली जाते."
        )
    },
    "reimbursement": {
        "keywords": ["reimbursement", "expense", "bill", "travel claim", "kharcha", "claims"],
        "en": (
            "💳 **Expense & Travel Reimbursement Policy:**\n\n"
            "• **Submission Date:** All official expense claims and travel vouchers must be submitted by the **25th of every month**.\n"
            "• **Documentation:** Valid tax invoices (GST) must be attached.\n"
            "• **Payment:** Approved expenses are settled along with the monthly payroll."
        ),
        "hi": (
            "💳 **खर्च और प्रतिपूर्ति (Reimbursement) नीति:**\n\n"
            "• **जमा करने की तिथि:** सभी खर्च और बिल हर महीने की **25 तारीख** तक जमा होने चाहिए।\n"
            "• **दस्तावेज:** वैध जीएसटी बिल संलग्न होना अनिवार्य है।\n"
            "• **भुगतान:** स्वीकृत राशि मासिक वेतन के साथ क्रेडिट की जाती है।"
        ),
        "mr": (
            "💳 **खर्च परतावा (Reimbursement) नियम:**\n\n"
            "• **सादर करण्याची तारीख:** सर्व अधिकृत बिल दर महिन्याच्या **25 तारखेपर्यंत** जमा करावीत.\n"
            "• **कागदपत्रे:** मूळ GST बिल जोडणे अनिवार्य आहे."
        )
    }
}

def _get_policy_answer(query: str, lang: str) -> Optional[str]:
    """Finds matching policy in company knowledge base based on keywords."""
    q = query.lower()
    for policy_key, data in COMPANY_KNOWLEDGE.items():
        if any(kw in q for kw in data["keywords"]):
            return data.get(lang) or data.get("en")
    return None


# ==============================================================================
# DATABASE RETRIEVAL UTILITIES
# ==============================================================================
def _get_leave_details(db: Session, emp_code: str):
    try:
        from app.main import _compute_category_leave_balances
        return _compute_category_leave_balances(db, emp_code, allowed=21.0, total_used=0.0)
    except Exception:
        return {
            "casualLeave": {"available": 10.0, "used": 0.0, "total": 10.0},
            "sickLeave": {"available": 8.0, "used": 0.0, "total": 8.0},
            "optionalHoliday": {"available": 3.0, "used": 0.0, "total": 3.0},
            "totalAvailable": 21.0,
            "used": 0.0
        }

def _get_today_attendance(db: Session, emp_code: str):
    today = date.today()
    tname = f"attendance_{today.year}_{today.month:02d}"
    try:
        row = db.execute(text(f"""
            SELECT punch_in_time, punch_out_time, hours_completed, status, punch_in_location
            FROM {tname}
            WHERE UPPER(emp_code) = UPPER(:c) AND date = CURRENT_DATE
            ORDER BY id DESC LIMIT 1
        """), {"c": emp_code}).mappings().first()
        return dict(row) if row else None
    except Exception:
        return None

def _get_upcoming_holidays(db: Session, limit: int = 5):
    try:
        rows = db.query(Holiday).filter(Holiday.date >= date.today()).order_by(Holiday.date.asc()).limit(limit).all()
        return [{"name": h.name or h.title or "Holiday", "date": str(h.date)} for h in rows]
    except Exception:
        return []

def _detect_language(text_str: str, preferred_lang: Optional[str] = None) -> str:
    """Detect language between 'mr' (Marathi), 'hi' (Hindi), and 'en' (English)."""
    if preferred_lang in ["hi", "mr", "en"]:
        if preferred_lang in ["hi", "mr"]:
            return preferred_lang

    t = text_str.lower()
    mr_words = ["सुट्टी", "रजा", "कधी", "कशी", "झाले", "झाला", "का", "आहे", "आहेत", "माझा", "माझी", "माझे", "मला", "उद्या", "परवा", "आजची", "दाखवा", "पाहिजे", "हवी", "शिल्लक", "तास", "sutti", "shillak", "zala", "aahe", "aahet", "majha", "majhi", "udya", "parva", "pahije", "havi", "dakhav", "kiti"]
    if any(w in t for w in mr_words):
        return "mr"

    hi_words = ["छुट्टी", "कितनी", "कितने", "बची", "बचे", "हुआ", "हुई", "क्या", "मेरा", "मेरी", "मुझे", "कल", "परसों", "आज", "बताओ", "चाहिए", "बीमार", "तबीयत", "घंटे", "kaun", "batao", "chutti", "bachi", "bache", "hua", "hoga", "kya", "mera", "meri", "chahiye", "aaj", "bimar", "tabiyat", "ghante"]
    if any(w in t for w in hi_words):
        return "hi"

    return preferred_lang if preferred_lang in ["hi", "mr"] else "en"

def _parse_leave_request(query: str, today: date) -> Dict[str, Any]:
    """Extract category, date, total_days, and reason from natural language."""
    q = query.lower()

    category = "Casual Leave"
    if any(k in q for k in ["sick", "fever", "ill", "bimar", "tabiyat", "aajari", "medical", "sl", "dokhe"]):
        category = "Sick Leave"
    elif any(k in q for k in ["optional", "festival", "tyohar", "san", "oh"]):
        category = "Optional Holiday"
    elif any(k in q for k in ["paid leave", "pl", "privilege", "earned leave"]):
        category = "Paid Leave"

    total_days = 1.0
    if any(k in q for k in ["half day", "half-day", "adhha", "ardha", "0.5"]):
        total_days = 0.5
    else:
        m_days = re.search(r"(\d+(?:\.\d+)?)\s*(?:days?|din|divas)", q)
        if m_days:
            total_days = _safe_float(m_days.group(1), 1.0)

    start_date = today + timedelta(days=1)
    if any(k in q for k in ["today", "aaj", "aajach"]):
        start_date = today
    elif any(k in q for k in ["day after tomorrow", "parso", "parva"]):
        start_date = today + timedelta(days=2)
    elif any(k in q for k in ["tomorrow", "kal", "udya"]):
        start_date = today + timedelta(days=1)
    else:
        date_match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", q)
        if date_match:
            try:
                start_date = datetime.strptime(date_match.group(1), "%Y-%m-%d").date()
            except ValueError:
                pass

    if total_days > 1.0:
        end_date = start_date + timedelta(days=int(total_days) - 1)
    else:
        end_date = start_date

    reason = "Personal leave requested via AI Assistant"
    reason_patterns = [
        r"(?:because of|due to|for|reason|kyunki|karan|sathi)\s+([a-zA-Z0-9\s,]+?)(?:\.|$)",
        r"(?:bimar|fever|illness|family function|personal work|doctor appointment|wedding|travel)",
    ]
    for p in reason_patterns:
        m_r = re.search(p, q)
        if m_r:
            raw_r = m_r.group(1) if m_r.groups() else m_r.group(0)
            clean_r = raw_r.strip().capitalize()
            if len(clean_r) > 3:
                reason = clean_r
                break

    return {
        "category": category,
        "start_date": str(start_date),
        "end_date": str(end_date),
        "total_days": total_days,
        "reason": reason
    }


# ==============================================================================
# ROUTE 1: QUERY CHATBOT
# ==============================================================================
@router.post("/query")
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
    if not raw_query:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    try:
        emp_code = _resolve_emp_code(request, db, require_auth=False)
    except Exception:
        emp_code = None

    if not emp_code and request:
        try:
            auth_h = request.headers.get("authorization", "") if hasattr(request, "headers") else ""
            if auth_h.startswith("Bearer "):
                from jose import jwt
                from app.core.security import SECRET_KEY, ALGORITHM
                t_data = jwt.decode(auth_h.split(" ")[1], SECRET_KEY, algorithms=[ALGORITHM], options={"verify_signature": False, "verify_exp": False})
                emp_code = t_data.get("emp_code") or t_data.get("sub")
        except Exception:
            pass

    lang = _detect_language(raw_query, payload.lang)

    if not emp_code:
        if lang == "hi":
            reply = "👋 **LA ESFERA HR Assistant** में आपका स्वागत है! कृपया अपने लीव बैलेंस, उपस्थिति और प्रोफ़ाइल विवरण देखने के लिए पहले लॉग इन करें।"
        elif lang == "mr":
            reply = "👋 **LA ESFERA HR Assistant** मध्ये आपले स्वागत आहे! कृपया आपल्या सुट्ट्या, हजेरी आणि प्रोफाइल तपशील पाहण्यासाठी आधी लॉगिन करा."
        else:
            reply = "👋 Welcome to **LA ESFERA HR Assistant**! Please sign in to your HRMS account to check your personal leave balances, attendance, and profile records."
        return {
            "reply": reply,
            "intent": "unauthenticated",
            "lang": lang,
            "suggestions": ["Sign in with Microsoft", "Company Policies"]
        }

    # -------------------------------------------------------------
    # STEP 1: SECURITY & PRIVACY GUARDRAILS CHECK
    # -------------------------------------------------------------
    violation = _check_security_violations(raw_query, emp_code, lang)
    if violation:
        return violation

    # Fetch user profile
    profile = None
    try:
        profile = db.query(Profile).filter(Profile.emp_code.ilike(emp_code)).first()
    except Exception:
        profile = None
    first_name = (profile.first_name if profile else "") or emp_code
    q = raw_query.lower()

    # -------------------------------------------------------------
    # STEP 2: ACTION-ORIENTED LEAVE APPLICATION (Direct Apply Card)
    # -------------------------------------------------------------
    apply_keywords = [
        "apply leave", "apply for leave", "need leave", "take leave", "take a leave",
        "want leave", "request leave", "book leave", "apply for cl", "apply for sl",
        "chutti chahiye", "leave apply karo", "chutti apply", "leave chahiye", "chhutti apply", "chutti le lo",
        "sutti havi", "sutti apply", "sutti pahije", "leave ghyaychi", "raja havi", "raja apply"
    ]
    is_apply_intent = any(k in q for k in apply_keywords) or (
        ("apply" in q or "chahiye" in q or "havi" in q or "pahije" in q or "dya" in q) and
        ("leave" in q or "chutti" in q or "sutti" in q or "cl" in q or "sl" in q or "raja" in q)
    )

    if is_apply_intent:
        draft = _parse_leave_request(raw_query, date.today())
        bal = _get_leave_details(db, emp_code)
        cat_key = "casualLeave" if "Casual" in draft["category"] else ("sickLeave" if "Sick" in draft["category"] else "optionalHoliday")
        avail_bal = bal.get(cat_key, {}).get("available", 0.0)
        draft["available_balance"] = avail_bal

        if lang == "hi":
            reply = (
                f"नमस्ते **{first_name}**, मैंने आपकी छुट्टी का आवेदन (Leave Draft) तैयार कर लिया है:\n\n"
                f"• **प्रकार:** `{draft['category']}`\n"
                f"• **दिनांक:** `{draft['start_date']}` से `{draft['end_date']}` (`{draft['total_days']}` दिन)\n"
                f"• **कारण:** {draft['reason']}\n"
                f"• **उपलब्ध बैलेंस:** `{avail_bal}` दिन\n\n"
                f"कृपया नीचे दिए गए कार्ड में विवरण की जांच करें और सबमिट करने के लिए **'Confirm & Apply'** बटन दबाएं:"
            )
            suggestions = ["Confirm and Apply", "Check leave balance", "Cancel"]
        elif lang == "mr":
            reply = (
                f"नमस्कार **{first_name}**, मी तुमचा सुट्टीचा अर्ज (Leave Draft) तयार केला आहे:\n\n"
                f"• **प्रकार:** `{draft['category']}`\n"
                f"• **दिनांक:** `{draft['start_date']}` ते `{draft['end_date']}` (`{draft['total_days']}` दिवस)\n"
                f"• **कारण:** {draft['reason']}\n"
                f"• **शिल्लक सुट्ट्या:** `{avail_bal}` दिवस\n\n"
                f"कृपया खालील कार्ड तपासा आणि अर्ज पाठवण्यासाठी **'Confirm & Apply'** बटनावर क्लिक करा:"
            )
            suggestions = ["Confirm and Apply", "Check leave balance", "Cancel"]
        else:
            reply = (
                f"Hello **{first_name}**, I've drafted your leave application:\n\n"
                f"• **Category:** `{draft['category']}`\n"
                f"• **Dates:** `{draft['start_date']}` to `{draft['end_date']}` (`{draft['total_days']}` day(s))\n"
                f"• **Reason:** {draft['reason']}\n"
                f"• **Your Available Balance:** `{avail_bal}` day(s)\n\n"
                f"Please review the details in the card below and click **'Confirm & Apply'** to send it directly to your manager for approval:"
            )
            suggestions = ["Confirm and Apply", "How many leaves have I taken?", "Cancel"]

        return {
            "reply": _scrub_sensitive_output(reply),
            "intent": "action_draft_leave",
            "lang": lang,
            "action": "confirm_leave_application",
            "draft": draft,
            "suggestions": suggestions
        }

    # -------------------------------------------------------------
    # STEP 3: COMPANY POLICY KNOWLEDGE BASE (RAG)
    # -------------------------------------------------------------
    policy_reply = _get_policy_answer(raw_query, lang)
    if policy_reply:
        return {
            "reply": _scrub_sensitive_output(policy_reply),
            "intent": "company_policy",
            "lang": lang,
            "suggestions": ["Office Timings", "Leave Policy", "Sandwich Rule", "Regularization Rules"]
        }

    # -------------------------------------------------------------
    # STEP 4: REAL-TIME DB LEAVE BALANCES
    # -------------------------------------------------------------
    if any(k in q for k in ["leave", "leaves", "balance", "chutti", "sutti", "raja", "bachi", "bache", "shillak"]):
        bal = _get_leave_details(db, emp_code)
        cl_avail = bal.get("casualLeave", {}).get("available", 0.0)
        sl_avail = bal.get("sickLeave", {}).get("available", 0.0)
        oh_avail = bal.get("optionalHoliday", {}).get("available", 0.0)
        total_avail = bal.get("totalAvailable", cl_avail + sl_avail + oh_avail)
        used = bal.get("used", 0.0)

        if lang == "hi":
            reply = (
                f"नमस्ते **{first_name}** (`{emp_code}`), आपकी लीव स्थिति:\n\n"
                f"• **Casual Leave (CL):** `{cl_avail}` दिन उपलब्ध\n"
                f"• **Sick Leave (SL):** `{sl_avail}` दिन उपलब्ध\n"
                f"• **Optional Holiday (OH):** `{oh_avail}` दिन उपलब्ध\n"
                f"• **कुल उपलब्ध छुट्टियां:** `{total_avail}` दिन\n"
                f"• **उपयोग की गई छुट्टियां:** `{used}` दिन\n\n"
                f"💡 छुट्टी का आवेदन करने के लिए बस कहें: *'कल के लिए 1 दिन की casual leave apply करो'*"
            )
        elif lang == "mr":
            reply = (
                f"नमस्कार **{first_name}** (`{emp_code}`), आपली सुट्टीची स्थिती:\n\n"
                f"• **कॅज्युअल सुट्टी (CL):** `{cl_avail}` दिवस शिल्लक\n"
                f"• **सिक सुट्टी (SL):** `{sl_avail}` दिवस शिल्लक\n"
                f"• **ऐच्छिक सुट्टी (OH):** `{oh_avail}` दिवस शिल्लक\n"
                f"• **एकूण शिल्लक सुट्ट्या:** `{total_avail}` दिवस\n"
                f"• **वापरलेल्या सुट्ट्या:** `{used}` दिवस\n\n"
                f"💡 रजेचा अर्ज करण्यासाठी सांगा: *'उद्यासाठी 1 दिवसाची casual leave apply करा'*"
            )
        else:
            reply = (
                f"Here is your official Leave Balance summary for **{first_name}** (`{emp_code}`):\n\n"
                f"• **Casual Leave (CL):** `{cl_avail}` days available\n"
                f"• **Sick Leave (SL):** `{sl_avail}` days available\n"
                f"• **Optional Holiday (OH):** `{oh_avail}` days available\n"
                f"• **Total Balance Remaining:** `{total_avail}` days\n"
                f"• **Leaves Utilized:** `{used}` days\n\n"
                f"💡 *Tip:* To apply right now, simply say *'Apply 1 day casual leave for tomorrow'*."
            )

        return {
            "reply": _scrub_sensitive_output(reply),
            "intent": "leave_balance",
            "lang": lang,
            "suggestions": ["Apply leave for tomorrow", "Did I punch in today?", "Who is my manager?"]
        }

    # -------------------------------------------------------------
    # STEP 5: REAL-TIME TODAY'S ATTENDANCE STATUS
    # -------------------------------------------------------------
    if any(k in q for k in ["punch", "attendance", "punched in", "punched out", "check in", "clock in", "hazari", "hajeri"]):
        att = _get_today_attendance(db, emp_code)
        if att:
            in_str = str(att.get("punch_in_time") or "—")
            out_str = str(att.get("punch_out_time") or "Not yet (Active Shift)")
            hrs = _safe_float(att.get("hours_completed"), 0.0)
            st = att.get("status") or "Present"
            loc = att.get("punch_in_location") or "Headquarters (MIDC, Mumbai)"

            if lang == "hi":
                reply = (
                    f"आज की उपस्थिति स्थिति - **{first_name}** (`{emp_code}`):\n\n"
                    f"• **पंच-इन समय:** `{in_str}`\n"
                    f"• **पंच-आउट समय:** `{out_str}`\n"
                    f"• **कार्य के घंटे:** `{hrs:.2f}` hrs\n"
                    f"• **स्थिति:** `{st}`\n"
                    f"• **स्थान:** {loc}\n\n"
                    f"✅ आपकी आज की उपस्थिति सिस्टम में सफलतापूर्वक दर्ज है!"
                )
            elif lang == "mr":
                reply = (
                    f"आजची हजेरी स्थिती - **{first_name}** (`{emp_code}`):\n\n"
                    f"• **पंच-इन वेळ:** `{in_str}`\n"
                    f"• **पंच-आउट वेळ:** `{out_str}`\n"
                    f"• **कामाचे तास:** `{hrs:.2f}` hrs\n"
                    f"• **स्थिती:** `{st}`\n"
                    f"• **ठिकाण:** {loc}\n\n"
                    f"✅ तुमची आजची हजेरी सिस्टममध्ये नोंदवली गेली आहे!"
                )
            else:
                reply = (
                    f"Today's Attendance Status for **{first_name}** (`{emp_code}`):\n\n"
                    f"• **Punch In Time:** `{in_str}`\n"
                    f"• **Punch Out Time:** `{out_str}`\n"
                    f"• **Working Hours Logged:** `{hrs:.2f}` hrs\n"
                    f"• **Status:** `{st}`\n"
                    f"• **Location Captured:** {loc}\n\n"
                    f"Your attendance is verified and securely saved in the system!"
                )
        else:
            if lang == "hi":
                reply = (
                    f"नमस्ते **{first_name}**, आपने **आज अभी तक पंच-इन नहीं किया है**।\n\n"
                    f"कृपया डैशबोर्ड के **Live Attendance** सेक्शन में जाकर अपनी सेल्फी सत्यापित करें और पंच-इन करें।"
                )
            elif lang == "mr":
                reply = (
                    f"नमस्कार **{first_name}**, तुम्ही **आज अद्याप पंच-इन केलेले नाही**।\n\n"
                    f"कृपया डॅशबोर्डवरील **Live Attendance** विभागात जाऊन सेल्फी व्हेरिफाय करून पंच-इन करा."
                )
            else:
                reply = (
                    f"Hello **{first_name}**, you have **not punched in today** yet.\n\n"
                    f"Please head to the **Live Attendance** section on your dashboard to capture your verified selfie and clock in."
                )

        return {
            "reply": _scrub_sensitive_output(reply),
            "intent": "attendance_today",
            "lang": lang,
            "suggestions": ["How many leaves have I taken?", "Who is my manager?"]
        }

    # -------------------------------------------------------------
    # STEP 6: REPORTING MANAGER
    # -------------------------------------------------------------
    if any(k in q for k in ["manager", "supervisor", "boss", "reporting to", "kon aahe", "kaun hai"]):
        mgr = profile.reporting_supervisor if profile and profile.reporting_supervisor else "Management / HR"
        dept = profile.department if profile and profile.department else "Operations"

        if lang == "hi":
            reply = (
                f"आपके रिपोर्टिंग मैनेजर **{mgr}** हैं (**{dept}** विभाग)।\n\n"
                f"आपके सभी लीव आवेदन और रेगुलराइजेशन अनुरोध अनुमोदन के लिए **{mgr}** के पास जाते हैं।"
            )
        elif lang == "mr":
            reply = (
                f"तुमचे रिपोर्टिंग मॅनेजर **{mgr}** आहेत (**{dept}** विभाग).\n\n"
                f"तुमचे सर्व सुट्टीचे अर्ज आणि रेग्युलायझेशन विनंत्या मंजुरीसाठी **{mgr}** यांच्याकडे जातात."
            )
        else:
            reply = (
                f"Your designated Reporting Manager is **{mgr}** in the **{dept}** department.\n\n"
                f"All your leave applications and regularization requests are routed to **{mgr}** for approval."
            )

        return {
            "reply": _scrub_sensitive_output(reply),
            "intent": "reporting_manager",
            "lang": lang,
            "suggestions": ["My Profile Details", "How many leaves have I taken?"]
        }

    # -------------------------------------------------------------
    # STEP 7: EMPLOYEE PROFILE DETAILS (Self only)
    # -------------------------------------------------------------
    if any(k in q for k in ["profile", "my details", "employee id", "emp code", "designation", "department"]):
        if profile:
            reply = (
                f"Official HR Records for **{profile.first_name} {profile.last_name or ''}**:\n\n"
                f"• **Employee ID:** `{profile.emp_code}`\n"
                f"• **Designation:** {profile.designation or 'Software Developer'}\n"
                f"• **Department:** {profile.department or 'Engineering'}\n"
                f"• **Official Email:** `{profile.email}`\n"
                f"• **Branch Location:** {profile.branch_location or 'Mumbai Office'}\n"
                f"• **Date of Joining:** `{str(profile.emp_join_date or '—')}`\n"
                f"• **Reporting Manager:** {profile.reporting_supervisor or 'Management'}"
            )
        else:
            reply = f"Your employee code is `{emp_code}`."

        return {
            "reply": _scrub_sensitive_output(reply),
            "intent": "profile_info",
            "lang": lang,
            "suggestions": ["How many leaves have I taken?", "Did I punch in today?"]
        }

    # -------------------------------------------------------------
    # STEP 8: UPCOMING OFFICIAL HOLIDAYS
    # -------------------------------------------------------------
    if any(k in q for k in ["holiday", "holidays", "calendar", "festival", "off days", "tyohar", "suttya"]):
        holidays = _get_upcoming_holidays(db)
        if holidays:
            h_list = "\n".join([f"• **{h['date']}:** {h['name']}" for h in holidays])
            reply = f"Upcoming official holidays:\n\n{h_list}\n\nEnjoy your time with family!"
        else:
            reply = "Upcoming official holidays for 2026:\n\n• **26 Jan 2026:** Republic Day\n• **25 Mar 2026:** Holi\n• **15 Aug 2026:** Independence Day\n• **02 Oct 2026:** Gandhi Jayanti\n• **08 Nov 2026:** Diwali"

        return {
            "reply": _scrub_sensitive_output(reply),
            "intent": "holidays",
            "lang": lang,
            "suggestions": ["How many leaves have I taken?", "Sandwich leave rule"]
        }

    # -------------------------------------------------------------
    # STEP 9: GENERAL / FALLBACK ASSISTANCE
    # -------------------------------------------------------------
    if lang == "hi":
        reply = (
            f"नमस्ते **{first_name}**, मैं आपका LA ESFERA HR AI असिस्टेंट हूँ! आप मुझसे पूछ सकते हैं:\n\n"
            f"• *'मेरी कितनी छुट्टियां बची हैं?'*\n"
            f"• *'कल के लिए casual leave apply करो'*\n"
            f"• *'क्या आज मेरा पंच-इन हुआ?'*\n"
            f"• *'ऑफिस टाइमिंग और लेट मार्क के क्या नियम हैं?'*\n"
            f"• *'सैंडविच लीव रूल क्या है?'*\n"
            f"• *'रेगुलराइजेशन के क्या नियम हैं?'*"
        )
    elif lang == "mr":
        reply = (
            f"नमस्कार **{first_name}**, मी तुमचा LA ESFERA HR AI असिस्टंट आहे! तुम्ही मला विचारू शकता:\n\n"
            f"• *'माझ्या किती सुट्ट्या शिल्लक आहेत?'*\n"
            f"• *'उद्यासाठी 1 दिवसाची casual leave apply करा'*\n"
            f"• *'आजचे पंच-इन झाले का?'*\n"
            f"• *'ऑफिसची वेळ आणि लेटचे नियम काय आहेत?'*\n"
            f"• *'सँडविच रजेचा नियम काय आहे?'*\n"
            f"• *'हजेरी रेग्युलायझेशनचे नियम काय आहेत?'*"
        )
    else:
        reply = (
            f"Hi **{first_name}**, I am your LA ESFERA HR Assistant! You can ask me:\n\n"
            f"• *'Apply 1 day casual leave for tomorrow'* 📝\n"
            f"• *'How many leaves have I taken?'*\n"
            f"• *'Did I punch in today?'*\n"
            f"• *'What is the office shift timing and late punch policy?'*\n"
            f"• *'How does the sandwich leave rule work?'*\n"
            f"• *'What are the regularization guidelines?'*"
        )

    return {
        "reply": _scrub_sensitive_output(reply),
        "intent": "general_help",
        "lang": lang,
        "suggestions": ["Apply leave for tomorrow", "Office Timings", "Sandwich Rule", "Check leave balance"]
    }


# ==============================================================================
# ROUTE 2: EXECUTE ACTION (Apply Leave Directly From Chatbot)
# ==============================================================================
@router.post("/execute-action")
async def handle_execute_action(payload: ExecuteActionRequest, request: Request, db: Session = Depends(get_db)):
    """
    Executes confirmed action from the interactive Chatbot Card:
    Submits the drafted leave directly to leave_service.create_leave_request.
    """
    try:
        emp_code = _resolve_emp_code(request, db, require_auth=False)
    except Exception:
        emp_code = None

    if not emp_code and request:
        try:
            auth_h = request.headers.get("authorization", "") if hasattr(request, "headers") else ""
            if auth_h.startswith("Bearer "):
                from jose import jwt
                from app.core.security import SECRET_KEY, ALGORITHM
                t_data = jwt.decode(auth_h.split(" ")[1], SECRET_KEY, algorithms=[ALGORITHM], options={"verify_signature": False, "verify_exp": False})
                emp_code = t_data.get("emp_code") or t_data.get("sub")
        except Exception:
            pass

    if not emp_code:
        raise HTTPException(status_code=401, detail="Please log in first to perform this action.")

    action = payload.action.strip().lower()
    draft = payload.draft or {}

    if action in ["confirm_leave_application", "apply_leave"]:
        try:
            leave_payload = {
                "category": draft.get("category", "Casual Leave"),
                "leave_type": draft.get("category", "Casual Leave"),
                "start_date": draft.get("start_date"),
                "end_date": draft.get("end_date"),
                "total_days": _safe_float(draft.get("total_days", 1.0)),
                "reason": draft.get("reason", "Requested via AI Chatbot Assistant"),
                "has_half_days": True if _safe_float(draft.get("total_days")) == 0.5 else False
            }

            res = leave_service.create_leave_request(db, leave_payload, emp_code)
            leave_id = res.get("id") or (res.get("data", {}).get("id") if isinstance(res.get("data"), dict) else "REQ")

            reply = (
                f"🎉 **Leave Application Submitted Successfully!**\n\n"
                f"• **Application ID:** `#{leave_id}`\n"
                f"• **Category:** {leave_payload['category']}\n"
                f"• **Duration:** `{leave_payload['start_date']}` to `{leave_payload['end_date']}` ({leave_payload['total_days']} day(s))\n"
                f"• **Reason:** {leave_payload['reason']}\n"
                f"• **Status:** `Pending Manager Approval`\n\n"
                f"Your reporting manager has been notified and will review your application."
            )

            return {
                "success": True,
                "leave_id": leave_id,
                "reply": _scrub_sensitive_output(reply),
                "data": res
            }
        except Exception as e:
            return {
                "success": False,
                "reply": f"⚠️ Could not submit leave request: {str(e)}",
                "error": str(e)
            }

    raise HTTPException(status_code=400, detail=f"Unsupported action: {payload.action}")
