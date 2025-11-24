---
layout: default
title: Privacy Policy - grakchawwaa-bot
---

# Privacy Policy

**Last Updated:** {{ site.time | date: "%B %d, %Y" }}

This Privacy Policy describes how **grakchawwaa-bot** (the "Bot") collects, uses, and protects your personal information when you use our Discord bot service.

**Data Controller:** The data controller for this service is the Bot developer (ExeAy), contactable at support.graakchawwaa@icloud.com.

## 1. Information We Collect

### 1.1 Information You Provide

When you use the Bot, you may provide the following information:

- **Discord User ID:** Your unique Discord user identifier, which we use to associate your Discord account with your game account
- **Ally Codes:** Your primary and alternate Star Wars: Galaxy of Heroes ally codes that you register with the Bot
- **Guild Configuration:** When you register a guild for monitoring, we store:
  - Guild ID
  - Channel IDs for ticket collection, reminders, and anniversary notifications
  - Configuration settings for your guild

### 1.2 Information We Collect Automatically

The Bot automatically collects the following information:

- **Ticket Violation Data:** Historical records of ticket violations, including:
  - Player IDs
  - Ticket counts
  - Timestamps of violations
  - This data is used to generate weekly and monthly summaries

- **Server Logs:** Our hosting infrastructure automatically generates server logs that may include:
  - Request timestamps
  - Command usage metadata
  - Error logs for troubleshooting
  - These logs do not contain message content and are not used for user profiling

### 1.3 Information from Third-Party Services

The Bot integrates with **SWGOH Comlink** to retrieve game data necessary for providing the Bot's services. This includes:

- Guild member information
- Player statistics
- Game data required for ticket monitoring and anniversary tracking

## 2. How We Use Your Information

We use the information we collect to:

- Provide and maintain the Bot's services (ticket monitoring, anniversary notifications, etc.)
- Generate violation summaries and reports
- Associate your Discord account with your game account
- Store your preferences and configuration settings
- Improve and optimize the Bot's functionality

### 2.1 Legal Basis for Processing (GDPR)

The legal basis for processing your personal data varies by purpose:

- **Consent (Art. 6(1)(a) GDPR):** You provide explicit consent when you actively use Bot commands that collect your data:
  - Running `/register-player` command provides consent for processing your Discord User ID and ally codes
  - Running `/register-ticket-collection` or `/register-anniversary-channel` provides consent for processing guild and channel data
  - Consent is recorded with a timestamp when you execute these commands (stored as `registered_at` in our database)
  - You may withdraw your consent at any time by using the corresponding unregister commands or contacting us
- **Legitimate Interest (Art. 6(1)(f) GDPR):** We process data based on legitimate interests for:
  - Providing and improving the Bot's functionality
  - Preventing abuse and ensuring service security
  - Maintaining service quality and generating reports
  - Troubleshooting and technical support

### 2.2 Automated Decision-Making

The Bot does not use automated decision-making or profiling that produces legal effects or significantly affects you. The violation summaries and reports are informational tools for guild management and do not constitute automated decisions under Art. 22 GDPR.

## 3. Data Storage and Security

### 3.1 Storage

Your data is stored securely in a PostgreSQL database hosted on Heroku. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction, including:

- **Database encryption:** Data is encrypted at rest and in transit using industry-standard encryption protocols
- **Access control:** Database access is restricted to authorized personnel only and requires authentication
- **Security monitoring:** We monitor for unauthorized access attempts and security incidents
- **Rate limiting:** We implement rate limiting to prevent abuse and protect service availability
- **Regular security reviews:** We conduct regular reviews of our security practices and infrastructure

### 3.2 Data Retention

We retain personal data only for as long as necessary to fulfill the purposes outlined in this policy, unless a longer retention period is required by law. Specific retention periods:

- **Player Registration Data:** Retained until you unregister your account or request deletion, or until the service is discontinued
- **Guild Configuration Data:** Retained until you unregister the guild or request deletion, or until the service is discontinued
- **Ticket Violation Data:** Automatically deleted after 3 months to maintain data freshness and reduce storage requirements
- **Support Communications:** Retained for up to 12 months for troubleshooting, security, and service improvement purposes
- **Server Logs:** Retained in a rolling buffer by our hosting provider for operational purposes only. These logs are not permanently stored and are automatically overwritten as new logs are generated

**Criteria for determining retention periods:**
- The purpose for which data was collected
- Legal, regulatory, or contractual requirements
- The need to maintain service functionality
- User requests for deletion

Data deletion requests are processed within 30 days of receipt. Upon service discontinuation, all user data will be deleted within 90 days unless legal obligations require longer retention.

## 4. Data Sharing and Disclosure

**We do not sell, rent, or trade your personal information.** We do not share your personal information for commercial purposes.

We may share your information only in the following circumstances:

- **Service Providers:** We share data with SWGOH Comlink as necessary to retrieve game data required for the Bot's functionality
- **Legal Requirements:** We may disclose your information if required by law or in response to valid legal requests
- **Protection of Rights:** We may disclose information to protect our rights, privacy, safety, or property, or that of our users

### 4.1 Subprocessors

We use the following third-party service providers (subprocessors) to operate the Bot:

- **Heroku (Salesforce Inc.)** – Cloud hosting and database provider (EU & US regions)
  - Purpose: Hosting the Bot application and storing user data
  - Data processed: All personal data collected by the Bot
  - Location: EU and United States
  - Safeguards: Standard Contractual Clauses (SCCs) and Heroku's data processing agreement

- **SWGOH Comlink** – Game data API service
  - Purpose: Retrieving game data necessary for Bot functionality
  - Data processed: Ally codes and guild identifiers (to fetch game data)
  - Location: Third-party service (location may vary)
  - Safeguards: Data is only shared as necessary for service functionality

We ensure all subprocessors maintain appropriate security measures and comply with applicable data protection laws.

### 4.1 California Privacy Rights (CCPA/CPRA)

If you are a California resident, you have additional rights under the California Consumer Privacy Act (CCPA) and California Privacy Rights Act (CPRA):

- **Right to Know:** You have the right to know what personal information we collect, use, disclose, and sell (we do not sell personal information)
- **Right to Delete:** You have the right to request deletion of your personal information
- **Right to Opt-Out:** Since we do not sell personal information, there is no opt-out process needed
- **Right to Non-Discrimination:** We will not discriminate against you for exercising your privacy rights
- **Right to Correct:** You have the right to correct inaccurate personal information

**Categories of Personal Information We Collect (CCPA Categories):**
- Identifiers (Discord User IDs)
- Internet or other electronic network activity information (command usage, server logs)
- Other information you provide (ally codes, guild configuration)

To exercise your California privacy rights, contact us using the information in Section 9.

## 5. Your Rights Under GDPR

As a data subject, you have the following rights under the General Data Protection Regulation (GDPR):

### 5.1 Right of Access

You have the right to obtain confirmation as to whether your personal data is being processed and to access that data. You can:
- Use the `/identify` command to view your registered information
- Request a complete copy of all your personal data by contacting us

### 5.2 Right to Rectification

You have the right to have inaccurate personal data corrected. You can:
- Update your ally codes using the `/register-player` command
- Contact us to correct any other inaccurate information

### 5.3 Right to Erasure ("Right to be Forgotten")

You have the right to request deletion of your personal data. You can:
- Use the `/unregister-player` command to remove your player registration
- Use the `/unregister-ticket-collection` command to remove guild monitoring
- Contact us directly to request deletion of all your data

We will delete your data within 30 days, except where we have a legal obligation to retain it.

### 5.4 Right to Restriction of Processing

You have the right to request restriction of processing of your personal data in certain circumstances (e.g., while accuracy is being verified, if processing is unlawful, or if you need the data for legal claims).

**Practical Implementation:** Given the nature of our service, restriction of processing effectively requires unregistering your account or guild configuration, as the Bot's functionality depends on processing your data. If you request restriction, we will stop processing your data, which means you will no longer be able to use the Bot's services. If you need to maintain your data for legal claim purposes while restricting processing, please contact us to discuss alternative arrangements.

### 5.5 Right to Data Portability

You have the right to receive your personal data in a structured, commonly used, and machine-readable format. You may request a copy of your data by contacting us using the information provided in Section 9.

### 5.6 Right to Object

You have the right to object to processing of your personal data based on legitimate interests. If you object, we will stop processing unless we can demonstrate compelling legitimate grounds that override your interests.

### 5.7 Right to Withdraw Consent

If processing is based on consent, you have the right to withdraw your consent at any time. Withdrawal does not affect the lawfulness of processing before withdrawal.

### 5.8 Right to Lodge a Complaint

You have the right to lodge a complaint with a supervisory authority if you believe that processing of your personal data violates applicable privacy laws:

- **EU:** Contact the supervisory authority in your EU member state of habitual residence, or in Sweden (Integritetsskyddsmyndigheten)
- **UK:** Information Commissioner's Office (ICO)
- **Brazil:** Autoridade Nacional de Proteção de Dados (ANPD)
- **California:** California Privacy Protection Agency (CPPA)

### 5.9 How to Exercise Your Rights

To exercise any of these rights, please contact us using the information provided in Section 9. We will respond to your request within one month (this period may be extended by two months for complex requests).

## 6. Children's Privacy

The Bot is intended for users who are at least 13 years of age, in accordance with Discord's Terms of Service. We do not knowingly collect personal information from children under 13.

**Parental Rights:** If you are a parent or guardian and believe your child under 13 has provided us with personal information, please contact us immediately. We will promptly delete any such information upon verification of the child's age and parental relationship.

**Deletion Process:** Upon receiving a verified request from a parent or guardian regarding a child's data, we will delete the information within 7 days of verification.

## 7. International Data Transfers

Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country.

When transferring data outside the EU/EEA, we rely on:
- Standard Contractual Clauses (SCCs) or equivalent safeguards as provided by our service providers
- Adequate protection measures to ensure your data remains secure

Our hosting provider (Heroku) implements appropriate technical and organizational measures to protect your data during international transfers. By using the Bot, you consent to the transfer of your information to these countries.

## 8. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any material changes by:

- Updating the "Last Updated" date at the top of this policy
- Announcing significant changes via our Discord server (https://discord.gg/gnUJC9ab) or support channel
- Providing at least 30 days notice for material changes that affect your rights

Your continued use of the Bot after any changes constitutes acceptance of the updated Privacy Policy. If you do not agree with the changes, you may withdraw your consent and unregister your account.

## 9. Contact Us

If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:

- **Email:** support.graakchawwaa@icloud.com
- **Discord:** exeay
- **GitHub:** ExeAy
- **Discord Server:** https://discord.gg/gnUJC9ab

## 10. Regional Privacy Rights

### 10.1 European Union (GDPR) and United Kingdom (UK GDPR)

This Privacy Policy complies with the General Data Protection Regulation (GDPR) and UK GDPR. If you are located in the EU or UK and have concerns about how we handle your data, you may contact:

- **Sweden:** Integritetsskyddsmyndigheten (Swedish Data Protection Authority)
- **UK:** Information Commissioner's Office (ICO)
- **Your local supervisory authority** in your EU member state

### 10.2 Brazil (LGPD)

If you are located in Brazil, you have rights under the Lei Geral de Proteção de Dados (LGPD), which are similar to GDPR rights. You have the right to:

- Confirm the existence of data processing
- Access your data
- Correct incomplete, inaccurate, or outdated data
- Anonymize, block, or delete unnecessary or excessive data
- Data portability
- Delete personal data processed with consent
- Information about data sharing
- Revoke consent

To exercise your LGPD rights, contact us using the information in Section 9.

### 10.3 California (CCPA/CPRA)

See Section 4.1 for California-specific privacy rights.

### 10.4 Governing Law

This Privacy Policy is governed by the laws of Sweden. However, we respect the privacy laws of all jurisdictions where our users are located and will comply with applicable local requirements.

---

© {{ site.time | date: "%Y" }} grakchawwaa-bot. All rights reserved.

