---
layout: default
title: Privacy Policy - grakchawwaa-bot
---

# Privacy Policy

**Last Updated:** {{ site.time | date: "%B %d, %Y" }}

This Privacy Policy describes how **grakchawwaa-bot** (the "Bot") collects, uses, and protects your personal information when you use our Discord bot service.

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

## 3. Data Storage and Security

### 3.1 Storage

Your data is stored securely in a PostgreSQL database hosted on Heroku. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

### 3.2 Data Retention

- **Player Registration Data:** Retained until you unregister your account or request deletion
- **Guild Configuration Data:** Retained until you unregister the guild or request deletion
- **Ticket Violation Data:** Automatically deleted after 3 months to maintain data freshness and reduce storage requirements

## 4. Data Sharing and Disclosure

We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:

- **Service Providers:** We share data with SWGOH Comlink as necessary to retrieve game data required for the Bot's functionality
- **Legal Requirements:** We may disclose your information if required by law or in response to valid legal requests
- **Protection of Rights:** We may disclose information to protect our rights, privacy, safety, or property, or that of our users

## 5. Your Rights and Choices

### 5.1 Access and Deletion

You have the right to:

- **Access your data:** Use the `/identify` command to view your registered information
- **Delete your data:** 
  - Use the `/unregister-player` command to remove your player registration
  - Use the `/unregister-ticket-collection` command to remove guild monitoring
  - Contact us directly to request deletion of all your data

### 5.2 Data Portability

You may request a copy of your personal data by contacting us using the information provided in Section 8.

## 6. Children's Privacy

The Bot is intended for users who are at least 13 years of age, in accordance with Discord's Terms of Service. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.

## 7. International Data Transfers

Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. By using the Bot, you consent to the transfer of your information to these countries.

## 8. Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of any material changes by updating the "Last Updated" date at the top of this policy. Your continued use of the Bot after any changes constitutes acceptance of the updated Privacy Policy.

## 9. Contact Us

If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:

- **Email:** support.graakchawwaa@icloud.com
- **Discord:** exeay
- **GitHub:** ExeAy
- **Discord Server:** https://discord.gg/gnUJC9ab

## 10. Governing Law

This Privacy Policy is governed by the laws of Sweden. If you have concerns about how we handle your data, you may contact the Swedish Data Protection Authority (Integritetsskyddsmyndigheten).

---

© {{ site.time | date: "%Y" }} grakchawwaa-bot. All rights reserved.

