const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Debug middleware - ADD THIS FIRST
app.use((req, res, next) => {
  console.log(`🔍 ${req.method} ${req.path}`);
  console.log(`🌐 Origin: ${req.headers.origin || 'no origin'}`);
  console.log(`📋 User-Agent: ${req.headers['user-agent']}`);
  next();
});

// Enhanced CORS configuration
const corsOptions = {
  origin: [
    'https://www.softflair.co.za',
    'https://softflair.co.za',
    'https://jdt-software.github.io',
    'https://portfolio-frontend-eosin-xi.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5500',
    'http://127.0.0.1:5500'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With', 
    'Content-Type', 
    'Accept',
    'Authorization'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Manual CORS headers as backup
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://www.softflair.co.za',
    'https://softflair.co.za',
    'https://jdt-software.github.io',
    'https://portfolio-frontend-eosin-xi.vercel.app'
  ];
  
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling OPTIONS preflight request');
    console.log('🎯 Origin:', origin);
    console.log('🎯 Origin allowed:', allowedOrigins.includes(origin));
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Test route to verify CORS
app.get('/test-cors', (req, res) => {
  res.json({
    message: 'CORS test successful!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString(),
    allowedOrigins: corsOptions.origin
  });
});

// Nodemailer transporter configuration
const transporter = nodemailer.createTransporter({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Health check endpoint for Render
app.get('/', (req, res) => {
    res.json({ 
        status: 'Portfolio Backend API is running!',
        timestamp: new Date().toISOString(),
        endpoints: {
            'POST /send-email': 'Send contact form email',
            'GET /test-cors': 'Test CORS configuration',
            'GET /health': 'Health check'
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        service: 'portfolio-backend',
        timestamp: new Date().toISOString()
    });
});

// Input validation function
const validateContactForm = (data) => {
  const errors = [];
  
  if (!data.fullName || data.fullName.trim().length < 2) {
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
    fullName: data.fullName?.trim().substring(0, 100),
    email: data.email?.trim().toLowerCase().substring(0, 100),
    phone: data.phone?.trim().substring(0, 20) || '',
    subject: data.subject?.trim().substring(0, 200) || '',
    message: data.message?.trim().substring(0, 2000)
  };
  
  return { errors, sanitized };
};

// Route to handle form submission
app.post('/send-email', async (req, res) => {
    try {
        console.log('📨 Received form submission:', {
            fullName: req.body.fullName,
            email: req.body.email,
            subject: req.body.subject,
            messageLength: req.body.message?.length
        });

        // Validate input
        const { errors, sanitized } = validateContactForm(req.body);
        
        if (errors.length > 0) {
            console.log('❌ Validation errors:', errors);
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }

        // Check if email configuration exists
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.error('❌ Email configuration missing');
            return res.status(500).json({
                success: false,
                message: 'Server configuration error'
            });
        }

        // Verify transporter configuration
        try {
            await transporter.verify();
            console.log('✅ Email transporter verified successfully');
        } catch (verifyError) {
            console.error('❌ Email transporter verification failed:', verifyError);
            return res.status(500).json({
                success: false,
                message: 'Email service configuration error'
            });
        }

        // Email options
        const mailOptions = {
            from: `"${sanitized.fullName}" <${process.env.EMAIL_USER}>`,
            to: 'devwithjacques@gmail.com',
            replyTo: sanitized.email,
            subject: sanitized.subject || 'New Contact Form Submission',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f5f5f5; border-radius: 10px; overflow: hidden;">
                    <!-- Header Section -->
                    <div style="background: linear-gradient(90deg, #df8908, #ff1d15); padding: 30px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #ffffff;">
                            🔥 New Contact Form Submission
                        </h1>
                        <p style="margin: 10px 0 0 0; font-size: 16px; color: #ffffff;">
                            Someone wants to connect with you!
                        </p>
                    </div>
                    
                    <!-- Content Section -->
                    <div style="padding: 30px; background-color: #ffffff;">
                        <!-- Contact Details Card -->
                        <div style="background-color: #f8f9fa; border-left: 5px solid #ea580c; padding: 20px; margin-bottom: 20px; border-radius: 5px;">
                            <h3 style="color: #ea580c; font-size: 20px; margin: 0 0 15px 0;">
                                📋 Contact Details
                            </h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #ea580c; width: 80px;">Name:</td>
                                    <td style="padding: 8px 0; color: #333;">${sanitized.fullName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #ea580c;">Email:</td>
                                    <td style="padding: 8px 0;">
                                        <a href="mailto:${sanitized.email}" style="color: #df8908; text-decoration: none; font-weight: bold;">${sanitized.email}</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #ea580c;">Phone:</td>
                                    <td style="padding: 8px 0; color: #333;">${sanitized.phone || 'Not provided'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #ea580c;">Subject:</td>
                                    <td style="padding: 8px 0; color: #333;">${sanitized.subject || 'No subject'}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Message Card -->
                        <div style="background-color: #f8f9fa; border-left: 5px solid #df8908; padding: 20px; border-radius: 5px;">
                            <h3 style="color: #ea580c; font-size: 20px; margin: 0 0 15px 0;">
                                💬 Message
                            </h3>
                            <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; border: 1px solid #e9ecef;">
                                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333; white-space: pre-wrap;">${sanitized.message}</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Footer Section -->
                    <div style="background-color: #333333; padding: 20px; text-align: center;">
                        <p style="margin: 0; font-size: 14px; color: #ffffff;">
                            📧 Sent from your Portfolio Contact Form
                        </p>
                        <p style="margin: 10px 0 0 0; font-size: 14px;">
                            <a href="https://www.softflair.co.za" style="color: #df8908; text-decoration: none; font-weight: bold;">
                                🌐 Visit Portfolio Website
                            </a>
                        </p>
                        <div style="margin-top: 15px;">
                            <span style="color: #df8908; font-size: 18px; font-weight: bold;">
                                Jacques du Toit - Web Developer
                            </span>
                        </div>
                        <div style="margin-top: 10px; font-size: 12px; color: #999;">
                            Sent on: ${new Date().toLocaleString()}
                        </div>
                    </div>
                </div>
            `
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);

        res.json({ 
            success: true, 
            message: 'Email sent successfully!',
            messageId: info.messageId
        });

    } catch (error) {
        console.error('❌ Error sending email:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send email. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// Handle 404
app.use('*', (req, res) => {
  console.log('🔍 404 - Route not found:', req.method, req.originalUrl);
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📧 Email service: Gmail`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 CORS configured for: ${corsOptions.origin.join(', ')}`);
});