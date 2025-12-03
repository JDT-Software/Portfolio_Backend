const express = require('express');
const cors = require('cors');
const FormData = require('form-data');
const Mailgun = require('mailgun.js');
require('dotenv').config();

const app = express();

// CORS Configuration
const corsOptions = {
  origin: [
    'https://www.softflair.co.za',
    'https://softflair.co.za',
    'https://jdt-software.github.io',
    'https://portfolio-frontend-eosin-xi.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Mailgun
const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY,
  // Uncomment and set if using EU domain:
  // url: 'https://api.eu.mailgun.net'
});

// Basic route for testing
app.get('/', (req, res) => {
  res.json({ 
    message: 'Portfolio Backend API is running!',
    timestamp: new Date().toISOString(),
    endpoints: {
      'POST /send-email': 'Send contact form email'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Input validation function
const validateContactForm = (data) => {
  const errors = [];
  
  // Check for both 'name' and 'fullName' to be flexible
  const name = data.fullName || data.name;
  if (!name || name.trim().length < 2) {
    errors.push('Full name must be at least 2 characters long');
  }
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Please provide a valid email address');
  }
  
  if (!data.message || data.message.trim().length < 10) {
    errors.push('Message must be at least 10 characters long');
  }
  
  // Sanitize inputs
  const sanitized = {
    fullName: name?.trim().substring(0, 100),
    email: data.email?.trim().toLowerCase().substring(0, 100),
    phone: data.phone?.trim().substring(0, 20) || '',
    subject: data.subject?.trim().substring(0, 200) || '',
    message: data.message?.trim().substring(0, 2000)
  };
  
  return { errors, sanitized };
};

// Email sending endpoint
app.post('/send-email', async (req, res) => {
    // TEMPORARY: Log if API key is loaded
    console.log("Mailgun API key exists:", !!process.env.MAILGUN_API_KEY);
  try {
    console.log('Received contact form submission:', {
      fullName: req.body.fullName,
      email: req.body.email,
      subject: req.body.subject,
      messageLength: req.body.message?.length
    });

    // Validate input
    const { errors, sanitized } = validateContactForm(req.body);
    
    if (errors.length > 0) {
      console.log('Validation errors:', errors);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    // Use Mailgun API
    const emailSubject = sanitized.subject || `Portfolio Contact: Message from ${sanitized.fullName}`;
    const emailText = `
New Contact Form Submission

Name: ${sanitized.fullName}
Email: ${sanitized.email}
Phone: ${sanitized.phone || 'Not provided'}
Subject: ${sanitized.subject || 'No subject'}

Message:
${sanitized.message}

---
Sent on: ${new Date().toLocaleString()}
Reply to: ${sanitized.email}
    `.trim();

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: 'Poppins', sans-serif;
    }
  </style>
</head>
<body style="background-color: #0a0a0a; padding: 40px 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #1a1a1a; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(5, 222, 139, 0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #05de8b 0%, #037449 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: #ffffff; font-size: 28px; font-weight: 600; margin: 0;">New Contact Form Submission</h1>
      <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin-top: 10px;">Someone wants to connect with you</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px;">
      <!-- Contact Details -->
      <div style="background-color: #0a0a0a; border-left: 4px solid #05de8b; padding: 25px; margin-bottom: 25px; border-radius: 8px;">
        <h2 style="color: #05de8b; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">Contact Details</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 10px 0; font-weight: 600; color: #05de8b; font-size: 14px; width: 90px;">Name:</td>
            <td style="padding: 10px 0; color: #e0e0e0; font-size: 14px;">${sanitized.fullName}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: 600; color: #05de8b; font-size: 14px;">Email:</td>
            <td style="padding: 10px 0;">
              <a href="mailto:${sanitized.email}" style="color: #05de8b; text-decoration: none; font-weight: 500; font-size: 14px;">${sanitized.email}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: 600; color: #05de8b; font-size: 14px;">Phone:</td>
            <td style="padding: 10px 0; color: #e0e0e0; font-size: 14px;">${sanitized.phone || 'Not provided'}</td>
          </tr>
          <tr>
            <td style="padding: 10px 0; font-weight: 600; color: #05de8b; font-size: 14px;">Subject:</td>
            <td style="padding: 10px 0; color: #e0e0e0; font-size: 14px;">${sanitized.subject || 'No subject'}</td>
          </tr>
        </table>
      </div>
      
      <!-- Message -->
      <div style="background-color: #0a0a0a; border-left: 4px solid #05de8b; padding: 25px; border-radius: 8px;">
        <h2 style="color: #05de8b; font-size: 20px; font-weight: 600; margin: 0 0 15px 0;">Message</h2>
        <div style="background-color: #1a1a1a; padding: 20px; border-radius: 6px; border: 1px solid #2a2a2a;">
          <p style="margin: 0; font-size: 15px; line-height: 1.7; color: #e0e0e0; white-space: pre-wrap;">${sanitized.message}</p>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #0a0a0a; padding: 30px; text-align: center; border-top: 1px solid #2a2a2a;">
      <p style="margin: 0; font-size: 14px; color: #808080;">Sent from your Portfolio Contact Form</p>
      <p style="margin: 15px 0 0 0;">
        <a href="https://www.softflair.co.za" style="color: #05de8b; text-decoration: none; font-weight: 600; font-size: 14px;">Visit Portfolio Website</a>
      </p>
      <div style="margin-top: 20px;">
        <span style="color: #05de8b; font-size: 18px; font-weight: 600;">SoftFlair</span>
        <span style="color: #808080; font-size: 14px;"> - Web Development</span>
      </div>
      <div style="margin-top: 15px; font-size: 12px; color: #606060;">
        ${new Date().toLocaleString()}
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    const data = await mg.messages.create(process.env.MAILGUN_DOMAIN, {
      from: "Softflair Portfolio <postmaster@sandboxe07b5328fb0d44808cf52fc2eb5311d1.mailgun.org>",
      to: ["info@softflair.co.za"],
      "h:Reply-To": sanitized.email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml
    });
    console.log('Email sent successfully via Mailgun:', data);
    
    res.status(200).json({
      success: true,
      message: 'Email sent successfully!'
    });

  } catch (error) {
    console.error('Error sending email:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to send email. Please try again later.',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Handle 404
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email service: Mailgun`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 CORS configured for multiple origins`);
});