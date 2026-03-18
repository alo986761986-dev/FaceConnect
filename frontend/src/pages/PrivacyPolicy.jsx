import { motion } from "framer-motion";
import { Shield, Mail, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const lastUpdated = "March 18, 2026";
  const contactEmail = "privacy@faceconnect.app";

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
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">Privacy Policy</h1>
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
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Introduction</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Welcome to FaceConnect ("we," "our," or "us"). We are committed to protecting your privacy 
              and ensuring the security of your personal information. This Privacy Policy explains how we 
              collect, use, disclose, and safeguard your information when you use our mobile application 
              and related services (collectively, the "Service").
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed mt-4">
              By using FaceConnect, you agree to the collection and use of information in accordance with 
              this policy. If you do not agree with our policies and practices, please do not use our Service.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Information We Collect</h2>
            
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">Personal Information</h3>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2">
              <li>Account information (name, email address, username, password)</li>
              <li>Profile information (display name, profile photo, bio)</li>
              <li>Contact information you choose to provide</li>
            </ul>

            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">Camera Permission (android.permission.CAMERA)</h3>
            <p className="text-[var(--text-secondary)] mb-2">
              Our app requires camera access for the following features:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2">
              <li>Taking and uploading profile photos</li>
              <li>Capturing photos and videos to share with friends</li>
              <li>Facial recognition for secure authentication</li>
              <li>Video calling with other users</li>
              <li>Creating stories and reels</li>
              <li>Scanning QR codes for adding friends</li>
            </ul>
            <p className="text-[var(--text-muted)] text-sm mt-2 italic">
              Camera access is only used when you actively use these features. We do not access your camera in the background.
            </p>

            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">Biometric Data</h3>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2">
              <li>Facial recognition data used for authentication and social features</li>
              <li>Face embeddings (mathematical representations of facial features)</li>
              <li>Photos and videos you upload or capture within the app</li>
            </ul>
            <p className="text-[var(--text-muted)] text-sm mt-2 italic">
              Note: Facial recognition data is processed with your explicit consent and can be deleted at any time.
            </p>

            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">Usage Data</h3>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2">
              <li>Device information (device type, operating system, unique device identifiers)</li>
              <li>Log data (IP address, browser type, pages visited, time spent)</li>
              <li>Location data (with your permission, for location-based features)</li>
              <li>App usage statistics and interaction data</li>
            </ul>

            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">User-Generated Content</h3>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2">
              <li>Posts, stories, reels, and other content you create</li>
              <li>Messages and communications with other users</li>
              <li>Comments, likes, and other interactions</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">How We Use Your Information</h2>
            <p className="text-[var(--text-secondary)] mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2">
              <li>Provide, maintain, and improve our Service</li>
              <li>Enable facial recognition features for authentication and social connectivity</li>
              <li>Process and complete transactions</li>
              <li>Send you technical notices, updates, and support messages</li>
              <li>Respond to your comments, questions, and customer service requests</li>
              <li>Personalize your experience and deliver relevant content</li>
              <li>Monitor and analyze trends, usage, and activities</li>
              <li>Detect, investigate, and prevent fraudulent or unauthorized activities</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Information Sharing and Disclosure</h2>
            <p className="text-[var(--text-secondary)] mb-4">We may share your information in the following situations:</p>
            
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">With Your Consent</h3>
            <p className="text-[var(--text-secondary)]">
              We may share your information when you give us explicit permission to do so.
            </p>

            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">With Other Users</h3>
            <p className="text-[var(--text-secondary)]">
              Information you make public (profile, posts, stories) is visible to other users based on your privacy settings.
            </p>

            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">Service Providers</h3>
            <p className="text-[var(--text-secondary)]">
              We may share information with third-party vendors who perform services on our behalf 
              (hosting, analytics, customer support).
            </p>

            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">Legal Requirements</h3>
            <p className="text-[var(--text-secondary)]">
              We may disclose information if required by law or in response to valid legal requests.
            </p>

            <div className="mt-6 p-4 bg-green-500/10 rounded-xl border border-green-500/20">
              <p className="text-green-400 font-medium">We do NOT sell your personal information or biometric data to third parties.</p>
            </div>
          </section>

          {/* Data Security */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Data Security</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your 
              personal information, including:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 mt-4">
              <li>Encryption of data in transit (TLS/SSL) and at rest</li>
              <li>Secure password hashing using industry-standard algorithms</li>
              <li>Regular security assessments and vulnerability testing</li>
              <li>Access controls and authentication mechanisms</li>
              <li>Encrypted backups with user-controlled encryption keys</li>
            </ul>
            <p className="text-[var(--text-muted)] text-sm mt-4">
              While we strive to protect your information, no method of transmission over the Internet 
              is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          {/* Data Retention */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Data Retention</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              We retain your information for as long as your account is active or as needed to provide 
              you services. You can request deletion of your account and associated data at any time.
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 mt-4">
              <li>Account data: Retained until you delete your account</li>
              <li>Facial recognition data: Deleted upon request or account deletion</li>
              <li>Posts and content: Retained until you delete them or your account</li>
              <li>Messages: Retained according to conversation participants' preferences</li>
              <li>Log data: Typically retained for 90 days</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Your Rights and Choices</h2>
            <p className="text-[var(--text-secondary)] mb-4">You have the following rights regarding your data:</p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
              <li><strong>Withdraw Consent:</strong> Opt out of facial recognition features</li>
              <li><strong>Restrict Processing:</strong> Limit how we use your data</li>
              <li><strong>Object:</strong> Object to certain data processing activities</li>
            </ul>
            <p className="text-[var(--text-secondary)] mt-4">
              To exercise these rights, contact us at <a href={`mailto:${contactEmail}`} className="text-[var(--primary)] hover:underline">{contactEmail}</a> or 
              use the privacy settings in the app.
            </p>
          </section>

          {/* Children's Privacy */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Children's Privacy</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              FaceConnect is not intended for children under the age of 13. We do not knowingly collect 
              personal information from children under 13. If you are a parent or guardian and believe 
              your child has provided us with personal information, please contact us immediately. If we 
              discover that a child under 13 has provided us with personal information, we will delete 
              such information from our servers.
            </p>
          </section>

          {/* International Transfers */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">International Data Transfers</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Your information may be transferred to and processed in countries other than your country 
              of residence. These countries may have different data protection laws. By using our Service, 
              you consent to the transfer of your information to these countries. We ensure appropriate 
              safeguards are in place to protect your information in accordance with this Privacy Policy.
            </p>
          </section>

          {/* Changes to Policy */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Changes to This Privacy Policy</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by 
              posting the new Privacy Policy on this page and updating the "Last updated" date. You are 
              advised to review this Privacy Policy periodically for any changes. Changes are effective 
              immediately upon posting.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Contact Us</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
              If you have any questions about this Privacy Policy or our data practices, please contact us:
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
