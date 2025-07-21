const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration for production - Allow your GitHub Pages domain
app.use(cors({
    origin: [
        'https://jdt-software.github.io',
        'http://localhost:3000',
        'http://localhost:5173'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Nodemailer transporter configuration
const transporter = nodemailer.createTransport({
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
        timestamp: new Date().toISOString()
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

// Route to handle form submission
app.post('/send-email', async (req, res) => {
    try {
        const { fullName, email, phone, subject, message } = req.body;

        console.log('Received form submission:', { fullName, email, subject });

        // Validate required fields
        if (!fullName || !email || !message) {
            return res.status(400).json({ 
                success: false, 
                message: 'Please fill in all required fields' 
            });
        }

        // Email options
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: 'devwithjacques@gmail.com',
            subject: subject || 'New Contact Form Submission',
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
                                    <td style="padding: 8px 0; color: #333;">${fullName}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #ea580c;">Email:</td>
                                    <td style="padding: 8px 0;">
                                        <a href="mailto:${email}" style="color: #df8908; text-decoration: none; font-weight: bold;">${email}</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #ea580c;">Phone:</td>
                                    <td style="padding: 8px 0; color: #333;">${phone || 'Not provided'}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #ea580c;">Subject:</td>
                                    <td style="padding: 8px 0; color: #333;">${subject || 'No subject'}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <!-- Message Card -->
                        <div style="background-color: #f8f9fa; border-left: 5px solid #df8908; padding: 20px; border-radius: 5px;">
                            <h3 style="color: #ea580c; font-size: 20px; margin: 0 0 15px 0;">
                                💬 Message
                            </h3>
                            <div style="background-color: #ffffff; padding: 15px; border-radius: 5px; border: 1px solid #e9ecef;">
                                <p style="margin: 0; font-size: 16px; line-height: 1.6; color: #333; white-space: pre-wrap;">${message}</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Footer Section -->
                    <div style="background-color: #333333; padding: 20px; text-align: center;">
                        <p style="margin: 0; font-size: 14px; color: #ffffff;">
                            📧 Sent from your Portfolio Contact Form
                        </p>
                        <p style="margin: 10px 0 0 0; font-size: 14px;">
                            <a href="https://jdt-software.github.io/Portfolio_Frontend/" style="color: #df8908; text-decoration: none; font-weight: bold;">
                                🌐 Visit Portfolio Website
                            </a>
                        </p>
                        <div style="margin-top: 15px;">
                            <span style="color: #df8908; font-size: 18px; font-weight: bold;">
                                Jacques du Toit - Web Developer
                            </span>
                        </div>
                    </div>
                </div>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);

        console.log('Email sent successfully to:', mailOptions.to);

        res.json({ 
            success: true, 
            message: 'Email sent successfully!' 
        });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send email. Please try again.',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});