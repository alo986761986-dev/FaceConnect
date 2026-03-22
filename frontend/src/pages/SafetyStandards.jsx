import { motion } from "framer-motion";
import { Shield, AlertTriangle, Users, Lock, Flag, Mail, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function SafetyStandards() {
  const navigate = useNavigate();
  const lastUpdated = "March 18, 2026";
  const contactEmail = "safety@faceconnect.com";

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">Safety Standards</h1>
              <p className="text-xs text-[var(--text-muted)]">Last updated: {lastUpdated}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto px-4 py-8"
      >
        <div className="prose prose-invert max-w-none space-y-8">
          {/* Introduction */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Our Commitment to Safety</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              At FaceConnect, safety is our top priority. We are committed to creating a secure and 
              positive environment for all users. This page outlines our safety standards, policies, 
              and the measures we take to protect our community.
            </p>
          </section>

          {/* Community Guidelines */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-blue-500" />
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Community Guidelines</h2>
            </div>
            <p className="text-[var(--text-secondary)] mb-4">We expect all users to:</p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2">
              <li>Treat others with respect and kindness</li>
              <li>Not engage in harassment, bullying, or hate speech</li>
              <li>Not share violent, graphic, or disturbing content</li>
              <li>Not impersonate others or create fake accounts</li>
              <li>Not spam or engage in fraudulent activities</li>
              <li>Respect intellectual property rights</li>
              <li>Not share illegal content or promote illegal activities</li>
              <li>Protect minors and not share inappropriate content involving children</li>
            </ul>
          </section>

          {/* Content Moderation */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <Flag className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Content Moderation</h2>
            </div>
            <p className="text-[var(--text-secondary)] mb-4">
              We employ multiple layers of content moderation to keep our platform safe:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2">
              <li><strong>Automated Detection:</strong> AI-powered systems scan content for policy violations</li>
              <li><strong>User Reporting:</strong> Easy-to-use reporting tools for community members</li>
              <li><strong>Human Review:</strong> Trained moderators review flagged content</li>
              <li><strong>Swift Action:</strong> Violating content is removed promptly</li>
              <li><strong>Account Enforcement:</strong> Repeat violators face account suspension or termination</li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <Lock className="w-6 h-6 text-green-500" />
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Data Security</h2>
            </div>
            <p className="text-[var(--text-secondary)] mb-4">
              We implement robust security measures to protect your data:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2">
              <li>End-to-end encryption for private messages</li>
              <li>Secure data transmission using TLS/SSL</li>
              <li>Encrypted storage for sensitive information</li>
              <li>Regular security audits and penetration testing</li>
              <li>Two-factor authentication (2FA) support</li>
              <li>Secure password hashing using industry-standard algorithms</li>
              <li>Automatic session timeout for inactive accounts</li>
            </ul>
          </section>

          {/* Biometric Data Safety */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-purple-500" />
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Biometric Data Safety</h2>
            </div>
            <p className="text-[var(--text-secondary)] mb-4">
              Special protections for facial recognition and biometric data:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2">
              <li>Explicit user consent required before any facial data collection</li>
              <li>Biometric data is encrypted at rest and in transit</li>
              <li>Users can delete their biometric data at any time</li>
              <li>Biometric data is never sold or shared with third parties</li>
              <li>Local processing options available when possible</li>
              <li>Regular deletion of unused biometric templates</li>
            </ul>
          </section>

          {/* Reporting & Support */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500" />
              <h2 className="text-xl font-bold text-[var(--text-primary)]">Reporting Concerns</h2>
            </div>
            <p className="text-[var(--text-secondary)] mb-4">
              If you encounter any safety concerns, you can report them through:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2">
              <li><strong>In-App Reporting:</strong> Tap the report button on any content or profile</li>
              <li><strong>Settings Menu:</strong> Access safety tools in your account settings</li>
              <li><strong>Email:</strong> Contact our safety team directly</li>
              <li><strong>Emergency:</strong> For immediate danger, contact local authorities first</li>
            </ul>
            <p className="text-[var(--text-secondary)] mt-4">
              We review all reports within 24 hours and take appropriate action.
            </p>
          </section>

          {/* Minor Safety */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Protecting Minors</h2>
            <p className="text-[var(--text-secondary)] mb-4">
              We have strict policies to protect young users:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2">
              <li>Users must be at least 13 years old to create an account</li>
              <li>Enhanced privacy defaults for users under 18</li>
              <li>Restricted direct messaging from unknown adults to minors</li>
              <li>Zero tolerance for child exploitation content</li>
              <li>Cooperation with law enforcement on child safety matters</li>
              <li>Parental controls and family safety features</li>
            </ul>
          </section>

          {/* Transparency */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Transparency</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              We believe in transparency about our safety practices. We publish regular transparency 
              reports detailing our content moderation efforts, including the number of reports received, 
              content removed, and accounts actioned. We also work with independent researchers and 
              safety organizations to continuously improve our practices.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Contact Our Safety Team</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
              If you have questions about our safety standards or need to report a concern:
            </p>
            <div className="flex items-center gap-3 p-4 bg-[var(--muted)] rounded-xl">
              <Mail className="w-5 h-5 text-[var(--primary)]" />
              <a href={`mailto:${contactEmail}`} className="text-[var(--primary)] hover:underline font-medium">
                {contactEmail}
              </a>
            </div>
          </section>

          {/* Footer */}
          <div className="text-center pt-8 pb-4">
            <p className="text-[var(--text-muted)] text-sm">
              © {new Date().getFullYear()} FaceConnect. All rights reserved.
            </p>
          </div>
        </div>
      </motion.main>
    </div>
  );
}
