import { useState } from "react";
import PublicLayout from "@/components/PublicLayout";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Search, Rocket, User, Hospital, Stethoscope, Lock, Settings, Wrench } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const faqData: FAQItem[] = [
    // Getting Started
    {
      category: "Getting Started",
      question: "What is MediVault and how does it work?",
      answer: "MediVault is a secure digital platform for storing and managing medical records. Think of it as a safe online filing cabinet for all your health documents. Hospitals upload your test reports, prescriptions, and medical records directly to your account. You can then view them anytime from your phone or computer, share them with doctors, or let family members access them. Everything is encrypted and secure, just like online banking."
    },
    {
      category: "Getting Started",
      question: "Who can use MediVault?",
      answer: "MediVault has three types of users: Patients (anyone who wants to store their medical records), Hospital Staff (who upload patient documents), and Doctors (who view patient records and manage appointments). Anyone can create a free patient account to start storing their medical documents."
    },
    {
      category: "Getting Started",
      question: "How do I create an account?",
      answer: "Click the 'Sign In' button at the top of the page, then click 'Sign Up'. Enter your email address and create a password. You'll receive a confirmation email - click the link inside to verify your account. Once verified, you can log in and start using MediVault immediately."
    },
    {
      category: "Getting Started",
      question: "What's the difference between Patient, Hospital Staff, and Doctor accounts?",
      answer: "Patient accounts are for individuals storing their own medical records. Hospital Staff accounts are for healthcare workers who upload patient documents from hospitals or clinics. Doctor accounts can view patient records (with permission), manage appointments, and access patient summaries. Each account type has different features based on their role in healthcare."
    },
    {
      category: "Getting Started",
      question: "Is MediVault free to use?",
      answer: "Yes! MediVault is completely free for patients to store and access their medical records. There are no hidden fees, subscription costs, or charges for uploading documents. Our goal is to make healthcare record management accessible to everyone."
    },
    {
      category: "Getting Started",
      question: "Do I need to download an app to use MediVault?",
      answer: "No app download is required! MediVault works directly in your web browser on any device - phone, tablet, or computer. Just visit the website, log in, and you're ready to go. However, we do have mobile-optimized features like camera scanning that work great on phones."
    },

    // For Patients
    {
      category: "For Patients",
      question: "How do I view my medical documents?",
      answer: "After logging in, go to your Patient Dashboard. You'll see all your documents organized by date. Click on any document to view it in full size. You can zoom in, download, or print any document. Use the Timeline view to see your medical history in chronological order."
    },
    {
      category: "For Patients",
      question: "How do I upload my own documents?",
      answer: "On your Patient Dashboard, click the 'Upload Document' button. You can either drag and drop files from your computer or click to browse and select them. Supported formats include PDF, JPG, PNG, and other common image formats. The system will automatically process and categorize your document."
    },
    {
      category: "For Patients",
      question: "Can I use my phone camera to scan documents?",
      answer: "Yes! Click the camera icon in the upload section. Your phone camera will open, allowing you to take a photo of your paper document. The system uses OCR (text recognition) to read the document and extract important information automatically. This is perfect for quickly scanning prescriptions or lab reports."
    },
    {
      category: "For Patients",
      question: "What is the Timeline view and how does it work?",
      answer: "The Timeline view shows your medical history like a story - starting from your oldest documents to the most recent. Each document appears as a card on a vertical timeline with the date clearly marked. This makes it easy to see how your health has progressed over time and find documents from specific dates."
    },
    {
      category: "For Patients",
      question: "How do I search for specific documents?",
      answer: "Use the search bar at the top of your dashboard. You can search by document type (like 'blood test' or 'prescription'), date ranges, doctor names, or even text content within documents. The system searches through all your documents and shows matching results instantly."
    },
    {
      category: "For Patients",
      question: "What is the Patient Summary and how is it generated?",
      answer: "The Patient Summary is like a 'quick view' of your medical history created by our AI assistant. It reads through all your uploaded documents and creates a simple overview showing your diagnoses, current medications, allergies, and recent lab results. Think of it as your medical records simplified into one easy-to-read page. The AI updates it automatically whenever new documents are added."
    },
    {
      category: "For Patients",
      question: "What is MediBot and how can it help me?",
      answer: "MediBot is your personal AI health assistant. You can ask it questions about your medical records, like 'What was my blood sugar level last month?' or 'What medications am I currently taking?'. It reads your documents and provides quick answers. MediBot can also explain medical terms in simple language and help you understand your test results."
    },
    {
      category: "For Patients",
      question: "How do I book appointments with my doctor?",
      answer: "Go to the 'Appointments' section in your dashboard. Click 'Book Appointment', select your doctor from the list, choose an available date and time, and add any notes about why you need the appointment. Your doctor will receive the request and can confirm or suggest an alternative time. You'll receive notifications when your appointment is confirmed."
    },
    {
      category: "For Patients",
      question: "How do I share access with family members?",
      answer: "Go to the 'Family Access' section in your dashboard. Click 'Grant Access', enter your family member's email address, and click send. They'll receive an email invitation to create their account. Once they sign up, they can view your medical documents. Family members can only VIEW your documents - they cannot edit, delete, or upload anything."
    },
    {
      category: "For Patients",
      question: "Can I control what documents family members can see?",
      answer: "Currently, when you grant family access, they can view all your documents. However, you can revoke their access at any time, which immediately removes their ability to see your records. We're working on adding selective document sharing in future updates."
    },
    {
      category: "For Patients",
      question: "How do I revoke family member access?",
      answer: "Go to the 'Family Access' section, find the family member you want to remove, and click 'Revoke Access'. Their access will be removed immediately, and they'll receive an email notification. They will no longer be able to view any of your medical documents."
    },
    {
      category: "For Patients",
      question: "Can I download or print my documents?",
      answer: "Yes! Click on any document to view it in full screen, then click the download icon to save it to your device, or click the print icon to print it. You can also download multiple documents at once by selecting them and choosing 'Download Selected'."
    },

    // For Hospital Staff
    {
      category: "For Hospital Staff",
      question: "How do I upload patient documents?",
      answer: "Log in to your Hospital Staff account, click 'Upload Document', enter the patient's unique ID or search for them by name, select the document type (lab report, prescription, scan, etc.), upload the file, and click submit. The patient will be automatically notified that a new document has been added to their account."
    },
    {
      category: "For Hospital Staff",
      question: "How do I find a patient in the system?",
      answer: "Use the patient search bar on your dashboard. You can search by patient ID, name, phone number, or email address. The system will show matching patients, and you can click on their profile to view their basic information or upload documents."
    },
    {
      category: "For Hospital Staff",
      question: "What happens after I upload a document?",
      answer: "After uploading, our AI system automatically processes the document to extract important information like test results, medications, and diagnoses. The patient receives an instant notification via email or in-app alert. The document appears in their timeline and becomes searchable within seconds."
    },
    {
      category: "For Hospital Staff",
      question: "Do patients get notified when I upload their documents?",
      answer: "Yes, patients receive immediate notifications when new documents are uploaded to their account. They get both an email notification and an in-app alert (if they're logged in). This keeps patients informed about their medical records in real-time."
    },
    {
      category: "For Hospital Staff",
      question: "Can I upload multiple documents at once?",
      answer: "Yes! You can select multiple files during the upload process. The system will process each document individually and categorize them automatically. This is useful when you have several test reports or scans to upload for the same patient."
    },
    {
      category: "For Hospital Staff",
      question: "What document types are supported?",
      answer: "We support PDF files, images (JPG, PNG, JPEG), and scanned documents. Common document types include lab reports, prescriptions, X-rays, CT scans, MRI reports, discharge summaries, consultation notes, and vaccination records. Files up to 10MB are supported."
    },
    {
      category: "For Hospital Staff",
      question: "How do I handle sensitive or urgent reports?",
      answer: "When uploading sensitive documents (like cancer diagnoses or critical test results), you can mark them as 'Important' during upload. This flags the document for the patient and ensures it appears prominently in their dashboard. For truly urgent matters, we recommend also calling the patient directly."
    },
    {
      category: "For Hospital Staff",
      question: "Can I see who has accessed a patient's documents?",
      answer: "Yes, click on a patient's profile to see their access log. This shows when the patient viewed their documents, when family members accessed them, and when other healthcare providers viewed the records. This audit trail helps maintain security and compliance."
    },

    // For Doctors
    {
      category: "For Doctors",
      question: "How do I access patient records?",
      answer: "When a patient books an appointment with you or grants you access, you can view their complete medical history. Go to your Doctor Dashboard, click on the patient's name, and you'll see all their documents, patient summary, and medical timeline. You can only access records of patients who have given you permission."
    },
    {
      category: "For Doctors",
      question: "How do I manage my appointments?",
      answer: "Your Doctor Dashboard shows all upcoming appointments. You can view patient details before appointments, reschedule if needed, add notes after consultations, and mark appointments as completed. Patients receive notifications about any schedule changes."
    },
    {
      category: "For Doctors",
      question: "Can I add my own patients to the system?",
      answer: "Yes, you can invite patients to join MediVault by entering their email address. They'll receive an invitation to create an account. Once they sign up, you can request access to view their records. This is useful for bringing your existing patients onto the platform."
    },
    {
      category: "For Doctors",
      question: "How do I update patient information?",
      answer: "When viewing a patient's profile, click 'Edit Information' to update details like contact information, allergies, current medications, or medical notes. Changes are saved immediately and the patient is notified of any updates to their profile."
    },
    {
      category: "For Doctors",
      question: "What is the difference between Doctor and Hospital Staff accounts?",
      answer: "Hospital Staff accounts are designed for administrators and technicians who upload documents on behalf of the hospital. Doctor accounts have additional features like appointment management, viewing patient summaries, adding consultation notes, and accessing comprehensive patient histories. Doctors have a more clinical-focused interface."
    },
    {
      category: "For Doctors",
      question: "Can I see appointment history with my patients?",
      answer: "Yes, click on any patient in your dashboard to see your complete appointment history with them, including past appointments, consultation notes you've added, and any documents uploaded during or after those visits."
    },
    {
      category: "For Doctors",
      question: "How do I communicate with my patients through MediVault?",
      answer: "Currently, communication happens through appointment booking notifications and document sharing. When you upload a consultation note or prescription, patients are notified immediately. We're working on adding direct messaging features in future updates."
    },

    // Security & Privacy
    {
      category: "Security & Privacy",
      question: "Is my medical data secure?",
      answer: "Absolutely! We use bank-level security (256-bit AES encryption) to protect all medical data. Your documents are encrypted both when stored on our servers and when transmitted over the internet. We're also HIPAA compliant, which means we follow strict healthcare privacy laws. Only you and people you explicitly grant access can view your documents."
    },
    {
      category: "Security & Privacy",
      question: "What is encryption and how does MediVault use it?",
      answer: "Encryption is like putting your documents in a locked safe where only you have the key. When you upload a medical report, MediVault scrambles it into a secret code that nobody can read without the special key. We use '256-bit encryption' - the same security level that banks use to protect your money. Even our own staff cannot read your documents without your permission."
    },
    {
      category: "Security & Privacy",
      question: "Is MediVault HIPAA compliant?",
      answer: "Yes, MediVault is fully HIPAA compliant. HIPAA (Health Insurance Portability and Accountability Act) is a US law that requires strict protection of medical information. We follow all HIPAA requirements including secure data storage, access controls, audit logging, and breach notification procedures. We also sign Business Associate Agreements with healthcare providers."
    },
    {
      category: "Security & Privacy",
      question: "Who can access my medical records?",
      answer: "Only you can access your medical records by default. You control who sees your documents by explicitly granting access to family members or doctors. Hospital staff can only upload documents - they cannot browse or view your existing records. Every access to your documents is logged for security purposes."
    },
    {
      category: "Security & Privacy",
      question: "Does MediVault share my data with third parties?",
      answer: "No, we do NOT sell your medical data to anyone. Ever. We only share your information in these situations: 1) When YOU grant access to family members or doctors, 2) When required by law (like a court order), or 3) With our secure service providers (like Supabase for database hosting) who are legally bound to protect your data. We will never share your data for marketing or advertising purposes."
    },
    {
      category: "Security & Privacy",
      question: "How does the AI analyze my documents - is it safe?",
      answer: "Our AI reads your documents to extract information like test results and diagnoses, but it runs in a secure, encrypted environment. The AI never stores your documents outside our secure system. Think of it like a robot librarian that reads your files to organize them, but can't take them out of the library. The AI processing is HIPAA compliant and all data remains encrypted."
    },
    {
      category: "Security & Privacy",
      question: "What happens if I forget my password?",
      answer: "Click 'Forgot Password' on the login page, enter your email address, and we'll send you a secure link to reset your password. For security reasons, we never store your actual password - we only store an encrypted version. This means even our staff cannot see or retrieve your password."
    },
    {
      category: "Security & Privacy",
      question: "Can I delete my account and all my data?",
      answer: "Yes, you have the right to delete your account at any time. Go to Settings > Account > Delete Account. This will permanently remove all your documents, personal information, and medical records from our system. This action cannot be undone, so make sure to download any documents you want to keep before deleting your account."
    },
    {
      category: "Security & Privacy",
      question: "How long is my data stored?",
      answer: "Your medical records are stored indefinitely as long as your account is active. This ensures you always have access to your complete medical history. If you delete your account, we permanently remove your data within 30 days. Backup copies are deleted within 90 days. We're required to keep some audit logs (who accessed what and when) for 7 years for legal compliance."
    },
    {
      category: "Security & Privacy",
      question: "What should I do if I notice suspicious activity?",
      answer: "If you see unauthorized access or suspicious activity in your account, immediately change your password, check your access log to see who accessed your records, revoke any suspicious family member access, and contact our support team at support@medivault.com. We take security very seriously and will investigate any reported incidents."
    },

    // Features & Functionality
    {
      category: "Features & Functionality",
      question: "What is OCR and how does it work with my documents?",
      answer: "OCR stands for 'Optical Character Recognition'. It's technology that reads text from images or scanned documents, like taking a photo of a page and having a computer type out all the words. When you upload a photo of a prescription, OCR reads the medicine names, dosages, and doctor's instructions. This makes your documents searchable - you can type 'aspirin' and find all prescriptions containing that medicine."
    },
    {
      category: "Features & Functionality",
      question: "How accurate is the document categorization?",
      answer: "Our AI categorizes documents correctly about 95% of the time. It looks at document content, headings, and medical terminology to determine if something is a lab report, prescription, scan, etc. If the AI categorizes something incorrectly, you can manually change the category by clicking 'Edit' on the document."
    },
    {
      category: "Features & Functionality",
      question: "Can I edit information in my documents?",
      answer: "You cannot edit the actual document files (like changing words in a PDF), as this would compromise medical record integrity. However, you can add notes to documents, update the category, or edit your personal information (like allergies or contact details) in your profile. If a document contains errors, contact the hospital that issued it for a corrected version."
    },
    {
      category: "Features & Functionality",
      question: "What if the AI extracts incorrect information from my document?",
      answer: "If you notice the AI extracted wrong information (like an incorrect blood sugar reading), click 'Report Issue' on that document. You can submit a correction, and our team will review it. You can also add a note to the document explaining the correct information. The AI learns from these corrections to improve accuracy."
    },
    {
      category: "Features & Functionality",
      question: "Why do I need to provide blood group and allergies?",
      answer: "Blood group and allergy information are critical in medical emergencies. If you're unconscious or unable to communicate, having this information readily available in your profile can save your life. Doctors and family members with access can instantly see these vital details without searching through documents."
    },
    {
      category: "Features & Functionality",
      question: "Can I set document privacy levels?",
      answer: "Currently, all documents in your account have the same privacy level - visible only to you and people you grant access to. We're working on adding granular privacy controls where you can mark certain documents as 'Private' (visible only to you) or 'Shared' (visible to family members and doctors)."
    },
    {
      category: "Features & Functionality",
      question: "What notifications will I receive?",
      answer: "You'll receive notifications when: a hospital uploads a new document, a doctor requests access to your records, an appointment is confirmed or rescheduled, a family member is granted access, or important updates are made to your profile. You can customize notification preferences in Settings to choose email, in-app, or both."
    },
    {
      category: "Features & Functionality",
      question: "Can I use MediVault offline?",
      answer: "You need an internet connection to upload or view documents since they're stored securely in the cloud. However, you can download documents to your device for offline viewing. We're working on adding offline capabilities where recently viewed documents are cached on your device for emergency access."
    },

    // Technical & Troubleshooting
    {
      category: "Technical & Troubleshooting",
      question: "What browsers are supported?",
      answer: "MediVault works best on modern browsers: Google Chrome (version 90+), Safari (version 14+), Firefox (version 88+), and Microsoft Edge (version 90+). For the best experience, keep your browser updated to the latest version. Mobile browsers on iOS and Android are also fully supported."
    },
    {
      category: "Technical & Troubleshooting",
      question: "Why can't I see my recently uploaded document?",
      answer: "Documents usually appear within 30 seconds after upload. If you don't see it, try refreshing the page (F5 on keyboard or pull down on mobile). If it's still missing after 2 minutes, check your internet connection, verify the upload completed successfully (you should see a success message), or try logging out and back in. If problems persist, contact support."
    },
    {
      category: "Technical & Troubleshooting",
      question: "The camera feature isn't working - what should I do?",
      answer: "First, make sure you've given MediVault permission to access your camera. Check your browser settings (usually a camera icon in the address bar) or phone settings under Privacy > Camera. Also ensure no other app is using the camera. Try closing other apps, refreshing the page, or using a different browser. On iOS, camera access requires Safari or Chrome."
    },
    {
      category: "Technical & Troubleshooting",
      question: "Why is my document taking long to process?",
      answer: "Large documents (over 5MB) or those with many pages take longer to process - usually 1-3 minutes. Complex documents with handwritten text or poor image quality also take longer as the OCR works harder to read them. If a document is processing for over 5 minutes, try refreshing the page. If still stuck, contact support with the document name."
    },
    {
      category: "Technical & Troubleshooting",
      question: "I'm not receiving email notifications - what's wrong?",
      answer: "Check your spam/junk folder - sometimes our emails end up there. Add noreply@medivault.com to your contacts to prevent this. Also verify your email address is correct in Settings > Profile. If using Gmail, check the Promotions or Updates tabs. Still not receiving emails? Contact support to verify your email settings on our end."
    },
    {
      category: "Technical & Troubleshooting",
      question: "Can I access MediVault on my tablet or phone?",
      answer: "Yes! MediVault is fully responsive and works on all devices. On mobile phones, you get a special mobile-optimized interface with bottom navigation for easy thumb access. Tablets show the full desktop layout. All features work on mobile, including camera scanning, document viewing, and appointment booking."
    },
    {
      category: "Technical & Troubleshooting",
      question: "What should I do if I encounter an error?",
      answer: "Take a screenshot of the error message, note what you were trying to do when it happened, and try refreshing the page. Most temporary errors resolve with a refresh. If the error persists, log out and log back in. Still having issues? Contact our support team at support@medivault.com with your screenshot and description - we usually respond within 24 hours."
    },
    {
      category: "Technical & Troubleshooting",
      question: "How do I contact support?",
      answer: "You can reach our support team at support@medivault.com or use the 'Contact Us' page on our website. For urgent issues affecting patient safety, call our 24/7 hotline at 1-800-MEDI-VAULT. We typically respond to emails within 24 hours on weekdays. Include your account email and a detailed description of your issue for faster resolution."
    }
  ];

  const categories = [
    { name: "Getting Started", icon: Rocket, color: "bg-blue-500" },
    { name: "For Patients", icon: User, color: "bg-green-500" },
    { name: "For Hospital Staff", icon: Hospital, color: "bg-purple-500" },
    { name: "For Doctors", icon: Stethoscope, color: "bg-red-500" },
    { name: "Security & Privacy", icon: Lock, color: "bg-yellow-500" },
    { name: "Features & Functionality", icon: Settings, color: "bg-indigo-500" },
    { name: "Technical & Troubleshooting", icon: Wrench, color: "bg-orange-500" }
  ];

  const filteredFAQs = faqData.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryIcon = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    if (!category) return null;
    const Icon = category.icon;
    return <Icon className="h-5 w-5" />;
  };

  const getCategoryColor = (categoryName: string) => {
    const category = categories.find(cat => cat.name === categoryName);
    return category?.color || "bg-gray-500";
  };

  return (
    <PublicLayout>
      <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about MediVault
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-8 sticky top-4 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 rounded-lg shadow-lg border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                type="text"
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-muted-foreground mt-2">
                Found {filteredFAQs.length} {filteredFAQs.length === 1 ? 'result' : 'results'}
              </p>
            )}
          </div>

          {/* Categories Overview */}
          {!searchQuery && (
            <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.map((category) => {
                const Icon = category.icon;
                const categoryCount = faqData.filter(faq => faq.category === category.name).length;
                return (
                  <div
                    key={category.name}
                    className="flex flex-col items-center p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    <div className={`${category.color} p-3 rounded-full mb-2`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <p className="text-sm font-medium text-center text-foreground">{category.name}</p>
                    <Badge variant="secondary" className="mt-2">
                      {categoryCount} questions
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}

          {/* FAQ Accordion */}
          {categories.map((category) => {
            const categoryFAQs = filteredFAQs.filter(faq => faq.category === category.name);
            
            if (categoryFAQs.length === 0) return null;

            return (
              <div key={category.name} className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`${category.color} p-2 rounded-lg`}>
                    {getCategoryIcon(category.name)}
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">{category.name}</h2>
                  <Badge variant="outline">{categoryFAQs.length}</Badge>
                </div>

                <Accordion type="single" collapsible className="space-y-2">
                  {categoryFAQs.map((faq, index) => (
                    <AccordionItem
                      key={`${category.name}-${index}`}
                      value={`${category.name}-${index}`}
                      className="border rounded-lg px-4 bg-card hover:shadow-sm transition-shadow"
                    >
                      <AccordionTrigger className="text-left hover:no-underline">
                        <span className="font-medium text-foreground pr-4">{faq.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground leading-relaxed pb-4">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            );
          })}

          {filteredFAQs.length === 0 && (
            <div className="text-center py-12">
              <p className="text-xl text-muted-foreground mb-4">
                No questions found matching "{searchQuery}"
              </p>
              <p className="text-muted-foreground">
                Try different keywords or browse all categories above
              </p>
            </div>
          )}

          {/* Contact Support */}
          <div className="mt-12 p-6 rounded-lg border bg-card text-center">
            <h3 className="text-xl font-bold text-foreground mb-2">
              Still have questions?
            </h3>
            <p className="text-muted-foreground mb-4">
              Can't find what you're looking for? Our support team is here to help.
            </p>
            <a
              href="/contact-us"
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default FAQ;
