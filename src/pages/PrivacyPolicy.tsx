import { useState, useEffect } from "react";
import PublicLayout from "@/components/PublicLayout";
import SEO from "@/components/SEO";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const PrivacyPolicy = () => {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const lastUpdated = "January 10, 2025";

  return (
    <PublicLayout>
      <SEO title="Privacy Policy - MediVault" description="Read how MediVault collects, stores and protects your medical data under India's DPDP Act with strict privacy and security controls." path="/privacy-policy" type="article" />
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground">
              Last Updated: <span className="font-semibold">{lastUpdated}</span>
            </p>
          </div>

          {/* Important Notice */}
          <div className="mb-8 p-6 rounded-lg border-2 border-primary bg-primary/5">
            <p className="text-foreground font-medium text-center">
              Your privacy is critically important to us. This policy explains how we collect, use, protect, and share
              your medical information in line with India's Digital Personal Data Protection (DPDP) Act and other applicable laws.
            </p>
          </div>

          {/* Table of Contents */}
          <div className="mb-12 p-6 rounded-lg border bg-card">
            <h2 className="text-xl font-bold text-foreground mb-4">Table of Contents</h2>
            <nav className="space-y-2">
              {[
                { id: "introduction", title: "1. Introduction" },
                { id: "information-collected", title: "2. Information We Collect" },
                { id: "how-we-use", title: "3. How We Use Your Information" },
                { id: "sharing", title: "4. How We Share Your Information" },
                { id: "data-security", title: "5. Data Security" },
                { id: "your-rights", title: "6. Your Rights & Choices" },
                { id: "data-retention", title: "7. Data Retention" },
                { id: "hipaa", title: "8. Regulatory Status" },
                { id: "ai-ml", title: "9. AI & Machine Learning" },
                { id: "children", title: "10. Children's Privacy" },
                { id: "changes", title: "11. Changes to This Policy" },
                { id: "contact", title: "12. Contact Information" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="block w-full text-left px-3 py-2 rounded hover:bg-accent text-foreground transition-colors"
                >
                  {item.title}
                </button>
              ))}
            </nav>
          </div>

          {/* Content Sections */}
          <div className="space-y-12">
            {/* 1. Introduction */}
            <section id="introduction" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">1. Introduction</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Welcome to MediVault. We are committed to protecting the privacy and security of your medical
                  information. This Privacy Policy describes how MediVault ("we," "us," or "our") collects, uses,
                  discloses, and safeguards your personal health information when you use our medical record management
                  platform.
                </p>
                <p>
                  By creating an account and using MediVault, you consent to the data practices described in this
                  policy. If you do not agree with this policy, please do not use our services.
                </p>
                <p>
                  This policy applies to all users: patients, hospital staff, and healthcare providers using our
                  platform.
                </p>
              </div>
            </section>

            {/* 2. Information We Collect */}
            <section id="information-collected" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">2. Information We Collect</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>We collect the following types of information:</p>

                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-foreground mb-2">A. Personal Information</h3>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>Full name, date of birth, gender</li>
                    <li>Contact information (email address, phone number, address)</li>
                    <li>Emergency contact details</li>
                    <li>Profile photograph (optional)</li>
                  </ul>
                </div>

                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    B. Medical Information (Protected Health Information - PHI)
                  </h3>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>Medical documents (lab reports, prescriptions, diagnostic images, discharge summaries)</li>
                    <li>Blood group and allergy information</li>
                    <li>Diagnoses, conditions, and medical history</li>
                    <li>Medications and treatment plans</li>
                    <li>Healthcare provider information</li>
                    <li>Appointment records and consultation notes</li>
                  </ul>
                </div>

                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-foreground mb-2">C. Account Information</h3>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>Email address and a hashed password (we never store plain-text passwords)</li>
                    <li>User role (patient, hospital staff, doctor)</li>
                    <li>Account preferences and settings</li>
                    <li>Family member access grants</li>
                  </ul>
                </div>

                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-foreground mb-2">D. Usage Information</h3>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>Login times and session duration</li>
                    <li>Features used and pages visited</li>
                    <li>Document upload and access logs</li>
                    <li>Search queries within your documents</li>
                    <li>MediBot chat interactions</li>
                  </ul>
                </div>

                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-foreground mb-2">E. Technical Information</h3>
                  <ul className="list-disc ml-6 space-y-2">
                    <li>IP address and device identifiers</li>
                    <li>Browser type and version</li>
                    <li>Operating system</li>
                    <li>Device type (mobile, tablet, desktop)</li>
                    <li>Cookies and similar tracking technologies</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 3. How We Use Your Information */}
            <section id="how-we-use" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">3. How We Use Your Information</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>We use your information for the following purposes:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>
                    <strong>Providing Services:</strong> To store, organize, and display your medical records securely
                  </li>
                  <li>
                    <strong>Document Processing:</strong> To perform OCR (text extraction), categorization, and data
                    extraction from uploaded documents
                  </li>
                  <li>
                    <strong>AI Features:</strong> To generate patient summaries, power MediBot responses, and provide
                    intelligent search results
                  </li>
                  <li>
                    <strong>Healthcare Coordination:</strong> To facilitate appointment booking, document sharing
                    between patients and providers, and family member access
                  </li>
                  <li>
                    <strong>Notifications:</strong> To send alerts about new documents, appointment confirmations, and
                    security notifications
                  </li>
                  <li>
                    <strong>Security & Fraud Prevention:</strong> To monitor for unauthorized access, detect suspicious
                    activity, and maintain audit logs
                  </li>
                  <li>
                    <strong>Service Improvement:</strong> To analyze usage patterns (in aggregate, anonymized form) to
                    improve our platform
                  </li>
                  <li>
                    <strong>Legal Compliance:</strong> To comply with India's DPDP Act, other applicable data protection laws, and respond to legal
                    requests
                  </li>
                  <li>
                    <strong>Customer Support:</strong> To respond to your inquiries and provide technical assistance
                  </li>
                </ul>
              </div>
            </section>

            {/* 4. How We Share Your Information */}
            <section id="sharing" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">4. How We Share Your Information</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary">
                  <p className="font-bold text-foreground text-lg">WE DO NOT SELL YOUR MEDICAL DATA. EVER.</p>
                </div>
                <p>We only share your information in these specific circumstances:</p>

                <div className="ml-4 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">A. With Your Explicit Consent</h3>
                    <ul className="list-disc ml-6 space-y-2">
                      <li>Healthcare providers (doctors) you grant access to</li>
                      <li>Family members you authorize to view your records</li>
                      <li>When you share documents or export your data</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      B. With Service Providers
                    </h3>
                    <ul className="list-disc ml-6 space-y-2">
                      <li>
                        <strong>Supabase:</strong> Managed cloud database, storage and authentication hosting
                      </li>
                      <li>
                        <strong>Lovable Cloud:</strong> Application hosting and serverless functions
                      </li>
                      <li>
                        <strong>AI Providers (Google Gemini via Lovable AI Gateway):</strong> Document analysis and summarization
                      </li>
                    </ul>
                    <p className="mt-2">
                      All service providers are contractually obligated to protect your data and use it only for
                      providing services to us.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">C. For Legal Requirements</h3>
                    <ul className="list-disc ml-6 space-y-2">
                      <li>When required by law or court order</li>
                      <li>To comply with breach notification requirements under applicable laws</li>
                      <li>To prevent serious harm or protect public health</li>
                      <li>To law enforcement in specific legal circumstances</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">D. In Business Transfers</h3>
                    <p>
                      If MediVault is acquired or merged with another company, your information will be transferred to
                      the new entity. You will be notified of any such change, and the new entity will continue to honor
                      this privacy policy.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-accent mt-4">
                  <p className="font-semibold text-foreground">What We Never Do:</p>
                  <ul className="list-disc ml-6 mt-2 space-y-1">
                    <li>Sell your medical data to third parties</li>
                    <li>Use your data for marketing or advertising</li>
                    <li>Share with insurance companies without your consent</li>
                    <li>Allow unauthorized staff to browse patient records</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 5. Data Security */}
            <section id="data-security" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">5. Data Security</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>We implement standard security measures to protect your medical information:</p>

                <div className="ml-4 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Technical Safeguards</h3>
                    <ul className="list-disc ml-6 space-y-2">
                      <li>
                        <strong>AES-256 Encryption at Rest:</strong> All files stored on Supabase Storage are encrypted at rest
                      </li>
                      <li>
                        <strong>TLS in Transit:</strong> All connections between your device and our servers use TLS
                      </li>
                      <li>
                        <strong>Row-Level Security (RLS):</strong> Database policies ensure users can only access their own records
                      </li>
                      <li>
                        <strong>Secure Authentication:</strong> Email + password authentication with hashed credentials
                      </li>
                      <li>
                        <strong>Signed, time-limited URLs:</strong> File access requires short-lived signed URLs
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Administrative Safeguards</h3>
                    <ul className="list-disc ml-6 space-y-2">
                      <li>Limited operator access to production data (need-to-know basis)</li>
                      <li>Internal data handling guidelines</li>
                      <li>Incident response plan for security events</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Physical Safeguards</h3>
                    <ul className="list-disc ml-6 space-y-2">
                      <li>Data hosted on Supabase managed cloud infrastructure</li>
                      <li>Automated, managed backups</li>
                      <li>Disaster recovery handled by the underlying cloud platform</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Audit Logging</h3>
                    <p>
                      We maintain audit logs tracking who accessed what data and when, to help detect unauthorized access and support transparency.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500 mt-4">
                  <p className="font-semibold text-foreground mb-2">⚠️ Important Security Note:</p>
                  <p>
                    While we implement robust security measures, no system is 100% secure. You are responsible for
                    maintaining the confidentiality of your password and should immediately notify us of any
                    unauthorized access to your account.
                  </p>
                </div>
              </div>
            </section>

            {/* 6. Your Rights & Choices */}
            <section id="your-rights" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">6. Your Rights & Choices</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>Under India's DPDP Act and other applicable data protection laws, you have the following rights:</p>
                <ul className="list-disc ml-6 space-y-3">
                  <li>
                    <strong>Right to Access:</strong> View and download all your medical records at any time
                  </li>
                  <li>
                    <strong>Right to Correction:</strong> Request corrections to inaccurate personal information in your
                    profile
                  </li>
                  <li>
                    <strong>Right to Deletion:</strong> Delete your account and all associated data (with some legal
                    exceptions)
                  </li>
                  <li>
                    <strong>Right to Data Portability:</strong> Export your medical records in standard formats (PDF,
                    CSV)
                  </li>
                  <li>
                    <strong>Right to Restrict Access:</strong> Control who can view your records by granting and
                    revoking family member or provider access
                  </li>
                  <li>
                    <strong>Right to an Audit Log:</strong> View a history of who accessed your records and when
                  </li>
                  <li>
                    <strong>Right to Opt-Out:</strong> Disable email notifications (emergency alerts cannot be disabled)
                  </li>
                  <li>
                    <strong>Right to File a Complaint:</strong> Report privacy concerns to us or to the Data Protection Board of India under the DPDP Act
                  </li>
                </ul>

                <p className="mt-4">
                  To exercise any of these rights, contact our Data Protection Officer at{" "}
                  <a href="mailto:privacy@medivault.com" className="text-primary hover:underline">
                    privacy@medivault.com
                  </a>
                </p>
              </div>
            </section>

            {/* 7. Data Retention */}
            <section id="data-retention" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">7. Data Retention</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <ul className="list-disc ml-6 space-y-2">
                  <li>
                    <strong>Active Accounts:</strong> Medical records are stored indefinitely while your account is
                    active
                  </li>
                  <li>
                    <strong>Deleted Accounts:</strong> Data permanently deleted within 30 days of account deletion
                    request
                  </li>
                  <li>
                    <strong>Backups:</strong> Backup copies deleted within 90 days
                  </li>
                  <li>
                    <strong>Audit Logs:</strong> Access logs retained for a reasonable period for security and compliance purposes
                  </li>
                  <li>
                    <strong>Legal Holds:</strong> Data subject to legal proceedings retained until hold is lifted
                  </li>
                </ul>
                <p className="mt-4">
                  We retain data for as long as necessary to provide services and comply with legal obligations. You can
                  request early deletion of your account at any time.
                </p>
              </div>
            </section>

            {/* 8. Regulatory Status */}
            <section id="hipaa" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">8. Regulatory Status</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500">
                  <p className="font-semibold text-foreground mb-2">Honest disclosure</p>
                  <p>
                    MediVault is currently in active development. We are <strong>not</strong> certified as HIPAA, SOC 2, or ISO 27001 compliant, and we do not represent ourselves as such.
                  </p>
                </div>
                <p>What we DO follow today:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Privacy-first principles aligned with India's Digital Personal Data Protection (DPDP) Act, 2023</li>
                  <li>Encryption in transit (TLS) and at rest (AES-256 via Supabase Storage)</li>
                  <li>Row-Level Security at the database layer so users can only access their own records</li>
                  <li>Explicit, revocable consent for family access to records</li>
                  <li>User-initiated data export and account deletion</li>
                </ul>
                <p className="mt-4">
                  If you believe your privacy rights have been violated, you may contact us, or file a complaint with the Data Protection Board of India under the DPDP Act. We will not retaliate against you for filing a complaint.
                </p>
              </div>
            </section>

            {/* 9. AI & Machine Learning */}
            <section id="ai-ml" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">9. AI & Machine Learning</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>MediVault uses AI technology to enhance your experience:</p>

                <div className="ml-4 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">How AI Processes Your Data</h3>
                    <ul className="list-disc ml-6 space-y-2">
                      <li>OCR to extract text from scanned documents</li>
                      <li>Natural Language Processing to categorize documents</li>
                      <li>Data extraction to populate patient summaries</li>
                      <li>MediBot chatbot to answer questions about your records</li>
                      <li>Intelligent search to find relevant documents</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">AI Privacy</h3>
                    <ul className="list-disc ml-6 space-y-2">
                      <li>AI processing occurs over encrypted connections via the Lovable AI Gateway (Google Gemini)</li>
                      <li>Your documents are not used to train public AI models</li>
                      <li>AI providers process data on our behalf under their standard terms</li>
                      <li>Processing is encrypted in transit (TLS)</li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Accuracy Disclaimer</h3>
                    <p>
                      While our AI is highly accurate, it may occasionally make errors. Always verify critical medical
                      information from original documents. AI-generated summaries are for convenience only and should
                      not replace professional medical advice.
                    </p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Human Oversight</h3>
                    <p>
                      You can report AI errors, which are reviewed by our team to improve accuracy. Healthcare providers
                      always review AI-generated information before making clinical decisions.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 10. Children's Privacy */}
            <section id="children" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">10. Children's Privacy</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  MediVault is intended for users 13 years of age and older. We do not knowingly collect personal
                  information from children under 13 without parental consent.
                </p>
                <p>For users under 18:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>Parental consent is required to create an account</li>
                  <li>Parents/guardians can access their child's account through family member access</li>
                  <li>Minors' medical information is protected with the same security as adult records</li>
                </ul>
                <p className="mt-4">
                  If we discover we have collected information from a child under 13 without parental consent, we will
                  delete it immediately. Parents can contact us at{" "}
                  <a href="mailto:privacy@medivault.com" className="text-primary hover:underline">
                    privacy@medivault.com
                  </a>{" "}
                  to review or delete their child's information.
                </p>
              </div>
            </section>

            {/* 11. Changes to This Policy */}
            <section id="changes" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">11. Changes to This Policy</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  We may update this Privacy Policy from time to time to reflect changes in our practices, technology,
                  legal requirements, or other factors.
                </p>
                <p>When we make material changes:</p>
                <ul className="list-disc ml-6 space-y-2">
                  <li>We will update the "Last Updated" date at the top of this page</li>
                  <li>We will send email notifications to all active users</li>
                  <li>We will display a prominent notice on our website for 30 days</li>
                  <li>
                    For significant changes affecting your rights, we may require you to accept the new policy before
                    continuing to use the service
                  </li>
                </ul>
                <p className="mt-4">
                  We encourage you to review this policy periodically. Continued use of MediVault after changes are
                  posted constitutes acceptance of the updated policy.
                </p>
              </div>
            </section>

            {/* 12. Contact Information */}
            <section id="contact" className="scroll-mt-8">
              <h2 className="text-2xl font-bold text-foreground mb-4">12. Contact Information</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  If you have questions, concerns, or requests regarding this Privacy Policy or our data practices,
                  please contact us:
                </p>

                <div className="ml-4 space-y-4 mt-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Data Protection Officer</h3>
                    <p>Email: medivault01@gmail.com</p>
                    <p>Phone: 7737116518 ( for urgent privacy concerns)</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">General Support</h3>
                    <p>Email: medivault01@gmail.com</p>
                    <p>Response time: Within 24 hours on weekdays</p>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">File a Grievance</h3>
                    <p>If you believe your privacy rights have been violated, you may also file a complaint with:</p>
                    <p className="mt-2">
                      National Health Authority (NHA)
                      <br />
                      Ministry of Health and Family Welfare
                      <br />
                      Government of India
                      <br />
                      9th Floor, Tower-l, Jeevan Bharati Building
                      <br />
                      Connaught Place, New Delhi - 110001
                      <br />
                      Toll-Free: 14477
                      <br />
                      Website:{" "}
                      <a
                        href="https://nha.gov.in/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        nha.gov.in
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Final Note */}
            <div className="mt-12 p-6 rounded-lg border-2 border-primary bg-primary/5">
              <p className="text-foreground text-center font-medium">
                Thank you for trusting MediVault with your medical information. Your privacy and security are our top
                priorities.
              </p>
            </div>
          </div>

          {/* Scroll to Top Button */}
          {showScrollTop && (
            <Button onClick={scrollToTop} className="fixed bottom-8 right-8 rounded-full p-3 shadow-lg" size="icon">
              <ChevronUp className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </PublicLayout>
  );
};

export default PrivacyPolicy;
