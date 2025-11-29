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

    // Prepare Mailgun message
    const mailgunDomain = process.env.MAILGUN_DOMAIN;
    const mailgunFrom = `Portfolio Contact <postmaster@${mailgunDomain}>`;
    const mailgunTo = [
      `Jacques du Toit <info@softflair.co.za>`
    ];
    const mailgunSubject = sanitized.subject || `Portfolio Contact: Message from ${sanitized.fullName}`;
    const mailgunText = `New Contact Form Submission\n\nName: ${sanitized.fullName}\nEmail: ${sanitized.email}\nPhone: ${sanitized.phone || 'Not provided'}\nSubject: ${sanitized.subject || 'No subject'}\n\nMessage:\n${sanitized.message}\n\nSent on: ${new Date().toLocaleString()}`;

    try {
      const data = await mg.messages.create(mailgunDomain, {
        from: mailgunFrom,
        to: mailgunTo,
        subject: mailgunSubject,
        text: mailgunText,
      });
      console.log('Email sent successfully via Mailgun:', data);
      res.status(200).json({
        success: true,
        message: 'Email sent successfully!'
      });
    } catch (error) {
      console.error('Error sending email via Mailgun:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send email. Please try again later.',
        ...(process.env.NODE_ENV === 'development' && { error: error.message })
      });
    }

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