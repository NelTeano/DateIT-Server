import nodemailer from "nodemailer";

export const sendEmail = async (to, subject, html) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",     // ✅ always use smtp.gmail.com for Gmail
      port: 587,
      secure: false,              // true for port 465, false for 587
      auth: {
        user: process.env.EMAIL_USER, // ✅ must be your real Gmail
        pass: process.env.EMAIL_PASS, // ✅ App password from Google
      },
    });

    // ✅ set the friendly name here, not in the host
    await transporter.sendMail({
      from: {
        name: "DateIT! 💖",                 // friendly display name
        address: process.env.EMAIL_USER,    // actual sending Gmail address
      },
      to,
      subject,
      html,
    });

    console.log(`✅ Verification email sent to ${to}`);
  } catch (error) {
    console.error("❌ Email sending error:", error);
    throw new Error("Failed to send email");
  }
};