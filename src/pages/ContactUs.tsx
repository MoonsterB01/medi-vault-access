import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, User } from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { useState } from "react";

/**
 * @function ContactUs
 * @description A page component that displays contact information and a contact form.
 * @returns {JSX.Element} - The rendered ContactUs page component.
 */
export default function ContactUs() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submissionStatus, setSubmissionStatus] = useState("idle");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmissionStatus("submitting");

    const googleFormUrl = "https://docs.google.com/forms/d/e/1FAIpQLSept30SzUV9AqjfqMtCgg4zNSUK6ii7_B6CgdzKnZnouhhAKw/formResponse";
    const formData = new FormData();
    formData.append("entry.1401883316", name);
    formData.append("entry.172751659", email);
    formData.append("entry.1171436624", message);

    try {
      await fetch(googleFormUrl, {
        method: "POST",
        body: formData,
        mode: "no-cors",
      });
      setSubmissionStatus("success");
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      setSubmissionStatus("error");
    }
  };

  return (
    <PublicLayout>
      <header className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold mb-4">
          Contact Us
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          We're here to help. Reach out to us with any questions or concerns.
        </p>
      </header>

      <section className="container mx-auto px-4 pb-16">
        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Send us a Message</CardTitle>
            </CardHeader>
            <CardContent>
              {submissionStatus === "success" ? (
                <div className="text-center">
                  <h3 className="text-2xl font-bold mb-4">Thank you for your feedback!</h3>
                  <p>We'll get back to you as soon as possible.</p>
                </div>
              ) : (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <label htmlFor="name">Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input id="name" placeholder="Your Name" className="pl-10" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input id="email" type="email" placeholder="Your Email" className="pl-10" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="message">Message</label>
                    <Textarea id="message" placeholder="Your Message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />
                  </div>
                  <Button type="submit" className="w-full" disabled={submissionStatus === "submitting"}>
                    {submissionStatus === "submitting" ? "Sending..." : "Send Message"}
                  </Button>
                  {submissionStatus === "error" && (
                    <p className="text-red-500 text-center">Sorry, something went wrong. Please try again.</p>
                  )}
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-start gap-4">
                <Mail className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold">Email</h3>
                  <a href="mailto:mrigankagarwal810@gmail.com" className="text-muted-foreground hover:text-primary transition-colors">
                    mrigankagarwal810@gmail.com
                  </a>
                  <br />
                  <a href="mailto:akshgaur23@gmail.com" className="text-muted-foreground hover:text-primary transition-colors">
                    akshgaur23@gmail.com
                  </a>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <Phone className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold">Phone</h3>
                  <a href="tel:+917737116518" className="text-muted-foreground hover:text-primary transition-colors">
                    +91 7737116518
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </PublicLayout>
  );
}