# EmailJS Configuration for Appointment Confirmations

## Setup Instructions

### 1. Create EmailJS Account

1. Go to https://www.emailjs.com/
2. Sign up for a free account
3. Go to Admin panel and create a new service (Gmail/Outlook/etc)

### 2. Get Your Credentials

- **Public Key**: Found in Admin → Account → API Keys
- **Service ID**: Found in Admin → Email Services
- **Template ID**: Found in Admin → Email Templates

### 3. Create Email Templates

#### Template 1: Appointment Confirmation

**Template ID**: `template_appointment_confirmed`

HTML Template:

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        background-color: #007bff;
        color: white;
        padding: 20px;
        border-radius: 5px 5px 0 0;
      }
      .content {
        background-color: #f9f9f9;
        padding: 20px;
        border-radius: 0 0 5px 5px;
      }
      .detail {
        margin: 10px 0;
      }
      .label {
        font-weight: bold;
        color: #333;
      }
      .value {
        color: #666;
      }
      .button {
        background-color: #28a745;
        color: white;
        padding: 10px 20px;
        text-decoration: none;
        border-radius: 5px;
        display: inline-block;
        margin-top: 20px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Appointment Confirmed! ✓</h1>
      </div>
      <div class="content">
        <p>Hello {{to_name}},</p>

        <p>
          Your appointment with <strong>{{doctor_name}}</strong> has been
          confirmed.
        </p>

        <div class="detail">
          <span class="label">📅 Date:</span>
          <span class="value">{{appointment_date}}</span>
        </div>

        <div class="detail">
          <span class="label">⏰ Time:</span>
          <span class="value">{{appointment_time}}</span>
        </div>

        <div class="detail">
          <span class="label">📍 Location:</span>
          <span class="value">{{location}}</span>
        </div>

        <p style="margin-top: 20px; color: #666;">
          <strong>Need to reschedule?</strong><br />
          Please call us at {{clinic_phone}} or reach out via WhatsApp
        </p>

        <p style="margin-top: 30px; font-size: 12px; color: #999;">
          WhatsApp: {{clinic_whatsapp}}<br />
          Thank you for choosing our clinic!
        </p>
      </div>
    </div>
  </body>
</html>
```

#### Template 2: Appointment Cancelled

**Template ID**: `template_appointment_cancelled`

HTML Template:

```html
<!DOCTYPE html>
<html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        background-color: #dc3545;
        color: white;
        padding: 20px;
        border-radius: 5px 5px 0 0;
      }
      .content {
        background-color: #f9f9f9;
        padding: 20px;
        border-radius: 0 0 5px 5px;
      }
      .detail {
        margin: 10px 0;
      }
      .label {
        font-weight: bold;
        color: #333;
      }
      .value {
        color: #666;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Appointment Cancelled</h1>
      </div>
      <div class="content">
        <p>Hello {{to_name}},</p>

        <p>Your appointment has been cancelled.</p>

        <div class="detail">
          <span class="label">📅 Date:</span>
          <span class="value">{{appointment_date}}</span>
        </div>

        <div class="detail">
          <span class="label">⏰ Time:</span>
          <span class="value">{{appointment_time}}</span>
        </div>

        <div class="detail">
          <span class="label">Reason:</span>
          <span class="value">{{cancellation_reason}}</span>
        </div>

        <p style="margin-top: 20px; color: #666;">
          <strong>Want to reschedule?</strong><br />
          Please contact us to book a new appointment at your earliest
          convenience.
        </p>

        <p style="margin-top: 30px; font-size: 12px; color: #999;">
          We apologize for any inconvenience.
        </p>
      </div>
    </div>
  </body>
</html>
```

### 4. Add Environment Variables

Create `.env.local` in AdminPanel directory (or add to existing):

```env
VITE_EMAILJS_PUBLIC_KEY=your_public_key_here
VITE_EMAILJS_SERVICE_ID=service_mediclick
VITE_EMAILJS_TEMPLATE_ID=template_appointment_confirmed
```

### 5. Install EmailJS Package

```bash
cd AdminPanel
npm install @emailjs/browser
```

### 6. Test Email Sending

1. Approve an appointment in the Admin Panel
2. Check patient's email (may arrive in spam)
3. Patient should receive confirmation email

## Troubleshooting

**Emails not sending?**

- Check `.env.local` file exists and has correct keys
- Verify template IDs match in code
- Check browser console for errors
- EmailJS free tier has send limits (200/month)

**Email ends up in spam?**

- Add your clinic's phone number to email
- Use professional email templates
- Avoid spammy words in subject/body
- Consider using custom domain email

**Need to change email content?**

- Edit template in EmailJS Admin panel
- Changes apply immediately
- Test before using

## Upgrade Options

**Free Tier**: 200 emails/month (sufficient for small clinic)

**Paid Plans**: Starting $0.05/email

**Alternative Email Services**:

- Firebase Cloud Functions + Nodemailer
- SendGrid
- Resend
- AWS SES
