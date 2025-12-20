import { Shield, Mail, Phone, MapPin, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/logo.png";

export function EnhancedFooter() {
  return (
    <footer className="bg-card border-t border-border">
      {/* Main Footer Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src={logo} alt="Medilock" className="h-10 w-10" />
              <span className="text-xl font-bold">Medilock</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              A simple way for families to organize medical documents.
            </p>
            <p className="text-xs text-muted-foreground italic">
              Medilock does not provide medical advice.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/security" className="text-muted-foreground hover:text-foreground transition-colors">
                  Security
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-muted-foreground hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal & Trust</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <a href="mailto:support@medilock.in" className="text-muted-foreground hover:text-foreground transition-colors">
                    support@medilock.in
                  </a>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <a href="tel:+917737116518" className="text-muted-foreground hover:text-foreground transition-colors">
                  +91 7737116518
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <span className="text-muted-foreground">
                  Jaipur, Rajasthan, India
                </span>
              </li>
            </ul>
            
            {/* Live Support Badge */}
            <div className="mt-4 p-3 bg-trust/5 rounded-lg border border-trust/20">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-trust rounded-full animate-pulse" />
                <span className="text-xs font-medium text-trust">Live Support Available</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Mon-Sat, 9AM-6PM IST</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-xs text-muted-foreground text-center md:text-left">
              © {new Date().getFullYear()} Medilock. All rights reserved.
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              Made with <Heart className="h-3 w-3 text-destructive inline mx-1" /> in India
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-trust" />
                Your data is private
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
