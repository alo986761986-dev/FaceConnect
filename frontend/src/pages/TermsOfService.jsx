import { motion } from "framer-motion";
import { FileText, Mail, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function TermsOfService() {
  const navigate = useNavigate();
  const lastUpdated = "March 18, 2026";
  const contactEmail = "legal@faceconnect.app";

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
              <FileText className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">Terms of Service</h1>
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
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">1. Agreement to Terms</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Welcome to FaceConnect! These Terms of Service ("Terms") govern your access to and use of 
              the FaceConnect mobile application, website, and related services (collectively, the "Service"). 
              By accessing or using our Service, you agree to be bound by these Terms.
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed mt-4">
              If you do not agree to these Terms, you may not access or use the Service. We reserve the 
              right to modify these Terms at any time. Your continued use of the Service after any changes 
              constitutes acceptance of the new Terms.
            </p>
          </section>

          {/* Eligibility */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">2. Eligibility</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              You must be at least 13 years old to use FaceConnect. By using the Service, you represent 
              and warrant that:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 mt-4">
              <li>You are at least 13 years of age</li>
              <li>You have the legal capacity to enter into these Terms</li>
              <li>You are not prohibited from using the Service under applicable laws</li>
              <li>Your use complies with all applicable local, state, national, and international laws</li>
            </ul>
            <p className="text-[var(--text-secondary)] leading-relaxed mt-4">
              If you are under 18, you represent that your parent or legal guardian has reviewed and 
              agreed to these Terms on your behalf.
            </p>
          </section>

          {/* Account Registration */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">3. Account Registration</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              To access certain features of the Service, you must create an account. When creating an account:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 mt-4">
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>Keep your password secure and confidential</li>
              <li>Accept responsibility for all activities under your account</li>
              <li>Notify us immediately of any unauthorized access</li>
            </ul>
            <p className="text-[var(--text-secondary)] leading-relaxed mt-4">
              We reserve the right to suspend or terminate accounts that violate these Terms or for any 
              other reason at our sole discretion.
            </p>
          </section>

          {/* Biometric Features */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">4. Facial Recognition Features</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              FaceConnect uses facial recognition technology to enhance your experience. By using these features:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 mt-4">
              <li>You consent to the collection and processing of your facial data</li>
              <li>You understand this data is used for authentication and social features</li>
              <li>You may withdraw consent at any time through account settings</li>
              <li>You agree not to upload images of others without their consent</li>
            </ul>
            <div className="mt-4 p-4 bg-[var(--primary)]/10 rounded-xl border border-[var(--primary)]/20">
              <p className="text-[var(--primary)] font-medium">
                Facial recognition is optional. You can disable it in Settings while retaining full 
                access to other features.
              </p>
            </div>
          </section>

          {/* Acceptable Use */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">5. Acceptable Use Policy</h2>
            <p className="text-[var(--text-secondary)] mb-4">You agree NOT to use the Service to:</p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2">
              <li>Violate any laws, regulations, or third-party rights</li>
              <li>Post content that is illegal, harmful, threatening, abusive, or harassing</li>
              <li>Upload sexually explicit, violent, or hateful content</li>
              <li>Impersonate any person or entity</li>
              <li>Spam, phish, or distribute malware</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Attempt to gain unauthorized access to any accounts or systems</li>
              <li>Use automated means to access the Service without permission</li>
              <li>Collect user data without consent</li>
              <li>Engage in any activity that could harm minors</li>
              <li>Use facial recognition to identify individuals without their knowledge</li>
            </ul>
          </section>

          {/* User Content */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">6. User Content</h2>
            
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">Your Content</h3>
            <p className="text-[var(--text-secondary)]">
              You retain ownership of content you post ("User Content"). By posting content, you grant 
              FaceConnect a non-exclusive, worldwide, royalty-free license to use, copy, modify, display, 
              and distribute your content in connection with the Service.
            </p>

            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">Content Responsibilities</h3>
            <p className="text-[var(--text-secondary)]">
              You are solely responsible for your User Content and represent that:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 mt-2">
              <li>You own or have rights to post the content</li>
              <li>Your content does not violate any third-party rights</li>
              <li>Your content complies with these Terms and applicable laws</li>
            </ul>

            <h3 className="text-lg font-semibold text-[var(--text-primary)] mt-6 mb-3">Content Moderation</h3>
            <p className="text-[var(--text-secondary)]">
              We reserve the right to remove any content that violates these Terms or that we find 
              objectionable, without prior notice.
            </p>
          </section>

          {/* Intellectual Property */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">7. Intellectual Property</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              The Service and its original content, features, and functionality are owned by FaceConnect 
              and are protected by international copyright, trademark, patent, trade secret, and other 
              intellectual property laws.
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed mt-4">
              Our trademarks and trade dress may not be used without our prior written consent. You may 
              not copy, modify, distribute, sell, or lease any part of our Service without permission.
            </p>
          </section>

          {/* Privacy */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">8. Privacy</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Your privacy is important to us. Our{" "}
              <a href="/privacy" className="text-[var(--primary)] hover:underline">Privacy Policy</a>
              {" "}explains how we collect, use, and protect your personal information. By using the 
              Service, you agree to our Privacy Policy.
            </p>
          </section>

          {/* Third-Party Services */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">9. Third-Party Services</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              The Service may contain links to third-party websites or services that are not owned or 
              controlled by FaceConnect. We have no control over and assume no responsibility for the 
              content, privacy policies, or practices of any third-party sites or services.
            </p>
          </section>

          {/* Disclaimers */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">10. Disclaimers</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
              WHETHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, 
              SECURE, OR ERROR-FREE.
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed mt-4">
              We do not guarantee the accuracy of facial recognition features. These features are 
              provided for convenience and should not be relied upon for security-critical applications.
            </p>
          </section>

          {/* Limitation of Liability */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">11. Limitation of Liability</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, FACECONNECT SHALL NOT BE LIABLE FOR ANY INDIRECT, 
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO 
              LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed mt-4">
              Our total liability shall not exceed the amount you paid us, if any, in the twelve (12) 
              months preceding the claim.
            </p>
          </section>

          {/* Indemnification */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">12. Indemnification</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              You agree to indemnify, defend, and hold harmless FaceConnect and its officers, directors, 
              employees, and agents from any claims, damages, losses, liabilities, costs, and expenses 
              (including attorney's fees) arising from:
            </p>
            <ul className="list-disc list-inside text-[var(--text-secondary)] space-y-2 mt-4">
              <li>Your use of the Service</li>
              <li>Your violation of these Terms</li>
              <li>Your violation of any third-party rights</li>
              <li>Your User Content</li>
            </ul>
          </section>

          {/* Termination */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">13. Termination</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              We may terminate or suspend your account and access to the Service immediately, without 
              prior notice, for any reason, including breach of these Terms. You may delete your account 
              at any time through the app settings.
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed mt-4">
              Upon termination, your right to use the Service ceases immediately. Provisions that by 
              their nature should survive termination shall survive.
            </p>
          </section>

          {/* Governing Law */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">14. Governing Law</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of the 
              jurisdiction in which FaceConnect operates, without regard to conflict of law provisions.
            </p>
            <p className="text-[var(--text-secondary)] leading-relaxed mt-4">
              Any disputes arising from these Terms or the Service shall be resolved through binding 
              arbitration, except where prohibited by law.
            </p>
          </section>

          {/* Changes to Terms */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">15. Changes to Terms</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              We reserve the right to modify these Terms at any time. We will notify users of material 
              changes by posting the updated Terms and updating the "Last updated" date. Your continued 
              use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">16. Contact Us</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed mb-4">
              If you have any questions about these Terms of Service, please contact us:
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
