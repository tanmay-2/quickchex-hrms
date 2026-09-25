import React, { useMemo, useState } from "react";
import {
  ChevronDown,
  HelpCircle,
  Mail,
  MessageCircle,
  Search,
} from "lucide-react";
import "./FaqPage.css";

const FAQ_DATA = [
  {
    category: "Dashboard",
    question: "What can I see on the admin dashboard?",
    answer:
      "The admin dashboard provides an overview of employee activity, departments, headcount, pending requests, process alerts, events, setup issues, birthdays and other management information.",
  },
  {
    category: "Employees",
    question: "How can I view employee information?",
    answer:
      "Open Employee Directory from the Organisation section. You can search employees and open their employee details from the directory.",
  },
  {
    category: "Attendance",
    question: "Where can I view attendance records?",
    answer:
      "Use Attendance or Attendance Records from the Attendance section to review employee attendance, check-in, check-out and attendance status.",
  },
  {
    category: "Leave",
    question: "How can I manage employee leave?",
    answer:
      "Open Leave from the Attendance section to review and manage leave-related information and requests.",
  },
  {
    category: "Payroll",
    question: "Where can I manage employee salary and payslips?",
    answer:
      "Open Employee Salary under Payroll. The salary page provides payroll records, salary information and available payslip actions.",
  },
  {
    category: "Payroll",
    question: "How do I upload monthly payroll?",
    answer:
      "Use the Upload Excel action on the Employee Salary page. The payroll workflow validates the uploaded file and processes the imported salary records.",
  },
  {
    category: "Tickets",
    question: "Where can I view support tickets?",
    answer:
      "Open Tickets from the Organisation section to review and manage employee support requests.",
  },
  {
    category: "System",
    question: "How do I switch between light and dark mode?",
    answer:
      "Use the existing theme control in the application interface. The dashboard and supporting admin pages are designed to follow the active application theme.",
  },
];

export default function FaqPage() {
  const [searchText, setSearchText] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [openIndex, setOpenIndex] = useState(0);

  const categories = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(FAQ_DATA.map((item) => item.category))
      ),
    ];
  }, []);

  const filteredFaqs = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return FAQ_DATA.filter((item) => {
      const matchesCategory =
        activeCategory === "All" ||
        item.category === activeCategory;

      const matchesSearch =
        !query ||
        `${item.category} ${item.question} ${item.answer}`
          .toLowerCase()
          .includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchText]);

  return (
    <div className="admin-faq-page">
      <div className="admin-faq-shell">


        <section className="admin-faq-hero">
          <div className="admin-faq-hero-copy">
            <span className="admin-faq-kicker">
              INSTANT ANSWERS
            </span>

            <h2>
              How can we help you today?
            </h2>

            <p>
              Search the knowledge base or browse questions
              by category.
            </p>
          </div>

          <div className="admin-faq-search">
            <input
              type="text"
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
              }
              placeholder="Search questions..."
              aria-label="Search FAQ"
            />
          </div>
        </section>

        <nav className="admin-faq-categories">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={
                activeCategory === category
                  ? "active"
                  : ""
              }
              onClick={() => {
                setActiveCategory(category);
                setOpenIndex(0);
              }}
            >
              {category}
            </button>
          ))}
        </nav>

        <main className="admin-faq-main">
          <section className="admin-faq-list">
            {filteredFaqs.length === 0 ? (
              <div className="admin-faq-empty">
                <HelpCircle size={28} />

                <strong>
                  No matching questions
                </strong>

                <span>
                  Try another search or category.
                </span>
              </div>
            ) : (
              filteredFaqs.map((item, index) => {
                const isOpen = openIndex === index;

                return (
                  <article
                    key={`${item.category}-${item.question}`}
                    className={`admin-faq-item ${
                      isOpen ? "open" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="admin-faq-question"
                      aria-expanded={isOpen}
                      onClick={() =>
                        setOpenIndex(
                          isOpen ? -1 : index
                        )
                      }
                    >
                      <span>
                        <small>
                          {item.category}
                        </small>

                        <strong>
                          {item.question}
                        </strong>
                      </span>

                      <ChevronDown
                        size={18}
                        className={
                          isOpen
                            ? "rotated"
                            : ""
                        }
                      />
                    </button>

                    {isOpen && (
                      <div className="admin-faq-answer">
                        {item.answer}
                      </div>
                    )}
                  </article>
                );
              })
            )}
          </section>

          <aside className="admin-faq-support">
            <div className="admin-faq-support-icon">
              <MessageCircle size={21} />
            </div>

            <h3>Still need help?</h3>

            <p>
              Contact your HR or support team for
              account-specific assistance.
            </p>

            <a
              href="mailto:hr@laesfera.co"
              className="admin-faq-support-button"
            >
              <Mail size={16} />
              Contact Support
            </a>
          </aside>
        </main>

        <footer className="admin-faq-footer">
          <HelpCircle size={15} />
          <span>
            What can we help you with?
          </span>

          <div className="admin-faq-footer-search">
            <input
              type="text"
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
              }
              placeholder="Search help..."
            />
          </div>
        </footer>
      </div>
    </div>
  );
}