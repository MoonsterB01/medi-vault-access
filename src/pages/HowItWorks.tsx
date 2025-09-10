import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, FileText, Users, Hospital, CheckCircle, Clock, Server, Key, Database, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function HowItWorks() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Shield className="h-8 w-8 text-blue-600" />
          <span className="text-xl font-bold">MediVault</span>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => navigate('/')}>
            Back to Home
          </Button>
          <Button onClick={() => navigate('/auth')}>
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="container mx-auto px-4 py-16 text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          How MediVault Works & Trust Center
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Understanding our secure medical records platform, your data protection, and how we keep your health information safe
        </p>
      </header>

      {/* How It Works - Data Processing Flow */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Data Processing Workflow
        </h2>
        
        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Step 1: Document Upload */}
          <Card className="relative">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
                <CardTitle className="text-lg">Secure Upload</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="h-4 w-4" />
                <span>Document received and encrypted</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Eye className="h-4 w-4" />
                <span>AI scans for medical content</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="h-4 w-4" />
                <span>Document verified and categorized</span>
              </div>
              <p className="text-sm text-gray-500">
                Your documents are immediately encrypted using bank-level security before any processing begins.
              </p>
            </CardContent>
          </Card>

          {/* Step 2: AI Analysis */}
          <Card className="relative">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
                <CardTitle className="text-lg">Smart Analysis</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Database className="h-4 w-4" />
                <span>Text extraction and analysis</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <UserCheck className="h-4 w-4" />
                <span>Medical keyword detection</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>Automatic categorization</span>
              </div>
              <p className="text-sm text-gray-500">
                Our AI helps organize your documents by type and urgency, making them easy to find later.
              </p>
            </CardContent>
          </Card>

          {/* Step 3: Secure Storage */}
          <Card className="relative">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
                <CardTitle className="text-lg">Safe Storage</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Server className="h-4 w-4" />
                <span>Stored in encrypted database</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="h-4 w-4" />
                <span>Access granted to authorized users</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield className="h-4 w-4" />
                <span>Continuous security monitoring</span>
              </div>
              <p className="text-sm text-gray-500">
                Your documents are stored in secure, HIPAA-compliant cloud infrastructure with 24/7 monitoring.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Privacy & Security Section */}
      <section className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Your Safety & Privacy
          </h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Encryption */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Lock className="h-8 w-8 text-green-600" />
                  <CardTitle className="text-lg text-green-800">End-to-End Encryption</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-green-700 mb-4">
                  All your documents are encrypted using AES-256 encryption - the same standard used by banks and government agencies.
                </p>
                <ul className="space-y-2 text-sm text-green-600">
                  <li>• Encrypted during upload</li>
                  <li>• Encrypted while stored</li>
                  <li>• Encrypted during access</li>
                  <li>• Keys stored separately</li>
                </ul>
              </CardContent>
            </Card>

            {/* Access Control */}
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Key className="h-8 w-8 text-blue-600" />
                  <CardTitle className="text-lg text-blue-800">Strict Access Control</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-blue-700 mb-4">
                  Only authorized individuals can access your medical records. You control who sees what.
                </p>
                <ul className="space-y-2 text-sm text-blue-600">
                  <li>• Patient controls all access</li>
                  <li>• Family member permissions</li>
                  <li>• Hospital staff verification</li>
                  <li>• Audit trail of all access</li>
                </ul>
              </CardContent>
            </Card>

            {/* HIPAA Compliance */}
            <Card className="border-purple-200 bg-purple-50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Shield className="h-8 w-8 text-purple-600" />
                  <CardTitle className="text-lg text-purple-800">HIPAA Compliant</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-purple-700 mb-4">
                  We meet and exceed all HIPAA requirements for handling protected health information.
                </p>
                <ul className="space-y-2 text-sm text-purple-600">
                  <li>• Regular security audits</li>
                  <li>• Staff background checks</li>
                  <li>• Incident response protocols</li>
                  <li>• Compliance monitoring</li>
                </ul>
              </CardContent>
            </Card>

            {/* Data Processing */}
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Database className="h-8 w-8 text-orange-600" />
                  <CardTitle className="text-lg text-orange-800">Safe Data Processing</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-orange-700 mb-4">
                  Our AI analyzes documents to help organize them, but never shares your data with third parties.
                </p>
                <ul className="space-y-2 text-sm text-orange-600">
                  <li>• Processing done in-house</li>
                  <li>• No third-party sharing</li>
                  <li>• Anonymized analytics only</li>
                  <li>• Right to data deletion</li>
                </ul>
              </CardContent>
            </Card>

            {/* User Control */}
            <Card className="border-teal-200 bg-teal-50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <UserCheck className="h-8 w-8 text-teal-600" />
                  <CardTitle className="text-lg text-teal-800">You Stay in Control</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-teal-700 mb-4">
                  Your medical data belongs to you. You decide who can see it and for how long.
                </p>
                <ul className="space-y-2 text-sm text-teal-600">
                  <li>• Granular permission settings</li>
                  <li>• Revoke access anytime</li>
                  <li>• Export your data</li>
                  <li>• Delete your account</li>
                </ul>
              </CardContent>
            </Card>

            {/* 24/7 Monitoring */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Eye className="h-8 w-8 text-red-600" />
                  <CardTitle className="text-lg text-red-800">24/7 Monitoring</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-red-700 mb-4">
                  Our systems are monitored around the clock to detect and prevent any security threats.
                </p>
                <ul className="space-y-2 text-sm text-red-600">
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

      {/* Feature Guide Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Platform Features Guide
        </h2>
        
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* For Hospitals */}
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
                <div className="p-3 border rounded-lg">
                  <h4 className="font-semibold text-sm mb-1">Quick Upload Dashboard</h4>
                  <p className="text-sm text-gray-600">Upload patient reports directly using patient IDs. Automatic categorization and notifications.</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-semibold text-sm mb-1">Patient Search</h4>
                  <p className="text-sm text-gray-600">Find patients quickly using various identifiers. View upload history and patient preferences.</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-semibold text-sm mb-1">Audit Trail</h4>
                  <p className="text-sm text-gray-600">Complete record of all uploads and access attempts. HIPAA-compliant logging for compliance.</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-semibold text-sm mb-1">Bulk Operations</h4>
                  <p className="text-sm text-gray-600">Upload multiple documents at once. Batch notifications and processing for efficiency.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* For Patients */}
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
                <div className="p-3 border rounded-lg">
                  <h4 className="font-semibold text-sm mb-1">Timeline View</h4>
                  <p className="text-sm text-gray-600">See all your medical records in chronological order. Filter by type, date, or urgency level.</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-semibold text-sm mb-1">Smart Search</h4>
                  <p className="text-sm text-gray-600">Find specific documents using AI-powered search. Search by content, keywords, or medical terms.</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-semibold text-sm mb-1">Family Sharing</h4>
                  <p className="text-sm text-gray-600">Grant access to family members or caregivers. Control what they can see and for how long.</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-semibold text-sm mb-1">Mobile Access</h4>
                  <p className="text-sm text-gray-600">Access your records from any device. Capture and upload documents using your phone camera.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="bg-gray-900 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-8">
            Trusted by Healthcare Professionals
          </h2>
          <div className="grid md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div>
              <div className="text-3xl font-bold text-blue-400 mb-2">256-bit</div>
              <p className="text-gray-300">Encryption Standard</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400 mb-2">99.9%</div>
              <p className="text-gray-300">Uptime Guarantee</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400 mb-2">24/7</div>
              <p className="text-gray-300">Security Monitoring</p>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400 mb-2">100%</div>
              <p className="text-gray-300">HIPAA Compliant</p>
            </div>
          </div>
          
          <div className="mt-12">
            <Button size="lg" className="px-8 py-3" onClick={() => navigate('/auth')}>
              Start Using MediVault Securely
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}