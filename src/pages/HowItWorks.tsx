import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, FileText, Users, Hospital, CheckCircle, Clock, Server, Key, Database, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import PublicLayout from "@/components/PublicLayout";

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <PublicLayout>
      <header className="container mx-auto px-4 py-16 text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-primary/10 p-4 rounded-full">
            <img src={logo} alt="MediVault Logo" className="h-16 w-16 object-contain" />
          </div>
        </div>
        <h1 className="text-4xl font-bold mb-4">
          How MediVault Works & Trust Center
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Understanding our secure medical records platform, your data protection, and how we keep your health information safe
        </p>
      </header>

      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Data Processing Workflow
        </h2>
        
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
                <CardTitle className="text-lg">Secure Upload</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Document received and encrypted</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span>AI scans for medical content</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle className="h-4 w-4" />
                <span>Document verified and categorized</span>
              </div>
              <p className="text-sm text-muted-foreground/80">
                Your documents are immediately encrypted using bank-level security before any processing begins.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
                <CardTitle className="text-lg">Smart Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                <span>Text extraction and analysis</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserCheck className="h-4 w-4" />
                <span>Medical keyword detection</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Automatic categorization</span>
              </div>
              <p className="text-sm text-muted-foreground/80">
                Our AI helps organize your documents by type and urgency, making them easy to find later.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
                <CardTitle className="text-lg">Safe Storage</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Server className="h-4 w-4" />
                <span>Stored in encrypted database</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Access granted to authorized users</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4" />
                <span>Continuous security monitoring</span>
              </div>
              <p className="text-sm text-muted-foreground/80">
                Your documents are stored in secure, HIPAA-compliant cloud infrastructure with 24/7 monitoring.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-muted/40 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Your Safety & Privacy
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Lock className="h-8 w-8 text-green-600" />
                  <CardTitle className="text-lg text-green-800 dark:text-green-300">End-to-End Encryption</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-green-700 dark:text-green-400 mb-4">
                  All your documents are encrypted using AES-256 encryption - the same standard used by banks and government agencies.
                </p>
                <ul className="space-y-2 text-sm text-green-600 dark:text-green-500">
                  <li>• Encrypted during upload</li>
                  <li>• Encrypted while stored</li>
                  <li>• Encrypted during access</li>
                  <li>• Keys stored separately</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Key className="h-8 w-8 text-blue-600" />
                  <CardTitle className="text-lg text-blue-800 dark:text-blue-300">Strict Access Control</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-blue-700 dark:text-blue-400 mb-4">
                  Only authorized individuals can access your medical records. You control who sees what.
                </p>
                <ul className="space-y-2 text-sm text-blue-600 dark:text-blue-500">
                  <li>• Patient controls all access</li>
                  <li>• Family member permissions</li>
                  <li>• Hospital staff verification</li>
                  <li>• Audit trail of all access</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-purple-600" />
                  <CardTitle className="text-lg text-purple-800 dark:text-purple-300">HIPAA Compliant</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-purple-700 dark:text-purple-400 mb-4">
                  We meet and exceed all HIPAA requirements for handling protected health information.
                </p>
                <ul className="space-y-2 text-sm text-purple-600 dark:text-purple-500">
                  <li>• Regular security audits</li>
                  <li>• Staff background checks</li>
                  <li>• Incident response protocols</li>
                  <li>• Compliance monitoring</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Database className="h-8 w-8 text-orange-600" />
                  <CardTitle className="text-lg text-orange-800 dark:text-orange-300">Safe Data Processing</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-orange-700 dark:text-orange-400 mb-4">
                  Our AI analyzes documents to help organize them, but never shares your data with third parties.
                </p>
                <ul className="space-y-2 text-sm text-orange-600 dark:text-orange-500">
                  <li>• Processing done in-house</li>
                  <li>• No third-party sharing</li>
                  <li>• Anonymized analytics only</li>
                  <li>• Right to data deletion</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-950">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <UserCheck className="h-8 w-8 text-teal-600" />
                  <CardTitle className="text-lg text-teal-800 dark:text-teal-300">You Stay in Control</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-teal-700 dark:text-teal-400 mb-4">
                  Your medical data belongs to you. You decide who can see it and for how long.
                </p>
                <ul className="space-y-2 text-sm text-teal-600 dark:text-teal-500">
                  <li>• Granular permission settings</li>
                  <li>• Revoke access anytime</li>
                  <li>• Export your data</li>
                  <li>• Delete your account</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Eye className="h-8 w-8 text-red-600" />
                  <CardTitle className="text-lg text-red-800 dark:text-red-300">24/7 Monitoring</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-red-700 dark:text-red-400 mb-4">
                  Our systems are monitored around the clock to detect and prevent any security threats.
                </p>
                <ul className="space-y-2 text-sm text-red-600 dark:text-red-500">
                  <li>• Continuous threat detection</li>
                  <li>• Automated response systems</li>
                  <li>• Security team on standby</li>
                  <li>• Regular penetration testing</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">
          Platform Features Guide
        </h2>
        
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Hospital className="h-8 w-8 text-blue-600" />
                <CardTitle className="text-xl">Hospital Features</CardTitle>
              </div>
              <CardDescription>
                Streamlined workflow for medical professionals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 border rounded-lg bg-card">
                  <h4 className="font-semibold text-sm mb-1">Quick Upload Dashboard</h4>
                  <p className="text-sm text-muted-foreground">Upload patient reports directly using patient IDs. Automatic categorization and notifications.</p>
                </div>
                <div className="p-3 border rounded-lg bg-card">
                  <h4 className="font-semibold text-sm mb-1">Patient Search</h4>
                  <p className="text-sm text-muted-foreground">Find patients quickly using various identifiers. View upload history and patient preferences.</p>
                </div>
                <div className="p-3 border rounded-lg bg-card">
                  <h4 className="font-semibold text-sm mb-1">Audit Trail</h4>
                  <p className="text-sm text-muted-foreground">Complete record of all uploads and access attempts. HIPAA-compliant logging for compliance.</p>
                </div>
                <div className="p-3 border rounded-lg bg-card">
                  <h4 className="font-semibold text-sm mb-1">Bulk Operations</h4>
                  <p className="text-sm text-muted-foreground">Upload multiple documents at once. Batch notifications and processing for efficiency.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-green-600" />
                <CardTitle className="text-xl">Patient Features</CardTitle>
              </div>
              <CardDescription>
                Complete control over your medical records
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="p-3 border rounded-lg bg-card">
                  <h4 className="font-semibold text-sm mb-1">Timeline View</h4>
                  <p className="text-sm text-muted-foreground">See all your medical records in chronological order. Filter by type, date, or urgency level.</p>
                </div>
                <div className="p-3 border rounded-lg bg-card">
                  <h4 className="font-semibold text-sm mb-1">Smart Search</h4>
                  <p className="text-sm text-muted-foreground">Find specific documents using AI-powered search. Search by content, keywords, or medical terms.</p>
                </div>
                <div className="p-3 border rounded-lg bg-card">
                  <h4 className="font-semibold text-sm mb-1">Family Sharing</h4>
                  <p className="text-sm text-muted-foreground">Grant access to family members or caregivers. Control what they can see and for how long.</p>
                </div>
                <div className="p-3 border rounded-lg bg-card">
                  <h4 className="font-semibold text-sm mb-1">Mobile Access</h4>
                  <p className="text-sm text-muted-foreground">Access your records from any device. Capture and upload documents using your phone camera.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="bg-primary text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8">
            Trusted by Healthcare Professionals
          </h2>
          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div>
              <div className="text-3xl font-bold text-blue-400 mb-2">256-bit</div>
              <p className="text-primary-foreground/80">Encryption Standard</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400 mb-2">99.9%</div>
              <p className="text-primary-foreground/80">Uptime Guarantee</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400 mb-2">24/7</div>
              <p className="text-primary-foreground/80">Security Monitoring</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400 mb-2">100%</div>
              <p className="text-primary-foreground/80">HIPAA Compliant</p>
            </div>
          </div>
          
          <div className="mt-12">
            <Button size="lg" className="px-8 py-3" onClick={() => navigate('/auth')}>
              Start Using MediVault Securely
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}