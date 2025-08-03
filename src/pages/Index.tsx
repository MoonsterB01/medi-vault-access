import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Clock, Users, FileText, QrCode, Bell } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">MediVault</h1>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#hospitals" className="text-muted-foreground hover:text-foreground transition-colors">For Hospitals</a>
            <a href="#patients" className="text-muted-foreground hover:text-foreground transition-colors">For Patients</a>
            <a href="#contact" className="text-muted-foreground hover:text-foreground transition-colors">Contact</a>
            <Button variant="outline" size="sm">Login</Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-5xl md:text-6xl font-bold text-foreground mb-6">
            Simplify Healthcare.<br />
            <span className="text-primary">One Record at a Time.</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Secure digital medical record management that connects hospitals, patients, and families through a unified platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" className="text-lg px-8 py-6">
              For Hospitals
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-6">
              For Patients
            </Button>
          </div>

          {/* Illustration */}
          <div className="relative max-w-4xl mx-auto">
            <Card className="p-8 bg-card/50 backdrop-blur-sm border-primary/20">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-3 gap-8 items-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Upload Records</h3>
                    <p className="text-sm text-muted-foreground">Hospitals securely upload patient medical records</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Secure Storage</h3>
                    <p className="text-sm text-muted-foreground">HIPAA-compliant encrypted storage and access</p>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">Family Access</h3>
                    <p className="text-sm text-muted-foreground">Patients control who can view their records</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center text-foreground mb-12">Key Features</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <Clock className="w-10 h-10 text-primary mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">Medical Timeline</h4>
                <p className="text-muted-foreground">View complete medical history in chronological order</p>
              </CardContent>
            </Card>
            
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <QrCode className="w-10 h-10 text-primary mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">QR Code Access</h4>
                <p className="text-muted-foreground">Instant record access during hospital visits</p>
              </CardContent>
            </Card>
            
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <Bell className="w-10 h-10 text-primary mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">Smart Notifications</h4>
                <p className="text-muted-foreground">Get notified when new reports are available</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">MediVault</span>
          </div>
          <p className="text-muted-foreground">© 2024 MediVault. Secure healthcare record management.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
