const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Updated to serve static files from Frontend folder
app.use(express.static(path.join(__dirname, '../Frontend')));

// Nodemailer transporter configuration - Fixed: createTransport not createTransporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Route to handle form submission
app.post('/send-email', async (req, res) => {
    try {
        const { fullName, email, phone, subject, message } = req.body;

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
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #df8908; border-bottom: 2px solid #df8908; padding-bottom: 10px;">
                        New Contact Form Submission
                    </h2>
                    
                    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <p><strong>Name:</strong> ${fullName}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
                        <p><strong>Subject:</strong> ${subject || 'No subject'}</p>
                    </div>
                    
                    <div style="background-color: #fff; padding: 20px; border-left: 4px solid #df8908; margin: 20px 0;">
                        <h3 style="color: #333; margin-top: 0;">Message:</h3>
                        <p style="line-height: 1.6; color: #555;">${message}</p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; color: #888; font-size: 12px;">
                        <p>This email was sent from your portfolio contact form</p>
                    </div>
                </div>
            `
        };

        // Send email
        await transporter.sendMail(mailOptions);

        res.json({ 
            success: true, 
            message: 'Email sent successfully!' 
        });

    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send email. Please try again.' 
        });
    }
});

// Updated to serve the main HTML file from Frontend folder
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../Frontend/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});